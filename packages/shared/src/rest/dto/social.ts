/**
 * DTOs del Tejido Social (Fase 3 — S3.1-H4; ER §7, contratos docs/10 §10). Única fuente de verdad
 * de las formas que viajan por el cable entre `apps/api` y `apps/social`: si esta forma cambia,
 * ambos lados dejan de compilar a la vez (atomicidad, CLAUDE.md §5).
 *
 * Desde la reconstrucción (Ola 3, R1) las FORMAS de respuesta viven como esquemas Zod en
 * `schemas/social-responses.ts` y los tipos se derivan con `z.infer` (una sola fuente de verdad,
 * igual que los inputs); este módulo las re-exporta con sus nombres históricos y conserva las
 * CONSTANTES de límites/MIME (espejo de los CHECK del ER y de los buckets).
 *
 * Notas de alcance (IA descartada al 100%, CLAUDE.md): no hay `author_kind`/Habitantes; todo post
 * lo escribe una cuenta. Las listas se devuelven como `Page<T>` (cursor keyset, `pagination.ts`).
 * Las fechas son ISO-8601 UTC (docs/10 §1.7).
 */

// --- Formas de respuesta (derivadas de los esquemas Zod; ver schemas/social-responses.ts) ---
export { MEDIA_ITEM_KINDS, PROFILE_VIEWER_STATES } from '../../schemas/social-responses';
export type {
  MediaItemKind,
  MediaItem,
  ProfileViewerState,
  UploadTargetDto,
  PostDto,
  EchoedPostDto,
  CommentDto,
  ReactionDto,
  ReactionResult,
  ReactionActorDto,
  PublicProfileDto,
  ProfileSummaryDto,
  SocialMetricsDto,
  FollowDto,
  AccountBriefDto,
  FollowRequestDto,
  FeedItemDto,
  NotificationDto,
  NotificationsPageDto,
  PresenceEntryDto,
  NetworkPresenceEntryDto,
} from '../../schemas/social-responses';

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
/** Tope de tamaño de una IMAGEN de post (bytes). Espejo del `file_size_limit` del bucket `post-media`. */
export const POST_MEDIA_SIZE_MAX = 10 * 1024 * 1024;

/**
 * Video de post (S3.10). Sin transcodificar: se guarda y reproduce el original con topes para cuidar el
 * runway (decisión de Carlos). Solo contenedores no ejecutables reproducibles en `<video>`.
 */
export const POST_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const;
export type PostVideoMime = (typeof POST_VIDEO_MIME_TYPES)[number];
/** Tope de tamaño de un video (bytes). Espejo del `file_size_limit` del bucket `post-video`. */
export const POST_VIDEO_SIZE_MAX = 50 * 1024 * 1024;
/** Todos los MIME subibles para un post (imagen o video). */
export const POST_UPLOAD_MIME_TYPES = [...POST_MEDIA_MIME_TYPES, ...POST_VIDEO_MIME_TYPES] as const;
export type PostUploadMime = (typeof POST_UPLOAD_MIME_TYPES)[number];

/** Media del PERFIL (S3.8): foto y portada. Misma allowlist no-ejecutable que los posts (sin gif/svg). */
export const PROFILE_MEDIA_KINDS = ['photo', 'cover'] as const;
export type ProfileMediaKind = (typeof PROFILE_MEDIA_KINDS)[number];
export const PROFILE_MEDIA_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type ProfileMediaMime = (typeof PROFILE_MEDIA_MIME_TYPES)[number];
/** Tope de tamaño de foto/portada (bytes). Espejo del `file_size_limit` del bucket `profile-media`. */
export const PROFILE_MEDIA_SIZE_MAX = 5 * 1024 * 1024;
