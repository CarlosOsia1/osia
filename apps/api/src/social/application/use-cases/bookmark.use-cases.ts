import { Inject, Injectable } from '@nestjs/common';
import {
  clampLimit,
  decodeCursor,
  ErrorCode,
  type ListQueryInput,
  type Page,
  type PostDto,
} from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { BOOKMARK_REPOSITORY, type BookmarkRepository } from '../ports/out/bookmark.repository';

/**
 * Guardados (R4.2): coleccionar posts en PRIVADO. Guardar reimpone la visibilidad del post
 * (404 si no existe o no lo puedes ver — sin oráculo); quitar es idempotente; listar reimpone
 * la visibilidad al leer (un guardado que se volvió invisible no aparece). Sin eventos, sin
 * notificaciones, sin reputación: es una preferencia personal, no una señal social.
 */
@Injectable()
export class SetBookmarkUseCase {
  constructor(@Inject(BOOKMARK_REPOSITORY) private readonly bookmarks: BookmarkRepository) {}

  async execute(accountId: string, postId: string): Promise<void> {
    const saved = await this.bookmarks.setBookmark(accountId, postId);
    if (!saved) throw new AppException(ErrorCode.NOT_FOUND, 404, 'Publicación no encontrada.');
  }
}

@Injectable()
export class RemoveBookmarkUseCase {
  constructor(@Inject(BOOKMARK_REPOSITORY) private readonly bookmarks: BookmarkRepository) {}

  execute(accountId: string, postId: string): Promise<void> {
    return this.bookmarks.removeBookmark(accountId, postId);
  }
}

@Injectable()
export class ListBookmarksUseCase {
  constructor(@Inject(BOOKMARK_REPOSITORY) private readonly bookmarks: BookmarkRepository) {}

  execute(accountId: string, query: ListQueryInput): Promise<Page<PostDto>> {
    const limit = clampLimit(query.limit);
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    return this.bookmarks.listBookmarks(accountId, limit, cursor);
  }
}
