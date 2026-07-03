import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { encodeCursor, type CommentDto, type Cursor, type Page } from '@osia/shared';
import type { Tx } from '../../../common/tx';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { CommentRepository, CreatedComment } from '../../application/ports/out/comment.repository';
import {
  AUTHOR_BRIEF_ALIASED_COLS,
  toAuthorBrief,
  toCommentDto,
  type AuthorBriefAliasedRow,
  type CommentRow,
} from './mappers';
import { postVisiblePredicate } from './post-visibility';

/** Visibilidad del post para el lector `$2` (incluye privacidad de cuenta, S3.8). Fuente única (DRY). */
const POST_VISIBLE_PREDICATE = postVisiblePredicate('social.posts', '$2');

type CommentJoinRow = CommentRow & AuthorBriefAliasedRow;
type CreateCommentRow = CommentJoinRow & { post_author_account_id: string };

/** Adapter Postgres de comentarios (S3.3-H3 / S3.4). SQL directo (el schema `social` no se expone). */
@Injectable()
export class PgCommentRepository implements CommentRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async createComment(
    postId: string,
    authorAccountId: string,
    body: string,
    parentCommentId: string | null,
    db: Tx = this.pool,
  ): Promise<CreatedComment | null> {
    // Atómico: inserta solo si el post está vivo Y es visible para el autor, y (si hay parent) el parent
    // pertenece a ESTE post y está vivo. Si algo falla, `ins` queda vacío → no hay fila → null → 404.
    // `visible` también trae el autor del post (receptor de la notificación de comentario, S3.4).
    const res = await db.query<CreateCommentRow>(
      `WITH visible AS (
         SELECT id, author_account_id FROM social.posts WHERE id = $1 AND ${POST_VISIBLE_PREDICATE}
       ),
       ins AS (
         INSERT INTO social.comments (post_id, author_account_id, parent_comment_id, body)
         SELECT v.id, $2, $4, $3
         FROM visible v
         WHERE $4::uuid IS NULL OR EXISTS (
           SELECT 1 FROM social.comments c
           WHERE c.id = $4 AND c.post_id = $1 AND c.deleted_at IS NULL
         )
         RETURNING id, post_id, author_account_id, parent_comment_id, body, edited_at, created_at
       )
       SELECT i.id, i.post_id, i.author_account_id, i.parent_comment_id, i.body, i.edited_at, i.created_at,
              v.author_account_id AS post_author_account_id,
              ${AUTHOR_BRIEF_ALIASED_COLS}
       FROM ins i
       JOIN visible v ON true
       JOIN identity.profiles p ON p.account_id = i.author_account_id AND p.deleted_at IS NULL`,
      [postId, authorAccountId, body, parentCommentId],
    );
    const row = res.rows[0];
    if (!row) return null;
    return { comment: toCommentDto(row, toAuthorBrief(row)), postAuthorAccountId: row.post_author_account_id };
  }

  async resolveMentionedAccountIds(handles: string[]): Promise<string[]> {
    if (handles.length === 0) return [];
    // handle es citext (case-insensitive); los handles vienen en minúscula del parser.
    const res = await this.pool.query<{ account_id: string }>(
      `SELECT account_id FROM identity.profiles WHERE handle = ANY($1::citext[]) AND deleted_at IS NULL`,
      [handles],
    );
    return res.rows.map((r) => r.account_id);
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
      `SELECT c.id, c.post_id, c.author_account_id, c.parent_comment_id, c.body, c.edited_at, c.created_at,
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

  async updateOwnComment(
    commentId: string,
    accountId: string,
    body: string,
  ): Promise<CommentDto | null> {
    // Ownership en la MISMA sentencia (0 filas = no existe o no es tuyo → 404, sin oráculo).
    const res = await this.pool.query<CommentJoinRow>(
      `WITH upd AS (
         UPDATE social.comments SET body = $3, edited_at = now()
         WHERE id = $1 AND author_account_id = $2 AND deleted_at IS NULL
         RETURNING *
       )
       SELECT upd.*, ${AUTHOR_BRIEF_ALIASED_COLS}
       FROM upd
       JOIN identity.profiles p ON p.account_id = upd.author_account_id AND p.deleted_at IS NULL`,
      [commentId, accountId, body],
    );
    const row = res.rows[0];
    return row ? toCommentDto(row, toAuthorBrief(row)) : null;
  }
}
