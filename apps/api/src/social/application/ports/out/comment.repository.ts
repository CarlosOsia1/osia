import type { CommentDto, Cursor, Page } from '@osia/shared';

export const COMMENT_REPOSITORY = Symbol('COMMENT_REPOSITORY');

export interface CommentRepository {
  /**
   * Crea un comentario SOLO si el post es visible para el autor (espejo de posts_select_visible) y, si se
   * da `parentCommentId`, este pertenece al mismo post y no está borrado. `null` si no se puede comentar
   * (post inexistente/no visible o parent inválido) → 404.
   */
  createComment(
    postId: string,
    authorAccountId: string,
    body: string,
    parentCommentId: string | null,
  ): Promise<CommentDto | null>;

  /**
   * Página keyset (cronológica ASC) de comentarios VIVOS de un post visible para el lector. `null` si el
   * post no existe o no es visible → 404 (no se filtra contenido ajeno).
   */
  listComments(
    postId: string,
    viewerAccountId: string,
    limit: number,
    cursor: Cursor | null,
  ): Promise<Page<CommentDto> | null>;

  /** Soft-delete del comentario PROPIO. `true` si lo borró; `false` si no existe, no es del autor o ya
   *  estaba borrado (→ 404, sin revelar existencia ajena). */
  softDeleteOwnComment(commentId: string, accountId: string): Promise<boolean>;
}
