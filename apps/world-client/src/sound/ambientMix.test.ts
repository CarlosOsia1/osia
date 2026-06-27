/**
 * Mezcla de ambiente (S2-A2) — lógica pura, testeable sin WebAudio.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ambientMix, AMBIENT_LAYERS } from './ambientMix';
import { WEATHER_KINDS } from '@osia/atmosphere';

test('todas las ganancias quedan en [0,1]', () => {
  for (const night of [0, 0.5, 1])
    for (const kind of WEATHER_KINDS) {
      const mix = ambientMix('bosque-celeste', kind, 1, night);
      for (const l of AMBIENT_LAYERS) assert.ok(mix[l] >= 0 && mix[l] <= 1, `${l}=${mix[l]}`);
    }
});

test('de día cantan los pájaros; de noche, los grillos; el viento baja un poco de noche', () => {
  const day = ambientMix('bosque-celeste', 'despejado', 0, 0);
  const night = ambientMix('bosque-celeste', 'despejado', 0, 1);
  assert.ok(day.birds > night.birds, 'pájaros de día');
  assert.ok(night.crickets > day.crickets, 'grillos de noche');
  assert.ok(day.wind > night.wind, 'viento un poco más de día');
});

test('la vivacidad de la estación escala los pájaros (invierno < primavera)', () => {
  const spring = ambientMix('bosque-celeste', 'despejado', 0, 0, 1);
  const winter = ambientMix('bosque-celeste', 'despejado', 0, 0, 0.4);
  assert.ok(winter.birds < spring.birds, 'menos pájaros en invierno');
});

test('un clima activo acalla pájaros y grillos', () => {
  const calm = ambientMix('bosque-celeste', 'despejado', 0, 0);
  const stormy = ambientMix('bosque-celeste', 'niebla', 1, 0);
  assert.ok(stormy.birds < calm.birds, 'el clima tapa los pájaros');
});

test('la lluvia activa su capa proporcional a la intensidad y aparta el viento', () => {
  const clear = ambientMix('bosque-celeste', 'despejado', 0, 0.5);
  const lite = ambientMix('bosque-celeste', 'lluvia', 0.3, 0.5);
  const heavy = ambientMix('bosque-celeste', 'lluvia', 1, 0.5);
  assert.equal(clear.rain, 0);
  assert.ok(heavy.rain > lite.rain && lite.rain > 0, 'la lluvia escala con la intensidad');
  assert.ok(heavy.wind < clear.wind, 'el viento se aparta en lluvia');
});

test('el bosque tiene más grillos que las dunas a la misma hora', () => {
  const bosque = ambientMix('bosque-celeste', 'despejado', 0, 1);
  const dunas = ambientMix('dunas-doradas', 'despejado', 0, 1);
  assert.ok(bosque.crickets > dunas.crickets);
});

test('solo la capa del clima vigente suena (las demás en 0)', () => {
  const snow = ambientMix('tundra-nevada', 'nieve', 1, 0.5);
  assert.ok(snow.snow > 0);
  assert.equal(snow.rain, 0);
  assert.equal(snow.sand, 0);
});
