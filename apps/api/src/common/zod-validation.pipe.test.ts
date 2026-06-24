/** Test del ZodValidationPipe (S1.3-H1 DoD: valida un DTO con Zod y emite ApiError en fallo). */

import test from 'node:test';
import assert from 'node:assert/strict';
import { waitlistSchema } from '@osia/shared';
import { ZodValidationPipe } from './zod-validation.pipe';
import { AppException } from './app-exception';

test('ZodValidationPipe: payload válido pasa y normaliza', () => {
  const pipe = new ZodValidationPipe(waitlistSchema);
  const out = pipe.transform({ email: '  A@B.CO ', source: 'landing' });
  assert.equal(out.email, 'a@b.co'); // trim + lowercase del esquema
});

test('ZodValidationPipe: payload inválido lanza AppException 422 con details', () => {
  const pipe = new ZodValidationPipe(waitlistSchema);
  try {
    pipe.transform({ email: 'no-es-email' });
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppException);
    assert.equal(err.status, 422);
    assert.equal(err.code, 'VALIDATION_FAILED');
    assert.ok((err.options.details?.length ?? 0) >= 1);
  }
});
