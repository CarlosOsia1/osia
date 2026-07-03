import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AccountThrottlerGuard } from './common/account-throttler.guard';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ConfigModule } from './config/config.module';
import { PostgresModule } from './identity/infrastructure/postgres/postgres.module';
import { SupabaseModule } from './identity/infrastructure/supabase/supabase.module';
import { HealthController } from './health/health.controller';
import { IdentityModule } from './identity/identity.module';
import { SocialModule } from './social/social.module';
import { EconomyModule } from './economy/economy.module';
import { ApiExceptionFilter } from './common/http-exception.filter';

/** Módulo raíz: config (env Zod), logging (Pino + requestId), Supabase, identity, social y economy. */
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(), // cron de retención (RetentionService)
    EventEmitterModule.forRoot(), // bus de dominio in-process (social.* → reputación/notif)
    // §8 rate-limit de borde: tope generoso por CUENTA (o por IP sin sesión) — corta abuso de
    // signup/resend/confirm y de escrituras sin molestar uso normal. Detrás de proxy en prod, habilitar
    // trust proxy para la IP real. El tracking por cuenta lo hace AccountThrottlerGuard (abajo).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
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
    SocialModule,
    EconomyModule,
  ],
  controllers: [HealthController],
  providers: [
    // Filtro global: todo error sale como el sobre ApiError de @osia/shared.
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    // Rate-limit global por CUENTA (o IP sin sesión) (§8 / Ola 4).
    { provide: APP_GUARD, useClass: AccountThrottlerGuard },
  ],
})
export class AppModule {}
