/**
 * Presets celestiales de OSIA (S0.7). Anclados a la HORA del día (timeOfDay = hora/24)
 * según el cronograma de Carlos:
 *   05:30 amanecer inicial · 06:15 salida del sol (cálida) · 07:15 mañana temprana ·
 *   08:00–15:00 día fuerte (hold) · 16:30 pre-atardecer · 17:45 atardecer fuerte ·
 *   18:15 crepúsculo · 19:15 anochecer · 20:00–05:30 noche total.
 * Cielos AZULES con gradiente cenit→horizonte; niebla BAJA y tintada.
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

const MOON = '#aeb6cc';

/** Bosque Celeste: alma de marca, champán sobre ónix. */
export const CELESTIAL_CYCLE: AtmosphereKeyframe[] = [
  { t: 0.0, name: 'noche', params: p({ skyTop: '#05060f', skyHorizon: '#0c111f', fog: '#0a0e18', fogDensity: 0.01, sunColor: '#cbb89a', sunIntensity: 0, moonColor: MOON, moonIntensity: 0.5, ambientColor: '#141b2e', ambientIntensity: 0.28, exposure: 0.92, bloom: 0.8, stars: 1 }) },
  { t: 0.229, name: 'amanecer-inicial', params: p({ skyTop: '#0a0e1e', skyHorizon: '#251f30', fog: '#14111c', fogDensity: 0.012, sunColor: '#d8b088', sunIntensity: 0, moonColor: MOON, moonIntensity: 0.4, ambientColor: '#1a1d2e', ambientIntensity: 0.3, exposure: 0.9, bloom: 0.78, stars: 0.82 }) },
  { t: 0.26, name: 'salida-del-sol', params: p({ skyTop: '#4a4f7e', skyHorizon: '#e0a070', fog: '#8a6a54', fogDensity: 0.016, sunColor: '#f2b070', sunIntensity: 1.2, moonColor: MOON, moonIntensity: 0.1, ambientColor: '#6a5a4c', ambientIntensity: 0.42, exposure: 0.98, bloom: 0.62, stars: 0.2 }) },
  { t: 0.302, name: 'manana-temprana', params: p({ skyTop: '#2976d4', skyHorizon: '#c7a87d', fog: '#cdbfae', fogDensity: 0.014, sunColor: '#ecc89a', sunIntensity: 1.9, moonColor: MOON, moonIntensity: 0.03, ambientColor: '#b6a48e', ambientIntensity: 0.5, exposure: 1.0, bloom: 0.5, stars: 0.04 }) },
  { t: 0.333, name: 'dia', params: p({ skyTop: '#0056c0', skyHorizon: '#58a4e7', fog: '#aed2ef', fogDensity: 0.006, sunColor: '#f3e3c4', sunIntensity: 2.6, moonColor: MOON, moonIntensity: 0, ambientColor: '#abbfc0', ambientIntensity: 0.5, exposure: 1.02, bloom: 0.32, stars: 0 }) },
  { t: 0.625, name: 'dia-tardio', params: p({ skyTop: '#357fd8', skyHorizon: '#9bc7ed', fog: '#aed2ef', fogDensity: 0.006, sunColor: '#f3e3c4', sunIntensity: 2.6, moonColor: MOON, moonIntensity: 0, ambientColor: '#c0bcab', ambientIntensity: 0.5, exposure: 1.02, bloom: 0.32, stars: 0 }) },
  { t: 0.688, name: 'pre-atardecer', params: p({ skyTop: '#357fc4', skyHorizon: '#d8b488', fog: '#b89878', fogDensity: 0.009, sunColor: '#f0cf94', sunIntensity: 2.2, moonColor: MOON, moonIntensity: 0, ambientColor: '#a89070', ambientIntensity: 0.48, exposure: 1.02, bloom: 0.45, stars: 0 }) },
  { t: 0.74, name: 'atardecer-fuerte', params: p({ skyTop: '#2a2948', skyHorizon: '#d99a5e', fog: '#6a543c', fogDensity: 0.012, sunColor: '#e8a85f', sunIntensity: 1.6, moonColor: MOON, moonIntensity: 0.15, ambientColor: '#594c3b', ambientIntensity: 0.42, exposure: 1.0, bloom: 0.72, stars: 0.15 }) },
  { t: 0.76, name: 'crepusculo', params: p({ skyTop: '#1a1830', skyHorizon: '#93624a', fog: '#463327', fogDensity: 0.012, sunColor: '#c8804e', sunIntensity: 0.7, moonColor: MOON, moonIntensity: 0.3, ambientColor: '#3a2f26', ambientIntensity: 0.36, exposure: 0.98, bloom: 0.75, stars: 0.42 }) },
  { t: 0.802, name: 'anochecer', params: p({ skyTop: '#0a0c18', skyHorizon: '#2a2030', fog: '#1a1420', fogDensity: 0.011, sunColor: '#b08060', sunIntensity: 0.1, moonColor: MOON, moonIntensity: 0.45, ambientColor: '#1a1828', ambientIntensity: 0.32, exposure: 0.95, bloom: 0.78, stars: 0.7 }) },
  { t: 0.833, name: 'noche-total', params: p({ skyTop: '#06070f', skyHorizon: '#14121e', fog: '#0e0c16', fogDensity: 0.01, sunColor: '#cbb89a', sunIntensity: 0, moonColor: MOON, moonIntensity: 0.5, ambientColor: '#141828', ambientIntensity: 0.3, exposure: 0.93, bloom: 0.8, stars: 0.92 }) },
];
