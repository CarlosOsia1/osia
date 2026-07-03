import { Global, Inject, Logger, Module, type OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { APP_ENV } from '../../../config/config.module';
import type { Env } from '../../../config/env';
import { PG_POOL } from './postgres.tokens';

/**
 * Pool de Postgres (conexión directa por el session pooler). Los repos de identity/world usan
 * SQL aquí — NO PostgREST (esos schemas no se exponen). El pool se cierra al apagar el módulo.
 * En prod, el CA de Supabase debería verificarse; en dev usamos rejectUnauthorized:false.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [APP_ENV],
      useFactory: (env: Env): Pool => {
        const pool = new Pool({
          connectionString: env.SUPABASE_DB_URL,
          ssl: { rejectUnauthorized: false },
          max: 10,
        });
        // El pooler de Supabase corta conexiones IDLE (ECONNRESET); sin este handler, el 'error'
        // del cliente ocioso sube al Pool sin listener y TUMBA el proceso (unhandled 'error').
        // Con él, se loguea y sigue: pg descarta el cliente muerto y abre otro en el próximo query.
        pool.on('error', (err) => {
          new Logger('PgPool').warn(`conexión idle caída (el pool se recupera solo): ${err.message}`);
        });
        return pool;
      },
    },
  ],
  exports: [PG_POOL],
})
export class PostgresModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
