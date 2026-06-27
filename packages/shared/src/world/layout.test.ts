/**
 * Layout del bosque — FUENTE ÚNICA compartida: debe ser DETERMINISTA (dos jugadores ven el mismo
 * árbol: posición, escala y offset de color), con los offsets de color dentro de sus rangos, y con
 * el spawn siempre despejado. Corre con `tsx` (node:test).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { FOREST_LAYOUT, forestTrees, worldObstacles, isSpawnClear, safeSpawn } from './layout';

test('forestTrees es determinista (mismas posiciones/escala/offset en cada llamada)', () => {
  assert.deepEqual(forestTrees(), forestTrees());
});

test('genera exactamente count árboles', () => {
  assert.equal(forestTrees().length, FOREST_LAYOUT.count);
});

test('los offsets de color por árbol caen dentro de sus rangos configurados', () => {
  const F = FOREST_LAYOUT;
  for (const t of forestTrees()) {
    assert.ok(t.scale >= F.scaleMin && t.scale <= F.scaleMax, `scale fuera de rango: ${t.scale}`);
    assert.ok(Math.abs(t.dL) <= F.tintLight + 1e-9, `dL fuera de rango: ${t.dL}`);
    assert.ok(t.dC >= F.tintChromaMin - 1e-9 && t.dC <= F.tintChromaMax + 1e-9, `dC fuera de rango: ${t.dC}`);
    const hueMin = F.tintHueBiasDeg - F.tintHueDeg;
    const hueMax = F.tintHueBiasDeg + F.tintHueDeg;
    assert.ok(t.dH >= hueMin - 1e-9 && t.dH <= hueMax + 1e-9, `dH fuera de rango: ${t.dH}`);
  }
});

test('los árboles NO son todos del mismo color (hay variación real de matiz, no solo brillo)', () => {
  const trees = forestTrees();
  const distinctChroma = new Set(trees.map((t) => t.dC.toFixed(4)));
  const distinctHue = new Set(trees.map((t) => t.dH.toFixed(4)));
  assert.ok(distinctChroma.size > 1, 'el croma varía entre árboles');
  assert.ok(distinctHue.size > 1, 'el matiz varía entre árboles');
});

test('worldObstacles incluye los árboles + el monolito; el spawn siempre cae despejado', () => {
  assert.equal(worldObstacles().length, FOREST_LAYOUT.count + 1);
  for (let i = 0; i < 50; i++) {
    const sp = safeSpawn(i);
    assert.ok(isSpawnClear(sp.x, sp.z), `spawn ${i} obstruido: ${JSON.stringify(sp)}`);
  }
});
