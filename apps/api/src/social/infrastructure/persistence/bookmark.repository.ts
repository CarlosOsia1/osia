import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { encodeCursor, type Cursor, type Page, type PostDto, type ReactionKind } from '@osia/shared';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { BookmarkRepository } from '../../application/ports/out/bookmark.repository';
import {
  AUTHOR_BRIEF_ALIASED_COLS,
  recentReactorsLateral,
  referencedPostJoin,
  REF_POST_COLS,
  toAuthorBrief,
  toPostDto,
  toRecentReactors,
  toReferencedPost,
  viewerEchoedSelect,
  type AuthorBriefAliasedRow,
  type PostRow,
  type ProfileBriefRow,
  type RefPostAliasedRow,
} from './mappers';
import { postVisiblePredicate } from './post-visibility';

type BookmarkedPostRow = PostRow &
  AuthorBriefAliasedRow &
  RefPostAliasedRow & {
    bookmarked_at: Date;
    viewer_reaction: ReactionKind | null;
    recent_reactors: ProfileBriefRow[] | null;
    viewer_echoed: boolean;
  };

/** Adapter Postgres de guardados (R4.2). SQL directo; la visibilidad se reimpone en write Y read. */
@Injectable()
export class PgBookmarkRepository implements BookmarkRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async setBookmark(accountId: string, postId: string): Promise<boolean> {
    // Atómico (patrón setReaction): inserta SOLO si el post es visible para el lector — cierra
    // el deep-link a lo privado y la carrera TOCTOU. Idempotente por PK (DO NOTHING).
    const res = await this.pool.query(
      `WITH visible AS (
         SELECT po.id FROM social.posts po WHERE po.id = $2 AND ${postVisiblePredicate('po', '$1')}
       )
       INSERT INTO social.bookmarks (account_id, post_id)
       SELECT $1, id FROM visible
       ON CONFLICT (account_id, post_id) DO UPDATE SET account_id = EXCLUDED.account_id
       RETURNING post_id`,
      [accountId, postId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async removeBookmark(accountId: string, postId: string): Promise<void> {
    await this.pool.query(`DELETE FROM social.bookmarks WHERE account_id = $1 AND post_id = $2`, [
      accountId,
      postId,
    ]);
  }

  async listBookmarks(accountId: string, limit: number, cursor: Cursor | null): Promise<Page<PostDto>> {
    const params: unknown[] = [accountId];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor.sortKey, cursor.id);
      cursorClause = `AND (bm.created_at, bm.post_id) < ($2::timestamptz, $3::uuid)`;
    }
    params.push(limit + 1);
    const res = await this.pool.query<BookmarkedPostRow>(
      `SELECT po.*, bm.created_at AS bookmarked_at, ${AUTHOR_BRIEF_ALIASED_COLS},
              ${REF_POST_COLS},
              reactors.recent_reactors,
              ${viewerEchoedSelect('po', '$1')},
              (SELECT r.kind FROM social.reactions r
                 WHERE r.post_id = po.id AND r.account_id = $1 ORDER BY r.created_at LIMIT 1) AS viewer_reaction
       FROM social.bookmarks bm
       JOIN social.posts po ON po.id = bm.post_id
       JOIN identity.profiles p ON p.account_id = po.author_account_id AND p.deleted_at IS NULL
       ${referencedPostJoin('po', '$1')}
       ${recentReactorsLateral('po')}
       WHERE bm.account_id = $1 AND ${postVisiblePredicate('po', '$1')} ${cursorClause}
       ORDER BY bm.created_at DESC, bm.post_id DESC
       LIMIT $${params.length}`,
      params,
    );
    const hasMore = res.rows.length > limit;
    const slice = hasMore ? res.rows.slice(0, limit) : res.rows;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ sortKey: last.bookmarked_at.toISOString(), id: last.id })
        : null;
    return {
      // Todo lo listado ESTÁ guardado por el lector: viewerBookmarked=true sin subconsulta.
      data: slice.map((r) =>
        toPostDto(r, toAuthorBrief(r), {
          viewerReaction: r.viewer_reaction,
          recentReactors: toRecentReactors(r.recent_reactors),
          viewerBookmarked: true,
          viewerEchoed: r.viewer_echoed,
          referencedPost: toReferencedPost(r),
        }),
      ),
      page: { nextCursor, hasMore, limit },
    };
  }
}
