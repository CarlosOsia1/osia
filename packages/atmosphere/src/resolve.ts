/**
 * resolveAtmosphere — función PURA: dado timeOfDay (0..1) y un ciclo de keyframes,
 * devuelve los AtmosphereParams interpolados. Idéntica en cliente y servidor →
 * casi no hay que transmitir nada (determinismo). (S0.7-H1)
 */

import { lerp, smoothstep } from './math';
import { lerpRGB } from './color';
import type { AtmosphereParams, AtmosphereKeyframe, Vec3 } from './types';

const norm = (v: Vec3): Vec3 => {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
};

/** Dirección hacia el sol según la hora: sale por el este, cenit a mediodía, se pone al oeste. */
export function sunDirFor(t: number): Vec3 {
  const angle = (t - 0.25) * Math.PI * 2; // 0 al amanecer, π/2 mediodía, π atardecer
  return norm([Math.cos(angle), Math.sin(angle), 0.35]);
}

/** La luna, opuesta al sol (arriba de noche). */
export function moonDirFor(t: number): Vec3 {
  const angle = (t - 0.25) * Math.PI * 2;
  return norm([-Math.cos(angle), -Math.sin(angle), -0.35]);
}

export function lerpParams(a: AtmosphereParams, b: AtmosphereParams, k: number): AtmosphereParams {
  return {
    skyTop: lerpRGB(a.skyTop, b.skyTop, k),
    skyHorizon: lerpRGB(a.skyHorizon, b.skyHorizon, k),
    fogColor: lerpRGB(a.fogColor, b.fogColor, k),
    fogDensity: lerp(a.fogDensity, b.fogDensity, k),
    sunDir: a.sunDir, // sustituido por sunDirFor en resolveAtmosphere
    sunColor: lerpRGB(a.sunColor, b.sunColor, k),
    sunIntensity: lerp(a.sunIntensity, b.sunIntensity, k),
    moonDir: a.moonDir,
    moonColor: lerpRGB(a.moonColor, b.moonColor, k),
    moonIntensity: lerp(a.moonIntensity, b.moonIntensity, k),
    ambientColor: lerpRGB(a.ambientColor, b.ambientColor, k),
    ambientIntensity: lerp(a.ambientIntensity, b.ambientIntensity, k),
    exposure: lerp(a.exposure, b.exposure, k),
    bloom: lerp(a.bloom, b.bloom, k),
    starsIntensity: lerp(a.starsIntensity, b.starsIntensity, k),
  };
}

export function resolveAtmosphere(t: number, cycle: AtmosphereKeyframe[]): AtmosphereParams {
  const tt = ((t % 1) + 1) % 1;
  const n = cycle.length;
  const first = cycle[0]!;
  const last = cycle[n - 1]!;

  let a: AtmosphereKeyframe;
  let b: AtmosphereKeyframe;
  let k: number;

  if (tt >= last.t || tt < first.t) {
    // segmento que envuelve (último → primero)
    a = last;
    b = first;
    const span = 1 - last.t + first.t;
    const local = tt >= last.t ? tt - last.t : 1 - last.t + tt;
    k = span > 0 ? local / span : 0;
  } else {
    a = first;
    b = first;
    k = 0;
    for (let i = 0; i < n - 1; i++) {
      const cur = cycle[i]!;
      const nxt = cycle[i + 1]!;
      if (tt >= cur.t && tt < nxt.t) {
        a = cur;
        b = nxt;
        k = (tt - cur.t) / (nxt.t - cur.t);
        break;
      }
    }
  }

  const params = lerpParams(a.params, b.params, smoothstep(k));
  return { ...params, sunDir: sunDirFor(tt), moonDir: moonDirFor(tt) };
}
