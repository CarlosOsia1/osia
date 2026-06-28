import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { CreatePostInput, PostDto } from '@osia/shared';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { PostRepository } from '../../application/ports/out/post.repository';
import { POST_COLS, toPostDto, toProfileBrief, type PostRow, type ProfileBriefRow } from './mappers';

/** Adapter Postgres de posts (S3.3-H1). SQL directo (el schema `social` no se expone por PostgREST). */
@Injectable()
export class PgPostRepository implements PostRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async createPost(authorAccountId: string, input: CreatePostInput): Promise<PostDto> {
    const media = input.media ?? [];
    // Inserta y trae el post + el brief del autor en una sola ida (CTE). El post (`ins.*`) y el perfil
    // (`p.*`) comparten columna `id`, así que el brief del autor se aliasa con prefijo `author_`.
    const res = await this.pool.query<PostRow & AuthorBriefRow>(
      `WITH ins AS (
         INSERT INTO social.posts (author_account_id, kind, body, media, visibility)
         VALUES ($1, $2, $3, $4::jsonb, $5)
         RETURNING ${POST_COLS}
       )
       SELECT ins.*,
              p.id AS author_id, p.handle AS author_handle, p.display_name AS author_display_name,
              p.avatar_url AS author_avatar_url, p.accent_color AS author_accent_color,
              p.popularity_points AS author_popularity_points
       FROM ins
       JOIN identity.profiles p ON p.account_id = ins.author_account_id AND p.deleted_at IS NULL`,
      [authorAccountId, input.kind ?? 'text', input.body ?? null, JSON.stringify(media), input.visibility ?? 'public'],
    );
    const row = res.rows[0];
    if (!row) throw new Error('post insertado sin perfil de autor (estado inconsistente)');
    const author = toProfileBrief(authorBrief(row));
    // El autor acaba de crear el post: aún no reaccionó (viewerReaction null) y los contadores son 0.
    return toPostDto(row, author);
  }
}

/** Columnas del brief del autor, aliasadas con prefijo `author_` para no chocar con las del post. */
type AuthorBriefRow = {
  author_id: string;
  author_handle: string;
  author_display_name: string;
  author_avatar_url: string | null;
  author_accent_color: string;
  author_popularity_points: number;
};

/** Desaliasea el brief del autor a la forma que espera `toProfileBrief`. */
function authorBrief(row: AuthorBriefRow): ProfileBriefRow {
  return {
    id: row.author_id,
    handle: row.author_handle,
    display_name: row.author_display_name,
    avatar_url: row.author_avatar_url,
    accent_color: row.author_accent_color,
    popularity_points: row.author_popularity_points,
  };
}
