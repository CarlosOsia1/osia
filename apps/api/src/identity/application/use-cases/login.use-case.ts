import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type LoginInput, type SessionDto } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '../ports/out/auth-session.port';
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../ports/out/account.repository';
import { EmailNotVerifiedError, InvalidCredentialsError } from '../errors';

/** Login por email+password. Devuelve la sesión (access + pasaporte) y el refresh token (cookie). */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_SESSION_PORT) private readonly sessions: AuthSessionPort,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
  ) {}

  async execute(input: LoginInput): Promise<{ session: SessionDto; refreshToken: string }> {
    let auth;
    try {
      auth = await this.sessions.signInWithPassword(input.email, input.password);
    } catch (e) {
      if (e instanceof EmailNotVerifiedError) {
        throw new AppException(ErrorCode.EMAIL_NOT_VERIFIED, 403, 'Verifica tu email para entrar.');
      }
      if (e instanceof InvalidCredentialsError) {
        throw new AppException(ErrorCode.INVALID_CREDENTIALS, 401, 'Email o contraseña incorrectos.');
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
