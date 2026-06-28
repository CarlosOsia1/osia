/**
 * CreateCommentUseCase (S3.3-H3) — devuelve el comentario creado; 404 si el repo devuelve null (post no
 * visible/inexistente o parent inválido). Fake del repo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  asCommentId,
  asPostId,
  asProfileId,
  ErrorCode,
  type CommentDto,
  type CreateCommentInput,
  type ProfileBrief,
} from '@osia/shared';
import { CreateCommentUseCase } from './create-comment.use-case';
import type { CommentRepository } from '../ports/out/comment.repository';
import { AppException } from '../../../common/app-exception';

const POST = '0190b8e0-7c1e-7b3a-8a4e-0000000000a1';
const AUTHOR = '0190b8e0-7c1e-7b3a-8a4e-000000000001';

const author: ProfileBrief = {
  profileId: asProfileId('0190b8e0-7c1e-7b3a-8a4e-0000000000aa'),
  handle: 'ariadna',
  displayName: 'Ariadna',
  avatarUrl: null,
  accentColor: '#CBB89A',
  popularityPoints: 0,
};

const comment: CommentDto = {
  id: asCommentId('0190b8e0-7c1e-7b3a-8a4e-0000000000ff'),
  postId: asPostId(POST),
  author,
  parentCommentId: null,
  body: 'Qué bello',
  createdAt: '2026-06-28T00:00:00.000Z',
};

const repo = (over: Partial<CommentRepository> = {}): CommentRepository => ({
  createComment: async () => comment,
  listComments: async () => ({ data: [], page: { nextCursor: null, hasMore: false, limit: 20 } }),
  softDeleteOwnComment: async () => true,
  ...over,
});

const input: CreateCommentInput = { body: 'Qué bello' };

test('crea el comentario y lo devuelve', async () => {
  const uc = new CreateCommentUseCase(repo());
  const res = await uc.execute(POST, AUTHOR, input);
  assert.equal(res.body, 'Qué bello');
});

test('post no visible/inexistente (repo null) → NOT_FOUND (404)', async () => {
  const uc = new CreateCommentUseCase(repo({ createComment: async () => null }));
  await assert.rejects(
    () => uc.execute(POST, AUTHOR, input),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.NOT_FOUND && e.status === 404,
  );
});
