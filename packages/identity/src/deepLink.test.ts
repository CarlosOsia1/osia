import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeepLink, resolvePostLoginUrl } from './deepLink';

test('buildDeepLink: El Mundo resuelve a su dominio (https)', () => {
  assert.equal(buildDeepLink('world'), 'https://mundo.osia.com');
});

test('buildDeepLink: agrega query params', () => {
  assert.equal(buildDeepLink('world', { room: 'hub' }), 'https://mundo.osia.com?room=hub');
});

test('buildDeepLink: La Red Social resuelve a su dominio', () => {
  assert.equal(buildDeepLink('social'), 'https://social.osia.com');
});

test('buildDeepLink: experiencia no presente en el catálogo lanza', () => {
  // `games` es un ExperienceId válido pero aún no tiene entrada viva en el catálogo.
  assert.throws(() => buildDeepLink('games'));
});

test('resolvePostLoginUrl: rutas internas, allowlist y cierre del open redirect', () => {
  const allowed = ['http://localhost:3002', 'https://social.osia.com'];
  const opts = { allowedOrigins: allowed, fallback: '/' };

  // Ruta interna válida → se respeta.
  assert.equal(resolvePostLoginUrl('/passport', opts), '/passport');
  // Sin candidato → fallback.
  assert.equal(resolvePostLoginUrl(null, opts), '/');
  assert.equal(resolvePostLoginUrl(undefined, opts), '/');
  // Open redirect protocol-relative → RECHAZADO (fallback), no navega fuera del sitio.
  assert.equal(resolvePostLoginUrl('//evil.com', opts), '/');
  assert.equal(resolvePostLoginUrl('/\\evil.com', opts), '/');
  // URL absoluta de dominio del ecosistema → permitida.
  assert.equal(resolvePostLoginUrl('http://localhost:3002/feed', opts), 'http://localhost:3002/feed');
  assert.equal(resolvePostLoginUrl('https://social.osia.com/profile/x', opts), 'https://social.osia.com/profile/x');
  // URL absoluta de dominio AJENO → RECHAZADA (fallback).
  assert.equal(resolvePostLoginUrl('https://evil.com/steal', opts), '/');
  // Esquema no http(s) (javascript:, data:) → RECHAZADO.
  assert.equal(resolvePostLoginUrl('javascript:alert(1)', opts), '/');
});
