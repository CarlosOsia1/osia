import type { Tx } from '../../../../common/tx';

export const OUTBOX_STORE = Symbol('OUTBOX_STORE');

/** Un evento de dominio pendiente de entregar, tal como lo lee el dispatcher desde `social.outbox`. */
export type OutboxRecord = {
  id: string;
  topic: string;
  payload: Record<string, unknown>;
};

/**
 * Puerto del outbox transaccional. `enqueue` lo llama el publicador DENTRO de la transacción del write
 * de dominio (mismo `Tx`) → atómico. El resto lo usa el dispatcher para entregar at-least-once:
 * `claimBatch` reclama un lote de pendientes (incrementa `attempts` y bloquea con SKIP LOCKED para que
 * varias instancias no lo re-entreguen), y `markPublished`/`markFailed` cierran cada uno tras el intento.
 */
export interface OutboxStore {
  // `payload: object` (no `Record<string, unknown>`): los payloads tipados de dominio son objetos sin
  // firma de índice, y se serializan a jsonb al encolar.
  enqueue(tx: Tx, topic: string, payload: object): Promise<void>;
  /** Reclama hasta `limit` pendientes con `attempts < maxAttempts`; los marca en curso (attempts++). */
  claimBatch(maxAttempts: number, limit: number): Promise<OutboxRecord[]>;
  markPublished(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}
