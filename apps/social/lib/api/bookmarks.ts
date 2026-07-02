import { pageOf, postDtoSchema, type Page, type PostDto } from '@osia/shared';
import { apiCall, apiVoid, pageQs } from './client';

/** Guardados (R4.2): colección privada de posts del lector. */

/** Guarda un post (`PUT /v1/posts/{id}/bookmark`), idempotente. */
export function setBookmark(postId: string): Promise<void> {
  return apiVoid(`/v1/posts/${postId}/bookmark`, { method: 'PUT' });
}

/** Quita un guardado (`DELETE /v1/posts/{id}/bookmark`), idempotente. */
export function removeBookmark(postId: string): Promise<void> {
  return apiVoid(`/v1/posts/${postId}/bookmark`, { method: 'DELETE' });
}

/** Posts guardados (`GET /v1/bookmarks`), keyset por recencia del guardado. */
export function getBookmarks(cursor?: string): Promise<Page<PostDto>> {
  return apiCall(`/v1/bookmarks${pageQs(cursor)}`, pageOf(postDtoSchema));
}
