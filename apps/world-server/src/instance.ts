/**
 * Instancia (room) del mundo (S0.4-H3). Fase 0: un único Hub.
 * El estado vive en memoria del proceso; cada entidad guarda su último input,
 * que el loop de tick aplica con applyMovement.
 */

import { INSTANCE_CAPACITY, type EntityState, type MoveInput } from '@osia/shared';

export type EntityRuntime = {
  state: EntityState;
  input: MoveInput; // último input recibido; se aplica cada tick
  lastSeq: number; // última secuencia de input (para ackSeq → reconciliación S0.5)
};

export class Instance {
  readonly id: string;
  readonly entities = new Map<number, EntityRuntime>();

  constructor(id: string) {
    this.id = id;
  }

  get full(): boolean {
    return this.entities.size >= INSTANCE_CAPACITY;
  }

  add(id: number, handle: string, spawn: { x: number; z: number }): EntityRuntime {
    const rt: EntityRuntime = {
      state: { id, handle, x: spawn.x, z: spawn.z, yaw: 0 },
      input: { f: 0, r: 0, yaw: 0 },
      lastSeq: 0,
    };
    this.entities.set(id, rt);
    return rt;
  }

  remove(id: number): void {
    this.entities.delete(id);
  }

  snapshot(): EntityState[] {
    return [...this.entities.values()].map((e) => ({ ...e.state }));
  }
}
