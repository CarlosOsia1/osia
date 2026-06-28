import { Controller, Get } from '@nestjs/common';
import { SocialHealthService, type SocialHealth } from '../application/social-health.service';

/**
 * Salud del Tejido Social: `GET /v1/social/health` (público, como las probes). Demuestra que el
 * `SocialModule` está cargado y que el schema `social` está aplicado en DB (S3.1-H2 DoD).
 */
@Controller('social')
export class SocialHealthController {
  constructor(private readonly health: SocialHealthService) {}

  @Get('health')
  check(): Promise<SocialHealth> {
    return this.health.check();
  }
}
