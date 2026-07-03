/**
 * Tests de round-trip del codec + invariantes de movimiento (S0.4-H1 DoD).
 * Corre con `tsx` (node:test). Sin framework extra.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { encode, decode } from './codec';
import { C2S, S2C, WireErrorCode } from './opcodes';
import { asEntityId } from '../domain/ids';
import type {
  HelloMsg,
  InputMsg,
  PingMsg,
  PongMsg,
  ChatSendMsg,
  ChatBroadcastMsg,
  ByeMsg,
  EntityJoinMsg,
  EntityLeaveMsg,
  AtmosphereUpdateMsg,
  ErrorMsg,
  WelcomeMsg,
  DeltaMsg,
  VoiceSignalMsg,
  VoiceSignalRelayMsg,
  VoiceStateMsg,
  VoiceStateRelayMsg,
} from './messages';
import { applyMovement, type MoveState } from './movement';
import { GROUND_RADIUS, MOVE_SPEED } from './constants';
import { MONOLITH, PLAYER_RADIUS, WORLD_OBSTACLES, type Obstacle } from '../world/layout';
import { normalizeChat, normalizeHandle } from '../text/sanitizeChat';
import { WEATHER_KINDS, type WeatherKind } from '@osia/atmosphere';

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
    selfId: asEntityId(1),
    instanceId: 'hub',
    protocol: 1,
    tickHz: 20,
    entities: [
      { id: asEntityId(1), handle: 'carlos', accentColor: '#CBB89A', x: 0, z: 6, yaw: 0, vx: 0, vz: -1.25 },
    ],
    atmosphere: { biome: 'bosque-celeste', weather: { kind: 'despejado', intensity: 0 } },
    serverTime: 1_700_000_000_000,
    resumeToken: 'tok-abc',
  };
  assert.deepEqual(decode(encode(welcome)), welcome);

  const delta: DeltaMsg = {
    op: S2C.DELTA,
    tick: 100,
    ackSeq: 42,
    entities: [{ id: asEntityId(1), x: 1.2, z: 5.5, yaw: 0.3, vx: 4.4, vz: -0.75 }],
  };
  assert.deepEqual(decode(encode(delta)), delta);
});

test('round-trip VOICE_SIGNAL (SDP grande) y VOICE_STATE', () => {
  const sdp =
    'v=0\r\n' + 'a=candidate:1 1 udp 2122260223 192.168.0.1 54321 typ host\r\n'.repeat(80); // ~5KB
  const sig: VoiceSignalMsg = { op: C2S.VOICE_SIGNAL, dstId: asEntityId(7), kind: 0, payload: sdp };
  assert.deepEqual(decode(encode(sig)), sig);

  const relay: VoiceSignalRelayMsg = {
    op: S2C.VOICE_SIGNAL,
    srcId: asEntityId(3),
    kind: 2,
    payload: '{"candidate":"x"}',
  };
  assert.deepEqual(decode(encode(relay)), relay);

  const st: VoiceStateMsg = { op: C2S.VOICE_STATE, flags: 3 };
  assert.deepEqual(decode(encode(st)), st);

  const stRelay: VoiceStateRelayMsg = { op: S2C.VOICE_STATE, id: asEntityId(5), flags: 7 };
  assert.deepEqual(decode(encode(stRelay)), stRelay);
});

test('round-trip PING / PONG (sincronización de reloj)', () => {
  const ping: PingMsg = { op: C2S.PING, t: 1_700_000_123_456 };
  assert.deepEqual(decode(encode(ping)), ping);

  const pong: PongMsg = { op: S2C.PONG, t: 1_700_000_123_456, serverTime: 1_700_000_123_999 };
  assert.deepEqual(decode(encode(pong)), pong);
});

test('round-trip CHAT_SEND / CHAT_MSG', () => {
  const send: ChatSendMsg = { op: C2S.CHAT_SEND, text: 'hola, mundo — ¿qué tal? 🌙' };
  assert.deepEqual(decode(encode(send)), send);

  const bcast: ChatBroadcastMsg = { op: S2C.CHAT_MSG, id: asEntityId(7), handle: 'Orión', text: 'buenas' };
  assert.deepEqual(decode(encode(bcast)), bcast);
});

test('round-trip ENTITY_JOIN / ENTITY_LEAVE / BYE', () => {
  const join: EntityJoinMsg = {
    op: S2C.ENTITY_JOIN,
    entity: {
      id: asEntityId(9),
      handle: 'Vega',
      accentColor: '#B8A07E',
      x: 2.5,
      z: -3.25,
      yaw: 1.1,
      vx: 0,
      vz: 0,
    },
  };
  assert.deepEqual(decode(encode(join)), join);

  const leave: EntityLeaveMsg = { op: S2C.ENTITY_LEAVE, id: asEntityId(9) };
  assert.deepEqual(decode(encode(leave)), leave);

  const bye: ByeMsg = { op: C2S.BYE };
  assert.deepEqual(decode(encode(bye)), bye);
});

test('round-trip ATMOSPHERE_UPDATE / ERROR', () => {
  const atmo: AtmosphereUpdateMsg = {
    op: S2C.ATMOSPHERE_UPDATE,
    biome: 'bosque-celeste',
    weather: { kind: 'lluvia', intensity: 0.65 },
  };
  assert.deepEqual(decode(encode(atmo)), atmo);

  const err: ErrorMsg = { op: S2C.ERROR, code: WireErrorCode.BAD_TICKET, message: 'ticket inválido' };
  assert.deepEqual(decode(encode(err)), err);
});

test('round-trip ATMOSPHERE_UPDATE — matriz de kinds × intensidades (S2-B3)', () => {
  for (const kind of WEATHER_KINDS) {
    for (const intensity of [0, 0.5, 1] as const) {
      const msg: AtmosphereUpdateMsg = {
        op: S2C.ATMOSPHERE_UPDATE,
        biome: 'bosque-celeste',
        weather: { kind, intensity },
      };
      assert.deepEqual(decode(encode(msg)), msg, `round-trip ${kind}@${intensity}`);
    }
  }
});

test('decode ATMOSPHERE_UPDATE degrada seguro: kind desconocido → despejado (S2-B3)', () => {
  // Un cliente/servidor viejo manda un kind que este no conoce: el codec no debe romper.
  const raw = encode({
    op: S2C.ATMOSPHERE_UPDATE,
    biome: 'bosque-celeste',
    weather: { kind: 'ventisca-cuantica' as WeatherKind, intensity: 0.5 },
  });
  const dec = decode<AtmosphereUpdateMsg>(raw)!;
  assert.equal(dec.weather.kind, 'despejado');
});

test('decode ATMOSPHERE_UPDATE clampa intensity fuera de [0,1] y NaN (S2-B3)', () => {
  for (const bad of [5, -1, Number.NaN]) {
    const raw = encode({
      op: S2C.ATMOSPHERE_UPDATE,
      biome: 'bosque-celeste',
      weather: { kind: 'lluvia', intensity: bad },
    });
    const dec = decode<AtmosphereUpdateMsg>(raw)!;
    assert.ok(
      dec.weather.intensity >= 0 && dec.weather.intensity <= 1 && Number.isFinite(dec.weather.intensity),
      `intensity ${bad} → ${dec.weather.intensity} debe quedar en [0,1]`,
    );
  }
});

test('decode rechaza basura', () => {
  assert.equal(decode(new Uint8Array(0)), null); // vacío (sin opcode)
  assert.equal(decode(new Uint8Array([0xff])), null); // opcode desconocido
});

test('decode INPUT rechaza f64 no finitos en yaw/dtMs (anti-griefing NaN)', () => {
  // Un yaw/dtMs no finito corrompe la posición autoritativa de forma permanente y se
  // difunde a todos; el frame debe rechazarse en el borde (return null), no propagarse.
  for (const [yaw, dtMs] of [
    [Number.NaN, 16],
    [Number.POSITIVE_INFINITY, 16],
    [0.5, Number.NaN],
    [0.5, Number.NEGATIVE_INFINITY],
  ] as const) {
    const raw = encode({ op: C2S.INPUT, seq: 1, f: 1, r: 0, yaw, dtMs });
    assert.equal(decode(raw), null, `INPUT yaw=${yaw} dtMs=${dtMs} debe rechazarse`);
  }
  // El caso sano sigue pasando (no rompimos el camino feliz).
  const ok: InputMsg = { op: C2S.INPUT, seq: 1, f: 1, r: 0, yaw: 0.5, dtMs: 16 };
  assert.deepEqual(decode(encode(ok)), ok);
});

test('decode rechaza frames truncados / con prefijo mentiroso (bounds-check)', () => {
  // INPUT completo, truncado a la mitad → null (no acepta datos corruptos).
  const full = encode({ op: C2S.INPUT, seq: 1, f: 1, r: 0, yaw: 0, dtMs: 16 });
  assert.equal(decode(full.subarray(0, full.byteLength - 5)), null);

  // CHAT_SEND con prefijo de longitud u16 = 9999 pero SIN payload → null.
  const liar = new Uint8Array([C2S.CHAT_SEND, 0x27, 0x0f]);
  assert.equal(decode(liar), null);
});

test('normalizeChat/Handle sanea control, zero-width y RTL', () => {
  const ZW = String.fromCharCode(0x200b); // zero-width space
  const RTL = String.fromCharCode(0x202e); // right-to-left override
  assert.equal(normalizeChat(`  hola${ZW}mundo  `), 'holamundo'); // zero-width + trim/collapse
  assert.equal(normalizeChat(`a${RTL}b`), 'ab'); // RTL override
  assert.equal([...normalizeChat('x'.repeat(300))].length, 240); // cap por codepoints
  assert.equal(normalizeHandle(''), 'anónimo'); // fallback
  assert.equal(normalizeHandle(`  Orión${ZW}  `), 'Orión');
  assert.ok([...normalizeHandle('y'.repeat(50))].length <= 24); // cap del handle
});

/** Estado en reposo en (x, z) — helper de los tests de locomoción. */
function at(x: number, z: number): MoveState {
  return { x, z, vx: 0, vz: 0 };
}

