import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import {
  asAccountId,
  asConversationId,
  asMessageId,
  encodeCursor,
  type ConversationDto,
  type Cursor,
  type MessageDto,
  type Page,
} from '@osia/shared';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { DmRepository } from '../../application/ports/out/dm.repository';
import { toProfileBrief, type ProfileBriefRow } from './mappers';

/** Par bloqueado en cualquier dirección (fragmento reusado; sin oráculo de la dirección). */
function blockedPair(x: string, y: string): string {
  return `EXISTS (SELECT 1 FROM social.follows bl WHERE bl.status = 'blocked'
    AND ((bl.follower_account_id = ${x} AND bl.followee_account_id = ${y})
      OR (bl.follower_account_id = ${y} AND bl.followee_account_id = ${x})))`;
}

type ConversationRow = ProfileBriefRow & {
  conv_id: string;
  other_account_id: string;
  last_message_at: Date | null;
  last_message_preview: string | null;
  unread_count: number;
  sort_at: Date;
};

/** Columnas + joins de una conversación VISTA por `$1` (el otro lado + unread + preview). */
const CONVERSATION_SELECT = `
  SELECT c.id AS conv_id,
         CASE WHEN c.a_account_id = $1 THEN c.b_account_id ELSE c.a_account_id END AS other_account_id,
         c.last_message_at,
         COALESCE(c.last_message_at, c.created_at) AS sort_at,
         (SELECT m.body FROM social.dm_messages m
            WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_message_preview,
         (SELECT count(*)::int FROM social.dm_messages m
            WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
              AND m.sender_account_id <> $1
              AND m.created_at > COALESCE(
                CASE WHEN c.a_account_id = $1 THEN c.a_last_read_at ELSE c.b_last_read_at END,
                'epoch'::timestamptz)) AS unread_count,
         p.id, p.handle, p.display_name, p.avatar_url, p.accent_color, p.popularity_points
  FROM social.dm_conversations c
  JOIN identity.profiles p
    ON p.account_id = CASE WHEN c.a_account_id = $1 THEN c.b_account_id ELSE c.a_account_id END
   AND p.deleted_at IS NULL`;

function toConversationDto(row: ConversationRow): ConversationDto {
  return {
    id: asConversationId(row.conv_id),
    other: { ...toProfileBrief(row), accountId: asAccountId(row.other_account_id) },
    lastMessageAt: row.last_message_at ? row.last_message_at.toISOString() : null,
    lastMessagePreview: row.last_message_preview,
    unreadCount: row.unread_count,
  };
}

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_account_id: string;
  body: string;
  created_at: Date;
  deleted_at: Date | null;
};

function toMessageDto(row: MessageRow): MessageDto {
  return {
    id: asMessageId(row.id),
    conversationId: asConversationId(row.conversation_id),
    senderAccountId: asAccountId(row.sender_account_id),
    // Retirado: el hilo conserva el hueco («mensaje retirado»), nunca el contenido.
    body: row.deleted_at ? null : row.body,
    createdAt: row.created_at.toISOString(),
  };
}

