import { Inject, Injectable } from '@nestjs/common';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON, SUPABASE_ANON_FACTORY } from './supabase.tokens';
import type {
  AuthSession,
  AuthSessionPort,
} from '../../application/ports/out/auth-session.port';
import {
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidOtpError,
  PasswordUnchangedError,
  SessionExpiredError,
} from '../../application/errors';

/** Adapter de sesiones con el cliente anon de Supabase (flujos de usuario, no admin). */
@Injectable()
export class SupabaseSessionAdapter implements AuthSessionPort {
  constructor(
    @Inject(SUPABASE_ANON) private readonly anon: SupabaseClient,
    // Fábrica de clientes efímeros para signOut (evita la carrera del cliente compartido).
    @Inject(SUPABASE_ANON_FACTORY) private readonly anonFactory: () => SupabaseClient,
  ) {}

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

  async sendPasswordReset(email: string): Promise<void> {
    // El template Recovery manda el OTP ({{ .Token }}). El error se descarta a propósito: la
    // respuesta es 204 exista o no la cuenta (sin oráculo de emails registrados). Un rate-limit
    // del proveedor también queda silencioso — el copy de la UI ya dice «si está registrado...».
    await this.anon.auth.resetPasswordForEmail(email);
  }

  async resetPassword(email: string, token: string, newPassword: string): Promise<AuthSession> {
    // Cliente EFÍMERO: verifyOtp/updateUser/signOut MUTAN el estado interno del GoTrueClient
    // (misma carrera que motiva el efímero de signOut). El OTP de recovery devuelve sesión; con
    // ella se fija la contraseña y se revocan las DEMÁS sesiones (si alguien robó la cuenta, el
    // reset lo expulsa). La sesión del reset queda viva → auto-login, espejo de verify-email.
    const client = this.anonFactory();
    const { data, error } = await client.auth.verifyOtp({ email, token, type: 'recovery' });
    if (error || !data.session) throw new InvalidOtpError();
    const { error: updateError } = await client.auth.updateUser({ password: newPassword });
    if (updateError) {
      if (updateError.code === 'same_password') throw new PasswordUnchangedError();
      throw updateError;
    }
    await client.auth.signOut({ scope: 'others' }).catch(() => undefined);
    return toAuthSession(data.session);
  }

  async signOut(refreshToken: string): Promise<void> {
    // Cliente EFÍMERO por operación: setSession/signOut MUTAN el estado interno del GoTrueClient
    // (stateful pese a persistSession:false). Con un cliente anon COMPARTIDO entre requests, el
    // signOut de un usuario podía intercalarse con el setSession de otro y revocar la sesión ajena.
    // Uno fresco por logout elimina esa carrera. Scope 'local': revoca SOLO esta sesión (la presente),
    // no todas las del usuario — logout de un dispositivo, y además no puede tumbar sesiones de terceros.
    const client = this.anonFactory();
    const { data } = await client.auth.refreshSession({ refresh_token: refreshToken });
    if (data.session) {
      await client.auth
        .setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
        .catch(() => undefined);
      await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
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
