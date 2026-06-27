'use client';

import * as THREE from 'three';
import { resolveSeasonTints, SEASON_STRENGTH, type SeasonSurface, type SeasonTints } from '@osia/atmosphere';
import { worldClock } from './worldClockRuntime';

/**
 * Tinte estacional de la ESCENA (S2-B1). Cualquier mesh del mundo (suelo, árboles, y lo que se
 * agregue a futuro: más pasto, arbustos, props…) "respira" la estación con UNA línea en su
 * useFrame. La estación se deriva del reloj (worldClock.toy), igual que el cielo → coherente.
 *
 * Uso (en un useFrame):
 *   const base = useMemo(() => new THREE.Color('#1d2a24'), []); // color natural, sin estación
 *   useFrame(() => tintBySeason(material, base, 'ground'));
 *
 * Para teñir varios materiales (p. ej. todas las copas de un InstancedMesh), pasa el mismo
 * `surface`. Las superficies viven en @osia/atmosphere (SeasonSurface); agregar una es un dato.
 */

const TMP = new THREE.Color();

// La estación cambia lentísimo (un "año" dura días reales), así que CUANTIZAMOS el timeOfYear para la
// clave de caché: el reloj avanza un float distinto cada frame, pero re-resolver los tintes (asigna
// objeto + arrays vía lerpRGB) por un cambio imperceptible viola §7 «cero asignaciones en el hot
// path». Con este paso se re-resuelve ~cada minuto real de juego; el color sigue cambiando continuo.
const TOY_CACHE_QUANTUM = 1e-4; // ~0.04 días de juego por paso (imperceptible)

let cachedQuantum = Number.NaN;
let cached: SeasonTints | null = null;

/** Tintes de la estación vigente, cacheados (una resolución por paso de tiempo, no por frame). */
export function currentSeasonTints(): SeasonTints {
  const q = Math.round(worldClock.toy / TOY_CACHE_QUANTUM);
  if (q !== cachedQuantum || cached === null) {
    cached = resolveSeasonTints(worldClock.toy);
    cachedQuantum = q;
  }
  return cached;
}

/**
 * Tinta `material.color` mezclando su color natural (`base`) hacia el color de la estación para
 * esa `surface`, con la fuerza definida en SEASON_STRENGTH. Se aplica SIEMPRE (es color, no
 * movimiento: no se congela con prefers-reduced-motion).
 */
export function tintBySeason(
  material: THREE.MeshStandardMaterial,
  base: THREE.Color,
  surface: SeasonSurface,
): void {
  const tint = currentSeasonTints()[surface];
  TMP.setRGB(tint[0], tint[1], tint[2], THREE.SRGBColorSpace);
  material.color.copy(base).lerp(TMP, SEASON_STRENGTH[surface]);
}
