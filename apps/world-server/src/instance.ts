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
  SIM_BANK_CAP_S,
  SIM_BANK_REFILL_RATE,
  TICK_MS,
  WORLD_OBSTACLES,
  type EntityId,
  type EntityState,
  type DeltaEntity,
} from '@osia/shared';

/** Input encolado del cliente (con su propio dt) — el tick los drena en orden de seq. */
export type QueuedInput = { seq: number; f: number; r: number; yaw: number; dt: number };

export type EntityRuntime = {
  state: EntityState;
  inputs: QueuedInput[]; // COLA de inputs pendientes (por seq); se procesa hasta el crédito por tick
  lastSeq: number; // último seq PROCESADO = ackSeq → reconciliación con input replay
  simBank: number; // crédito de tiempo simulado (token bucket anti speed-hack, QA M5)
  token: string; // resume token: re-adoptar la entidad en una reconexión (grace window)
  disconnected: boolean; // true mientras espera reconexión (no la borramos de inmediato)
  voiceFlags: number; // último estado de voz (mic/hablando/sordo) → sync al que entra
  presenceSessionId: string | null; // fila de world.presence_sessions (S1.8-H2b); null si anónimo/sin DB
};

const AOI_ENTER_SQ = AOI_ENTER_M * AOI_ENTER_M;
const AOI_EXIT_SQ = AOI_EXIT_M * AOI_EXIT_M;

export class Instance {
  readonly id: string;
  readonly entities = new Map<EntityId, EntityRuntime>();
  /** viewerId → ids de entidades actualmente visibles para ese viewer (AOI con histéresis). */
  private readonly visible = new Map<EntityId, Set<EntityId>>();
  private readonly scratch = { x: 0, z: 0, vx: 0, vz: 0 }; // reutilizado en step() (cero asignaciones/tick)
  /** Buffer reutilizado por visibleDeltaFor (§7: cero asignaciones/tick con roster estable). */
  private readonly deltaScratch: DeltaEntity[] = [];

  constructor(id: string) {
    this.id = id;
  }

  get full(): boolean {
    return this.entities.size >= INSTANCE_CAPACITY;
  }

  add(
    id: EntityId,
    handle: string,
    accentColor: string,
    spawn: { x: number; z: number },
    token: string,
  ): EntityRuntime {
    const rt: EntityRuntime = {
      state: { id, handle, accentColor, x: spawn.x, z: spawn.z, yaw: 0, vx: 0, vz: 0 },
      inputs: [],
      lastSeq: 0,
      simBank: SIM_BANK_CAP_S, // arranca lleno: los primeros inputs entran sin espera
      token,
      disconnected: false,
      voiceFlags: 0,
      presenceSessionId: null,
    };
    this.entities.set(id, rt);
    return rt;
  }

  remove(id: EntityId): void {
    this.entities.delete(id);
    this.visible.delete(id);
    for (const set of this.visible.values()) set.delete(id);
  }

  snapshot(): EntityState[] {
    return [...this.entities.values()].map((e) => ({ ...e.state }));
  }

  /** Avanza la simulación un tick: procesa inputs por entidad hasta el crédito del token bucket. */
  step(): void {
    for (const rt of this.entities.values()) {
      // Refill del crédito de simulación SIEMPRE (aunque no haya inputs): el bucket sigue el reloj
      // del server, no la llegada de paquetes.
      rt.simBank = Math.min(SIM_BANK_CAP_S, rt.simBank + (TICK_MS / 1000) * SIM_BANK_REFILL_RATE);
      if (rt.inputs.length === 0) continue; // sin inputs este tick → la entidad no avanza
      rt.inputs.sort((a, b) => a.seq - b.seq);
      this.scratch.x = rt.state.x;
      this.scratch.z = rt.state.z;
      this.scratch.vx = rt.state.vx;
      this.scratch.vz = rt.state.vz;
      // Procesa inputs EN ORDEN con su propio dt (igual que el replay del cliente) MIENTRAS alcance
      // el crédito; lo que no alcanza QUEDA en cola para el próximo tick y NO se ackea (QA M5).
      // Honesto con hitch/ráfaga TCP: nada se descarta (se difiere 1-2 ticks, sin snap). Tramposo
      // con dt inflado sostenido: acotado a ~SIM_BANK_REFILL_RATE× tiempo real (antes sostenía 2×).
      let used = 0;
      for (const inp of rt.inputs) {
        if (inp.dt > rt.simBank) break; // sin crédito: este y los siguientes esperan al refill
        rt.simBank -= inp.dt;
        applyMovement(this.scratch, inp, inp.dt, WORLD_OBSTACLES);
        rt.lastSeq = inp.seq; // ackSeq = último seq PROCESADO
        rt.state.yaw = inp.yaw;
        used++;
      }
      if (used > 0) {
        // Conserva el excedente al frente de la cola SIN asignar (§7): compacta in-place.
        if (used < rt.inputs.length) rt.inputs.copyWithin(0, used);
        rt.inputs.length -= used;
        rt.state.x = this.scratch.x;
        rt.state.z = this.scratch.z;
        rt.state.vx = this.scratch.vx;
        rt.state.vz = this.scratch.vz;
      }
    }
  }

  /** Recalcula el AOI por viewer (histéresis: entra a AOI_ENTER, sale a AOI_EXIT). */
  updateVisibility(): void {
    // §7: cero asignaciones por tick — se itera el Map directo (el bucle interno muta `this.visible`,
    // no `this.entities`, así que doble-iterar sus values es seguro y evita el spread por tick).
    for (const viewer of this.entities.values()) {
      let set = this.visible.get(viewer.state.id);
      if (!set) {
        set = new Set<EntityId>();
        this.visible.set(viewer.state.id, set);
      }
      for (const target of this.entities.values()) {
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
  visibleDeltaFor(viewerId: EntityId): DeltaEntity[] {
    const set = this.visible.get(viewerId);
    // Reutiliza el buffer + los objetos DeltaEntity (cero asignaciones/tick con roster estable, §7).
    // El consumidor (loop: encode) lee el array SINCRÓNICAMENTE antes de la próxima llamada.
    const out = this.deltaScratch;
    let n = 0;
    for (const e of this.entities.values()) {
      if (e.state.id === viewerId || !set || set.has(e.state.id)) {
        const slot = out[n];
        if (slot === undefined) {
          out[n] = {
            id: e.state.id,
            x: e.state.x,
            z: e.state.z,
            yaw: e.state.yaw,
            vx: e.state.vx,
            vz: e.state.vz,
          };
        } else {
          slot.id = e.state.id;
          slot.x = e.state.x;
          slot.z = e.state.z;
          slot.yaw = e.state.yaw;
          slot.vx = e.state.vx;
          slot.vz = e.state.vz;
        }
        n++;
      }
    }
    out.length = n; // recorta al conteo real (mantiene la capacidad para el siguiente tick)
    return out;
  }
}
