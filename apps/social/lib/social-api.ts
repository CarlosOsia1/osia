import type {
  CommentDto,
  CreateCommentInput,
  CreatePostInput,
  CreateProfileMediaUploadUrlInput,
  CreateUploadUrlInput,
  FeedItemDto,
  NotificationsPageDto,
  FollowRequestDto,
  Page,
  PostDto,
  PostUploadMime,
  PresenceEntryDto,
  ProfileBrief,
  ProfileMediaKind,
  ProfileMediaMime,
  PublicProfileDto,
  ReactionActorDto,
  ReactionKind,
  ReactionResult,
  UpdateProfileCardInput,
  UploadTargetDto,
} from '@osia/shared';
import { identity } from './identity';

/**
 * Cliente del contexto social en `apps/api` (S3.3-H1). Reusa el `authedFetch` del pasaporte SSO
 * (Bearer con refresh silencioso) para los endpoints protegidos. La subida del binario va DIRECTA a
 * Storage por la URL prefirmada — nunca al API (docs/09).
 */

/** Falla la subida del binario a Storage (PUT prefirmado). Tipada para distinguirla del fallo de publicar. */
export class MediaUploadError extends Error {
  constructor(readonly status: number) {
    super(`media upload failed (${status})`);
    this.name = 'MediaUploadError';
  }
}

