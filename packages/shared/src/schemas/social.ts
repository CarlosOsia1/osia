/**
 * Esquemas Zod del Tejido Social (Fase 3 — S3.1-H4). Validación en el borde: el cliente los usa para
 * UX (`apps/social`) y el servidor para SEGURIDAD (`apps/api`) — nunca se confía en el cliente
 * (CLAUDE.md §5). El tipo de entrada se deriva con `z.infer`, una sola fuente de verdad.
 *
 * Límites espejo del ER §7 / `rest/dto/social.ts`: body de post 1..2000, comentario 1..1000, hasta
 * 4 adjuntos por URL. Los `kind`/`visibility` validan contra las tuplas de `domain/enums.ts`.
 */

import { z } from 'zod';
import { MAX_PAGE_LIMIT } from '../rest/pagination';
import {
  POST_KIND_VALUES,
  POST_VISIBILITY_VALUES,
  REACTION_KIND_VALUES,
  REPORT_TARGET_TYPE_VALUES,
} from '../domain/enums';
import {
  POST_BODY_MAX,
  COMMENT_BODY_MAX,
  POST_MEDIA_MAX,
  POST_UPLOAD_MIME_TYPES,
  MEDIA_ITEM_KINDS,
  PROFILE_MEDIA_KINDS,
  PROFILE_MEDIA_MIME_TYPES,
} from '../rest/dto/social';

/** `POST /v1/posts` — publicar un post (texto y/o hasta 4 adjuntos por URL prefirmada). */
export const createPostSchema = z
  .object({
    kind: z.enum(POST_KIND_VALUES).default('text'),
    body: z.string().trim().min(1).max(POST_BODY_MAX).optional(),
    media: z
      .array(z.object({ url: z.string().url(), kind: z.enum(MEDIA_ITEM_KINDS) }).strict())
      .max(POST_MEDIA_MAX)
      .optional(),
    visibility: z.enum(POST_VISIBILITY_VALUES).default('public'),
  })
  .strict()
  // Regla de dominio: un post necesita contenido. Si no hay `body`, debe haber al menos un adjunto;
  // si hay `body`, ya pasó `.trim().min(1)`, así que es válido aunque `media` venga vacío.
  .refine(
    (p) => (p.body !== undefined && p.body.length > 0) || (p.media !== undefined && p.media.length > 0),
    { message: 'Un post necesita texto o al menos un adjunto', path: ['body'] },
  );
export type CreatePostInput = z.infer<typeof createPostSchema>;

/** `POST /v1/media/upload-url` — pedir destino prefirmado para subir un adjunto (imagen o video). */
export const createUploadUrlSchema = z
  .object({
    contentType: z.enum(POST_UPLOAD_MIME_TYPES),
  })
  .strict();
export type CreateUploadUrlInput = z.infer<typeof createUploadUrlSchema>;

/** `POST /v1/profiles/me/media/upload-url` (S3.8) — destino prefirmado para foto o portada de perfil. */
export const createProfileMediaUploadUrlSchema = z
  .object({
    kind: z.enum(PROFILE_MEDIA_KINDS),
    contentType: z.enum(PROFILE_MEDIA_MIME_TYPES),
  })
  .strict();
export type CreateProfileMediaUploadUrlInput = z.infer<typeof createProfileMediaUploadUrlSchema>;

/**
 * `PATCH /v1/profiles/me/card` (S3.8) — actualizar la tarjeta social propia: privacidad y/o foto/portada.
 * `null` en `photoUrl`/`coverUrl` la limpia (vuelve al respaldo); ausente = sin cambio. Al menos un campo.
 */
export const updateProfileCardSchema = z
  .object({
    isPrivate: z.boolean().optional(),
    photoUrl: z.string().url().nullable().optional(),
    coverUrl: z.string().url().nullable().optional(),
  })
  .strict()
  .refine((o) => o.isPrivate !== undefined || 'photoUrl' in o || 'coverUrl' in o, {
    message: 'Nada que actualizar',
  });
export type UpdateProfileCardInput = z.infer<typeof updateProfileCardSchema>;

