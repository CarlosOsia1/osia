/**
 * DeleteAccountUseCase (S2-C2) — confirma por contraseña y delega el borrado en AccountErasureService.
 * Idempotente. Fakes de los ports (sin DB ni Supabase).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DeleteAccountUseCase } from './delete-account.use-case';
import { EmailNotVerifiedError, InvalidCredentialsError } from '../errors';
import { AppException } from '../../../common/app-exception';
import type { AccountRepository } from '../ports/out/account.repository';
import type { AuthSession, AuthSessionPort } from '../ports/out/auth-session.port';
import { AccountErasureService } from '../account-erasure.service';

const session: AuthSession = { accountId: 'id-1', accessToken: 'x', refreshToken: 'y', expiresIn: 3600 };

type ErasedSink = { accountId?: string; method?: string };

/** Eraser falso: captura la llamada a erase (no borra de verdad). */
const fakeEraser = (sink: ErasedSink): AccountErasureService =>
  ({
    erase: async (accountId: string, method: 'password' | 'email-link') => {
      sink.accountId = accountId;
      sink.method = method;
    },
  }) as unknown as AccountErasureService;

test('happy path: confirma password y borra con método password', async () => {
  let signIn = 0;
  const sink: ErasedSink = {};
  const uc = new DeleteAccountUseCase(
    { getEmail: async () => 'a@b.co' } as unknown as AccountRepository,
    { signInWithPassword: async () => {
      signIn++;
      return session;
    } } as unknown as AuthSessionPort,
    fakeEraser(sink),
  );
  await uc.execute('id-1', 'pw');
  assert.equal(signIn, 1);
  assert.deepEqual(sink, { accountId: 'id-1', method: 'password' });
});

test('contraseña incorrecta → AppException (401) y NO borra', async () => {
  const sink: ErasedSink = {};
  const uc = new DeleteAccountUseCase(
    { getEmail: async () => 'a@b.co' } as unknown as AccountRepository,
    { signInWithPassword: async () => {
      throw new InvalidCredentialsError();
    } } as unknown as AuthSessionPort,
    fakeEraser(sink),
  );
  await assert.rejects(() => uc.execute('id-1', 'bad'), (e) => e instanceof AppException);
  assert.deepEqual(sink, {});
});

test('cuenta inexistente → idempotente (no confirma ni borra)', async () => {
  let touched = 0;
  const sink: ErasedSink = {};
  const uc = new DeleteAccountUseCase(
    { getEmail: async () => null } as unknown as AccountRepository,
    { signInWithPassword: async () => {
      touched++;
      return session;
    } } as unknown as AuthSessionPort,
    fakeEraser(sink),
  );
  await uc.execute('ghost', 'pw');
  assert.equal(touched, 0);
  assert.deepEqual(sink, {});
});

test('email no verificado: igual procede al borrado (Supabase ya probó la credencial)', async () => {
  const sink: ErasedSink = {};
  const uc = new DeleteAccountUseCase(
    { getEmail: async () => 'a@b.co' } as unknown as AccountRepository,
    { signInWithPassword: async () => {
      throw new EmailNotVerifiedError();
    } } as unknown as AuthSessionPort,
    fakeEraser(sink),
  );
  await uc.execute('id-1', 'pw');
  assert.deepEqual(sink, { accountId: 'id-1', method: 'password' });
});