/** Simula `n` pasos de dt fijo con el mismo input (sin obstáculos salvo que se pasen). */
function run(
  s: MoveState,
  input: { f: number; r: number; yaw: number },
  n: number,
  dt = 0.05,
  obstacles: readonly Obstacle[] = [],
): void {
  for (let i = 0; i < n; i++) applyMovement(s, input, dt, obstacles);
}

test('applyMovement: acelera con peso hasta MOVE_SPEED y avanza hacia -Z', () => {
  const s = at(0, 0);
  applyMovement(s, { f: 1, r: 0, yaw: 0 }, 0.05, []);
  assert.ok(s.z < 0, 'con f=1, yaw=0 avanza hacia -Z');
  const v1 = Math.hypot(s.vx, s.vz);
  assert.ok(v1 > 0 && v1 < MOVE_SPEED, `arranca acelerando (${v1}), no a tope`);

  run(s, { f: 1, r: 0, yaw: 0 }, 40); // 2 s: de sobra para alcanzar la velocidad máxima
  const v2 = Math.hypot(s.vx, s.vz);
  assert.ok(Math.abs(v2 - MOVE_SPEED) < 1e-9, `alcanza y no supera MOVE_SPEED (${v2})`);
});

test('applyMovement: al soltar el input frena hasta detenerse (velocidad exacta 0)', () => {
  const s = at(0, 0);
  run(s, { f: 1, r: 0, yaw: 0 }, 20); // a velocidad máxima
  run(s, { f: 0, r: 0, yaw: 0 }, 20); // 1 s sin input: frena de sobra
  assert.equal(s.vx, 0, 'vx queda en cero exacto');
  assert.equal(s.vz, 0, 'vz queda en cero exacto');
  const z = s.z;
  run(s, { f: 0, r: 0, yaw: 0 }, 5);
  assert.equal(s.z, z, 'detenido no hay drift');
});

