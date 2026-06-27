/**
 * Perfiles de ciclo de clima como DATOS (S2-B2 · cadencia v2). El clima es ESCASO a propósito:
 * por DÍA de juego (un ciclo día/noche) ocurren COMO MÁXIMO `maxEventsPerDay` eventos, cada uno
 * de 2 a 5 minutos. El resto del día está despejado. Ajustar el ritmo = editar esta tabla, no
 * tocar la lógica del director (§1.1-O / §1.2).
 *
 * Puro: solo datos y tipos. La selección/duración la sortea el director con su PRNG sembrado
 * (mulberry32); aquí NO hay aleatoriedad (sin Math.random; lo vigila el lint del paquete).
 */

const MIN = 60_000; // 1 minuto en ms

export type WeatherPhaseProfile = {
  /** Máximo de eventos de clima por DÍA de juego (1 ciclo día/noche). */
  maxEventsPerDay: number;
  /** Duración (ms) de un evento de clima [min, max] — escasez: 2 a 5 minutos. */
  eventMs: readonly [number, number];
  /** Espera despejada (ms) entre eventos y antes del primero [min, max]. */
  gapMs: readonly [number, number];
  /** Intensidad objetivo del clima [base, pico] (0..1); el cliente rampa hacia ella (no salta). */
  intensity: readonly [number, number];
};

/** Perfil por defecto (cae aquí cualquier bioma sin entrada propia). */
const DEFAULT_PROFILE: WeatherPhaseProfile = {
  maxEventsPerDay: 2,
  eventMs: [2 * MIN, 5 * MIN],
  gapMs: [3 * MIN, 6 * MIN],
  intensity: [0.6, 1.0],
};

/** Perfiles por bioma. Misma escasez (máx. 2/día); cambian duración/intensidad típicas. */
export const WEATHER_PROFILES: Record<string, WeatherPhaseProfile> = {
  'bosque-celeste': { maxEventsPerDay: 2, eventMs: [2 * MIN, 5 * MIN], gapMs: [3 * MIN, 6 * MIN], intensity: [0.5, 0.95] },
  'tundra-nevada': { maxEventsPerDay: 2, eventMs: [3 * MIN, 5 * MIN], gapMs: [3 * MIN, 6 * MIN], intensity: [0.6, 1.0] },
  'dunas-doradas': { maxEventsPerDay: 2, eventMs: [2 * MIN, 4 * MIN], gapMs: [4 * MIN, 7 * MIN], intensity: [0.7, 1.0] },
};

export function weatherProfileFor(biome: string): WeatherPhaseProfile {
  return WEATHER_PROFILES[biome] ?? DEFAULT_PROFILE;
}
