import { Controller, Get, Inject } from '@nestjs/common';
import { ErrorCode } from '@osia/shared';
import {
  SUPABASE_AUTH_PORT,
  type SupabaseAuthPort,
} from '../identity/application/ports/out/supabase-auth.port';
import { AppException } from '../common/app-exception';

type Liveness = { ok: true; service: string; ts: string };
type Readiness = { ok: true; supabase: 'up'; users: number };

/** Liveness (`/healthz`) barato + readiness (`/healthz/ready`) que pingea dependencias. */
@Controller('healthz')
export class HealthController {
  constructor(@Inject(SUPABASE_AUTH_PORT) private readonly auth: SupabaseAuthPort) {}

  @Get()
  health(): Liveness {
    return { ok: true, service: 'api', ts: new Date().toISOString() };
  }

  @Get('ready')
  async ready(): Promise<Readiness> {
    try {
      const r = await this.auth.ping();
      return { ok: true, supabase: 'up', users: r.users };
    } catch {
      throw new AppException(ErrorCode.UPSTREAM_UNAVAILABLE, 503, 'Supabase no disponible.', {
        retryable: true,
      });
    }
  }
}
