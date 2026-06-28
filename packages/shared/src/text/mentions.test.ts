/** parseMentions — extracción de @handles (única, minúscula, formato del pasaporte). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMentions } from './mentions';

test('extrae handles únicos en minúscula, en orden de aparición', () => {
  assert.deepEqual(parseMentions('hola @Maria y @jose, @maria otra vez'), ['maria', 'jose']);
});

test('sin menciones → []; @ con menos de 3 chars no cuenta', () => {
  assert.deepEqual(parseMentions('sin menciones aquí'), []);
  assert.deepEqual(parseMentions('@ab corto'), []);
});

test('respeta el largo máximo del handle (20): un @ de 21 matchea los primeros 20', () => {
  assert.deepEqual(parseMentions('@abcdefghijklmnopqrstu'), ['abcdefghijklmnopqrst']);
});
