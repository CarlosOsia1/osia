import * as THREE from 'three';
import { mulberry32 } from '@osia/atmosphere';
import { GROUND_RADIUS, WORLD_OBSTACLES } from '@osia/shared';

/**
 * Terreno del claro (Ola 2 M2) — relieve low-poly + scatter DETERMINISTA.
 *
 * El disco liso de F0 gana ondulación sutil (paralaje y sensación de velocidad al caminar) sin
 * tocar el gameplay: la simulación compartida sigue siendo 2D (x, z) y `terrainHeight` solo viste
 * la escena (avatares, árboles, pasto y rocas se posan sobre la misma altura). Todo es puro y
 * sembrado (sin `Math.random`, §1.3): cada residente ve EXACTAMENTE el mismo claro.
 *
 * La paleta no cambia (atmósfera CONGELADA): el suelo conserva su material/tinte de estación; el
 * scatter se tiñe por `tintBySeason` ('foliage' el pasto, 'ground' la roca) como manda §6.
 */

export const TERRAIN = {
  /** Radio visual del disco (== al Ground de F0). */
  discRadius: 26,
  /** Resolución del relieve (anillos × segmentos). ~2.9k triángulos: presupuesto §7 intacto. */
  rings: 26,
  segments: 56,
  /** La plaza del monolito queda PLANA (punto focal y de reunión). */
  plazaRadius: 2.6,
  plazaFalloff: 6,
  /** Amplitud de la ondulación dentro del claro (sutil a propósito: se camina, no se escala). */
  walkAmp: 0.34,
  /** Desde el borde jugable, el terreno se levanta y cierra el claro como un valle. */
  rimAmp: 1.15,
} as const;

/** smoothstep clásico (0 en `a`, 1 en `b`). */
function smoothstep(a: number, b: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Altura del terreno en (x, z) — pura y determinista (suma de senos a frecuencias inconmensurables:
 * ondulación orgánica sin PRNG). Plana en la plaza del monolito; sube suave hacia el borde.
 */
export function terrainHeight(x: number, z: number): number {
  const d = Math.sqrt(x * x + z * z);
  const waves =
    Math.sin(x * 0.24 + z * 0.15) * 0.45 +
    Math.sin(x * 0.11 - z * 0.29 + 2.1) * 0.35 +
    Math.sin((x + z) * 0.31 + 4.0) * 0.2;
  const plaza = smoothstep(TERRAIN.plazaRadius, TERRAIN.plazaFalloff, d);
  const rim = smoothstep(GROUND_RADIUS, TERRAIN.discRadius, d);
  return waves * TERRAIN.walkAmp * plaza + rim * rim * TERRAIN.rimAmp;
}

/**
 * Disco de terreno desplazado, NO indexado (cada cara con su normal plana → facetas low-poly
 * honestas con flatShading). Malla polar: anillos concéntricos × segmentos.
 */
export function buildGroundGeometry(): THREE.BufferGeometry {
  const { rings, segments, discRadius } = TERRAIN;
  const positions: number[] = [];

  const px = (ring: number, seg: number): [number, number, number] => {
    const r = (ring / rings) * discRadius;
    const a = (seg / segments) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    return [x, terrainHeight(x, z), z];
  };

  for (let ring = 0; ring < rings; ring++) {
    for (let seg = 0; seg < segments; seg++) {
      const a = px(ring, seg);
      const b = px(ring + 1, seg);
      const c = px(ring + 1, seg + 1);
      const d = px(ring, seg + 1);
      // Orden CCW visto desde +Y (la cámara mira el suelo desde arriba). En ring 0, `a` y `d`
      // son el MISMO punto (el centro): el abanico (a,c,b) se emite SIEMPRE y el triángulo que
      // degeneraría (a,d,c) se omite — al revés deja un agujero de 1 m en la plaza (QA M4).
      positions.push(...a, ...c, ...b);
      if (ring > 0) positions.push(...a, ...d, ...c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals(); // no indexado → normal por cara (flat)
  return geo;
}

export type ScatterInstance = {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotY: number;
  /** Inclinación leve (pasto vivo, rocas asentadas). */
  tiltX: number;
  tiltZ: number;
};

const SCATTER = {
  grassSeed: 0x05ca7,
  grassCount: 700,
  grassMin: 2.8, // fuera de la plaza
  grassMax: 25.2,
  rockSeed: 0x0c0de,
  rockCount: 48,
  rockMin: 3.4,
  rockMax: 24.5,
} as const;

/** ¿(x,z) pisa un obstáculo? (tronco/monolito — el pasto no nace dentro de un árbol). */
function onObstacle(x: number, z: number, margin: number): boolean {
  for (const o of WORLD_OBSTACLES) {
    const dx = x - o.x;
    const dz = z - o.z;
    const clear = o.radius * margin;
    if (dx * dx + dz * dz < clear * clear) return true;
  }
  return false;
}

/** Puntos sembrados con densidad radial uniforme (r por √u), evitando obstáculos. Determinista. */
function scatter(
  seed: number,
  count: number,
  rMin: number,
  rMax: number,
  obstacleMargin: number,
  scaleMin: number,
  scaleMax: number,
  tiltAmp: number,
): ScatterInstance[] {
  const rng = mulberry32(seed);
  const out: ScatterInstance[] = [];
  let guard = count * 12; // rechazo acotado: nunca cuelga aunque cambie el layout
  while (out.length < count && guard-- > 0) {
    const r = Math.sqrt(rng()) * (rMax - rMin) + rMin;
    const a = rng() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (onObstacle(x, z, obstacleMargin)) continue;
    out.push({
      x,
      // Asentado 4 cm: la altura analítica difiere de la malla FACETADA hasta ~10 cm en las celdas
      // grandes de la rima — hundirse un pelo se ve natural; flotar se ve roto (QA M4).
      y: terrainHeight(x, z) - 0.04,
      z,
      scale: scaleMin + rng() * (scaleMax - scaleMin),
      rotY: rng() * Math.PI * 2,
      tiltX: (rng() - 0.5) * 2 * tiltAmp,
      tiltZ: (rng() - 0.5) * 2 * tiltAmp,
    });
  }
  return out;
}

/** Matas de pasto (briznas low-poly). Se tiñen con la estación ('foliage'). */
export function grassInstances(): ScatterInstance[] {
  return scatter(SCATTER.grassSeed, SCATTER.grassCount, SCATTER.grassMin, SCATTER.grassMax, 0.9, 0.55, 1.25, 0.14);
}

/** Rocas menores (decorativas: el avatar pasa por encima, NO son obstáculos). Tinte 'ground'. */
export function rockInstances(): ScatterInstance[] {
  // margen 1.5×: la roca respira alrededor de troncos y monolito (no nace pegada a nada).
  return scatter(SCATTER.rockSeed, SCATTER.rockCount, SCATTER.rockMin, SCATTER.rockMax, 1.5, 0.28, 1, 0.1);
}
