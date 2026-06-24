import { Inject, Injectable } from '@nestjs/common';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '../ports/out/auth-session.port';

/** Cierra la sesión: revoca el refresh token (best-effort). El controlador limpia la cookie. */
@Injectable()
export class LogoutUseCase {
  constructor(@Inject(AUTH_SESSION_PORT) private readonly sessions: AuthSessionPort) {}

  async execute(refreshToken: string): Promise<void> {
    await this.sessions.signOut(refreshToken);
  }
}
