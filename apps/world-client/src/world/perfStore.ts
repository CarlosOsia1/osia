/**
 * perfStore — store externo mínimo para las métricas de rendimiento (S0.2-H2).
 *
 * El probe (dentro del Canvas) escribe a ~5 Hz; el HUD (overlay HTML, fuera del
 * Canvas) se suscribe vía useSyncExternalStore. Evita re-render por frame: el
 * muestreo a 60 fps NO dispara React, solo la actualización throttleada.
 * Es un módulo singleton: el probe y el HUD comparten la misma instancia aunque
 * vivan en chunks distintos (webpack dedupe).
 */

export type PerfStats = {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  pixelRatio: number;
  backend: string;
};

const EMPTY: PerfStats = {
  fps: 0,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  pixelRatio: 1,
  backend: '—',
};

let current: PerfStats = EMPTY;
const listeners = new Set<() => void>();

export function setPerf(next: PerfStats): void {
  current = next;
  for (const l of listeners) l();
}

export function getPerf(): PerfStats {
  return current;
}

export function subscribePerf(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
