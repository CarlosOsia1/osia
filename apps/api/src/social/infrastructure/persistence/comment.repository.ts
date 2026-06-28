import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { encodeCursor, type CommentDto, type Cursor, type Page } from '@osia/shared';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { CommentRepository } from '../../application/ports/out/comment.repository';
import {
  AUTHOR_BRIEF_ALIASED_COLS,
  toAuthorBrief,
  toCommentDto,
  type AuthorBriefAliasedRow,
  type CommentRow,
} from './mappers';

/** Predicado de visibilidad de un post para `$2` (espejo de RLS posts_select_visible). Reusado en
 *  create/list para que la regla viva en un solo lugar. */
const POST_VISIBLE_PREDICATE = `deleted_at IS NULL AND (
  author_account_id = $2
  OR visibility = 'public'
  OR (visibility = 'followers' AND EXISTS (
    SELECT 1 FROM social.follows f
    WHERE f.follower_account_id = $2
      AND f.followee_account_id = social.posts.author_account_id
      AND f.status = 'active'
  ))
)`;

type CommentJoinRow = CommentRow & AuthorBriefAliasedRow;

/** Adapter Postgres de comentarios (S3.3-H3). SQL directo (el schema `social` no se expone). */
@Injectable()
export class PgCommentRepository implements CommentRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async createComment(
    postId: string,
    authorAccountId: string,
    body: string,
    parentCommentId: string | null,
  ): Promise<CommentDto | null> {
    // Atómico: inserta solo si el post está vivo Y es visible para el autor, y (si hay parent) el parent
    // pertenece a ESTE post y está vivo. Si algo falla, `ins` queda vacío → no hay fila → null → 404.
    const res = await this.pool.query<CommentJoinRow>(
      `WITH visible AS (
         SELECT id FROM social.posts WHERE id = $1 AND ${POST_VISIBLE_PREDICATE}
       ),
       ins AS (
         INSERT INTO social.comments (post_id, author_account_id, parent_comment_id, body)
         SELECT v.id, $2, $4, $3
         FROM visible v
         WHERE $4::uuid IS NULL OR EXISTS (
           SELECT 1 FROM social.comments c
           WHERE c.id = $4 AND c.post_id = $1 AND c.deleted_at IS NULL
         )
         RETURNING id, post_id, author_account_id, parent_comment_id, body, created_at
       )
       SELECT i.id, i.post_id, i.author_account_id, i.parent_comment_id, i.body, i.created_at,
              ${AUTHOR_BRIEF_ALIASED_COLS}
       FROM ins i
       JOIN identity.profiles p ON p.account_id = i.author_account_id AND p.deleted_at IS NULL`,
      [postId, authorAccountId, body, parentCommentId],
    );
    const row = res.rows[0];
    return row ? toCommentDto(row, toAuthorBrief(row)) : null;
  }

  async listComments(
    postId: string,
    viewerAccountId: string,
    limit: number,
    cursor: Cursor | null,
  ): Promise<Page<CommentDto> | null> {
    // El post debe ser visible para el lector; si no, 404 (no listamos comentarios de contenido ajeno).
    const visible = await this.pool.query(
      `SELECT 1 FROM social.posts WHERE id = $1 AND ${POST_VISIBLE_PREDICATE}`,
      [postId, viewerAccountId],
    );
    if (visible.rowCount === 0) return null;

    // Keyset ascendente (cronológico): (created_at, id) > cursor. Trae limit+1 para saber si hay más.
    const params: unknown[] = [postId];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor.sortKey, cursor.id);
      cursorClause = `AND (c.created_at, c.id) > ($2::timestamptz, $3::uuid)`;
    }
    params.push(limit + 1);
    const res = await this.pool.query<CommentJoinRow>(
      `SELECT c.id, c.post_id, c.author_account_id, c.parent_comment_id, c.body, c.created_at,
              ${AUTHOR_BRIEF_ALIASED_COLS}
       FROM social.comments c
       JOIN identity.profiles p ON p.account_id = c.author_account_id AND p.deleted_at IS NULL
       WHERE c.post_id = $1 AND c.deleted_at IS NULL ${cursorClause}
       ORDER BY c.created_at ASC, c.id ASC
       LIMIT $${params.length}`,
      params,
    );
    const hasMore = res.rows.length > limit;
    const slice = hasMore ? res.rows.slice(0, limit) : res.rows;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor({ sortKey: last.created_at.toISOString(), id: last.id }) : null;
    return {
      data: slice.map((r) => toCommentDto(r, toAuthorBrief(r))),
      page: { nextCursor, hasMore, limit },
    };
  }

  async softDeleteOwnComment(commentId: string, accountId: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE social.comments SET deleted_at = now()
       WHERE id = $1 AND author_account_id = $2 AND deleted_at IS NULL`,
      [commentId, accountId],
    );
    return (res.rowCount ?? 0) > 0;
  }
}
