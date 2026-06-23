'use client';

/**
 * Preferencia de "movimiento reducido" legible en useFrame, FUERA de React (igual que
 * worldClock/atmo/perfStore). El ThemeProvider de @osia/ui cubre la UI HTML; pero los
 * loops del mundo viven dentro del Canvas (otro reconciler R3F) donde el contexto React
 * NO cruza, así que aquí se lee un singleton reactivo a `prefers-reduced-motion` (§9).
 */
let reduced = false;

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  reduced = mq.matches;
  mq.addEventListener('change', (e) => {
    reduced = e.matches;
  });
}

/** ¿El usuario/SO pidió menos movimiento? Los loops ambientales deben congelarse si es true. */
export function prefersReducedMotion(): boolean {
  return reduced;
}
