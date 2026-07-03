-- Ola 1F — Sesión SSO server-side (patrón database-session tipo Lucia/Auth.js).
--
-- Problema: hoy la cookie `osia.rt` guarda el REFRESH TOKEN de Supabase, que rota y es single-use. Con 3
-- apps (Vestíbulo/Social/Mundo) compartiendo la cookie `.osia.*`, dos refresh casi simultáneos mandan el
-- MISMO refresh; Supabase acepta uno y rechaza el resto (reúso) → 401 → "logout aleatorio".
--
-- Solución: la cookie pasa a ser un ID de sesión OPACO (`osia.sid`). El API guarda AQUÍ la sesión de
-- Supabase (access+refresh) y refresca SERVER-SIDE, single-flight (SELECT … FOR UPDATE): concurrentes se
-- serializan y solo uno rota el refresh. `GET /v1/auth/session` devuelve el access CACHEADO mientras siga
-- vigente (sin llamar a Supabase) → se elimina la carrera. Revocación REAL por borrado de fila.
--
-- `id` = sha256(token de la cookie) en hex: si se filtra la tabla, no se puede reconstruir la cookie.
-- Los tokens de Supabase son secretos → tabla service-role only (identity no se expone por PostgREST).

create table if not exists identity.sessions (
  id                     text primary key,                 -- sha256(cookie token), hex
  account_id             uuid not null references identity.accounts(id) on delete cascade,
  supabase_access_token  text not null,                    -- JWT corto de Supabase (cacheado)
  supabase_refresh_token text not null,                    -- refresh de Supabase (rotado server-side)
  access_expires_at      timestamptz not null,             -- vencimiento del access cacheado
  created_at             timestamptz not null default now(),
  last_used_at           timestamptz not null default now(),
  expires_at             timestamptz not null              -- vida absoluta de la sesión (30 d)
);

-- Revocar todas las sesiones de una cuenta (reset de contraseña, borrado) y limpieza de vencidas.
create index if not exists idx_sessions_account on identity.sessions (account_id);
create index if not exists idx_sessions_expires on identity.sessions (expires_at);
