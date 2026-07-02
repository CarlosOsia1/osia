import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { encodeCursor, type Cursor, type FeedItemDto, type Page } from '@osia/shared';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { FeedRepository } from '../../application/ports/out/feed.repository';
import {
  AUTHOR_BRIEF_ALIASED_COLS,
  recentReactorsLateral,
  referencedPostJoin,
  REF_POST_COLS,
  toFeedItemDto,
  viewerBookmarkedSelect,
  viewerEchoedSelect,
  type FeedItemRow,
} from './mappers';
import { postVisiblePredicate } from './post-visibility';

/** Adapter Postgres del feed (S3.3-H4). Fan-out-on-write + lectura keyset + poda. SQL directo. */
@Injectable()
export class PgFeedRepository implements FeedRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async fanOutPost(postId: string, authorAccountId: string, createdAt: string): Promise<number> {
    // Una fila por seguidor activo + una para el autor (ve su propio post). `created_at` = fecha del post
    // para que el orden del feed coincida con la cronología real. UNION dedup (no hay auto-follow).
    // Casts `::uuid` explícitos: en INSERT…SELECT (con UNION) Postgres no infiere el tipo del parámetro
    // desde la columna destino y lo trataría como text → mismatch con post_id/account_id (uuid).
    // Un post `private` (solo-autor) NO se reparte a seguidores: solo entra al feed del propio autor.
    // `public`/`followers` sí van a los seguidores activos (que están autorizados a verlos).
    const res = await this.pool.query(
      `INSERT INTO social.feed_items (account_id, post_id, reason, created_at)
       SELECT fo.follower_account_id, $1::uuid, 'follow', $3::timestamptz
         FROM social.follows fo
         JOIN social.posts po ON po.id = $1::uuid
        WHERE fo.followee_account_id = $2::uuid AND fo.status = 'active'
          AND po.visibility <> 'private'
       UNION
       SELECT $2::uuid, $1::uuid, 'follow', $3::timestamptz`,
      [postId, authorAccountId, createdAt],
    );
    return res.rowCount ?? 0;
  }

  async getFeed(accountId: string, limit: number, cursor: Cursor | null): Promise<Page<FeedItemDto>> {
    const params: unknown[] = [accountId];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor.sortKey, cursor.id);
      cursorClause = `AND (fi.created_at, fi.id) < ($2::timestamptz, $3::uuid)`;
    }
    params.push(limit + 1);
    const res = await this.pool.query<FeedItemRow>(
      `SELECT fi.id AS feed_id, fi.reason AS feed_reason, fi.score AS feed_score,
              fi.created_at AS feed_created_at,
              po.id AS post_id, po.author_account_id AS post_author_account_id, po.kind AS post_kind,
              po.body AS post_body, po.media AS post_media, po.visibility AS post_visibility,
              po.reaction_count AS post_reaction_count, po.comment_count AS post_comment_count,
              po.edited_at AS post_edited_at,
              po.referenced_post_id AS post_referenced_post_id, po.echo_count AS post_echo_count,
              po.created_at AS post_created_at, po.updated_at AS post_updated_at,
              ${AUTHOR_BRIEF_ALIASED_COLS},
              ${REF_POST_COLS},
              reactors.recent_reactors,
              ${viewerBookmarkedSelect('po', '$1')},
              ${viewerEchoedSelect('po', '$1')},
              (SELECT r.kind FROM social.reactions r
                 WHERE r.post_id = po.id AND r.account_id = $1
                 ORDER BY r.created_at LIMIT 1) AS viewer_reaction
       FROM social.feed_items fi
       JOIN social.posts po ON po.id = fi.post_id AND po.deleted_at IS NULL
       JOIN identity.profiles p ON p.account_id = po.author_account_id AND p.deleted_at IS NULL
       ${referencedPostJoin('po', '$1')}
       ${recentReactorsLateral('po')}
       WHERE fi.account_id = $1 AND ${postVisiblePredicate('po', '$1')}
         -- Silenciados (R4.4): fuera de MI feed, sin que lo sepan (preferencia privada de lectura).
         AND NOT EXISTS (SELECT 1 FROM social.mutes m
           WHERE m.muter_account_id = $1 AND m.muted_account_id = po.author_account_id)
         ${cursorClause}
       ORDER BY fi.created_at DESC, fi.id DESC
       LIMIT $${params.length}`,
      params,
    );
    const hasMore = res.rows.length > limit;
    const slice = hasMore ? res.rows.slice(0, limit) : res.rows;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ sortKey: last.feed_created_at.toISOString(), id: last.feed_id })
        : null;
    return { data: slice.map(toFeedItemDto), page: { nextCursor, hasMore, limit } };
  }

  async pruneOlderThan(days: number): Promise<number> {
    const res = await this.pool.query(
      `DELETE FROM social.feed_items WHERE created_at < now() - ($1 || ' days')::interval`,
      [String(days)],
    );
    return res.rowCount ?? 0;
  }
}
