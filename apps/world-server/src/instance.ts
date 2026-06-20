/**
 * Instancia (room) del mundo (S0.4-H3). Fase 0: un único Hub.
 * El estado vive en memoria del proceso; cada entidad guarda su último input,
 * que el loop de tick aplica con applyMovement.
 */

import { INSTANCE_CAPACITY, type EntityState } from '@osia/shared';

/** Input encolado del cliente (con su propio dt) — el tick los drena en orden de seq. */
export type QueuedInput = { seq: number; f: number; r: number; yaw: number; dt: number };

export type EntityRuntime = {
  state: EntityState;
  inputs: QueuedInput[]; // COLA de inputs pendientes (por seq); se drena cada tick
  lastSeq: number; // último seq drenado = ackSeq → reconciliación con input replay
  token: string; // resume token: re-adoptar la entidad en una reconexión (grace window)
  disconnected: boolean; // true mientras espera reconexión (no la borramos de inmediato)
  voiceFlags: number; // último estado de voz (mic/hablando/sordo) → sync al que entra
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

  add(id: number, handle: string, spawn: { x: number; z: number }, token: string): EntityRuntime {
    const rt: EntityRuntime = {
      state: { id, handle, x: spawn.x, z: spawn.z, yaw: 0 },
      inputs: [],
      lastSeq: 0,
      token,
      disconnected: false,
      voiceFlags: 0,
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
