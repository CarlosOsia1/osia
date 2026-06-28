import { Inject, Injectable } from '@nestjs/common';
import { SOCIAL_HEALTH_PORT, type SocialHealthPort } from './ports/out/social-health.port';

/** Estado de salud del contexto social: liveness (`ok`) + estado del schema en DB. */
export type SocialHealth = {
  ok: true;
  service: 'social';
  schema: 'up' | 'down';
  ts: string;
};

/**
 * Caso de uso de salud del Tejido Social (S3.1-H2). Liveness siempre `ok:true` (el módulo respondió);
 * `schema` refleja si las migraciones `social` están aplicadas (dependencia de DB).
 */
@Injectable()
export class SocialHealthService {
  constructor(@Inject(SOCIAL_HEALTH_PORT) private readonly health: SocialHealthPort) {}

  async check(): Promise<SocialHealth> {
    const ready = await this.health.isSchemaReady();
    return { ok: true, service: 'social', schema: ready ? 'up' : 'down', ts: new Date().toISOString() };
  }
}
