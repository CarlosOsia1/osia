import {
  commentDtoSchema,
  commentResponseSchema,
  pageOf,
  type CommentDto,
  type CreateCommentInput,
  type Page,
  type UpdateCommentInput,
} from '@osia/shared';
import { apiCall, apiVoid, pageQs } from './client';

/** Comentarios de un post (S3.3-H3; hilos vía `parentCommentId`). */

/** Comentarios de un post (`GET /v1/posts/{id}/comments`), keyset cronológico. */
export function getPostComments(postId: string, cursor?: string): Promise<Page<CommentDto>> {
  return apiCall(`/v1/posts/${postId}/comments${pageQs(cursor)}`, pageOf(commentDtoSchema));
}

/** Comentar un post (`POST /v1/posts/{id}/comments`). */
export async function createComment(postId: string, input: CreateCommentInput): Promise<CommentDto> {
  const { comment } = await apiCall(`/v1/posts/${postId}/comments`, commentResponseSchema, {
    method: 'POST',
    body: input,
  });
  return comment;
}

/** Borrar un comentario propio (`DELETE /v1/comments/{id}`). */
export function deleteComment(commentId: string): Promise<void> {
  return apiVoid(`/v1/comments/${commentId}`, { method: 'DELETE' });
}

/** Editar un comentario propio (`PATCH /v1/comments/{id}`, R4). */
export async function updateComment(commentId: string, input: UpdateCommentInput): Promise<CommentDto> {
  const { comment } = await apiCall(`/v1/comments/${commentId}`, commentResponseSchema, {
    method: 'PATCH',
    body: input,
  });
  return comment;
}
