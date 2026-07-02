import type { ReportTargetType } from '@osia/shared';

export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');

export interface ReportRepository {
  /** Encola un reporte de moderación de un post/comentario. Devuelve `false` si el target no existe
   *  (no encola basura en la cola de moderación); el caso de uso lo traduce a 404. */
  create(
    reporterAccountId: string,
    targetType: ReportTargetType,
    targetId: string,
    reason: string,
  ): Promise<boolean>;
}
