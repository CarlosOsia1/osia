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
  ): Promise<boolean> {
    // INSERT ... SELECT WHERE EXISTS: solo encola si el target (post/comentario) existe y no está
    // borrado. Un targetId basura no contamina la cola de moderación. `RETURNING` → filas insertadas.
    const res = await this.pool.query(
      `INSERT INTO social.reports (reporter_account_id, target_type, target_id, reason)
       SELECT $1, $2, $3::uuid, $4
       WHERE (
         ($2 = 'post' AND EXISTS (SELECT 1 FROM social.posts WHERE id = $3::uuid AND deleted_at IS NULL))
         OR ($2 = 'comment' AND EXISTS (SELECT 1 FROM social.comments WHERE id = $3::uuid AND deleted_at IS NULL))
       )
       RETURNING id`,
      [reporterAccountId, targetType, targetId, reason],
    );
    return (res.rowCount ?? 0) > 0;
  }
}
