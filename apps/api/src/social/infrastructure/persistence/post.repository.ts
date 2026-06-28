import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { CreatePostInput, PostDto } from '@osia/shared';
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
}
