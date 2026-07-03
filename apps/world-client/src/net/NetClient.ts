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
  WireErrorCode,
  normalizeChat,
  PROTOCOL_VERSION,
  DEFAULT_WORLD_ID,
  DEFAULT_ACCENT_COLOR,
  RESUME_TOKEN_STORAGE_KEY,
  HANDLE_STORAGE_KEY,
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
type Remote = { handle: string; accentColor: string; buffer: Sample[] };

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
/** Tope de inputs sin confirmar. Si el server deja de emitir DELTA con el WS abierto, `pending`
 *  crecería a ritmo de frame y el replay de reconciliación sería O(n)/frame; se descartan los
 *  más viejos (ya nunca se van a confirmar). Holgado: ~4 s a 60 fps. */
const MAX_PENDING = 256;
const TWO_PI = Math.PI * 2;
const voiceEnc = new TextEncoder(); // para medir el tamaño en bytes del payload de voz

function randomHandle(): string {
  const name = HANDLES[Math.floor(Math.random() * HANDLES.length)] ?? 'Viajero';
  return `${name}-${Math.floor(Math.random() * 90 + 10)}`;
}

// resumeToken + handle se guardan en sessionStorage (POR PESTAÑA) para que un RELOAD re-adopte
// la misma entidad dentro de la ventana de gracia, en vez de crear un viajero nuevo. Las claves
// viven en @osia/shared (contrato, no literales sueltos).
const SS_TOKEN = RESUME_TOKEN_STORAGE_KEY;
const SS_HANDLE = HANDLE_STORAGE_KEY;
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

export type WorldTicket = { ticket: string; wsUrl?: string };
/** Abstracción de obtención de ticket (inversión de dependencias, §1.5-D): el NetClient no sabe
 *  si el ticket viene anónimo del world-server (F0) o autenticado de apps/api (S1.8). */
export type TicketProvider = () => Promise<WorldTicket>;

/** Provider por defecto (F0): ticket ANÓNIMO del world-server con handle aleatorio. */
function anonymousTicketProvider(handle: string): TicketProvider {
  return async () => {
    const res = await fetch(`${netConfig.apiUrl}/world/tickets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ worldId: DEFAULT_WORLD_ID, handle }),
    });
    if (!res.ok) throw new Error(`ticket http ${res.status}`);
    return (await res.json()) as WorldTicket;
  };
}

/** ¿El error del provider indica falta de sesión (→ volver al Vestíbulo, sin reintentar)? */
function isUnauthenticated(e: unknown): boolean {
  return (
    typeof e === 'object' && e !== null && (e as { unauthenticated?: boolean }).unauthenticated === true
  );
}

export class NetClient {
  readonly handle = loadHandle(); // estable entre reloads (misma pestaña)
  selfId: number | null = null;
  /** Estado autoritativo propio (posición + velocidad): ancla del replay de la reconciliación. */
  serverSelf: { x: number; z: number; yaw: number; vx: number; vz: number } | null = null;

  /** Callbacks de voz (los conecta MeshVoice; NetClient sólo transporta, sin lógica WebRTC). */
  onVoiceSignal: ((srcId: number, kind: number, payload: string) => void) | null = null;
  onVoiceState: ((id: number, flags: number) => void) | null = null;
  onReset: (() => void) | null = null; // (re)WELCOME → MeshVoice cierra las PCs
  /** Se invoca si el ticket no se pudo emitir por falta de sesión (S1.8 → volver al Vestíbulo). */
  onUnauthenticated: (() => void) | null = null;

  private readonly ticketProvider: TicketProvider;

  constructor(opts?: { ticketProvider?: TicketProvider; onUnauthenticated?: () => void }) {
    this.ticketProvider = opts?.ticketProvider ?? anonymousTicketProvider(this.handle);
    if (opts?.onUnauthenticated) this.onUnauthenticated = opts.onUnauthenticated;
  }

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
      const data = await this.ticketProvider();
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
    } catch (e) {
      // Sin sesión / ticket denegado (S1.8): no reintentar, volver al Vestíbulo.
      if (isUnauthenticated(e)) {
        this.wantConnected = false;
        this.publish('unauthenticated');
        this.onUnauthenticated?.();
        return;
      }
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
    // Backoff exponencial con JITTER ±30%: si el server reinicia, todos los clientes reintentarían
    // en los mismos instantes (thundering herd) contra el WS y el endpoint de tickets. El jitter
    // dispersa los reintentos.
    const base = Math.min(8000, 500 * 2 ** Math.min(this.attempts, 4));
    const delay = Math.round(base * (0.7 + Math.random() * 0.6));
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
          if (e.id === msg.selfId)
            this.serverSelf = { x: e.x, z: e.z, yaw: e.yaw, vx: e.vx, vz: e.vz };
          else
            this.remotes.set(e.id, {
              handle: e.handle,
              accentColor: e.accentColor,
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
            this.serverSelf = { x: e.x, z: e.z, yaw: e.yaw, vx: e.vx, vz: e.vz };
            continue;
          }
          let r = this.remotes.get(e.id);
          if (!r) {
            // handle/acento llegan por WELCOME/ENTITY_JOIN, no en el DELTA: default hasta entonces.
            r = { handle: '', accentColor: DEFAULT_ACCENT_COLOR, buffer: [] };
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
            accentColor: e.accentColor,
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
        if (msg.code === WireErrorCode.RATE_LIMIT) setChatNotice('rateLimited');
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
    // El server integra `dtMs / 1000`; el replay local debe usar EXACTAMENTE ese mismo valor
    // (dt*1000/1000 difiere de dt en ~1 ulp a veces) — autoridad y predicción, bit a bit (QA M5).
    const dtMs = dt * 1000;
    this.pending.push({ seq: this.seq, f, r, yaw, dt: dtMs / 1000 }); // replay de reconciliación
    // Cap del backlog: si el server dejó de confirmar (stall), no dejar crecer `pending` sin fin.
    if (this.pending.length > MAX_PENDING) this.pending.splice(0, this.pending.length - MAX_PENDING);
    this.ws.send(encode({ op: C2S.INPUT, seq: this.seq, f, r, yaw, dtMs }));
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
        // Yaw es un ángulo: interpolar por el ARCO CORTO (normalizar el delta a [-π, π]). Sin esto,
        // cruzar ±π gira el camino largo (~360° fantasma) y desalinea el audio espacial del remoto.
        let dyaw = b.yaw - a.yaw;
        if (dyaw > Math.PI) dyaw -= TWO_PI;
        else if (dyaw < -Math.PI) dyaw += TWO_PI;
        out.yaw = a.yaw + dyaw * k;
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
    const remotes = [...this.remotes.entries()].map(([id, r]) => ({
      id,
      handle: r.handle,
      accentColor: r.accentColor,
    }));
    setNetState({
      ...(status ? { status } : {}),
      selfId: this.selfId,
      remotes,
      count: remotes.length + (this.selfId !== null ? 1 : 0),
    });
  }
}
