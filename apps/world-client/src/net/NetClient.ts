/**
 * NetClient (S0.5) — cliente de presencia del mundo. Sin React.
 *
 * - Pide ticket (HTTP), abre WS, HELLO→WELCOME.
 * - Envía INPUT (intención f/r/yaw, nunca posiciones).
 * - Recibe DELTA: guarda el estado autoritativo de uno mismo (para reconciliación)
 *   y un buffer de muestras por entidad remota (para interpolación con render-delay).
 * - Reconexión con backoff exponencial; el heartbeat ping/pong lo maneja el
 *   navegador a nivel de protocolo.
 *
 * Las posiciones se leen por refs en useFrame (sin re-render); el store solo se
 * actualiza en cambios de roster/estado.
 */

import {
  encode,
  decode,
  C2S,
  S2C,
  PROTOCOL_VERSION,
  type S2CMessage,
} from '@osia/shared';
import { netConfig } from './config';
import { setNetState, type NetStatus } from './store';
import { applyServerAtmosphere } from '../world/atmosphereRuntime';

export type Sample = { t: number; x: number; z: number; yaw: number };
type Remote = { handle: string; buffer: Sample[] };

const HANDLES = ['Orión', 'Vega', 'Lyra', 'Altair', 'Sirio', 'Polaris', 'Rigel', 'Mira', 'Antares', 'Deneb'];
const BUFFER_MAX = 30;

function randomHandle(): string {
  const name = HANDLES[Math.floor(Math.random() * HANDLES.length)] ?? 'Viajero';
  return `${name}-${Math.floor(Math.random() * 90 + 10)}`;
}

export class NetClient {
  readonly handle = randomHandle();
  selfId: number | null = null;
  serverSelf: { x: number; z: number; yaw: number } | null = null;

  private ws: WebSocket | null = null;
  private wantConnected = false;
  private attempts = 0;
  private seq = 0;
  private epoch = 0; // invalida intentos de conexión en vuelo (StrictMode / carreras async)
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private remotes = new Map<number, Remote>();

  connect(): void {
    if (this.wantConnected) return;
    this.wantConnected = true;
    void this.open(++this.epoch);
  }

  disconnect(): void {
    this.wantConnected = false;
    this.epoch++; // cualquier open() en vuelo se aborta al volver de su await
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close();
    this.ws = null;
    this.selfId = null;
    this.serverSelf = null;
    this.remotes.clear();
    this.publish('idle');
  }

  private async open(myEpoch: number): Promise<void> {
    if (!this.wantConnected || myEpoch !== this.epoch) return;
    this.publish(this.attempts > 0 ? 'reconnecting' : 'connecting');
    try {
      const res = await fetch(`${netConfig.apiUrl}/world/tickets`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ worldId: 'osia', handle: this.handle }),
      });
      if (!res.ok) throw new Error(`ticket http ${res.status}`);
      const data = (await res.json()) as { ticket: string; wsUrl?: string };
      // Si llegó un disconnect o un open() más nuevo mientras pedíamos el ticket, abortar.
      if (!this.wantConnected || myEpoch !== this.epoch) return;

      const ws = new WebSocket(data.wsUrl ?? netConfig.wsUrl);
      this.ws = ws;
      ws.onopen = () => ws.send(encode({ op: C2S.HELLO, ticket: data.ticket, protocol: PROTOCOL_VERSION }));
      ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') this.onMessage(ev.data);
      };
      ws.onclose = () => {
        if (this.ws === ws) this.onClose(); // ignora el close de un socket ya reemplazado
      };
      ws.onerror = () => ws.close();
    } catch {
      if (myEpoch === this.epoch) this.scheduleReconnect();
    }
  }

  private onClose(): void {
    this.ws = null;
    if (this.wantConnected) this.scheduleReconnect();
    else this.publish('idle');
  }

  private scheduleReconnect(): void {
    this.attempts++;
    const delay = Math.min(8000, 500 * 2 ** Math.min(this.attempts, 4));
    this.publish('reconnecting');
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const ep = ++this.epoch;
    this.reconnectTimer = setTimeout(() => {
      if (this.wantConnected) void this.open(ep);
    }, delay);
  }

  private onMessage(raw: string): void {
    const msg = decode<S2CMessage>(raw);
    if (!msg) return;
    switch (msg.op) {
      case S2C.WELCOME: {
        this.selfId = msg.selfId;
        this.attempts = 0;
        this.remotes.clear();
        for (const e of msg.entities) {
          if (e.id === msg.selfId) this.serverSelf = { x: e.x, z: e.z, yaw: e.yaw };
          else this.remotes.set(e.id, { handle: e.handle, buffer: [{ t: performance.now(), x: e.x, z: e.z, yaw: e.yaw }] });
        }
        applyServerAtmosphere(msg.atmosphere.biome, msg.atmosphere.weather); // sync de clima al entrar
        this.publish('connected');
        break;
      }
      case S2C.DELTA: {
        const now = performance.now();
        for (const e of msg.entities) {
          if (e.id === this.selfId) {
            this.serverSelf = { x: e.x, z: e.z, yaw: e.yaw };
            continue;
          }
          let r = this.remotes.get(e.id);
          if (!r) {
            r = { handle: e.handle, buffer: [] };
            this.remotes.set(e.id, r);
            this.publish();
          }
          r.buffer.push({ t: now, x: e.x, z: e.z, yaw: e.yaw });
          if (r.buffer.length > BUFFER_MAX) r.buffer.shift();
        }
        break;
      }
      case S2C.ENTITY_JOIN: {
        const e = msg.entity;
        if (e.id !== this.selfId && !this.remotes.has(e.id)) {
          this.remotes.set(e.id, { handle: e.handle, buffer: [{ t: performance.now(), x: e.x, z: e.z, yaw: e.yaw }] });
          this.publish();
        }
        break;
      }
      case S2C.ENTITY_LEAVE: {
        if (this.remotes.delete(msg.id)) this.publish();
        break;
      }
      case S2C.ATMOSPHERE_UPDATE: {
        applyServerAtmosphere(msg.biome, msg.weather); // el server dicta el clima
        break;
      }
      default:
        break;
    }
  }

  sendInput(f: number, r: number, yaw: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.selfId === null) return;
    this.seq++;
    this.ws.send(encode({ op: C2S.INPUT, seq: this.seq, f, r, yaw }));
  }

  getRemoteIds(): number[] {
    return [...this.remotes.keys()];
  }

  /** Muestra interpolada de una entidad remota en `renderTime` (ms, performance.now). */
  sampleRemote(id: number, renderTime: number): Sample | null {
    const r = this.remotes.get(id);
    if (!r || r.buffer.length === 0) return null;
    const buf = r.buffer;
    const first = buf[0]!;
    if (renderTime <= first.t) return first;
    for (let i = 0; i < buf.length - 1; i++) {
      const a = buf[i]!;
      const b = buf[i + 1]!;
      if (renderTime >= a.t && renderTime <= b.t) {
        const span = Math.max(1, b.t - a.t);
        const k = (renderTime - a.t) / span;
        return { t: renderTime, x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, yaw: a.yaw + (b.yaw - a.yaw) * k };
      }
    }
    return buf[buf.length - 1]!; // clamp al último (sin extrapolar)
  }

  private publish(status?: NetStatus): void {
    const remotes = [...this.remotes.entries()].map(([id, r]) => ({ id, handle: r.handle }));
    setNetState({
      ...(status ? { status } : {}),
      selfId: this.selfId,
      remotes,
      count: remotes.length + (this.selfId !== null ? 1 : 0),
    });
  }
}
