import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UsePipes,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ErrorCode,
  loginSchema,
  resendVerificationSchema,
  signupSchema,
  verifyEmailSchema,
  type LoginInput,
  type ResendVerificationInput,
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

/** Nombre de la cookie de refresh (HttpOnly) que sostiene el SSO entre apps. */
const RT_COOKIE = 'osia.rt';
const RT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 días

/**
 * Auth (contexto identity): signup (gate invite-only), login, refresh, logout, session.
 * El refresh token viaja en cookie HttpOnly `Domain=.osia.*` (SSO); el access token corto va
 * en el cuerpo. Supabase rota el refresh (single-use) y detecta reúso. Ver docs/10 §1.6.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly signupUseCase: SignupUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
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
    if (rt) await this.logoutUseCase.execute(rt);
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
