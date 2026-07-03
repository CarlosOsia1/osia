/**
 * CreateNotificationUseCase (Ola 1C) — deriva un id DETERMINISTA de la clave natural del evento para que
 * la escritura sea idempotente ante la re-entrega del outbox: el MISMO evento da el MISMO id; eventos
 * distintos (otro destinatario, tipo, actor o referencia) dan ids distintos. Fake del repo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { NotificationType } from '@osia/shared';
import { CreateNotificationUseCase } from './create-notification.use-case';
import type { NotificationRepository } from '../ports/out/notification.repository';

const A = '0190b8e0-7c1e-7b3a-8a4e-000000000001'; // actor
const B = '0190b8e0-7c1e-7b3a-8a4e-000000000002'; // receptor
const POST = '0190b8e0-7c1e-7b3a-8a4e-0000000000a1';
const UUID_V5 = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const setup = () => {
  const ids: string[] = [];
  const repo: NotificationRepository = {
    create: async (id) => {
      ids.push(id);
    },
    list: async () => ({ data: [], page: { nextCursor: null, hasMore: false, limit: 20 } }),
    unreadCount: async () => 0,
    markRead: async () => {},
    markOneRead: async () => true,
  };
  return { uc: new CreateNotificationUseCase(repo), ids };
};

const run = (
  uc: CreateNotificationUseCase,
  kind: NotificationType,
  payload: Record<string, unknown> = {},
  recipient = B,
  actor: string | null = A,
) => uc.execute(recipient, kind, actor, payload);

test('id es un uuid v5 válido', async () => {
  const { uc, ids } = setup();
  await run(uc, 'follow');
  assert.match(ids[0] ?? '', UUID_V5);
});

test('mismo evento → mismo id (idempotente ante re-entrega)', async () => {
  const { uc, ids } = setup();
  await run(uc, 'reaction', { postId: POST, kind: 'star' });
  await run(uc, 'reaction', { postId: POST, kind: 'star' });
  assert.equal(ids[0], ids[1]);
});

test('distinto kind de reacción → id distinto (es otra notificación legítima)', async () => {
  const { uc, ids } = setup();
  await run(uc, 'reaction', { postId: POST, kind: 'star' });
  await run(uc, 'reaction', { postId: POST, kind: 'moon' });
  assert.notEqual(ids[0], ids[1]);
});

test('distinto destinatario → id distinto', async () => {
  const { uc, ids } = setup();
  await run(uc, 'follow', {}, B);
  await run(uc, 'follow', {}, A);
  assert.notEqual(ids[0], ids[1]);
});
