import type {
  CreatePostInput,
  CreateUploadUrlInput,
  FeedItemDto,
  Page,
  PostDto,
  PostMediaMime,
  ReactionKind,
  ReactionResult,
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

/** Pide un destino prefirmado para subir un adjunto (`POST /v1/media/upload-url`). */
export function requestUploadTarget(contentType: PostMediaMime): Promise<UploadTargetDto> {
  const input: CreateUploadUrlInput = { contentType };
  return identity.authedFetch<UploadTargetDto>('/v1/media/upload-url', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Sube el archivo DIRECTO a Storage (PUT a la URL prefirmada) y devuelve su URL pública final. */
export async function uploadImage(file: File): Promise<string> {
  const target = await requestUploadTarget(file.type as PostMediaMime);
  const res = await fetch(target.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: file,
  });
  if (!res.ok) throw new MediaUploadError(res.status);
  return target.publicUrl;
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