test('applyMovement: determinista — misma secuencia de inputs ⇒ mismo estado bit a bit', () => {
  const a = at(0, 6);
  const b = at(0, 6);
  const inputs = [
    { f: 1, r: 0, yaw: 0.3 },
    { f: 1, r: 1, yaw: 0.35 },
    { f: 0, r: 1, yaw: 0.4 },
    { f: 0, r: 0, yaw: 0.4 },
  ];
  for (const inp of inputs) applyMovement(a, inp, 0.016, WORLD_OBSTACLES);
  for (const inp of inputs) applyMovement(b, inp, 0.016, WORLD_OBSTACLES);
  assert.deepEqual(a, b, 'servidor y cliente calculan exactamente lo mismo');
});

test('applyMovement: no atraviesa el monolito — se detiene en el radio y desliza', () => {
  // Camino directo al centro (el monolito está en 0,0): yaw=0 con f=1 avanza hacia -Z.
  const s = at(0, 6);
  run(s, { f: 1, r: 0, yaw: 0 }, 60, 0.05, [MONOLITH]);
  const clear = MONOLITH.radius + PLAYER_RADIUS;
  const d = Math.hypot(s.x - MONOLITH.x, s.z - MONOLITH.z);
  assert.ok(d >= clear - 1e-9, `queda fuera del monolito (d=${d} ≥ ${clear})`);

  // Empuje diagonal: la componente tangencial sobrevive (desliza, no se pega).
  const t = { x: 0, z: clear, vx: 0, vz: 0 };
  applyMovement(t, { f: 1, r: 1, yaw: 0 }, 0.05, [MONOLITH]);
  assert.ok(Math.abs(t.x) > 0, 'la componente tangencial del movimiento sobrevive al contacto');
  assert.ok(Math.hypot(t.x, t.z) >= clear - 1e-9, 'sin penetrar el círculo');
});

