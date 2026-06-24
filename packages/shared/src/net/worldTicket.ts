/**
 * World ticket — firma/verificación HS256 COMPARTIDA entre el emisor (apps/api) y el verificador
 * (world-server), para que el contrato (alg, jti, TTL, claims) viva una sola vez (docs/05 §2.1).
 *
 * Solo servidor (usa jose + node:crypto). Se importa por SUBPATH `@osia/shared/worldTicket`, no
 * desde el barrel, para no arrastrar jose a los bundles de cliente (apps/web, world-client).
 * El replay (jti un-solo-uso) NO vive aquí: lo lleva el verificador (memoria/Redis), no la firma.
 */
import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
import { DEFAULT_WORLD_ID, WORLD_TICKET_TTL_S, type WorldTicketClaims } from './constants';

/** Firma un world ticket HS256 efímero (jti único, exp = WORLD_TICKET_TTL_S). */
export async function issueWorldTicket(claims: WorldTicketClaims, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  const payload: Record<string, string> = { handle: claims.handle, worldId: claims.worldId };
  if (claims.accountId) payload.accountId = claims.accountId;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${WORLD_TICKET_TTL_S}s`)
    .sign(key);
}

export type VerifiedWorldTicket = WorldTicketClaims & { jti: string };

/** Verifica la FIRMA del ticket por secreto (sin tocar DB). El jti one-time-use lo gestiona quien llama. */
export async function verifyWorldTicket(token: string, secret: string): Promise<VerifiedWorldTicket> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
  if (!payload.jti) throw new Error('ticket sin jti');
  return {
    handle: typeof payload.handle === 'string' ? payload.handle : 'anónimo',
    worldId: typeof payload.worldId === 'string' ? payload.worldId : DEFAULT_WORLD_ID,
    accountId: typeof payload.accountId === 'string' ? payload.accountId : undefined,
    jti: payload.jti,
  };
}
