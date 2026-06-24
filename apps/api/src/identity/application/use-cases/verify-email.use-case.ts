import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type SessionDto } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '../ports/out/auth-session.port';
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../ports/out/account.repository';
import { InvalidOtpError } from '../errors';

/**
 * Verifica el email con el OTP de 6 dígitos (S1.5-H1). Al confirmar, Supabase devuelve sesión:
 * el residente queda logueado (auto-login) y el trigger 0008 promueve la cuenta a `active`.
 */
@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(AUTH_SESSION_PORT) private readonly sessions: AuthSessionPort,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
  ) {}

  async execute(
    email: string,
    token: string,
  ): Promise<{ session: SessionDto; refreshToken: string }> {
    let auth;
    try {
      auth = await this.sessions.verifyEmail(email, token);
    } catch (e) {
      if (e instanceof InvalidOtpError) {
        throw new AppException(ErrorCode.TOKEN_EXPIRED, 410, 'Código inválido o expirado.');
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
