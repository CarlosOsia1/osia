import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TokenBucket, KeyedRateLimiter } from './rateLimit';

test('TokenBucket: ráfaga hasta capacity, luego se agota', () => {
  const b = new TokenBucket(3, 1000, 0);
  assert.equal(b.take(0), true);
  assert.equal(b.take(0), true);
  assert.equal(b.take(0), true);
  assert.equal(b.take(0), false); // agotado
});

test('TokenBucket: recarga 1 token cada refillMs', () => {
  const b = new TokenBucket(2, 1000, 0);
  b.take(0);
  b.take(0);
  assert.equal(b.take(0), false);
  assert.equal(b.take(1000), true); // +1 token al pasar 1000 ms
  assert.equal(b.take(1000), false);
});

test('KeyedRateLimiter: un bucket independiente por clave', () => {
  const rl = new KeyedRateLimiter(1, 1000);
  assert.equal(rl.take('a', 0), true);
  assert.equal(rl.take('a', 0), false); // misma clave, agotada
  assert.equal(rl.take('b', 0), true); // otra clave, su propio bucket
});
