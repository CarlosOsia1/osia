/**
 * Pipeline de fuentes (S1.1-H3 / docs/08 §11): subset latin + conversión a woff2.
 *
 * Fuente: brand/fonts/*.ttf (OFL). Salida: woff2 subset latin (~60% más livianas).
 * Las woff2 se escriben en:
 *   1) packages/ui/fonts/  → @osia/ui es DUEÑO de la tipografía (la sirve por su @font-face).
 *   2) apps/*​/public/fonts/ → Next.js sirve estáticos solo desde /public. Se escribe a TODAS las
 *      apps Next del monorepo (world-client, web, social): así una app nueva no puede quedarse sin
 *      las fuentes de marca por un olvido — el bug de "social sin Italiana/Jost" no se repite.
 *
 * Correr con:  pnpm --filter @osia/assets build:fonts
 */
import subsetFont from 'subset-font';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..'); // packages/assets/scripts → raíz del repo
const SRC = join(repoRoot, 'brand', 'fonts');
const UI_FONTS = join(repoRoot, 'packages', 'ui', 'fonts');
// Toda app Next que consuma @osia/ui necesita las woff2 en su /public (Next solo sirve de ahí).
const APP_PUBLIC_FONTS = ['world-client', 'web', 'social'].map((app) =>
  join(repoRoot, 'apps', app, 'public', 'fonts'),
);

/** Subconjunto latin: ASCII imprimible + Latin-1 (acentos, ·, ×) + puntuación tipográfica + flechas. */
function latinSubset() {
  let s = '';
  for (const [lo, hi] of [
    [0x20, 0x7e],
    [0xa0, 0xff],
  ]) {
    for (let c = lo; c <= hi; c++) s += String.fromCodePoint(c);
  }
  // Comillas/guiones/elipsis tipográficos y flechas usadas en la UI.
  for (const c of [0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2026, 0x2192, 0x2194]) {
    s += String.fromCodePoint(c);
  }
  return s;
}

const FONTS = [
  { in: 'Italiana-Regular.ttf', out: 'Italiana-Regular.woff2' },
  { in: 'Jost-Variable.ttf', out: 'Jost-Variable.woff2' }, // variable: se conserva el eje wght 100–900
];

const text = latinSubset();
await mkdir(UI_FONTS, { recursive: true });
for (const dir of APP_PUBLIC_FONTS) await mkdir(dir, { recursive: true });

for (const f of FONTS) {
  const src = await readFile(join(SRC, f.in));
  const woff2 = await subsetFont(src, text, { targetFormat: 'woff2' });
  const uiPath = join(UI_FONTS, f.out);
  await writeFile(uiPath, woff2);
  for (const dir of APP_PUBLIC_FONTS) await copyFile(uiPath, join(dir, f.out));
  const pct = Math.round((1 - woff2.length / src.length) * 100);
  console.log(`${f.in} ${src.length}B → ${f.out} ${woff2.length}B (-${pct}%)`);
}
