/**
 * Biomas (S0.7 v2) — estilo Minecraft: cada bioma define SU PROPIO ciclo día/noche
 * (cielo, noche, niebla, sol/luna), su viento base y los climas que pueden ocurrir.
 * Cielos AZULES saturados con gradiente, niebla BAJA y tintada (ver lejos despejado).
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

/** Tundra nevada: fría, azul clara, estrellas brillantes. */
const TUNDRA_CYCLE: AtmosphereKeyframe[] = [
  { t: 0.0, name: 'noche-glacial', params: mk({ skyTop: '#04060f', skyHorizon: '#0a1322', fog: '#0a0f18', fogDensity: 0.01, sunColor: '#dfe7f2', sunIntensity: 0, moonColor: '#cdd8ec', moonIntensity: 0.7, ambientColor: '#17243a', ambientIntensity: 0.3, exposure: 0.92, bloom: 0.85, stars: 1 }) },
  { t: 0.24, name: 'alba-helada', params: mk({ skyTop: '#7e9cc6', skyHorizon: '#cdd8e4', fog: '#c4cedb', fogDensity: 0.022, sunColor: '#eaf0f6', sunIntensity: 1.3, moonColor: '#cdd8ec', moonIntensity: 0.08, ambientColor: '#bcc6d2', ambientIntensity: 0.52, exposure: 1.0, bloom: 0.5, stars: 0.1 }) },
  { t: 0.5, name: 'dia-niveo', params: mk({ skyTop: '#3f80c6', skyHorizon: '#b6c8d8', fog: '#bcc8d4', fogDensity: 0.008, sunColor: '#f2f6fa', sunIntensity: 2.4, moonColor: '#cdd8ec', moonIntensity: 0, ambientColor: '#bdcad6', ambientIntensity: 0.55, exposure: 1.02, bloom: 0.34, stars: 0 }) },
  { t: 0.74, name: 'crepusculo-hielo', params: mk({ skyTop: '#2c3156', skyHorizon: '#bb8fa2', fog: '#52505f', fogDensity: 0.013, sunColor: '#dcbcc6', sunIntensity: 1.3, moonColor: '#cdd8ec', moonIntensity: 0.3, ambientColor: '#4b4f66', ambientIntensity: 0.42, exposure: 1.0, bloom: 0.7, stars: 0.3 }) },
  { t: 0.86, name: 'anochecer-azul', params: mk({ skyTop: '#070f1f', skyHorizon: '#142038', fog: '#101926', fogDensity: 0.012, sunColor: '#dfe7f2', sunIntensity: 0.15, moonColor: '#cdd8ec', moonIntensity: 0.55, ambientColor: '#182440', ambientIntensity: 0.32, exposure: 0.95, bloom: 0.8, stars: 0.75 }) },
];

/** Dunas doradas: cálida, ocre, púrpura de noche. */
const DUNES_CYCLE: AtmosphereKeyframe[] = [
  { t: 0.0, name: 'noche-purpura', params: mk({ skyTop: '#0a0816', skyHorizon: '#15101f', fog: '#120d1a', fogDensity: 0.009, sunColor: '#f0d9a8', sunIntensity: 0, moonColor: '#cbbfe0', moonIntensity: 0.5, ambientColor: '#201a2e', ambientIntensity: 0.3, exposure: 0.9, bloom: 0.8, stars: 1 }) },
  { t: 0.24, name: 'alba-durazno', params: mk({ skyTop: '#8b7fb0', skyHorizon: '#e6b88c', fog: '#dcc4a0', fogDensity: 0.02, sunColor: '#f3cf94', sunIntensity: 1.6, moonColor: '#cbbfe0', moonIntensity: 0.06, ambientColor: '#cbae8e', ambientIntensity: 0.52, exposure: 1.02, bloom: 0.55, stars: 0.08 }) },
  { t: 0.5, name: 'dia-calina', params: mk({ skyTop: '#4a84c2', skyHorizon: '#d9bf86', fog: '#d4bf90', fogDensity: 0.009, sunColor: '#f8ecc4', sunIntensity: 2.7, moonColor: '#cbbfe0', moonIntensity: 0, ambientColor: '#ccb98c', ambientIntensity: 0.58, exposure: 1.05, bloom: 0.4, stars: 0 }) },
  { t: 0.74, name: 'ocaso-ambar', params: mk({ skyTop: '#382546', skyHorizon: '#cf7e38', fog: '#744730', fogDensity: 0.013, sunColor: '#ef9c54', sunIntensity: 1.7, moonColor: '#cbbfe0', moonIntensity: 0.2, ambientColor: '#684535', ambientIntensity: 0.44, exposure: 1.02, bloom: 0.72, stars: 0.25 }) },
  { t: 0.86, name: 'anochecer-malva', params: mk({ skyTop: '#0b0818', skyHorizon: '#1a1230', fog: '#160d1f', fogDensity: 0.011, sunColor: '#f0d9a8', sunIntensity: 0.15, moonColor: '#cbbfe0', moonIntensity: 0.45, ambientColor: '#221a32', ambientIntensity: 0.32, exposure: 0.95, bloom: 0.78, stars: 0.7 }) },
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
