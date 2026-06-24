import { Global, Module } from '@nestjs/common';
import { loadEnv } from './env';

/** Token de DI para inyectar la config validada (`Env`). */
export const APP_ENV = Symbol('APP_ENV');

/**
 * Config global: provee la `Env` validada por Zod (una sola fuente para toda la app).
 * `@Global` para no re-importarlo en cada módulo.
 */
@Global()
@Module({
  providers: [{ provide: APP_ENV, useFactory: loadEnv }],
  exports: [APP_ENV],
})
export class ConfigModule {}
