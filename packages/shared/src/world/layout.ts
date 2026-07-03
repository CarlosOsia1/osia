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
 * Radio del cono BASE del pino (el más ancho) — SOLO para el RENDER (geometría de la copa).
 * La COLISIÓN usa un radio menor a propósito (abajo): puedes «meterte un poquito entre las
 * hojas» (game-feel pedido por Carlos, Ola 2 M5) sin atravesar el tronco.
 */
export const TREE_CONE_BASE_RADIUS = 0.9;

/**
 * Radio de COLISIÓN del pino por unidad de escala: entre el tronco (0.16) y la copa (0.9).
 * Con el radio del jugador, el pino chico (escala 0.75) se toca justo en el borde de su copa y
 * el grande (1.6) deja entrar ~0.4 m entre las hojas antes de frenar.
 */
export const TREE_COLLISION_RADIUS = 0.42;

/** Monolito central (punto focal). Radio de colisión ≈ su silueta real (icosaedro r1 a la altura
 *  del pecho): se puede LLEGAR a tocarlo, no atravesarlo (M5). */
export const MONOLITH: Obstacle = { x: 0, z: 0, radius: 1.05 };

/** Radio de colisión del avatar (el manto mide 0.5 de base; 0.35 deja acercarse de verdad). */
export const PLAYER_RADIUS = 0.35;

/** Todos los obstáculos sólidos del mundo (colisión de la simulación + seguridad de spawn). */
export function worldObstacles(): Obstacle[] {
  // footprint de COLISIÓN (menor que la copa visual: el game-feel manda, ver TREE_COLLISION_RADIUS).
  const trees = forestTrees().map((t) => ({ x: t.x, z: t.z, radius: TREE_COLLISION_RADIUS * t.scale }));
  return [...trees, MONOLITH];
}

/**
 * Lista CANÓNICA e inmutable de obstáculos, computada una vez por proceso (determinista por seed):
 * la comparten la simulación del server y la predicción del cliente (Ola 2 M1) — misma referencia
 * en los hot paths, cero re-alocación por tick/frame.
 */
export const WORLD_OBSTACLES: readonly Obstacle[] = worldObstacles();

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
 * ¿La posición GUARDADA de una entidad sigue siendo tenible? (spawn-safety del RESUME). A
 * diferencia de `isSpawnClear` (estricta, para elegir puntos NUEVOS), esta tolera las posiciones
 * que la propia física produce: el clamp del borde deja al jugador EXACTAMENTE en GROUND_RADIUS y
 * el push-out de un obstáculo lo deja a 1 ulp DENTRO del círculo inflado — reubicar ahí
 * teletransportaba a un jugador legítimo que refrescaba pegado a un árbol o al borde (QA M5).
 * Solo se reubica ante penetración REAL (posición corrupta de datos viejos).
 */
export function isPositionTenable(x: number, z: number): boolean {
  const d2 = x * x + z * z;
  const rim = GROUND_RADIUS + 0.01;
  if (d2 > rim * rim) return false;
  for (const o of WORLD_OBSTACLES) {
    const dx = x - o.x;
    const dz = z - o.z;
    const clear = o.radius + PLAYER_RADIUS - 0.05; // 5 cm de tolerancia (el slide roza el borde)
    if (clear > 0 && dx * dx + dz * dz < clear * clear) return false;
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
