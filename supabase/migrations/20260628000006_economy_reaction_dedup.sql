-- ============================================================================
-- OSIA · S3.3-H2 · Dedup anti-grind de reputación por reacción
-- `reaction_received` se acredita UNA vez por (post, reactor): apps/api computa `source_ref` como un
-- UUID DETERMINISTA de (postId, reactorId) (uuid v5), y este índice único parcial garantiza el "once"
-- (re-reaccionar, cambiar de kind o quitar+volver a reaccionar NO re-acredita). Paralelo a
-- `uq_reputation_new_follower`. Forward-only.
-- ============================================================================

CREATE UNIQUE INDEX uq_reputation_reaction
  ON economy.reputation_ledger (account_id, source_ref)
  WHERE reason = 'reaction_received';
