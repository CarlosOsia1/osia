import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeepLink } from './deepLink';

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
