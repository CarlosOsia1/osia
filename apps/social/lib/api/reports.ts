import type { CreateReportInput } from '@osia/shared';
import { apiVoid } from './client';

/** Reporta un post o comentario para moderación manual (`POST /v1/reports`, S3.6-H2). */
export function createReport(input: CreateReportInput): Promise<void> {
  return apiVoid('/v1/reports', { method: 'POST', body: input });
}
