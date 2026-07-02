-- ============================================================================
-- OSIA · Ola 3 · R4.2 · Guardados (bookmarks): colección PRIVADA de posts
-- Un guardado es una preferencia personal: nadie más lo ve, no notifica, no da reputación.
-- PK (account_id, post_id) = idempotencia natural del PUT. FKs CASCADE: borrar la cuenta o el
-- post se lleva sus guardados. La lectura (`GET /v1/bookmarks`) reimpone el predicado de
-- visibilidad al listar: un guardado cuyo post se volvió invisible (p. ej. la cuenta se hizo
-- privada) NO se lista — el guardado no es una puerta trasera.
-- RLS deny-all (solo service_role): la verdad la impone el API, como el resto del schema.
-- Forward-only.
-- ============================================================================

CREATE TABLE IF NOT EXISTS social.bookmarks (
  account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  post_id    uuid NOT NULL REFERENCES social.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, post_id)
);

-- Listado keyset por recencia del guardado (no del post).
CREATE INDEX IF NOT EXISTS idx_bookmarks_acct_recency
  ON social.bookmarks (account_id, created_at DESC, post_id DESC);

ALTER TABLE social.bookmarks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON social.bookmarks TO service_role;
