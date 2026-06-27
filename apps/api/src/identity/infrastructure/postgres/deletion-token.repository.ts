import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from './postgres.tokens';
import type { DeletionTokenRepository } from '../../application/ports/out/deletion-token.repository';

/** Tokens de borrado por link en identity.account_deletion_tokens (conexión directa, no PostgREST). */
@Injectable()
export class PgDeletionTokenRepository implements DeletionTokenRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(accountId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.pool.query(
      `INSERT INTO identity.account_deletion_tokens (account_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [accountId, tokenHash, expiresAt],
    );
  }

  async consume(tokenHash: string): Promise<string | null> {
    // Marca consumido y devuelve el dueño en UN solo UPDATE atómico: válido = no usado y no vencido.
    const res = await this.pool.query<{ account_id: string }>(
      `UPDATE identity.account_deletion_tokens
       SET consumed_at = now()
       WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()
       RETURNING account_id`,
      [tokenHash],
    );
    return res.rows[0]?.account_id ?? null;
  }
}
