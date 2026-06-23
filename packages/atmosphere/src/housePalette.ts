/**
 * Paleta de la casa "house-celestial" (S0.7-H2, docs/06 §8) — el LINTER de presets que
 * protege la identidad de marca. Un motor combinatorio puede producir cualquier color;
 * sin esta compuerta, tarde o temprano sale un cielo verde fosforescente que rompe la marca.
 *
 * Gamut: cielos ónix ↔ índigo ↔ champán-dusk; luz champán; niebla marfil tintada.
 * PROHIBIDO (docs/06:500): verdes neón/ácidos, magentas calientes, y clipping a negro/
 * blanco puro. Reglas en OKLCH (perceptual): chroma alto + banda de tono prohibida = fuera.
 * Los azules/índigos profundos SÍ entran (chroma alto pero tono azul, no verde/magenta).
 */

import { rgbToOklab } from './color';
import type { AtmosphereParams, RGB } from './types';

/** Chroma OKLab por encima del cual un tono prohibido se considera "neón"/fuera de gamut. */
const CHROMA_NEON = 0.16;
/** Banda de tono (grados OKLab) de verdes ácidos / cian-verdosos. El azul (~250-265°) queda fuera. */
const GREEN_HUE: readonly [number, number] = [110, 205];
/** Banda de tono de magentas calientes / fucsias. */
const MAGENTA_HUE: readonly [number, number] = [300, 350];
/** Luminancia OKLab mínima/máxima: por debajo/encima se considera clipping a negro/blanco puro. */
const CLIP_BLACK_L = 0.02;
const CLIP_WHITE_L = 0.985;

/** Campos de color de AtmosphereParams sujetos al gamut (no las direcciones sol/luna). */
const COLOR_FIELDS = [
  'skyTop',
  'skyHorizon',
  'fogColor',
  'sunColor',
  'moonColor',
  'ambientColor',
] as const satisfies readonly (keyof AtmosphereParams)[];

function hueDeg(a: number, b: number): number {
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
}

const inBand = (h: number, [lo, hi]: readonly [number, number]): boolean => h >= lo && h <= hi;

/**
 * Valida un color contra el gamut house-celestial. Devuelve la razón del rechazo, o `null`
 * si el color es admisible.
 */
export function checkHouseCelestial(c: RGB): string | null {
  const [L, a, b] = rgbToOklab(c);
  const chroma = Math.hypot(a, b);
  const h = hueDeg(a, b);
  if (L <= CLIP_BLACK_L) return `clipping a negro puro (L=${L.toFixed(3)})`;
  if (L >= CLIP_WHITE_L) return `clipping a blanco puro (L=${L.toFixed(3)})`;
  if (chroma >= CHROMA_NEON && inBand(h, GREEN_HUE))
    return `verde ácido/neón fuera de gamut (C=${chroma.toFixed(3)}, h=${h.toFixed(0)}°)`;
  if (chroma >= CHROMA_NEON && inBand(h, MAGENTA_HUE))
    return `magenta caliente fuera de gamut (C=${chroma.toFixed(3)}, h=${h.toFixed(0)}°)`;
  return null;
}

/** Lint de un preset completo: lista de violaciones (vacía = preset dentro del gamut). */
export function lintAtmosphereParams(p: AtmosphereParams): string[] {
  const out: string[] = [];
  for (const field of COLOR_FIELDS) {
    const reason = checkHouseCelestial(p[field]);
    if (reason) out.push(`${field}: ${reason}`);
  }
  return out;
}
