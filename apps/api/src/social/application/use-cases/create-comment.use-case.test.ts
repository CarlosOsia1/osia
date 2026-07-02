/**
 * CreateCommentUseCase (S3.3-H3 / S3.4) — devuelve el comentario; 404 si el repo devuelve null; emite
 * `social.post.commented` con las menciones resueltas y SIN el comentador ni el autor del post. Fakes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  asCommentId,
  asPostId,
  asProfileId,
  ErrorCode,
  type CommentDto,
  type CreateCommentInput,
  type ProfileBrief,
  type SocialPostCommentedPayload,
} from '@osia/shared';
import { CreateCommentUseCase } from './create-comment.use-case';
import type { CommentRepository, CreatedComment } from '../ports/out/comment.repository';
import type { SocialEventPublisher } from '../ports/out/social-event-publisher.port';
import { AppException } from '../../../common/app-exception';

const POST = '0190b8e0-7c1e-7b3a-8a4e-0000000000a1';
const COMMENTER = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const POST_AUTHOR = '0190b8e0-7c1e-7b3a-8a4e-000000000002';
const MARIA = '0190b8e0-7c1e-7b3a-8a4e-000000000003';

const author: ProfileBrief = {
  profileId: asProfileId('0190b8e0-7c1e-7b3a-8a4e-0000000000aa'),
  handle: 'ariadna',
  displayName: 'Ariadna',
  avatarUrl: null,
  accentColor: '#CBB89A',
  popularityPoints: 0,
};
const comment: CommentDto = {
  id: asCommentId('0190b8e0-7c1e-7b3a-8a4e-0000000000ff'),
  postId: asPostId(POST),
  author,
  parentCommentId: null,
  body: 'hola @maria',
  editedAt: null,
  createdAt: '2026-06-28T00:00:00.000Z',
};

const spyPublisher = () => {
  const emitted: SocialPostCommentedPayload[] = [];
  const pub: SocialEventPublisher = {
    followCreated: () => {},
    followRequested: () => {},
    followAccepted: () => {},
    postReacted: () => {},
    postPublished: () => {},
    postCommented: (p) => emitted.push(p),
    postEchoed: () => {},
  };
  return { pub, emitted };
};

const repo = (over: Partial<CommentRepository> = {}): CommentRepository => ({
  createComment: async (): Promise<CreatedComment | null> => ({ comment, postAuthorAccountId: POST_AUTHOR }),
  listComments: async () => null,
  softDeleteOwnComment: async () => false,
  updateOwnComment: async () => null,
  resolveMentionedAccountIds: async () => [],
  ...over,
});

const input: CreateCommentInput = { body: 'hola @maria' };

test('crea el comentario y emite social.post.commented', async () => {
  const { pub, emitted } = spyPublisher();
  const uc = new CreateCommentUseCase(repo(), pub);
  const res = await uc.execute(POST, COMMENTER, input);
  assert.equal(res.body, 'hola @maria');
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0]!.postAuthorAccountId, POST_AUTHOR);
  assert.equal(emitted[0]!.commenterAccountId, COMMENTER);
});

test('menciones: excluye al comentador y al autor del post; deja a los demás', async () => {
  const { pub, emitted } = spyPublisher();
  // El repo resuelve los handles a [maria, comentador, autor]; el use case debe filtrar los 2 últimos.
  const uc = new CreateCommentUseCase(
    repo({ resolveMentionedAccountIds: async () => [MARIA, COMMENTER, POST_AUTHOR] }),
    pub,
  );
  await uc.execute(POST, COMMENTER, input);
  assert.deepEqual(emitted[0]!.mentionedAccountIds, [MARIA]);
});

test('post no visible/inexistente (repo null) → NOT_FOUND (404) y no emite', async () => {
  const { pub, emitted } = spyPublisher();
  const uc = new CreateCommentUseCase(repo({ createComment: async () => null }), pub);
  await assert.rejects(
    () => uc.execute(POST, COMMENTER, input),
    (e: unknown) => e instanceof AppException && e.code === ErrorCode.NOT_FOUND && e.status === 404,
  );
  assert.equal(emitted.length, 0);
});
