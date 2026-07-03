/**
 * OutboxDispatcher (Ola 1C) — entrega at-least-once: reclama un lote, `emitAsync` cada evento y lo marca
 * publicado; si un consumidor lanza, NO lo marca publicado (se reintenta) y anota el error. Fakes del
 * store y del emisor (sin DB ni bus real).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { OutboxDispatcher } from './outbox.dispatcher';
import type { OutboxRecord, OutboxStore } from '../../application/ports/out/outbox.store';

const rec = (id: string, topic: string): OutboxRecord => ({ id, topic, payload: {} });

/** Store fake: entrega `batch` UNA vez (luego vacío) y registra los marcados publicados/fallidos. */
function fakeStore(batch: OutboxRecord[]) {
  const published: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  let served = false;
  const store: OutboxStore = {
    enqueue: async () => {},
    claimBatch: async () => {
      if (served) return [];
      served = true;
      return batch;
    },
    markPublished: async (id) => {
      published.push(id);
    },
    markFailed: async (id, error) => {
      failed.push({ id, error });
    },
  };
  return { store, published, failed };
}

/** Emisor fake: resuelve, salvo para los topics en `failTopics` (simula un consumidor que lanza). */
function fakeEmitter(failTopics = new Set<string>()): EventEmitter2 {
  return {
    emitAsync: async (topic: string) => {
      if (failTopics.has(topic)) throw new Error('consumidor explotó');
      return [];
    },
  } as unknown as EventEmitter2;
}

test('drainOnce: entrega cada evento y lo marca publicado', async () => {
  const { store, published, failed } = fakeStore([
    rec('1', 'social.post.published'),
    rec('2', 'social.post.reacted'),
  ]);
  const dispatcher = new OutboxDispatcher(fakeEmitter(), store);
  const delivered = await dispatcher.drainOnce();
  assert.equal(delivered, 2);
  assert.deepEqual([...published].sort(), ['1', '2']);
  assert.equal(failed.length, 0);
});

test('drainOnce: un consumidor que falla NO se marca publicado (queda para reintento)', async () => {
  const { store, published, failed } = fakeStore([
    rec('1', 'social.post.published'),
    rec('2', 'boom.topic'),
  ]);
  const dispatcher = new OutboxDispatcher(fakeEmitter(new Set(['boom.topic'])), store);
  const delivered = await dispatcher.drainOnce();
  assert.equal(delivered, 1); // solo el primero se entregó
  assert.deepEqual(published, ['1']); // el que falló NO se marcó publicado
  assert.equal(failed.length, 1);
  assert.equal(failed[0]?.id, '2');
});

test('drainOnce: sin pendientes no marca nada', async () => {
  const { store, published, failed } = fakeStore([]);
  const dispatcher = new OutboxDispatcher(fakeEmitter(), store);
  assert.equal(await dispatcher.drainOnce(), 0);
  assert.equal(published.length, 0);
  assert.equal(failed.length, 0);
});
