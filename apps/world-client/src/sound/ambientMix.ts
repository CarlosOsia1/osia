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

/**
 * VIDA por bioma (0..1): qué tan presentes están las aves (día) y los grillos/insectos (noche) en
 * cada bioma. Realismo: en el DESIERTO no cantan aves de bosque; en la TUNDRA helada no hay grillos.
 * Datos → ajustar/añadir un bioma es una entrada (extensible).
 */
export const BIOME_SOUND_LIFE: Record<string, { birds: number; crickets: number }> = {
  'bosque-celeste': { birds: 0.5, crickets: 0.5 }, // bosque vivo: aves de día, grillos de noche
  'tundra-nevada': { birds: 0.12, crickets: 0 }, // aves árticas dispersas; SIN grillos (frío)
  'dunas-doradas': { birds: 0, crickets: 0.2 }, // SIN aves de bosque; insectos de noche en el desierto
};
const DEFAULT_LIFE = { birds: 0.3, crickets: 0.3 };

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
  const stormy = weatherKind === 'despejado' ? 0 : wi; // hay clima activo (lluvia/NIEVE/arena/niebla)

  const rain = weatherKind === 'lluvia' ? 0.8 * wi : 0;
  const snow = weatherKind === 'nieve' ? 0.22 * wi : 0; // casi un silencio
  const sand = weatherKind === 'tormenta-arena' ? 0.85 * wi : 0;
  const fog = weatherKind === 'niebla' ? 0.6 * wi : 0; // drone de niebla, audible

  // Viento: MISMO nivel de día y de noche (suave; de día sonaba muy duro). Se aparta en
  // lluvia/arena/NIEBLA para que esa capa domine (si no, solo se oiría el viento bajo niebla).
  const windDuck = rain > 0 || sand > 0 || fog > 0 ? 0.5 : 1;
  const wind = 0.12 * windDuck;

  // Con clima activo (lluvia, NIEVE, arena o niebla) callan las aves/insectos: nadie canta bajo tormenta.
  const calm = Math.max(0, 1 - 1.4 * stormy);
  const life = BIOME_SOUND_LIFE[biomeId] ?? DEFAULT_LIFE;

  // Aves: criatura del DÍA, según el bioma, escaladas por la estación; mudas con clima activo.
  const birds = life.birds * day * live * calm;
  // Grillos/insectos: criatura de la NOCHE, según el bioma; también callados con clima activo.
  const crickets = life.crickets * n * calm;

  return { wind, birds, crickets, rain, snow, sand, fog };
}
