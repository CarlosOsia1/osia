/**
 * Store externo del estado de presencia (S0.5). Solo cambia en eventos de
 * roster/estado (join/leave/welcome/conexión), NO por posición (eso se lee por
 * refs en useFrame, sin re-render). Consumido vía useSyncExternalStore.
 */

export type NetStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';
export type RemoteInfo = { id: number; handle: string };

export type NetState = {
  status: NetStatus;
  selfId: number | null;
  remotes: RemoteInfo[];
  count: number; // jugadores totales (incluye self)
};

let state: NetState = { status: 'idle', selfId: null, remotes: [], count: 0 };
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
