import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from './postgres.tokens';
import type { RetentionRepository } from '../../application/ports/out/retention.repository';

/** Purga de datos vencidos (política de retención) por conexión directa. Devuelve filas borradas. */
@Injectable()
export class PgRetentionRepository implements RetentionRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async purgeExpiredEmailVerifications(days: number): Promise<number> {
    // Consumidas o vencidas hace más de `days` (las vivas y aún válidas no se tocan).
    const res = await this.pool.query(
      `DELETE FROM identity.email_verifications
       WHERE COALESCE(consumed_at, expires_at) < now() - make_interval(days => $1::int)`,
      [days],
    );
    return res.rowCount ?? 0;
  }

  async purgeExpiredDeletionTokens(days: number): Promise<number> {
    const res = await this.pool.query(
      `DELETE FROM identity.account_deletion_tokens
       WHERE COALESCE(consumed_at, expires_at) < now() - make_interval(days => $1::int)`,
      [days],
    );
    return res.rowCount ?? 0;
  }

  async purgeOldAuditLogs(days: number): Promise<number> {
    const res = await this.pool.query(
      `DELETE FROM system.audit_logs WHERE created_at < now() - make_interval(days => $1::int)`,
      [days],
    );
    return res.rowCount ?? 0;
  }
}
