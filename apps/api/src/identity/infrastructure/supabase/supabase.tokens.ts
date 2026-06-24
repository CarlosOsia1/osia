/** Token de DI del cliente Supabase con service_role (solo server-side, hace BYPASSRLS). */
export const SUPABASE_ADMIN = Symbol('SUPABASE_ADMIN');
/** Token del cliente Supabase con anon key (flujos de usuario: login/refresh). */
export const SUPABASE_ANON = Symbol('SUPABASE_ANON');
