/**
 * Movimiento a pie — la MISMA función pura que corren el servidor (autoritativo)
 * y el cliente (predicción), para que coincidan (S0.4-H1, base de S0.5; peso + colisión Ola 2 M1).
 *
 * El cliente NUNCA envía posiciones: envía intención (f, r, yaw). El servidor
 * (y el cliente, prediciendo) integra velocidad y posición con esta función. Anti-cheat:
 * velocidad/aceleración/frenado los fija el servidor (MOVE_*), el input se clampa a [-1, 1].
 */

import {
  MOVE_SPEED,
  MOVE_ACCEL,
  MOVE_BRAKE,
  MOVE_STOP_EPS,
  GROUND_RADIUS,
} from './constants';
import { PLAYER_RADIUS, type Obstacle } from '../world/layout';

export type Vec2 = { x: number; z: number };

/** Estado cinemático del jugador: posición + velocidad (m/s). Viaja completo en el DELTA (M1). */
export type MoveState = { x: number; z: number; vx: number; vz: number };

/** Intención de movimiento: f=adelante(+)/atrás(−), r=derecha(+)/izquierda(−), yaw=azimut de cámara. */
export type MoveInput = { f: number; r: number; yaw: number };

export function clampUnit(v: number): number {
  if (Number.isNaN(v)) return 0;
  return v < -1 ? -1 : v > 1 ? 1 : v;
}

/**
 * Avanza `state` (posición + velocidad) según el input y el dt (segundos). Muta `state`.
 * Locomoción con peso: la velocidad PERSIGUE a la velocidad objetivo (dirección del input ×
 * MOVE_SPEED, o cero al soltar) con Δv acotado por MOVE_ACCEL/MOVE_BRAKE; integra la posición
 * (Euler semi-implícito) y resuelve colisión de círculos contra `obstacles` (desliza, no rebota)
 * y contra el borde del claro. Determinista: mismo estado + inputs ⇒ mismo resultado en ambos lados.
 */
export function applyMovement(
  state: MoveState,
  input: MoveInput,
  dt: number,
  obstacles: readonly Obstacle[],
): void {
  // Defensa en profundidad: el codec ya rechaza INPUT con yaw/dtMs no finitos, pero esta función
  // es pura y compartida (la llaman también predicción y tests) — un dt/yaw no finito envenena el
  // estado sin retorno. Un no-op ante entrada corrupta preserva el invariante server-authoritative.
  if (!Number.isFinite(input.yaw) || !Number.isFinite(dt) || dt <= 0) return;
  const f = clampUnit(input.f);
  const r = clampUnit(input.r);
  const idle = f === 0 && r === 0;
  if (idle && state.vx === 0 && state.vz === 0) return; // quieto y sin inercia: nada que integrar

  // Velocidad objetivo: dirección relativa al yaw de cámara × MOVE_SPEED (cero si no hay input).
  let tvx = 0;
  let tvz = 0;
  if (!idle) {
    const sin = Math.sin(input.yaw);
    const cos = Math.cos(input.yaw);
    // "hacia adentro" (lejos de la cámara) y derecha
    const fwdX = -sin;
    const fwdZ = -cos;
    const rightX = -fwdZ;
    const rightZ = fwdX;
    let mx = fwdX * f + rightX * r;
    let mz = fwdZ * f + rightZ * r;
    const len = Math.sqrt(mx * mx + mz * mz);
    if (len > 0) {
      mx /= len;
      mz /= len;
      tvx = mx * MOVE_SPEED;
      tvz = mz * MOVE_SPEED;
    }
  }

  // La velocidad persigue a la objetivo con Δv acotado (peso). Frenar > acelerar: responde sin patinar.
  const dvx = tvx - state.vx;
  const dvz = tvz - state.vz;
  const dLen = Math.sqrt(dvx * dvx + dvz * dvz);
  const maxDv = (idle ? MOVE_BRAKE : MOVE_ACCEL) * dt;
  if (dLen <= maxDv) {
    state.vx = tvx;
    state.vz = tvz;
  } else {
    const s = maxDv / dLen;
    state.vx += dvx * s;
    state.vz += dvz * s;
  }

  // Sin input y casi parado: velocidad a CERO exacto (corta el drift subnormal y habilita el
  // early-out de arriba). El residuo descartado es < 0.02·dt m — imperceptible e idéntico en
  // servidor y cliente (determinista).
  if (idle && Math.sqrt(state.vx * state.vx + state.vz * state.vz) < MOVE_STOP_EPS) {
    state.vx = 0;
    state.vz = 0;
    return;
  }

  // Integración semi-implícita: la posición avanza con la velocidad YA actualizada (estable).
  state.x += state.vx * dt;
  state.z += state.vz * dt;

  resolveCollisions(state, obstacles);
}

/**
 * Colisión de círculos (jugador de radio PLAYER_RADIUS vs obstáculos): empuja fuera del solape y
 * proyecta la velocidad sobre la tangente (DESLIZAR, no rebotar — game-feel estándar). Dos pasadas
 * cubren la esquina entre obstáculos vecinos. Al final, el borde del claro también desliza.
 */
function resolveCollisions(state: MoveState, obstacles: readonly Obstacle[]): void {
  for (let pass = 0; pass < 2; pass++) {
    let pushed = false;
    for (const o of obstacles) {
      const minDist = o.radius + PLAYER_RADIUS;
      const dx = state.x - o.x;
      const dz = state.z - o.z;
      const d2 = dx * dx + dz * dz;
      if (d2 >= minDist * minDist) continue;
      const d = Math.sqrt(d2);
      // Centro exacto (d=0): normal fija determinista — mismo empuje en server y cliente.
      const nx = d > 0 ? dx / d : 1;
      const nz = d > 0 ? dz / d : 0;
      state.x = o.x + nx * minDist;
      state.z = o.z + nz * minDist;
      const vn = state.vx * nx + state.vz * nz;
      if (vn < 0) {
        state.vx -= vn * nx;
        state.vz -= vn * nz;
      }
      pushed = true;
    }
    if (!pushed) break;
  }

  // Mantener dentro del claro, deslizando por el borde (se anula la componente radial saliente).
  const d = Math.sqrt(state.x * state.x + state.z * state.z);
  if (d > GROUND_RADIUS) {
    const nx = state.x / d;
    const nz = state.z / d;
    state.x = nx * GROUND_RADIUS;
    state.z = nz * GROUND_RADIUS;
    const vn = state.vx * nx + state.vz * nz;
    if (vn > 0) {
      state.vx -= vn * nx;
      state.vz -= vn * nz;
    }
  }
}
