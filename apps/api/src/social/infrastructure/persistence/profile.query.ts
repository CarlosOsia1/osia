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
import { AUTHOR_BRIEF_ALIASED_COLS, toAuthorBrief, toPostDto, type AuthorBriefAliasedRow, type PostRow } from './mappers';

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
};

type ProfilePostRow = PostRow & AuthorBriefAliasedRow & { viewer_reaction: ReactionKind | null };

/** Adapter de lectura de perfil público (S3.5-H1) sobre identity.profiles + social.follows/posts. */
@Injectable()
export class PgProfileQuery implements ProfileQueryPort {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getPublicProfile(handle: string, viewerAccountId: string): Promise<PublicProfileDto | null> {
    const res = await this.pool.query<PublicProfileRow>(
      `SELECT p.id, p.account_id, p.handle, p.display_name, p.avatar_url, p.accent_color,
              p.popularity_points, p.bio, p.reputation, p.followers_count, p.following_count,
              EXISTS (
                SELECT 1 FROM social.follows f
                WHERE f.follower_account_id = $2 AND f.followee_account_id = p.account_id
                  AND f.status = 'active'
              ) AS is_following
       FROM identity.profiles p
       WHERE p.handle = $1 AND p.deleted_at IS NULL`,
      [handle, viewerAccountId],
    );
    const row = res.rows[0];
    if (!row) return null;
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
    };
  }

  async listProfilePosts(
    handle: string,
    viewerAccountId: string,
    limit: number,
    cursor: Cursor | null,
  ): Promise<Page<PostDto> | null> {
    const author = await this.pool.query<{ account_id: string }>(
      `SELECT account_id FROM identity.profiles WHERE handle = $1 AND deleted_at IS NULL`,
      [handle],
    );
    const authorId = author.rows[0]?.account_id;
    if (!authorId) return null;

    // Posts del autor visibles para el lector (autor / público / followers con follow activo).
    const params: unknown[] = [authorId, viewerAccountId];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor.sortKey, cursor.id);
      cursorClause = `AND (po.created_at, po.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`;
    }
    params.push(limit + 1);
    const res = await this.pool.query<ProfilePostRow>(
      `SELECT po.*, ${AUTHOR_BRIEF_ALIASED_COLS},
              (SELECT r.kind FROM social.reactions r
                 WHERE r.post_id = po.id AND r.account_id = $2 ORDER BY r.created_at LIMIT 1) AS viewer_reaction
       FROM social.posts po
       JOIN identity.profiles p ON p.account_id = po.author_account_id AND p.deleted_at IS NULL
       WHERE po.author_account_id = $1 AND po.deleted_at IS NULL
         AND (po.visibility = 'public'
           OR po.author_account_id = $2
           OR (po.visibility = 'followers' AND EXISTS (
             SELECT 1 FROM social.follows f
             WHERE f.follower_account_id = $2 AND f.followee_account_id = po.author_account_id
               AND f.status = 'active'
           )))
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
      data: slice.map((r) => toPostDto(r, toAuthorBrief(r), r.viewer_reaction)),
      page: { nextCursor, hasMore, limit },
    };
  }
}
