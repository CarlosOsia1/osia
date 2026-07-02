import { Inject, Injectable } from '@nestjs/common';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '../ports/out/auth-session.port';

/**
 * Pide el código de recuperación de contraseña (V1 Vestíbulo). SIEMPRE resuelve (el controller
 * responde 204): no filtra si el email existe. El cooldown lo aplica Supabase.
 */
@Injectable()
export class RequestPasswordResetUseCase {
  constructor(@Inject(AUTH_SESSION_PORT) private readonly sessions: AuthSessionPort) {}

  async execute(email: string): Promise<void> {
    await this.sessions.sendPasswordReset(email);
  }
}
