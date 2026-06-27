export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

/** Una entrada de la bitácora de auditoría (append-only). Ver system.audit_logs. */
export type AuditEntry = {
  /** Tipo de entidad afectada: 'account', 'retention', … */
  entityType: string;
  /** Id de la entidad afectada (uuid plano, sin FK); null en resúmenes de sistema. */
  entityId?: string | null;
  /** Acción registrada: 'account.deleted', 'retention.purge', … */
  action: string;
  /** Quién la ejecutó; null = sistema/cron. */
  actorId?: string | null;
  /** Contexto adicional (método de borrado, conteos de purga, …). */
  metadata?: Record<string, unknown>;
};

/** Bitácora de auditoría de acciones sensibles (borrados, purgas de retención). */
export interface AuditLogRepository {
  record(entry: AuditEntry): Promise<void>;
}
