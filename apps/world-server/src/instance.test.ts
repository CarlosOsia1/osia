import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMovement,
  asEntityId as E,
  MONOLITH,
  PLAYER_RADIUS,
  WORLD_OBSTACLES,
} from '@osia/shared';
import { Instance } from './instance';

test('Instance.step: drena inputs y aplica el movimiento autoritativo', () => {
  const inst = new Instance('hub');
  // Zona despejada (el centro es el monolito: allí la colisión empuja y ensucia el assert).
  const rt = inst.add(E(1), 'a', '#CBB89A', { x: 10, z: 10 }, 'tok');
  rt.inputs.push({ seq: 1, f: 1, r: 0, yaw: 0, dt: 0.05 }); // adelante
  inst.step();
  assert.ok(rt.state.z < 10, 'con f=1, yaw=0 avanza hacia -Z');
  assert.equal(rt.lastSeq, 1, 'lastSeq = último seq drenado (ackSeq)');
  assert.equal(rt.inputs.length, 0, 'la cola de inputs queda vacía');
});

test('Instance.step: sin inputs no mueve la entidad', () => {
  const inst = new Instance('hub');
  const rt = inst.add(E(1), 'a', '#CBB89A', { x: 5, z: 5 }, 'tok');
  inst.step();
  assert.deepEqual({ x: rt.state.x, z: rt.state.z }, { x: 5, z: 5 });
});

test('Instance.step: token bucket — dt inflado SOSTENIDO queda a ~tiempo real (sin 2× de velocidad)', () => {
  const inst = new Instance('hub');
  // Zona despejada; el tramposo mete 0.1 s de dt por tick (2× tiempo real), el honesto 0.05 s.
  const cheater = inst.add(E(1), 'x', '#CBB89A', { x: 10, z: 10 }, 't1');
  const honest = inst.add(E(2), 'y', '#CBB89A', { x: -10, z: 10 }, 't2');
  for (let t = 1; t <= 100; t++) {
    cheater.inputs.push({ seq: t, f: 1, r: 0, yaw: 0, dt: 0.1 });
    honest.inputs.push({ seq: t, f: 1, r: 0, yaw: 0, dt: 0.05 });
    inst.step();
  }
  const cheatDist = 10 - cheater.state.z;
  const honestDist = 10 - honest.state.z;
  // Acotado a ~SIM_BANK_REFILL_RATE (1.05×) + el crédito inicial del cap (0.25 s ≈ 1.1 m).
  assert.ok(
    cheatDist <= honestDist * 1.1 + 1.2,
    `sostenido: tramposo ${cheatDist.toFixed(2)} m vs honesto ${honestDist.toFixed(2)} m (antes sostenía 2×)`,
  );
  assert.ok(cheater.inputs.length > 0, 'el excedente del tramposo espera en cola (no se ackea)');
  assert.ok(cheater.lastSeq < 100, 'no ackea lo que no procesó');
});

test('Instance.step: ráfaga honesta (hitch) — NADA se descarta y coincide con el replay del cliente', () => {
  const inst = new Instance('hub');
  const rt = inst.add(E(1), 'a', '#CBB89A', { x: 10, z: 10 }, 'tok');
  // Hitch/ráfaga TCP: 3 inputs de 0.1 s llegan en el MISMO tick (0.3 s > cap 0.25).
  rt.inputs.push({ seq: 1, f: 1, r: 0, yaw: 0.4, dt: 0.1 });
  rt.inputs.push({ seq: 2, f: 1, r: 0, yaw: 0.4, dt: 0.1 });
  rt.inputs.push({ seq: 3, f: 1, r: 1, yaw: 0.4, dt: 0.1 });
  inst.step(); // crédito 0.25: procesa 2, difiere 1
  assert.equal(rt.lastSeq, 2, 'ackea SOLO lo procesado');
  assert.equal(rt.inputs.length, 1, 'el excedente queda en cola');
  inst.step(); // refill: procesa el tercero
  assert.equal(rt.lastSeq, 3, 'el diferido se procesa al tick siguiente');
  assert.equal(rt.inputs.length, 0);
  // La posición final DEBE coincidir bit a bit con el replay puro de los 3 inputs (lo que el
  // cliente predijo): el bucket difiere, JAMÁS descarta (el descarte era el snap del QA M5).
  const ref = { x: 10, z: 10, vx: 0, vz: 0 };
  applyMovement(ref, { f: 1, r: 0, yaw: 0.4 }, 0.1, WORLD_OBSTACLES);
  applyMovement(ref, { f: 1, r: 0, yaw: 0.4 }, 0.1, WORLD_OBSTACLES);
  applyMovement(ref, { f: 1, r: 1, yaw: 0.4 }, 0.1, WORLD_OBSTACLES);
  assert.deepEqual(
    { x: rt.state.x, z: rt.state.z, vx: rt.state.vx, vz: rt.state.vz },
    ref,
    'autoridad == predicción (cero descarte)',
  );
});

