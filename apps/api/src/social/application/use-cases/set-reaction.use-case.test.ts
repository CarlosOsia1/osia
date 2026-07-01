/**
 * SetReactionUseCase (S3.3-H2) — 404 si el post no existe; reacción nueva devuelve resultado y emite
 * `social.post.reacted` con el payload correcto; re-PUT idempotente (created=false) no re-emite.
 * Fakes del repo y del publicador.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  asAccountId,
  asPostId,
  asReactionId,
  ErrorCode,
  type ReactionDto,
  type SocialPostReactedPayload,
} from '@osia/shared';
import { SetReactionUseCase } from './set-reaction.use-case';
import type { ReactionRepository, SetReactionResult } from '../ports/out/reaction.repository';
import type { SocialEventPublisher } from '../ports/out/social-event-publisher.port';
import { AppException } from '../../../common/app-exception';

const POST = '0190b8e0-7c1e-7b3a-8a4e-0000000000a1';
const READER = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const AUTHOR = '0190b8e0-7c1e-7b3a-8a4e-000000000002';

const reaction: ReactionDto = {
  id: asReactionId('0190b8e0-7c1e-7b3a-8a4e-0000000000ff'),
  postId: asPostId(POST),
  accountId: asAccountId(READER),
  kind: 'star',
  createdAt: '2026-06-28T00:00:00.000Z',
};

const spyPublisher = (): { pub: SocialEventPublisher; emitted: SocialPostReactedPayload[] } => {
  const emitted: SocialPostReactedPayload[] = [];
  return {
    pub: {
      followCreated: () => {},
      followRequested: () => {},
      followAccepted: () => {},
      postReacted: (p) => emitted.push(p),
      postPublished: () => {},
      postCommented: () => {},
    },
    emitted,
  };
};

const repo = (result: SetReactionResult | null): ReactionRepository => ({
  setReaction: async () => result,
  removeReaction: async () => {},
});

test('reacción nueva: devuelve resultado y emite social.post.reacted', async () => {
  const { pub, emitted } = spyPublisher();
  const uc = new SetReactionUseCase(
    repo({ reaction, reactionCount: 1, postAuthorAccountId: AUTHOR, created: true }),
    pub,
  );
  const res = await uc.execute(POST, READER, 'star');
  assert.equal(res.reactionCount, 1);
  assert.equal(res.reaction.kind, 'star');
  assert.deepEqual(emitted, [
    { postId: POST, postAuthorAccountId: AUTHOR, reactorAccountId: READER, kind: 'star' },
  ]);
});

test('idempotente: re-PUT (created=false) no re-emite', async () => {
  const { pub, emitted } = spyPublisher();
  const uc = new SetReactionUseCase(
    repo({ reaction, reactionCount: 1, postAuthorAccountId: AUTHOR, created: false }),
    pub,
  );
  await uc.execute(POST, READER, 'star');
  assert.equal(emitted.length, 0);
});

test('post inexistente → NOT_FOUND (404) y no emite', async () => {
  const { pub, emitted } = spyPublisher();
  const uc = new SetReactionUseCase(repo(null), pub);
  await assert.rejects(
    () => uc.execute(POST, READER, 'star'),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.NOT_FOUND && e.status === 404,
  );
  assert.equal(emitted.length, 0);
});
