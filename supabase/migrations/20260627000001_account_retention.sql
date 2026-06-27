-- ============================================================================
-- OSIA · S2-C2 · Retención y auditoría de cuenta (cierre de Fase 2)
-- Dos cimientos para el borrado de cuenta + política de retención:
--   · system.audit_logs            → bitácora append-only de acciones sensibles (borrados, purgas).
--   · identity.account_deletion_tokens → tokens de un solo uso para el borrado por LINK de email (24 h).
-- Ambas las escribe apps/api con conexión directa (pg), NUNCA vía PostgREST → no necesitan RLS
-- (el esquema `system` no se expone; los tokens viven en `identity`, ya fuera de PostgREST).
-- El cron de retención (RetentionService, @nestjs/schedule) purga tokens vencidos y audit viejo.
-- Ver docs/backlog/fase-2-atmosfera-viva.md (S2-C2).
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS system;

-- Bitácora de auditoría: append-only. entity_id/actor_id son uuid PLANOS (sin FK): deben sobrevivir
-- al borrado de la cuenta que registran (si fueran FK con CASCADE, se borrarían con ella).
CREATE TABLE system.audit_logs (
  id          uuid PRIMARY KEY DEFAULT public.uuidv7(),
  entity_type text        NOT NULL,            -- 'account', 'retention', …
  entity_id   uuid,                            -- a quién/qué afecta (null en resúmenes de sistema)
  action      text        NOT NULL,            -- 'account.deleted', 'retention.purge', …
  actor_id    uuid,                            -- quién la ejecutó (null = sistema/cron)
  metadata    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_created  ON system.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_entity   ON system.audit_logs (entity_type, entity_id);

-- Tokens de borrado por link de email (alternativa al borrado por contraseña). Guardamos solo el
-- HASH del token (nunca el token limpio), expiración (24 h) y consumido (un solo uso).
CREATE TABLE identity.account_deletion_tokens (
  id          uuid PRIMARY KEY DEFAULT public.uuidv7(),
  account_id  uuid        NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  token_hash  text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,                      -- NULL = sin usar
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_account_deletion_tokens_hash ON identity.account_deletion_tokens (token_hash);
CREATE INDEX        idx_account_deletion_tokens_acc  ON identity.account_deletion_tokens (account_id);

-- RLS deny-all (como identity.email_verifications): el esquema `identity` SÍ se expone vía PostgREST,
-- así que una tabla de tokens sensibles NO puede quedar legible por el rol anon/authenticated. No se
-- crea ninguna policy ni GRANT → nadie llega por la API pública; el `api` la usa por conexión directa
-- (service_role/owner) que salta RLS.
ALTER TABLE identity.account_deletion_tokens ENABLE ROW LEVEL SECURITY;
