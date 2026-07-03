import { Inject, Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { parseCsvList } from '@osia/shared';
import { APP_ENV } from '../../config/config.module';
import type { Env } from '../../config/env';

/** Un servidor ICE para la config de RTCPeerConnection del cliente. */
export type IceServer = { urls: string[]; username?: string; credential?: string };
export type IceConfig = { iceServers: IceServer[]; ttl: number };

/**
 * Mintea la config ICE (STUN + TURN) para la voz P2P (Ola 4). STUN siempre; TURN solo si está
 * configurado (`TURN_URLS`+`TURN_SECRET`), con credenciales EFÍMERAS HMAC estilo coturn REST:
 * `username = <expiry-unix>:<accountId>`, `credential = base64(HMAC-SHA1(username, secret))`. El
 * secreto NUNCA sale al cliente; solo la credencial derivada, válida por `TURN_TTL_S`.
 */
@Injectable()
export class IceService {
  constructor(@Inject(APP_ENV) private readonly env: Env) {}

  forAccount(accountId: string): IceConfig {
    const ttl = this.env.TURN_TTL_S;
    const servers: IceServer[] = [{ urls: parseCsvList(this.env.STUN_URLS) }];

    if (this.env.TURN_URLS && this.env.TURN_SECRET) {
      const expiry = Math.floor(Date.now() / 1000) + ttl;
      const username = `${expiry}:${accountId}`;
      const credential = createHmac('sha1', this.env.TURN_SECRET).update(username).digest('base64');
      servers.push({ urls: parseCsvList(this.env.TURN_URLS), username, credential });
    }
    return { iceServers: servers, ttl };
  }
}
