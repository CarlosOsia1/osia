/**
 * Accept/Reject de solicitudes de seguimiento (S3.9). Aceptar pasa pending→active y emite
 * `social.follow.accepted` (follower=solicitante, followee=dueño); sin pendiente → 404. Rechazar borra
 * (idempotente, sin evento). Fakes del puerto y del publicador.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ErrorCode, type SocialFollowAcceptedPayload } from '@osia/shared';
import { AcceptFollowRequestUseCase } from './accept-follow-request.use-case';
import { RejectFollowRequestUseCase } from './reject-follow-request.use-case';
import type { FollowRepository } from '../ports/out/follow.repository';
import type { SocialEventPublisher } from '../ports/out/social-event-publisher.port';
import { AppException } from '../../../common/app-exception';

const OWNER = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const REQ = '0190b8e0-7c1e-7b3a-8a4e-000000000002';
const emptyPage = { data: [], page: { nextCursor: null, hasMore: false, limit: 20 } };

const repo = (over: Partial<FollowRepository> = {}): FollowRepository => ({
  follow: async () => {
    throw new Error('no usado');
  },
  unfollow: async () => false,
  isAccountPrivate: async () => true,
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

const spy = (): { pub: SocialEventPublisher; accepted: SocialFollowAcceptedPayload[] } => {
  const accepted: SocialFollowAcceptedPayload[] = [];
  return {
    pub: {
      followCreated: () => {},
      followRequested: () => {},
      followAccepted: (p) => accepted.push(p),
      postReacted: () => {},
      postPublished: () => {},
      postCommented: () => {},
  postEchoed: () => {},
    },
    accepted,
  };
};

test('aceptar: activa la arista y emite follow.accepted (follower=solicitante, followee=dueño)', async () => {
  const { pub, accepted } = spy();
  await new AcceptFollowRequestUseCase(repo(), pub).execute(OWNER, REQ);
  assert.deepEqual(accepted, [{ followerAccountId: REQ, followeeAccountId: OWNER }]);
});

test('aceptar: sin solicitud pendiente → NOT_FOUND (404) y no emite', async () => {
  const { pub, accepted } = spy();
  const uc = new AcceptFollowRequestUseCase(repo({ acceptRequest: async () => false }), pub);
  await assert.rejects(
    () => uc.execute(OWNER, REQ),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.NOT_FOUND && e.status === 404,
  );
  assert.equal(accepted.length, 0);
});

test('rechazar: borra la solicitud (idempotente, sin evento)', async () => {
  let called: [string, string] | null = null;
  const uc = new RejectFollowRequestUseCase(
    repo({
      rejectRequest: async (owner, requester) => {
        called = [owner, requester];
        return true;
      },
    }),
  );
  await uc.execute(OWNER, REQ);
  assert.deepEqual(called, [OWNER, REQ]);
});
