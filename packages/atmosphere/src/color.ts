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

/** OKLab [L, a, b] → sRGB (0..1), clampado al cubo. Inverso de rgbToOklab. */
export function oklabToRGB(L: number, a: number, b: number): RGB {
  const lin = oklabToLinear(L, a, b);
  return [clamp01(linearToSrgb(lin[0])), clamp01(linearToSrgb(lin[1])), clamp01(linearToSrgb(lin[2]))];
}

/** sRGB (0..1) → '#rrggbb'. Para escribir colores resueltos del motor como variables CSS. */
export function rgbToHex(c: RGB): string {
  const h = (v: number): string =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
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

const DEG_TO_RAD = Math.PI / 180;

/**
 * Variación PERCEPTUAL de un color de follaje, por árbol (naturalidad del bosque). Aclarar/oscurecer
 * a secas se ve como "el mismo árbol con otro brillo"; aquí movemos el color en OKLCH para que la
 * variación sea de COLOR real, no solo de luz: unos pinos más amarillentos, otros verde profundo,
 * otros apagados/oliva — sin salirse a rojo/azul (el giro de matiz es pequeño). Funciona sobre el
 * color de follaje de CUALQUIER estación (verde en verano, ocre en otoño…): el offset es el mismo,
 * el resultado siempre "en familia". Pura y determinista (el offset por árbol viene sembrado en el
 * layout) → dos jugadores ven el mismo árbol con el mismo color.
 *
 *  dL     desplazamiento de luminosidad (unidades OKLab L; + aclara, − oscurece)
 *  dC     factor de croma/saturación (1 = igual; <1 apaga hacia oliva, >1 aviva)
 *  dHdeg  giro de matiz en GRADOS (pequeño; + hacia verde-azulado, − hacia amarillo-verde)
 */
export function varyFoliage(base: RGB, dL: number, dC: number, dHdeg: number): RGB {
  const [L, a, b] = rgbToOklab(base);
  const chroma = Math.hypot(a, b) * dC;
  const hue = Math.atan2(b, a) + dHdeg * DEG_TO_RAD;
  return oklabToRGB(L + dL, Math.cos(hue) * chroma, Math.sin(hue) * chroma);
}
