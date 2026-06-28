import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { ReportTargetType } from '@osia/shared';
import { PG_POOL } from '../../../identity/infrastructure/postgres/postgres.tokens';
import type { ReportRepository } from '../../application/ports/out/report.repository';

/** Adapter Postgres de reportes de moderación (S3.6-H2). */
@Injectable()
export class PgReportRepository implements ReportRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    reporterAccountId: string,
    targetType: ReportTargetType,
    targetId: string,
    reason: string,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO social.reports (reporter_account_id, target_type, target_id, reason)
       VALUES ($1, $2, $3, $4)`,
      [reporterAccountId, targetType, targetId, reason],
    );
  }
}
