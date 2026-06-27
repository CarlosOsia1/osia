/**
 * Estaciones (S2-B1) — determinismo, pico en el PUNTO MEDIO, continuidad en los cruces y que el
 * tinte del CIELO (la marca) nunca se salga del gamut house-celestial. Suelo/vegetación: libres.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { timeOfYearAt, CYCLE_SECONDS, CYCLES_PER_YEAR } from './clock';
import { resolveSeasonTints, applySeason, seasonAt, seasonPeak, SEASONS } from './seasons';
import { seasonWeatherBias } from './seasonWeather';
import { resolveAtmosphere } from './resolve';
import { BIOMES } from './biomes';
import { lintAtmosphereParams } from './housePalette';

test('timeOfYearAt es determinista y periódico (mismo punto del año → mismo valor)', () => {
  const yearMs = CYCLE_SECONDS * CYCLES_PER_YEAR * 1000;
  assert.equal(timeOfYearAt(0), 0);
  assert.equal(timeOfYearAt(yearMs), 0); // envuelve al cerrar el año
  assert.ok(Math.abs(timeOfYearAt(yearMs / 2) - 0.5) < 1e-9);
  assert.ok(Math.abs(timeOfYearAt(123_456_789) - timeOfYearAt(123_456_789 + yearMs)) < 1e-9);
});

test('cada estación alcanza su MÁXIMA expresión en su punto medio', () => {
  for (const id of ['primavera', 'verano', 'otono', 'invierno'] as const) {
    const peak = seasonPeak(id);
    const tints = resolveSeasonTints(peak);
    // En el punto medio, el tinte de cada superficie ≈ el de esa estación (lerpRGB pasa por
    // OKLab, así que k=0 no es bit-exacto: comparamos por canal con tolerancia chica).
    for (const surface of ['sky', 'ground', 'foliage'] as const) {
      const got = tints[surface];
      const want = SEASONS[id].tints[surface];
      for (let c = 0; c < 3; c++) {
        assert.ok(Math.abs(got[c]! - want[c]!) < 0.005, `${id}/${surface}[${c}] no es máximo en su medio`);
      }
    }
    assert.equal(seasonAt(peak).id, id);
  }
});

test('el tinte SIEMPRE cambia: entre puntos medios la transición es continua (sin salto)', () => {
  const eps = 1e-4;
  for (const id of ['primavera', 'verano', 'otono', 'invierno'] as const) {
    const t = seasonPeak(id);
    const before = resolveSeasonTints(((t - eps) % 1 + 1) % 1);
    const after = resolveSeasonTints(t + eps);
    for (let c = 0; c < 3; c++) {
      assert.ok(Math.abs(before.foliage[c]! - after.foliage[c]!) < 0.05, `foliage salta en ${id}`);
    }
  }
});

test('el tinte estacional del CIELO nunca saca un preset del gamut (bioma × año × keyframe)', () => {
  const samples = 16;
  for (const biome of BIOMES) {
    for (const kf of biome.cycle) {
      for (let i = 0; i < samples; i++) {
        const sky = resolveSeasonTints(i / samples).sky;
        const violations = lintAtmosphereParams(applySeason(kf.params, sky));
        assert.deepEqual(violations, [], `bioma ${biome.id} · ${kf.name} · año ${(i / samples).toFixed(2)}: ${violations.join('; ')}`);
      }
    }
  }
});

test('applySeason tiñe el cielo de forma sutil, no toca direcciones y es puro', () => {
  const base = resolveAtmosphere(0.74, BIOMES[0]!.cycle);
  const sky = resolveSeasonTints(seasonPeak('otono')).sky;
  const out = applySeason(base, sky);
  assert.notDeepEqual(out.skyHorizon, base.skyHorizon, 'debe teñir el horizonte');
  assert.notDeepEqual(out.skyHorizon, sky, 'no debe reemplazar por el tinte (es sutil)');
  assert.deepEqual(out.sunDir, base.sunDir, 'no toca las direcciones sol/luna');
  assert.notEqual(out, base, 'no muta el input (función pura)');
});

test('el sesgo de clima por estación favorece lo natural sin romper el bioma', () => {
  // Tundra: más nieve (peso) y más clima (frecuencia) en invierno que en verano.
  const win = seasonWeatherBias('tundra-nevada', 'invierno');
  const sum = seasonWeatherBias('tundra-nevada', 'verano');
  assert.ok((win.weights.nieve ?? 1) > (sum.weights.nieve ?? 1), 'más nieve en invierno');
  assert.ok(win.eventChance > sum.eventChance, 'más clima en invierno');
  // Bosque: más lluvia en primavera que en verano (verano seco).
  const spring = seasonWeatherBias('bosque-celeste', 'primavera');
  assert.ok((spring.weights.lluvia ?? 1) > 1 && spring.eventChance > seasonWeatherBias('bosque-celeste', 'verano').eventChance);
  // Dunas: tormentas sobre todo en verano (solo cambia frecuencia; su único clima es arena).
  assert.ok(seasonWeatherBias('dunas-doradas', 'verano').eventChance > seasonWeatherBias('dunas-doradas', 'invierno').eventChance);
});

test('seasonAt devuelve la estación dominante en cada cuarto del año', () => {
  assert.equal(seasonAt(0.05).id, 'primavera');
  assert.equal(seasonAt(0.3).id, 'verano');
  assert.equal(seasonAt(0.55).id, 'otono');
  assert.equal(seasonAt(0.8).id, 'invierno');
});
