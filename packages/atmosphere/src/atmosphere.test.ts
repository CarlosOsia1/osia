/** Tests puros del motor de atmósfera (S0.7-H1 DoD). Corre con tsx (node:test). */

import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAtmosphere, sunDirFor } from './resolve';
import { CELESTIAL_CYCLE } from './presets';
import { timeOfDayAt } from './clock';
import { lerpRGB } from './color';

test('resolveAtmosphere es determinista', () => {
  const a = resolveAtmosphere(0.42, CELESTIAL_CYCLE);
  const b = resolveAtmosphere(0.42, CELESTIAL_CYCLE);
  assert.deepEqual(a, b);
});

test('resolveAtmosphere envuelve cíclicamente (t y t+1 dan lo mismo)', () => {
  const a = resolveAtmosphere(0.1, CELESTIAL_CYCLE);
  const b = resolveAtmosphere(1.1, CELESTIAL_CYCLE);
  assert.deepEqual(a, b);
});

test('el sol está arriba al mediodía y abajo a medianoche', () => {
  assert.ok(sunDirFor(0.5)[1] > 0.8, 'mediodía: sol alto');
  assert.ok(sunDirFor(0.0)[1] < -0.5, 'medianoche: sol bajo el horizonte');
});

test('estrellas: invisibles de día, plenas de noche', () => {
  assert.ok(resolveAtmosphere(0.5, CELESTIAL_CYCLE).starsIntensity < 0.05, 'día');
  assert.ok(resolveAtmosphere(0.0, CELESTIAL_CYCLE).starsIntensity > 0.9, 'noche');
});

test('sol: sin intensidad de noche, intenso de día', () => {
  assert.equal(resolveAtmosphere(0.0, CELESTIAL_CYCLE).sunIntensity, 0);
  assert.ok(resolveAtmosphere(0.5, CELESTIAL_CYCLE).sunIntensity > 2);
});

test('lerpRGB en OKLab: el punto medio queda dentro del rango', () => {
  const mid = lerpRGB([0, 0, 0], [1, 1, 1], 0.5);
  for (const c of mid) assert.ok(c > 0 && c < 1);
});

test('timeOfDayAt está en [0,1) y avanza con el tiempo', () => {
  const t0 = timeOfDayAt(0, 240);
  const t1 = timeOfDayAt(60_000, 240); // +60 s de un ciclo de 240 s = +0.25
  assert.ok(t0 >= 0 && t0 < 1);
  assert.ok(Math.abs(t1 - 0.25) < 1e-9);
});
