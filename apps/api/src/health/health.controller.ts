import { Controller, Get } from '@nestjs/common';

type HealthStatus = { ok: true; service: string; ts: string };

/** Liveness simple. `/healthz` (fuera de /v1) para probes de orquestador. */
@Controller('healthz')
export class HealthController {
  @Get()
  health(): HealthStatus {
    return { ok: true, service: 'api', ts: new Date().toISOString() };
  }
}
