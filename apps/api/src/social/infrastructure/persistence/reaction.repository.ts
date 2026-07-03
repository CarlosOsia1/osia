import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import {
  encodeCursor,
  type Cursor,
  type Page,
  type ReactionActorDto,
  type ReactionKind,
} from '@osia/shared';
import type { Tx } from '../../../common/tx';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type {
  ReactionRepository,
  SetReactionResult,
} from '../../application/ports/out/reaction.repository';
import { PROFILE_BRIEF_COLS, toProfileBrief, toReactionDto, type ProfileBriefRow } from './mappers';
import { postVisiblePredicate } from './post-visibility';

/** Fila combinada del CTE de `setReaction`: autor del post + reacción (nueva o vigente) + flag `created`. */
type SetReactionQueryRow = {
  author_account_id: string;
  id: string;
  post_id: string;
  account_id: string;
  kind: ReactionKind;
  created_at: Date;
  created: boolean;
};

/** Adapter Postgres de reacciones (S3.3-H2). SQL directo (el schema `social` no se expone). */
@Injectable()
export class PgReactionRepository implements ReactionRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async setReaction(
    postId: string,
    accountId: string,
    kind: ReactionKind,
    db: Tx = this.pool,
  ): Promise<SetReactionResult | null> {
    // Una sola sentencia (atómica): solo se inserta si el post está VIVO y el lector puede VERLO — espejo
    // de la policy RLS posts_select_visible (autor / público / followers con follow activo). Las
    // escrituras van por service_role (BYPASSA RLS), así que la visibilidad se reimpone aquí. Si no es
    // visible, `visible` queda vacío → no se inserta, no se bumpea el contador, no se emite, y la query
    // no devuelve fila → 404 (mismo código que post inexistente: sin oráculo de existencia). El INSERT
    // gateado por `visible` en la misma snapshot cierra además la carrera TOCTOU del borrado del post.
    const res = await db.query<SetReactionQueryRow>(
      `WITH visible AS (
         SELECT id, author_account_id
         FROM social.posts
         WHERE id = $1 AND ${postVisiblePredicate('social.posts', '$2')}
       ),
       ins AS (
         INSERT INTO social.reactions (post_id, account_id, kind)
         SELECT id, $2, $3 FROM visible
         ON CONFLICT (post_id, account_id, kind) DO NOTHING
         RETURNING id, post_id, account_id, kind, created_at
       )
       SELECT v.author_account_id,
              COALESCE(i.id, e.id)                 AS id,
              COALESCE(i.post_id, e.post_id)       AS post_id,
              COALESCE(i.account_id, e.account_id) AS account_id,
              COALESCE(i.kind, e.kind)             AS kind,
              COALESCE(i.created_at, e.created_at) AS created_at,
              (i.id IS NOT NULL)                   AS created
       FROM visible v
       LEFT JOIN ins i ON true
       LEFT JOIN social.reactions e ON e.post_id = v.id AND e.account_id = $2 AND e.kind = $3`,
      [postId, accountId, kind],
    );
    const row = res.rows[0];
    if (!row) return null; // post inexistente, borrado, o no visible para el lector → 404

    // El conteo se lee tras el trigger (valor ya commiteado): es caché de display y el trigger lo mantiene
    // consistente con las filas, así que leerlo en otra snapshot no compromete la corrección.
    const count = await db.query<{ reaction_count: number }>(
      `SELECT reaction_count FROM social.posts WHERE id = $1`,
      [postId],
    );
    return {
      reaction: toReactionDto({
        id: row.id,
        post_id: row.post_id,
        account_id: row.account_id,
        kind: row.kind,
        created_at: row.created_at,
      }),
      reactionCount: count.rows[0]?.reaction_count ?? 0,
      postAuthorAccountId: row.author_account_id,
      created: row.created,
    };
  }

  async removeReaction(postId: string, accountId: string, kind: ReactionKind): Promise<void> {
    await this.pool.query(
      `DELETE FROM social.reactions WHERE post_id = $1 AND account_id = $2 AND kind = $3`,
      [postId, accountId, kind],
    );
  }

  async listReactors(
    postId: string,
    viewerAccountId: string,
    kind: ReactionKind | null,
    limit: number,
    cursor: Cursor | null,
  ): Promise<Page<ReactionActorDto> | null> {
    // Reimpone la visibilidad (incl. privacidad de cuenta): no listas reacciones de lo que no puedes ver.
    const vis = await this.pool.query(
      `SELECT 1 FROM social.posts WHERE id = $1 AND ${postVisiblePredicate('social.posts', '$2')}`,
      [postId, viewerAccountId],
    );
    if (vis.rowCount === 0) return null;

    const params: unknown[] = [postId, kind];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor.sortKey, cursor.id);
      cursorClause = `AND (r.created_at, r.id) < ($3::timestamptz, $4::uuid)`;
    }
    params.push(limit + 1);
    const res = await this.pool.query<
      ProfileBriefRow & { kind: ReactionKind; reacted_at: Date; reaction_id: string }
    >(
      `SELECT ${PROFILE_BRIEF_COLS}, r.kind, r.created_at AS reacted_at, r.id AS reaction_id
       FROM social.reactions r
       JOIN identity.profiles p ON p.account_id = r.account_id AND p.deleted_at IS NULL
       WHERE r.post_id = $1 AND ($2::text IS NULL OR r.kind = $2) ${cursorClause}
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT $${params.length}`,
      params,
    );
    const hasMore = res.rows.length > limit;
    const slice = hasMore ? res.rows.slice(0, limit) : res.rows;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor({ sortKey: last.reacted_at.toISOString(), id: last.reaction_id }) : null;
    return {
      data: slice.map((r) => ({ ...toProfileBrief(r), kind: r.kind, reactedAt: r.reacted_at.toISOString() })),
      page: { nextCursor, hasMore, limit },
    };
  }
}
