/**
 * Perfiles de ciclo de clima como DATOS (S2-B2 · cadencia v2). El clima es ESCASO a propósito:
 * por DÍA de juego (un ciclo día/noche) ocurren COMO MÁXIMO `maxEventsPerDay` eventos, cada uno
 * de 2 a 5 minutos. El resto del día está despejado. Ajustar el ritmo = editar esta tabla, no
 * tocar la lógica del director (§1.1-O / §1.2).
 *
 * Puro: solo datos y tipos. La selección/duración la sortea el director con su PRNG sembrado
 * (mulberry32); aquí NO hay aleatoriedad (sin Math.random; lo vigila el lint del paquete).
 */
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
/** Perfiles por bioma. Misma escasez (máx. 2/día); cambian duración/intensidad típicas. */
export declare const WEATHER_PROFILES: Record<string, WeatherPhaseProfile>;
export declare function weatherProfileFor(biome: string): WeatherPhaseProfile;
//# sourceMappingURL=weatherCycle.d.ts.map