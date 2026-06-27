/**
 * Reloj del mundo (S0.7-H3). timeOfDay es PURO (recibe el tiempo por parámetro),
 * así el motor no toca Date.now. El cliente pasa Date.now() → todos los clientes
 * calculan el MISMO momento (determinismo); el server lo hará autoritativo después.
 */

/** Duración de un ciclo día/noche (un "día de juego"), en segundos. Por defecto 30 min (1800 s);
 *  el panel de test puede acelerar/pausar. */
export const CYCLE_SECONDS = 1800;

/** timeOfDay 0..1 a partir de un instante (ms epoch) y la duración del ciclo. */
export function timeOfDayAt(epochMs: number, cycleSeconds: number = CYCLE_SECONDS): number {
  const s = epochMs / 1000;
  return (((s % cycleSeconds) + cycleSeconds) % cycleSeconds) / cycleSeconds;
}

/**
 * Cuántos ciclos día/noche (días de juego) componen un "año" (para las estaciones, S2-B1).
 * 384 días = 4 estaciones × 96 días. Con 30 min/día → cada día real ≈ 48 días de juego, así que
 * cada estación dura ~2 días reales (decisión de Carlos, 2026-06-26). El panel de test salta
 * entre estaciones para previsualizarlas sin esperar. */
export const CYCLES_PER_YEAR = 384;

/**
 * timeOfYear 0..1 a partir de un instante (ms epoch). Determinista, ANÁLOGO a timeOfDay:
 * cliente y servidor derivan la MISMA estación del mismo reloj, sin transmitir nada (S2-B1).
 */
export function timeOfYearAt(
  epochMs: number,
  cycleSeconds: number = CYCLE_SECONDS,
  cyclesPerYear: number = CYCLES_PER_YEAR,
): number {
  const yearSeconds = cycleSeconds * cyclesPerYear;
  const s = epochMs / 1000;
  return (((s % yearSeconds) + yearSeconds) % yearSeconds) / yearSeconds;
}
