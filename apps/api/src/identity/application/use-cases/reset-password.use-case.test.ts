/**
 * ResetPasswordUseCase (V1 Vestíbulo) — canjea el OTP de recovery, arma la sesión con el pasaporte
 * y traduce los errores de dominio al sobre HTTP. Fakes de los ports.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { InvalidOtpError, PasswordUnchangedError } from '../errors';
import { AppException } from '../../../common/app-exception';
import type { AuthSessionPort, AuthSession } from '../ports/out/auth-session.port';
import type { AccountRepository } from '../ports/out/account.repository';

const AUTH: AuthSession = {
  accountId: 'acc-1',
  accessToken: 'at',
  refreshToken: 'rt',
  expiresIn: 3600,
};

const PASSPORT = { accountId: 'acc-1', handle: 'ada' };

function sessionsWith(resetPassword: AuthSessionPort['resetPassword']): AuthSessionPort {
  return { resetPassword } as unknown as AuthSessionPort;
}

function accountsWith(passport: unknown): AccountRepository {
  return { getPassport: async () => passport } as unknown as AccountRepository;
}

test('OTP válido: devuelve sesión con pasaporte + refresh token (auto-login)', async () => {
  const calls: Array<[string, string, string]> = [];
  const uc = new ResetPasswordUseCase(
    sessionsWith(async (email, token, newPassword) => {
      calls.push([email, token, newPassword]);
      return AUTH;
    }),
    accountsWith(PASSPORT),
  );

  const out = await uc.execute('a@b.co', '12345678', 'nueva-clave');

  assert.deepEqual(calls, [['a@b.co', '12345678', 'nueva-clave']]);
  assert.equal(out.refreshToken, 'rt');
  assert.equal(out.session.accessToken, 'at');
  assert.equal(out.session.expiresIn, 3600);
  assert.deepEqual(out.session.passport, PASSPORT);
});

test('OTP inválido/expirado → 410 TOKEN_EXPIRED', async () => {
  const uc = new ResetPasswordUseCase(
    sessionsWith(async () => {
      throw new InvalidOtpError();
    }),
    accountsWith(PASSPORT),
  );
  await assert.rejects(
    uc.execute('a@b.co', 'malo', 'nueva-clave'),
    (e: unknown) =>
      e instanceof AppException && e.status === 410 && e.code === 'TOKEN_EXPIRED',
  );
});

test('contraseña igual a la anterior → 422 VALIDATION_FAILED con detail de campo', async () => {
  const uc = new ResetPasswordUseCase(
    sessionsWith(async () => {
      throw new PasswordUnchangedError();
    }),
    accountsWith(PASSPORT),
  );
  await assert.rejects(
    uc.execute('a@b.co', '12345678', 'la-misma'),
    (e: unknown) =>
      e instanceof AppException &&
      e.status === 422 &&
      e.code === 'VALIDATION_FAILED' &&
      e.options.details?.[0]?.field === 'newPassword',
  );
});

test('sesión sin pasaporte (estado inconsistente) → 500 INTERNAL_ERROR', async () => {
  const uc = new ResetPasswordUseCase(
    sessionsWith(async () => AUTH),
    accountsWith(null),
  );
  await assert.rejects(
    uc.execute('a@b.co', '12345678', 'nueva-clave'),
    (e: unknown) => e instanceof AppException && e.status === 500,
  );
});
