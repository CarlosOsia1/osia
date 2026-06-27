import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from './postgres.tokens';
import type { AuditEntry, AuditLogRepository } from '../../application/ports/out/audit-log.repository';

/** Escribe en system.audit_logs (append-only) por conexión directa (no PostgREST). */
@Injectable()
export class PgAuditLogRepository implements AuditLogRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO system.audit_logs (entity_type, entity_id, action, actor_id, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        entry.entityType,
        entry.entityId ?? null,
        entry.action,
        entry.actorId ?? null,
        JSON.stringify(entry.metadata ?? {}),
      ],
    );
  }
}
