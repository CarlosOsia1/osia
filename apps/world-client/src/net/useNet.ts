'use client';

import { useSyncExternalStore } from 'react';
import { NetClient } from './NetClient';
import { subscribeNet, getNetState, type NetState } from './store';

let client: NetClient | null = null;

/** Singleton del cliente de red (creado perezosamente, solo en navegador). */
export function getNetClient(): NetClient {
  if (!client) client = new NetClient();
  return client;
}

/** Estado de presencia reactivo (status, selfId, roster). */
export function useNetState(): NetState {
  return useSyncExternalStore(subscribeNet, getNetState, getNetState);
}
