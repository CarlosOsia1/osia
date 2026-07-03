/**
 * ServerSessionService (Ola 1F) — sesión SSO server-side. Verifica: fast-path (access cacheado vigente
 * NO llama a Supabase), slow-path (por vencer → refresca y actualiza el store), 401 si no existe / expiró
 * / el refresh murió, y destroy (borra + revoca). Fakes del store, del puerto de sesiones y de cuentas.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ErrorCode } from '@osia/shared';
import { ServerSessionService } from './server-session.service';
import type { ServerSession, SessionStore } from './ports/out/session-store.port';
import type { AuthSession, AuthSessionPort } from './ports/out/auth-session.port';
import type { AccountRepository } from './ports/out/account.repository';
import { SessionExpiredError } from './errors';
import { AppException } from '../../common/app-exception';
import type { Tx, TxRunner } from '../../common/tx';

const ACCOUNT = '0190b8e0-7c1e-7b3a-8a4e-000000000001';
const fakeTxRunner: TxRunner = { run: (fn) => fn({} as Tx) };
const passport = { accountId: ACCOUNT } as unknown as Awaited<ReturnType<AccountRepository['getPassport']>>;
const accounts: AccountRepository = { getPassport: async () => passport } as unknown as AccountRepository;

/** Store fake en memoria; registra los refresh de tokens y los borrados. */
function fakeStore(seed?: ServerSession) {
  const rows = new Map<string, ServerSession>();
  if (seed) rows.set(seed.id, seed);
  const store: SessionStore = {
    create: async (s) => {
      rows.set(s.id, { ...s });
    },
    findById: async (id) => rows.get(id) ?? null,
    findByIdForUpdate: async (_tx, id) => rows.get(id) ?? null,
    updateTokens: async (_tx, id, accessToken, refreshToken, accessExpiresAt) => {
      const r = rows.get(id);
      if (r) rows.set(id, { ...r, accessToken, refreshToken, accessExpiresAt });
    },
    deleteById: async (id) => {
      const r = rows.get(id);
      rows.delete(id);
      return r?.refreshToken ?? null;
    },
    deleteByAccount: async (accountId) => {
      for (const [id, r] of rows) if (r.accountId === accountId) rows.delete(id);
    },
  };
  return { store, rows };
}

/** Puerto de sesiones fake: `refresh` devuelve tokens nuevos o lanza SessionExpired; registra signOut. */
function fakeSessions(over: Partial<AuthSessionPort> = {}) {
  const signedOut: string[] = [];
  const sessions: AuthSessionPort = {
    signInWithPassword: async () => {
      throw new Error('no usado');
    },
    refresh: async (rt): Promise<AuthSession> => ({
      accountId: ACCOUNT,
      accessToken: `access-tras-refresh-de-${rt}`,
      refreshToken: `${rt}-rotado`,
      expiresIn: 3600,
    }),
    signOut: async (rt) => {
      signedOut.push(rt);
    },
    sendVerification: async () => {},
    verifyEmail: async () => {
      throw new Error('no usado');
    },
    sendPasswordReset: async () => {},
    resetPassword: async () => {
      throw new Error('no usado');
    },
    ...over,
  };
  return { sessions, signedOut };
}

const svc = (store: SessionStore, sessions: AuthSessionPort) =>
  new ServerSessionService(store, sessions, accounts, fakeTxRunner);

/** Fila sembrada con un access que vence en `accessInMs` y una sesión que vence en `sessionInMs`. */
const seedRow = (accessInMs: number, sessionInMs = 30 * 24 * 3600_000): ServerSession => ({
  id: 'sid-hash',
  accountId: ACCOUNT,
  accessToken: 'access-cacheado',
  refreshToken: 'refresh-1',
  accessExpiresAt: new Date(Date.now() + accessInMs),
  expiresAt: new Date(Date.now() + sessionInMs),
});

/** sha256 hex del token (igual que el servicio) para sembrar la fila bajo el id real. */
async function idOf(token: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(token).digest('hex');
}

test('resolve fast-path: access cacheado vigente → lo devuelve SIN refrescar', async () => {
  const { store, rows } = fakeStore();
  const token = 'token-fast';
  const id = await idOf(token);
  rows.set(id, { ...seedRow(600_000), id }); // vence en 10 min (> skew) → fast path
  let refreshed = false;
  const { sessions } = fakeSessions({
    refresh: async () => {
      refreshed = true;
      throw new Error('no debería refrescar');
    },
  });
  const res = await svc(store, sessions).resolve(token);
  assert.equal(res.accessToken, 'access-cacheado');
  assert.equal(refreshed, false, 'no debe llamar a Supabase en el fast-path');
});

test('resolve slow-path: access por vencer → refresca y guarda los tokens nuevos', async () => {
  const { store, rows } = fakeStore();
  const { createHash } = await import('node:crypto');
  const token = 'token-slow';
  const id = createHash('sha256').update(token).digest('hex');
  rows.set(id, { ...seedRow(1_000), id }); // vence en 1s (< skew 30s) → refresca
  const { sessions } = fakeSessions();
  const res = await svc(store, sessions).resolve(token);
  assert.equal(res.accessToken, 'access-tras-refresh-de-refresh-1');
  assert.equal(rows.get(id)?.refreshToken, 'refresh-1-rotado', 'el refresh rotado quedó guardado');
});

test('resolve: sin sesión → 401 UNAUTHENTICATED', async () => {
  const { store } = fakeStore();
  const { sessions } = fakeSessions();
  await assert.rejects(
    () => svc(store, sessions).resolve('inexistente'),
    (e: unknown) => e instanceof AppException && e.status === 401 && e.code === ErrorCode.UNAUTHENTICATED,
  );
});

test('resolve: refresh muerto en el proveedor → 401 SESSION_EXPIRED y borra la sesión', async () => {
  const { store, rows } = fakeStore();
  const { createHash } = await import('node:crypto');
  const token = 'token-muerto';
  const id = createHash('sha256').update(token).digest('hex');
  rows.set(id, { ...seedRow(1_000), id });
  const { sessions } = fakeSessions({
    refresh: async () => {
      throw new SessionExpiredError();
    },
  });
  await assert.rejects(
    () => svc(store, sessions).resolve(token),
    (e: unknown) => e instanceof AppException && e.status === 401 && e.code === ErrorCode.SESSION_EXPIRED,
  );
  assert.equal(rows.has(id), false, 'la sesión muerta se borró');
});

test('destroy: borra la fila y revoca en Supabase', async () => {
  const { store, rows } = fakeStore();
  const { createHash } = await import('node:crypto');
  const token = 'token-logout';
  const id = createHash('sha256').update(token).digest('hex');
  rows.set(id, { ...seedRow(600_000), id, refreshToken: 'refresh-a-revocar' });
  const { sessions, signedOut } = fakeSessions();
  await svc(store, sessions).destroy(token);
  assert.equal(rows.has(id), false);
  assert.deepEqual(signedOut, ['refresh-a-revocar']);
});

test('start: crea la sesión y devuelve un token opaco (hex de 64 chars)', async () => {
  const { store, rows } = fakeStore();
  const { sessions } = fakeSessions();
  const token = await svc(store, sessions).start(ACCOUNT, 'acc', 'ref', 3600);
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.equal(rows.size, 1);
});
