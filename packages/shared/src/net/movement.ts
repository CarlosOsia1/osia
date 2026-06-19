/**
 * Movimiento a pie — la MISMA función pura que corren el servidor (autoritativo)
 * y el cliente (predicción), para que coincidan (S0.4-H1, base de S0.5).
 *
 * El cliente NUNCA envía posiciones: envía intención (f, r, yaw). El servidor
 * (y el cliente, prediciendo) calcula la posición con esta función. Anti-cheat:
 * la velocidad la fija el servidor (MOVE_SPEED), el input se clampa a [-1, 1].
 */

import { MOVE_SPEED, GROUND_RADIUS } from './constants';

export type Vec2 = { x: number; z: number };

/** Intención de movimiento: f=adelante(+)/atrás(−), r=derecha(+)/izquierda(−), yaw=azimut de cámara. */
export type MoveInput = { f: number; r: number; yaw: number };

export function clampUnit(v: number): number {
  if (Number.isNaN(v)) return 0;
  return v < -1 ? -1 : v > 1 ? 1 : v;
}

/**
 * Avanza `pos` en el plano según el input y el dt (segundos). Muta `pos`.
 * Mismo esquema que el controlador del cliente: dirección relativa al yaw de cámara.
 */
export function applyMovement(pos: Vec2, input: MoveInput, dt: number): void {
  const f = clampUnit(input.f);
  const r = clampUnit(input.r);
  if (f === 0 && r === 0) return;

  const sin = Math.sin(input.yaw);
  const cos = Math.cos(input.yaw);
  // "hacia adentro" (lejos de la cámara) y derecha
  const fwdX = -sin;
  const fwdZ = -cos;
  const rightX = -fwdZ;
  const rightZ = fwdX;

  let mx = fwdX * f + rightX * r;
  let mz = fwdZ * f + rightZ * r;
  const len = Math.hypot(mx, mz);
  if (len === 0) return;
  mx /= len;
  mz /= len;

  pos.x += mx * MOVE_SPEED * dt;
  pos.z += mz * MOVE_SPEED * dt;

  // mantener dentro del claro
  const d = Math.hypot(pos.x, pos.z);
  if (d > GROUND_RADIUS) {
    pos.x *= GROUND_RADIUS / d;
    pos.z *= GROUND_RADIUS / d;
  }
}
