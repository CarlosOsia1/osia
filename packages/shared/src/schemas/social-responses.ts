/**
 * Esquemas Zod de RESPUESTA del Tejido Social (Ola 3, R1). Contraparte de `schemas/social.ts`
 * (inputs): aquí vive la forma de lo que el API DEVUELVE, y los DTOs se derivan con `z.infer`
 * (una sola fuente de verdad; `rest/dto/social.ts` re-exporta los mismos nombres para no mover
 * import sites en `apps/api`/`apps/social`).
 *
 * El cliente (`apps/social`) parsea cada respuesta con estos esquemas: si el contrato diverge,
 * explota en dev como `ApiContractError` en vez de mentir en pantalla. Casos reales que esto
 * habría cazado: el perfil sin `viewerState` (ruta duplicada, Ola 0) y `GET /v1/presence`
 * leído como array cuando el servidor envía `{ presence: [...] }` (bug corregido en R1).
 *
 * Regla "tolerant reader": objetos SIN `.strict()` — un campo nuevo del servidor no rompe a un
 * cliente viejo; un campo faltante o mal tipado sí. Ids con brand vía `.transform(as*)` (cero
 * costo runtime). Fechas ISO-8601 como `z.string()` laxo: la forma es el contrato, el formato
 * fino lo garantiza el servidor.
 */

import { z } from 'zod';
import {
  asAccountId,
  asCommentId,
  asFollowId,
  asNotificationId,
  asPostId,
  asReactionId,
} from '../domain/ids';
import {
  FEED_REASON_VALUES,
  FOLLOW_STATUS_VALUES,
  NOTIFICATION_TYPE_VALUES,
  POST_KIND_VALUES,
  POST_VISIBILITY_VALUES,
  REACTION_KIND_VALUES,
} from '../domain/enums';
import { profileBriefSchema } from './profile-responses';

/** Página keyset estándar `{ data, page }` (espejo de `rest/pagination.ts`) para un item dado. */
export function pageOf<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    page: z.object({
      nextCursor: z.string().nullable(),
      hasMore: z.boolean(),
      limit: z.number(),
    }),
  });
}

// --- Adjuntos de post (la tupla vive aquí; `rest/dto/social.ts` la re-exporta) ---

/** Tipo de un adjunto de post: imagen o video. */
export const MEDIA_ITEM_KINDS = ['image', 'video'] as const;
export type MediaItemKind = (typeof MEDIA_ITEM_KINDS)[number];

/** Un adjunto de un post: URL pública de nuestro Storage + su tipo (render `<img>`/`<video>`). */
export const mediaItemSchema = z.object({
  url: z.string(),
  kind: z.enum(MEDIA_ITEM_KINDS),
});
export type MediaItem = z.infer<typeof mediaItemSchema>;

// --- Relación del solicitante con un perfil (CTA correcto) ---

/**
 * - `self`: es tu propio perfil (editable).
 * - `following`: lo sigues (follow activo).
 * - `requested`: le enviaste una solicitud aún pendiente (cuentas privadas, S3.9).
 * - `none`: no lo sigues ni tienes solicitud.
 */
export const PROFILE_VIEWER_STATES = ['self', 'following', 'requested', 'none'] as const;
export type ProfileViewerState = (typeof PROFILE_VIEWER_STATES)[number];
/** Estados posibles frente a un perfil AJENO (Descubrir/Buscar nunca incluye al propio usuario). */
const OTHER_VIEWER_STATES = ['following', 'requested', 'none'] as const;

// --- Media: destino prefirmado ---

/**
 * Respuesta de `POST /v1/media/upload-url` y `/v1/profiles/me/media/upload-url`: destino
 * prefirmado para subir el binario DIRECTO a Storage (el API nunca recibe el archivo).
 */
export const uploadTargetDtoSchema = z.object({
  uploadUrl: z.string(),
  publicUrl: z.string(),
  path: z.string(),
});
export type UploadTargetDto = z.infer<typeof uploadTargetDtoSchema>;

// --- Posts ---

/** Campos comunes de un post (`social.posts` + autor desnormalizado + estado del lector). */
const postCoreShape = {
  id: z.string().uuid().transform(asPostId),
  author: profileBriefSchema,
  kind: z.enum(POST_KIND_VALUES),
  /** Cuerpo del post; `null` si es solo-media o un eco sin nota. */
  body: z.string().nullable(),
  media: z.array(mediaItemSchema),
  visibility: z.enum(POST_VISIBILITY_VALUES),
  reactionCount: z.number(),
  commentCount: z.number(),
  /** Reacción del lector a este post; `null` si no reaccionó. */
  viewerReaction: z.enum(REACTION_KIND_VALUES).nullable(),
  /** Social proof (R2): los últimos reactores (brief, máx 3) para la fila de avatares. */
  recentReactors: z.array(profileBriefSchema),
  /** Última edición del cuerpo (R4); `null` si nunca se editó. La UI pinta «editado». */
  editedAt: z.string().nullable(),
  /** ¿El lector guardó este post? (R4.2 — colección privada; nadie más lo ve). */
  viewerBookmarked: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
};

