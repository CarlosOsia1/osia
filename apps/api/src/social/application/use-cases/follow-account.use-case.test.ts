/**
 * FollowAccountUseCase (S3.2-H1) — recorre los flujos: nuevo follow, idempotente (ya seguía),
 * anti-self (CANNOT_FOLLOW_SELF) y destino inexistente (NOT_FOUND). Fakes del puerto (sin DB).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ErrorCode, asAccountId, asFollowId, type FollowDto } from '@osia/shared';
import { FollowAccountUseCase } from './follow-account.use-case';
import type { FollowRepository } from '../ports/out/follow.repository';
import { AppException } from '../../../common/app-exception';

const A = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const B = '0190b8e0-7c1e-7b3a-8a4e-000000000002';

const makeFollow = (follower: string, followee: string, created: string): FollowDto => ({
  id: asFollowId('0190b8e0-7c1e-7b3a-8a4e-0000000000ff'),
  followerAccountId: asAccountId(follower),
  followeeAccountId: asAccountId(followee),
  status: 'active',
  createdAt: created,
});

const emptyPage = { data: [], page: { nextCursor: null, hasMore: false, limit: 20 } };

const repo = (over: Partial<FollowRepository> = {}): FollowRepository => ({
  follow: async (f, t) => ({ follow: makeFollow(f, t, '2026-06-28T00:00:00.000Z'), created: true }),
  unfollow: async () => true,
  accountExists: async () => true,
  accountIdByHandle: async () => null,
  listFollowers: async () => emptyPage,
  listFollowing: async () => emptyPage,
  ...over,
});

test('follow: nuevo follow devuelve la arista activa', async () => {
  const uc = new FollowAccountUseCase(repo());
  const follow = await uc.execute(A, B);
  assert.equal(follow.followerAccountId, A);
  assert.equal(follow.followeeAccountId, B);
  assert.equal(follow.status, 'active');
});

test('follow: idempotente — re-seguir devuelve el vigente sin error', async () => {
  const uc = new FollowAccountUseCase(
    repo({ follow: async (f, t) => ({ follow: makeFollow(f, t, '2026-06-01T00:00:00.000Z'), created: false }) }),
  );
  const follow = await uc.execute(A, B);
  assert.equal(follow.followeeAccountId, B);
});

test('follow: anti-self → CANNOT_FOLLOW_SELF (422)', async () => {
  const uc = new FollowAccountUseCase(repo());
  await assert.rejects(
    () => uc.execute(A, A),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.CANNOT_FOLLOW_SELF && e.status === 422,
  );
});

test('follow: destino inexistente → NOT_FOUND (404)', async () => {
  const uc = new FollowAccountUseCase(repo({ accountExists: async () => false }));
  await assert.rejects(
    () => uc.execute(A, B),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.NOT_FOUND && e.status === 404,
  );
});
