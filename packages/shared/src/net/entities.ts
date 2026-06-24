/**
 * Entidades del mundo en el cable (S0.4-H1). Separado de `messages.ts` para que el
 * contrato `net/{opcodes,messages,entities,codec}` sea explícito (docs/10).
 */

import type { EntityId } from '../domain/ids';

/** Estado completo de una entidad (jugador). F0: posición + yaw. F1 (S1.8-H2): acento del pasaporte
 *  (identidad visible). Se envía en WELCOME/ENTITY_JOIN (cold path), NO en el DELTA por tick. */
export type EntityState = {
  id: EntityId;
  handle: string;
  /** Color de acento del residente (hex de la paleta de marca); tinte de avatar + nameplate. */
  accentColor: string;
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
