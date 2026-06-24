import { Inject, Injectable } from '@nestjs/common';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON } from './supabase.tokens';
import type {
  AuthSession,
  AuthSessionPort,
} from '../../application/ports/out/auth-session.port';
import {
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidOtpError,
  SessionExpiredError,
} from '../../application/errors';

/** Adapter de sesiones con el cliente anon de Supabase (flujos de usuario, no admin). */
@Injectable()
export class SupabaseSessionAdapter implements AuthSessionPort {
  constructor(@Inject(SUPABASE_ANON) private readonly anon: SupabaseClient) {}

  async signInWithPassword(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await this.anon.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.code === 'email_not_confirmed') throw new EmailNotVerifiedError();
      throw new InvalidCredentialsError();
    }
    if (!data.session) throw new InvalidCredentialsError();
    return toAuthSession(data.session);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const { data, error } = await this.anon.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) throw new SessionExpiredError();
    return toAuthSession(data.session);
  }

  async sendVerification(email: string): Promise<void> {
    // Reenvía la confirmación de signup (el template manda el OTP de 6 dígitos {{ .Token }}).
    const { error } = await this.anon.auth.resend({ type: 'signup', email });
    if (error) throw error;
  }

  async verifyEmail(email: string, token: string): Promise<AuthSession> {
    const { data, error } = await this.anon.auth.verifyOtp({ email, token, type: 'signup' });
    if (error || !data.session) throw new InvalidOtpError();
    return toAuthSession(data.session);
  }

  async signOut(refreshToken: string): Promise<void> {
    // Cargar la sesión y cerrarla revoca el refresh token presentado (best-effort).
    const { data } = await this.anon.auth.refreshSession({ refresh_token: refreshToken });
    if (data.session) {
      await this.anon.auth
        .setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
        .catch(() => undefined);
      await this.anon.auth.signOut().catch(() => undefined);
    }
  }
}

function toAuthSession(session: Session): AuthSession {
  return {
    accountId: session.user.id,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
  };
}
