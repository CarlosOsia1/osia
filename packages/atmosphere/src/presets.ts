/**
 * Presets celestiales de OSIA (S0.7-H2). Anclados a momentos del ciclo (timeOfDay).
 * Paleta house-celestial: champán/ónix/marfil/taupe + azules fríos para cielo/noche.
 * sunDir/moonDir aquí son placeholders: resolveAtmosphere los calcula analíticamente.
 */

import { hexToRGB } from './color';
import type { AtmosphereKeyframe, AtmosphereParams } from './types';

const UP = [0, 1, 0] as const;

function p(o: {
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

/** Ciclo por defecto: blend crepúsculo→noche celestial (ADR-000 #1). */
export const CELESTIAL_CYCLE: AtmosphereKeyframe[] = [
  {
    t: 0.0,
    name: 'starlit-night',
    params: p({
      skyTop: '#05060d', skyHorizon: '#0b0f1a', fog: '#0d1018', fogDensity: 0.03,
      sunColor: '#cbb89a', sunIntensity: 0, moonColor: '#aeb6cc', moonIntensity: 0.55,
      ambientColor: '#161d2e', ambientIntensity: 0.28, exposure: 0.86, bloom: 0.8, stars: 1,
    }),
  },
  {
    t: 0.24,
    name: 'misty-dawn',
    params: p({
      skyTop: '#aeb6cc', skyHorizon: '#dcc9b3', fog: '#e7ded0', fogDensity: 0.05,
      sunColor: '#e9c89a', sunIntensity: 1.4, moonColor: '#aeb6cc', moonIntensity: 0.08,
      ambientColor: '#c9beac', ambientIntensity: 0.5, exposure: 1.0, bloom: 0.5, stars: 0.08,
    }),
  },
  {
    t: 0.5,
    name: 'day-champagne',
    params: p({
      skyTop: '#9fb1c6', skyHorizon: '#cdbfa6', fog: '#d8d0c0', fogDensity: 0.018,
      sunColor: '#f3e3c4', sunIntensity: 2.7, moonColor: '#aeb6cc', moonIntensity: 0,
      ambientColor: '#c8c2b4', ambientIntensity: 0.55, exposure: 1.15, bloom: 0.35, stars: 0,
    }),
  },
  {
    t: 0.74,
    name: 'twilight-champagne',
    params: p({
      skyTop: '#3a3450', skyHorizon: '#c9a877', fog: '#6e5a44', fogDensity: 0.03,
      sunColor: '#e8b87a', sunIntensity: 1.6, moonColor: '#aeb6cc', moonIntensity: 0.2,
      ambientColor: '#6b5d49', ambientIntensity: 0.42, exposure: 1.1, bloom: 0.7, stars: 0.28,
    }),
  },
  {
    t: 0.86,
    name: 'dusk-onyx',
    params: p({
      skyTop: '#0f1120', skyHorizon: '#1a1726', fog: '#15131f', fogDensity: 0.034,
      sunColor: '#cbb89a', sunIntensity: 0.2, moonColor: '#aeb6cc', moonIntensity: 0.42,
      ambientColor: '#1c2238', ambientIntensity: 0.3, exposure: 0.96, bloom: 0.78, stars: 0.7,
    }),
  },
];
