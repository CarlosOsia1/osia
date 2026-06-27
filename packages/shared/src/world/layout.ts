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
 * coinciden. `dL`/`dC`/`dH` son el offset de COLOR por árbol (los usa el render); `scale` define el
 * tamaño y el footprint del obstáculo.
 */
export const FOREST_LAYOUT = {
  count: 14,
  seed: 0x051a3,
  ringRadiusBase: 7,
  ringRadiusStep: 1.8, // r = base + (i % 3) * step
  scaleMin: 0.75,
  scaleMax: 1.6,
  // Variación de color POR ÁRBOL, sobre el color de la estación, en OKLCH (perceptual) → natural,
  // no "solo brillo": unos pinos más claros/oscuros, unos más amarillentos, otros verde profundo,
  // otros apagados/oliva — sin salirse a rojo/azul. Determinista (sembrado) → todos ven lo mismo.
  // Estas son las perillas para afinar a ojo cuánta "vida" tiene el bosque:
  tintLight: 0.055, // ± luminosidad (OKLab L): rango entre el pino más oscuro y el más claro
  tintChromaMin: 0.9, // factor de croma mínimo (apagado/oliva) ..
  tintChromaMax: 1.58, //   .. máximo (verde más vivo)
  tintHueDeg: 20.8, // ± giro de matiz en grados (pequeño: amarillo-verde ↔ verde profundo)
  tintHueBiasDeg: -3, // sesgo del matiz hacia amarillo-verde (− = un punto más cálido/natural)
} as const;

/** Offset de color por árbol (perceptual, OKLCH): dL luminosidad, dC croma, dH matiz en grados. */
export type ForestTree = { x: number; z: number; scale: number; dL: number; dC: number; dH: number };

/** Cada pino (determinista, sembrado). El render arma el color desde dL/dC/dH; el server usa x/z/scale. */
export function forestTrees(): ForestTree[] {
  const F = FOREST_LAYOUT;
  const rng = mulberry32(F.seed);
  const out: ForestTree[] = [];
  for (let i = 0; i < F.count; i++) {
    const a = (i / F.count) * Math.PI * 2;
    const r = F.ringRadiusBase + (i % 3) * F.ringRadiusStep;
    const scale = F.scaleMin + rng() * (F.scaleMax - F.scaleMin);
    const dL = (rng() - 0.5) * 2 * F.tintLight;
    const dC = F.tintChromaMin + rng() * (F.tintChromaMax - F.tintChromaMin);
    const dH = (rng() - 0.5) * 2 * F.tintHueDeg + F.tintHueBiasDeg;
    out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, scale, dL, dC, dH });
  }
  return out;
}

/**
 * Radio del cono BASE del pino (el más ancho). FUENTE ÚNICA: el render lo usa como geometría del
 * cono base y el spawn como footprint del obstáculo — así no se desincronizan (DRY, §1.1-O).
 */
export const TREE_CONE_BASE_RADIUS = 0.9;

/** Monolito central (punto focal del claro). */
export const MONOLITH: Obstacle = { x: 0, z: 0, radius: 1.6 };

/** Radio aproximado del avatar: holgura para no spawnear pegado a un obstáculo. */
export const PLAYER_RADIUS = 0.6;

/** Todos los obstáculos sólidos del mundo (para la seguridad de spawn). */
export function worldObstacles(): Obstacle[] {
  // footprint de la copa ≈ radio del cono base × escala del árbol (mismo valor que el render).
  const trees = forestTrees().map((t) => ({ x: t.x, z: t.z, radius: TREE_CONE_BASE_RADIUS * t.scale }));
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
