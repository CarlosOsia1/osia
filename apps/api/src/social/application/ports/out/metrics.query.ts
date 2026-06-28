import type { SocialMetricsDto } from '@osia/shared';

export const METRICS_QUERY = Symbol('METRICS_QUERY');

export interface MetricsQueryPort {
  /** Conteos agregados del Tejido Social para observabilidad. */
  socialMetrics(): Promise<SocialMetricsDto>;
}
