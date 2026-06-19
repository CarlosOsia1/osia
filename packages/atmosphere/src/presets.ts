/**
 * Presets celestiales de OSIA (S0.7). Anclados a momentos del ciclo (timeOfDay).
 * Cielos AZULES saturados con gradiente cenit→horizonte; niebla BAJA y tintada
 * (no blanca) para ver lejos cuando está despejado; el clima la sube aparte.
 * sunDir/moonDir son placeholders: resolveAtmosphere los calcula analíticamente.
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

/** Bosque Celeste: alma de marca, crepúsculo→noche celestial (ADR-000 #1). */
export const CELESTIAL_CYCLE: AtmosphereKeyframe[] = [
  {
    t: 0.0,
    name: 'starlit-night',
    params: p({
      skyTop: '#05060f', skyHorizon: '#0c111f', fog: '#0a0e18', fogDensity: 0.009,
      sunColor: '#cbb89a', sunIntensity: 0, moonColor: '#aeb6cc', moonIntensity: 0.5,
      ambientColor: '#141b2e', ambientIntensity: 0.28, exposure: 0.92, bloom: 0.8, stars: 1,
    }),
  },
  {
    t: 0.24,
    name: 'misty-dawn',
    params: p({
      skyTop: '#6f86b0', skyHorizon: '#d8c3a6', fog: '#cdbfae', fogDensity: 0.02,
      sunColor: '#e9c89a', sunIntensity: 1.5, moonColor: '#aeb6cc', moonIntensity: 0.06,
      ambientColor: '#b6a48e', ambientIntensity: 0.5, exposure: 1.0, bloom: 0.55, stars: 0.08,
    }),
  },
  {
    t: 0.5,
    name: 'day-champagne',
    params: p({
      skyTop: '#4f87c6', skyHorizon: '#c6c4b0', fog: '#cdc8b6', fogDensity: 0.006,
      sunColor: '#f3e3c4', sunIntensity: 2.6, moonColor: '#aeb6cc', moonIntensity: 0,
      ambientColor: '#c0bcab', ambientIntensity: 0.5, exposure: 1.02, bloom: 0.32, stars: 0,
    }),
  },
  {
    t: 0.74,
    name: 'twilight-champagne',
    params: p({
      skyTop: '#2a2948', skyHorizon: '#d99a5e', fog: '#6a543c', fogDensity: 0.012,
      sunColor: '#e8a85f', sunIntensity: 1.5, moonColor: '#aeb6cc', moonIntensity: 0.2,
      ambientColor: '#594c3b', ambientIntensity: 0.42, exposure: 1.0, bloom: 0.72, stars: 0.3,
    }),
  },
  {
    t: 0.86,
    name: 'dusk-onyx',
    params: p({
      skyTop: '#080a15', skyHorizon: '#1a1626', fog: '#13101c', fogDensity: 0.011,
      sunColor: '#cbb89a', sunIntensity: 0.15, moonColor: '#aeb6cc', moonIntensity: 0.45,
      ambientColor: '#171d30', ambientIntensity: 0.3, exposure: 0.95, bloom: 0.78, stars: 0.72,
    }),
  },
];
