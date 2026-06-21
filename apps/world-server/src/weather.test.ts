import test from 'node:test';
import assert from 'node:assert/strict';
import { WeatherDirector } from './weather';

/** Corre un director con un reloj controlado y devuelve la secuencia de climas difundidos. */
function run(seed: number): string[] {
  let t = 0;
  const director = new WeatherDirector('bosque-celeste', () => t, seed);
  const seq: string[] = [];
  for (let i = 0; i < 400; i++) {
    t += 5000; // +5 s por paso (cubre varios cambios de fase)
    if (director.update())
      seq.push(`${director.weather.kind}:${director.weather.intensity.toFixed(3)}`);
  }
  return seq;
}

test('WeatherDirector: misma semilla → misma secuencia de clima (determinista)', () => {
  assert.deepEqual(run(1337), run(1337));
});

test('WeatherDirector: semillas distintas → secuencias distintas', () => {
  assert.notDeepEqual(run(1337), run(42));
});

test('WeatherDirector: solo difunde climas permitidos por el bioma', () => {
  const allowed = new Set(['despejado', 'lluvia', 'niebla']); // bosque-celeste (ver biomes.ts)
  for (const s of run(7)) {
    const kind = s.split(':')[0]!;
    assert.ok(allowed.has(kind), `clima inesperado para el bioma: ${kind}`);
  }
});
