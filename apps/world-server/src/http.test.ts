/**
 * /metrics (S2-C1) — el endpoint de observabilidad responde 200 con el shape esperado y el
 * contador de difusiones de atmósfera refleja el estado del World. Sin DB (Null stores en test).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createWorld } from './state';
import { createHttpServer } from './http';

type MetricsBody = {
  tick: { ticks: number };
  connections: number;
  players: number;
  atmosphereBroadcasts: number;
  ts: number;
};

test('GET /metrics responde 200 con el shape esperado y cuenta difusiones de atmósfera', async () => {
  const world = createWorld();
  const server = createHttpServer(world);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/metrics`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as MetricsBody;
    for (const key of ['tick', 'connections', 'players', 'atmosphereBroadcasts', 'ts'] as const) {
      assert.ok(key in body, `falta la clave ${key}`);
    }
    assert.equal(body.atmosphereBroadcasts, 0);

    world.atmosphereBroadcasts++; // simula una difusión de clima
    const res2 = await fetch(`http://127.0.0.1:${port}/metrics`);
    const body2 = (await res2.json()) as MetricsBody;
    assert.equal(body2.atmosphereBroadcasts, 1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
