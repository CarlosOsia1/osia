import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AUDIT_LOG_REPOSITORY, type AuditLogRepository } from './ports/out/audit-log.repository';
import { RETENTION_REPOSITORY, type RetentionRepository } from './ports/out/retention.repository';

/** Ventanas de retención (días): datos vencidos más viejos que esto se purgan. */
const RETENTION_DAYS = {
  emailVerifications: 7, // verificaciones consumidas/vencidas: vida corta
  deletionTokens: 7, // tokens de borrado por link consumidos/vencidos
  auditLogs: 180, // la bitácora de auditoría se conserva ~6 meses
} as const;

export type PurgeCounts = { emailVerifications: number; deletionTokens: number; auditLogs: number };

/**
 * Política de retención (S2-C2): un cron diario que purga datos vencidos (verificaciones de email y
 * tokens de borrado consumidos/vencidos, y la bitácora vieja) y registra la pasada en auditoría.
 * Idempotente: si no hay nada que purgar, no hace nada. Determinista y testeable vía `runOnce()`.
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    @Inject(RETENTION_REPOSITORY) private readonly retention: RetentionRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly audit: AuditLogRepository,
  ) {}

  /** Cron diario (3am). La lógica vive en `runOnce()` para poder testearla sin esperar al reloj. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run(): Promise<void> {
    await this.runOnce();
  }

  /** Ejecuta una pasada de purga y, si borró algo, la registra en la bitácora. Devuelve los conteos. */
  async runOnce(): Promise<PurgeCounts> {
    const counts: PurgeCounts = {
      emailVerifications: await this.retention.purgeExpiredEmailVerifications(RETENTION_DAYS.emailVerifications),
      deletionTokens: await this.retention.purgeExpiredDeletionTokens(RETENTION_DAYS.deletionTokens),
      auditLogs: await this.retention.purgeOldAuditLogs(RETENTION_DAYS.auditLogs),
    };
    const total = counts.emailVerifications + counts.deletionTokens + counts.auditLogs;
    if (total > 0) {
      this.logger.log(`retention.purge ${JSON.stringify(counts)}`);
      // La auditoría es best-effort: una purga registrada de menos no debe romper la purga.
      try {
        await this.audit.record({ entityType: 'retention', action: 'retention.purge', metadata: counts });
      } catch (err) {
        this.logger.warn(
          `retention: no se pudo registrar la auditoría (${err instanceof Error ? err.message : 'desconocido'})`,
        );
      }
    }
    return counts;
  }
}
