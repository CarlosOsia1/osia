/**
 * Block/Mute (R4.4) — anti-self (422), destino inexistente (404), delegación correcta al repo,
 * y el follow con par bloqueado responde 403 BLOCKED sin oráculo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ErrorCode, type AccountBriefDto, type Page } from '@osia/shared';
import {
  BlockAccountUseCase,
  MuteAccountUseCase,
  UnmuteAccountUseCase,
} from './moderation.use-cases';
import { FollowAccountUseCase } from './follow-account.use-case';
import type { FollowRepository } from '../ports/out/follow.repository';
import type { MuteRepository } from '../ports/out/mute.repository';
import type { SocialEventPublisher } from '../ports/out/social-event-publisher.port';
import { AppException } from '../../../common/app-exception';
import type { Tx, TxRunner } from '../../../common/tx';

/** TxRunner fake: corre la función con un `Tx` de mentira (los fakes de repo/publisher lo ignoran). */
const fakeTxRunner: TxRunner = { run: (fn) => fn({} as Tx) };

const emptyPage: Page<AccountBriefDto> = { data: [], page: { nextCursor: null, hasMore: false, limit: 20 } };

function followsRepo(over: Partial<FollowRepository> = {}): FollowRepository {
  return {
    follow: () => Promise.resolve(null),
    unfollow: () => Promise.resolve(false),
    block: () => Promise.resolve(),
    unblock: () => Promise.resolve(false),
    listBlocked: () => Promise.resolve(emptyPage),
    isAccountPrivate: () => Promise.resolve(false),
    isActiveFollower: () => Promise.resolve(false),
    acceptRequest: () => Promise.resolve(false),
    rejectRequest: () => Promise.resolve(false),
    listPendingRequests: () => Promise.resolve(emptyPage),
    accountExists: () => Promise.resolve(true),
    accountIdByHandle: () => Promise.resolve(null),
    listFollowers: () => Promise.resolve(emptyPage),
    listFollowing: () => Promise.resolve(emptyPage),
    ...over,
  };
}

const noEvents: SocialEventPublisher = {
  followCreated: async () => {},
  followRequested: async () => {},
  followAccepted: async () => {},
  postReacted: async () => {},
  postCommented: async () => {},
  postPublished: async () => {},
  postEchoed: async () => {},
};

test('block: anti-self 422; inexistente 404; delega al repo', async () => {
  const blocked: string[] = [];
  const uc = new BlockAccountUseCase(
    followsRepo({ block: (_b, target) => (blocked.push(target), Promise.resolve()) }),
  );
  await uc.execute('a1', 'a2');
  assert.deepEqual(blocked, ['a2']);
  await assert.rejects(
    () => uc.execute('a1', 'a1'),
    (e: unknown) => e instanceof AppException && e.status === 422,
  );
  await assert.rejects(
    () =>
      new BlockAccountUseCase(followsRepo({ accountExists: () => Promise.resolve(false) })).execute('a1', 'a2'),
    (e: unknown) => e instanceof AppException && e.status === 404,
  );
});

test('follow con par bloqueado → 403 BLOCKED (sin oráculo de dirección)', async () => {
  const uc = new FollowAccountUseCase(followsRepo({ follow: () => Promise.resolve(null) }), noEvents, fakeTxRunner);
  await assert.rejects(
    () => uc.execute('a1', 'a2'),
    (e: unknown) => e instanceof AppException && e.status === 403 && e.code === ErrorCode.BLOCKED,
  );
});

function mutesRepo(over: Partial<MuteRepository> = {}): MuteRepository {
  return {
    setMute: () => Promise.resolve(true),
    removeMute: () => Promise.resolve(),
    listMuted: () => Promise.resolve(emptyPage),
    ...over,
  };
}

test('mute: anti-self 422; inexistente 404; unmute idempotente', async () => {
  const uc = new MuteAccountUseCase(mutesRepo());
  await assert.doesNotReject(() => uc.execute('a1', 'a2'));
  await assert.rejects(
    () => uc.execute('a1', 'a1'),
    (e: unknown) => e instanceof AppException && e.status === 422,
  );
  await assert.rejects(
    () => new MuteAccountUseCase(mutesRepo({ setMute: () => Promise.resolve(false) })).execute('a1', 'a2'),
    (e: unknown) => e instanceof AppException && e.status === 404,
  );
  await assert.doesNotReject(() => new UnmuteAccountUseCase(mutesRepo()).execute('a1', 'a2'));
});
