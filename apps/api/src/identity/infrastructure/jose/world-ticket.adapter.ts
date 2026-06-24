import { Inject, Injectable } from '@nestjs/common';
import { SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';
import { APP_ENV } from '../../../config/config.module';
import type { Env } from '../../../config/env';
import type {
  WorldTicketClaims,
  WorldTicketPort,
} from '../../application/ports/out/world-ticket.port';

const TTL_SECONDS = 60;

/**
 * Emite el world ticket: JWT HS256 efímero (~60s, jti un-solo-uso) firmado con el secreto
 * compartido con el world-server, que lo verifica por FIRMA sin tocar la DB (docs/05 §2.1).
 */
@Injectable()
export class JoseWorldTicketAdapter implements WorldTicketPort {
  private readonly secret: Uint8Array;

  constructor(@Inject(APP_ENV) env: Env) {
    this.secret = new TextEncoder().encode(env.WORLD_TICKET_SECRET);
  }

  async issue(claims: WorldTicketClaims): Promise<{ ticket: string; expiresIn: number }> {
    const ticket = await new SignJWT({
      handle: claims.handle,
      worldId: claims.worldId,
      accountId: claims.accountId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime(`${TTL_SECONDS}s`)
      .sign(this.secret);
    return { ticket, expiresIn: TTL_SECONDS };
  }
}
