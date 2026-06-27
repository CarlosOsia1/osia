/**
 * Mapeo cielo→HUD (S2-A1) — el tinte respira con el cielo pero conserva legibilidad (WCAG AA),
 * el glow baja de noche y el contraste sube con la niebla. Determinista y dentro del gamut.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveHudAtmo } from './hud';
import { resolveAtmosphere } from './resolve';
import { applyWeather } from './weather';
import { rgbToOklab, hexToRGB } from './color';
import { checkHouseCelestial } from './housePalette';
import { BIOMES } from './biomes';

const ACCENT_L = rgbToOklab(hexToRGB('#cbb89a'))[0]; // luminancia del champán de marca

test('el tinte conserva la luminancia del acento (legibilidad/AA estable) y queda en gamut', () => {
  for (const biome of BIOMES) {
    for (const kf of biome.cycle) {
      const v = resolveHudAtmo(kf.params);
      const tintLab = rgbToOklab(hexToRGB(v.tint));
      // luminancia ≈ champán → el contraste contra el ónix no cae con el cielo (AA intacto)
      assert.ok(
        Math.abs(tintLab[0] - ACCENT_L) < 0.05,
        `bioma ${biome.id} · ${kf.name}: L del tinte ${tintLab[0].toFixed(3)} lejos del acento ${ACCENT_L.toFixed(3)}`,
      );
      // el tinte siempre dentro del gamut house-celestial
      assert.equal(checkHouseCelestial(hexToRGB(v.tint)), null, `tinte fuera de gamut en ${biome.id}/${kf.name}`);
    }
  }
});

test('el glow baja de noche y sube de día', () => {
  const cycle = BIOMES[0]!.cycle;
  const day = resolveHudAtmo(resolveAtmosphere(0.4, cycle)); // mediodía (stars≈0)
  const night = resolveHudAtmo(resolveAtmosphere(0.0, cycle)); // medianoche (stars≈1)
  const alpha = (rgba: string): number => Number(rgba.slice(rgba.lastIndexOf(',') + 1, -1));
  assert.ok(alpha(day.glow) > alpha(night.glow), `glow de día (${alpha(day.glow)}) debe superar al de noche (${alpha(night.glow)})`);
});

test('el contraste (opacidad de panel) sube con la niebla y nunca baja de 1', () => {
  const cycle = BIOMES[0]!.cycle;
  const base = resolveAtmosphere(0.4, cycle);
  const clear = resolveHudAtmo(applyWeather(base, { kind: 'despejado', intensity: 0 }));
  const foggy = resolveHudAtmo(applyWeather(base, { kind: 'niebla', intensity: 1 }));
  assert.ok(clear.contrast >= 1, `contraste base ${clear.contrast} < 1`);
  assert.ok(foggy.contrast > clear.contrast, `niebla (${foggy.contrast}) debe superar a despejado (${clear.contrast})`);
});

test('es determinista (mismos params → mismas vars)', () => {
  const p = resolveAtmosphere(0.74, BIOMES[0]!.cycle);
  assert.deepEqual(resolveHudAtmo(p), resolveHudAtmo(p));
});
