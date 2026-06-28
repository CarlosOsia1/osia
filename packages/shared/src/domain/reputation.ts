import type { ReputationReason } from './enums';

/**
 * Pesos de reputación por razón (datos, no `if`; sin números mágicos §1.2). El peso es el `delta` del
 * asiento append-only en `economy.reputation_ledger`. Acreditar es event-sourced y NO grindeable: la
 * dedup (un seguidor acredita a un seguido una sola vez) vive en el índice único parcial de la tabla,
 * no en estos pesos. Ajustar un peso = tocar este dato, en un solo lugar.
 *
 * En H3 solo se acredita `new_follower`; los demás pesos quedan listos para sus HU (S3.3 / Fase 2).
 */
export const REPUTATION_WEIGHTS: Record<ReputationReason, number> = {
  new_follower: 5,
  reaction_received: 1,
  event_witness: 10,
};
