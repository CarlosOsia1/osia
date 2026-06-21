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
);
