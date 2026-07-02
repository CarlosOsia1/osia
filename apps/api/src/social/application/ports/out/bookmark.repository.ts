import type { Cursor, Page, PostDto } from '@osia/shared';

export const BOOKMARK_REPOSITORY = Symbol('BOOKMARK_REPOSITORY');

export interface BookmarkRepository {
  /**
   * Guarda un post para el lector (idempotente) SOLO si el post es visible para él (espejo del
   * predicado de visibilidad — guardar no es una puerta trasera). `false` si el post no existe
   * o no lo puede ver (→ 404, sin oráculo).
   */
  setBookmark(accountId: string, postId: string): Promise<boolean>;

  /** Quita un guardado (idempotente; quitar lo no-guardado no es error). */
  removeBookmark(accountId: string, postId: string): Promise<void>;

  /**
   * Página keyset (recencia del GUARDADO) de los posts guardados del lector, reimponiendo la
   * visibilidad al leer: un guardado cuyo post se volvió invisible no se lista.
   */
  listBookmarks(accountId: string, limit: number, cursor: Cursor | null): Promise<Page<PostDto>>;
}