test('applyMovement: respeta el límite del claro y desliza por el borde', () => {
  const far: MoveState = { x: GROUND_RADIUS - 0.01, z: 0, vx: 0, vz: 0 };
  // yaw=π/2 con f=1 empuja hacia -X... hacia AFUERA es +X: usar yaw=-π/2 (fwd=+X).
  run(far, { f: 1, r: 0, yaw: -Math.PI / 2 }, 20);
  assert.ok(Math.hypot(far.x, far.z) <= GROUND_RADIUS + 1e-9, 'no sale del claro');

  // En el borde, moverse en diagonal debe deslizar (avanza en Z aunque X esté clavado al radio).
  const slide: MoveState = { x: GROUND_RADIUS, z: 0, vx: 0, vz: 0 };
  const z0 = slide.z;
  run(slide, { f: 1, r: -1, yaw: -Math.PI / 2 }, 10);
  assert.ok(Math.abs(slide.z - z0) > 0.05, 'desliza por el borde en vez de quedarse clavado');
});

test('applyMovement es no-op ante yaw/dt no finitos (defensa en profundidad)', () => {
  const p1: MoveState = { x: 3, z: -2, vx: 1, vz: 0 };
  applyMovement(p1, { f: 1, r: 0, yaw: Number.NaN }, 0.05, []);
  assert.deepEqual(p1, { x: 3, z: -2, vx: 1, vz: 0 }, 'yaw=NaN no mueve ni envenena el estado');

  const p2: MoveState = { x: 3, z: -2, vx: 1, vz: 0 };
  applyMovement(p2, { f: 1, r: 0, yaw: 0 }, Number.POSITIVE_INFINITY, []);
  assert.deepEqual(p2, { x: 3, z: -2, vx: 1, vz: 0 }, 'dt=Infinity no mueve ni envenena el estado');
});

test('normalizeChat recorta por bytes sin partir un emoji en el borde', () => {
  // '🌙' = 4 bytes UTF-8; 130 lunas = 520 bytes > MAX_BYTES(480). El recorte por code units
  // partiría un surrogate pair dejando U+FFFD; por codepoints no debe aparecer ningún �.
  const out = normalizeChat('🌙'.repeat(130));
  assert.ok(!out.includes('�'), 'no debe quedar carácter de reemplazo por surrogate huérfano');
  assert.ok(new TextEncoder().encode(out).length <= 480, 'debe respetar el tope de bytes');
  assert.ok([...out].every((cp) => cp === '🌙'), 'solo lunas completas');
});
