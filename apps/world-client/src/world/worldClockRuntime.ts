/**
 * Reloj del mundo en runtime. Por defecto DETERMINISTA (20 min/ciclo, igual para
 * todos). El panel de test puede tomar el control para acelerar/pausar/scrubear
 * (modo `manual`); "tiempo real" lo devuelve a determinista.
 */

import { timeOfDayAt, CYCLE_SECONDS } from '@osia/atmosphere';
import { serverNow } from '../net/serverClock';

const wrap = (t: number) => ((t % 1) + 1) % 1;

export const worldClock = {
  tod: timeOfDayAt(serverNow(), CYCLE_SECONDS),
  scale: 1,
  paused: false,
  manual: false,
};

export function tickWorldClock(deltaSec: number): void {
  if (!worldClock.manual) {
    // Hora del SERVER → todos los clientes ven el MISMO momento del ciclo día/noche.
    worldClock.tod = timeOfDayAt(serverNow(), CYCLE_SECONDS);
    return;
  }
  if (worldClock.paused) return;
  worldClock.tod = wrap(worldClock.tod + (deltaSec / CYCLE_SECONDS) * worldClock.scale);
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
export function resetClock(): void {
  worldClock.manual = false;
  worldClock.paused = false;
  worldClock.scale = 1;
}
