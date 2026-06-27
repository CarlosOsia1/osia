/**
 * RetentionService (S2-C2) — la pasada de purga devuelve los conteos correctos y solo registra
 * auditoría cuando borró algo (idempotente, sin ruido). Fakes de los ports (sin DB).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { RetentionService } from './retention.service';
import type { RetentionRepository } from './ports/out/retention.repository';
import type { AuditEntry, AuditLogRepository } from './ports/out/audit-log.repository';

const auditSink = (sink: AuditEntry[]): AuditLogRepository => ({
  record: async (e) => {
    sink.push(e);
  },
});

test('runOnce purga las tres categorías y audita la pasada con sus conteos', async () => {
  const audited: AuditEntry[] = [];
  const retention: RetentionRepository = {
    purgeExpiredEmailVerifications: async () => 2,
    purgeExpiredDeletionTokens: async () => 1,
    purgeOldAuditLogs: async () => 3,
  };
  const svc = new RetentionService(retention, auditSink(audited));
  const counts = await svc.runOnce();
  assert.deepEqual(counts, { emailVerifications: 2, deletionTokens: 1, auditLogs: 3 });
  assert.equal(audited.length, 1, 'registra la pasada');
  assert.equal(audited[0]?.action, 'retention.purge');
  assert.deepEqual(audited[0]?.metadata, counts);
});

test('runOnce NO audita si no purgó nada (idempotente, sin ruido en la bitácora)', async () => {
  const audited: AuditEntry[] = [];
  const retention: RetentionRepository = {
    purgeExpiredEmailVerifications: async () => 0,
    purgeExpiredDeletionTokens: async () => 0,
    purgeOldAuditLogs: async () => 0,
  };
  const svc = new RetentionService(retention, auditSink(audited));
  const counts = await svc.runOnce();
  assert.deepEqual(counts, { emailVerifications: 0, deletionTokens: 0, auditLogs: 0 });
  assert.equal(audited.length, 0, 'sin purga → sin auditoría');
});
