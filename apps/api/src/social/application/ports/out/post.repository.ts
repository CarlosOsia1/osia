import type { CreatePostInput, PostDto } from '@osia/shared';

export const POST_REPOSITORY = Symbol('POST_REPOSITORY');

export interface PostRepository {
  /** Inserta un post de la cuenta autora y lo devuelve ya como DTO (con el autor brief embebido). */
  createPost(authorAccountId: string, input: CreatePostInput): Promise<PostDto>;
  /** Lee un post por id REIMPONIENDO la visibilidad para el lector; `null` si no existe o no lo puede ver. */
  getById(postId: string, viewerAccountId: string): Promise<PostDto | null>;
  /** Soft-delete del post PROPIO (autor); también lo saca de los feeds. `true` si borró (era suyo y vivo). */
  softDelete(postId: string, authorAccountId: string): Promise<boolean>;
}
