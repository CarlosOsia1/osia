import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { REPUTATION_WEIGHTS } from '@osia/shared';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { ReputationLedgerPort } from '../../application/ports/out/reputation-ledger.port';

/**
 * Adapter Postgres del ledger de reputación (S3.2-H3). SQL directo (el schema `economy` no se expone).
 * El INSERT es idempotente por el índice único parcial `uq_reputation_new_follower`: un seguidor
 * acredita a un seguido una sola vez (anti-grind ante follow/unfollow/refollow). El caché en
 * `identity.profiles` lo mantiene el trigger `trg_reputation_cache` dentro de la misma transacción.
 */
@Injectable()
export class PgReputationLedger implements ReputationLedgerPort {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async creditNewFollower(
    followeeAccountId: string,
    followerAccountId: string,
  ): Promise<{ credited: boolean }> {
    const res = await this.pool.query(
      `INSERT INTO economy.reputation_ledger (account_id, reason, delta, source_ref)
       VALUES ($1, 'new_follower', $2, $3)
       ON CONFLICT (account_id, source_ref) WHERE reason = 'new_follower' DO NOTHING`,
      [followeeAccountId, REPUTATION_WEIGHTS.new_follower, followerAccountId],
    );
    return { credited: (res.rowCount ?? 0) > 0 };
  }
}
