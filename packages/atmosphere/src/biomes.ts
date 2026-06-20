/**
 * Biomas (S0.7 v2) — cada bioma define SU PROPIO ciclo día/noche con el mismo
 * cronograma horario que Bosque Celeste (ver presets.ts), su viento base y los
 * climas que pueden ocurrir. Cielos azules con gradiente, niebla baja y tintada.
 */

import { hexToRGB } from './color';
import { CELESTIAL_CYCLE } from './presets';
import type { AtmosphereKeyframe, AtmosphereParams } from './types';
import type { WeatherKind } from './weather';

const UP = [0, 1, 0] as const;

function mk(o: {
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

const T_MOON = '#cdd8ec';
const D_MOON = '#cbbfe0';

/** Tundra nevada: fría, azul clara, estrellas brillantes. Horizonte de mañana atenuado. */
const TUNDRA_CYCLE: AtmosphereKeyframe[] = [
  { t: 0.0, name: 'noche', params: mk({ skyTop: '#04060f', skyHorizon: '#0a1322', fog: '#0a0f18', fogDensity: 0.01, sunColor: '#dfe7f2', sunIntensity: 0, moonColor: T_MOON, moonIntensity: 0.7, ambientColor: '#17243a', ambientIntensity: 0.3, exposure: 0.92, bloom: 0.85, stars: 1 }) },
  { t: 0.229, name: 'amanecer-inicial', params: mk({ skyTop: '#08101f', skyHorizon: '#1c2433', fog: '#121a26', fogDensity: 0.012, sunColor: '#dfe7f2', sunIntensity: 0, moonColor: T_MOON, moonIntensity: 0.5, ambientColor: '#1a2638', ambientIntensity: 0.3, exposure: 0.9, bloom: 0.82, stars: 0.82 }) },
  { t: 0.26, name: 'salida-del-sol', params: mk({ skyTop: '#45506e', skyHorizon: '#c79a9c', fog: '#6a6470', fogDensity: 0.016, sunColor: '#e8c0c4', sunIntensity: 1.1, moonColor: T_MOON, moonIntensity: 0.1, ambientColor: '#5e5a64', ambientIntensity: 0.42, exposure: 0.96, bloom: 0.6, stars: 0.2 }) },
  { t: 0.302, name: 'manana-temprana', params: mk({ skyTop: '#7e9cc6', skyHorizon: '#b8c6d6', fog: '#b6c2d0', fogDensity: 0.014, sunColor: '#eaf0f6', sunIntensity: 1.7, moonColor: T_MOON, moonIntensity: 0.03, ambientColor: '#b2bdc9', ambientIntensity: 0.52, exposure: 0.98, bloom: 0.5, stars: 0.04 }) },
  { t: 0.333, name: 'dia', params: mk({ skyTop: '#3380d4', skyHorizon: '#9ec8ea', fog: '#b0d0ec', fogDensity: 0.008, sunColor: '#f2f6fa', sunIntensity: 2.4, moonColor: T_MOON, moonIntensity: 0, ambientColor: '#bdcad6', ambientIntensity: 0.55, exposure: 1.0, bloom: 0.34, stars: 0 }) },
  { t: 0.625, name: 'dia-tardio', params: mk({ skyTop: '#3380d4', skyHorizon: '#9ec8ea', fog: '#b0d0ec', fogDensity: 0.008, sunColor: '#f2f6fa', sunIntensity: 2.4, moonColor: T_MOON, moonIntensity: 0, ambientColor: '#bdcad6', ambientIntensity: 0.55, exposure: 1.0, bloom: 0.34, stars: 0 }) },
  { t: 0.688, name: 'pre-atardecer', params: mk({ skyTop: '#3a6ea8', skyHorizon: '#c2b4be', fog: '#9aa0aa', fogDensity: 0.01, sunColor: '#e6d2cc', sunIntensity: 2.0, moonColor: T_MOON, moonIntensity: 0, ambientColor: '#98a0aa', ambientIntensity: 0.5, exposure: 1.0, bloom: 0.45, stars: 0 }) },
  { t: 0.74, name: 'atardecer-fuerte', params: mk({ skyTop: '#2c3156', skyHorizon: '#bb8fa2', fog: '#524f5f', fogDensity: 0.012, sunColor: '#dcbcc6', sunIntensity: 1.4, moonColor: T_MOON, moonIntensity: 0.15, ambientColor: '#4b4f66', ambientIntensity: 0.42, exposure: 1.0, bloom: 0.7, stars: 0.2 }) },
  { t: 0.76, name: 'crepusculo', params: mk({ skyTop: '#1c2240', skyHorizon: '#6e5868', fog: '#38353f', fogDensity: 0.012, sunColor: '#b890a0', sunIntensity: 0.7, moonColor: T_MOON, moonIntensity: 0.3, ambientColor: '#2e303e', ambientIntensity: 0.36, exposure: 0.98, bloom: 0.72, stars: 0.42 }) },
  { t: 0.802, name: 'anochecer', params: mk({ skyTop: '#081020', skyHorizon: '#1a2438', fog: '#121a28', fogDensity: 0.011, sunColor: '#dfe7f2', sunIntensity: 0.1, moonColor: T_MOON, moonIntensity: 0.5, ambientColor: '#182440', ambientIntensity: 0.32, exposure: 0.95, bloom: 0.8, stars: 0.7 }) },
  { t: 0.833, name: 'noche-total', params: mk({ skyTop: '#04060f', skyHorizon: '#0e1828', fog: '#0a1018', fogDensity: 0.01, sunColor: '#dfe7f2', sunIntensity: 0, moonColor: T_MOON, moonIntensity: 0.7, ambientColor: '#16223a', ambientIntensity: 0.3, exposure: 0.93, bloom: 0.85, stars: 0.92 }) },
];

/** Dunas doradas: cálida, ocre, púrpura de noche. */
const DUNES_CYCLE: AtmosphereKeyframe[] = [
  { t: 0.0, name: 'noche', params: mk({ skyTop: '#0a0816', skyHorizon: '#15101f', fog: '#120d1a', fogDensity: 0.009, sunColor: '#f0d9a8', sunIntensity: 0, moonColor: D_MOON, moonIntensity: 0.5, ambientColor: '#201a2e', ambientIntensity: 0.3, exposure: 0.9, bloom: 0.8, stars: 1 }) },
  { t: 0.229, name: 'amanecer-inicial', params: mk({ skyTop: '#0e0a1a', skyHorizon: '#2a1d28', fog: '#1a1320', fogDensity: 0.012, sunColor: '#f0d9a8', sunIntensity: 0, moonColor: D_MOON, moonIntensity: 0.42, ambientColor: '#221a2e', ambientIntensity: 0.3, exposure: 0.9, bloom: 0.78, stars: 0.82 }) },
  { t: 0.26, name: 'salida-del-sol', params: mk({ skyTop: '#54466e', skyHorizon: '#e89868', fog: '#946a52', fogDensity: 0.017, sunColor: '#f4b074', sunIntensity: 1.3, moonColor: D_MOON, moonIntensity: 0.1, ambientColor: '#6e5648', ambientIntensity: 0.42, exposure: 0.98, bloom: 0.6, stars: 0.2 }) },
  { t: 0.302, name: 'manana-temprana', params: mk({ skyTop: '#8b7fb0', skyHorizon: '#e6b88c', fog: '#d8bf9c', fogDensity: 0.015, sunColor: '#f3cf94', sunIntensity: 1.9, moonColor: D_MOON, moonIntensity: 0.03, ambientColor: '#c8ad8c', ambientIntensity: 0.52, exposure: 1.0, bloom: 0.5, stars: 0.04 }) },
  { t: 0.333, name: 'dia', params: mk({ skyTop: '#3a84cc', skyHorizon: '#d9bf86', fog: '#d4bf90', fogDensity: 0.009, sunColor: '#f8ecc4', sunIntensity: 2.7, moonColor: D_MOON, moonIntensity: 0, ambientColor: '#ccb98c', ambientIntensity: 0.58, exposure: 1.04, bloom: 0.4, stars: 0 }) },
  { t: 0.625, name: 'dia-tardio', params: mk({ skyTop: '#3a84cc', skyHorizon: '#d9bf86', fog: '#d4bf90', fogDensity: 0.009, sunColor: '#f8ecc4', sunIntensity: 2.7, moonColor: D_MOON, moonIntensity: 0, ambientColor: '#ccb98c', ambientIntensity: 0.58, exposure: 1.04, bloom: 0.4, stars: 0 }) },
  { t: 0.688, name: 'pre-atardecer', params: mk({ skyTop: '#4470a0', skyHorizon: '#dcab70', fog: '#bc9870', fogDensity: 0.011, sunColor: '#f3c585', sunIntensity: 2.3, moonColor: D_MOON, moonIntensity: 0, ambientColor: '#b89868', ambientIntensity: 0.52, exposure: 1.04, bloom: 0.5, stars: 0 }) },
  { t: 0.74, name: 'atardecer-fuerte', params: mk({ skyTop: '#382546', skyHorizon: '#cf7e38', fog: '#744730', fogDensity: 0.013, sunColor: '#ef9c54', sunIntensity: 1.7, moonColor: D_MOON, moonIntensity: 0.2, ambientColor: '#684535', ambientIntensity: 0.44, exposure: 1.02, bloom: 0.72, stars: 0.25 }) },
  { t: 0.76, name: 'crepusculo', params: mk({ skyTop: '#241a36', skyHorizon: '#8a4e32', fog: '#43291f', fogDensity: 0.013, sunColor: '#c87044', sunIntensity: 0.7, moonColor: D_MOON, moonIntensity: 0.3, ambientColor: '#34241e', ambientIntensity: 0.36, exposure: 0.98, bloom: 0.74, stars: 0.42 }) },
  { t: 0.802, name: 'anochecer', params: mk({ skyTop: '#0c0a1c', skyHorizon: '#281830', fog: '#190f22', fogDensity: 0.011, sunColor: '#f0d9a8', sunIntensity: 0.1, moonColor: D_MOON, moonIntensity: 0.45, ambientColor: '#221a32', ambientIntensity: 0.32, exposure: 0.95, bloom: 0.78, stars: 0.7 }) },
  { t: 0.833, name: 'noche-total', params: mk({ skyTop: '#0a0816', skyHorizon: '#161122', fog: '#110c1c', fogDensity: 0.01, sunColor: '#f0d9a8', sunIntensity: 0, moonColor: D_MOON, moonIntensity: 0.5, ambientColor: '#1e1a2c', ambientIntensity: 0.3, exposure: 0.93, bloom: 0.8, stars: 0.92 }) },
];

export type Biome = {
  id: string;
  name: string;
  cycle: AtmosphereKeyframe[];
  windBase: number; // 0..1
  weathers: WeatherKind[]; // climas que pueden ocurrir
};

export const BIOMES: Biome[] = [
  { id: 'bosque-celeste', name: 'Bosque Celeste', cycle: CELESTIAL_CYCLE, windBase: 0.3, weathers: ['despejado', 'lluvia', 'niebla'] },
  { id: 'tundra-nevada', name: 'Tundra Nevada', cycle: TUNDRA_CYCLE, windBase: 0.6, weathers: ['despejado', 'nieve', 'niebla'] },
  { id: 'dunas-doradas', name: 'Dunas Doradas', cycle: DUNES_CYCLE, windBase: 0.5, weathers: ['despejado', 'tormenta-arena'] },
];

export function biomeById(id: string): Biome {
  return BIOMES.find((b) => b.id === id) ?? BIOMES[0]!;
}
