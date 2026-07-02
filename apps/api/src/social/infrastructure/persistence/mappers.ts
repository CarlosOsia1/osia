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
  type EchoedPostDto,
  type FeedItemDto,
  type FeedReason,
  type FollowDto,
  type FollowStatus,
  type MediaItem,
  type NotificationDto,
  type NotificationType,
  type PostDto,
  type PostKind,
  type PostVisibility,
  type ProfileBrief,
  type ReactionDto,
  type ReactionKind,
} from '@osia/shared';
import { postVisiblePredicate } from './post-visibility';

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
  'id, author_account_id, kind, body, media, visibility, reaction_count, comment_count, edited_at, referenced_post_id, echo_count, created_at, updated_at';

export type PostRow = {
  id: string;
  author_account_id: string;
  kind: PostKind;
  body: string | null;
  media: MediaItem[];
  visibility: PostVisibility;
  reaction_count: number;
  comment_count: number;
  edited_at: Date | null;
  referenced_post_id: string | null;
  echo_count: number;
  created_at: Date;
  updated_at: Date;
};

/** Estado del LECTOR sobre un post (todo opcional; defaults neutros). Se inyecta junto a la fila. */
export type PostViewerState = {
  viewerReaction?: ReactionKind | null;
  recentReactors?: ProfileBrief[];
  viewerBookmarked?: boolean;
  viewerEchoed?: boolean;
  referencedPost?: EchoedPostDto | null;
};

/** Fila → `PostDto`. El autor (brief) y el estado del lector se inyectan (options object, R4.3). */
export function toPostDto(post: PostRow, author: ProfileBrief, viewer: PostViewerState = {}): PostDto {
  return {
    id: asPostId(post.id),
    author,
    kind: post.kind,
    body: post.body,
    media: post.media ?? [],
    visibility: post.visibility,
    reactionCount: post.reaction_count,
    commentCount: post.comment_count,
    viewerReaction: viewer.viewerReaction ?? null,
    recentReactors: viewer.recentReactors ?? [],
    editedAt: post.edited_at ? post.edited_at.toISOString() : null,
    viewerBookmarked: viewer.viewerBookmarked ?? false,
    echoCount: post.echo_count,
    viewerEchoed: viewer.viewerEchoed ?? false,
    referencedPost: viewer.referencedPost ?? null,
    createdAt: post.created_at.toISOString(),
    updatedAt: post.updated_at.toISOString(),
  };
}

/** Subconsulta `viewer_echoed` (R4.3): ¿el lector `$viewer` tiene un eco SIMPLE vivo del post? */
export function viewerEchoedSelect(postAlias: string, viewer: string): string {
  return `EXISTS (SELECT 1 FROM social.posts e
    WHERE e.referenced_post_id = ${postAlias}.id AND e.author_account_id = ${viewer}
      AND e.kind = 'echo' AND e.body IS NULL AND e.deleted_at IS NULL) AS viewer_echoed`;
}

/**
 * LEFT JOIN del post ORIGINAL de un eco (alias `ref` + su autor `refp`), RE-VERIFICADO con el
 * predicado de visibilidad del lector: si el original se volvió invisible (privado/borrado), el
 * join no matchea → `toReferencedPost` devuelve null → la UI pinta «contenido no disponible».
 */
export function referencedPostJoin(postAlias: string, viewer: string): string {
  return `LEFT JOIN social.posts ref
    ON ref.id = ${postAlias}.referenced_post_id AND ${postVisiblePredicate('ref', viewer)}
  LEFT JOIN identity.profiles refp ON refp.account_id = ref.author_account_id AND refp.deleted_at IS NULL`;
}

/** Columnas del original embebido (prefijo `ref_`), todas nullable por el LEFT JOIN. */
export const REF_POST_COLS =
  'ref.id AS ref_id, ref.kind AS ref_kind, ref.body AS ref_body, ref.media AS ref_media, ' +
  'ref.visibility AS ref_visibility, ref.reaction_count AS ref_reaction_count, ' +
  'ref.comment_count AS ref_comment_count, ref.edited_at AS ref_edited_at, ' +
  'ref.created_at AS ref_created_at, ref.updated_at AS ref_updated_at, ' +
  'refp.id AS ref_author_id, refp.handle AS ref_author_handle, ' +
  'refp.display_name AS ref_author_display_name, refp.avatar_url AS ref_author_avatar_url, ' +
  'refp.accent_color AS ref_author_accent_color, refp.popularity_points AS ref_author_popularity_points';

export type RefPostAliasedRow = {
  ref_id: string | null;
  ref_kind: PostKind | null;
  ref_body: string | null;
  ref_media: MediaItem[] | null;
  ref_visibility: PostVisibility | null;
  ref_reaction_count: number | null;
  ref_comment_count: number | null;
  ref_edited_at: Date | null;
  ref_created_at: Date | null;
  ref_updated_at: Date | null;
  ref_author_id: string | null;
  ref_author_handle: string | null;
  ref_author_display_name: string | null;
  ref_author_avatar_url: string | null;
  ref_author_accent_color: string | null;
  ref_author_popularity_points: number | null;
};

