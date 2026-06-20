/**
 * Clima (S0.7 v2) — capa EFIMERA sobre el preset del bioma. Modifica los params
 * resueltos (niebla, exposicion, sol, color) y dice que particula renderizar.
 *
 * FUERZA por tipo (lo atmosferico, NO las particulas): la lluvia/nieve lavaban
 * todo a blanco por la niebla del clima; se reduce su efecto. Las particulas
 * siguen cayendo a intensidad plena.
 */

import { lerp, clamp01 } from './math';
import { lerpRGB, hexToRGB } from './color';
import type { AtmosphereParams, RGB } from './types';

export type WeatherKind = 'despejado' | 'lluvia' | 'nieve' | 'tormenta-arena' | 'niebla';
export type WeatherState = { kind: WeatherKind; intensity: number }; // intensity 0..1

export const CLEAR: WeatherState = { kind: 'despejado', intensity: 0 };

/** Cuánto del efecto atmosférico aplica cada clima (pedido de Carlos). */
const STRENGTH: Record<WeatherKind, number> = {
  despejado: 0,
  lluvia: 0.1, // -90%
  nieve: 0.4, // -60%
  'tormenta-arena': 0.7, // -30% sobre el -30% previo (tapaba demasiado)
  niebla: 1,
};

const GREY: RGB = hexToRGB('#8b94a0');
const SAND: RGB = hexToRGB('#b8965f');

function desat(c: RGB, k: number): RGB {
  const l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  return [lerp(c[0], l, k), lerp(c[1], l, k), lerp(c[2], l, k)];
}
function lighten(c: RGB, k: number): RGB {
  return [lerp(c[0], 1, k), lerp(c[1], 1, k), lerp(c[2], 1, k)];
}

export function applyWeather(p: AtmosphereParams, w: WeatherState): AtmosphereParams {
  const i = clamp01(w.intensity) * STRENGTH[w.kind];
  if (i <= 0) return p;

  let fogDensity = p.fogDensity;
  let fogColor = p.fogColor;
  let exposure = p.exposure;
  let sunIntensity = p.sunIntensity;
  let skyTop = p.skyTop;
  let skyHorizon = p.skyHorizon;
  let bloom = p.bloom;

  switch (w.kind) {
    case 'lluvia':
      fogDensity = lerp(p.fogDensity, Math.max(p.fogDensity, 0.012) * 1.8, i);
      fogColor = lerpRGB(p.fogColor, desat(GREY, 0.5), i * 0.6);
      exposure = lerp(p.exposure, p.exposure * 0.82, i);
      sunIntensity = lerp(p.sunIntensity, p.sunIntensity * 0.55, i);
      skyTop = lerpRGB(p.skyTop, desat(p.skyTop, 0.5), i * 0.5);
      skyHorizon = lerpRGB(p.skyHorizon, desat(p.skyHorizon, 0.5), i * 0.5);
      bloom = lerp(p.bloom, p.bloom * 0.8, i);
      break;
    case 'nieve':
      fogDensity = lerp(p.fogDensity, Math.max(p.fogDensity, 0.012) * 1.6, i);
      fogColor = lerpRGB(p.fogColor, lighten(p.fogColor, 0.4), i * 0.5);
      exposure = lerp(p.exposure, p.exposure * 1.03, i);
      sunIntensity = lerp(p.sunIntensity, p.sunIntensity * 0.8, i);
      break;
    case 'tormenta-arena':
      fogDensity = lerp(p.fogDensity, Math.max(p.fogDensity, 0.05) * 3.0, i);
      fogColor = lerpRGB(p.fogColor, SAND, i * 0.85);
      exposure = lerp(p.exposure, p.exposure * 0.82, i);
      sunIntensity = lerp(p.sunIntensity, p.sunIntensity * 0.4, i);
      skyTop = lerpRGB(p.skyTop, SAND, i * 0.5);
      skyHorizon = lerpRGB(p.skyHorizon, SAND, i * 0.7);
      break;
    case 'niebla':
      // niebla REAL: densa pero TINTADA (no blanca) + jirones visibles (Precipitation 'fog').
      fogDensity = lerp(p.fogDensity, Math.max(p.fogDensity, 0.02) * 2.8, i);
      fogColor = lerpRGB(p.fogColor, lighten(p.fogColor, 0.18), i * 0.4);
      sunIntensity = lerp(p.sunIntensity, p.sunIntensity * 0.65, i);
      exposure = lerp(p.exposure, p.exposure * 0.96, i);
      break;
  }

  return { ...p, fogDensity, fogColor, exposure, sunIntensity, skyTop, skyHorizon, bloom };
}

/** Tipo de partícula a renderizar para el clima actual (null = ninguna). */
export function precipKind(w: WeatherState): 'rain' | 'snow' | 'sand' | 'fog' | null {
  if (w.intensity <= 0 || w.kind === 'despejado') return null;
  if (w.kind === 'lluvia') return 'rain';
  if (w.kind === 'nieve') return 'snow';
  if (w.kind === 'tormenta-arena') return 'sand';
  if (w.kind === 'niebla') return 'fog';
  return null;
}
