/**
 * IceService (Ola 4) — STUN siempre; TURN con credenciales EFÍMERAS HMAC solo si está configurado.
 * Verifica el formato coturn (username = expiry:accountId, credential = base64 HMAC-SHA1) y que sin
 * TURN_SECRET no se emite servidor TURN. Fake del Env.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { IceService } from './ice.service';
import type { Env } from '../../config/env';

const ACCOUNT = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const env = (over: Partial<Env>): Env =>
  ({ STUN_URLS: 'stun:stun.l.google.com:19302', TURN_TTL_S: 3600, ...over }) as Env;

test('sin TURN configurado: solo STUN', () => {
  const cfg = new IceService(env({})).forAccount(ACCOUNT);
  assert.equal(cfg.iceServers.length, 1);
  assert.deepEqual(cfg.iceServers[0]!.urls, ['stun:stun.l.google.com:19302']);
  assert.equal(cfg.iceServers[0]!.username, undefined);
});

test('con TURN: emite credencial efímera HMAC estilo coturn', () => {
  const secret = 'super-secreto-de-coturn';
  const cfg = new IceService(
    env({ TURN_URLS: 'turn:turn.osia.com:3478,turns:turn.osia.com:5349', TURN_SECRET: secret }),
  ).forAccount(ACCOUNT);
  assert.equal(cfg.iceServers.length, 2);
  const turn = cfg.iceServers[1]!;
  assert.deepEqual(turn.urls, ['turn:turn.osia.com:3478', 'turns:turn.osia.com:5349']);
  // username = <expiry-unix>:<accountId>
  const [expiry, acct] = turn.username!.split(':');
  assert.equal(acct, ACCOUNT);
  assert.ok(Number(expiry) > Math.floor(Date.now() / 1000), 'expiry en el futuro');
  // credential = base64(HMAC-SHA1(username, secret)) — recomputable, el secreto no viaja
  const expected = createHmac('sha1', secret).update(turn.username!).digest('base64');
  assert.equal(turn.credential, expected);
});
