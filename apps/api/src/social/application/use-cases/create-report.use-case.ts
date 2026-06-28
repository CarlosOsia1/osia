import { Inject, Injectable } from '@nestjs/common';
import type { CreateReportInput } from '@osia/shared';
import { REPORT_REPOSITORY, type ReportRepository } from '../ports/out/report.repository';

/** Reportar contenido para moderación manual (S3.6-H2). El input ya pasó Zod; aquí solo se encola. */
@Injectable()
export class CreateReportUseCase {
  constructor(@Inject(REPORT_REPOSITORY) private readonly reports: ReportRepository) {}

  execute(reporterAccountId: string, input: CreateReportInput): Promise<void> {
    return this.reports.create(reporterAccountId, input.targetType, input.targetId, input.reason);
  }
}
