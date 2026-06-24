/**
 * Store externo del estado de presencia (S0.5 + S0.6). Solo cambia en eventos de
 * roster/estado/chat (join/leave/welcome/conexión/mensaje), NO por posición (eso se
 * lee por refs en useFrame, sin re-render). Consumido vía useSyncExternalStore.
 */

export type NetStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'unauthenticated';
export type RemoteInfo = { id: number; handle: string };
export type ChatLine = { key: number; id: number; handle: string; text: string; at: number };

export type NetState = {
  status: NetStatus;
  selfId: number | null;
  remotes: RemoteInfo[];
  count: number; // jugadores totales (incluye self)
  chatLog: ChatLine[]; // historial reciente del chat in-world
  chatNotice: string | null; // aviso transitorio (p.ej. rate-limit)
  voice: Record<number, number>; // flags de voz por id remoto (mic/hablando/sordo)
};

let state: NetState = {
  status: 'idle',
  selfId: null,
  remotes: [],
  count: 0,
  chatLog: [],
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

export function pushChatMessage(id: number, handle: string, text: string): void {
  const line: ChatLine = { key: ++chatKey, id, handle, text, at: Date.now() };
  const chatLog = [...state.chatLog, line].slice(-CHAT_LOG_MAX);
  setNetState({ chatLog });
}

export function setChatNotice(msg: string | null): void {
  setNetState({ chatNotice: msg });
}

// ---------- Voz (estado para el roster/HUD; el audio lo maneja MeshVoice) ----------
export function setVoiceFlags(id: number, flags: number): void {
  setNetState({ voice: { ...state.voice, [id]: flags } });
}

/** Limpia el estado auxiliar de un remoto que se fue (voz). */
export function clearRemote(id: number): void {
  const voice = { ...state.voice };
  delete voice[id];
  setNetState({ voice });
}

/** Resetea voz + chat (al (re)conectar; la roster puede cambiar y los ids se reasignan). */
export function resetAux(): void {
  setNetState({ voice: {}, chatNotice: null, chatLog: [] });
}

// ---------- Lock de input (no mover el avatar mientras se escribe en el chat) ----------
let typing = false;
export function setChatTyping(v: boolean): void {
  typing = v;
}
export function isChatTyping(): boolean {
  return typing;
}
