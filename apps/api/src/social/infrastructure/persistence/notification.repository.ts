import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import {
  encodeCursor,
  type Cursor,
  type NotificationDto,
  type NotificationType,
  type Page,
} from '@osia/shared';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { NotificationRepository } from '../../application/ports/out/notification.repository';
import { NOTIFICATION_ACTOR_COLS, toNotificationDto, type NotificationRow } from './mappers';

/** Adapter Postgres de notificaciones (S3.4-H2). SQL directo (el schema `social` no se expone). */
@Injectable()
export class PgNotificationRepository implements NotificationRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    id: string,
    accountId: string,
    kind: NotificationType,
    actorAccountId: string | null,
    payload: Record<string, unknown>,
  ): Promise<void> {
    // El id determinista (uuid v5 de la clave del evento) hace la escritura idempotente: una re-entrega
    // del outbox choca en la PK y no duplica. `DO NOTHING` la vuelve un no-op silencioso.
    await this.pool.query(
      `INSERT INTO social.notifications (id, account_id, kind, actor_account_id, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [id, accountId, kind, actorAccountId, JSON.stringify(payload)],
    );
  }

  async list(
    accountId: string,
    limit: number,
    cursor: Cursor | null,
    unreadOnly: boolean,
  ): Promise<Page<NotificationDto>> {
    const params: unknown[] = [accountId];
    let where = 'n.account_id = $1';
    if (unreadOnly) where += ' AND n.read_at IS NULL';
    if (cursor) {
      params.push(cursor.sortKey, cursor.id);
      where += ` AND (n.created_at, n.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`;
    }
    params.push(limit + 1);
    const res = await this.pool.query<NotificationRow>(
      `SELECT n.id, n.kind, n.payload, n.read_at, n.created_at, ${NOTIFICATION_ACTOR_COLS}
       FROM social.notifications n
       LEFT JOIN identity.profiles pa ON pa.account_id = n.actor_account_id AND pa.deleted_at IS NULL
       WHERE ${where}
         -- R4.4: la campana calla a bloqueados (cualquier dirección) y silenciados — también lo previo.
         AND (n.actor_account_id IS NULL OR (
           NOT EXISTS (SELECT 1 FROM social.follows b WHERE b.status = 'blocked'
             AND ((b.follower_account_id = $1 AND b.followee_account_id = n.actor_account_id)
               OR (b.follower_account_id = n.actor_account_id AND b.followee_account_id = $1)))
           AND NOT EXISTS (SELECT 1 FROM social.mutes m
             WHERE m.muter_account_id = $1 AND m.muted_account_id = n.actor_account_id)
         ))
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT $${params.length}`,
      params,
    );
    const hasMore = res.rows.length > limit;
    const slice = hasMore ? res.rows.slice(0, limit) : res.rows;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor({ sortKey: last.created_at.toISOString(), id: last.id }) : null;
    return { data: slice.map(toNotificationDto), page: { nextCursor, hasMore, limit } };
  }

  async unreadCount(accountId: string): Promise<number> {
    // El contador DEBE aplicar el MISMO filtro que `list` (bloqueados en cualquier dirección +
    // silenciados), o el badge muestra «no-leídos fantasma»: cuenta N y la campana abierta no
    // enseña nada (QA R6). Mismo predicado que arriba, con `n` como alias de la notificación.
    const res = await this.pool.query<{ count: string }>(
      `SELECT count(*)::int AS count FROM social.notifications n
       WHERE n.account_id = $1 AND n.read_at IS NULL
         AND (n.actor_account_id IS NULL OR (
           NOT EXISTS (SELECT 1 FROM social.follows b WHERE b.status = 'blocked'
             AND ((b.follower_account_id = $1 AND b.followee_account_id = n.actor_account_id)
               OR (b.follower_account_id = n.actor_account_id AND b.followee_account_id = $1)))
           AND NOT EXISTS (SELECT 1 FROM social.mutes m
             WHERE m.muter_account_id = $1 AND m.muted_account_id = n.actor_account_id)
         ))`,
      [accountId],
    );
    return Number(res.rows[0]?.count ?? 0);
  }

  async markRead(accountId: string, ids?: string[]): Promise<void> {
    if (ids && ids.length === 0) return; // lista vacía explícita: nada que marcar
    const params: unknown[] = [accountId];
    let extra = '';
    if (ids) {
      params.push(ids);
      extra = ` AND id = ANY($2::uuid[])`;
    }
    await this.pool.query(
      `UPDATE social.notifications SET read_at = now()
       WHERE account_id = $1 AND read_at IS NULL${extra}`,
      params,
    );
  }

  async markOneRead(accountId: string, id: string): Promise<boolean> {
    // Idempotente: re-marcar una ya leída devuelve true (existe y es suya). 404 solo si no es suya.
    const res = await this.pool.query(
      `UPDATE social.notifications SET read_at = COALESCE(read_at, now())
       WHERE id = $1 AND account_id = $2`,
      [id, accountId],
    );
    return (res.rowCount ?? 0) > 0;
  }
}
