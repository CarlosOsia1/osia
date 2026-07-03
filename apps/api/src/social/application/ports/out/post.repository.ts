import type { CreatePostInput, PostDto } from '@osia/shared';
import type { Tx } from '../../../../common/tx';

export const POST_REPOSITORY = Symbol('POST_REPOSITORY');

/** Eco creado (o el existente si era un eco simple repetido) + el original, para notificar. */
export type CreatedEcho = {
  echo: PostDto;
  originalPostId: string;
  originalAuthorAccountId: string;
  created: boolean;
};

export interface PostRepository {
  /** Inserta un post de la cuenta autora y lo devuelve ya como DTO (con el autor brief embebido).
   *  `tx` permite encolar el `social.post.published` en la misma transacción (outbox, Ola 1C). */
  createPost(authorAccountId: string, input: CreatePostInput, tx?: Tx): Promise<PostDto>;
  /** Lee un post por id REIMPONIENDO la visibilidad para el lector; `null` si no existe o no lo puede ver. */
  getById(postId: string, viewerAccountId: string): Promise<PostDto | null>;
  /** Soft-delete del post PROPIO (autor); también lo saca de los feeds. Devuelve las URLs de media del
   *  post borrado (para borrar sus objetos del Storage, Ola 1D), o `null` si no existe o no es suyo. */
  softDelete(postId: string, authorAccountId: string): Promise<string[] | null>;
  /**
   * Edita el CUERPO de un post PROPIO (R4): marca `edited_at` y devuelve el DTO actualizado (con
   * el estado del autor como lector). `null` si no existe, está borrado o no es suyo (→ 404).
   */
  updateBody(postId: string, authorAccountId: string, body: string): Promise<PostDto | null>;

  /**
   * Crea un eco (R4.3) del post dado SOLO si el original (o su raíz, si dan un eco) está vivo,
   * es PÚBLICO y su cuenta NO es privada — atómico (cierra TOCTOU). El eco simple (sin nota) es
   * idempotente por (autor, original). `null` si el original no califica (→ 404, sin oráculo).
   */
  createEcho(
    authorAccountId: string,
    originalPostId: string,
    body: string | null,
    tx?: Tx,
  ): Promise<CreatedEcho | null>;

  /** Quita el eco SIMPLE propio del post dado (o de su raíz). `true` si había uno vivo. */
  removeSimpleEcho(authorAccountId: string, originalPostId: string): Promise<boolean>;
}
