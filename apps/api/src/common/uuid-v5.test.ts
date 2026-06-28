/**
 * uuidV5 — vector conocido RFC 4122 (namespace DNS + "www.example.com") y determinismo. La lógica pura
 * lleva test (§10).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { uuidV5 } from './uuid-v5';

const DNS_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

test('vector conocido: v5(DNS, "www.example.com")', () => {
  assert.equal(uuidV5('www.example.com', DNS_NS), '2ed6657d-e927-568b-95e1-2665a8aea6a2');
});

test('determinista: mismo input → mismo uuid', () => {
  assert.equal(uuidV5('a:b', DNS_NS), uuidV5('a:b', DNS_NS));
});

test('distinto input → distinto uuid; forma v5 válida', () => {
  assert.notEqual(uuidV5('a:b', DNS_NS), uuidV5('a:c', DNS_NS));
  // versión 5 (dígito 15) y variante (dígito 20 ∈ 8/9/a/b).
  assert.match(uuidV5('x', DNS_NS), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
