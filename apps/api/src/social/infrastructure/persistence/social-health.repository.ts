import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
// PG_POOL es un token global (PostgresModule es @Global y lo exporta); compartirlo entre contextos
// de infraestructura es correcto — el dominio/aplicación de `social` no conocen Postgres.
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { SocialHealthPort } from '../../application/ports/out/social-health.port';

/** Adapter Postgres del puerto de salud: comprueba que el schema `social` esté aplicado. */
@Injectable()
export class PgSocialHealthRepository implements SocialHealthPort {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async isSchemaReady(): Promise<boolean> {
    try {
      const res = await this.pool.query<{ ready: boolean }>(
        `SELECT to_regclass('social.posts') IS NOT NULL AS ready`,
      );
      return res.rows[0]?.ready ?? false;
    } catch {
      // DB caída o sin permisos → reportamos schema 'down', no reventamos el health.
      return false;
    }
  }
}
