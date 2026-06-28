import type { Cursor, FeedItemDto, Page } from '@osia/shared';

export const FEED_REPOSITORY = Symbol('FEED_REPOSITORY');

export interface FeedRepository {
  /**
   * Fan-out-on-write: materializa `feed_items` para el AUTOR y cada seguidor activo, con la fecha del
   * post como orden. Devuelve cuántas filas se insertaron. Llamado una vez al publicar.
   */
  fanOutPost(postId: string, authorAccountId: string, createdAt: string): Promise<number>;

  /** Página keyset (cronológica inversa) del feed materializado del lector, con el post embebido. */
  getFeed(accountId: string, limit: number, cursor: Cursor | null): Promise<Page<FeedItemDto>>;

  /** Poda de retención: borra ítems de feed más viejos que `days`. Devuelve cuántos borró. */
  pruneOlderThan(days: number): Promise<number>;
}
