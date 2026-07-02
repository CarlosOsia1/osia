/**
 * Constantes de auth/SSO compartidas por el ecosistema. La cookie de refresh es un CONTRATO
 * cruzado: la pone `apps/api` y la leen las apps (middleware de ruta protegida). Debe vivir una
 * sola vez (si el nombre se desincroniza, el SSO se rompe en silencio).
 */
export const SESSION_REFRESH_COOKIE = 'osia.rt';
/** Vida de la cookie de refresh (30 días). */
export const SESSION_REFRESH_MAX_AGE_S = 60 * 60 * 24 * 30;
export const SESSION_REFRESH_MAX_AGE_MS = SESSION_REFRESH_MAX_AGE_S * 1000;
/** Largo del OTP que Supabase manda por email (verify + recovery). El proyecto está en 8. */
export const EMAIL_OTP_LENGTH = 8;
