import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Logger,
  Post,
  Req,
  Res,
  UsePipes,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ErrorCode,
  SESSION_REFRESH_COOKIE,
  SESSION_REFRESH_MAX_AGE_MS,
  forgotPasswordSchema,
  loginSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type ResendVerificationInput,
  type ResetPasswordInput,
  type SessionDto,
  type SignupInput,
  type SignupResultDto,
  type VerifyEmailInput,
} from '@osia/shared';
import { AppException } from '../../common/app-exception';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { APP_ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { SignupUseCase } from '../application/use-cases/signup.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { RefreshSessionUseCase } from '../application/use-cases/refresh-session.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { VerifyEmailUseCase } from '../application/use-cases/verify-email.use-case';
import { ResendVerificationUseCase } from '../application/use-cases/resend-verification.use-case';
import { RequestPasswordResetUseCase } from '../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';

/** Cookie de refresh (HttpOnly) que sostiene el SSO entre apps — nombre/vida compartidos. */
const RT_COOKIE = SESSION_REFRESH_COOKIE;
const RT_MAX_AGE_MS = SESSION_REFRESH_MAX_AGE_MS;

/**
 * Auth (contexto identity): signup (gate invite-only), login, refresh, logout, session.
 * El refresh token viaja en cookie HttpOnly `Domain=.osia.*` (SSO); el access token corto va
 * en el cuerpo. Supabase rota el refresh (single-use) y detecta reúso. Ver docs/10 §1.6.
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly signupUseCase: SignupUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    @Inject(APP_ENV) private readonly env: Env,
  ) {}

  @Post('signup')
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(signupSchema))
  async signup(@Body() body: SignupInput): Promise<SignupResultDto> {
    return this.signupUseCase.execute(body);
  }

  @Post('login')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(
    @Body() body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ session: SessionDto }> {
    const { session, refreshToken } = await this.loginUseCase.execute(body);
    this.setRefreshCookie(res, refreshToken);
    return { session };
  }

  /** Verifica el email con el OTP de 6 dígitos; al confirmar, inicia sesión (set-cookie). */
  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailSchema)) body: VerifyEmailInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ session: SessionDto }> {
    const { session, refreshToken } = await this.verifyEmailUseCase.execute(body.email, body.token);
    this.setRefreshCookie(res, refreshToken);
    return { session };
  }

  @Post('resend-verification')
  @HttpCode(204)
  async resendVerification(
    @Body(new ZodValidationPipe(resendVerificationSchema)) body: ResendVerificationInput,
  ): Promise<void> {
    await this.resendVerificationUseCase.execute(body.email);
  }

  /** Pide el código de recuperación de contraseña. SIEMPRE 204: no filtra si el email existe. */
  @Post('forgot-password')
  @HttpCode(204)
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput,
  ): Promise<void> {
    await this.requestPasswordResetUseCase.execute(body.email);
  }

  /** Canjea el OTP de recuperación por la contraseña nueva; al confirmar inicia sesión (set-cookie). */
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ session: SessionDto }> {
    const { session, refreshToken } = await this.resetPasswordUseCase.execute(
      body.email,
      body.token,
      body.newPassword,
    );
    this.setRefreshCookie(res, refreshToken);
    return { session };
  }

  /** Devuelve el pasaporte + access token a partir de la cookie de refresh (rota la cookie). */
  @Get('session')
  async session(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionDto> {
    const rt = this.readRefreshCookie(req);
    if (!rt) throw new AppException(ErrorCode.UNAUTHENTICATED, 401, 'No hay sesión activa.');
    const { session, refreshToken } = await this.refreshUseCase.execute(rt);
    this.setRefreshCookie(res, refreshToken);
    return session;
  }

  /** Rota la sesión y devuelve solo el access token (patrón refresh-y-reintenta del cliente). */
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const rt = this.readRefreshCookie(req);
    if (!rt) throw new AppException(ErrorCode.SESSION_EXPIRED, 401, 'Tu sesión expiró.');
    const { session, refreshToken } = await this.refreshUseCase.execute(rt);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken: session.accessToken, expiresIn: session.expiresIn };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const rt = this.readRefreshCookie(req);
    // La cookie se limpia SIEMPRE, aunque la revocación falle (token ya inválido/expirado): si no,
    // una sesión muerta dejaría la cookie viva y el cliente quedaría en un estado fantasma.
    if (rt) {
      try {
        await this.logoutUseCase.execute(rt);
      } catch (err) {
        // token ya inválido en el proveedor: igual limpiamos la cookie local, pero lo dejamos en el
        // log (warn) para que ops vea si la revocación falla por otra causa (red/timeout).
        this.logger.warn(`logout: revocación falló (${err instanceof Error ? err.message : 'desconocido'})`);
      }
    }
    this.clearRefreshCookie(res);
  }

  // --- cookie helpers ---
  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(RT_COOKIE, token, {
      httpOnly: true,
      secure: this.env.COOKIE_SECURE,
      sameSite: 'lax',
      domain: this.env.COOKIE_DOMAIN,
      path: '/',
      maxAge: RT_MAX_AGE_MS,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(RT_COOKIE, { domain: this.env.COOKIE_DOMAIN, path: '/' });
  }

  private readRefreshCookie(req: Request): string | undefined {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
    return cookies?.[RT_COOKIE];
  }
}
