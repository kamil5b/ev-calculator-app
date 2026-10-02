import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // PRD 12 requires 80%+ on the domain layer specifically; the presentation
      // layer is covered through its component tests.
      include: ['src/domain/**/*.ts', 'src/application/**/*.ts', 'src/infrastructure/**/*.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
