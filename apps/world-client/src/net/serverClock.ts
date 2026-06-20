/**
 * serverClock — reloj sincronizado con el SERVER (para que todos vean el MISMO momento
 * atmosférico). El NetClient mide el offset (server − cliente) por PING/PONG y lo reporta
 * aquí (EWMA suave); worldClockRuntime deriva la hora del día desde `serverNow()`.
 *
 * Sin sincronizar (offline o antes del primer PONG) el offset es 0 → equivale a la hora
 * local (comportamiento previo).
 */

let offset = 0; // ms: serverNow ≈ Date.now() + offset
let inited = false;

/** Reporta una muestra de offset (raw). `reset` la fija directo (estimación inicial). */
export function reportServerOffset(raw: number, reset = false): void {
  offset = reset || !inited ? raw : offset * 0.8 + raw * 0.2; // EWMA → estable ante jitter
  inited = true;
}

/** Hora "del servidor" estimada (ms). Igual para todos los clientes sincronizados. */
export function serverNow(): number {
  return Date.now() + offset;
}
