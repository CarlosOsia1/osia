import { Inject, Injectable } from '@nestjs/common';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '../ports/out/auth-session.port';

/** Reenvía el código de verificación a un email (S1.5-H1). El cooldown lo aplica Supabase. */
@Injectable()
export class ResendVerificationUseCase {
  constructor(@Inject(AUTH_SESSION_PORT) private readonly sessions: AuthSessionPort) {}

  async execute(email: string): Promise<void> {
    await this.sessions.sendVerification(email);
  }
}
