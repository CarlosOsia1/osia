/**
 * Biomas (S0.7 v2) — estilo Minecraft: cada bioma define SU PROPIO ciclo día/noche
 * (cielo, noche, niebla, sol/luna), su viento base y los climas que pueden ocurrir.
 * Cambiar de bioma cambia el alma del mundo entero. Todos en gamut low-poly celestial.
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

/** Tundra nevada: fría, azul-blanca, estrellas brillantes, nieve. */
const TUNDRA_CYCLE: AtmosphereKeyframe[] = [
  { t: 0.0, name: 'noche-glacial', params: mk({ skyTop: '#060a16', skyHorizon: '#0a1426', fog: '#0e1622', fogDensity: 0.028, sunColor: '#dfe7f2', sunIntensity: 0, moonColor: '#cdd8ec', moonIntensity: 0.7, ambientColor: '#19243a', ambientIntensity: 0.3, exposure: 0.9, bloom: 0.85, stars: 1 }) },
  { t: 0.24, name: 'alba-helada', params: mk({ skyTop: '#aebccf', skyHorizon: '#d6dfe9', fog: '#e2e9f1', fogDensity: 0.05, sunColor: '#eaf0f6', sunIntensity: 1.2, moonColor: '#cdd8ec', moonIntensity: 0.1, ambientColor: '#c4cdd9', ambientIntensity: 0.55, exposure: 1.05, bloom: 0.5, stars: 0.1 }) },
  { t: 0.5, name: 'dia-niveo', params: mk({ skyTop: '#9fb6cf', skyHorizon: '#c4d2de', fog: '#dde6ee', fogDensity: 0.022, sunColor: '#f2f6fa', sunIntensity: 2.5, moonColor: '#cdd8ec', moonIntensity: 0, ambientColor: '#c6d0da', ambientIntensity: 0.62, exposure: 1.2, bloom: 0.35, stars: 0 }) },
  { t: 0.74, name: 'crepusculo-hielo', params: mk({ skyTop: '#3a3f58', skyHorizon: '#b7a6b0', fog: '#5d5a66', fogDensity: 0.03, sunColor: '#d9c2c8', sunIntensity: 1.3, moonColor: '#cdd8ec', moonIntensity: 0.3, ambientColor: '#54586e', ambientIntensity: 0.42, exposure: 1.05, bloom: 0.7, stars: 0.3 }) },
  { t: 0.86, name: 'anochecer-azul', params: mk({ skyTop: '#0c1426', skyHorizon: '#16203a', fog: '#121a2c', fogDensity: 0.032, sunColor: '#dfe7f2', sunIntensity: 0.2, moonColor: '#cdd8ec', moonIntensity: 0.55, ambientColor: '#1a2540', ambientIntensity: 0.32, exposure: 0.98, bloom: 0.8, stars: 0.75 }) },
];

/** Dunas doradas: cálida, ocre, calina de calor de día, púrpura de noche. */
const DUNES_CYCLE: AtmosphereKeyframe[] = [
  { t: 0.0, name: 'noche-purpura', params: mk({ skyTop: '#0d0a18', skyHorizon: '#171022', fog: '#150f1e', fogDensity: 0.026, sunColor: '#f0d9a8', sunIntensity: 0, moonColor: '#cbbfe0', moonIntensity: 0.5, ambientColor: '#221a30', ambientIntensity: 0.3, exposure: 0.9, bloom: 0.8, stars: 1 }) },
  { t: 0.24, name: 'alba-durazno', params: mk({ skyTop: '#caa9c0', skyHorizon: '#e6c39a', fog: '#ecd6b6', fogDensity: 0.04, sunColor: '#f3cf94', sunIntensity: 1.5, moonColor: '#cbbfe0', moonIntensity: 0.08, ambientColor: '#d4b79a', ambientIntensity: 0.52, exposure: 1.05, bloom: 0.55, stars: 0.08 }) },
  { t: 0.5, name: 'dia-calina', params: mk({ skyTop: '#bca77e', skyHorizon: '#dcc081', fog: '#e0cd9c', fogDensity: 0.03, sunColor: '#f8ecc4', sunIntensity: 2.8, moonColor: '#cbbfe0', moonIntensity: 0, ambientColor: '#d3c39a', ambientIntensity: 0.6, exposure: 1.18, bloom: 0.4, stars: 0 }) },
  { t: 0.74, name: 'ocaso-ambar', params: mk({ skyTop: '#46314a', skyHorizon: '#d08840', fog: '#7a4f33', fogDensity: 0.032, sunColor: '#ef9c54', sunIntensity: 1.7, moonColor: '#cbbfe0', moonIntensity: 0.2, ambientColor: '#6f4a3a', ambientIntensity: 0.44, exposure: 1.1, bloom: 0.72, stars: 0.25 }) },
  { t: 0.86, name: 'anochecer-malva', params: mk({ skyTop: '#0f0b1c', skyHorizon: '#1d1430', fog: '#190f22', fogDensity: 0.03, sunColor: '#f0d9a8', sunIntensity: 0.2, moonColor: '#cbbfe0', moonIntensity: 0.45, ambientColor: '#241a34', ambientIntensity: 0.32, exposure: 0.98, bloom: 0.78, stars: 0.7 }) },
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
