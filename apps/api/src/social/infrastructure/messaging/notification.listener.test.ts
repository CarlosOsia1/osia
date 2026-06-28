/**
 * NotificationListener (S3.4-H2) — rutea eventos social.* a notificaciones: follow → al seguido; reacción
 * → al autor (no auto-reacción); comentario → al autor + mencionados (no auto-comentario). Fake del repo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { NotificationType } from '@osia/shared';
import { NotificationListener } from './notification.listener';
import { CreateNotificationUseCase } from '../../application/use-cases/create-notification.use-case';
import type { NotificationRepository } from '../../application/ports/out/notification.repository';

const A = '0190b8e0-7c1e-7b3a-8a4e-000000000001'; // actor
const B = '0190b8e0-7c1e-7b3a-8a4e-000000000002'; // receptor
const M = '0190b8e0-7c1e-7b3a-8a4e-000000000003'; // mencionado
const POST = '0190b8e0-7c1e-7b3a-8a4e-0000000000a1';

type Call = { accountId: string; kind: NotificationType; actor: string | null };
const setup = () => {
  const calls: Call[] = [];
  const repo: NotificationRepository = {
    create: async (accountId, kind, actor) => {
      calls.push({ accountId, kind, actor });
    },
    list: async () => ({ data: [], page: { nextCursor: null, hasMore: false, limit: 20 } }),
    unreadCount: async () => 0,
    markRead: async () => {},
    markOneRead: async () => true,
  };
  return { listener: new NotificationListener(new CreateNotificationUseCase(repo)), calls };
};

test('follow → notifica al seguido (actor = seguidor)', async () => {
  const { listener, calls } = setup();
  await listener.onFollow({ followerAccountId: A, followeeAccountId: B });
  assert.deepEqual(calls, [{ accountId: B, kind: 'follow', actor: A }]);
});

test('reacción ajena → notifica al autor; auto-reacción → nada', async () => {
  const { listener, calls } = setup();
  await listener.onReacted({ postId: POST, postAuthorAccountId: B, reactorAccountId: A, kind: 'star' });
  await listener.onReacted({ postId: POST, postAuthorAccountId: B, reactorAccountId: B, kind: 'star' });
  assert.deepEqual(calls, [{ accountId: B, kind: 'reaction', actor: A }]);
});

test('comentario → notifica al autor + a cada mencionado (actor = comentador)', async () => {
  const { listener, calls } = setup();
  await listener.onCommented({
    postId: POST,
    postAuthorAccountId: B,
    commenterAccountId: A,
    commentId: '0190b8e0-7c1e-7b3a-8a4e-0000000000ff',
    mentionedAccountIds: [M],
  });
  assert.deepEqual(calls, [
    { accountId: B, kind: 'comment', actor: A },
    { accountId: M, kind: 'mention', actor: A },
  ]);
});

test('auto-comentario (comentador = autor, sin menciones) → nada', async () => {
  const { listener, calls } = setup();
  await listener.onCommented({
    postId: POST,
    postAuthorAccountId: A,
    commenterAccountId: A,
    commentId: '0190b8e0-7c1e-7b3a-8a4e-0000000000ff',
    mentionedAccountIds: [],
  });
  assert.equal(calls.length, 0);
});
