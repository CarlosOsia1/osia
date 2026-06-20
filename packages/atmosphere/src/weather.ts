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
  'tormenta-arena': 0.8, // -30% sobre el -30% previo (tapaba demasiado)
  niebla: 0.6,
};

const GREY: RGB = hexToRGB('#8b94a0');
const SAND: RGB = hexToRGB('#c2a25f'); // arena AMARILLA/dorada
const WHITE: RGB = hexToRGB('#e8ebf0'); // niebla BLANCA (un pelo fría, sin reventar)

function desat(c: RGB, k: number): RGB {
  const l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  return [lerp(c[0], l, k), lerp(c[1], l, k), lerp(c[2], l, k)];
}
function lighten(c: RGB, k: number): RGB {
  return [lerp(c[0], 1, k), lerp(c[1], 1, k), lerp(c[2], 1, k)];
}
/** Escala el brillo de un color (0 negro → 1 igual). Para oscurecer tintes de noche. */
function scale(c: RGB, k: number): RGB {
  return [c[0] * k, c[1] * k, c[2] * k];
}

export function applyWeather(p: AtmosphereParams, w: WeatherState): AtmosphereParams {
  const i = clamp01(w.intensity) * STRENGTH[w.kind];
  if (i <= 0) return p;

  // La niebla/polvo se ILUMINA con la luz disponible. Pero son distintos: la NIEBLA
  // (mist) DISPERSA la luz lunar → brilla suave de noche y debe verse (piso alto). El
  // POLVO de arena NO brilla → se oscurece de noche (piso bajo). `1` = día.
  const night = 1 - clamp01(p.starsIntensity);
  const dayN = 0.65 + 0.35 * night; // niebla: visible de noche (glow lunar)
  const dayS = 0.45 + 0.55 * night; // arena: oscura de noche (polvo apagado)
  const W = scale(WHITE, dayN);
  const S = scale(SAND, dayS);

  let fogDensity = p.fogDensity;
  let fogColor = p.fogColor;
  let exposure = p.exposure;
  let sunIntensity = p.sunIntensity;
  let skyTop = p.skyTop;
  let skyHorizon = p.skyHorizon;
  let bloom = p.bloom;
  let ambientColor = p.ambientColor;
  let ambientIntensity = p.ambientIntensity;

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
      // Fog ALTO y AMARILLO. El polvo brillante DISPERSA luz: se sube y tinta el
      // ambiente de arena, así lo cercano NO queda como silueta negra contra la bruma.
      fogDensity = lerp(p.fogDensity, Math.max(p.fogDensity, 0.05) * 3.0, i);
      fogColor = lerpRGB(p.fogColor, S, i * 0.9);
      exposure = lerp(p.exposure, p.exposure * 0.92, i);
      sunIntensity = lerp(p.sunIntensity, p.sunIntensity * 0.5, i);
      skyTop = lerpRGB(p.skyTop, S, i * 0.65);
      skyHorizon = lerpRGB(p.skyHorizon, S, i * 0.85);
      ambientColor = lerpRGB(p.ambientColor, S, i * 0.8);
      ambientIntensity = lerp(p.ambientIntensity, p.ambientIntensity + 0.6 * dayS, i);
      break;
    case 'niebla':
      // Fog ALTO y BLANCO. Luz difusa: ambiente hacia blanco para que lo cercano se
      // BAÑE de niebla (no siluetas negras) y de noche se vea bruma blanca, no un degradado.
      fogDensity = lerp(p.fogDensity, Math.max(p.fogDensity, 0.05) * 2.8, i);
      fogColor = lerpRGB(p.fogColor, W, i * 0.78);
      sunIntensity = lerp(p.sunIntensity, p.sunIntensity * 0.7, i);
      exposure = lerp(p.exposure, p.exposure * 0.98, i);
      skyTop = lerpRGB(p.skyTop, W, i * 0.7);
      skyHorizon = lerpRGB(p.skyHorizon, W, i * 0.82);
      ambientColor = lerpRGB(p.ambientColor, W, i * 0.6);
      ambientIntensity = lerp(p.ambientIntensity, p.ambientIntensity + 0.45 * dayN, i);
      break;
  }

  return { ...p, fogDensity, fogColor, exposure, sunIntensity, skyTop, skyHorizon, bloom, ambientColor, ambientIntensity };
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
