/**
 * RemoveReactionUseCase (S3.3-H2) — delega el borrado idempotente al repo, con los args correctos.
 * No emite eventos (un-react no revierte reputación). Fake del repo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { ReactionKind } from '@osia/shared';
import { RemoveReactionUseCase } from './remove-reaction.use-case';
import type { ReactionRepository, SetReactionResult } from '../ports/out/reaction.repository';

const POST = '0190b8e0-7c1e-7b3a-8a4e-0000000000a1';
const READER = '0190b8e0-7c1e-7b3a-8a4e-000000000001';

test('quita la reacción pasando (post, cuenta, kind) al repo', async () => {
  const calls: Array<[string, string, ReactionKind]> = [];
  const repo: ReactionRepository = {
    setReaction: async (): Promise<SetReactionResult | null> => null,
    removeReaction: async (postId, accountId, kind) => {
      calls.push([postId, accountId, kind]);
    },
    listReactors: async () => null,
  };
  const uc = new RemoveReactionUseCase(repo);
  await uc.execute(POST, READER, 'star');
  assert.deepEqual(calls, [[POST, READER, 'star']]);
});
