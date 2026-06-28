-- ============================================================================
-- OSIA · S3.3-H4 · Índice de lectura del feed por recencia
-- El feed se lee por la partición del lector en orden cronológico inverso con keyset (created_at, id).
-- El índice existente idx_feed_acct_score es (account_id, score DESC, created_at DESC) — sin `id`, no
-- soporta el desempate keyset estable. Se añade el índice de recencia. Forward-only.
-- ============================================================================

CREATE INDEX idx_feed_acct_recency
  ON social.feed_items (account_id, created_at DESC, id DESC);