/** Pide un destino prefirmado para subir un adjunto (`POST /v1/media/upload-url`), imagen o video. */
export function requestUploadTarget(contentType: PostUploadMime): Promise<UploadTargetDto> {
  const input: CreateUploadUrlInput = { contentType };
  return identity.authedFetch<UploadTargetDto>('/v1/media/upload-url', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Sube un adjunto (imagen o video) DIRECTO a Storage (PUT prefirmado) y devuelve el `MediaItem` tipado. */
export async function uploadPostMedia(file: File): Promise<{ url: string; kind: 'image' | 'video' }> {
  const target = await requestUploadTarget(file.type as PostUploadMime);
  const res = await fetch(target.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: file,
  });
  if (!res.ok) throw new MediaUploadError(res.status);
  return { url: target.publicUrl, kind: file.type.startsWith('video/') ? 'video' : 'image' };
}

/** Pide destino prefirmado para subir foto o portada de perfil (`POST /v1/profiles/me/media/upload-url`). */
export function requestProfileMediaTarget(
  kind: ProfileMediaKind,
  contentType: ProfileMediaMime,
): Promise<UploadTargetDto> {
  const input: CreateProfileMediaUploadUrlInput = { kind, contentType };
  return identity.authedFetch<UploadTargetDto>('/v1/profiles/me/media/upload-url', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Sube foto/portada DIRECTO a Storage (PUT prefirmado) y devuelve la URL pública. */
export async function uploadProfileImage(kind: ProfileMediaKind, file: File): Promise<string> {
  const target = await requestProfileMediaTarget(kind, file.type as ProfileMediaMime);
  const res = await fetch(target.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: file,
  });
  if (!res.ok) throw new MediaUploadError(res.status);
  return target.publicUrl;
}

/** Actualiza la tarjeta social propia (`PATCH /v1/profiles/me/card`): privacidad y/o foto/portada. */
export function updateProfileCard(input: UpdateProfileCardInput): Promise<void> {
  return identity.authedFetch<void>('/v1/profiles/me/card', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/** Edita la bio propia reusando el endpoint de identidad (`PATCH /v1/profiles/me`). */
export function updateBio(bio: string): Promise<void> {
  return identity.authedFetch<void>('/v1/profiles/me', {
    method: 'PATCH',
    body: JSON.stringify({ bio }),
  });
}

/** Publica un post (`POST /v1/posts`) y devuelve el creado. */
export async function createPost(input: CreatePostInput): Promise<PostDto> {
  const { post } = await identity.authedFetch<{ post: PostDto }>('/v1/posts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return post;
}

/** Lee una página del feed propio (`GET /v1/feed`), cronológico inverso por cursor. */
export function getFeed(cursor?: string): Promise<Page<FeedItemDto>> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return identity.authedFetch<Page<FeedItemDto>>(`/v1/feed${qs}`, { method: 'GET' });
}

/** Reacciona a un post (`PUT /v1/posts/{id}/reactions`), idempotente. */
export function setReaction(postId: string, kind: ReactionKind): Promise<ReactionResult> {
  return identity.authedFetch<ReactionResult>(`/v1/posts/${postId}/reactions`, {
    method: 'PUT',
    body: JSON.stringify({ kind }),
  });
}

/** Quita una reacción (`DELETE /v1/posts/{id}/reactions/{kind}`), idempotente. */
export function removeReaction(postId: string, kind: ReactionKind): Promise<void> {
  return identity.authedFetch<void>(`/v1/posts/${postId}/reactions/${kind}`, { method: 'DELETE' });
}

/** Lee notificaciones (`GET /v1/notifications`): página + `unreadCount` para el badge. */
export function getNotifications(): Promise<NotificationsPageDto> {
  return identity.authedFetch<NotificationsPageDto>('/v1/notifications', { method: 'GET' });
}

/** Marca todas las notificaciones como leídas (`POST /v1/notifications/read`). */
export function markAllNotificationsRead(): Promise<void> {
  return identity.authedFetch<void>('/v1/notifications/read', { method: 'POST', body: JSON.stringify({}) });
}

/** Perfil público con estatus (`GET /v1/profiles/{handle}`). */
export async function getPublicProfile(handle: string): Promise<PublicProfileDto> {
  const { profile } = await identity.authedFetch<{ profile: PublicProfileDto }>(
    `/v1/profiles/${encodeURIComponent(handle)}`,
    { method: 'GET' },
  );
  return profile;
}

/** Posts de un perfil (`GET /v1/profiles/{handle}/posts`), por cursor. */
export function getProfilePosts(handle: string, cursor?: string): Promise<Page<PostDto>> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return identity.authedFetch<Page<PostDto>>(
    `/v1/profiles/${encodeURIComponent(handle)}/posts${qs}`,
    { method: 'GET' },
  );
}

/** Seguir (`POST /v1/follows`), idempotente. */
export async function followAccount(followeeAccountId: string): Promise<void> {
  await identity.authedFetch<{ follow: unknown }>('/v1/follows', {
    method: 'POST',
    body: JSON.stringify({ followeeAccountId }),
  });
}

/** Dejar de seguir (`DELETE /v1/follows/{id}`), idempotente. También cancela una solicitud pendiente. */
export function unfollowAccount(followeeAccountId: string): Promise<void> {
  return identity.authedFetch<void>(`/v1/follows/${followeeAccountId}`, { method: 'DELETE' });
}

function pageQs(cursor?: string): string {
  return cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
}

/** Seguidores de un perfil (`GET /v1/profiles/{handle}/followers`), keyset. */
export function getFollowers(handle: string, cursor?: string): Promise<Page<ProfileBrief>> {
  return identity.authedFetch<Page<ProfileBrief>>(
    `/v1/profiles/${encodeURIComponent(handle)}/followers${pageQs(cursor)}`,
    { method: 'GET' },
  );
}

/** Seguidos de un perfil (`GET /v1/profiles/{handle}/following`), keyset. */
export function getFollowing(handle: string, cursor?: string): Promise<Page<ProfileBrief>> {
  return identity.authedFetch<Page<ProfileBrief>>(
    `/v1/profiles/${encodeURIComponent(handle)}/following${pageQs(cursor)}`,
    { method: 'GET' },
  );
}

/** Solicitudes de seguimiento ENTRANTES pendientes (`GET /v1/follows/requests`), keyset. */
export function getFollowRequests(cursor?: string): Promise<Page<FollowRequestDto>> {
  return identity.authedFetch<Page<FollowRequestDto>>(`/v1/follows/requests${pageQs(cursor)}`, {
    method: 'GET',
  });
}

/** Aceptar una solicitud (`POST /v1/follows/requests/{requesterId}/accept`). */
export function acceptFollowRequest(requesterId: string): Promise<void> {
  return identity.authedFetch<void>(`/v1/follows/requests/${requesterId}/accept`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** Rechazar una solicitud (`POST /v1/follows/requests/{requesterId}/reject`). */
export function rejectFollowRequest(requesterId: string): Promise<void> {
  return identity.authedFetch<void>(`/v1/follows/requests/${requesterId}/reject`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** Presencia de cuentas (`GET /v1/presence?accountIds=…`); solo devuelve las que te siguen (regla S3.9). */
export function getPresence(accountIds: string[]): Promise<PresenceEntryDto[]> {
  if (accountIds.length === 0) return Promise.resolve([]);
  const qs = `?accountIds=${encodeURIComponent(accountIds.join(','))}`;
  return identity.authedFetch<PresenceEntryDto[]>(`/v1/presence${qs}`, { method: 'GET' });
}

/** Detalle de un post (`GET /v1/posts/{id}`), respeta visibilidad. */
export async function getPost(id: string): Promise<PostDto> {
  const { post } = await identity.authedFetch<{ post: PostDto }>(`/v1/posts/${id}`, { method: 'GET' });
  return post;
}

/** Borra un post propio (`DELETE /v1/posts/{id}`), soft-delete. */
export function deletePost(id: string): Promise<void> {
  return identity.authedFetch<void>(`/v1/posts/${id}`, { method: 'DELETE' });
}

/** Quién reaccionó a un post (`GET /v1/posts/{id}/reactions`), keyset. */
export function getReactions(postId: string, cursor?: string): Promise<Page<ReactionActorDto>> {
  return identity.authedFetch<Page<ReactionActorDto>>(
    `/v1/posts/${postId}/reactions${pageQs(cursor)}`,
    { method: 'GET' },
  );
}

/** Comentarios de un post (`GET /v1/posts/{id}/comments`), keyset cronológico. */
export function getPostComments(postId: string, cursor?: string): Promise<Page<CommentDto>> {
  return identity.authedFetch<Page<CommentDto>>(
    `/v1/posts/${postId}/comments${pageQs(cursor)}`,
    { method: 'GET' },
  );
}

/** Comentar un post (`POST /v1/posts/{id}/comments`). */
export async function createComment(postId: string, input: CreateCommentInput): Promise<CommentDto> {
  const { comment } = await identity.authedFetch<{ comment: CommentDto }>(
    `/v1/posts/${postId}/comments`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  return comment;
}

/** Borrar un comentario propio (`DELETE /v1/comments/{id}`). */
export function deleteComment(commentId: string): Promise<void> {
  return identity.authedFetch<void>(`/v1/comments/${commentId}`, { method: 'DELETE' });
}
