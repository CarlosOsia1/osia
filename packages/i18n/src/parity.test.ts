import { test } from 'node:test';
import assert from 'node:assert/strict';
import es from './messages/es.json';
import en from './messages/en.json';

/** Aplana las claves anidadas a 'a.b.c' para comparar conjuntos entre locales. */
function keys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object'
      ? keys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

test('paridad de claves entre en.json y es.json (ningún texto a medio traducir)', () => {
  const esKeys = keys(es).sort();
  const enKeys = keys(en).sort();
  const missingInEn = esKeys.filter((k) => !enKeys.includes(k));
  const missingInEs = enKeys.filter((k) => !esKeys.includes(k));
  assert.deepEqual(missingInEn, [], `claves que faltan en en.json: ${missingInEn.join(', ')}`);
  assert.deepEqual(missingInEs, [], `claves que faltan en es.json: ${missingInEs.join(', ')}`);
});
