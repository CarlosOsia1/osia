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

let cachedToy = Number.NaN;
let cached: SeasonTints | null = null;

/** Tintes de la estación vigente, cacheados POR FRAME (una resolución aunque lo llamen N meshes). */
export function currentSeasonTints(): SeasonTints {
  if (worldClock.toy !== cachedToy || cached === null) {
    cached = resolveSeasonTints(worldClock.toy);
    cachedToy = worldClock.toy;
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
