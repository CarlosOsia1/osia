/**
 * FollowGraphService (S3.2-H2) — resuelve handle→accountId (404 si no existe), pagina por cursor
 * keyset y aplica el límite por defecto. Fakes del puerto (sin DB).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ErrorCode, encodeCursor, type Cursor, type Page, type ProfileBrief } from '@osia/shared';
import { FollowGraphService } from './follow-graph.service';
import type { FollowRepository } from './ports/out/follow.repository';
import { AppException } from '../../common/app-exception';

const emptyPage = (): Page<ProfileBrief> => ({
  data: [],
  page: { nextCursor: null, hasMore: false, limit: 20 },
});

const repo = (over: Partial<FollowRepository> = {}): FollowRepository => ({
  follow: async () => {
    throw new Error('no usado');
  },
  unfollow: async () => false,
  isAccountPrivate: async () => false,
  acceptRequest: async () => false,
  rejectRequest: async () => false,
  listPendingRequests: async () => ({ data: [], page: { nextCursor: null, hasMore: false, limit: 20 } }),
  accountExists: async () => true,
  accountIdByHandle: async () => 'acc-1',
  listFollowers: async () => emptyPage(),
  listFollowing: async () => emptyPage(),
  ...over,
});

test('listFollowers: handle inexistente → NOT_FOUND (404)', async () => {
  const svc = new FollowGraphService(repo({ accountIdByHandle: async () => null }));
  await assert.rejects(
    () => svc.listFollowers('nadie', {}),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.NOT_FOUND && e.status === 404,
  );
});

test('listFollowers: resuelve handle y devuelve la página del repo', async () => {
  let calledWith: { accountId?: string; limit?: number; cursor?: Cursor | null } = {};
  const page: Page<ProfileBrief> = { data: [], page: { nextCursor: 'next', hasMore: true, limit: 5 } };
  const svc = new FollowGraphService(
    repo({
      accountIdByHandle: async () => 'acc-xyz',
      listFollowers: async (accountId, limit, cursor) => {
        calledWith = { accountId, limit, cursor };
        return page;
      },
    }),
  );
  const result = await svc.listFollowers('carlos', { limit: 5 });
  assert.equal(calledWith.accountId, 'acc-xyz');
  assert.equal(calledWith.limit, 5);
  assert.equal(calledWith.cursor, null);
  assert.deepEqual(result, page);
});

test('listFollowing: decodifica el cursor opaco y lo pasa al repo', async () => {
  let received: Cursor | null = null;
  const cur: Cursor = { sortKey: '2026-06-28T00:00:00.000Z', id: 'follow-1' };
  const svc = new FollowGraphService(
    repo({
      listFollowing: async (_a, _l, cursor) => {
        received = cursor;
        return emptyPage();
      },
    }),
  );
  await svc.listFollowing('carlos', { cursor: encodeCursor(cur) });
  assert.deepEqual(received, cur);
});

test('listFollowers: limit ausente usa el default (clamp a 20)', async () => {
  let limitSeen = -1;
  const svc = new FollowGraphService(
    repo({
      listFollowers: async (_a, limit) => {
        limitSeen = limit;
        return emptyPage();
      },
    }),
  );
  await svc.listFollowers('carlos', {});
  assert.equal(limitSeen, 20);
});
