/**
 * CreditReputationOnReactionUseCase (S3.3-H2) — acredita al autor por una reacción ajena (pasando
 * author/post/reactor al ledger); NO acredita en auto-reacción (reactor === autor). Fake del puerto.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { SocialPostReactedPayload } from '@osia/shared';
import { CreditReputationOnReactionUseCase } from './credit-reputation-on-reaction.use-case';
import type { ReputationLedgerPort } from '../ports/out/reputation-ledger.port';

const POST = '0190b8e0-7c1e-7b3a-8a4e-0000000000a1';
const AUTHOR = '0190b8e0-7c1e-7b3a-8a4e-000000000002';
const REACTOR = '0190b8e0-7c1e-7b3a-8a4e-000000000001';

const ledgerSpy = () => {
  const calls: Array<[string, string, string]> = [];
  const ledger: ReputationLedgerPort = {
    creditNewFollower: async () => ({ credited: false }),
    creditReactionReceived: async (author, postId, reactor) => {
      calls.push([author, postId, reactor]);
      return { credited: true };
    },
  };
  return { ledger, calls };
};

test('reacción ajena: acredita al autor (author, post, reactor)', async () => {
  const { ledger, calls } = ledgerSpy();
  const uc = new CreditReputationOnReactionUseCase(ledger);
  const payload: SocialPostReactedPayload = {
    postId: POST,
    postAuthorAccountId: AUTHOR,
    reactorAccountId: REACTOR,
    kind: 'star',
  };
  const res = await uc.execute(payload);
  assert.equal(res.credited, true);
  assert.deepEqual(calls, [[AUTHOR, POST, REACTOR]]);
});

test('auto-reacción (reactor === autor): no acredita ni toca el ledger', async () => {
  const { ledger, calls } = ledgerSpy();
  const uc = new CreditReputationOnReactionUseCase(ledger);
  const payload: SocialPostReactedPayload = {
    postId: POST,
    postAuthorAccountId: AUTHOR,
    reactorAccountId: AUTHOR,
    kind: 'star',
  };
  const res = await uc.execute(payload);
  assert.equal(res.credited, false);
  assert.equal(calls.length, 0);
});
