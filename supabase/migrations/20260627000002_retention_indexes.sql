-- ============================================================================
-- OSIA · S2-C2 · Índices de apoyo a la purga de retención
-- El cron purga con WHERE COALESCE(consumed_at, expires_at) < cutoff. Esa expresión no es sargable
-- contra índices planos → seq scan. Estos índices por EXPRESIÓN la hacen eficiente cuando las tablas
-- de tokens crezcan. Ver apps/api/.../postgres/retention.repository.ts.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_email_verifications_retention
  ON identity.email_verifications ((COALESCE(consumed_at, expires_at)));

CREATE INDEX IF NOT EXISTS idx_account_deletion_tokens_retention
  ON identity.account_deletion_tokens ((COALESCE(consumed_at, expires_at)));
