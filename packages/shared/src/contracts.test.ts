/**
 * Smoke tests de los contratos de identidad (S1.1-H2 DoD): ErrorCode, experiencias,
 * enums espejo del ER, paginación por cursor y esquemas Zod. Corre con `tsx` (node:test).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { ErrorCode, isErrorCode } from './rest/errors';
import { clampLimit, encodeCursor, decodeCursor, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from './rest/pagination';
import {
  EXPERIENCES,
  LIVE_EXPERIENCES,
  getExperience,
} from './catalog/experiences';
import {
  isAccountStatus,
  isInvitationStatus,
  isWaitlistStatus,
  isHandle,
  isAccentColor,
  ACCENT_COLOR_DEFAULT,
} from './domain/enums';
import { signupSchema, verifyEmailSchema, waitlistSchema } from './schemas';

// --- ErrorCode (taxonomía REST) ---
test('ErrorCode: códigos canónicos presentes y guard correcto', () => {
  assert.equal(ErrorCode.NOT_INVITED, 'NOT_INVITED');
  assert.equal(ErrorCode.HANDLE_TAKEN, 'HANDLE_TAKEN');
  assert.ok(isErrorCode('VALIDATION_FAILED'));
  assert.ok(isErrorCode(ErrorCode.RATE_LIMITED));
  assert.ok(!isErrorCode('NOPE_NOT_A_CODE'));
  assert.ok(!isErrorCode(42));
});

// Contract gate (S1.9-H3): cada entrada del enum es canónica (key === value). El sobre de error de
// apps/api (http-exception.filter) solo emite valores de ErrorCode (type-safe en compilación); este
// test es la red de seguridad en runtime contra un typo/drift que rompería el contrato con clientes.
test('ErrorCode: cada entrada es canónica (key === value, sin drift)', () => {
  for (const [key, value] of Object.entries(ErrorCode)) {
    assert.equal(value, key, `ErrorCode.${key} debe valer '${key}', vale '${value}'`);
  }
});

// --- Catálogo de experiencias ---
test('experiences: El Mundo es la única puerta viva de Fase 1', () => {
  assert.equal(EXPERIENCES.length, 1);
  const mundo = getExperience('world');
  assert.ok(mundo);
  assert.deepEqual(mundo, {
    id: 'world',
    nombre: 'El Mundo',
    dominio: 'mundo.osia.com',
    estado: 'live',
    fase: 1,
  });
  assert.equal(LIVE_EXPERIENCES.length, 1);
  assert.equal(getExperience('social' as 'world'), undefined);
});

// --- Enums espejo del ER ---
test('enums: guards aceptan valores del ER y rechazan ajenos', () => {
  assert.ok(isAccountStatus('active'));
  assert.ok(!isAccountStatus('deleted'));
  assert.ok(isInvitationStatus('accepted'));
  assert.ok(!isInvitationStatus('redeemed')); // el ER usa 'accepted', no 'redeemed'
  assert.ok(isWaitlistStatus('queued'));
  assert.ok(!isWaitlistStatus('pending'));
});

test('enums: handle y accentColor validan contra los patterns del ER', () => {
  assert.ok(isHandle('carlos_01'));
  assert.ok(!isHandle('Carlos')); // mayúsculas no permitidas
  assert.ok(!isHandle('ab')); // < 3
  assert.ok(isAccentColor(ACCENT_COLOR_DEFAULT));
  assert.ok(isAccentColor('#0A0A0A'));
  assert.ok(!isAccentColor('CBB89A')); // sin '#'
});

// --- Paginación por cursor ---
test('pagination: clampLimit respeta default y tope', () => {
  assert.equal(clampLimit(undefined), DEFAULT_PAGE_LIMIT);
  assert.equal(clampLimit(0), 1);
  assert.equal(clampLimit(9999), MAX_PAGE_LIMIT);
  assert.equal(clampLimit(37), 37);
});

test('pagination: cursor round-trip y decode robusto', () => {
  const cursor = { sortKey: '2026-06-23T00:00:00Z', id: '01J9-abc' };
  const round = decodeCursor(encodeCursor(cursor));
  assert.deepEqual(round, cursor);
  // numérico también
  assert.deepEqual(decodeCursor(encodeCursor({ sortKey: 42, id: 'x' })), { sortKey: 42, id: 'x' });
  // input basura no lanza, devuelve null
  assert.equal(decodeCursor('no-es-base64-valido!!!'), null);
  assert.equal(decodeCursor(''), null);
});

// --- Esquemas Zod ---
test('schemas: signup valida y normaliza; rechaza handle/email inválidos', () => {
  const ok = signupSchema.parse({
    code: 'OSIA-1234',
    email: '  Carlos@OSIA.com ',
    handle: 'carlos',
    displayName: 'Carlos',
  });
  assert.equal(ok.email, 'carlos@osia.com'); // trim + lowercase
  assert.equal(ok.password, undefined); // opcional

  assert.ok(!signupSchema.safeParse({ code: 'x', email: 'no-email', handle: 'carlos', displayName: 'C' }).success);
  assert.ok(!signupSchema.safeParse({ code: 'x', email: 'a@b.co', handle: 'NO', displayName: 'C' }).success);
});

test('schemas: verifyEmail y waitlist', () => {
  assert.ok(verifyEmailSchema.safeParse({ email: 'a@b.co', token: '123456' }).success);
  assert.ok(!verifyEmailSchema.safeParse({ email: 'a@b.co', token: '' }).success);
  assert.ok(!verifyEmailSchema.safeParse({ token: '123456' }).success); // email requerido
  assert.ok(waitlistSchema.safeParse({ email: 'a@b.co', source: 'landing' }).success);
  assert.ok(waitlistSchema.safeParse({ email: 'a@b.co' }).success); // source opcional
  assert.ok(!waitlistSchema.safeParse({ email: 'nope' }).success);
});
