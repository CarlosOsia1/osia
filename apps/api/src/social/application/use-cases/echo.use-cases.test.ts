/**
 * Eco (R4.3) — el eco NUEVO emite published (fan-out) + echoed (notificación al autor del
 * original); el idempotente NO re-emite; original no elegible → 404.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { PostDto } from '@osia/shared';
import { CreateEchoUseCase, RemoveEchoUseCase } from './echo.use-cases';
import type { CreatedEcho, PostRepository } from '../ports/out/post.repository';
import type { SocialEventPublisher } from '../ports/out/social-event-publisher.port';
import { AppException } from '../../../common/app-exception';

const echo = { id: 'e1', createdAt: '2026-07-02T12:00:00.000Z' } as unknown as PostDto;

function postsRepo(result: CreatedEcho | null): PostRepository {
  return {
    createPost: () => Promise.reject(new Error('no aplica')),
    getById: () => Promise.resolve(null),
    softDelete: () => Promise.resolve(false),
    updateBody: () => Promise.resolve(null),
    createEcho: () => Promise.resolve(result),
    removeSimpleEcho: () => Promise.resolve(true),
  };
}

function eventsSpy() {
  const published: string[] = [];
  const echoed: string[] = [];
  const events: SocialEventPublisher = {
    followCreated: () => {},
    followRequested: () => {},
    followAccepted: () => {},
    postReacted: () => {},
    postCommented: () => {},
    postPublished: (p) => published.push(p.postId),
    postEchoed: (p) => echoed.push(p.echoPostId),
  };
  return { events, published, echoed };
}

test('eco nuevo: emite published (fan-out) + echoed (notificación)', async () => {
  const { events, published, echoed } = eventsSpy();
  const created: CreatedEcho = {
    echo,
    originalPostId: 'p1',
    originalAuthorAccountId: 'autor-original',
    created: true,
  };
  const result = await new CreateEchoUseCase(postsRepo(created), events).execute('yo', 'p1', {});
  assert.equal(result.id, 'e1');
  assert.deepEqual(published, ['e1']);
  assert.deepEqual(echoed, ['e1']);
});

test('eco simple repetido (idempotente): devuelve el existente SIN re-emitir', async () => {
  const { events, published, echoed } = eventsSpy();
  const existing: CreatedEcho = {
    echo,
    originalPostId: 'p1',
    originalAuthorAccountId: 'autor-original',
    created: false,
  };
  await new CreateEchoUseCase(postsRepo(existing), events).execute('yo', 'p1', {});
  assert.deepEqual(published, []);
  assert.deepEqual(echoed, []);
});

test('original no elegible (privado/followers/borrado) → 404 sin oráculo', async () => {
  const { events } = eventsSpy();
  await assert.rejects(
    () => new CreateEchoUseCase(postsRepo(null), events).execute('yo', 'p1', {}),
    (e: unknown) => e instanceof AppException && e.status === 404,
  );
});

test('des-ecoar es idempotente (sin eco vivo no es error)', async () => {
  await assert.doesNotReject(() => new RemoveEchoUseCase(postsRepo(null)).execute('yo', 'p1'));
});
