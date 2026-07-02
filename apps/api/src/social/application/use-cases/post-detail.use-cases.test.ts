/**
 * GetPost / DeletePost / ListReactions (S3.10) — devuelven lo del repo o 404 si el repo dice null/false
 * (post inexistente, borrado o no visible para el lector). Fakes del puerto.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ErrorCode, type Page, type PostDto, type ReactionActorDto } from '@osia/shared';
import { GetPostUseCase } from './get-post.use-case';
import { DeletePostUseCase } from './delete-post.use-case';
import { ListReactionsUseCase } from './list-reactions.use-case';
import type { PostRepository } from '../ports/out/post.repository';
import type { ReactionRepository } from '../ports/out/reaction.repository';
import { AppException } from '../../../common/app-exception';

const POST = '0190b8e0-7c1e-7b3a-8a4e-0000000000ff';
const VIEWER = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const emptyReactors: Page<ReactionActorDto> = { data: [], page: { nextCursor: null, hasMore: false, limit: 20 } };

const postRepo = (over: Partial<PostRepository>): PostRepository => ({
  createPost: async () => {
    throw new Error('no usado');
  },
  getById: async () => null,
  softDelete: async () => false,
  updateBody: async () => null,
  createEcho: async () => null,
  removeSimpleEcho: async () => false,
  ...over,
});

const reactionRepo = (over: Partial<ReactionRepository>): ReactionRepository => ({
  setReaction: async () => null,
  removeReaction: async () => {},
  listReactors: async () => null,
  ...over,
});

const somePost = { id: POST } as unknown as PostDto;

test('getPost: devuelve el post visible', async () => {
  const uc = new GetPostUseCase(postRepo({ getById: async () => somePost }));
  assert.equal((await uc.execute(POST, VIEWER)).id, POST);
});

test('getPost: no visible/ inexistente → NOT_FOUND (404)', async () => {
  const uc = new GetPostUseCase(postRepo({ getById: async () => null }));
  await assert.rejects(
    () => uc.execute(POST, VIEWER),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.NOT_FOUND && e.status === 404,
  );
});

test('deletePost: propio → ok; ajeno/inexistente → NOT_FOUND', async () => {
  await assert.doesNotReject(() => new DeletePostUseCase(postRepo({ softDelete: async () => true })).execute(POST, VIEWER));
  await assert.rejects(
    () => new DeletePostUseCase(postRepo({ softDelete: async () => false })).execute(POST, VIEWER),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.NOT_FOUND,
  );
});

test('listReactions: página del repo; no visible → NOT_FOUND', async () => {
  const ok = new ListReactionsUseCase(reactionRepo({ listReactors: async () => emptyReactors }));
  assert.deepEqual((await ok.execute(POST, VIEWER, null, {})).data, []);
  const hidden = new ListReactionsUseCase(reactionRepo({ listReactors: async () => null }));
  await assert.rejects(
    () => hidden.execute(POST, VIEWER, 'star', {}),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.NOT_FOUND,
  );
});
