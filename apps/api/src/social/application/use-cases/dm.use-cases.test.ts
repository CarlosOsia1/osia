/**
 * DM (R5) — abrir distingue 404 (cuenta inexistente) de 403 BLOCKED sin oráculo de dirección;
 * enviar/leer 404 si no procede; anti-self 422; el idempotente devuelve la conversación.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ErrorCode, type ConversationDto, type MessageDto } from '@osia/shared';
import {
  DeleteMessageUseCase,
  OpenConversationUseCase,
  SendMessageUseCase,
} from './dm.use-cases';
import type { DmRepository } from '../ports/out/dm.repository';
import type { FollowRepository } from '../ports/out/follow.repository';
import { AppException } from '../../../common/app-exception';

const conversation = { id: 'c1' } as unknown as ConversationDto;
const message = { id: 'm1', body: 'hola' } as unknown as MessageDto;

function dmRepo(over: Partial<DmRepository> = {}): DmRepository {
  return {
    getOrCreateConversation: () => Promise.resolve(conversation),
    listConversations: () =>
      Promise.resolve({
        page: { data: [], page: { nextCursor: null, hasMore: false, limit: 20 } },
        unreadTotal: 0,
      }),
    listMessages: () => Promise.resolve(null),
    sendMessage: () => Promise.resolve(message),
    markRead: () => Promise.resolve(true),
    deleteOwnMessage: () => Promise.resolve(true),
    ...over,
  };
}

const followsStub = (exists: boolean): FollowRepository =>
  ({ accountExists: () => Promise.resolve(exists) }) as unknown as FollowRepository;

test('abrir: idempotente devuelve la conversación; anti-self 422', async () => {
  const uc = new OpenConversationUseCase(dmRepo(), followsStub(true));
  assert.equal((await uc.execute('a1', 'a2')).id, 'c1');
  await assert.rejects(
    () => uc.execute('a1', 'a1'),
    (e: unknown) => e instanceof AppException && e.status === 422,
  );
});

test('abrir con par bloqueado → 403 BLOCKED; cuenta inexistente → 404', async () => {
  const blockedRepo = dmRepo({ getOrCreateConversation: () => Promise.resolve(null) });
  await assert.rejects(
    () => new OpenConversationUseCase(blockedRepo, followsStub(true)).execute('a1', 'a2'),
    (e: unknown) => e instanceof AppException && e.status === 403 && e.code === ErrorCode.BLOCKED,
  );
  await assert.rejects(
    () => new OpenConversationUseCase(blockedRepo, followsStub(false)).execute('a1', 'a2'),
    (e: unknown) => e instanceof AppException && e.status === 404,
  );
});

test('enviar: ajena o bloqueada → 404 sin oráculo; retirar mensaje ajeno → 404', async () => {
  await assert.rejects(
    () =>
      new SendMessageUseCase(dmRepo({ sendMessage: () => Promise.resolve(null) })).execute('c1', 'a1', {
        body: 'hola',
      }),
    (e: unknown) => e instanceof AppException && e.status === 404,
  );
  await assert.rejects(
    () =>
      new DeleteMessageUseCase(dmRepo({ deleteOwnMessage: () => Promise.resolve(false) })).execute('m1', 'a1'),
    (e: unknown) => e instanceof AppException && e.status === 404,
  );
});
