/**
 * FanOutPostUseCase (S3.3-H4) — delega el fan-out al repo pasando (postId, autor, createdAt) del evento.
 * Fake del repo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { SocialPostPublishedPayload } from '@osia/shared';
import { FanOutPostUseCase } from './fan-out-post.use-case';
import type { FeedRepository } from '../ports/out/feed.repository';

const PAYLOAD: SocialPostPublishedPayload = {
  postId: '0190b8e0-7c1e-7b3a-8a4e-0000000000ff',
  authorAccountId: '0190b8e0-7c1e-7b3a-8a4e-000000000001',
  createdAt: '2026-06-28T00:00:00.000Z',
};

test('hace fan-out con (postId, autor, createdAt) del evento', async () => {
  const calls: Array<[string, string, string]> = [];
  const feed: FeedRepository = {
    getFeed: async () => ({ data: [], page: { nextCursor: null, hasMore: false, limit: 20 } }),
    pruneOlderThan: async () => 0,
    fanOutPost: async (postId, author, createdAt) => {
      calls.push([postId, author, createdAt]);
      return 3;
    },
  };
  const res = await new FanOutPostUseCase(feed).execute(PAYLOAD);
  assert.equal(res, 3);
  assert.deepEqual(calls, [[PAYLOAD.postId, PAYLOAD.authorAccountId, PAYLOAD.createdAt]]);
});
