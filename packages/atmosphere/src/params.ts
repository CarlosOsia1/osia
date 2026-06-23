/**
 * Builder único de AtmosphereParams desde colores hex + escalares. Fuente compartida
 * por presets.ts y biomes.ts (antes duplicado byte-por-byte como p()/mk(), §1.2 DRY).
 * Agregar un campo a AtmosphereParams se hace en UN solo lugar.
 */

import { hexToRGB } from './color';
import type { AtmosphereParams } from './types';

/** Dirección placeholder; resolveAtmosphere compone las direcciones reales por hora (sunDirFor). */
export const UP = [0, 1, 0] as const;

export function makeParams(o: {
  skyTop: string;
  skyHorizon: string;
  fog: string;
  fogDensity: number;
  sunColor: string;
  sunIntensity: number;
  moonColor: string;
  moonIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  exposure: number;
  bloom: number;
  stars: number;
}): AtmosphereParams {
  return {
    skyTop: hexToRGB(o.skyTop),
    skyHorizon: hexToRGB(o.skyHorizon),
    fogColor: hexToRGB(o.fog),
    fogDensity: o.fogDensity,
    sunDir: UP,
    sunColor: hexToRGB(o.sunColor),
    sunIntensity: o.sunIntensity,
    moonDir: UP,
    moonColor: hexToRGB(o.moonColor),
    moonIntensity: o.moonIntensity,
    ambientColor: hexToRGB(o.ambientColor),
    ambientIntensity: o.ambientIntensity,
    exposure: o.exposure,
    bloom: o.bloom,
    starsIntensity: o.stars,
  };
}
