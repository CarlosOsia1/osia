/**
 * Store externo del estado de presencia (S0.5 + S0.6). Solo cambia en eventos de
 * roster/estado/chat (join/leave/welcome/conexión/mensaje), NO por posición (eso se
 * lee por refs en useFrame, sin re-render). Consumido vía useSyncExternalStore.
 */

export type NetStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';
export type RemoteInfo = { id: number; handle: string };
export type ChatLine = { key: number; id: number; handle: string; text: string };
export type Bubble = { text: string; expiresAt: number };

export type NetState = {
  status: NetStatus;
  selfId: number | null;
  remotes: RemoteInfo[];
  count: number; // jugadores totales (incluye self)
  chatLog: ChatLine[]; // historial reciente del chat in-world
  bubbles: Record<number, Bubble>; // burbuja activa sobre cada avatar (por id)
  chatNotice: string | null; // aviso transitorio (p.ej. rate-limit)
  voice: Record<number, number>; // flags de voz por id remoto (mic/hablando/sordo)
};

let state: NetState = {
  status: 'idle',
  selfId: null,
  remotes: [],
  count: 0,
  chatLog: [],
  bubbles: {},
  chatNotice: null,
  voice: {},
};
const listeners = new Set<() => void>();

export function setNetState(patch: Partial<NetState>): void {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export function getNetState(): NetState {
  return state;
}

export function subscribeNet(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// ---------- Chat ----------
const CHAT_LOG_MAX = 50;
let chatKey = 0;

/** Duración de la burbuja sobre el avatar según largo del mensaje (4–9 s). */
function bubbleDuration(len: number): number {
  return Math.min(9000, Math.max(4000, 4000 + 60 * len));
}

export function pushChatMessage(id: number, handle: string, text: string): void {
  const line: ChatLine = { key: ++chatKey, id, handle, text };
  const chatLog = [...state.chatLog, line].slice(-CHAT_LOG_MAX);
  const bubbles = { ...state.bubbles, [id]: { text, expiresAt: Date.now() + bubbleDuration(text.length) } };
  setNetState({ chatLog, bubbles });
}

/** Quita las burbujas vencidas (lo llama UN solo useFrame; no hay setTimeout por mensaje). */
export function purgeExpiredBubbles(): void {
  const now = Date.now();
  const entries = Object.entries(state.bubbles);
  if (entries.length === 0) return;
  let changed = false;
  const next: Record<number, Bubble> = {};
  for (const [k, b] of entries) {
    if (b.expiresAt > now) next[Number(k)] = b;
    else changed = true;
  }
  if (changed) setNetState({ bubbles: next });
}

export function setChatNotice(msg: string | null): void {
  setNetState({ chatNotice: msg });
}

// ---------- Voz (estado para el roster/HUD; el audio lo maneja MeshVoice) ----------
export function setVoiceFlags(id: number, flags: number): void {
  setNetState({ voice: { ...state.voice, [id]: flags } });
}

/** Limpia el estado auxiliar de un remoto que se fue (voz + burbuja). */
export function clearRemote(id: number): void {
  const voice = { ...state.voice };
  const bubbles = { ...state.bubbles };
  delete voice[id];
  delete bubbles[id];
  setNetState({ voice, bubbles });
}

/** Resetea voz + burbujas (al (re)conectar; la roster puede cambiar). */
export function resetAux(): void {
  setNetState({ voice: {}, bubbles: {}, chatNotice: null });
}

// ---------- Lock de input (no mover el avatar mientras se escribe en el chat) ----------
let typing = false;
export function setChatTyping(v: boolean): void {
  typing = v;
}
export function isChatTyping(): boolean {
  return typing;
}
