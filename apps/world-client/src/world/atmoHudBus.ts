'use client';

/**
 * Bus del "HUD que respira el cielo" (S2-A1). Lee el cielo vigente (atmo.current) y escribe las
 * variables --atmo-* en :root por DOM, FUERA del ciclo de React (sin re-render, §7), con throttle
 * y diff (no escribe si no cambió perceptiblemente). El mapeo puro vive en @osia/atmosphere
 * (resolveHudAtmo, testeado); aquí solo el efecto de borde sobre el DOM.
 *
 * El suavizado lo hace una transición CSS gated a `prefers-reduced-motion: no-preference`, así
 * que con movimiento reducido los valores se asignan directo, sin animación (§9).
 */

import { resolveHudAtmo, type AtmosphereParams } from '@osia/atmosphere';

const THROTTLE_MS = 250; // ~4 escrituras/s como mucho; el cielo cambia lentísimo

let lastWrite = 0;
let lastTint = '';
let lastGlow = '';
let lastContrast = '';

/** Llamar cada frame con el cielo vigente; el throttle/diff evita escrituras innecesarias. */
export function tickAtmoHud(p: AtmosphereParams, nowMs: number): void {
  if (typeof document === 'undefined') return;
  if (nowMs - lastWrite < THROTTLE_MS) return;
  lastWrite = nowMs;

  const v = resolveHudAtmo(p);
  const contrast = String(v.contrast);
  if (v.tint === lastTint && v.glow === lastGlow && contrast === lastContrast) return;

  const root = document.documentElement.style;
  root.setProperty('--atmo-tint', v.tint);
  root.setProperty('--atmo-glow', v.glow);
  root.setProperty('--atmo-contrast', contrast);
  lastTint = v.tint;
  lastGlow = v.glow;
  lastContrast = contrast;
}
