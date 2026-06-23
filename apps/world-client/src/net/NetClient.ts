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
  ErrorCode,
  normalizeChat,
  PROTOCOL_VERSION,
  MAX_VOICE_PAYLOAD_BYTES,
  asEntityId,
  type S2CMessage,
  type VoiceSignalKind,
} from '@osia/shared';
import { netConfig } from './config';
import {
  setNetState,
  pushChatMessage,
  setChatNotice,
  setVoiceFlags,
  clearRemote,
  resetAux,
  type NetStatus,
} from './store';
import { applyServerAtmosphere } from '../world/atmosphereRuntime';
import { reportServerOffset } from './serverClock';

export type Sample = { t: number; x: number; z: number; yaw: number };
type Remote = { handle: string; buffer: Sample[] };

const HANDLES = [
  'Orión',
  'Vega',
  'Lyra',
  'Altair',
  'Sirio',
  'Polaris',
  'Rigel',
  'Mira',
  'Antares',
  'Deneb',
];
const BUFFER_MAX = 30;
const voiceEnc = new TextEncoder(); // para medir el tamaño en bytes del payload de voz

function randomHandle(): string {
  const name = HANDLES[Math.floor(Math.random() * HANDLES.length)] ?? 'Viajero';
  return `${name}-${Math.floor(Math.random() * 90 + 10)}`;
}

// resumeToken + handle se guardan en sessionStorage (POR PESTAÑA) para que un RELOAD re-adopte
// la misma entidad dentro de la ventana de gracia, en vez de crear un viajero nuevo.
const SS_TOKEN = 'osia.resumeToken';
const SS_HANDLE = 'osia.handle';
function ssGet(k: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage.getItem(k) : null;
  } catch {
    return null;
  }
}
function ssSet(k: string, v: string): void {
  try {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(k, v);
  } catch {
    /* sessionStorage no disponible (modo privado estricto, etc.) */
  }
}
function loadHandle(): string {
  const saved = ssGet(SS_HANDLE);
  if (saved) return saved;
  const h = randomHandle();
  ssSet(SS_HANDLE, h);
  return h;
}

export class NetClient {
  readonly handle = loadHandle(); // estable entre reloads (misma pestaña)
  selfId: number | null = null;
  serverSelf: { x: number; z: number; yaw: number } | null = null;

  /** Callbacks de voz (los conecta MeshVoice; NetClient sólo transporta, sin lógica WebRTC). */
  onVoiceSignal: ((srcId: number, kind: number, payload: string) => void) | null = null;
  onVoiceState: ((id: number, flags: number) => void) | null = null;
  onReset: (() => void) | null = null; // (re)WELCOME → MeshVoice cierra las PCs

  private ws: WebSocket | null = null;
  private wantConnected = false;
  private attempts = 0;
  private seq = 0;
  /** Inputs enviados aún NO confirmados por el server (se re-aplican en la reconciliación). */
  pending: { seq: number; f: number; r: number; yaw: number; dt: number }[] = [];
  ackSeq = 0; // último seq que el server confirmó haber procesado (del DELTA)
  private resumeToken: string | null = ssGet(SS_TOKEN); // re-adoptar la entidad (sobrevive al reload)
  private epoch = 0; // invalida intentos de conexión en vuelo (StrictMode / carreras async)
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null; // PING app para sync de reloj
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
    this.stopPing();
    this.ws?.close();
    this.ws = null;
    this.selfId = null;
    this.serverSelf = null;
    this.pending.length = 0;
    this.ackSeq = 0;
    this.resumeToken = null; // en memoria; el token persistido se limpia solo al cerrar la pestaña
    // NO borramos SS_TOKEN: así un reload (o el doble-montaje de StrictMode) re-adopta la entidad.
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
      ws.binaryType = 'arraybuffer'; // protocolo binario
      this.ws = ws;
      ws.onopen = () =>
        ws.send(
          encode({
            op: C2S.HELLO,
            ticket: data.ticket,
            protocol: PROTOCOL_VERSION,
            resumeToken: ssGet(SS_TOKEN) ?? undefined, // fuente de verdad: sobrevive reload y StrictMode
          }),
        );
      ws.onmessage = (ev) => {
        if (ev.data instanceof ArrayBuffer) this.onMessage(ev.data);
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
    this.stopPing();
    if (this.wantConnected) this.scheduleReconnect();
    else this.publish('idle');
  }