/** Adapter Postgres de DM (R5). Par canónico (a<b); bloqueo re-verificado en abrir Y enviar. */
@Injectable()
export class PgDmRepository implements DmRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getOrCreateConversation(
    viewerAccountId: string,
    otherAccountId: string,
  ): Promise<ConversationDto | null> {
    // Atómico: crea (o no-op) SOLO si el destino vive y el par no está bloqueado; luego lee la
    // conversación como DTO. LEAST/GREATEST impone el par canónico del CHECK.
    await this.pool.query(
      `INSERT INTO social.dm_conversations (a_account_id, b_account_id)
       SELECT LEAST($1::uuid, $2::uuid), GREATEST($1::uuid, $2::uuid)
       WHERE EXISTS (SELECT 1 FROM identity.accounts a WHERE a.id = $2 AND a.deleted_at IS NULL)
         AND NOT ${blockedPair('$1', '$2')}
       ON CONFLICT (a_account_id, b_account_id) DO NOTHING`,
      [viewerAccountId, otherAccountId],
    );
    const res = await this.pool.query<ConversationRow>(
      `${CONVERSATION_SELECT}
       WHERE c.a_account_id = LEAST($1::uuid, $2::uuid)
         AND c.b_account_id = GREATEST($1::uuid, $2::uuid)
         AND NOT ${blockedPair('$1', '$2')}`,
      [viewerAccountId, otherAccountId],
    );
    const row = res.rows[0];
    return row ? toConversationDto(row) : null;
  }

  async listConversations(
    viewerAccountId: string,
    limit: number,
    cursor: Cursor | null,
  ): Promise<{ page: Page<ConversationDto>; unreadTotal: number }> {
    const params: unknown[] = [viewerAccountId];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor.sortKey, cursor.id);
      cursorClause = `AND (COALESCE(c.last_message_at, c.created_at), c.id) < ($2::timestamptz, $3::uuid)`;
    }
    params.push(limit + 1);
    const res = await this.pool.query<ConversationRow>(
      `${CONVERSATION_SELECT}
       WHERE (c.a_account_id = $1 OR c.b_account_id = $1)
         AND NOT ${blockedPair('c.a_account_id', 'c.b_account_id')} ${cursorClause}
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC, c.id DESC
       LIMIT $${params.length}`,
      params,
    );
    const hasMore = res.rows.length > limit;
    const slice = hasMore ? res.rows.slice(0, limit) : res.rows;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ sortKey: last.sort_at.toISOString(), id: last.conv_id })
        : null;

    const totals = await this.pool.query<{ unread_total: number }>(
      `SELECT COALESCE(SUM((
         SELECT count(*) FROM social.dm_messages m
          WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
            AND m.sender_account_id <> $1
            AND m.created_at > COALESCE(
              CASE WHEN c.a_account_id = $1 THEN c.a_last_read_at ELSE c.b_last_read_at END,
              'epoch'::timestamptz)
       )), 0)::int AS unread_total
       FROM social.dm_conversations c
       WHERE (c.a_account_id = $1 OR c.b_account_id = $1)
         AND NOT ${blockedPair('c.a_account_id', 'c.b_account_id')}`,
      [viewerAccountId],
    );
    return {
      page: { data: slice.map(toConversationDto), page: { nextCursor, hasMore, limit } },
      unreadTotal: totals.rows[0]?.unread_total ?? 0,
    };
  }

  async listMessages(
    conversationId: string,
    viewerAccountId: string,
    limit: number,
    cursor: Cursor | null,
  ): Promise<Page<MessageDto> | null> {
    // Membresía Y no-bloqueo: tras un bloqueo el hilo tampoco se relee por deep-link (espejo de
    // sendMessage y de la bandeja); no-miembro y bloqueado reciben el mismo 404, sin oráculo.
    const member = await this.pool.query(
      `SELECT 1 FROM social.dm_conversations c
       WHERE c.id = $1 AND (c.a_account_id = $2 OR c.b_account_id = $2)
         AND NOT ${blockedPair('c.a_account_id', 'c.b_account_id')}`,
      [conversationId, viewerAccountId],
    );
    if ((member.rowCount ?? 0) === 0) return null;

    const params: unknown[] = [conversationId];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor.sortKey, cursor.id);
      cursorClause = `AND (m.created_at, m.id) < ($2::timestamptz, $3::uuid)`;
    }
    params.push(limit + 1);
    const res = await this.pool.query<MessageRow>(
      `SELECT m.id, m.conversation_id, m.sender_account_id, m.body, m.created_at, m.deleted_at
       FROM social.dm_messages m
       WHERE m.conversation_id = $1 ${cursorClause}
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT $${params.length}`,
      params,
    );
    const hasMore = res.rows.length > limit;
    const slice = hasMore ? res.rows.slice(0, limit) : res.rows;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor({ sortKey: last.created_at.toISOString(), id: last.id }) : null;
    return { data: slice.map(toMessageDto), page: { nextCursor, hasMore, limit } };
  }

  async sendMessage(
    conversationId: string,
    viewerAccountId: string,
    body: string,
  ): Promise<MessageDto | null> {
    // Atómico: inserta SOLO si la conversación es del lector y el par sigue sin bloqueo (el
    // bloqueo posterior a abrir la conversación también corta el envío). Bumpea la actividad
    // y deja al remitente leído (lo propio no cuenta como no-leído).
    const res = await this.pool.query<MessageRow>(
      `WITH ok AS (
         SELECT c.id, c.a_account_id, c.b_account_id FROM social.dm_conversations c
         WHERE c.id = $1 AND (c.a_account_id = $2 OR c.b_account_id = $2)
           AND NOT ${blockedPair('c.a_account_id', 'c.b_account_id')}
       ),
       ins AS (
         INSERT INTO social.dm_messages (conversation_id, sender_account_id, body)
         SELECT id, $2, $3 FROM ok
         RETURNING id, conversation_id, sender_account_id, body, created_at, deleted_at
       ),
       bump AS (
         UPDATE social.dm_conversations c SET
           last_message_at = ins.created_at,
           a_last_read_at = CASE WHEN c.a_account_id = $2 THEN ins.created_at ELSE c.a_last_read_at END,
           b_last_read_at = CASE WHEN c.b_account_id = $2 THEN ins.created_at ELSE c.b_last_read_at END
         FROM ins WHERE c.id = ins.conversation_id
       )
       SELECT * FROM ins`,
      [conversationId, viewerAccountId, body],
    );
    const row = res.rows[0];
    return row ? toMessageDto(row) : null;
  }

  async markRead(conversationId: string, viewerAccountId: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE social.dm_conversations c SET
         a_last_read_at = CASE WHEN c.a_account_id = $2 THEN now() ELSE c.a_last_read_at END,
         b_last_read_at = CASE WHEN c.b_account_id = $2 THEN now() ELSE c.b_last_read_at END
       WHERE c.id = $1 AND (c.a_account_id = $2 OR c.b_account_id = $2)`,
      [conversationId, viewerAccountId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async deleteOwnMessage(messageId: string, viewerAccountId: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE social.dm_messages SET deleted_at = now()
       WHERE id = $1 AND sender_account_id = $2 AND deleted_at IS NULL`,
      [messageId, viewerAccountId],
    );
    return (res.rowCount ?? 0) > 0;
  }
}
