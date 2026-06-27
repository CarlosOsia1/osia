/**
 * Port de salida para sesiones de usuario (login/refresh/logout). Se apoya en Supabase Auth, que
 * ya rota refresh tokens (single-use) y detecta reúso — no reimplementamos eso. El dominio solo
 * conoce esta abstracción.
 */
export const AUTH_SESSION_PORT = Symbol('AUTH_SESSION_PORT');

export type AuthSession = {
  accountId: string;
  accessToken: string;
  refreshToken: string;
  /** Segundos de vida del access token. */
  expiresIn: number;
};

export interface AuthSessionPort {
  /** Inicia sesión por email+password. Lanza InvalidCredentials/EmailNotVerified. */
  signInWithPassword(email: string, password: string): Promise<AuthSession>;
  /** Rota el refresh token y devuelve una sesión nueva. Lanza SessionExpired. */
  refresh(refreshToken: string): Promise<AuthSession>;
  /** Revoca la sesión asociada al refresh token (best-effort). */
  signOut(refreshToken: string): Promise<void>;
  /** (Re)envía el email de verificación (OTP de 6 dígitos vía template). */
  sendVerification(email: string): Promise<void>;
  /** Verifica el OTP de email; al confirmar, devuelve la sesión (auto-login). Lanza InvalidOtp. */
  verifyEmail(email: string, token: string): Promise<AuthSession>;
}
