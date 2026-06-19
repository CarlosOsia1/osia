/**
 * World ticket (S0.4-H2): JWT HS256 efímero (~60s, un solo uso) que el cliente
 * presenta en HELLO. El server valida la FIRMA localmente (sin tocar Postgres).
 * jti de un-solo-uso en memoria (en multi-proceso pasará a Redis, Fase 5).
 */

import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
import { config } from './config';

const secret = new TextEncoder().encode(config.ticketSecret);
const usedJti = new Map<string, number>(); // jti -> epoch ms de expiración

export async function issueTicket(handle: string, worldId: string): Promise<string> {
  return new SignJWT({ handle, worldId })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime('60s')
    .sign(secret);
}

export type TicketPayload = { handle: string; worldId: string; jti: string };

export async function verifyTicket(token: string): Promise<TicketPayload> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  const jti = payload.jti;
  if (!jti) throw new Error('ticket sin jti');

  const now = Date.now();
  for (const [k, exp] of usedJti) if (exp < now) usedJti.delete(k); // limpiar expirados
  if (usedJti.has(jti)) throw new Error('ticket reusado');
  usedJti.set(jti, (payload.exp ?? 0) * 1000 || now + 60_000);

  return {
    handle: typeof payload.handle === 'string' ? payload.handle : 'anónimo',
    worldId: typeof payload.worldId === 'string' ? payload.worldId : 'osia',
    jti,
  };
}
