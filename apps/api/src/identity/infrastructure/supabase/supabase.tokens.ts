/** Token de DI del cliente Supabase con service_role (solo server-side, hace BYPASSRLS). */
export const SUPABASE_ADMIN = Symbol('SUPABASE_ADMIN');
/** Token del cliente Supabase con anon key (flujos de usuario: login/refresh). */
export const SUPABASE_ANON = Symbol('SUPABASE_ANON');
/**
 * Fábrica de clientes anon EFÍMEROS (`() => SupabaseClient`): para operaciones stateful como
 * `signOut` (setSession + signOut), donde compartir un cliente entre requests de distintos usuarios
 * causa una carrera cross-usuario (un logout puede revocar la sesión de otro). Un cliente fresco por
 * operación elimina la carrera.
 */
export const SUPABASE_ANON_FACTORY = Symbol('SUPABASE_ANON_FACTORY');
