import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

/**
 * Flat config, layered so each source kind gets the parser and globals it needs.
 *
 * `astro-eslint-parser` handles `.astro`; TypeScript files go through
 * `typescript-eslint`; `jsx-a11y` is enabled for the Preact components because
 * PRD 5.4 and Appendix C make accessibility a release requirement, not a nicety.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      'coverage/**',
      'public/sw.js',
      'scripts/**',
      '**/*.d.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,

  {
    // Preact component tree.
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'jsx-a11y': jsxA11y },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,

      // Unused arguments are often required by a component signature; prefix
      // them with `_` to opt out (handled by the default TS rule below).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // `void` the promise instead of disabling the rule outright.
      '@typescript-eslint/no-floating-promises': 'off',

      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'object-shorthand': ['error', 'properties'],
    },
  },

  {
    // Tests may stub globals and lean on looser typing for fixtures.
    files: ['src/**/__tests__/**/*.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  {
    files: ['*.mjs', 'astro.config.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  {
    files: ['vitest.config.ts', 'vitest.setup.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  // Service worker: no module system, browser worker globals.
  {
    files: ['public/sw.js'],
    languageOptions: {
      globals: { ...globals.serviceworker, ...globals.browser },
      sourceType: 'script',
    },
    rules: {
      'no-restricted-globals': 'off',
    },
  },

  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
);
