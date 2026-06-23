/**
 * Color en espacio OKLab para interpolaciones bellas (no sRGB): un crossfade
 * champán→ónix pasa por tonos vivos, no por un gris muerto. (decisión S0.7)
 */

import { clamp01, lerp } from './math';
import type { RGB } from './types';

const srgbToLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const linearToSrgb = (c: number): number =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

function linearToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinear(L: number, a: number, bb: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * bb;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bb;
  const s_ = L - 0.0894841775 * a - 1.291485548 * bb;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** Interpola dos colores sRGB (0..1) pasando por OKLab. */
export function lerpRGB(c1: RGB, c2: RGB, k: number): RGB {
  const a = linearToOklab(srgbToLinear(c1[0]), srgbToLinear(c1[1]), srgbToLinear(c1[2]));
  const b = linearToOklab(srgbToLinear(c2[0]), srgbToLinear(c2[1]), srgbToLinear(c2[2]));
  const lin = oklabToLinear(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k));
  return [clamp01(linearToSrgb(lin[0])), clamp01(linearToSrgb(lin[1])), clamp01(linearToSrgb(lin[2]))];
}

/** sRGB (0..1) → OKLab [L, a, b]. Base perceptual de las reglas de gamut (housePalette). */
export function rgbToOklab(c: RGB): [number, number, number] {
  return linearToOklab(srgbToLinear(c[0]), srgbToLinear(c[1]), srgbToLinear(c[2]));
}

/** '#rrggbb' → [r,g,b] en sRGB 0..1. */
export function hexToRGB(hex: string): RGB {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}
