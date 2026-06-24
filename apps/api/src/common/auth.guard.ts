import {
  CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { ErrorCode } from '@osia/shared';
import { AppException } from './app-exception';
import { APP_ENV } from '../config/config.module';
import type { Env } from '../config/env';

/** Identidad autenticada extraída del access token (Supabase JWT). */
export type AccountContext = { accountId: string; role: string };
type AuthedRequest = Request & { auth?: AccountContext };

/**
 * Guard de endpoints protegidos: valida el access token de Supabase (`Authorization: Bearer`)
 * por FIRMA contra el JWKS del proyecto (ES256 asimétrico) — sin tocar la DB. Adjunta
 * `req.auth = { accountId, role }`. 401 si falta/expira/es inválido.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;

  constructor(@Inject(APP_ENV) private readonly env: Env) {
    this.issuer = `${env.SUPABASE_URL}/auth/v1`;
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new AppException(ErrorCode.UNAUTHENTICATED, 401, 'Falta el token de acceso.');

    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: 'authenticated',
      }));
    } catch {
      throw new AppException(ErrorCode.TOKEN_EXPIRED, 401, 'Token inválido o expirado.');
    }
    if (typeof payload.sub !== 'string') {
      throw new AppException(ErrorCode.UNAUTHENTICATED, 401, 'Token sin sujeto.');
    }
    const role = typeof payload.role === 'string' ? payload.role : 'authenticated';
    req.auth = { accountId: payload.sub, role };
    return true;
  }
}

/** Inyecta la identidad autenticada en un handler: `@CurrentAccount() acc: AccountContext`. */
export const CurrentAccount = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccountContext => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.auth) throw new AppException(ErrorCode.UNAUTHENTICATED, 401, 'No autenticado.');
    return req.auth;
  },
);
