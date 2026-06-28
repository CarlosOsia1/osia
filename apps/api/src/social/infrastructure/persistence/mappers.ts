import {
  ACCENT_COLOR_DEFAULT,
  asAccountId,
  asCommentId,
  asFollowId,
  asNotificationId,
  asPostId,
  asProfileId,
  asReactionId,
  type CommentDto,
  type FeedItemDto,
  type FeedReason,
  type FollowDto,
  type FollowStatus,
  type NotificationDto,
  type NotificationType,
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

/** Fila de notificación (`social.notifications`) + actor (brief, nullable por LEFT JOIN al perfil). */
export type NotificationRow = {
  id: string;
  kind: NotificationType;
  payload: Record<string, unknown> | null;
  read_at: Date | null;
  created_at: Date;
  actor_id: string | null;
  actor_handle: string | null;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
  actor_accent_color: string | null;
  actor_popularity_points: number | null;
};

/** Columnas del actor para la notificación (LEFT JOIN; prefijo `actor_`, pueden venir null). */
export const NOTIFICATION_ACTOR_COLS =
  'pa.id AS actor_id, pa.handle AS actor_handle, pa.display_name AS actor_display_name, ' +
  'pa.avatar_url AS actor_avatar_url, pa.accent_color AS actor_accent_color, ' +
  'pa.popularity_points AS actor_popularity_points';

export function toNotificationDto(row: NotificationRow): NotificationDto {
  const actor: ProfileBrief | null = row.actor_id
    ? {
        profileId: asProfileId(row.actor_id),
        handle: row.actor_handle ?? '',
        displayName: row.actor_display_name ?? '',
        avatarUrl: row.actor_avatar_url,
        accentColor: row.actor_accent_color ?? ACCENT_COLOR_DEFAULT,
        popularityPoints: row.actor_popularity_points ?? 0,
      }
    : null;
  return {
    id: asNotificationId(row.id),
    type: row.kind,
    actor,
    payload: row.payload,
    readAt: row.read_at ? row.read_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * Fila combinada de la lectura del feed: el `feed_item` + el post embebido + el autor (brief) + la
 * reacción del lector. Las columnas del feed/post se aliasan (`feed_*`/`post_*`) para no chocar entre sí
 * ni con el brief del autor (`author_*`).
 */
export type FeedItemRow = AuthorBriefAliasedRow & {
  feed_id: string;
  feed_reason: FeedReason;
  feed_score: number;
  feed_created_at: Date;
  post_id: string;
  post_author_account_id: string;
  post_kind: PostKind;
  post_body: string | null;
  post_media: string[];
  post_visibility: PostVisibility;
  post_reaction_count: number;
  post_comment_count: number;
  post_created_at: Date;
  post_updated_at: Date;
  viewer_reaction: ReactionKind | null;
};

export function toFeedItemDto(row: FeedItemRow): FeedItemDto {
  const post = toPostDto(
    {
      id: row.post_id,
      author_account_id: row.post_author_account_id,
      kind: row.post_kind,
      body: row.post_body,
      media: row.post_media,
      visibility: row.post_visibility,
      reaction_count: row.post_reaction_count,
      comment_count: row.post_comment_count,
      created_at: row.post_created_at,
      updated_at: row.post_updated_at,
    },
    toAuthorBrief(row),
    row.viewer_reaction,
  );
  return {
    id: row.feed_id,
    post,
    reason: row.feed_reason,
    score: row.feed_score,
    createdAt: row.feed_created_at.toISOString(),
  };
}
