-- ============================================================================
-- OSIA · S3.2-H3 · Reputación derivada (economy.reputation_ledger append-only)
-- El estatus es event-sourced: cada crédito/débito es un asiento INMUTABLE en el ledger;
-- identity.profiles.{reputation, popularity_points} es CACHÉ mantenido por trigger (espejo del
-- patrón de social_follow_counts). El cliente NUNCA escribe reputación; solo apps/api la deriva.
-- No grindeable: la dedup vive en un índice único parcial (un seguidor acredita a un seguido UNA vez).
-- Enum `reason` = espejo de ReputationReason en @osia/shared (domain/enums.ts). Forward-only.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS economy;
GRANT USAGE ON SCHEMA economy TO authenticated;
GRANT USAGE ON SCHEMA economy TO service_role;

-- ============================ reputation_ledger ============================
-- Append-only: sin updated_at/deleted_at. Una revocación futura = asiento compensatorio (delta < 0),
-- nunca UPDATE/DELETE. `source_ref` ata el asiento a su origen (p.ej. el seguidor que lo generó) para
-- la dedup/idempotencia; nullable porque otras razones (event_witness) no siempre tienen un par origen.
CREATE TABLE economy.reputation_ledger (
  id         uuid PRIMARY KEY DEFAULT public.uuidv7(),
  account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  reason     text NOT NULL CHECK (reason IN ('new_follower','reaction_received','event_witness')),
  delta      integer NOT NULL,
  source_ref uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reputation_account ON economy.reputation_ledger (account_id, created_at DESC);

-- Anti-grind: un mismo origen (source_ref = seguidor) acredita a un mismo receptor (account_id =
-- seguido) por la razón `new_follower` UNA sola vez. Follow → unfollow → re-follow NO re-acredita.
CREATE UNIQUE INDEX uq_reputation_new_follower
  ON economy.reputation_ledger (account_id, source_ref)
  WHERE reason = 'new_follower';

GRANT ALL ON ALL TABLES IN SCHEMA economy TO service_role;

-- RLS deny-all: lectura/escritura SOLO por apps/api (service_role hace BYPASSRLS). El ledger no se
-- expone al cliente; la reputación visible se lee del caché en profiles. Si algún día se expusiera por
-- PostgREST, deny-all aguanta (defensa en profundidad, docs/09).
ALTER TABLE economy.reputation_ledger ENABLE ROW LEVEL SECURITY;

-- ====================== caché en identity.profiles ======================
-- Mantiene profiles.{reputation, popularity_points} en cada append. popularity_points respeta su
-- CHECK (>= 0) vía GREATEST. Espejo del patrón social.sync_follow_counts (caché por trigger).
CREATE OR REPLACE FUNCTION economy.sync_reputation_cache() RETURNS trigger AS $$
BEGIN
  UPDATE identity.profiles
     SET reputation        = reputation + NEW.delta,
         popularity_points = GREATEST(popularity_points + NEW.delta, 0)
   WHERE account_id = NEW.account_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reputation_cache
  AFTER INSERT ON economy.reputation_ledger
  FOR EACH ROW EXECUTE FUNCTION economy.sync_reputation_cache();

-- Backfill idempotente: recalcula el caché desde el ledger (única fuente de verdad). Con ledger vacío
-- da 0. Re-aplicable sin daño. Hoy los perfiles arrancan en 0 (nada escribía reputación aún).
UPDATE identity.profiles p SET
  reputation        = COALESCE((SELECT SUM(delta) FROM economy.reputation_ledger l
                                  WHERE l.account_id = p.account_id), 0),
  popularity_points = GREATEST(COALESCE((SELECT SUM(delta) FROM economy.reputation_ledger l
                                  WHERE l.account_id = p.account_id), 0), 0);
