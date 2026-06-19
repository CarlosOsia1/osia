/**
 * Reloj del mundo (S0.7-H3). timeOfDay es PURO (recibe el tiempo por parámetro),
 * así el motor no toca Date.now. El cliente pasa Date.now() → todos los clientes
 * calculan el MISMO momento (determinismo); el server lo hará autoritativo después.
 */

/** Duración de un ciclo día/noche, en segundos. Por defecto 20 min (1200 s);
 *  el panel de test puede acelerar/pausar. Producción: 3600–5400 (60–90 min). */
export const CYCLE_SECONDS = 1200;

/** timeOfDay 0..1 a partir de un instante (ms epoch) y la duración del ciclo. */
export function timeOfDayAt(epochMs: number, cycleSeconds: number = CYCLE_SECONDS): number {
  const s = epochMs / 1000;
  return (((s % cycleSeconds) + cycleSeconds) % cycleSeconds) / cycleSeconds;
}
