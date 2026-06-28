-- ============================================================================
-- OSIA · S3.6-H2 · Reportes de moderación (cola simple)
-- Un residente reporta un post/comentario; un moderador resuelve (soft-delete del contenido) fuera de
-- banda. RLS deny-all: escritura/lectura solo por apps/api (service_role). Forward-only.
-- ============================================================================

CREATE TABLE social.reports (
  id                  uuid PRIMARY KEY DEFAULT public.uuidv7(),
  reporter_account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  target_type         text NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id           uuid NOT NULL,
  reason              text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 500),
  created_at          timestamptz NOT NULL DEFAULT now(),
  resolved_at         timestamptz
);
-- Cola abierta (sin resolver), lo que mira el moderador.
CREATE INDEX idx_reports_open ON social.reports (created_at DESC) WHERE resolved_at IS NULL;

GRANT ALL ON social.reports TO service_role;
-- RLS deny-all: ningún grant a `authenticated`; el reporte entra por apps/api (service_role).
ALTER TABLE social.reports ENABLE ROW LEVEL SECURITY;
