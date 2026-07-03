import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { Tx, TxRunner } from '../../../common/tx';
import { PG_POOL } from './postgres.tokens';

/**
 * `TxRunner` sobre el pool de `pg`: toma un cliente dedicado, abre `BEGIN`, corre `fn` con ese cliente
 * como `Tx`, y hace `COMMIT`; ante cualquier error, `ROLLBACK` y relanza. El cliente SIEMPRE se libera.
 * Todas las escrituras dentro de `fn` que reciban ese mismo `Tx` comparten la transacción (atomicidad
 * write-de-dominio + `social.outbox`). Global (vía PostgresModule) para que cualquier contexto lo use.
 */
@Injectable()
export class PgTxRunner implements TxRunner {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async run<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
