/**
 * ListCommentsUseCase (S3.3-H3) — clampea el limit, decodifica el cursor opaco y delega; 404 si el post
 * no es visible (repo null). Fake del repo que captura los args.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeCursor,
  encodeCursor,
  ErrorCode,
  MAX_PAGE_LIMIT,
  type Cursor,
  type Page,
  type CommentDto,
} from '@osia/shared';
import { ListCommentsUseCase } from './list-comments.use-case';
import type { CommentRepository } from '../ports/out/comment.repository';
import { AppException } from '../../../common/app-exception';

const POST = '0190b8e0-7c1e-7b3a-8a4e-0000000000a1';
const VIEWER = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const emptyPage: Page<CommentDto> = { data: [], page: { nextCursor: null, hasMore: false, limit: 20 } };

const spyRepo = () => {
  const calls: Array<{ limit: number; cursor: Cursor | null }> = [];
  const repo: CommentRepository = {
    createComment: async () => null,
    softDeleteOwnComment: async () => false,
    updateOwnComment: async () => null,
    resolveMentionedAccountIds: async () => [],
    listComments: async (_postId, _viewer, limit, cursor) => {
      calls.push({ limit, cursor });
      return emptyPage;
    },
  };
  return { repo, calls };
};

test('clampea limit por encima del máximo y pasa cursor null si no viene', async () => {
  const { repo, calls } = spyRepo();
  const uc = new ListCommentsUseCase(repo);
  await uc.execute(POST, VIEWER, { limit: 9999 });
  assert.equal(calls[0]!.limit, MAX_PAGE_LIMIT);
  assert.equal(calls[0]!.cursor, null);
});

test('decodifica el cursor opaco y lo pasa al repo', async () => {
  const { repo, calls } = spyRepo();
  const opaque = encodeCursor({ sortKey: '2026-06-28T00:00:00.000Z', id: 'c1' });
  const uc = new ListCommentsUseCase(repo);
  await uc.execute(POST, VIEWER, { cursor: opaque });
  assert.deepEqual(calls[0]!.cursor, decodeCursor(opaque));
});

test('post no visible (repo null) → NOT_FOUND (404)', async () => {
  const repo: CommentRepository = {
    createComment: async () => null,
    softDeleteOwnComment: async () => false,
    updateOwnComment: async () => null,
    resolveMentionedAccountIds: async () => [],
    listComments: async () => null,
  };
  const uc = new ListCommentsUseCase(repo);
  await assert.rejects(
    () => uc.execute(POST, VIEWER, {}),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.NOT_FOUND && e.status === 404,
  );
});