  /** PING aplicativo periódico → mide offset de reloj con el server (sync día/noche). */
  private startPing(): void {
    this.stopPing();
    const ping = () => {
      if (this.ws?.readyState === WebSocket.OPEN)
        this.ws.send(encode({ op: C2S.PING, t: Date.now() }));
    };
    ping();
    this.pingTimer = setInterval(ping, 2500);
  }
  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
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

  private onMessage(raw: ArrayBuffer): void {
    const msg = decode<S2CMessage>(raw);
    if (!msg) return;
    switch (msg.op) {
      case S2C.WELCOME: {
        this.selfId = msg.selfId;
        this.attempts = 0;
        this.pending.length = 0;
        this.ackSeq = 0;
        this.remotes.clear();
        this.onReset?.(); // cierra las PCs de voz (la roster puede traer ids nuevos)
        resetAux(); // limpia voz/burbujas de la sesión anterior
        for (const e of msg.entities) {
          if (e.id === msg.selfId) this.serverSelf = { x: e.x, z: e.z, yaw: e.yaw };
          else
            this.remotes.set(e.id, {
              handle: e.handle,
              buffer: [{ t: performance.now(), x: e.x, z: e.z, yaw: e.yaw }],
            });
        }
        applyServerAtmosphere(msg.atmosphere.biome, msg.atmosphere.weather); // sync de clima al entrar
        reportServerOffset(msg.serverTime - Date.now(), true); // offset inicial (lo refina el PING)
        this.resumeToken = msg.resumeToken; // guardado por si hay una reconexión
        ssSet(SS_TOKEN, msg.resumeToken); // persistido → sobrevive a un reload de la página
        this.startPing();
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
            r = { handle: '', buffer: [] }; // el handle llega por WELCOME/ENTITY_JOIN, no en el DELTA
            this.remotes.set(e.id, r);
            this.publish();
          }
          r.buffer.push({ t: now, x: e.x, z: e.z, yaw: e.yaw });
          if (r.buffer.length > BUFFER_MAX) r.buffer.shift();
        }
        // Reconciliación: descartar los inputs que el server ya confirmó (seq <= ackSeq).
        this.ackSeq = msg.ackSeq;
        if (this.pending.length) this.pending = this.pending.filter((i) => i.seq > msg.ackSeq);
        break;
      }
      case S2C.ENTITY_JOIN: {
        const e = msg.entity;
        if (e.id !== this.selfId && !this.remotes.has(e.id)) {
          this.remotes.set(e.id, {
            handle: e.handle,
            buffer: [{ t: performance.now(), x: e.x, z: e.z, yaw: e.yaw }],
          });
          this.publish();
        }
        break;
      }
      case S2C.ENTITY_LEAVE: {
        if (this.remotes.delete(msg.id)) {
          clearRemote(msg.id); // limpia su voz + burbuja
          this.publish();
        }
        break;
      }
      case S2C.ATMOSPHERE_UPDATE: {
        applyServerAtmosphere(msg.biome, msg.weather); // el server dicta el clima
        break;
      }
      case S2C.CHAT_MSG: {
        pushChatMessage(msg.id, msg.handle, msg.text); // log + burbuja sobre el avatar
        break;
      }
      case S2C.ERROR: {
        // Código estable; el componente lo traduce (i18n). NetClient no arma copy de UI.
        if (msg.code === ErrorCode.RATE_LIMIT) setChatNotice('rateLimited');
        break;
      }
      case S2C.VOICE_SIGNAL: {
        this.onVoiceSignal?.(msg.srcId, msg.kind, msg.payload); // → MeshVoice
        break;
      }
      case S2C.VOICE_STATE: {
        setVoiceFlags(msg.id, msg.flags); // roster/HUD
        this.onVoiceState?.(msg.id, msg.flags);
        break;
      }
      case S2C.PONG: {
        // offset = hora del server (estimada al instante de recibir) − hora local
        const rtt = Date.now() - msg.t;
        reportServerOffset(msg.serverTime + rtt / 2 - Date.now());
        break;
      }
      default:
        break;
    }
  }

  sendInput(f: number, r: number, yaw: number, dt: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.selfId === null) return;
    this.seq++;
    this.pending.push({ seq: this.seq, f, r, yaw, dt }); // guardado para el replay de reconciliación
    this.ws.send(encode({ op: C2S.INPUT, seq: this.seq, f, r, yaw, dtMs: dt * 1000 }));
  }

  sendChat(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.selfId === null) return;
    const clean = normalizeChat(text); // mismo límite que el server; vuelve por broadcast
    if (clean) this.ws.send(encode({ op: C2S.CHAT_SEND, text: clean }));
  }

  /** Voz: tuneliza SDP/ICE hacia un par. El server lo reescribe a S2C con srcId (anti-spoof). */
  sendVoiceSignal(dstId: number, kind: VoiceSignalKind, payload: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.selfId === null) return;
    // Mismo límite de NEGOCIO que el server autoritativo (no un literal divergente): un payload
    // mayor lo descartaría el server en silencio (relay byte-ciego), rompiendo la negociación.
    if (voiceEnc.encode(payload).length > MAX_VOICE_PAYLOAD_BYTES) return;
    // dstId es el id de un par (originado en el decode, ya entidad); se marca como EntityId
    // al re-entrar al contrato tipado, igual que el server lo hace al acuñarlo.
    this.ws.send(encode({ op: C2S.VOICE_SIGNAL, dstId: asEntityId(dstId), kind, payload }));
  }

  sendVoiceState(flags: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.selfId === null) return;
    this.ws.send(encode({ op: C2S.VOICE_STATE, flags }));
  }

  getRemoteIds(): number[] {
    return [...this.remotes.keys()];
  }

  /** Ids remotos como iterador (sin materializar un array): para el hot path de useFrame (§7). */
  remoteIds(): IterableIterator<number> {
    return this.remotes.keys();
  }

  /**
   * Muestra interpolada de una entidad remota en `renderTime`, ESCRITA en `out` (reutilizable,
   * cero asignaciones por frame — §7). Devuelve true si hubo muestra, false si no.
   */
  sampleRemote(id: number, renderTime: number, out: Sample): boolean {
    const r = this.remotes.get(id);
    if (!r || r.buffer.length === 0) return false;
    const buf = r.buffer;
    const first = buf[0]!;
    if (renderTime <= first.t) {
      out.t = first.t;
      out.x = first.x;
      out.z = first.z;
      out.yaw = first.yaw;
      return true;
    }
    for (let i = 0; i < buf.length - 1; i++) {
      const a = buf[i]!;
      const b = buf[i + 1]!;
      if (renderTime >= a.t && renderTime <= b.t) {
        const span = Math.max(1, b.t - a.t);
        const k = (renderTime - a.t) / span;
        out.t = renderTime;
        out.x = a.x + (b.x - a.x) * k;
        out.z = a.z + (b.z - a.z) * k;
        out.yaw = a.yaw + (b.yaw - a.yaw) * k;
        return true;
      }
    }
    const last = buf[buf.length - 1]!; // clamp al último (sin extrapolar)
    out.t = last.t;
    out.x = last.x;
    out.z = last.z;
    out.yaw = last.yaw;
    return true;
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
