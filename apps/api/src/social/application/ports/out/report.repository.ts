import type { ReportTargetType } from '@osia/shared';

export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');

export interface ReportRepository {
  /** Encola un reporte de moderación de un post/comentario. */
  create(
    reporterAccountId: string,
    targetType: ReportTargetType,
    targetId: string,
    reason: string,
  ): Promise<void>;
}
