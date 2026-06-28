/**
 * SocialHealthService (S3.1-H2) — liveness siempre `ok:true`; `schema` refleja el puerto. Fakes del
 * puerto (sin DB). Recorre los dos flujos: schema aplicado y schema ausente/caído.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { SocialHealthService } from './social-health.service';
import type { SocialHealthPort } from './ports/out/social-health.port';

const portWith = (ready: boolean): SocialHealthPort => ({
  isSchemaReady: async () => ready,
});

test('check: schema aplicado → schema "up", ok true, service "social"', async () => {
  const svc = new SocialHealthService(portWith(true));
  const r = await svc.check();
  assert.equal(r.ok, true);
  assert.equal(r.service, 'social');
  assert.equal(r.schema, 'up');
  assert.equal(typeof r.ts, 'string');
  assert.ok(!Number.isNaN(Date.parse(r.ts)), 'ts es ISO-8601 parseable');
});

test('check: schema ausente/DB caída → schema "down" (sigue respondiendo ok:true)', async () => {
  const svc = new SocialHealthService(portWith(false));
  const r = await svc.check();
  assert.equal(r.ok, true);
  assert.equal(r.schema, 'down');
});
