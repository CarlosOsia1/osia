/**
 * DeleteCommentUseCase (S3.3-H3) — borra (soft) si el repo confirma; 404 si no existe / no es del autor /
 * ya estaba borrado (repo false). Fake del repo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ErrorCode } from '@osia/shared';
import { DeleteCommentUseCase } from './delete-comment.use-case';
import type { CommentRepository } from '../ports/out/comment.repository';
import { AppException } from '../../../common/app-exception';

const COMMENT = '0190b8e0-7c1e-7b3a-8a4e-0000000000ff';
const ACCOUNT = '0190b8e0-7c1e-7b3a-8a4e-000000000001';

const repo = (deleted: boolean): CommentRepository => ({
  createComment: async () => null,
  listComments: async () => null,
  softDeleteOwnComment: async () => deleted,
  resolveMentionedAccountIds: async () => [],
});

test('borra el comentario propio (repo true) → resuelve', async () => {
  const uc = new DeleteCommentUseCase(repo(true));
  await uc.execute(COMMENT, ACCOUNT); // no lanza
});

test('no es del autor / no existe (repo false) → NOT_FOUND (404)', async () => {
  const uc = new DeleteCommentUseCase(repo(false));
  await assert.rejects(
    () => uc.execute(COMMENT, ACCOUNT),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.NOT_FOUND && e.status === 404,
  );
});
