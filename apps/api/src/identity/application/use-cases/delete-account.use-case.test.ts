/**
 * DeleteAccountUseCase (S2-C2) — confirma por contraseña, borra local en cascada y revoca en Auth.
 * Idempotente y tolerante a fallos de Auth. Fakes de los ports (sin DB ni Supabase).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DeleteAccountUseCase } from './delete-account.use-case';
import { InvalidCredentialsError } from '../errors';
import { AppException } from '../../../common/app-exception';
import type { AccountRepository } from '../ports/out/account.repository';
import type { AuthSession, AuthSessionPort } from '../ports/out/auth-session.port';
import type { SupabaseAuthPort } from '../ports/out/supabase-auth.port';
import type { AuditEntry, AuditLogRepository } from '../ports/out/audit-log.repository';

const session: AuthSession = {
  accountId: 'id-1',
  accessToken: 'x',
  refreshToken: 'y',
  expiresIn: 3600,
};

/** Audit log falso que recuerda lo registrado (para verificar la bitácora del borrado). */
const fakeAudit = (sink?: AuditEntry[]): AuditLogRepository => ({
  record: async (e) => {
    sink?.push(e);
  },
});

test('happy path: confirma password, borra local, revoca en Auth y audita', async () => {
  const calls = { signIn: 0, del: 0, delUser: 0 };
  const audited: AuditEntry[] = [];
  const uc = new DeleteAccountUseCase(
    {
      getEmail: async () => 'a@b.co',
      deleteAccount: async () => {
        calls.del++;
        return true;
      },
    } as unknown as AccountRepository,
    {
      signInWithPassword: async () => {
        calls.signIn++;
        return session;
      },
    } as unknown as AuthSessionPort,
    {
      deleteUser: async () => {
        calls.delUser++;
      },
    } as unknown as SupabaseAuthPort,
    fakeAudit(audited),
  );
  await uc.execute('id-1', 'pw');
  assert.deepEqual(calls, { signIn: 1, del: 1, delUser: 1 });
  assert.equal(audited.length, 1, 'registra una entrada de auditoría');
  assert.equal(audited[0]?.action, 'account.deleted');
  assert.deepEqual(audited[0]?.metadata, { method: 'password' });
});

test('contraseña incorrecta → AppException (401) y NO borra', async () => {
  let del = 0;
  const uc = new DeleteAccountUseCase(
    {
      getEmail: async () => 'a@b.co',
      deleteAccount: async () => {
        del++;
        return true;
      },
    } as unknown as AccountRepository,
    {
      signInWithPassword: async () => {
        throw new InvalidCredentialsError();
      },
    } as unknown as AuthSessionPort,
    { deleteUser: async () => undefined } as unknown as SupabaseAuthPort,
    fakeAudit(),
  );
  await assert.rejects(() => uc.execute('id-1', 'bad'), (e) => e instanceof AppException);
  assert.equal(del, 0, 'no debe borrar si la contraseña es incorrecta');
});

test('cuenta inexistente → idempotente (no lanza, no borra, no toca Auth)', async () => {
  let touched = 0;
  const uc = new DeleteAccountUseCase(
    {
      getEmail: async () => null,
      deleteAccount: async () => {
        touched++;
        return false;
      },
    } as unknown as AccountRepository,
    {
      signInWithPassword: async () => {
        touched++;
        return session;
      },
    } as unknown as AuthSessionPort,
    {
      deleteUser: async () => {
        touched++;
      },
    } as unknown as SupabaseAuthPort,
    {
      record: async () => {
        touched++;
      },
    } as unknown as AuditLogRepository,
  );
  await uc.execute('ghost', 'pw');
  assert.equal(touched, 0);
});

test('fallo al borrar en Auth no rompe (el borrado local ya procedió)', async () => {
  let del = 0;
  const uc = new DeleteAccountUseCase(
    {
      getEmail: async () => 'a@b.co',
      deleteAccount: async () => {
        del++;
        return true;
      },
    } as unknown as AccountRepository,
    { signInWithPassword: async () => session } as unknown as AuthSessionPort,
    {
      deleteUser: async () => {
        throw new Error('Auth down');
      },
    } as unknown as SupabaseAuthPort,
    fakeAudit(),
  );
  await uc.execute('id-1', 'pw'); // no debe lanzar
  assert.equal(del, 1);
});
