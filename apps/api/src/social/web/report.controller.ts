import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { createReportSchema, type CreateReportInput } from '@osia/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthGuard, CurrentAccount, type AccountContext } from '../../common/auth.guard';
import { EmailVerifiedGuard } from '../../common/email-verified.guard';
import { CreateReportUseCase } from '../application/use-cases/create-report.use-case';

/**
 * Reportes de moderación (S3.6-H2): `POST /v1/reports {targetType, targetId, reason}` encola un reporte
 * (204). Cualquier residente autenticado puede reportar; la resolución (soft-delete) es manual por un
 * moderador, fuera de banda. Protegido (AuthGuard) + rate-limit global por IP.
 */
@Controller('reports')
@UseGuards(AuthGuard)
export class ReportController {
  constructor(private readonly createReport: CreateReportUseCase) {}

  @Post()
  @HttpCode(204)
  @UseGuards(EmailVerifiedGuard)
  async report(
    @CurrentAccount() account: AccountContext,
    @Body(new ZodValidationPipe(createReportSchema)) body: CreateReportInput,
  ): Promise<void> {
    await this.createReport.execute(account.accountId, body);
  }
}