/**
 * El post ORIGINAL embebido dentro de un eco (R4.3): la forma plana, SIN campos de eco propios
 * (no hay cadenas — ecoar un eco resuelve al raíz). `null` en `PostDto.referencedPost` de un
 * `kind='echo'` ⇒ el original ya no está disponible (borrado/cuenta cerrada) → placeholder.
 */
export const echoedPostDtoSchema = z.object(postCoreShape);
export type EchoedPostDto = z.infer<typeof echoedPostDtoSchema>;

/** Un post completo, con su estado de eco (R4.3). */
export const postDtoSchema = z.object({
  ...postCoreShape,
  /** Cuántas veces se amplificó ESTE post. */
  echoCount: z.number(),
  /** ¿El lector ya tiene un eco simple vivo de este post? (toggle del botón). */
  viewerEchoed: z.boolean(),
  /** El original amplificado, si este post es un eco; `null` = no disponible o no es eco. */
  referencedPost: echoedPostDtoSchema.nullable(),
});
export type PostDto = z.infer<typeof postDtoSchema>;

/** Sobre `{ post }` de `POST /v1/posts` y `GET /v1/posts/{id}`. */
export const postResponseSchema = z.object({ post: postDtoSchema });

// --- Comentarios ---

/** Un comentario bajo un post (`social.comments`; hilos vía `parentCommentId`). */
export const commentDtoSchema = z.object({
  id: z.string().uuid().transform(asCommentId),
  postId: z.string().uuid().transform(asPostId),
  author: profileBriefSchema,
  parentCommentId: z.string().uuid().transform(asCommentId).nullable(),
  body: z.string(),
  /** Última edición del cuerpo (R4); `null` si nunca se editó. */
  editedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type CommentDto = z.infer<typeof commentDtoSchema>;

/** Sobre `{ comment }` de `POST /v1/posts/{id}/comments`. */
export const commentResponseSchema = z.object({ comment: commentDtoSchema });

// --- Reacciones ---

/** Una reacción a un post (`social.reactions`; única por `(post, account, kind)`). */
export const reactionDtoSchema = z.object({
  id: z.string().uuid().transform(asReactionId),
  postId: z.string().uuid().transform(asPostId),
  accountId: z.string().uuid().transform(asAccountId),
  kind: z.enum(REACTION_KIND_VALUES),
  createdAt: z.string(),
});
export type ReactionDto = z.infer<typeof reactionDtoSchema>;

/** Respuesta de `PUT /v1/posts/{id}/reactions`: la reacción + el contador ya actualizado. */
export const reactionResultSchema = z.object({
  reaction: reactionDtoSchema,
  reactionCount: z.number(),
});
export type ReactionResult = z.infer<typeof reactionResultSchema>;

/** Quién reaccionó (`GET /v1/posts/{id}/reactions`): brief + tipo de reacción + cuándo. */
export const reactionActorDtoSchema = profileBriefSchema.extend({
  kind: z.enum(REACTION_KIND_VALUES),
  reactedAt: z.string(),
});
export type ReactionActorDto = z.infer<typeof reactionActorDtoSchema>;

// --- Perfiles ---

/** Perfil público con estatus (`GET /v1/profiles/{handle}`; gating de cuenta privada S3.8). */
export const publicProfileDtoSchema = profileBriefSchema.extend({
  accountId: z.string().uuid().transform(asAccountId),
  bio: z.string().nullable(),
  reputation: z.number(),
  followersCount: z.number(),
  followingCount: z.number(),
  /** ¿El solicitante sigue a este perfil? (equivale a `viewerState === 'following'`). */
  isFollowing: z.boolean(),
  isPrivate: z.boolean(),
  photoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  viewerState: z.enum(PROFILE_VIEWER_STATES),
  /** `false` en cuenta privada de la que no eres dueño ni seguidor activo (gating estricto),
   *  o si hay bloqueo en cualquier dirección (R4.4). */
  canViewContent: z.boolean(),
  /** ¿El LECTOR bloqueó este perfil? (pinta «Desbloquear»; la dirección inversa no se revela). */
  blockedByViewer: z.boolean(),
  /** ¿El lector lo tiene silenciado? (toggle discreto; nadie más lo ve). */
  mutedByViewer: z.boolean(),
});
export type PublicProfileDto = z.infer<typeof publicProfileDtoSchema>;

/** Sobre `{ profile }` de `GET /v1/profiles/{handle}`. */
export const publicProfileResponseSchema = z.object({ profile: publicProfileDtoSchema });

/** Una persona en Descubrir/Buscar (S3.11): brief + `accountId` + relación con el solicitante. */
export const profileSummaryDtoSchema = profileBriefSchema.extend({
  accountId: z.string().uuid().transform(asAccountId),
  viewerState: z.enum(OTHER_VIEWER_STATES),
});
export type ProfileSummaryDto = z.infer<typeof profileSummaryDtoSchema>;

/** Respuesta de `GET /v1/search/profiles` y `GET /v1/discover`: lista plana (sin paginar). */
export const profileSummariesResponseSchema = z.array(profileSummaryDtoSchema);

// --- Grafo (follows) ---

/** Una arista del grafo de seguidores (`social.follows`). */
export const followDtoSchema = z.object({
  id: z.string().uuid().transform(asFollowId),
  followerAccountId: z.string().uuid().transform(asAccountId),
  followeeAccountId: z.string().uuid().transform(asAccountId),
  status: z.enum(FOLLOW_STATUS_VALUES),
  createdAt: z.string(),
});
export type FollowDto = z.infer<typeof followDtoSchema>;

/** Sobre `{ follow }` de `POST /v1/follows`. */
export const followResponseSchema = z.object({ follow: followDtoSchema });

/**
 * Brief + `accountId`: la forma de toda lista de GESTIÓN accionable por cuenta (solicitudes,
 * bloqueados, silenciados — R4.4). El accountId es el asa de la acción (aceptar/desbloquear…).
 */
export const accountBriefDtoSchema = profileBriefSchema.extend({
  accountId: z.string().uuid().transform(asAccountId),
});
export type AccountBriefDto = z.infer<typeof accountBriefDtoSchema>;

/** Una solicitud de seguimiento ENTRANTE pendiente (`GET /v1/follows/requests`, S3.9). */
export const followRequestDtoSchema = accountBriefDtoSchema;
export type FollowRequestDto = AccountBriefDto;

// --- Feed ---

/** Un ítem materializado del feed (`social.feed_items`) — embebe el post completo. */
export const feedItemDtoSchema = z.object({
  /** `feed_items.id` (la PK real es `(account_id, id)`; aquí basta como string opaco). */
  id: z.string(),
  post: postDtoSchema,
  reason: z.enum(FEED_REASON_VALUES),
  score: z.number(),
  createdAt: z.string(),
});
export type FeedItemDto = z.infer<typeof feedItemDtoSchema>;

// --- Notificaciones ---

/** Una notificación social (`social.notifications`). Payload por tipo (ver docstring del ER). */
export const notificationDtoSchema = z.object({
  id: z.string().uuid().transform(asNotificationId),
  type: z.enum(NOTIFICATION_TYPE_VALUES),
  /** Quién la disparó; `null` si es de sistema. */
  actor: profileBriefSchema.nullable(),
  payload: z.record(z.unknown()).nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type NotificationDto = z.infer<typeof notificationDtoSchema>;

/** Respuesta de `GET /v1/notifications`: página + contador de no-leídas (badge). */
export const notificationsPageDtoSchema = pageOf(notificationDtoSchema).extend({
  unreadCount: z.number(),
});
export type NotificationsPageDto = z.infer<typeof notificationsPageDtoSchema>;

// --- Presencia ---

/** Presencia social de una cuenta (checkpoint durable `world.presence_sessions`). */
export const presenceEntryDtoSchema = z.object({
  accountId: z.string().uuid().transform(asAccountId),
  online: z.boolean(),
  zone: z.string().nullable(),
  instanceId: z.string().nullable(),
  lastSeen: z.string().nullable(),
});
export type PresenceEntryDto = z.infer<typeof presenceEntryDtoSchema>;

/**
 * Sobre `{ presence }` de `GET /v1/presence`. OJO: es un objeto, NO el array a pelo — el cliente
 * viejo lo tipaba como array y la presencia del perfil nunca funcionó (cazado al escribir esto).
 */
export const presenceResponseSchema = z.object({
  presence: z.array(presenceEntryDtoSchema),
});

/**
 * Quién de TU red está en El Mundo ahora (`GET /v1/presence/network`, R2 — rail del Salón).
 * Solo cuentas ONLINE que te siguen (la presencia es direccional, S3.9), resueltas server-side
 * en una sola consulta: el cliente no necesita conocer accountIds de su red.
 */
export const networkPresenceEntryDtoSchema = z.object({
  profile: profileBriefSchema,
  accountId: z.string().uuid().transform(asAccountId),
  /** Zona del Mundo donde está (p. ej. "El Claro"). */
  zone: z.string(),
  instanceId: z.string(),
  /** Desde cuándo está en el Mundo (ISO-8601). */
  since: z.string(),
});
export type NetworkPresenceEntryDto = z.infer<typeof networkPresenceEntryDtoSchema>;

/** Sobre `{ presence }` de `GET /v1/presence/network`. */
export const networkPresenceResponseSchema = z.object({
  presence: z.array(networkPresenceEntryDtoSchema),
});

// --- Métricas ---

/** Métricas operativas del Tejido Social (`GET /v1/metrics/social`, S3.6-H3). */
export const socialMetricsDtoSchema = z.object({
  posts: z.number(),
  reactions: z.number(),
  comments: z.number(),
  follows: z.number(),
  postsLast24h: z.number(),
  feedItems: z.number(),
});
export type SocialMetricsDto = z.infer<typeof socialMetricsDtoSchema>;
