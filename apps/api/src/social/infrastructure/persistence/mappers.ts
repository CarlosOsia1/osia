import {
  asAccountId,
  asCommentId,
  asFollowId,
  asPostId,
  asProfileId,
  asReactionId,
  type CommentDto,
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

/** Columnas de un comentario (`social.comments`) para RETURNING/SELECT. */
export const COMMENT_COLS = 'id, post_id, author_account_id, parent_comment_id, body, created_at';

export type CommentRow = {
  id: string;
  post_id: string;
  author_account_id: string;
  parent_comment_id: string | null;
  body: string;
  created_at: Date;
};

/** Fila → `CommentDto`. El autor (brief) se resuelve por join y se inyecta. */
export function toCommentDto(c: CommentRow, author: ProfileBrief): CommentDto {
  return {
    id: asCommentId(c.id),
    postId: asPostId(c.post_id),
    author,
    parentCommentId: c.parent_comment_id ? asCommentId(c.parent_comment_id) : null,
    body: c.body,
    createdAt: c.created_at.toISOString(),
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

/**
 * Brief del autor para joins donde la entidad principal YA tiene columna `id` (posts/comments): se
 * aliasan las columnas del perfil con prefijo `author_` para no chocar. Una sola definición reutilizada
 * por los adapters de post y comment (DRY).
 */
export const AUTHOR_BRIEF_ALIASED_COLS =
  'p.id AS author_id, p.handle AS author_handle, p.display_name AS author_display_name, ' +
  'p.avatar_url AS author_avatar_url, p.accent_color AS author_accent_color, ' +
  'p.popularity_points AS author_popularity_points';

export type AuthorBriefAliasedRow = {
  author_id: string;
  author_handle: string;
  author_display_name: string;
  author_avatar_url: string | null;
  author_accent_color: string;
  author_popularity_points: number;
};

export function toAuthorBrief(row: AuthorBriefAliasedRow): ProfileBrief {
  return toProfileBrief({
    id: row.author_id,
    handle: row.author_handle,
    display_name: row.author_display_name,
    avatar_url: row.author_avatar_url,
    accent_color: row.author_accent_color,
    popularity_points: row.author_popularity_points,
  });
}