/**
 * `PATCH /v1/posts/{id}` (R4) — editar el CUERPO de un post propio. Solo `body`: la visibilidad
 * no es editable (el fan-out ya ocurrió) y la media tampoco (cambiarla reescribiría la pieza;
 * para eso está borrar y volver a publicar).
 */
export const updatePostSchema = z
  .object({
    body: z.string().trim().min(1).max(POST_BODY_MAX),
  })
  .strict();
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

/** `PATCH /v1/comments/{id}` (R4) — editar el cuerpo de un comentario propio. */
export const updateCommentSchema = z
  .object({
    body: z.string().trim().min(1).max(COMMENT_BODY_MAX),
  })
  .strict();
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

/** `POST /v1/posts/{id}/echo` (R4.3) — amplificar un post: eco simple (sin nota) o quote (con nota). */
export const createEchoSchema = z
  .object({
    body: z.string().trim().min(1).max(POST_BODY_MAX).optional(),
  })
  .strict();
export type CreateEchoInput = z.infer<typeof createEchoSchema>;

/** `POST /v1/posts/{id}/comments` — comentar un post (con hilo opcional). */
export const createCommentSchema = z
  .object({
    body: z.string().trim().min(1).max(COMMENT_BODY_MAX),
    parentCommentId: z.string().uuid().optional(),
  })
  .strict();
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

/** `PUT /v1/posts/{id}/reactions` — reaccionar (idempotente por par). `kind` dentro del gamut. */
export const setReactionSchema = z
  .object({
    kind: z.enum(REACTION_KIND_VALUES),
  })
  .strict();
export type SetReactionInput = z.infer<typeof setReactionSchema>;

/** `POST /v1/reports` — reportar un post o comentario para moderación manual (S3.6-H2). */
export const createReportSchema = z
  .object({
    targetType: z.enum(REPORT_TARGET_TYPE_VALUES),
    targetId: z.string().uuid(),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export type CreateReportInput = z.infer<typeof createReportSchema>;

/** `POST /v1/follows` — seguir a otra cuenta (anti-self lo refuerza el server + `ck_follows_no_self`). */
export const followSchema = z
  .object({
    followeeAccountId: z.string().uuid(),
  })
  .strict();
export type FollowInput = z.infer<typeof followSchema>;

/** `POST /v1/notifications/read` — marcar leídas (sin `ids` = todas). */
export const markNotificationsReadSchema = z
  .object({
    ids: z.array(z.string().uuid()).optional(),
  })
  .strict();
export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>;

/** Query de listados paginados por cursor keyset (feed, comentarios, listas de grafo). */
export const listQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(MAX_PAGE_LIMIT).optional(),
    cursor: z.string().optional(),
  })
  .strict();
export type ListQueryInput = z.infer<typeof listQuerySchema>;

/** Query de `GET /v1/profiles/search` (S3.11) — busca personas por prefijo de handle o nombre. */
export const searchProfilesQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(50),
  })
  .strict();
export type SearchProfilesQueryInput = z.infer<typeof searchProfilesQuerySchema>;

/** Query de `GET /v1/posts/{id}/reactions` (S3.10) — keyset + filtro opcional por `kind`. */
export const reactionsQuerySchema = listQuerySchema.extend({
  kind: z.enum(REACTION_KIND_VALUES).optional(),
});
export type ReactionsQueryInput = z.infer<typeof reactionsQuerySchema>;

/** Query de `GET /v1/notifications` — listado paginado + filtro de no-leídas (`unread=true`). */
export const notificationsQuerySchema = listQuerySchema.extend({
  unread: z.enum(['true', 'false']).optional(),
});
export type NotificationsQueryInput = z.infer<typeof notificationsQuerySchema>;

/**
 * Query de `GET /v1/presence` — cuentas separadas por coma (`?accountIds=a,b,c`). El CSV se parte,
 * se recortan espacios y cada id se valida como UUID; la salida ya es un `string[]` listo para el
 * servidor (no se le pasa basura). `?accountIds=` ausente o vacío → `[]`.
 */
export const presenceQuerySchema = z
  .object({
    accountIds: z
      .string()
      .optional()
      .transform((s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []))
      .pipe(z.array(z.string().uuid()).max(MAX_PAGE_LIMIT)),
  })
  .strict();
export type PresenceQueryInput = z.infer<typeof presenceQuerySchema>;
