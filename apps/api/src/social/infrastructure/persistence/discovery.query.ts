import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { asAccountId, type ProfileSummaryDto } from '@osia/shared';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { DiscoveryQueryPort } from '../../application/ports/out/discovery.query';
import { PROFILE_BRIEF_COLS, toProfileBrief, type ProfileBriefRow } from './mappers';

type SummaryRow = ProfileBriefRow & { acct: string; is_following: boolean; is_requested: boolean };

const toSummary = (r: SummaryRow): ProfileSummaryDto => ({
  ...toProfileBrief(r),
  accountId: asAccountId(r.acct),
  viewerState: r.is_following ? 'following' : r.is_requested ? 'requested' : 'none',
});

/** Escapa los comodines de LIKE (`% _ \`) para que la búsqueda por prefijo sea literal. */
function likePrefix(q: string): string {
  return `${q.replace(/[\\%_]/g, '\\$&')}%`;
}

/** Adapter de descubrimiento (S3.11) sobre identity.profiles + social.follows. SQL directo. */
@Injectable()
export class PgDiscoveryQuery implements DiscoveryQueryPort {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async search(viewerAccountId: string, q: string, limit: number): Promise<ProfileSummaryDto[]> {
    const res = await this.pool.query<SummaryRow>(
      `SELECT ${PROFILE_BRIEF_COLS}, p.account_id AS acct,
              EXISTS (SELECT 1 FROM social.follows f
                WHERE f.follower_account_id = $1 AND f.followee_account_id = p.account_id
                  AND f.status = 'active') AS is_following,
              EXISTS (SELECT 1 FROM social.follows f
                WHERE f.follower_account_id = $1 AND f.followee_account_id = p.account_id
                  AND f.status = 'pending') AS is_requested
       FROM identity.profiles p
       WHERE p.deleted_at IS NULL AND p.account_id <> $1
         AND (p.handle ILIKE $2 ESCAPE '\\' OR p.display_name ILIKE $2 ESCAPE '\\')
         AND NOT EXISTS (SELECT 1 FROM social.follows b WHERE b.status = 'blocked'
           AND ((b.follower_account_id = $1 AND b.followee_account_id = p.account_id)
             OR (b.follower_account_id = p.account_id AND b.followee_account_id = $1)))
       ORDER BY p.popularity_points DESC, p.handle ASC
       LIMIT $3`,
      [viewerAccountId, likePrefix(q), limit],
    );
    return res.rows.map(toSummary);
  }

  async suggestions(viewerAccountId: string, limit: number): Promise<ProfileSummaryDto[]> {
    const res = await this.pool.query<SummaryRow>(
      `SELECT ${PROFILE_BRIEF_COLS}, p.account_id AS acct, false AS is_following, false AS is_requested
       FROM identity.profiles p
       WHERE p.deleted_at IS NULL AND p.account_id <> $1
         AND NOT EXISTS (SELECT 1 FROM social.follows f
           WHERE f.follower_account_id = $1 AND f.followee_account_id = p.account_id)
         AND NOT EXISTS (SELECT 1 FROM social.follows b WHERE b.status = 'blocked'
           AND ((b.follower_account_id = $1 AND b.followee_account_id = p.account_id)
             OR (b.follower_account_id = p.account_id AND b.followee_account_id = $1)))
       ORDER BY p.popularity_points DESC, p.id DESC
       LIMIT $2`,
      [viewerAccountId, limit],
    );
    return res.rows.map(toSummary);
  }
}
