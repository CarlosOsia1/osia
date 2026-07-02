import {
  pageOf,
  postResponseSchema,
  reactionActorDtoSchema,
  reactionResultSchema,
  type CreatePostInput,
  type Page,
  type PostDto,
  type ReactionActorDto,
  type ReactionKind,
  type ReactionResult,
  type UpdatePostInput,
} from '@osia/shared';
import { apiCall, apiVoid, pageQs } from './client';

/** Posts y sus reacciones (S3.3, S3.10). Toda respuesta validada contra el contrato. */

/** Publica un post (`POST /v1/posts`) y devuelve el creado. */
export async function createPost(input: CreatePostInput): Promise<PostDto> {
  const { post } = await apiCall('/v1/posts', postResponseSchema, { method: 'POST', body: input });
  return post;
}

/** Detalle de un post (`GET /v1/posts/{id}`), respeta visibilidad. */
export async function getPost(id: string): Promise<PostDto> {
  const { post } = await apiCall(`/v1/posts/${id}`, postResponseSchema);
  return post;
}

/** Borra un post propio (`DELETE /v1/posts/{id}`), soft-delete. */
export function deletePost(id: string): Promise<void> {
  return apiVoid(`/v1/posts/${id}`, { method: 'DELETE' });
}

/** Edita el cuerpo de un post propio (`PATCH /v1/posts/{id}`, R4) y devuelve el DTO con `editedAt`. */
export async function updatePost(id: string, input: UpdatePostInput): Promise<PostDto> {
  const { post } = await apiCall(`/v1/posts/${id}`, postResponseSchema, {
    method: 'PATCH',
    body: input,
  });
  return post;
}

/** Amplifica un post (`POST /v1/posts/{id}/echo`, R4.3): eco simple (sin body) o quote (con nota). */
export async function createEcho(postId: string, body?: string): Promise<PostDto> {
  const { post } = await apiCall(`/v1/posts/${postId}/echo`, postResponseSchema, {
    method: 'POST',
    body: body ? { body } : {},
  });
  return post;
}

/** Quita el eco SIMPLE propio de un post (`DELETE /v1/posts/{id}/echo`), idempotente. */
export function removeEcho(postId: string): Promise<void> {
  return apiVoid(`/v1/posts/${postId}/echo`, { method: 'DELETE' });
}

/** Reacciona a un post (`PUT /v1/posts/{id}/reactions`), idempotente. */
export function setReaction(postId: string, kind: ReactionKind): Promise<ReactionResult> {
  return apiCall(`/v1/posts/${postId}/reactions`, reactionResultSchema, {
    method: 'PUT',
    body: { kind },
  });
}

/** Quita una reacción (`DELETE /v1/posts/{id}/reactions/{kind}`), idempotente. */
export function removeReaction(postId: string, kind: ReactionKind): Promise<void> {
  return apiVoid(`/v1/posts/${postId}/reactions/${kind}`, { method: 'DELETE' });
}

/** Quién reaccionó a un post (`GET /v1/posts/{id}/reactions`), keyset. */
export function getReactions(postId: string, cursor?: string): Promise<Page<ReactionActorDto>> {
  return apiCall(`/v1/posts/${postId}/reactions${pageQs(cursor)}`, pageOf(reactionActorDtoSchema));
}
