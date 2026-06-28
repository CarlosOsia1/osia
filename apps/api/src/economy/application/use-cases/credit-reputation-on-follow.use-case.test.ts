/**
 * CreditReputationOnFollowUseCase (S3.2-H3) — traduce `social.follow.created` a una acreditación:
 * el receptor es el SEGUIDO y el origen (dedup) es el SEGUIDOR; e idempotente (el ledger decide si
 * ya existía). Fake del puerto (sin DB).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { SocialFollowCreatedPayload } from '@osia/shared';
import { CreditReputationOnFollowUseCase } from './credit-reputation-on-follow.use-case';
import type { ReputationLedgerPort } from '../ports/out/reputation-ledger.port';

const FOLLOWER = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const FOLLOWEE = '0190b8e0-7c1e-7b3a-8a4e-000000000002';
const payload: SocialFollowCreatedPayload = {
  followerAccountId: FOLLOWER,
  followeeAccountId: FOLLOWEE,
};

test('acredita al seguido por su seguidor (receptor=seguido, origen=seguidor)', async () => {
  const calls: Array<[string, string]> = [];
  const ledger: ReputationLedgerPort = {
    creditNewFollower: async (followee, follower) => {
      calls.push([followee, follower]);
      return { credited: true };
    },
    creditReactionReceived: async () => ({ credited: false }),
  };
  const uc = new CreditReputationOnFollowUseCase(ledger);
  const res = await uc.execute(payload);
  assert.equal(res.credited, true);
  assert.deepEqual(calls, [[FOLLOWEE, FOLLOWER]]);
});

test('idempotente: si el asiento ya existía, credited=false (sin doble crédito)', async () => {
  const ledger: ReputationLedgerPort = {
    creditNewFollower: async () => ({ credited: false }),
    creditReactionReceived: async () => ({ credited: false }),
  };
  const uc = new CreditReputationOnFollowUseCase(ledger);
  const res = await uc.execute(payload);
  assert.equal(res.credited, false);
});
