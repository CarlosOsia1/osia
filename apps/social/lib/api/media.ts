import {
  uploadTargetDtoSchema,
  type CreateProfileMediaUploadUrlInput,
  type CreateUploadUrlInput,
  type MediaItem,
  type PostUploadMime,
  type ProfileMediaKind,
  type ProfileMediaMime,
  type UploadTargetDto,
} from '@osia/shared';
import { apiCall } from './client';

/**
 * Media por URL prefirmada (S3.3-H1/S3.8): el API entrega el destino y el binario se sube
 * DIRECTO a Storage por PUT — el API nunca recibe el archivo (docs/09).
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
  return apiCall('/v1/media/upload-url', uploadTargetDtoSchema, { method: 'POST', body: input });
}

/** Sube un adjunto (imagen o video) DIRECTO a Storage (PUT prefirmado) y devuelve el `MediaItem` tipado. */
export async function uploadPostMedia(file: File): Promise<MediaItem> {
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
  return apiCall('/v1/profiles/me/media/upload-url', uploadTargetDtoSchema, {
    method: 'POST',
    body: input,
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
