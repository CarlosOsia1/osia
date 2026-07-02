/**
 * Sincroniza las fuentes de marca (woff2) desde la ÚNICA fuente — `packages/ui/fonts` (dueño,
 * generado por el pipeline @osia/assets desde brand/fonts) — hacia el `public/fonts` de cada app
 * que las sirve. Las copias en `public/` son ARTEFACTOS generados (gitignored), no duplicados
 * versionados. Corre en `postinstall`. Ver CLAUDE.md §2.5.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'packages', 'ui', 'fonts');
// TODA app Next que sirve UI de @osia/ui necesita las woff2 en su /public (Next solo sirve de ahí).
// Olvidar una aquí = esa app renderiza con la fuente del sistema (le pasó a social).
const targets = [
  join('apps', 'web', 'public', 'fonts'),
  join('apps', 'world-client', 'public', 'fonts'),
  join('apps', 'social', 'public', 'fonts'),
];

if (!existsSync(src)) {
  console.warn(`[sync-fonts] no existe ${src} — omito (corre el pipeline @osia/assets primero).`);
  process.exit(0);
}

const fonts = readdirSync(src).filter((f) => f.endsWith('.woff2'));
for (const rel of targets) {
  const dir = join(root, rel);
  mkdirSync(dir, { recursive: true });
  for (const f of fonts) copyFileSync(join(src, f), join(dir, f));
}
console.log(`[sync-fonts] ${fonts.length} fuentes → ${targets.length} apps.`);
