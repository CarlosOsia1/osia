/**
 * Gate de accesibilidad (S1.9-H3): valida que los pares texto/fondo del design system cumplan
 * WCAG AA. Parsea los tokens reales de `styles.css` (fuente de verdad), resuelve los semánticos a
 * su hex primitivo y calcula el ratio de contraste. Un cambio de paleta que baje de AA rompe el CI.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'styles.css'), 'utf8');

// Primitivos: --osia-X: #hex
const primitives = new Map<string, string>();
for (const m of css.matchAll(/--(osia-[\w-]+):\s*(#[0-9a-fA-F]{6})/g)) primitives.set(m[1]!, m[2]!);

// Semánticos: --color-X: var(--osia-Y)  →  resuelto a hex
const semantic = new Map<string, string>();
for (const m of css.matchAll(/--(color-[\w-]+):\s*var\(--(osia-[\w-]+)\)/g)) {
  const hex = primitives.get(m[2]!);
  if (hex) semantic.set(m[1]!, hex);
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function ratioOf(textRole: string, bgRole: string): number {
  const text = semantic.get(textRole);
  const bg = semantic.get(bgRole);
  assert.ok(text, `token ${textRole} no resuelto`);
  assert.ok(bg, `token ${bgRole} no resuelto`);
  return contrast(text, bg);
}

const BACKGROUNDS = ['color-bg', 'color-surface'];

// AA texto normal (4.5:1). text-subtle (taupe-500) es el PISO de marca: solo se exige sobre el
// fondo base (donde se usa para metadatos), no sobre superficies elevadas.
test('contraste AA: texto principal/fuerte/atenuado sobre fondo y superficie (>= 4.5:1)', () => {
  for (const bg of BACKGROUNDS) {
    for (const textRole of ['color-text', 'color-text-strong', 'color-text-muted']) {
      const r = ratioOf(textRole, bg);
      assert.ok(r >= 4.5, `${textRole} sobre ${bg}: ${r.toFixed(2)}:1 < 4.5 (AA)`);
    }
  }
});

test('contraste AA: texto-subtle (piso) sobre el fondo base (>= 4.5:1)', () => {
  const r = ratioOf('color-text-subtle', 'color-bg');
  assert.ok(r >= 4.5, `color-text-subtle sobre color-bg: ${r.toFixed(2)}:1 < 4.5 (AA)`);
});

// Acento champán: se usa en CTA/links/numbers (texto grande o no-texto) → AA large (3:1).
test('contraste AA-large: acento sobre fondo y superficie (>= 3:1)', () => {
  for (const bg of BACKGROUNDS) {
    const r = ratioOf('color-accent', bg);
    assert.ok(r >= 3, `color-accent sobre ${bg}: ${r.toFixed(2)}:1 < 3 (AA large)`);
  }
});
