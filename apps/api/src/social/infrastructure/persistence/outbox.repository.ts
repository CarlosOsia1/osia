import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { Tx } from '../../../common/tx';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { OutboxRecord, OutboxStore } from '../../application/ports/out/outbox.store';

/** Adapter Postgres del outbox (Ola 1C). SQL directo (el schema `social` no se expone por PostgREST). */
@Injectable()
export class PgOutboxStore implements OutboxStore {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async enqueue(tx: Tx, topic: string, payload: object): Promise<void> {
    // Corre en el `Tx` del caso de uso: el evento se guarda en la MISMA transacción que el write de
    // dominio. Si la transacción hace rollback, el evento tampoco existe (no hay evento fantasma).
    await tx.query(`INSERT INTO social.outbox (topic, payload) VALUES ($1, $2::jsonb)`, [
      topic,
      JSON.stringify(payload),
    ]);
  }

  async claimBatch(maxAttempts: number, limit: number): Promise<OutboxRecord[]> {
    // Reclama e incrementa `attempts` en UNA sentencia: el `FOR UPDATE SKIP LOCKED` interno evita que dos
    // dispatchers (multi-instancia) tomen la misma fila, y subir `attempts` al reclamar acota los
    // reintentos aunque el proceso muera antes de entregar (tras `maxAttempts` la fila queda dead-letter).
    const res = await this.pool.query<{ id: string; topic: string; payload: Record<string, unknown> }>(
      `UPDATE social.outbox o SET attempts = o.attempts + 1
       WHERE o.id IN (
         SELECT id FROM social.outbox
         WHERE published_at IS NULL AND attempts < $1
         ORDER BY created_at
         LIMIT $2
         FOR UPDATE SKIP LOCKED
       )
       RETURNING o.id, o.topic, o.payload`,
      [maxAttempts, limit],
    );
    return res.rows.map((r) => ({ id: r.id, topic: r.topic, payload: r.payload }));
  }

  async markPublished(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE social.outbox SET published_at = now(), last_error = NULL WHERE id = $1`,
      [id],
    );
  }

  async markFailed(id: string, error: string): Promise<void> {
    // `attempts` ya subió en el claim; aquí solo se anota el motivo para diagnóstico. La fila sigue
    // pendiente y el próximo poll la reintenta (hasta el cap).
    await this.pool.query(`UPDATE social.outbox SET last_error = $2 WHERE id = $1`, [id, error.slice(0, 500)]);
  }
}
