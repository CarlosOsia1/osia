/**
 * varyFoliage — variación perceptual (OKLCH) del color por árbol: que mueva luminosidad, croma y
 * matiz de forma independiente (no "solo brillo"), que sea estable con offset cero, determinista y
 * que el resultado nunca se salga del cubo sRGB.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { varyFoliage, rgbToOklab, hexToRGB } from './color';

const BASE = hexToRGB('#356b2c'); // verde de follaje (verano), holgado dentro del gamut

const chromaHue = (c: readonly [number, number, number]): { C: number; h: number } => {
  const [, a, b] = rgbToOklab([c[0], c[1], c[2]]);
  return { C: Math.hypot(a, b), h: Math.atan2(b, a) };
};

test('offset cero (dL=0, dC=1, dH=0) devuelve ~el color base', () => {
  const out = varyFoliage(BASE, 0, 1, 0);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(out[i]! - BASE[i]!) < 1e-6, `canal ${i}`);
});

test('dL mueve la luminosidad (OKLab L) en su dirección: unos pinos más claros, otros más oscuros', () => {
  const baseL = rgbToOklab(BASE)[0];
  const brighter = rgbToOklab(varyFoliage(BASE, 0.08, 1, 0))[0];
  const darker = rgbToOklab(varyFoliage(BASE, -0.08, 1, 0))[0];
  assert.ok(brighter > baseL, 'dL>0 aclara');
  assert.ok(darker < baseL, 'dL<0 oscurece');
  // el matiz se mantiene ~estable al solo mover L (puede correrse un pelín en el borde del gamut)
  assert.ok(Math.abs(chromaHue(varyFoliage(BASE, 0.06, 1, 0)).h - chromaHue(BASE).h) < 0.05);
});

test('dC escala el croma (saturación): >1 aviva, <1 apaga', () => {
  const base = chromaHue(BASE).C;
  assert.ok(chromaHue(varyFoliage(BASE, 0, 1.3, 0)).C > base, 'dC>1 sube croma');
  assert.ok(chromaHue(varyFoliage(BASE, 0, 0.6, 0)).C < base, 'dC<1 baja croma');
});

test('dH gira el matiz ~los grados pedidos (variación de COLOR, no de brillo)', () => {
  const before = chromaHue(BASE).h;
  const after = chromaHue(varyFoliage(BASE, 0, 1, 15)).h;
  const deltaDeg = ((after - before) * 180) / Math.PI;
  assert.ok(Math.abs(deltaDeg - 15) < 1.0, `giro ≈15° (fue ${deltaDeg.toFixed(2)})`);
});

test('el resultado siempre queda dentro del cubo sRGB [0,1]', () => {
  for (const dL of [-0.2, 0, 0.3]) {
    for (const dC of [0.2, 1, 2]) {
      for (const dH of [-40, 0, 40]) {
        const out = varyFoliage(BASE, dL, dC, dH);
        for (const ch of out) assert.ok(ch >= 0 && ch <= 1, `canal fuera de rango: ${ch}`);
      }
    }
  }
});

test('es determinista (mismos parámetros → mismo color)', () => {
  const a = varyFoliage(BASE, 0.05, 1.1, -7);
  const b = varyFoliage(BASE, 0.05, 1.1, -7);
  assert.deepEqual(a, b);
});
