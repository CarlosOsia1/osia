import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import {
  asAccountId,
  asProfileId,
  encodeCursor,
  type Cursor,
  type Page,
  type PostDto,
  type PublicProfileDto,
  type ReactionKind,
} from '@osia/shared';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { ProfileQueryPort } from '../../application/ports/out/profile.query';
import { postVisiblePredicate } from './post-visibility';
import {
  AUTHOR_BRIEF_ALIASED_COLS,
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

type PublicProfileRow = {
  id: string;
  account_id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  accent_color: string;
  popularity_points: number;
  bio: string | null;
  reputation: number;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  is_requested: boolean;
  is_self: boolean;
  is_private: boolean;
  photo_url: string | null;
  cover_url: string | null;
  blocked_by_viewer: boolean;
  blocked_by_target: boolean;
  muted_by_viewer: boolean;
};

type ProfilePostRow = PostRow &
  AuthorBriefAliasedRow &
  RefPostAliasedRow & {
    viewer_reaction: ReactionKind | null;
    recent_reactors: ProfileBriefRow[] | null;
    viewer_bookmarked: boolean;
    viewer_echoed: boolean;
  };

/** Adapter de lectura de perfil público (S3.5-H1) sobre identity.profiles + social.follows/posts. */
@Injectable()
export class PgProfileQuery implements ProfileQueryPort {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getPublicProfile(handle: string, viewerAccountId: string): Promise<PublicProfileDto | null> {
    const res = await this.pool.query<PublicProfileRow>(
      `SELECT p.id, p.account_id, p.handle, p.display_name, p.avatar_url, p.accent_color,
              p.popularity_points, p.bio, p.reputation, p.followers_count, p.following_count,
              COALESCE(pc.is_private, false) AS is_private, pc.photo_url, pc.cover_url,
              (p.account_id = $2) AS is_self,
              EXISTS (
                SELECT 1 FROM social.follows f
                WHERE f.follower_account_id = $2 AND f.followee_account_id = p.account_id
                  AND f.status = 'active'
              ) AS is_following,
              EXISTS (
                SELECT 1 FROM social.follows f
                WHERE f.follower_account_id = $2 AND f.followee_account_id = p.account_id
                  AND f.status = 'pending'
              ) AS is_requested,
              EXISTS (
                SELECT 1 FROM social.follows b
                WHERE b.follower_account_id = $2 AND b.followee_account_id = p.account_id
                  AND b.status = 'blocked'
              ) AS blocked_by_viewer,
              EXISTS (
                SELECT 1 FROM social.follows b
                WHERE b.follower_account_id = p.account_id AND b.followee_account_id = $2
                  AND b.status = 'blocked'
              ) AS blocked_by_target,
              EXISTS (
                SELECT 1 FROM social.mutes m
                WHERE m.muter_account_id = $2 AND m.muted_account_id = p.account_id
              ) AS muted_by_viewer
       FROM identity.profiles p
       LEFT JOIN social.profile_cards pc ON pc.account_id = p.account_id
       WHERE p.handle = $1 AND p.deleted_at IS NULL`,
      [handle, viewerAccountId],
    );
    const row = res.rows[0];
    if (!row) return null;
    // Gating estricto (S3.8, decisión de Carlos): en cuenta privada, quien no es dueño ni seguidor
    // activo solo ve la cabecera; el contenido (posts/listas) va oculto hasta seguir/ser aprobado.
    // Una solicitud PENDIENTE (S3.9) NO concede visibilidad.
    // Bloqueo (R4.4): en cualquier dirección, el contenido queda oculto (la cabecera sí se ve,
    // con el CTA «Desbloquear» si el bloqueo es del lector; la dirección inversa no se revela).
    const blocked = row.blocked_by_viewer || row.blocked_by_target;
    const canViewContent = !blocked && (!row.is_private || row.is_self || row.is_following);
    const viewerState = row.is_self
      ? 'self'
      : row.is_following
        ? 'following'
        : row.is_requested
          ? 'requested'
          : 'none';
    return {
      profileId: asProfileId(row.id),
      accountId: asAccountId(row.account_id),
      handle: row.handle,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      accentColor: row.accent_color,
      popularityPoints: row.popularity_points,
      bio: row.bio,
      reputation: row.reputation,
      followersCount: row.followers_count,
      followingCount: row.following_count,
      isFollowing: row.is_following,
      isPrivate: row.is_private,
      photoUrl: row.photo_url,
      coverUrl: row.cover_url,
      viewerState,
      blockedByViewer: row.blocked_by_viewer,
      mutedByViewer: row.muted_by_viewer,
      canViewContent,
    };
  }

  async listProfilePosts(
    handle: string,
    viewerAccountId: string,
    limit: number,
    cursor: Cursor | null,
  ): Promise<Page<PostDto> | null> {
    // Solo necesitamos el account_id del autor + su existencia: la visibilidad por-post (incluida la
    // privacidad de cuenta) la impone el predicado unificado, no una copia manual de la regla aquí.
    const author = await this.pool.query<{ account_id: string }>(
      `SELECT account_id FROM identity.profiles WHERE handle = $1 AND deleted_at IS NULL`,
      [handle],
    );
    const authorId = author.rows[0]?.account_id;
    if (!authorId) return null;

    // Posts del autor VISIBLES para el lector: predicado único (post-visibility.ts) — misma verdad que
    // getById/listReactors/setReaction/comentarios/feed. Un post `public` de cuenta privada NO se cuela.
    const params: unknown[] = [authorId, viewerAccountId];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor.sortKey, cursor.id);
      cursorClause = `AND (po.created_at, po.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`;
    }
    params.push(limit + 1);
    const res = await this.pool.query<ProfilePostRow>(
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
       WHERE po.author_account_id = $1
         AND ${postVisiblePredicate('po', '$2')}
         ${cursorClause}
       ORDER BY po.created_at DESC, po.id DESC
       LIMIT $${params.length}`,
      params,
    );
    const hasMore = res.rows.length > limit;
    const slice = hasMore ? res.rows.slice(0, limit) : res.rows;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor({ sortKey: last.created_at.toISOString(), id: last.id }) : null;
    return {
      data: slice.map((r) =>
        toPostDto(r, toAuthorBrief(r), {
          viewerReaction: r.viewer_reaction,
          recentReactors: toRecentReactors(r.recent_reactors),
          viewerBookmarked: r.viewer_bookmarked,
          viewerEchoed: r.viewer_echoed,
          referencedPost: toReferencedPost(r),
        }),
      ),
      page: { nextCursor, hasMore, limit },
    };
  }
}
