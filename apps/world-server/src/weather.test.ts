import test from 'node:test';
import assert from 'node:assert/strict';
import { weatherProfileFor, CYCLE_SECONDS } from '@osia/atmosphere';
import { WeatherDirector } from './weather';

/** Corre un director con un reloj controlado y devuelve la secuencia de climas difundidos. */
function run(seed: number, biome = 'bosque-celeste'): string[] {
  let t = 0;
  const director = new WeatherDirector(biome, () => t, seed);
  const seq: string[] = [];
  for (let i = 0; i < 400; i++) {
    t += 5000; // +5 s por paso (cubre varios cambios de fase)
    if (director.update())
      seq.push(`${director.weather.kind}:${director.weather.intensity.toFixed(3)}`);
  }
  return seq;
}

const DAY_MS = CYCLE_SECONDS * 1000; // un día de juego = 1 ciclo día/noche

/** Detecta los INICIOS de evento (transición despejado→activo) recorriendo el reloj. */
function eventStarts(
  seed: number,
  biome: string,
  totalMs: number,
  stepMs: number,
): { dayOf: (t: number) => number; starts: number[] } {
  let t = 0;
  const director = new WeatherDirector(biome, () => t, seed);
  const starts: number[] = [];
  let prevActive = false;
  for (let i = 0; i < totalMs / stepMs; i++) {
    t += stepMs;
    director.update();
    const active = director.weather.kind !== 'despejado';
    if (active && !prevActive) starts.push(t);
    prevActive = active;
  }
  return { dayOf: (x: number) => Math.floor(x / DAY_MS), starts };
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

test('WeatherDirector: COMO MÁXIMO 2 eventos de clima por día de juego — cadencia escasa', () => {
  for (const biome of ['bosque-celeste', 'tundra-nevada', 'dunas-doradas']) {
    const { dayOf, starts } = eventStarts(1337, biome, 5 * DAY_MS, 10_000);
    const perDay = new Map<number, number>();
    for (const t of starts) perDay.set(dayOf(t), (perDay.get(dayOf(t)) ?? 0) + 1);
    for (const [day, n] of perDay) {
      assert.ok(n <= 2, `bioma ${biome}: el día ${day} tuvo ${n} eventos (>2)`);
    }
  }
});

test('WeatherDirector: cada evento dura entre 2 y 5 minutos', () => {
  let t = 0;
  const director = new WeatherDirector('bosque-celeste', () => t, 1337);
  const durations: number[] = [];
  let prevActive = false;
  let start = -1;
  for (let i = 0; i < (5 * DAY_MS) / 5000; i++) {
    t += 5000;
    director.update();
    const active = director.weather.kind !== 'despejado';
    if (active && !prevActive) start = t;
    if (!active && prevActive && start >= 0) {
      durations.push(t - start);
      start = -1;
    }
    prevActive = active;
  }
  assert.ok(durations.length > 0, 'se esperaba al menos un evento completo');
  for (const ms of durations) {
    assert.ok(ms >= 2 * 60_000 - 6000 && ms <= 5 * 60_000 + 6000, `duración ${ms} ms fuera de 2–5 min`);
  }
});

test('WeatherDirector: la intensidad objetivo respeta el [base, pico] del perfil — S2-B2', () => {
  const { intensity } = weatherProfileFor('bosque-celeste');
  let t = 0;
  const director = new WeatherDirector('bosque-celeste', () => t, 1337);
  for (let i = 0; i < (5 * DAY_MS) / 5000; i++) {
    t += 5000;
    if (director.update() && director.weather.kind !== 'despejado') {
      const v = director.weather.intensity;
      assert.ok(v >= intensity[0] - 1e-9 && v <= intensity[1] + 1e-9, `intensity ${v} fuera de [${intensity[0]}, ${intensity[1]}]`);
    }
  }
});

test('WeatherDirector: serialize/restore reanuda la fase actual (sin saltar) — S2-B4', () => {
  let t = 0;
  const a = new WeatherDirector('tundra-nevada', () => t, 1337);
  while (a.weather.kind === 'despejado') {
    t += 5000;
    a.update(); // avanza hasta entrar en un clima activo
  }
  const snap = a.serialize();
  const tAtSnap = t;

  // "reinicio" del server: nuevo director con el mismo reloj, restaurado desde el checkpoint.
  const b = new WeatherDirector('tundra-nevada', () => t, 1337);
  b.restore(snap);
  assert.deepEqual(b.weather, a.weather, 'el clima vigente debe restaurarse igual');

  // En el mismo instante del snapshot, B no debe cambiar de fase (phaseUntil restaurado).
  t = tAtSnap;
  assert.equal(b.update(), false, 'no debe saltar de fase justo tras restaurar');
  assert.deepEqual(b.weather, a.weather, 'sigue el mismo clima tras un update sin cambio');
});
