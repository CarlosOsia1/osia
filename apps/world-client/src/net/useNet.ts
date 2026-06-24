'use client';

import { useSyncExternalStore } from 'react';
import { OsiaIdentityClient, OsiaApiError } from '@osia/identity';
import { DEFAULT_WORLD_ID } from '@osia/shared';
import { NetClient, type TicketProvider } from './NetClient';
import { subscribeNet, getNetState, type NetState } from './store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3001';
// Escape hatch de dev: juego ANÓNIMO contra el world-server (sin SSO). Por defecto, identidad real.
const ANON = process.env.NEXT_PUBLIC_WORLD_ANON === 'true';

let client: NetClient | null = null;

/**
 * Provider SSO (S1.8-H1): pide el world ticket AUTENTICADO a apps/api con la sesión del pasaporte
 * (cookie de dominio padre). El ticket lleva el handle real + accountId; el world-server verifica la
 * firma sin DB. Sin sesión / sin email verificado (401/403) → unauthenticated (volver al Vestíbulo).
 */
function ssoTicketProvider(): TicketProvider {
  const identity = new OsiaIdentityClient({ apiBaseUrl: API_URL });
  return async () => {
    try {
      const { ticket, wsUrl } = await identity.requestWorldTicket(DEFAULT_WORLD_ID);
      return { ticket, wsUrl };
    } catch (e) {
      if (e instanceof OsiaApiError && (e.status === 401 || e.status === 403)) {
        throw Object.assign(new Error('sin sesión para El Mundo'), { unauthenticated: true });
      }
      throw e;
    }
  };
}

/** Singleton del cliente de red (creado perezosamente, solo en navegador). */
export function getNetClient(): NetClient {
  if (!client) {
    client = ANON
      ? new NetClient() // F0: ticket anónimo del world-server
      : new NetClient({
          ticketProvider: ssoTicketProvider(),
          onUnauthenticated: () => {
            if (typeof window !== 'undefined') window.location.href = WEB_URL;
          },
        });
  }
  return client;
}

/** Estado de presencia reactivo (status, selfId, roster). */
export function useNetState(): NetState {
  return useSyncExternalStore(subscribeNet, getNetState, getNetState);
}
