-- ============================================================================
-- OSIA · S3.2-H3 (fix de QA) · Unifica la semántica de popularity_points trigger↔backfill
--
-- Hallazgo del QA multi-agente (minor, confirmado por 3 dimensiones): el trigger original clampaba
-- popularity POR-PASO — GREATEST(popularity_points + NEW.delta, 0) — mientras el backfill clampa el
-- AGREGADO — GREATEST(SUM(delta), 0). Con solo deltas positivos (lo único de H3, new_follower=+5)
-- coinciden, pero divergirían ante un asiento compensatorio futuro (delta < 0): re-correr el backfill
-- pisaría el valor del trigger con otro número, volviendo el caché no determinista según el método de
-- derivación y contradiciendo "el backfill reconcilia el caché".
--
-- Fix: el trigger deriva popularity del MISMO agregado que el backfill, sin subconsulta. Como
-- `reputation` NO se clampa, `reputation + NEW.delta` ES la suma corriente del ledger; por tanto
-- popularity = GREATEST(suma, 0) en AMBAS rutas, para todo delta (positivo o negativo). Sigue O(1).
-- Forward-only: la 20260628000002 ya está aplicada; no se edita, se reemplaza la función aquí.
-- ============================================================================

CREATE OR REPLACE FUNCTION economy.sync_reputation_cache() RETURNS trigger AS $$
BEGIN
  -- En un UPDATE, las expresiones SET leen el valor PREVIO de la fila: `reputation + NEW.delta` es la
  -- suma corriente del ledger (reputation nunca se clampa). popularity = piso 0 de esa misma suma →
  -- idéntico al backfill, para cualquier signo de delta.
  UPDATE identity.profiles
     SET reputation        = reputation + NEW.delta,
         popularity_points = GREATEST(reputation + NEW.delta, 0)
   WHERE account_id = NEW.account_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Reconciliación idempotente desde el ledger (única fuente de verdad). No-op hoy: con solo deltas
-- positivos el caché ya coincide; queda como red de seguridad y deja ambas rutas demostrablemente iguales.
UPDATE identity.profiles p SET
  reputation        = COALESCE((SELECT SUM(delta) FROM economy.reputation_ledger l
                                  WHERE l.account_id = p.account_id), 0),
  popularity_points = GREATEST(COALESCE((SELECT SUM(delta) FROM economy.reputation_ledger l
                                  WHERE l.account_id = p.account_id), 0), 0);
