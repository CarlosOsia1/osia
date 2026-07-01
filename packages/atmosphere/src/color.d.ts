/**
 * Color en espacio OKLab para interpolaciones bellas (no sRGB): un crossfade
 * champán→ónix pasa por tonos vivos, no por un gris muerto. (decisión S0.7)
 */
import type { RGB } from './types';
/** Interpola dos colores sRGB (0..1) pasando por OKLab. */
export declare function lerpRGB(c1: RGB, c2: RGB, k: number): RGB;
/** sRGB (0..1) → OKLab [L, a, b]. Base perceptual de las reglas de gamut (housePalette). */
export declare function rgbToOklab(c: RGB): [number, number, number];
/** OKLab [L, a, b] → sRGB (0..1), clampado al cubo. Inverso de rgbToOklab. */
export declare function oklabToRGB(L: number, a: number, b: number): RGB;
/** sRGB (0..1) → '#rrggbb'. Para escribir colores resueltos del motor como variables CSS. */
export declare function rgbToHex(c: RGB): string;
/** '#rrggbb' → [r,g,b] en sRGB 0..1. */
export declare function hexToRGB(hex: string): RGB;
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
export declare function varyFoliage(base: RGB, dL: number, dC: number, dHdeg: number): RGB;
//# sourceMappingURL=color.d.ts.map