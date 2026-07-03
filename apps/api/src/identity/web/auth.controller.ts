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
  SESSION_ID_COOKIE,
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
import { VerifyEmailUseCase } from '../application/use-cases/verify-email.use-case';
import { ResendVerificationUseCase } from '../application/use-cases/resend-verification.use-case';
import { RequestPasswordResetUseCase } from '../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { ServerSessionService } from '../application/server-session.service';

/** Cookie de sesión SSO server-side (HttpOnly, Ola 1F): ID opaco de sesión — NO el refresh de Supabase. */
const SID_COOKIE = SESSION_ID_COOKIE;
const SID_MAX_AGE_MS = SESSION_REFRESH_MAX_AGE_MS;

/**
 * Auth (contexto identity): signup (gate invite-only), login, refresh, logout, session.
 * La cookie `osia.sid` (HttpOnly, `Domain=.osia.*`) guarda un ID de sesión OPACO; el refresh de Supabase
 * vive server-side (`identity.sessions`) y se rota single-flight — sin "logout aleatorio" multi-app y con
 * revocación real (Ola 1F). El access token corto va en el cuerpo. Ver docs/10 §1.6.
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly signupUseCase: SignupUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly serverSession: ServerSessionService,
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
    await this.startServerSession(res, session, refreshToken);
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
    await this.startServerSession(res, session, refreshToken);
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
    // El reset expulsa las demás sesiones (espejo del scope:'others' de Supabase): mata las sesiones
    // server-side previas de la cuenta ANTES de crear la nueva (la de este reset queda viva).
    await this.serverSession.revokeAllForAccount(session.passport.accountId);
    await this.startServerSession(res, session, refreshToken);
    return { session };
  }

  /** Devuelve el pasaporte + access token a partir de la cookie de sesión (Ola 1F: sin rotar la cookie). */
  @Get('session')
  async session(@Req() req: Request): Promise<SessionDto> {
    const sid = this.readSessionCookie(req);
    if (!sid) throw new AppException(ErrorCode.UNAUTHENTICATED, 401, 'No hay sesión activa.');
    return this.serverSession.resolve(sid);
  }

  /** Devuelve solo el access token vigente (patrón refresh-y-reintenta del cliente). */
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request): Promise<{ accessToken: string; expiresIn: number }> {
    const sid = this.readSessionCookie(req);
    if (!sid) throw new AppException(ErrorCode.SESSION_EXPIRED, 401, 'Tu sesión expiró.');
    const session = await this.serverSession.resolve(sid);
    return { accessToken: session.accessToken, expiresIn: session.expiresIn };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const sid = this.readSessionCookie(req);
    // La cookie se limpia SIEMPRE, aunque la revocación falle: si no, una sesión muerta dejaría la cookie
    // viva y el cliente quedaría en un estado fantasma.
    if (sid) {
      try {
        await this.serverSession.destroy(sid);
      } catch (err) {
        this.logger.warn(`logout: revocación falló (${err instanceof Error ? err.message : 'desconocido'})`);
      }
    }
    this.clearSessionCookie(res);
  }

  // --- sesión + cookie helpers ---
  /** Crea la sesión server-side y pone la cookie opaca (login/verify/reset). */
  private async startServerSession(res: Response, session: SessionDto, refreshToken: string): Promise<void> {
    const token = await this.serverSession.start(
      session.passport.accountId,
      session.accessToken,
      refreshToken,
      session.expiresIn,
    );
    this.setSessionCookie(res, token);
  }

  private setSessionCookie(res: Response, token: string): void {
    res.cookie(SID_COOKIE, token, {
      httpOnly: true,
      secure: this.env.COOKIE_SECURE,
      sameSite: 'lax',
      domain: this.env.COOKIE_DOMAIN,
      path: '/',
      maxAge: SID_MAX_AGE_MS,
    });
  }

  private clearSessionCookie(res: Response): void {
    res.clearCookie(SID_COOKIE, { domain: this.env.COOKIE_DOMAIN, path: '/' });
  }

  private readSessionCookie(req: Request): string | undefined {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
    return cookies?.[SID_COOKIE];
  }
}