test('Instance.step: la locomoción acumula velocidad entre ticks (peso)', () => {
  const inst = new Instance('hub');
  // Nace en zona despejada (fuera del anillo de árboles y lejos del monolito): la colisión no
  // contamina la medición de aceleración.
  const rt = inst.add(E(1), 'a', '#CBB89A', { x: 10, z: 10 }, 'tok');
  rt.inputs.push({ seq: 1, f: 1, r: 0, yaw: 0, dt: 0.05 });
  inst.step();
  const v1 = Math.hypot(rt.state.vx, rt.state.vz);
  const d1 = 10 - rt.state.z; // desplazamiento del tick 1 (avanza hacia -Z)
  const z1 = rt.state.z;
  rt.inputs.push({ seq: 2, f: 1, r: 0, yaw: 0, dt: 0.05 });
  inst.step();
  const v2 = Math.hypot(rt.state.vx, rt.state.vz);
  const d2 = z1 - rt.state.z; // desplazamiento del tick 2
  assert.ok(v1 > 0 && v2 > v1, `la velocidad crece entre ticks (${v1} → ${v2})`);
  assert.ok(d2 > d1, 'el segundo tick desplaza más que el primero (acelerando)');
});

test('Instance.step: no atraviesa el monolito (colisión autoritativa)', () => {
  const inst = new Instance('hub');
  // Nace al sur del monolito (0,0 radio 1.6) y camina de frente hacia el centro varios ticks.
  const rt = inst.add(E(1), 'a', '#CBB89A', { x: 0, z: 4 }, 'tok');
  for (let t = 0; t < 40; t++) {
    rt.inputs.push({ seq: t + 1, f: 1, r: 0, yaw: 0, dt: 0.05 });
    inst.step();
  }
  const d = Math.hypot(rt.state.x, rt.state.z);
  const clear = MONOLITH.radius + PLAYER_RADIUS;
  assert.ok(d >= clear - 1e-9, `el server lo detiene en el radio del monolito (d=${d} >= ${clear})`);
});

test('Instance AOI: el DELTA siempre incluye al propio + los visibles', () => {
  const inst = new Instance('hub');
  inst.add(E(1), 'a', '#CBB89A', { x: 0, z: 0 }, 't1');
  const b = inst.add(E(2), 'b', '#B8A07E', { x: 30, z: 0 }, 't2'); // 30 m < entra 40 → visible

  inst.updateVisibility();
  assert.deepEqual(
    inst
      .visibleDeltaFor(E(1))
      .map((e) => e.id)
      .sort(),
    [1, 2],
    'self + vecino cercano',
  );

  b.state.x = 50; // 50 m > sale 45 → fuera del AOI
  inst.updateVisibility();
  assert.deepEqual(
    inst.visibleDeltaFor(E(1)).map((e) => e.id),
    [1],
    'solo self',
  );
});

test('Instance AOI: histéresis (entra 40, sale 45)', () => {
  const inst = new Instance('hub');
  inst.add(E(1), 'a', '#CBB89A', { x: 0, z: 0 }, 't1');
  const b = inst.add(E(2), 'b', '#B8A07E', { x: 30, z: 0 }, 't2');

  const sees = () => inst.visibleDeltaFor(E(1)).some((e) => e.id === E(2));

  inst.updateVisibility();
  assert.ok(sees(), 'a 30 m: visible');

  b.state.x = 42; // entre 40 y 45: estaba visible → SIGUE visible
  inst.updateVisibility();
  assert.ok(sees(), 'a 42 m: histéresis lo mantiene visible');

  b.state.x = 46; // > 45 → sale
  inst.updateVisibility();
  assert.ok(!sees(), 'a 46 m: deja de verse');

  b.state.x = 42; // entre 40 y 45 pero estaba FUERA → no re-entra (necesita < 40)
  inst.updateVisibility();
  assert.ok(!sees(), 'a 42 m: histéresis NO lo re-incluye (re-entra solo < 40 m)');
});

test('Instance.remove: limpia los sets de AOI', () => {
  const inst = new Instance('hub');
  inst.add(E(1), 'a', '#CBB89A', { x: 0, z: 0 }, 't1');
  inst.add(E(2), 'b', '#B8A07E', { x: 5, z: 0 }, 't2');
  inst.updateVisibility();
  assert.ok(inst.visibleDeltaFor(E(1)).some((e) => e.id === E(2)));
  inst.remove(E(2));
  assert.deepEqual(
    inst.visibleDeltaFor(E(1)).map((e) => e.id),
    [1],
    'tras remove, 2 no aparece',
  );
});
