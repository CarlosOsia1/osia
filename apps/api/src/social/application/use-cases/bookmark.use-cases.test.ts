/**
 * Bookmarks (R4.2) — guardar reimpone visibilidad (404 si el repo dice no), quitar es
 * idempotente, listar clampa el limit y pasa el cursor decodificado.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeCursor, type Page, type PostDto } from '@osia/shared';
import { ListBookmarksUseCase, RemoveBookmarkUseCase, SetBookmarkUseCase } from './bookmark.use-cases';
import type { BookmarkRepository } from '../ports/out/bookmark.repository';
import { AppException } from '../../../common/app-exception';

const emptyPage: Page<PostDto> = { data: [], page: { nextCursor: null, hasMore: false, limit: 20 } };

function repo(over: Partial<BookmarkRepository> = {}): BookmarkRepository {
  return {
    setBookmark: () => Promise.resolve(true),
    removeBookmark: () => Promise.resolve(),
    listBookmarks: () => Promise.resolve(emptyPage),
    ...over,
  };
}

test('setBookmark: visible → guarda; invisible/inexistente → 404 sin oráculo', async () => {
  await assert.doesNotReject(() => new SetBookmarkUseCase(repo()).execute('a1', 'p1'));
  await assert.rejects(
    () => new SetBookmarkUseCase(repo({ setBookmark: () => Promise.resolve(false) })).execute('a1', 'p1'),
    (e: unknown) => e instanceof AppException && e.status === 404,
  );
});

test('removeBookmark: idempotente (quitar lo no guardado no es error)', async () => {
  await assert.doesNotReject(() => new RemoveBookmarkUseCase(repo()).execute('a1', 'p1'));
});

test('listBookmarks: clampa el limit y decodifica el cursor', async () => {
  const calls: Array<{ limit: number; cursorId: string | null }> = [];
  const uc = new ListBookmarksUseCase(
    repo({
      listBookmarks: (_a, limit, cursor) => {
        calls.push({ limit, cursorId: cursor?.id ?? null });
        return Promise.resolve(emptyPage);
      },
    }),
  );
  await uc.execute('a1', { limit: 999, cursor: encodeCursor({ sortKey: 't', id: 'x' }) });
  await uc.execute('a1', {});
  assert.deepEqual(calls, [
    { limit: 100, cursorId: 'x' },
    { limit: 20, cursorId: null },
  ]);
});
