/**
 * RequestAccountDeletionUseCase (S2-C2) — genera un token de borrado (guarda el HASH, no el token
 * limpio), arma el link y lo manda al email. Silencioso si la cuenta no existe. Fakes de los ports.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { RequestAccountDeletionUseCase } from './request-account-deletion.use-case';
import type { AccountRepository } from '../ports/out/account.repository';
import type { DeletionTokenRepository } from '../ports/out/deletion-token.repository';
import type { EmailPort } from '../ports/out/email.port';
import type { Env } from '../../../config/env';

const env = { APP_BASE_URL: 'https://app.osia.com' } as unknown as Env;

test('cuenta existente: crea el token por HASH y manda el link con el token limpio', async () => {
  const created: Array<{ accountId: string; tokenHash: string; expiresAt: Date }> = [];
  const sent: Array<{ to: string; link: string }> = [];
  const uc = new RequestAccountDeletionUseCase(
    { getEmail: async () => 'a@b.co' } as unknown as AccountRepository,
    {
      create: async (accountId, tokenHash, expiresAt) => {
        created.push({ accountId, tokenHash, expiresAt });
      },
      consume: async () => null,
    } as DeletionTokenRepository,
    {
      sendAccountDeletionLink: async (to, link) => {
        sent.push({ to, link });
      },
    } as EmailPort,
    env,
  );

  await uc.execute('id-1');

  assert.equal(created.length, 1, 'creó un token');
  const tok = created[0]!;
  assert.equal(tok.accountId, 'id-1');
  assert.equal(tok.tokenHash.length, 64, 'guarda el SHA-256 hex, no el token limpio');
  assert.ok(tok.expiresAt.getTime() > Date.now(), 'con vencimiento futuro');

  assert.equal(sent.length, 1, 'mandó el email');
  const mail = sent[0]!;
  assert.equal(mail.to, 'a@b.co');
  // El link lleva el token LIMPIO; su sha256 debe coincidir con el hash guardado.
  const token = new URL(mail.link).searchParams.get('token') ?? '';
  assert.equal(createHash('sha256').update(token).digest('hex'), tok.tokenHash);
});

test('cuenta inexistente: no crea token ni manda email (silencioso, no filtra)', async () => {
  let touched = 0;
  const uc = new RequestAccountDeletionUseCase(
    { getEmail: async () => null } as unknown as AccountRepository,
    {
      create: async () => {
        touched++;
      },
      consume: async () => null,
    } as DeletionTokenRepository,
    {
      sendAccountDeletionLink: async () => {
        touched++;
      },
    } as EmailPort,
    env,
  );
  await uc.execute('ghost');
  assert.equal(touched, 0);
});
