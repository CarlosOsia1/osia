/**
 * Clima (S0.7 v2) — capa EFIMERA sobre el preset del bioma. No siempre activa:
 * son eventos (lluvia, nieve, tormenta de arena, niebla densa). Modifica los
 * params resueltos (niebla, exposicion, sol, color de cielo) y dice que particula
 * renderizar. Mantiene la estetica low-poly pero hace que el mundo "respire" clima.
 */

import { lerp, clamp01 } from './math';
import { lerpRGB, hexToRGB } from './color';
import type { AtmosphereParams, RGB } from './types';

export type WeatherKind = 'despejado' | 'lluvia' | 'nieve' | 'tormenta-arena' | 'niebla';
export type WeatherState = { kind: WeatherKind; intensity: number }; // intensity 0..1

export const CLEAR: WeatherState = { kind: 'despejado', intensity: 0 };

const GREY: RGB = hexToRGB('#9aa3ad');
const SNOW: RGB = hexToRGB('#e8eef5');
const SAND: RGB = hexToRGB('#b8965f');

function desat(c: RGB, k: number): RGB {
  const l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  return [lerp(c[0], l, k), lerp(c[1], l, k), lerp(c[2], l, k)];
}

export function applyWeather(p: AtmosphereParams, w: WeatherState): AtmosphereParams {
  const i = clamp01(w.intensity);
  if (w.kind === 'despejado' || i <= 0) return p;

  let fogDensity = p.fogDensity;
  let fogColor = p.fogColor;
  let exposure = p.exposure;
  let sunIntensity = p.sunIntensity;
  let skyTop = p.skyTop;
  let skyHorizon = p.skyHorizon;
  let bloom = p.bloom;

  switch (w.kind) {
    case 'lluvia':
      fogDensity = lerp(p.fogDensity, Math.max(p.fogDensity, 0.04) * 2.4, i);
      fogColor = lerpRGB(p.fogColor, desat(GREY, 0.6), i * 0.7);
      exposure = lerp(p.exposure, p.exposure * 0.78, i);
      sunIntensity = lerp(p.sunIntensity, p.sunIntensity * 0.45, i);
      skyTop = lerpRGB(p.skyTop, desat(p.skyTop, 0.55), i * 0.6);
      skyHorizon = lerpRGB(p.skyHorizon, desat(p.skyHorizon, 0.55), i * 0.6);
      bloom = lerp(p.bloom, p.bloom * 0.7, i);
      break;
    case 'nieve':
      fogDensity = lerp(p.fogDensity, Math.max(p.fogDensity, 0.03) * 1.9, i);
      fogColor = lerpRGB(p.fogColor, SNOW, i * 0.6);
      exposure = lerp(p.exposure, p.exposure * 1.06, i);
      sunIntensity = lerp(p.sunIntensity, p.sunIntensity * 0.7, i);
      break;
    case 'tormenta-arena':
      fogDensity = lerp(p.fogDensity, Math.max(p.fogDensity, 0.05) * 3.2, i);
      fogColor = lerpRGB(p.fogColor, SAND, i * 0.85);
      exposure = lerp(p.exposure, p.exposure * 0.82, i);
      sunIntensity = lerp(p.sunIntensity, p.sunIntensity * 0.4, i);
      skyTop = lerpRGB(p.skyTop, SAND, i * 0.5);
      skyHorizon = lerpRGB(p.skyHorizon, SAND, i * 0.7);
      break;
    case 'niebla':
      fogDensity = lerp(p.fogDensity, Math.max(p.fogDensity, 0.05) * 3.6, i);
      sunIntensity = lerp(p.sunIntensity, p.sunIntensity * 0.6, i);
      break;
  }

  return { ...p, fogDensity, fogColor, exposure, sunIntensity, skyTop, skyHorizon, bloom };
}

/** Tipo de particula a renderizar para el clima actual (null = ninguna). */
export function precipKind(w: WeatherState): 'rain' | 'snow' | 'sand' | null {
  if (w.intensity <= 0) return null;
  if (w.kind === 'lluvia') return 'rain';
  if (w.kind === 'nieve') return 'snow';
  if (w.kind === 'tormenta-arena') return 'sand';
  return null;
}
