-- ============================================================================
-- OSIA · Ola 3 · R4.4 · Silenciar (mute): preferencia PRIVADA de lectura
-- Silenciar oculta el contenido de alguien de TU feed y TU campana sin que esa persona lo sepa
-- (a diferencia de bloquear, que corta la relación en ambos sentidos usando `follows.status =
-- 'blocked'`, que ya existe en el CHECK desde S3.9 — bloquear NO necesita migración).
-- Sin eventos, sin notificaciones, sin reputación. RLS deny-all (la verdad la impone el API).
-- Forward-only.
-- ============================================================================

CREATE TABLE IF NOT EXISTS social.mutes (
  muter_account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  muted_account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (muter_account_id, muted_account_id),
  CONSTRAINT ck_mutes_no_self CHECK (muter_account_id <> muted_account_id)
);

ALTER TABLE social.mutes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON social.mutes TO service_role;
