/**
 * Reloj del mundo en runtime. Por defecto DETERMINISTA (20 min/ciclo, igual para
 * todos). El panel de test puede tomar el control para acelerar/pausar/scrubear
 * (modo `manual`); "tiempo real" lo devuelve a determinista.
 */

import { timeOfDayAt, timeOfYearAt, CYCLE_SECONDS, CYCLES_PER_YEAR } from '@osia/atmosphere';
import { serverNow } from '../net/serverClock';

const wrap = (t: number) => ((t % 1) + 1) % 1;
const YEAR_SECONDS = CYCLE_SECONDS * CYCLES_PER_YEAR;

export const worldClock = {
  tod: timeOfDayAt(serverNow(), CYCLE_SECONDS),
  toy: timeOfYearAt(serverNow(), CYCLE_SECONDS, CYCLES_PER_YEAR), // timeOfYear (estación), S2-B1
  scale: 1,
  paused: false,
  manual: false,
};

export function tickWorldClock(deltaSec: number): void {
  if (!worldClock.manual) {
    // Hora del SERVER → todos los clientes ven el MISMO momento del ciclo día/noche y la
    // MISMA estación (ambos deterministas por el reloj autoritativo).
    worldClock.tod = timeOfDayAt(serverNow(), CYCLE_SECONDS);
    worldClock.toy = timeOfYearAt(serverNow(), CYCLE_SECONDS, CYCLES_PER_YEAR);
    return;
  }
  if (worldClock.paused) return;
  worldClock.tod = wrap(worldClock.tod + (deltaSec / CYCLE_SECONDS) * worldClock.scale);
  worldClock.toy = wrap(worldClock.toy + (deltaSec / YEAR_SECONDS) * worldClock.scale);
}

export function setTimeScale(scale: number): void {
  worldClock.manual = true;
  worldClock.paused = false;
  worldClock.scale = scale;
}
export function setPaused(paused: boolean): void {
  worldClock.manual = true;
  worldClock.paused = paused;
}
export function setTimeOfDay(t: number): void {
  worldClock.manual = true;
  worldClock.tod = wrap(t);
}
/** Salta a un momento del AÑO (estación) para previsualizarla en el panel de test (S2-B1). */
export function setTimeOfYear(toy: number): void {
  worldClock.manual = true;
  worldClock.toy = wrap(toy);
}
export function resetClock(): void {
  worldClock.manual = false;
  worldClock.paused = false;
  worldClock.scale = 1;
}
