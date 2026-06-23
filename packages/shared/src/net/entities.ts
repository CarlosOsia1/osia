/**
 * Entidades del mundo en el cable (S0.4-H1). Separado de `messages.ts` para que el
 * contrato `net/{opcodes,messages,entities,codec}` sea explícito (docs/10).
 */

import type { EntityId } from '../domain/ids';

/** Estado completo de una entidad (jugador). Fase 0: posición en el plano + yaw. */
export type EntityState = {
  id: EntityId;
  handle: string;
  x: number;
  z: number;
  yaw: number;
};

/** Entidad en el hot path (DELTA): SIN handle — el nombre no cambia, no se reenvía cada tick. */
export type DeltaEntity = {
  id: EntityId;
  x: number;
  z: number;
  yaw: number;
};
