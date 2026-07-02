import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { CreatePostInput, PostDto, ReactionKind } from '@osia/shared';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { CreatedEcho, PostRepository } from '../../application/ports/out/post.repository';
import {
  AUTHOR_BRIEF_ALIASED_COLS,
  POST_COLS,
  recentReactorsLateral,
  referencedPostJoin,
  REF_POST_COLS,
  toAuthorBrief,
  toPostDto,
  toRecentReactors,
  toReferencedPost,
  viewerBookmarkedSelect,
  viewerEchoedSelect,
  type AuthorBriefAliasedRow,
  type PostRow,
  type ProfileBriefRow,
  type RefPostAliasedRow,
} from './mappers';
import { postVisiblePredicate } from './post-visibility';

/** Fila completa de una lectura de post con TODO el estado del lector (R4.3). */
type FullPostRow = PostRow &
  AuthorBriefAliasedRow &
  RefPostAliasedRow & {
    viewer_reaction: ReactionKind | null;
    recent_reactors: ProfileBriefRow[] | null;
    viewer_bookmarked: boolean;
    viewer_echoed: boolean;
  };

function toFullPostDto(row: FullPostRow): PostDto {
  return toPostDto(row, toAuthorBrief(row), {
    viewerReaction: row.viewer_reaction,
    recentReactors: toRecentReactors(row.recent_reactors),
    viewerBookmarked: row.viewer_bookmarked,
    viewerEchoed: row.viewer_echoed,
    referencedPost: toReferencedPost(row),
  });
}

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
    // El autor acaba de crear el post: sin reacciones/guardados/ecos aún — estado neutro.
    return toPostDto(row, toAuthorBrief(row));
  }

  async createEcho(
    authorAccountId: string,
    originalPostId: string,
    body: string | null,
  ): Promise<CreatedEcho | null> {
    // Atómico: el eco nace SOLO si el original está vivo, es PÚBLICO y su cuenta NO es privada
    // (amplificar es para lo abierto — cierra el leak de followers-only y la carrera TOCTOU).
    // Ecoar un eco resuelve al ORIGINAL raíz (sin cadenas). El eco simple (sin nota) es único
    // por (autor, original): ON CONFLICT no inserta y devolvemos el existente (idempotente).
    const res = await this.pool.query<
      PostRow & AuthorBriefAliasedRow & RefPostAliasedRow & { original_author: string; original_id: string }
    >(
      `WITH original AS (
         SELECT COALESCE(po.referenced_post_id, po.id) AS root_id
         FROM social.posts po
         LEFT JOIN social.profile_cards pc ON pc.account_id = po.author_account_id
         -- Amplificar es SOLO para lo abierto (público, cuenta no privada) Y el predicado unificado
         -- añade el bloqueo: no ecoas un post de quien te bloqueó (coherente con reaccionar/comentar).
         WHERE po.id = $2 AND ${postVisiblePredicate('po', '$1')}
           AND po.visibility = 'public' AND COALESCE(pc.is_private, false) = false
       ),
       root AS (
         SELECT r.id AS root_id, r.author_account_id AS root_author
         FROM social.posts r
         JOIN original o ON r.id = o.root_id
         WHERE r.deleted_at IS NULL
       ),
       ins AS (
         INSERT INTO social.posts (author_account_id, kind, body, media, visibility, referenced_post_id)
         SELECT $1, 'echo', $3, '[]'::jsonb, 'public', root_id FROM root
         ON CONFLICT (author_account_id, referenced_post_id) WHERE kind = 'echo' AND body IS NULL AND deleted_at IS NULL
         DO NOTHING
         RETURNING ${POST_COLS}
       ),
       existing AS (
         -- Idempotencia del eco simple: si el INSERT no insertó (conflicto), trae el eco vivo previo.
         SELECT ${POST_COLS} FROM social.posts e
         JOIN root ON e.referenced_post_id = root.root_id
         WHERE $3::text IS NULL AND e.author_account_id = $1
           AND e.kind = 'echo' AND e.body IS NULL AND e.deleted_at IS NULL
           AND NOT EXISTS (SELECT 1 FROM ins)
       ),
       final AS (SELECT * FROM ins UNION ALL SELECT * FROM existing)
       SELECT final.*, ${AUTHOR_BRIEF_ALIASED_COLS},
              ${REF_POST_COLS},
              root.root_author AS original_author, root.root_id AS original_id
       FROM final
       JOIN root ON true
       JOIN identity.profiles p ON p.account_id = final.author_account_id AND p.deleted_at IS NULL
       ${referencedPostJoin('final', '$1')}`,
      [authorAccountId, originalPostId, body],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      // Contrato honesto: el eco vuelve con su original embebido (re-verificado para el echoer),
      // no `null` — aunque hoy la UI invalide el feed y no pinte este retorno directamente.
      echo: toPostDto(row, toAuthorBrief(row), { referencedPost: toReferencedPost(row) }),
      originalPostId: row.original_id,
      originalAuthorAccountId: row.original_author,
      created: true,
    };
  }

  async removeSimpleEcho(authorAccountId: string, originalPostId: string): Promise<boolean> {
    // Des-ecoar: soft-delete del eco SIMPLE propio del original (o de su raíz si dan el id de un eco).
    const res = await this.pool.query(
      `UPDATE social.posts e SET deleted_at = now()
       WHERE e.author_account_id = $1 AND e.kind = 'echo' AND e.body IS NULL AND e.deleted_at IS NULL
         AND e.referenced_post_id = (
           SELECT COALESCE(po.referenced_post_id, po.id) FROM social.posts po WHERE po.id = $2
         )`,
      [authorAccountId, originalPostId],
    );
    const removed = (res.rowCount ?? 0) > 0;
    if (removed) {
      // El eco sale de los feeds materializados de inmediato (espejo de softDelete).
      await this.pool.query(
        `DELETE FROM social.feed_items fi
         WHERE fi.post_id IN (
           SELECT e.id FROM social.posts e
           WHERE e.author_account_id = $1 AND e.kind = 'echo' AND e.deleted_at IS NOT NULL
             AND e.referenced_post_id = (
               SELECT COALESCE(po.referenced_post_id, po.id) FROM social.posts po WHERE po.id = $2
             )
         )`,
        [authorAccountId, originalPostId],
      );
    }
    return removed;
  }

  async getById(postId: string, viewerAccountId: string): Promise<PostDto | null> {
    // Reimpone la visibilidad (espejo de posts_select_visible): autor / público / followers con follow
    // activo. `null` si no existe, está borrado, o el lector no puede verlo (mismo trato → 404/oculto).
    const res = await this.pool.query<FullPostRow>(
      `SELECT po.*, ${AUTHOR_BRIEF_ALIASED_COLS},
              ${REF_POST_COLS},
              reactors.recent_reactors,
              ${viewerBookmarkedSelect('po', '$2')},
              ${viewerEchoedSelect('po', '$2')},
              (SELECT r.kind FROM social.reactions r
                 WHERE r.post_id = po.id AND r.account_id = $2 ORDER BY r.created_at LIMIT 1) AS viewer_reaction
       FROM social.posts po
       JOIN identity.profiles p ON p.account_id = po.author_account_id AND p.deleted_at IS NULL
       ${referencedPostJoin('po', '$2')}
       ${recentReactorsLateral('po')}
       WHERE po.id = $1 AND ${postVisiblePredicate('po', '$2')}`,
      [postId, viewerAccountId],
    );
    const row = res.rows[0];
    return row ? toFullPostDto(row) : null;
  }

  async updateBody(postId: string, authorAccountId: string, body: string): Promise<PostDto | null> {
    // Ownership en la MISMA sentencia (sin oráculo: 0 filas = no existe o no es tuyo → 404). El
    // DTO vuelve completo para que el cliente parchee sus caches sin refetch.
    const res = await this.pool.query<FullPostRow>(
      `WITH upd AS (
         UPDATE social.posts SET body = $3, edited_at = now()
         WHERE id = $1 AND author_account_id = $2 AND deleted_at IS NULL
         RETURNING ${POST_COLS}
       )
       SELECT upd.*, ${AUTHOR_BRIEF_ALIASED_COLS},
              ${REF_POST_COLS},
              reactors.recent_reactors,
              ${viewerBookmarkedSelect('upd', '$2')},
              ${viewerEchoedSelect('upd', '$2')},
              (SELECT r.kind FROM social.reactions r
                 WHERE r.post_id = upd.id AND r.account_id = $2 ORDER BY r.created_at LIMIT 1) AS viewer_reaction
       FROM upd
       JOIN identity.profiles p ON p.account_id = upd.author_account_id AND p.deleted_at IS NULL
       ${referencedPostJoin('upd', '$2')}
       ${recentReactorsLateral('upd')}`,
      [postId, authorAccountId, body],
    );
    const row = res.rows[0];
    return row ? toFullPostDto(row) : null;
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
