import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ConfigModule } from './config/config.module';
import { PostgresModule } from './identity/infrastructure/postgres/postgres.module';
import { SupabaseModule } from './identity/infrastructure/supabase/supabase.module';
import { HealthController } from './health/health.controller';
import { IdentityModule } from './identity/identity.module';
import { ApiExceptionFilter } from './common/http-exception.filter';

/** Módulo raíz: config (env Zod), logging (Pino + requestId), Supabase e identity. */
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(), // cron de retención (RetentionService)
    LoggerModule.forRoot({
      pinoHttp: {
        // requestId correlacionado con el sobre ApiError (docs/11/§8): toma X-Request-Id o crea uno.
        genReqId: (req: IncomingMessage, res: ServerResponse): string => {
          const existing = req.headers['x-request-id'];
          const id = typeof existing === 'string' ? existing : randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        ...(process.env.NODE_ENV !== 'production'
          ? { transport: { target: 'pino-pretty', options: { singleLine: true } } }
          : {}),
      },
    }),
    PostgresModule,
    SupabaseModule,
    IdentityModule,
  ],
  controllers: [HealthController],
  // Filtro global: todo error sale como el sobre ApiError de @osia/shared.
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
