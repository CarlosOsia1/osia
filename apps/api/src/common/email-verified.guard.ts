import { CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { Pool } from 'pg';
import { ErrorCode } from '@osia/shared';
import { AppException } from './app-exception';
import { PG_POOL } from '../identity/infrastructure/postgres/postgres.tokens';

type AuthedRequest = Request & { auth?: { accountId: string } };

/**
 * Guard de "email verificado" (S3.6-H2): se aplica a ESCRITURAS de creación social (publicar, reaccionar,
 * comentar, seguir, subir media). Va DESPUÉS de AuthGuard (usa `req.auth.accountId`) y verifica contra la
 * DB que la cuenta tenga `email_verified_at`. Sin verificar → `403 EMAIL_NOT_VERIFIED`. Defensa en
 * profundidad junto a la RLS (escrituras service-only) y el rate-limit.
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const accountId = req.auth?.accountId;
    if (!accountId) throw new AppException(ErrorCode.UNAUTHENTICATED, 401, 'No autenticado.');

    const res = await this.pool.query(
      `SELECT 1 FROM identity.accounts
       WHERE id = $1 AND email_verified_at IS NOT NULL AND deleted_at IS NULL`,
      [accountId],
    );
    if ((res.rowCount ?? 0) === 0) {
      throw new AppException(
        ErrorCode.EMAIL_NOT_VERIFIED,
        403,
        'Verifica tu email para esta acción.',
      );
    }
    return true;
  }
}
