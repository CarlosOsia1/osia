/**
 * Constantes de auth/SSO compartidas por el ecosistema. La cookie de refresh es un CONTRATO
 * cruzado: la pone `apps/api` y la leen las apps (middleware de ruta protegida). Debe vivir una
 * sola vez (si el nombre se desincroniza, el SSO se rompe en silencio).
 */
export const SESSION_REFRESH_COOKIE = 'osia.rt';
/**
 * Cookie de sesión SSO server-side (Ola 1F): guarda un ID de sesión OPACO (no el refresh de Supabase).
 * La pone/lee `apps/api`; las apps solo chequean su PRESENCIA (middleware de ruta protegida). El refresh
 * de Supabase vive server-side (tabla `identity.sessions`), lo que elimina el "logout aleatorio" por
 * rotación multi-app y da revocación real. Reemplaza a `osia.rt` como cookie de sesión.
 */
export const SESSION_ID_COOKIE = 'osia.sid';
/** Vida de la cookie/sesión (30 días). */
export const SESSION_REFRESH_MAX_AGE_S = 60 * 60 * 24 * 30;
export const SESSION_REFRESH_MAX_AGE_MS = SESSION_REFRESH_MAX_AGE_S * 1000;
export const SESSION_MAX_AGE_MS = SESSION_REFRESH_MAX_AGE_MS;
/** Largo del OTP que Supabase manda por email (verify + recovery). El proyecto está en 8. */
export const EMAIL_OTP_LENGTH = 8;
