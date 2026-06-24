import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type SessionDto } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '../ports/out/auth-session.port';
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../ports/out/account.repository';
import { SessionExpiredError } from '../errors';

/**
 * Rota el refresh token y reconstruye la sesión + pasaporte. Sirve a `GET /v1/auth/session` y
 * `POST /v1/auth/refresh`. Si el token expiró/fue revocado → 401 SESSION_EXPIRED (al Vestíbulo).
 */
@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(AUTH_SESSION_PORT) private readonly sessions: AuthSessionPort,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
  ) {}

  async execute(refreshToken: string): Promise<{ session: SessionDto; refreshToken: string }> {
    let auth;
    try {
      auth = await this.sessions.refresh(refreshToken);
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        throw new AppException(ErrorCode.SESSION_EXPIRED, 401, 'Tu sesión expiró.');
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
