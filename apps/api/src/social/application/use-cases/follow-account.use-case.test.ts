/**
 * FollowAccountUseCase (S3.2-H1/H3) — recorre los flujos: nuevo follow, idempotente (ya seguía),
 * anti-self (CANNOT_FOLLOW_SELF) y destino inexistente (NOT_FOUND). Además (H3) verifica que el evento
 * `social.follow.created` se emite SOLO en la arista nueva, no en el re-follow ni en los caminos de
 * error. Fakes del puerto y del publicador (sin DB ni bus real).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  asAccountId,
  asFollowId,
  ErrorCode,
  type FollowDto,
  type SocialFollowCreatedPayload,
} from '@osia/shared';
import { FollowAccountUseCase } from './follow-account.use-case';
import type { FollowRepository } from '../ports/out/follow.repository';
import type { SocialEventPublisher } from '../ports/out/social-event-publisher.port';
import { AppException } from '../../../common/app-exception';

const A = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const B = '0190b8e0-7c1e-7b3a-8a4e-000000000002';

const makeFollow = (follower: string, followee: string, created: string): FollowDto => ({
  id: asFollowId('0190b8e0-7c1e-7b3a-8a4e-0000000000ff'),
  followerAccountId: asAccountId(follower),
  followeeAccountId: asAccountId(follower === followee ? follower : followee),
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

/** Publicador espía: registra cada `social.follow.created` emitido. */
const spyPublisher = (): { pub: SocialEventPublisher; emitted: SocialFollowCreatedPayload[] } => {
  const emitted: SocialFollowCreatedPayload[] = [];
  return { pub: { followCreated: (p) => emitted.push(p) }, emitted };
};

test('follow: nuevo follow devuelve la arista activa y emite social.follow.created', async () => {
  const { pub, emitted } = spyPublisher();
  const uc = new FollowAccountUseCase(repo(), pub);
  const follow = await uc.execute(A, B);
  assert.equal(follow.followerAccountId, A);
  assert.equal(follow.followeeAccountId, B);
  assert.equal(follow.status, 'active');
  assert.deepEqual(emitted, [{ followerAccountId: A, followeeAccountId: B }]);
});

test('follow: idempotente — re-seguir devuelve el vigente SIN re-emitir evento', async () => {
  const { pub, emitted } = spyPublisher();
  const uc = new FollowAccountUseCase(
    repo({
      follow: async (f, t) => ({ follow: makeFollow(f, t, '2026-06-01T00:00:00.000Z'), created: false }),
    }),
    pub,
  );
  const follow = await uc.execute(A, B);
  assert.equal(follow.followeeAccountId, B);
  assert.equal(emitted.length, 0);
});

test('follow: anti-self → CANNOT_FOLLOW_SELF (422) y no emite evento', async () => {
  const { pub, emitted } = spyPublisher();
  const uc = new FollowAccountUseCase(repo(), pub);
  await assert.rejects(
    () => uc.execute(A, A),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.CANNOT_FOLLOW_SELF && e.status === 422,
  );
  assert.equal(emitted.length, 0);
});

test('follow: destino inexistente → NOT_FOUND (404) y no emite evento', async () => {
  const { pub, emitted } = spyPublisher();
  const uc = new FollowAccountUseCase(repo({ accountExists: async () => false }), pub);
  await assert.rejects(
    () => uc.execute(A, B),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.NOT_FOUND && e.status === 404,
  );
  assert.equal(emitted.length, 0);
});
