// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * ESLint flat config compartida del monorepo OSIA.
 * Incluye: boundaries de paquete (no importar internos @osia/*\/src) y lint type-aware
 * (`no-floating-promises` vía projectService) sobre el código fuente.
 */
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**', '**/.turbo/**', '**/*.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // CLAUDE.md §1.2: `any` prohibido (usar `unknown` + narrow). Se sube de warn a error.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Fronteras de paquete: se importa el ENTRYPOINT (@osia/<pkg>), nunca sus internos.
    // Mantiene el contrato público estable y evita acoplarse a la estructura interna.
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@osia/*/src/*', '@osia/*/dist/*'],
              message: 'Importá desde el entrypoint del paquete (@osia/<pkg>), no de sus internos.',
            },
          ],
        },
      ],
    },
  },
  {
    // Lint type-aware sobre el CÓDIGO FUENTE (no configs): caza promesas sin manejar
    // (crítico en el async de red/voz: NetClient, MeshVoice, world-server).
    files: [
      'apps/**/src/**/*.{ts,tsx}',
      'apps/**/app/**/*.{ts,tsx}',
      'apps/**/i18n/**/*.ts',
      'packages/**/src/**/*.{ts,tsx}',
    ],
    // Los archivos de test usan el patrón fire-and-forget de node:test (`test(...)` devuelve
    // una promesa que el runner maneja); no son el async crítico que esta regla protege.
    ignores: ['**/*.test.ts', '**/*.test.tsx'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    // Determinismo del Motor de Atmósfera (CLAUDE.md §6, docs/06): cliente y servidor deben
    // calcular bit a bit lo MISMO. `Math.random` rompe la sincronía → PROHIBIDO (PRNG sembrado).
    files: ['packages/atmosphere/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'Math.random PROHIBIDO en @osia/atmosphere: el motor es determinista. Usá un PRNG sembrado (mulberry32). Ver CLAUDE.md §6.',
        },
      ],
    },
  },
  {
    // i18n (CLAUDE.md §3.2): CERO strings de UI hardcodeados. Todo texto visible sale de
    // @osia/i18n vía t('...'). Caza texto literal en JSX y en atributos mostrables.
    files: ['apps/world-client/app/**/*.tsx', 'apps/world-client/src/**/*.tsx', 'packages/ui/src/**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/[A-Za-zÀ-ÿ]/]',
          message: "Texto de UI hardcodeado: usá i18n (t('...')) de @osia/i18n. Ver CLAUDE.md §3.2.",
        },
        {
          selector:
            'JSXAttribute[name.name=/^(placeholder|title|alt|aria-label)$/] > Literal[value=/[A-Za-zÀ-ÿ]/]',
          message: 'Atributo de UI con texto hardcodeado: usá i18n (t(...)). Ver CLAUDE.md §3.2.',
        },
        {
          // Tipografía de marca (CLAUDE.md §2.5): solo Italiana (--font-display) + Jost (--font-ui).
          // La mono del sistema NO es fuente de marca y está PROHIBIDA en la UI de producto.
          selector: 'Literal[value=/--font-mono|monospace/]',
          message:
            'Fuente fuera del sistema de marca: usá var(--font-ui) (Jost) o var(--font-display) (Italiana). La mono del SO no se usa en UI. Ver CLAUDE.md §2.5.',
        },
      ],
    },
  },
);
