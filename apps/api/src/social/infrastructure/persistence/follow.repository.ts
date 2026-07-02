import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import {
  asAccountId,
  encodeCursor,
  type AccountBriefDto,
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
  ): Promise<{ follow: FollowDto; created: boolean } | null> {
    // El `status` se decide DENTRO del INSERT leyendo profile_cards.is_private en la misma snapshot:
    // `pending` si el destino es privado, `active` si no. Cierra el TOCTOU (leer is_private y luego
    // insertar en sentencias separadas dejaba una ventana donde la cuenta se volvía privada entremedio
    // y nacía una arista `active` saltándose la solicitud). Idempotente: ON CONFLICT no inserta.
    // Bloqueo (R4.4): con un par bloqueado en CUALQUIER dirección no se sigue — el WHERE vacía el
    // SELECT, no inserta, y el `null` final se traduce a 403 BLOCKED en el caso de uso.
    const inserted = await this.pool.query<FollowRow>(
      `INSERT INTO social.follows (follower_account_id, followee_account_id, status)
       SELECT $1, $2,
         CASE WHEN EXISTS (SELECT 1 FROM social.profile_cards pc
                            WHERE pc.account_id = $2 AND pc.is_private)
              THEN 'pending' ELSE 'active' END
       WHERE NOT EXISTS (
         SELECT 1 FROM social.follows b WHERE b.status = 'blocked'
           AND ((b.follower_account_id = $1 AND b.followee_account_id = $2)
             OR (b.follower_account_id = $2 AND b.followee_account_id = $1))
       )
       ON CONFLICT (follower_account_id, followee_account_id) DO NOTHING
       RETURNING ${FOLLOW_COLS}`,
      [followerAccountId, followeeAccountId],
    );
    const created = inserted.rows[0];
    if (created) return { follow: toFollowDto(created), created: true };

    // Ya existía → devolver el vigente (active o pending; una arista `blocked` propia no es un follow).
    const existing = await this.pool.query<FollowRow>(
      `SELECT ${FOLLOW_COLS} FROM social.follows
       WHERE follower_account_id = $1 AND followee_account_id = $2 AND status IN ('active', 'pending')`,
      [followerAccountId, followeeAccountId],
    );
    const row = existing.rows[0];
    if (!row) return null; // bloqueado en alguna dirección → 403 (sin oráculo de cuál)
    return { follow: toFollowDto(row), created: false };
  }

  async unfollow(followerAccountId: string, followeeAccountId: string): Promise<boolean> {
    // Borra la arista Y limpia del feed del follower los posts del ex-seguido (atómico, un solo
    // statement con CTEs data-modifying). Sin esto, los posts del ex-seguido seguían apareciendo en
    // el feed hasta la poda de 90 días (inconsistencia: "dejé de seguir pero lo sigo viendo").
    // Solo aristas `active`/`pending`: un unfollow jamás deshace un bloqueo (R4.4).
    const res = await this.pool.query<{ removed: number }>(
      `WITH removed AS (
         DELETE FROM social.follows
          WHERE follower_account_id = $1 AND followee_account_id = $2
            AND status IN ('active', 'pending')
          RETURNING 1
       ), cleaned AS (
         DELETE FROM social.feed_items
          WHERE account_id = $1
            AND post_id IN (SELECT id FROM social.posts WHERE author_account_id = $2)
          RETURNING 1
       )
       SELECT count(*)::int AS removed FROM removed`,
      [followerAccountId, followeeAccountId],
    );
    return (res.rows[0]?.removed ?? 0) > 0;
  }

  async block(blockerAccountId: string, blockedAccountId: string): Promise<void> {
    // Bloquear, atómico: (1) la arista blocker→blocked pasa a `blocked` (upsert), (2) la arista
    // inversa muere (te dejo de seguir y tú a mí, incluidas solicitudes), (3) los feeds de ambos
    // quedan limpios del otro. Idempotente.
    await this.pool.query(
      `WITH mine AS (
         INSERT INTO social.follows (follower_account_id, followee_account_id, status)
         VALUES ($1, $2, 'blocked')
         ON CONFLICT (follower_account_id, followee_account_id)
           DO UPDATE SET status = 'blocked'
       ),
       theirs AS (
         DELETE FROM social.follows
          WHERE follower_account_id = $2 AND followee_account_id = $1
            AND status IN ('active', 'pending')
       ),
       my_feed AS (
         DELETE FROM social.feed_items
          WHERE account_id = $1
            AND post_id IN (SELECT id FROM social.posts WHERE author_account_id = $2)
       )
       DELETE FROM social.feed_items
        WHERE account_id = $2
          AND post_id IN (SELECT id FROM social.posts WHERE author_account_id = $1)`,
      [blockerAccountId, blockedAccountId],
    );
  }

  async unblock(blockerAccountId: string, blockedAccountId: string): Promise<boolean> {
    // Desbloquear = borrar MI arista `blocked` (no restaura follows: cada quien vuelve a seguir si quiere).
    const res = await this.pool.query(
      `DELETE FROM social.follows
       WHERE follower_account_id = $1 AND followee_account_id = $2 AND status = 'blocked'`,
      [blockerAccountId, blockedAccountId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async listBlocked(
    accountId: string,
    limit: number,
    cursor: Cursor | null,
  ): Promise<Page<AccountBriefDto>> {
    // A quienes YO bloqueé (mi lista de gestión; la dirección inversa jamás se revela). Con
    // `accountId` (asa del botón «Desbloquear»), como las solicitudes.
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
       JOIN identity.profiles p ON p.account_id = f.followee_account_id AND p.deleted_at IS NULL
       WHERE f.follower_account_id = $1 AND f.status = 'blocked' ${cursorClause}
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
