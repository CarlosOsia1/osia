import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { asAccountId, encodeCursor, type AccountBriefDto, type Cursor, type Page } from '@osia/shared';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { MuteRepository } from '../../application/ports/out/mute.repository';
import { PROFILE_BRIEF_COLS, toProfileBrief, type ProfileBriefRow } from './mappers';

type MutedRow = ProfileBriefRow & { muted_at: Date; muted_account_id: string };

/** Adapter Postgres de silencios (R4.4). Preferencia PRIVADA: solo filtra TU lectura. */
@Injectable()
export class PgMuteRepository implements MuteRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async setMute(muterAccountId: string, mutedAccountId: string): Promise<boolean> {
    // Solo se silencia una cuenta existente y viva; idempotente por PK.
    const res = await this.pool.query(
      `INSERT INTO social.mutes (muter_account_id, muted_account_id)
       SELECT $1, id FROM identity.accounts WHERE id = $2 AND deleted_at IS NULL
       ON CONFLICT (muter_account_id, muted_account_id) DO UPDATE SET muter_account_id = EXCLUDED.muter_account_id
       RETURNING muted_account_id`,
      [muterAccountId, mutedAccountId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async removeMute(muterAccountId: string, mutedAccountId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM social.mutes WHERE muter_account_id = $1 AND muted_account_id = $2`,
      [muterAccountId, mutedAccountId],
    );
  }

  async listMuted(accountId: string, limit: number, cursor: Cursor | null): Promise<Page<AccountBriefDto>> {
    const params: unknown[] = [accountId];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor.sortKey, cursor.id);
      cursorClause = `AND (m.created_at, m.muted_account_id) < ($2::timestamptz, $3::uuid)`;
    }
    params.push(limit + 1);
    const res = await this.pool.query<MutedRow>(
      `SELECT ${PROFILE_BRIEF_COLS}, m.created_at AS muted_at, m.muted_account_id
       FROM social.mutes m
       JOIN identity.profiles p ON p.account_id = m.muted_account_id AND p.deleted_at IS NULL
       WHERE m.muter_account_id = $1 ${cursorClause}
       ORDER BY m.created_at DESC, m.muted_account_id DESC
       LIMIT $${params.length}`,
      params,
    );
    const hasMore = res.rows.length > limit;
    const slice = hasMore ? res.rows.slice(0, limit) : res.rows;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ sortKey: last.muted_at.toISOString(), id: last.muted_account_id })
        : null;
    return {
      data: slice.map((r) => ({ ...toProfileBrief(r), accountId: asAccountId(r.muted_account_id) })),
      page: { nextCursor, hasMore, limit },
    };
  }
}
