/**
 * ConfirmAccountDeletionUseCase (S2-C2) — consume el token del link (por su hash) y borra con método
 * 'email-link'; lanza si el token no vale. Fakes de los ports (sin DB).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ConfirmAccountDeletionUseCase } from './confirm-account-deletion.use-case';
import { DeleteAccountUseCase } from './delete-account.use-case';
import { AppException } from '../../../common/app-exception';
import type { DeletionTokenRepository } from '../ports/out/deletion-token.repository';

type ErasedSink = { accountId?: string; method?: string };

/** DeleteAccountUseCase falso: captura la llamada a eraseConfirmed (no borra de verdad). */
const fakeDeleter = (sink: ErasedSink): DeleteAccountUseCase =>
  ({
    eraseConfirmed: async (accountId: string, method: 'password' | 'email-link') => {
      sink.accountId = accountId;
      sink.method = method;
    },
  }) as unknown as DeleteAccountUseCase;

test('token válido: consume por HASH y borra con método email-link', async () => {
  const sink: ErasedSink = {};
  const seen: string[] = [];
  const uc = new ConfirmAccountDeletionUseCase(
    {
      create: async () => undefined,
      consume: async (hash) => {
        seen.push(hash);
        return 'id-1';
      },
    } as DeletionTokenRepository,
    fakeDeleter(sink),
  );

  await uc.execute('plain-token');

  assert.equal(
    seen[0],
    createHash('sha256').update('plain-token').digest('hex'),
    'consume por hash, no por token limpio',
  );
  assert.deepEqual(sink, { accountId: 'id-1', method: 'email-link' });
});

test('token inválido/expirado/usado: lanza AppException y NO borra', async () => {
  const sink: ErasedSink = {};
  const uc = new ConfirmAccountDeletionUseCase(
    { create: async () => undefined, consume: async () => null } as DeletionTokenRepository,
    fakeDeleter(sink),
  );
  await assert.rejects(() => uc.execute('bad'), (e) => e instanceof AppException);
  assert.deepEqual(sink, {});
});