/** Fila `ref_*` → original embebido (estado de lector NEUTRO: el embed es solo lectura). */
export function toReferencedPost(row: RefPostAliasedRow): EchoedPostDto | null {
  if (!row.ref_id || !row.ref_author_id || !row.ref_created_at || !row.ref_updated_at) return null;
  return {
    id: asPostId(row.ref_id),
    author: toProfileBrief({
      id: row.ref_author_id,
      handle: row.ref_author_handle ?? '',
      display_name: row.ref_author_display_name ?? '',
      avatar_url: row.ref_author_avatar_url,
      accent_color: row.ref_author_accent_color ?? ACCENT_COLOR_DEFAULT,
      popularity_points: row.ref_author_popularity_points ?? 0,
    }),
    kind: row.ref_kind ?? 'text',
    body: row.ref_body,
    media: row.ref_media ?? [],
    visibility: row.ref_visibility ?? 'public',
    reactionCount: row.ref_reaction_count ?? 0,
    commentCount: row.ref_comment_count ?? 0,
    viewerReaction: null,
    recentReactors: [],
    editedAt: row.ref_edited_at ? row.ref_edited_at.toISOString() : null,
    viewerBookmarked: false,
    createdAt: row.ref_created_at.toISOString(),
    updatedAt: row.ref_updated_at.toISOString(),
  };
}

/** Subconsulta `viewer_bookmarked` (R4.2): ¿el lector `$viewer` guardó el post `postAlias`? */
export function viewerBookmarkedSelect(postAlias: string, viewer: string): string {
  return `EXISTS (SELECT 1 FROM social.bookmarks b
    WHERE b.post_id = ${postAlias}.id AND b.account_id = ${viewer}) AS viewer_bookmarked`;
}

/**
 * Social proof (R2): LATERAL con los ÚLTIMOS 3 reactores del post como brief (json), en la MISMA
 * consulta de lectura (cero N+1). Selecciónalo como `reactors.recent_reactors` y mapéalo con
 * `toRecentReactors`. La lista completa paginada vive en `GET /v1/posts/{id}/reactions`.
 */
export function recentReactorsLateral(postAlias: string): string {
  return `LEFT JOIN LATERAL (
    SELECT COALESCE(json_agg(x), '[]'::json) AS recent_reactors FROM (
      SELECT rp.id, rp.handle, rp.display_name, rp.avatar_url, rp.accent_color, rp.popularity_points
      FROM social.reactions rr
      JOIN identity.profiles rp ON rp.account_id = rr.account_id AND rp.deleted_at IS NULL
      WHERE rr.post_id = ${postAlias}.id
      ORDER BY rr.created_at DESC
      LIMIT 3
    ) x
  ) reactors ON true`;
}

/** Mapea el json del LATERAL de reactores (misma forma que `ProfileBriefRow`) a briefs. */
export function toRecentReactors(rows: ProfileBriefRow[] | null): ProfileBrief[] {
  return (rows ?? []).map(toProfileBrief);
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
export const COMMENT_COLS =
  'id, post_id, author_account_id, parent_comment_id, body, edited_at, created_at';

export type CommentRow = {
  id: string;
  post_id: string;
  author_account_id: string;
  parent_comment_id: string | null;
  body: string;
  edited_at: Date | null;
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
    editedAt: c.edited_at ? c.edited_at.toISOString() : null,
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
export type FeedItemRow = AuthorBriefAliasedRow &
  RefPostAliasedRow & {
    feed_id: string;
    feed_reason: FeedReason;
    feed_score: number;
    feed_created_at: Date;
    post_id: string;
    post_author_account_id: string;
    post_kind: PostKind;
    post_body: string | null;
    post_media: MediaItem[];
    post_visibility: PostVisibility;
    post_reaction_count: number;
    post_comment_count: number;
    post_edited_at: Date | null;
    post_referenced_post_id: string | null;
    post_echo_count: number;
    post_created_at: Date;
    post_updated_at: Date;
    viewer_reaction: ReactionKind | null;
    recent_reactors: ProfileBriefRow[] | null;
    viewer_bookmarked: boolean;
    viewer_echoed: boolean;
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
      edited_at: row.post_edited_at,
      referenced_post_id: row.post_referenced_post_id,
      echo_count: row.post_echo_count,
      created_at: row.post_created_at,
      updated_at: row.post_updated_at,
    },
    toAuthorBrief(row),
    {
      viewerReaction: row.viewer_reaction,
      recentReactors: toRecentReactors(row.recent_reactors),
      viewerBookmarked: row.viewer_bookmarked,
      viewerEchoed: row.viewer_echoed,
      referencedPost: toReferencedPost(row),
    },
  );
  return {
    id: row.feed_id,
    post,
    reason: row.feed_reason,
    score: row.feed_score,
    createdAt: row.feed_created_at.toISOString(),
  };
}
