/**
 * UnfollowAccountUseCase (S3.2-H1) — borra la arista; idempotente (no error si no existía).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { UnfollowAccountUseCase } from './unfollow-account.use-case';
import type { FollowRepository } from '../ports/out/follow.repository';

const A = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const B = '0190b8e0-7c1e-7b3a-8a4e-000000000002';

const emptyPage = { data: [], page: { nextCursor: null, hasMore: false, limit: 20 } };

const repo = (existed: boolean): FollowRepository => ({
  follow: async () => {
    throw new Error('no usado');
  },
  unfollow: async () => existed,
  accountExists: async () => true,
  accountIdByHandle: async () => null,
  listFollowers: async () => emptyPage,
  listFollowing: async () => emptyPage,
});

test('unfollow: arista existente se borra sin error', async () => {
  const uc = new UnfollowAccountUseCase(repo(true));
  await assert.doesNotReject(() => uc.execute(A, B));
});

test('unfollow: idempotente — sin arista, tampoco lanza', async () => {
  const uc = new UnfollowAccountUseCase(repo(false));
  await assert.doesNotReject(() => uc.execute(A, B));
});
