/**
 * Linter de paleta de weatherConfig (S2-A3) — cierra la brecha del linter de presets: el de
 * @osia/atmosphere valida los keyframes de los biomas, pero NO los colores de partículas/niebla
 * de weatherConfig (que viven en el world-client). Aquí se validan contra el gamut house-celestial,
 * en CI, para que afinar el clima no saque un color de la marca.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { checkHouseCelestial, hexToRGB } from '@osia/atmosphere';
import { SNOW, RAIN, SAND, FOG } from './weatherConfig';

const COLORS: Record<string, string> = {
  'SNOW.color': SNOW.color,
  'RAIN.colorDay': RAIN.colorDay,
  'RAIN.colorNight': RAIN.colorNight,
  'SAND.colorDay': SAND.colorDay,
  'SAND.colorNight': SAND.colorNight,
  'FOG.rain.color': FOG.rain.color,
  'FOG.snow.color': FOG.snow.color,
};

test('los colores de weatherConfig respetan el gamut house-celestial', () => {
  for (const [name, hex] of Object.entries(COLORS)) {
    const reason = checkHouseCelestial(hexToRGB(hex));
    assert.equal(reason, null, `${name} (${hex}) fuera de gamut: ${reason}`);
  }
});
