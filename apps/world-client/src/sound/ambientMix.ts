/**
 * Mezcla del paisaje sonoro (S2-A2) — PURA: dado el bioma, el clima, "qué tan noche" es y la
 * "vivacidad" de la estación, devuelve la ganancia (0..1) de cada capa. Determinista y testeable
 * sin WebAudio; el motor (AmbientEngine) la traduce a nodos con crossfade.
 *
 * Dimensiones del paisaje sonoro:
 *  · DÍA/NOCHE  → de día cantan los PÁJAROS; de noche, los GRILLOS. El viento siempre, más de día.
 *  · CLIMA      → lluvia/nieve/arena/niebla activan su capa y acallan pájaros/grillos/viento.
 *  · ESTACIÓN   → `liveliness` (0..1) escala la vida (pájaros): primavera/verano vivos, invierno
 *                 apagado. Lo calcula el driver desde la estación (seasonAt) → sonido estacional.
 */

import { clamp01, type WeatherKind } from '@osia/atmosphere';

export type AmbientLayer = 'wind' | 'birds' | 'crickets' | 'rain' | 'snow' | 'sand' | 'fog';
export const AMBIENT_LAYERS: readonly AmbientLayer[] = [
  'wind',
  'birds',
  'crickets',
  'rain',
  'snow',
  'sand',
  'fog',
];
export type AmbientMix = Record<AmbientLayer, number>;

export function ambientMix(
  biomeId: string,
  weatherKind: WeatherKind,
  weatherIntensity: number,
  night: number, // 0 día → 1 noche (de starsIntensity)
  liveliness = 1, // 0..1 "vivacidad" de la estación (escala los pájaros)
): AmbientMix {
  const n = clamp01(night);
  const day = 1 - n;
  const wi = clamp01(weatherIntensity);
  const live = clamp01(liveliness);

  const rain = weatherKind === 'lluvia' ? 0.8 * wi : 0;
  const snow = weatherKind === 'nieve' ? 0.22 * wi : 0; // casi un silencio
  const sand = weatherKind === 'tormenta-arena' ? 0.85 * wi : 0;
  const fog = weatherKind === 'niebla' ? 0.3 * wi : 0;
  const activeWeather = Math.max(rain, sand, fog); // climas que "tapan" pájaros/grillos

  // El viento siempre está, un poco más de día. En lluvia/arena se aparta para dejar dominar.
  const windDuck = rain > 0 || sand > 0 ? 0.5 : 1;
  const wind = (0.32 + 0.12 * day) * windDuck;

  // Pájaros: criatura del DÍA, sobre todo en el bosque; la noche, el clima activo y el invierno los callan.
  const birdsBiome = biomeId === 'bosque-celeste' ? 0.5 : 0.18;
  const birds = birdsBiome * day * live * (1 - 0.8 * activeWeather);

  // Grillos: criatura de la NOCHE, sobre todo en el bosque; un clima activo los acalla.
  const cricketBiome = biomeId === 'bosque-celeste' ? 0.5 : 0.12;
  const crickets = cricketBiome * n * (1 - 0.7 * activeWeather);

  return { wind, birds, crickets, rain, snow, sand, fog };
}
