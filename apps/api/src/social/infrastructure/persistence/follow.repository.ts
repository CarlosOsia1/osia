import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import {
  asAccountId,
  encodeCursor,
  type Cursor,
  type FollowDto,
  type FollowRequestDto,
  type FollowStatus,
  type Page,
  type ProfileBrief,
} from '@osia/shared';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { FollowRepository } from '../../application/ports/out/follow.repository';
import {
  FOLLOW_COLS,
  PROFILE_BRIEF_COLS,
  toFollowDto,
  toProfileBrief,
  type FollowRow,
  type ProfileBriefRow,
} from './mappers';

/** Fila de un ítem de lista de grafo: la vista breve del perfil + la clave keyset de la arista. */
type GraphRow = ProfileBriefRow & { follow_created_at: Date; follow_id: string };

/** Adapter Postgres del grafo de seguidores (S3.2-H1). SQL directo (los schemas no se exponen). */
@Injectable()
export class PgFollowRepository implements FollowRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async follow(
    followerAccountId: string,
    followeeAccountId: string,
    status: FollowStatus,
  ): Promise<{ follow: FollowDto; created: boolean }> {
    // Idempotente por par: si ya existe, ON CONFLICT no inserta y no devuelve fila.
    const inserted = await this.pool.query<FollowRow>(
      `INSERT INTO social.follows (follower_account_id, followee_account_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (follower_account_id, followee_account_id) DO NOTHING
       RETURNING ${FOLLOW_COLS}`,
      [followerAccountId, followeeAccountId, status],
    );
    const created = inserted.rows[0];
    if (created) return { follow: toFollowDto(created), created: true };

    // Ya existía → devolver el vigente (con su estado real: active o pending).
    const existing = await this.pool.query<FollowRow>(
      `SELECT ${FOLLOW_COLS} FROM social.follows
       WHERE follower_account_id = $1 AND followee_account_id = $2`,
      [followerAccountId, followeeAccountId],
    );
    const row = existing.rows[0];
    if (!row) throw new Error('follow ausente tras ON CONFLICT (carrera inesperada)');
    return { follow: toFollowDto(row), created: false };
  }

  async unfollow(followerAccountId: string, followeeAccountId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM social.follows WHERE follower_account_id = $1 AND followee_account_id = $2`,
      [followerAccountId, followeeAccountId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async isAccountPrivate(accountId: string): Promise<boolean> {
    const res = await this.pool.query<{ is_private: boolean }>(
      `SELECT COALESCE(is_private, false) AS is_private FROM social.profile_cards WHERE account_id = $1`,
      [accountId],
    );
    return res.rows[0]?.is_private ?? false;
  }

  async isActiveFollower(followerAccountId: string, followeeAccountId: string): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT 1 FROM social.follows
       WHERE follower_account_id = $1 AND followee_account_id = $2 AND status = 'active'`,
      [followerAccountId, followeeAccountId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async acceptRequest(ownerAccountId: string, requesterAccountId: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE social.follows SET status = 'active'
       WHERE followee_account_id = $1 AND follower_account_id = $2 AND status = 'pending'`,
      [ownerAccountId, requesterAccountId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async rejectRequest(ownerAccountId: string, requesterAccountId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM social.follows
       WHERE followee_account_id = $1 AND follower_account_id = $2 AND status = 'pending'`,
      [ownerAccountId, requesterAccountId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async listPendingRequests(
    accountId: string,
    limit: number,
    cursor: Cursor | null,
  ): Promise<Page<FollowRequestDto>> {
    // Solicitudes ENTRANTES pendientes: perfil del solicitante + su account_id (para aceptar/rechazar).
    const params: unknown[] = [accountId];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor.sortKey, cursor.id);
      cursorClause = `AND (f.created_at, f.id) < ($2::timestamptz, $3::uuid)`;
    }
    params.push(limit + 1);
    const res = await this.pool.query<GraphRow & { req_account_id: string }>(
      `SELECT ${PROFILE_BRIEF_COLS}, p.account_id AS req_account_id,
              f.created_at AS follow_created_at, f.id AS follow_id
       FROM social.follows f
       JOIN identity.profiles p ON p.account_id = f.follower_account_id AND p.deleted_at IS NULL
       WHERE f.followee_account_id = $1 AND f.status = 'pending' ${cursorClause}
       ORDER BY f.created_at DESC, f.id DESC
       LIMIT $${params.length}`,
      params,
    );
    const hasMore = res.rows.length > limit;
    const slice = hasMore ? res.rows.slice(0, limit) : res.rows;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ sortKey: last.follow_created_at.toISOString(), id: last.follow_id })
        : null;
    return {
      data: slice.map((r) => ({ ...toProfileBrief(r), accountId: asAccountId(r.req_account_id) })),
      page: { nextCursor, hasMore, limit },
    };
  }

  async accountExists(accountId: string): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT 1 FROM identity.accounts WHERE id = $1 AND deleted_at IS NULL`,
      [accountId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async accountIdByHandle(handle: string): Promise<string | null> {
    const res = await this.pool.query<{ account_id: string }>(
      `SELECT account_id FROM identity.profiles WHERE handle = $1 AND deleted_at IS NULL`,
      [handle],
    );
    return res.rows[0]?.account_id ?? null;
  }

  listFollowers(accountId: string, limit: number, cursor: Cursor | null): Promise<Page<ProfileBrief>> {
    // Quienes SIGUEN a accountId: unir el perfil del follower, filtrar por followee.
    return this.listGraph('follower_account_id', 'followee_account_id', accountId, limit, cursor);
  }

  listFollowing(accountId: string, limit: number, cursor: Cursor | null): Promise<Page<ProfileBrief>> {
    // A quienes SIGUE accountId: unir el perfil del followee, filtrar por follower.
    return this.listGraph('followee_account_id', 'follower_account_id', accountId, limit, cursor);
  }

  /** Página keyset (created_at DESC, id DESC) del grafo en una dirección. Trae `limit+1` para saber
   *  si hay más; el cursor opaco codifica (created_at, follow id) de la última arista. */
  private async listGraph(
    joinCol: 'follower_account_id' | 'followee_account_id',
    whereCol: 'follower_account_id' | 'followee_account_id',
    accountId: string,
    limit: number,
    cursor: Cursor | null,
    status: FollowStatus = 'active',
  ): Promise<Page<ProfileBrief>> {
    const params: unknown[] = [accountId, status];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor.sortKey, cursor.id);
      cursorClause = `AND (f.created_at, f.id) < ($3::timestamptz, $4::uuid)`;
    }
    params.push(limit + 1);
    const res = await this.pool.query<GraphRow>(
      `SELECT ${PROFILE_BRIEF_COLS}, f.created_at AS follow_created_at, f.id AS follow_id
       FROM social.follows f
       JOIN identity.profiles p ON p.account_id = f.${joinCol} AND p.deleted_at IS NULL
       WHERE f.${whereCol} = $1 AND f.status = $2 ${cursorClause}
       ORDER BY f.created_at DESC, f.id DESC
       LIMIT $${params.length}`,
      params,
    );
    const hasMore = res.rows.length > limit;
    const slice = hasMore ? res.rows.slice(0, limit) : res.rows;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ sortKey: last.follow_created_at.toISOString(), id: last.follow_id })
        : null;
    return { data: slice.map(toProfileBrief), page: { nextCursor, hasMore, limit } };
  }
}
