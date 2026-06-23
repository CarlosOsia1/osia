/**
 * Linter de presets house-celestial (S0.7-H2, CLAUDE.md §6) — corre en CI.
 * Protege la identidad de marca: ningún preset puede salirse del gamut de la casa.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { BIOMES } from './biomes';
import { checkHouseCelestial, lintAtmosphereParams } from './housePalette';
import { hexToRGB } from './color';

test('todos los presets (ciclos de cada bioma) respetan el gamut house-celestial', () => {
  for (const biome of BIOMES) {
    for (const kf of biome.cycle) {
      const violations = lintAtmosphereParams(kf.params);
      assert.deepEqual(
        violations,
        [],
        `bioma "${biome.id}" · keyframe "${kf.name}" (t=${kf.t}) viola el gamut: ${violations.join('; ')}`,
      );
    }
  }
});

test('el gamut RECHAZA colores prohibidos (neón / magenta / clipping)', () => {
  assert.ok(checkHouseCelestial(hexToRGB('#00ff00')), 'verde neón debe rechazarse');
  assert.ok(checkHouseCelestial(hexToRGB('#39ff14')), 'verde ácido debe rechazarse');
  assert.ok(checkHouseCelestial(hexToRGB('#ff00ff')), 'magenta caliente debe rechazarse');
  assert.ok(checkHouseCelestial(hexToRGB('#000000')), 'negro puro (clipping) debe rechazarse');
  assert.ok(checkHouseCelestial(hexToRGB('#ffffff')), 'blanco puro (clipping) debe rechazarse');
});

test('el gamut ACEPTA la paleta de marca (champán / ónix / índigo)', () => {
  assert.equal(checkHouseCelestial(hexToRGB('#cbb89a')), null, 'champán');
  assert.equal(checkHouseCelestial(hexToRGB('#0d0d0d')), null, 'ónix');
  assert.equal(checkHouseCelestial(hexToRGB('#0056c0')), null, 'índigo / azul profundo');
});
