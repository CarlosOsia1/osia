/**
 * DTOs del Tejido Social (Fase 3 — S3.1-H4; ER §7, contratos docs/10 §10). Única fuente de verdad
 * de las formas que viajan por el cable entre `apps/api` y `apps/social`: si esta forma cambia,
 * ambos lados dejan de compilar a la vez (atomicidad, CLAUDE.md §5).
 *
 * Notas de alcance (IA descartada al 100%, CLAUDE.md): no hay `author_kind`/Habitantes; todo post
 * lo escribe una cuenta. Las listas se devuelven como `Page<T>` (cursor keyset, `pagination.ts`).
 * Las fechas son ISO-8601 UTC (docs/10 §1.7).
 */

import type {
  AccountId,
  PostId,
  CommentId,
  ReactionId,
  FollowId,
  NotificationId,
} from '../../domain/ids';
import type {
  PostKind,
  PostVisibility,
  ReactionKind,
  FollowStatus,
  FeedReason,
  NotificationType,
} from '../../domain/enums';
import type { ProfileBrief } from './profile';

/** Límites de contenido (espejo de los CHECK del ER y de los esquemas Zod de `schemas/social.ts`). */
export const POST_BODY_MAX = 2000;
export const COMMENT_BODY_MAX = 1000;
/** Máximo de adjuntos por post (URLs prefirmadas a Storage/R2; el API nunca recibe el binario). */
export const POST_MEDIA_MAX = 4;
/**
 * Tipos MIME permitidos para adjuntos de post (solo imágenes en v1). El bucket valida contra el
 * Content-Type DECLARADO en la subida (no los bytes reales), y es PÚBLICO de lectura: por eso esta
 * allowlist NUNCA debe incluir `image/svg+xml` ni `text/html` — servir cualquiera de esos desde un
 * bucket público abriría XSS almacenado. Solo formatos de imagen no ejecutables.
 */
export const POST_MEDIA_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
export type PostMediaMime = (typeof POST_MEDIA_MIME_TYPES)[number];
/** Tope de tamaño de un adjunto (bytes). Espejo del `file_size_limit` del bucket. */
export const POST_MEDIA_SIZE_MAX = 10 * 1024 * 1024;

/**
 * Resultado de `POST /v1/media/upload-url`: destino prefirmado para subir el binario directo a Storage
 * (el API nunca recibe el archivo) + la URL pública final que luego se guarda en `post.media`.
 */
export type UploadTargetDto = {
  /** URL a la que el cliente sube el binario por PUT (token embebido; expira pronto). */
  uploadUrl: string;
  /** URL pública final del objeto; es la que viaja en `CreatePostInput.media`. */
  publicUrl: string;
  /** Ruta del objeto dentro del bucket (scoped por cuenta). */
  path: string;
};

/** Un post del feed (`social.posts` + autor desnormalizado + estado del lector). */
export type PostDto = {
  id: PostId;
  /** Autor (vista pública acotada; respeta privacidad/RLS). */
  author: ProfileBrief;
  kind: PostKind;
  /** Cuerpo del post; `null` si es un post solo-media. */
  body: string | null;
  /** URLs de media (R2), 0..`POST_MEDIA_MAX`. */
  media: string[];
  visibility: PostVisibility;
  /** Contador desnormalizado (trigger sobre `reactions`). */
  reactionCount: number;
  /** Contador desnormalizado (trigger sobre `comments`). */
  commentCount: number;
  /** Reacción del lector a este post, si reaccionó; `null` si no. */
  viewerReaction: ReactionKind | null;
  createdAt: string;
  updatedAt: string;
};

/** Un comentario bajo un post (`social.comments`; hilos vía `parentCommentId`). */
export type CommentDto = {
  id: CommentId;
  postId: PostId;
  author: ProfileBrief;
  /** Comentario padre para hilos; `null` si es de primer nivel. */
  parentCommentId: CommentId | null;
  body: string;
  createdAt: string;
};

/** Una reacción a un post (`social.reactions`; única por `(post, account, kind)`). */
export type ReactionDto = {
  id: ReactionId;
  postId: PostId;
  accountId: AccountId;
  kind: ReactionKind;
  createdAt: string;
};

/** Respuesta de `PUT /v1/posts/{id}/reactions`: la reacción + el contador ya actualizado. */
export type ReactionResult = {
  reaction: ReactionDto;
  reactionCount: number;
};

/** Una arista del grafo de seguidores (`social.follows`). */
export type FollowDto = {
  id: FollowId;
  followerAccountId: AccountId;
  followeeAccountId: AccountId;
  status: FollowStatus;
  createdAt: string;
};

/** Un ítem materializado del feed (`social.feed_items`) — embebe el post completo para render directo. */
export type FeedItemDto = {
  /** `feed_items.id` (la PK real es `(account_id, id)`; aquí basta el id como string opaco). */
  id: string;
  post: PostDto;
  reason: FeedReason;
  score: number;
  createdAt: string;
};

/** Una notificación social (`social.notifications`). El tipo `gossip` queda fuera (IA descartada). */
export type NotificationDto = {
  id: NotificationId;
  type: NotificationType;
  /** Quién la disparó (sigue/reacciona/comenta/menciona); `null` si es de sistema. */
  actor: ProfileBrief | null;
  /**
   * Datos específicos del tipo (jsonb `payload` del ER). Forma esperada por `type`:
   * - `follow`: `{}` (el actor ya identifica el follow)
   * - `reaction`: `{ postId, kind }`
   * - `comment`: `{ postId, commentId }`
   * - `mention`: `{ postId, commentId? }`
   */
  payload: Record<string, unknown> | null;
  /** ISO-8601 cuando se marcó leída; `null` si no leída. */
  readAt: string | null;
  createdAt: string;
};

/** Presencia social de una cuenta (lectura de Redis `presence:{accountId}`; docs/10 §10). */
export type PresenceEntryDto = {
  accountId: AccountId;
  online: boolean;
  /** Zona del Mundo donde está (p. ej. "Plaza Crepúsculo"); `null` si offline. */
  zone: string | null;
  /** Instancia del Mundo; `null` si offline. */
  instanceId: string | null;
  /** Última señal vista (ISO-8601 UTC). */
  lastSeen: string;
};
