import type { CreatePostInput, PostDto } from '@osia/shared';

export const POST_REPOSITORY = Symbol('POST_REPOSITORY');

export interface PostRepository {
  /** Inserta un post de la cuenta autora y lo devuelve ya como DTO (con el autor brief embebido). */
  createPost(authorAccountId: string, input: CreatePostInput): Promise<PostDto>;
}
