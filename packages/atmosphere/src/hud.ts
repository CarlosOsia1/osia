/**
 * Mapeo del cielo vigente a las variables del HUD (S2-A1) — "el HUD respira el cielo". Puro y
 * testeable; el world-client solo escribe el resultado en :root (--atmo-*) por DOM, con throttle.
 *
 * Clave de accesibilidad: el TINTE conserva la LUMINANCIA del acento champán y solo nubla su TONO
 * hacia el cielo → el acento respira sin perder legibilidad (WCAG AA intacto en día/noche/lluvia/
 * niebla). El GLOW baja de noche; el CONTRASTE (opacidad del panel) sube con la niebla.
 */

import { rgbToOklab, oklabToRGB, rgbToHex, hexToRGB } from './color';
import { clampToHouseCelestial } from './housePalette';
import { clamp01, lerp } from './math';
import type { AtmosphereParams, RGB } from './types';

const ACCENT: RGB = hexToRGB('#cbb89a'); // --osia-champagne-500 (acento de marca)
const ACCENT_LAB = rgbToOklab(ACCENT);
/** Cuánto se nubla el TONO del acento hacia el del cielo (la luminancia NO se toca). */
const HUE_BLEND = 0.45;

export type HudAtmoVars = {
  /** Acento que respira con el cielo, con la luminancia del champán. '#rrggbb'. */
  tint: string;
  /** Resplandor tintado para las sombras del HUD; su alfa baja de noche. 'rgba(r,g,b,a)'. */
  glow: string;
  /** Multiplicador de opacidad del panel (1 = base); sube con la niebla para "solidificar". */
  contrast: number;
};

const ch255 = (v: number): number => Math.round(clamp01(v) * 255);

/** Resuelve las variables --atmo-* del HUD a partir de los params de atmósfera del frame. */
export function resolveHudAtmo(p: AtmosphereParams): HudAtmoVars {
  const sky = rgbToOklab(p.skyHorizon);
  // Tono del cielo + luminancia del champán → acento que respira sin perder legibilidad.
  const tintRGB = clampToHouseCelestial(
    oklabToRGB(ACCENT_LAB[0], lerp(ACCENT_LAB[1], sky[1], HUE_BLEND), lerp(ACCENT_LAB[2], sky[2], HUE_BLEND)),
  );
  const day = 1 - clamp01(p.starsIntensity); // 1 día → 0 noche
  const glowAlpha = 0.15 + 0.25 * day; // de noche el resplandor baja
  const fogBoost = clamp01((p.fogDensity - 0.02) * 2); // niebla densa → panel más sólido
  return {
    tint: rgbToHex(tintRGB),
    glow: `rgba(${ch255(tintRGB[0])}, ${ch255(tintRGB[1])}, ${ch255(tintRGB[2])}, ${glowAlpha.toFixed(3)})`,
    contrast: Number((1 + 0.16 * fogBoost).toFixed(3)),
  };
}
