export const RETENTION_REPOSITORY = Symbol('RETENTION_REPOSITORY');

/**
 * Purga de datos vencidos según la política de retención (la ejecuta el cron). Cada método borra de
 * forma idempotente y devuelve cuántas filas eliminó (para la bitácora de auditoría).
 */
export interface RetentionRepository {
  /** Verificaciones de email vencidas o ya consumidas hace más de `days`. */
  purgeExpiredEmailVerifications(days: number): Promise<number>;
  /** Tokens de borrado por link vencidos o consumidos hace más de `days`. */
  purgeExpiredDeletionTokens(days: number): Promise<number>;
  /** Entradas de auditoría más antiguas que `days` (retención de la propia bitácora). */
  purgeOldAuditLogs(days: number): Promise<number>;
}
