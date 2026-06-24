import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeepLink } from './deepLink';

test('buildDeepLink: El Mundo resuelve a su dominio (https)', () => {
  assert.equal(buildDeepLink('world'), 'https://mundo.osia.com');
});

test('buildDeepLink: agrega query params', () => {
  assert.equal(buildDeepLink('world', { room: 'hub' }), 'https://mundo.osia.com?room=hub');
});

test('buildDeepLink: experiencia desconocida lanza', () => {
  assert.throws(() => buildDeepLink('social' as 'world'));
});
