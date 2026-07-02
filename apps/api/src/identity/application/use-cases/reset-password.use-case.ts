import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type SessionDto } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '../ports/out/auth-session.port';
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../ports/out/account.repository';
import { InvalidOtpError, PasswordUnchangedError } from '../errors';

/**
 * Canjea el OTP de recuperación por una contraseña nueva (V1 Vestíbulo). Al confirmar, Supabase
 * devuelve sesión: el residente entra de una (auto-login, espejo de verify-email) y las demás
 * sesiones quedan revocadas (lo hace el adapter).
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(AUTH_SESSION_PORT) private readonly sessions: AuthSessionPort,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
  ) {}

  async execute(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<{ session: SessionDto; refreshToken: string }> {
    let auth;
    try {
      auth = await this.sessions.resetPassword(email, token, newPassword);
    } catch (e) {
      if (e instanceof InvalidOtpError) {
        throw new AppException(ErrorCode.TOKEN_EXPIRED, 410, 'Código inválido o expirado.');
      }
      if (e instanceof PasswordUnchangedError) {
        throw new AppException(
          ErrorCode.VALIDATION_FAILED,
          422,
          'La contraseña nueva debe ser distinta a la anterior.',
          {
            details: [
              {
                field: 'newPassword',
                code: 'same_password',
                message: 'La contraseña nueva debe ser distinta a la anterior.',
              },
            ],
          },
        );
      }
      throw e;
    }
    const passport = await this.accounts.getPassport(auth.accountId);
    if (!passport) throw new AppException(ErrorCode.INTERNAL_ERROR, 500, 'Pasaporte no encontrado.');
    return {
      session: { accessToken: auth.accessToken, expiresIn: auth.expiresIn, passport },
      refreshToken: auth.refreshToken,
    };
  }
}
