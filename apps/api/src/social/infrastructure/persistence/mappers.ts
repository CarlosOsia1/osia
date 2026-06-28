import {
  asAccountId,
  asFollowId,
  asPostId,
  asProfileId,
  asReactionId,
  type FollowDto,
  type FollowStatus,
  type PostDto,
  type PostKind,
  type PostVisibility,
  type ProfileBrief,
  type ReactionDto,
  type ReactionKind,
} from '@osia/shared';

/** Mapeo de filas `social.*` (snake_case) → DTOs públicos (camelCase, branded ids). Frontera infra/web. */

export type FollowRow = {
  id: string;
  follower_account_id: string;
  followee_account_id: string;
  status: FollowStatus;
  created_at: Date;
};

export const FOLLOW_COLS = 'id, follower_account_id, followee_account_id, status, created_at';

export function toFollowDto(row: FollowRow): FollowDto {
  return {
    id: asFollowId(row.id),
    followerAccountId: asAccountId(row.follower_account_id),
    followeeAccountId: asAccountId(row.followee_account_id),
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

/** Columnas de un post (`social.posts`) para RETURNING/SELECT. `media` (jsonb) vuelve ya parseado por pg. */
export const POST_COLS =
  'id, author_account_id, kind, body, media, visibility, reaction_count, comment_count, created_at, updated_at';

export type PostRow = {
  id: string;
  author_account_id: string;
  kind: PostKind;
  body: string | null;
  media: string[];
  visibility: PostVisibility;
  reaction_count: number;
  comment_count: number;
  created_at: Date;
  updated_at: Date;
};

/** Fila → `PostDto`. El autor (brief) y la reacción del lector se resuelven aparte y se inyectan. */
export function toPostDto(
  post: PostRow,
  author: ProfileBrief,
  viewerReaction: ReactionKind | null = null,
): PostDto {
  return {
    id: asPostId(post.id),
    author,
    kind: post.kind,
    body: post.body,
    media: post.media ?? [],
    visibility: post.visibility,
    reactionCount: post.reaction_count,
    commentCount: post.comment_count,
    viewerReaction,
    createdAt: post.created_at.toISOString(),
    updatedAt: post.updated_at.toISOString(),
  };
}

/** Columnas de una reacción (`social.reactions`) para RETURNING/SELECT. */
export const REACTION_COLS = 'id, post_id, account_id, kind, created_at';

export type ReactionRow = {
  id: string;
  post_id: string;
  account_id: string;
  kind: ReactionKind;
  created_at: Date;
};

export function toReactionDto(row: ReactionRow): ReactionDto {
  return {
    id: asReactionId(row.id),
    postId: asPostId(row.post_id),
    accountId: asAccountId(row.account_id),
    kind: row.kind,
    createdAt: row.created_at.toISOString(),
  };
}

/** Columnas de la vista pública acotada del perfil, prefijadas `p.` (para joins desde `social.*`). */
export const PROFILE_BRIEF_COLS =
  'p.id, p.handle, p.display_name, p.avatar_url, p.accent_color, p.popularity_points';

export type ProfileBriefRow = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  accent_color: string;
  popularity_points: number;
};

export function toProfileBrief(row: ProfileBriefRow): ProfileBrief {
  return {
    profileId: asProfileId(row.id),
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    accentColor: row.accent_color,
    popularityPoints: row.popularity_points,
  };
}
