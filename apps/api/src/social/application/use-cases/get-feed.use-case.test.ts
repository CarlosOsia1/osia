/**
 * GetFeedUseCase (S3.3-H4) — clampea el limit, decodifica el cursor opaco y delega en el repo. Fake del
 * repo que captura los args.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeCursor,
  encodeCursor,
  MAX_PAGE_LIMIT,
  type Cursor,
  type FeedItemDto,
  type Page,
} from '@osia/shared';
import { GetFeedUseCase } from './get-feed.use-case';
import type { FeedRepository } from '../ports/out/feed.repository';
import type { PostMediaSigner } from '../post-media-signer.service';

const fakeMediaSigner = { signPost: async () => {}, signPosts: async () => {} } as unknown as PostMediaSigner;
const ACCOUNT = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const emptyPage: Page<FeedItemDto> = { data: [], page: { nextCursor: null, hasMore: false, limit: 20 } };

const spyRepo = () => {
  const calls: Array<{ limit: number; cursor: Cursor | null }> = [];
  const feed: FeedRepository = {
    fanOutPost: async () => 0,
    pruneOlderThan: async () => 0,
    getFeed: async (_acc, limit, cursor) => {
      calls.push({ limit, cursor });
      return emptyPage;
    },
  };
  return { feed, calls };
};

test('clampea el limit y pasa cursor null si no viene', async () => {
  const { feed, calls } = spyRepo();
  await new GetFeedUseCase(feed, fakeMediaSigner).execute(ACCOUNT, { limit: 9999 });
  assert.equal(calls[0]!.limit, MAX_PAGE_LIMIT);
  assert.equal(calls[0]!.cursor, null);
});

test('decodifica el cursor opaco y lo pasa al repo', async () => {
  const { feed, calls } = spyRepo();
  const opaque = encodeCursor({ sortKey: '2026-06-28T00:00:00.000Z', id: 'f1' });
  await new GetFeedUseCase(feed, fakeMediaSigner).execute(ACCOUNT, { cursor: opaque });
  assert.deepEqual(calls[0]!.cursor, decodeCursor(opaque));
});
