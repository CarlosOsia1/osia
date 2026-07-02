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
  type FollowStatus,
  type SocialFollowCreatedPayload,
} from '@osia/shared';
import { FollowAccountUseCase } from './follow-account.use-case';
import type { FollowRepository } from '../ports/out/follow.repository';
import type { SocialEventPublisher } from '../ports/out/social-event-publisher.port';
import { AppException } from '../../../common/app-exception';

const A = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const B = '0190b8e0-7c1e-7b3a-8a4e-000000000002';

const makeFollow = (follower: string, followee: string, status: FollowStatus, created: string): FollowDto => ({
  id: asFollowId('0190b8e0-7c1e-7b3a-8a4e-0000000000ff'),
  followerAccountId: asAccountId(follower),
  followeeAccountId: asAccountId(follower === followee ? follower : followee),
  status,
  createdAt: created,
});

const emptyPage = { data: [], page: { nextCursor: null, hasMore: false, limit: 20 } };

const repo = (over: Partial<FollowRepository> = {}): FollowRepository => ({
  // El repo decide el status atómicamente; por defecto el fake devuelve `active` (cuenta pública).
  follow: async (f, t) => ({ follow: makeFollow(f, t, 'active', '2026-06-28T00:00:00.000Z'), created: true }),
  unfollow: async () => true,
  isAccountPrivate: async () => false,
  isActiveFollower: async () => false,
  acceptRequest: async () => true,
  rejectRequest: async () => true,
  listPendingRequests: async () => emptyPage,
  accountExists: async () => true,
  accountIdByHandle: async () => null,
  listFollowers: async () => emptyPage,
  listFollowing: async () => emptyPage,
  block: async () => {},
  unblock: async () => false,
  listBlocked: async () => ({ data: [], page: { nextCursor: null, hasMore: false, limit: 20 } }),
  ...over,
});

/** Publicador espía: registra los eventos de follow emitidos. */
const spyPublisher = (): {
  pub: SocialEventPublisher;
  created: SocialFollowCreatedPayload[];
  requested: SocialFollowCreatedPayload[];
} => {
  const created: SocialFollowCreatedPayload[] = [];
  const requested: SocialFollowCreatedPayload[] = [];
  return {
    pub: {
      followCreated: (p) => created.push(p),
      followRequested: (p) => requested.push(p),
      followAccepted: () => {},
      postReacted: () => {},
      postPublished: () => {},
      postCommented: () => {},
  postEchoed: () => {},
    },
    created,
    requested,
  };
};

test('follow público: arista activa y emite social.follow.created (no requested)', async () => {
  const { pub, created, requested } = spyPublisher();
  const uc = new FollowAccountUseCase(repo(), pub);
  const follow = await uc.execute(A, B);
  assert.equal(follow.followerAccountId, A);
  assert.equal(follow.followeeAccountId, B);
  assert.equal(follow.status, 'active');
  assert.deepEqual(created, [{ followerAccountId: A, followeeAccountId: B }]);
  assert.equal(requested.length, 0);
});

test('follow privado: arista PENDING y emite social.follow.requested (no created)', async () => {
  const { pub, created, requested } = spyPublisher();
  // El repo decide `pending` atómicamente para una cuenta privada; el evento se deriva del status.
  const uc = new FollowAccountUseCase(
    repo({ follow: async (f, t) => ({ follow: makeFollow(f, t, 'pending', '2026-06-28T00:00:00.000Z'), created: true }) }),
    pub,
  );
  const follow = await uc.execute(A, B);
  assert.equal(follow.status, 'pending');
  assert.deepEqual(requested, [{ followerAccountId: A, followeeAccountId: B }]);
  assert.equal(created.length, 0);
});

test('follow: idempotente — re-seguir devuelve el vigente SIN re-emitir evento', async () => {
  const { pub, created } = spyPublisher();
  const uc = new FollowAccountUseCase(
    repo({
      follow: async (f, t) => ({ follow: makeFollow(f, t, 'active', '2026-06-01T00:00:00.000Z'), created: false }),
    }),
    pub,
  );
  const follow = await uc.execute(A, B);
  assert.equal(follow.followeeAccountId, B);
  assert.equal(created.length, 0);
});

test('follow: anti-self → CANNOT_FOLLOW_SELF (422) y no emite evento', async () => {
  const { pub, created, requested } = spyPublisher();
  const uc = new FollowAccountUseCase(repo(), pub);
  await assert.rejects(
    () => uc.execute(A, A),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.CANNOT_FOLLOW_SELF && e.status === 422,
  );
  assert.equal(created.length + requested.length, 0);
});

test('follow: destino inexistente → NOT_FOUND (404) y no emite evento', async () => {
  const { pub, created, requested } = spyPublisher();
  const uc = new FollowAccountUseCase(repo({ accountExists: async () => false }), pub);
  await assert.rejects(
    () => uc.execute(A, B),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.NOT_FOUND && e.status === 404,
  );
  assert.equal(created.length + requested.length, 0);
});
