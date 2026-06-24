import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HealthController } from './health/health.controller';
import { IdentityModule } from './identity/identity.module';
import { ApiExceptionFilter } from './common/http-exception.filter';

/** Módulo raíz. En S1.3 sumará ConfigModule (env validado por Zod) y LoggerModule (Pino). */
@Module({
  imports: [IdentityModule],
  controllers: [HealthController],
  // Filtro global: todo error sale como el sobre ApiError de @osia/shared.
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
