import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { CreatePostInput, PostDto, ReactionKind } from '@osia/shared';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { PostRepository } from '../../application/ports/out/post.repository';
import {
  AUTHOR_BRIEF_ALIASED_COLS,
  POST_COLS,
  toAuthorBrief,
  toPostDto,
  type AuthorBriefAliasedRow,
  type PostRow,
} from './mappers';
import { postVisiblePredicate } from './post-visibility';

/** Adapter Postgres de posts (S3.3-H1). SQL directo (el schema `social` no se expone por PostgREST). */
@Injectable()
export class PgPostRepository implements PostRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async createPost(authorAccountId: string, input: CreatePostInput): Promise<PostDto> {
    const media = input.media ?? [];
    // Inserta y trae el post + el brief del autor en una sola ida (CTE). El post (`ins.*`) y el perfil
    // (`p.*`) comparten columna `id`, así que el brief del autor se aliasa con prefijo `author_`.
    const res = await this.pool.query<PostRow & AuthorBriefAliasedRow>(
      `WITH ins AS (
         INSERT INTO social.posts (author_account_id, kind, body, media, visibility)
         VALUES ($1, $2, $3, $4::jsonb, $5)
         RETURNING ${POST_COLS}
       )
       SELECT ins.*, ${AUTHOR_BRIEF_ALIASED_COLS}
       FROM ins
       JOIN identity.profiles p ON p.account_id = ins.author_account_id AND p.deleted_at IS NULL`,
      [authorAccountId, input.kind ?? 'text', input.body ?? null, JSON.stringify(media), input.visibility ?? 'public'],
    );
    const row = res.rows[0];
    if (!row) throw new Error('post insertado sin perfil de autor (estado inconsistente)');
    // El autor acaba de crear el post: aún no reaccionó (viewerReaction null) y los contadores son 0.
    return toPostDto(row, toAuthorBrief(row));
  }

  async getById(postId: string, viewerAccountId: string): Promise<PostDto | null> {
    // Reimpone la visibilidad (espejo de posts_select_visible): autor / público / followers con follow
    // activo. `null` si no existe, está borrado, o el lector no puede verlo (mismo trato → 404/oculto).
    const res = await this.pool.query<
      PostRow & AuthorBriefAliasedRow & { viewer_reaction: ReactionKind | null }
    >(
      `SELECT po.*, ${AUTHOR_BRIEF_ALIASED_COLS},
              (SELECT r.kind FROM social.reactions r
                 WHERE r.post_id = po.id AND r.account_id = $2 ORDER BY r.created_at LIMIT 1) AS viewer_reaction
       FROM social.posts po
       JOIN identity.profiles p ON p.account_id = po.author_account_id AND p.deleted_at IS NULL
       WHERE po.id = $1 AND ${postVisiblePredicate('po', '$2')}`,
      [postId, viewerAccountId],
    );
    const row = res.rows[0];
    return row ? toPostDto(row, toAuthorBrief(row), row.viewer_reaction) : null;
  }

  async softDelete(postId: string, authorAccountId: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE social.posts SET deleted_at = now()
       WHERE id = $1 AND author_account_id = $2 AND deleted_at IS NULL`,
      [postId, authorAccountId],
    );
    const deleted = (res.rowCount ?? 0) > 0;
    // Sácalo de los feeds materializados de inmediato (la lectura del feed ya filtra borrados, pero esto
    // evita filas colgantes hasta la poda).
    if (deleted) {
      await this.pool.query(`DELETE FROM social.feed_items WHERE post_id = $1`, [postId]);
    }
    return deleted;
  }
}
