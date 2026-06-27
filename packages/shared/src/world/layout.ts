/**
 * Layout del mundo (obstáculos) — FUENTE ÚNICA para el render y el spawn (S2). El servidor lo usa
 * para aparecer al jugador en un punto DESPEJADO (nunca dentro de un árbol / monolito / barrera) y
 * para REUBICARLO si su posición guardada quedó obstruida; el cliente renderiza la vegetación desde
 * la misma data. Agregar un obstáculo a futuro (más árboles, props, muros) = añadirlo aquí, y tanto
 * el render como la seguridad de spawn lo respetan — sin duplicar ni desincronizar (§1.1-O, DRY).
 */

import { mulberry32 } from '@osia/atmosphere';
import { GROUND_RADIUS } from '../net/constants';

export type Obstacle = { x: number; z: number; radius: number };

/**
 * Bosquecillo: anillo de pinos, generado DETERMINISTA (PRNG sembrado mulberry32). FUENTE ÚNICA:
 * el cliente (Scene) renderiza desde aquí y el server evita estos árboles al spawnear → siempre
 * coinciden. `bright`/`warm` modulan el color (los usa el render); `scale` define el tamaño y el
 * footprint del obstáculo.
 */
export const FOREST_LAYOUT = {
  count: 14,
  seed: 0x051a3,
  ringRadiusBase: 7,
  ringRadiusStep: 1.8, // r = base + (i % 3) * step
  scaleMin: 0.75,
  scaleMax: 1.6,
  // Variación de color por árbol (multiplica al color de la estación): rango AMPLIO para que se
  // note — unos pinos claramente más oscuros que otros, y matiz cálido/frío variado → bosque natural.
  tintBrightMin: 0.45, // brillo mínimo (árbol oscuro) .. tintBrightMax (árbol claro)
  tintBrightMax: 1,
  tintWarmth: 0.22, // amplitud de matiz cálido(+)/frío(−) por árbol
} as const;

export type ForestTree = { x: number; z: number; scale: number; bright: number; warm: number };

/** Cada pino (determinista, sembrado). El render arma el color desde bright/warm; el server usa x/z/scale. */
export function forestTrees(): ForestTree[] {
  const F = FOREST_LAYOUT;
  const rng = mulberry32(F.seed);
  const out: ForestTree[] = [];
  for (let i = 0; i < F.count; i++) {
    const a = (i / F.count) * Math.PI * 2;
    const r = F.ringRadiusBase + (i % 3) * F.ringRadiusStep;
    const scale = F.scaleMin + rng() * (F.scaleMax - F.scaleMin);
    const bright = F.tintBrightMin + rng() * (F.tintBrightMax - F.tintBrightMin);
    const warm = (rng() - 0.5) * F.tintWarmth;
    out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, scale, bright, warm });
  }
  return out;
}

/** Monolito central (punto focal del claro). */
export const MONOLITH: Obstacle = { x: 0, z: 0, radius: 1.6 };

/** Radio aproximado del avatar: holgura para no spawnear pegado a un obstáculo. */
export const PLAYER_RADIUS = 0.6;

/** Todos los obstáculos sólidos del mundo (para la seguridad de spawn). */
export function worldObstacles(): Obstacle[] {
  // footprint de la copa ≈ radio del cono base (0.9) × escala del árbol.
  const trees = forestTrees().map((t) => ({ x: t.x, z: t.z, radius: 0.9 * t.scale }));
  return [...trees, MONOLITH];
}

/** ¿El punto (x,z) está 100% despejado? Dentro del claro y lejos de todo obstáculo. */
export function isSpawnClear(x: number, z: number): boolean {
  if (x * x + z * z > (GROUND_RADIUS - 1) * (GROUND_RADIUS - 1)) return false; // dentro del claro, con margen
  for (const o of worldObstacles()) {
    const dx = x - o.x;
    const dz = z - o.z;
    const clear = o.radius + PLAYER_RADIUS;
    if (dx * dx + dz * dz < clear * clear) return false;
  }
  return true;
}

/**
 * Punto de aparición DESPEJADO. Reparte por índice en el anillo interior del claro (entre el
 * monolito y el bosque, siempre libre); valida contra los obstáculos y busca otro ángulo/anillo si
 * hiciera falta (a futuro, con más obstáculos). Garantiza que nunca apareces trabado.
 */
export function safeSpawn(index: number): { x: number; z: number } {
  for (const ringR of [4, 4.8, 3.2, 5.4]) {
    for (let k = 0; k < 24; k++) {
      const a = (index * 0.61803 + k * 0.137) * Math.PI * 2; // dispersión "áurea" por índice
      const x = Math.cos(a) * ringR;
      const z = Math.sin(a) * ringR;
      if (isSpawnClear(x, z)) return { x, z };
    }
  }
  return { x: 0, z: 4 }; // fallback (el anillo interior siempre está despejado)
}
