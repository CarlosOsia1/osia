/**
 * AccountErasureService (S2-C2) — borrado ya confirmado: borra local en cascada, revoca en Auth
 * (best-effort) y audita con el método; idempotente. Fakes de los ports (sin DB ni Supabase).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { AccountErasureService } from './account-erasure.service';
import type { AccountRepository } from './ports/out/account.repository';
import type { SupabaseAuthPort } from './ports/out/supabase-auth.port';
import type { AuditEntry, AuditLogRepository } from './ports/out/audit-log.repository';

const auditSink = (sink: AuditEntry[]): AuditLogRepository => ({
  record: async (e) => {
    sink.push(e);
  },
});

test('erase: borra local, revoca en Auth y audita con el método', async () => {
  const calls = { del: 0, delUser: 0 };
  const audited: AuditEntry[] = [];
  const svc = new AccountErasureService(
    { deleteAccount: async () => {
      calls.del++;
      return true;
    } } as unknown as AccountRepository,
    { deleteUser: async () => {
      calls.delUser++;
    } } as unknown as SupabaseAuthPort,
    auditSink(audited),
  );
  await svc.erase('id-1', 'email-link');
  assert.deepEqual(calls, { del: 1, delUser: 1 });
  assert.equal(audited.length, 1);
  assert.equal(audited[0]?.action, 'account.deleted');
  assert.deepEqual(audited[0]?.metadata, { method: 'email-link' });
});

test('erase: si no había nada que borrar (deleted=false), NO audita', async () => {
  const audited: AuditEntry[] = [];
  const svc = new AccountErasureService(
    { deleteAccount: async () => false } as unknown as AccountRepository,
    { deleteUser: async () => undefined } as unknown as SupabaseAuthPort,
    auditSink(audited),
  );
  await svc.erase('ghost', 'password');
  assert.equal(audited.length, 0);
});

test('erase: si Auth falla, el borrado local ya procedió (no lanza)', async () => {
  let del = 0;
  const svc = new AccountErasureService(
    { deleteAccount: async () => {
      del++;
      return true;
    } } as unknown as AccountRepository,
    { deleteUser: async () => {
      throw new Error('Auth down');
    } } as unknown as SupabaseAuthPort,
    auditSink([]),
  );
  await svc.erase('id-1', 'password'); // no debe lanzar
  assert.equal(del, 1);
});
