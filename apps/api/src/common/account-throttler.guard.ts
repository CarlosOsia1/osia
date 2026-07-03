import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { decodeJwt } from 'jose';

/**
 * Rate-limit por CUENTA (Ola 4, cierra el `rl:*` diferido de S3.6). El throttler global corría por IP;
 * detrás de un proxy/NAT compartido eso agrupaba a muchas cuentas en un solo cubo. Este guard keyea por
 * el `sub` del access token (decodificado SIN verificar — para armar la clave basta, y un token inválido
 * igual lo rechaza el AuthGuard después). Sin token (signup/login) cae a la IP. Corre global, así que no
 * depende del orden con el AuthGuard.
 *
 * Nota multi-instancia: el almacenamiento del throttler es in-memory (por proceso). Para un límite
 * consistente entre varias instancias del API hace falta un storage compartido (Redis) — ver
 * docs/PROVISIONING.md (§rate-limit). Con una instancia, este guard ya limita por cuenta correctamente.
 */
@Injectable()
export class AccountThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const headers = req.headers as Record<string, string | undefined> | undefined;
    const header = headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (token) {
      try {
        const sub = decodeJwt(token).sub;
        if (typeof sub === 'string' && sub.length > 0) return `acct:${sub}`;
      } catch {
        // token malformado → cae a la IP (el AuthGuard lo rechazará igual en rutas protegidas)
      }
    }
    const ip = typeof req.ip === 'string' ? req.ip : 'unknown';
    return `ip:${ip}`;
  }
}
