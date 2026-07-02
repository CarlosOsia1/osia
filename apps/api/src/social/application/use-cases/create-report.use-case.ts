import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type CreateReportInput } from '@osia/shared';
import { AppException } from '../../../common/app-exception';
import { REPORT_REPOSITORY, type ReportRepository } from '../ports/out/report.repository';

/** Reportar contenido para moderación manual (S3.6-H2). El input ya pasó Zod; el repo valida que el
 *  target exista (no encola basura) → 404 si no. */
@Injectable()
export class CreateReportUseCase {
  constructor(@Inject(REPORT_REPOSITORY) private readonly reports: ReportRepository) {}

  async execute(reporterAccountId: string, input: CreateReportInput): Promise<void> {
    const ok = await this.reports.create(
      reporterAccountId,
      input.targetType,
      input.targetId,
      input.reason,
    );
    if (!ok) throw new AppException(ErrorCode.NOT_FOUND, 404, 'El contenido reportado no existe.');
  }
}
