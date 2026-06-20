/**
 * Tests de round-trip del codec + invariantes de movimiento (S0.4-H1 DoD).
 * Corre con `tsx` (node:test). Sin framework extra.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { encode, decode } from './codec';
import { C2S, S2C } from './opcodes';
import type {
  HelloMsg,
  InputMsg,
  WelcomeMsg,
  DeltaMsg,
  VoiceSignalMsg,
  VoiceSignalRelayMsg,
  VoiceStateMsg,
  VoiceStateRelayMsg,
} from './messages';
import { applyMovement, type Vec2 } from './movement';
import { GROUND_RADIUS } from './constants';

test('round-trip HELLO', () => {
  const msg: HelloMsg = { op: C2S.HELLO, ticket: 'a.b.c', protocol: 1 };
  assert.deepEqual(decode(encode(msg)), msg);
});

test('round-trip INPUT', () => {
  const msg: InputMsg = { op: C2S.INPUT, seq: 42, f: 1, r: -1, yaw: 0.7, dtMs: 16 };
  assert.deepEqual(decode(encode(msg)), msg);
});

test('round-trip WELCOME y DELTA con entidades', () => {
  const welcome: WelcomeMsg = {
    op: S2C.WELCOME,
    selfId: 1,
    instanceId: 'hub',
    protocol: 1,
    tickHz: 20,
    entities: [{ id: 1, handle: 'carlos', x: 0, z: 6, yaw: 0 }],
    atmosphere: { biome: 'bosque-celeste', weather: { kind: 'despejado', intensity: 0 } },
    serverTime: 1_700_000_000_000,
    resumeToken: 'tok-abc',
  };
  assert.deepEqual(decode(encode(welcome)), welcome);

  const delta: DeltaMsg = {
    op: S2C.DELTA,
    tick: 100,
    ackSeq: 42,
    entities: [{ id: 1, x: 1.2, z: 5.5, yaw: 0.3 }],
  };
  assert.deepEqual(decode(encode(delta)), delta);
});

test('round-trip VOICE_SIGNAL (SDP grande) y VOICE_STATE', () => {
  const sdp = 'v=0\r\n' + 'a=candidate:1 1 udp 2122260223 192.168.0.1 54321 typ host\r\n'.repeat(80); // ~5KB
  const sig: VoiceSignalMsg = { op: C2S.VOICE_SIGNAL, dstId: 7, kind: 0, payload: sdp };
  assert.deepEqual(decode(encode(sig)), sig);

  const relay: VoiceSignalRelayMsg = { op: S2C.VOICE_SIGNAL, srcId: 3, kind: 2, payload: '{"candidate":"x"}' };
  assert.deepEqual(decode(encode(relay)), relay);

  const st: VoiceStateMsg = { op: C2S.VOICE_STATE, flags: 3 };
  assert.deepEqual(decode(encode(st)), st);

  const stRelay: VoiceStateRelayMsg = { op: S2C.VOICE_STATE, id: 5, flags: 7 };
  assert.deepEqual(decode(encode(stRelay)), stRelay);
});

test('decode rechaza basura', () => {
  assert.equal(decode(new Uint8Array(0)), null); // vacío (sin opcode)
  assert.equal(decode(new Uint8Array([0xff])), null); // opcode desconocido
});

test('applyMovement avanza y respeta el límite del claro', () => {
  const p: Vec2 = { x: 0, z: 0 };
  applyMovement(p, { f: 1, r: 0, yaw: 0 }, 0.05);
  assert.ok(p.z < 0, 'con f=1, yaw=0 debe avanzar hacia -Z');

  const far: Vec2 = { x: 100, z: 0 };
  applyMovement(far, { f: 1, r: 0, yaw: Math.PI / 2 }, 0.05);
  assert.ok(Math.hypot(far.x, far.z) <= GROUND_RADIUS + 1e-6, 'no debe salir del claro');
});
