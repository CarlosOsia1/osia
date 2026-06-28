/**
 * Tests del cliente SSO (S1.3-H4): cubren los caminos de sesión/refresh/401 con un `fetch`
 * mockeado, sin red. Verifican: cache del access token, mapeo del sobre de error a OsiaApiError,
 * refresh silencioso vía cookie en ensureAccessToken, y el Bearer en el world ticket.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { OsiaIdentityClient, OsiaApiError } from './OsiaIdentityClient';

type MockCall = { url: string; init: RequestInit };

function mockFetch(handler: (call: MockCall) => { status: number; body?: unknown }) {
  const calls: MockCall[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: MockCall = { url: String(input), init: init ?? {} };
    calls.push(call);
    const { status, body } = handler(call);
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const SESSION = {
  accessToken: 'access-1',
  expiresIn: 600,
  passport: {
    accountId: 'acc',
    profile: {},
    role: 'member',
    scopes: [],
    featureFlags: { world: true, social: false, games: false },
  },
};

test('login: cachea el access token y manda credentials:include', async () => {
  const { fetchImpl, calls } = mockFetch(() => ({ status: 200, body: { session: SESSION } }));
  const client = new OsiaIdentityClient({ apiBaseUrl: 'http://api', fetchImpl });

  const session = await client.login({ email: 'a@b.com', password: 'x' });

  assert.equal(session.accessToken, 'access-1');
  assert.equal(client.currentAccessToken, 'access-1');
  assert.equal(calls[0]!.init.credentials, 'include'); // cookie de refresh del SSO
  assert.match(calls[0]!.url, /\/v1\/auth\/login$/);
});

test('getSession 401: lanza OsiaApiError con status y code del sobre', async () => {
  const { fetchImpl } = mockFetch(() => ({
    status: 401,
    body: { error: { code: 'UNAUTHENTICATED', message: 'sin sesión' } },
  }));
  const client = new OsiaIdentityClient({ apiBaseUrl: 'http://api', fetchImpl });

  await assert.rejects(
    () => client.getSession(),
    (err: unknown) =>
      err instanceof OsiaApiError && err.status === 401 && err.code === 'UNAUTHENTICATED',
  );
});

test('ensureAccessToken: sin token, refresca vía getSession; si 401, propaga', async () => {
  const { fetchImpl, calls } = mockFetch((call) =>
    call.url.endsWith('/v1/auth/session')
      ? { status: 401, body: { error: { code: 'SESSION_EXPIRED', message: 'expiró' } } }
      : { status: 200, body: {} },
  );
  const client = new OsiaIdentityClient({ apiBaseUrl: 'http://api', fetchImpl });

  await assert.rejects(() => client.requestWorldTicket(), (e: unknown) => e instanceof OsiaApiError);
  assert.ok(
    calls.some((c) => c.url.endsWith('/v1/auth/session')),
    'intentó refrescar vía /session antes de fallar',
  );
});

test('requestWorldTicket: con token fresco no re-fetcha session y manda Bearer', async () => {
  const { fetchImpl, calls } = mockFetch((call) => {
    if (call.url.endsWith('/v1/auth/login')) return { status: 200, body: { session: SESSION } };
    if (call.url.endsWith('/v1/world/tickets'))
      return { status: 200, body: { ticket: 't', expiresIn: 60, wsUrl: 'ws://x' } };
    return { status: 200, body: {} };
  });
  const client = new OsiaIdentityClient({ apiBaseUrl: 'http://api', fetchImpl });

  await client.login({ email: 'a@b.com', password: 'x' }); // token fresco en memoria
  const ticket = await client.requestWorldTicket();

  assert.equal(ticket.ticket, 't');
  assert.ok(
    !calls.some((c) => c.url.endsWith('/v1/auth/session')),
    'no refrescó: el token cacheado seguía fresco',
  );
  const ticketCall = calls.find((c) => c.url.endsWith('/v1/world/tickets'))!;
  const headers = ticketCall.init.headers as Record<string, string>;
  assert.equal(headers.authorization, 'Bearer access-1');
});

test('confirmAccountDeletion: POST público con el token, sin Bearer', async () => {
  const { fetchImpl, calls } = mockFetch(() => ({ status: 204 }));
  const client = new OsiaIdentityClient({ apiBaseUrl: 'http://api', fetchImpl });

  await client.confirmAccountDeletion('plain-token');

  const call = calls.find((c) => c.url.endsWith('/v1/accounts/deletion/confirm'))!;
  assert.equal(call.init.method, 'POST');
  assert.equal(JSON.parse(String(call.init.body)).token, 'plain-token');
  const headers = (call.init.headers ?? {}) as Record<string, string>;
  assert.equal(headers.authorization, undefined, 'es público: no manda Bearer');
  // No debe intentar refrescar sesión (no requiere auth).
  assert.ok(!calls.some((c) => c.url.endsWith('/v1/auth/session')));
});

test('requestAccountDeletion: requiere sesión y manda Bearer', async () => {
  const { fetchImpl, calls } = mockFetch((call) =>
    call.url.endsWith('/v1/auth/login')
      ? { status: 200, body: { session: SESSION } }
      : { status: 204 },
  );
  const client = new OsiaIdentityClient({ apiBaseUrl: 'http://api', fetchImpl });

  await client.login({ email: 'a@b.com', password: 'x' });
  await client.requestAccountDeletion();

  const call = calls.find((c) => c.url.endsWith('/v1/accounts/me/deletion-request'))!;
  const headers = call.init.headers as Record<string, string>;
  assert.equal(headers.authorization, 'Bearer access-1');
});

test('authedFetch: adjunta Bearer del token fresco y devuelve el JSON tipado', async () => {
  const { fetchImpl, calls } = mockFetch((call) => {
    if (call.url.endsWith('/v1/auth/login')) return { status: 200, body: { session: SESSION } };
    if (call.url.endsWith('/v1/posts')) return { status: 200, body: { post: { id: 'p1' } } };
    return { status: 200, body: {} };
  });
  const client = new OsiaIdentityClient({ apiBaseUrl: 'http://api', fetchImpl });

  await client.login({ email: 'a@b.com', password: 'x' }); // token fresco en memoria
  const res = await client.authedFetch<{ post: { id: string } }>('/v1/posts', {
    method: 'POST',
    body: JSON.stringify({ body: 'hola' }),
  });

  assert.equal(res.post.id, 'p1');
  const call = calls.find((c) => c.url.endsWith('/v1/posts'))!;
  const headers = call.init.headers as Record<string, string>;
  assert.equal(headers.authorization, 'Bearer access-1');
  assert.equal(call.init.credentials, 'include');
});

test('authedFetch: sin token refresca vía /session; si 401, propaga OsiaApiError', async () => {
  const { fetchImpl, calls } = mockFetch((call) =>
    call.url.endsWith('/v1/auth/session')
      ? { status: 401, body: { error: { code: 'SESSION_EXPIRED', message: 'expiró' } } }
      : { status: 200, body: {} },
  );
  const client = new OsiaIdentityClient({ apiBaseUrl: 'http://api', fetchImpl });

  await assert.rejects(
    () => client.authedFetch('/v1/posts', { method: 'POST' }),
    (e: unknown) => e instanceof OsiaApiError && e.status === 401,
  );
  assert.ok(calls.some((c) => c.url.endsWith('/v1/auth/session')), 'intentó refrescar antes de fallar');
});

test('logout: limpia el access token en memoria', async () => {
  const { fetchImpl } = mockFetch((call) =>
    call.url.endsWith('/v1/auth/logout')
      ? { status: 204 }
      : { status: 200, body: { session: SESSION } },
  );
  const client = new OsiaIdentityClient({ apiBaseUrl: 'http://api', fetchImpl });

  await client.login({ email: 'a@b.com', password: 'x' });
  assert.equal(client.currentAccessToken, 'access-1');
  await client.logout();
  assert.equal(client.currentAccessToken, null);
});
