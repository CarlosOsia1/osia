/**
 * World ticket (S0.4-H2): firma/verificación HS256 vía @osia/shared/worldTicket (contrato
 * compartido con apps/api — alg/jti/TTL/claims una sola vez). El server valida la FIRMA
 * localmente (sin tocar Postgres) y lleva el jti de un-solo-uso en memoria (Redis en multi-proceso).
 */

import { WORLD_TICKET_TTL_MS } from '@osia/shared';
import { issueWorldTicket, verifyWorldTicket } from '@osia/shared/worldTicket';
import { config } from './config';

const usedJti = new Map<string, number>(); // jti -> epoch ms de expiración

export async function issueTicket(handle: string, worldId: string): Promise<string> {
  return issueWorldTicket({ handle, worldId }, config.ticketSecret);
}

export type TicketPayload = { handle: string; worldId: string; jti: string };

export async function verifyTicket(token: string): Promise<TicketPayload> {
  const v = await verifyWorldTicket(token, config.ticketSecret);

  const now = Date.now();
  for (const [k, exp] of usedJti) if (exp < now) usedJti.delete(k); // limpiar expirados
  if (usedJti.has(v.jti)) throw new Error('ticket reusado');
  usedJti.set(v.jti, now + WORLD_TICKET_TTL_MS);

  return { handle: v.handle, worldId: v.worldId, jti: v.jti };
}
