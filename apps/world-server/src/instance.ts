/**
 * Instancia (room) del mundo (S0.4-H3). Fase 0: un único Hub.
 *
 * La instancia es DUEÑA de su simulación: `step()` drena los inputs y aplica el MISMO
 * `applyMovement` de @osia/shared (autoritativo). También resuelve el AOI (interest
 * management) por viewer con histéresis, para filtrar qué entidades viajan en cada DELTA.
 */

import {
  applyMovement,
  INSTANCE_CAPACITY,
  AOI_ENTER_M,
  AOI_EXIT_M,
  type EntityState,
  type DeltaEntity,
} from '@osia/shared';

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

const AOI_ENTER_SQ = AOI_ENTER_M * AOI_ENTER_M;
const AOI_EXIT_SQ = AOI_EXIT_M * AOI_EXIT_M;

export class Instance {
  readonly id: string;
  readonly entities = new Map<number, EntityRuntime>();
  /** viewerId → ids de entidades actualmente visibles para ese viewer (AOI con histéresis). */
  private readonly visible = new Map<number, Set<number>>();
  private readonly scratch = { x: 0, z: 0 }; // reutilizado en step() (cero asignaciones/tick)

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
    this.visible.delete(id);
    for (const set of this.visible.values()) set.delete(id);
  }

  snapshot(): EntityState[] {
    return [...this.entities.values()].map((e) => ({ ...e.state }));
  }

  /** Avanza la simulación un tick: drena inputs por entidad y aplica `applyMovement`. */
  step(): void {
    for (const rt of this.entities.values()) {
      if (rt.inputs.length === 0) continue; // sin inputs este tick → la entidad no avanza
      rt.inputs.sort((a, b) => a.seq - b.seq);
      this.scratch.x = rt.state.x;
      this.scratch.z = rt.state.z;
      // Drena TODOS los inputs encolados con su propio dt (igual que el replay del cliente).
      for (const inp of rt.inputs) {
        applyMovement(this.scratch, inp, inp.dt);
        rt.lastSeq = inp.seq; // ackSeq = último seq procesado
        rt.state.yaw = inp.yaw;
      }
      rt.state.x = this.scratch.x;
      rt.state.z = this.scratch.z;
      rt.inputs.length = 0;
    }
  }

  /** Recalcula el AOI por viewer (histéresis: entra a AOI_ENTER, sale a AOI_EXIT). */
  updateVisibility(): void {
    const ents = [...this.entities.values()];
    for (const viewer of ents) {
      let set = this.visible.get(viewer.state.id);
      if (!set) {
        set = new Set<number>();
        this.visible.set(viewer.state.id, set);
      }
      for (const target of ents) {
        if (target.state.id === viewer.state.id) continue;
        const dx = target.state.x - viewer.state.x;
        const dz = target.state.z - viewer.state.z;
        const d2 = dx * dx + dz * dz;
        const radius = set.has(target.state.id) ? AOI_EXIT_SQ : AOI_ENTER_SQ;
        if (d2 <= radius) set.add(target.state.id);
        else set.delete(target.state.id);
      }
    }
  }

  /**
   * Entidades que van en el DELTA de `viewerId`: siempre la propia (el cliente lee su
   * estado autoritativo para reconciliar) + las visibles por AOI. En F0 el claro entero
   * cae dentro del AOI, así que no excluye a nadie; el mecanismo queda listo para hubs llenos.
   */
  visibleDeltaFor(viewerId: number): DeltaEntity[] {
    const set = this.visible.get(viewerId);
    const out: DeltaEntity[] = [];
    for (const e of this.entities.values()) {
      if (e.state.id === viewerId || !set || set.has(e.state.id)) {
        out.push({ id: e.state.id, x: e.state.x, z: e.state.z, yaw: e.state.yaw });
      }
    }
    return out;
  }
}
