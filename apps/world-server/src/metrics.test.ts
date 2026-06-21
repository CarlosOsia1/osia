import test from 'node:test';
import assert from 'node:assert/strict';
import { TickMetrics } from './metrics';

test('TickMetrics: snapshot refleja el último tick + bytes por jugador', () => {
  const m = new TickMetrics();
  m.record(2, 4, 4000);
  const s = m.snapshot();
  assert.equal(s.playersInTick, 4);
  assert.equal(s.bytesOutPerTick, 4000);
  assert.equal(s.bytesPerPlayer, 1000);
  assert.equal(s.ticks, 1);
});

test('TickMetrics: 0 jugadores → bytesPerPlayer 0 (sin división por cero)', () => {
  const m = new TickMetrics();
  m.record(1, 0, 0);
  assert.equal(m.snapshot().bytesPerPlayer, 0);
});

test('TickMetrics: duración es una media móvil (EWMA) entre ticks', () => {
  const m = new TickMetrics();
  m.record(10, 1, 100); // primer tick fija el EWMA
  m.record(0, 1, 100); // baja suave, no salta a 0
  const d = m.snapshot().tickDurationMs;
  assert.ok(d > 0 && d < 10, `EWMA entre 0 y 10, fue ${d}`);
});
