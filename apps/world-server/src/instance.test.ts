import test from 'node:test';
import assert from 'node:assert/strict';
import { asEntityId as E } from '@osia/shared';
import { Instance } from './instance';

test('Instance.step: drena inputs y aplica el movimiento autoritativo', () => {
  const inst = new Instance('hub');
  const rt = inst.add(E(1), 'a', '#CBB89A', { x: 0, z: 0 }, 'tok');
  rt.inputs.push({ seq: 1, f: 1, r: 0, yaw: 0, dt: 0.05 }); // adelante
  inst.step();
  assert.ok(rt.state.z < 0, 'con f=1, yaw=0 avanza hacia -Z');
  assert.equal(rt.lastSeq, 1, 'lastSeq = último seq drenado (ackSeq)');
  assert.equal(rt.inputs.length, 0, 'la cola de inputs queda vacía');
});

test('Instance.step: sin inputs no mueve la entidad', () => {
  const inst = new Instance('hub');
  const rt = inst.add(E(1), 'a', '#CBB89A', { x: 5, z: 5 }, 'tok');
  inst.step();
  assert.deepEqual({ x: rt.state.x, z: rt.state.z }, { x: 5, z: 5 });
});

test('Instance.step: presupuesto de dt acota el speed-hack (flood de inputs con dt inflado)', () => {
  // Un tramposo encola muchos inputs con el dt máximo (0.1 s c/u): sin presupuesto avanzaría
  // ~MOVE_SPEED × 4 s en un solo tick. Con el techo (~0.1 s de tiempo simulado) el avance queda
  // acotado a ~1 paso, y aun así ackea el último seq (no traba la reconciliación).
  const inst = new Instance('hub');
  const cheater = inst.add(E(1), 'x', '#CBB89A', { x: 0, z: 0 }, 't1');
  for (let i = 1; i <= 40; i++) cheater.inputs.push({ seq: i, f: 1, r: 0, yaw: 0, dt: 0.1 });
  inst.step();
  const cheatDist = Math.abs(cheater.state.z);

  // Cliente honesto: un input de un tick real (~0.05 s).
  const honest = inst.add(E(2), 'y', '#CBB89A', { x: 0, z: 0 }, 't2');
  honest.inputs.push({ seq: 1, f: 1, r: 0, yaw: 0, dt: 0.05 });
  inst.step();
  const honestStep = Math.abs(honest.state.z);

  assert.ok(cheatDist <= honestStep * 2.5, `avance del tramposo (${cheatDist}) acotado al presupuesto`);
  assert.equal(cheater.lastSeq, 40, 'ackea el último seq aunque no aplique el excedente');
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
