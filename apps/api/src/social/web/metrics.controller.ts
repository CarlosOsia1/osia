import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import type { SocialMetricsDto } from '@osia/shared';
import { AuthGuard } from '../../common/auth.guard';
import { METRICS_QUERY, type MetricsQueryPort } from '../application/ports/out/metrics.query';

/**
 * Observabilidad del Tejido Social (S3.6-H3): `GET /v1/metrics/social` expone conteos agregados
 * (posts/reacciones/comentarios/follows, posts 24 h, tamaño del feed). Protegido (AuthGuard) para no
 * filtrar volúmenes públicamente. Pino ya registra requestId; Sentry/alertas a Discord quedan diferidos
 * (requieren DSN/webhook externos).
 */
@Controller('metrics')
@UseGuards(AuthGuard)
export class MetricsController {
  constructor(@Inject(METRICS_QUERY) private readonly metrics: MetricsQueryPort) {}

  @Get('social')
  social(): Promise<SocialMetricsDto> {
    return this.metrics.socialMetrics();
  }
}
