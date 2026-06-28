/**
 * vestibuleLoginUrl (S3.1-H1) — un residente sin sesión va al /login del Vestíbulo con returnTo.
 * Función pura; corre con tsx (node:test).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { vestibuleLoginUrl } from './vestibule';

test('vestibuleLoginUrl: apunta al /login del Vestíbulo con el returnTo dado', () => {
  const u = new URL(vestibuleLoginUrl('http://localhost:3002/feed'));
  assert.equal(u.pathname, '/login');
  assert.equal(u.searchParams.get('returnTo'), 'http://localhost:3002/feed');
});

test('vestibuleLoginUrl: returnTo por defecto = la app social', () => {
  const u = new URL(vestibuleLoginUrl());
  assert.equal(u.searchParams.get('returnTo'), 'http://localhost:3002');
});
