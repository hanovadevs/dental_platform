import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@dental/db': resolve(__dirname, '../../packages/db/src'),
      '@dental/db/src/seed/defaults': resolve(__dirname, '../../packages/db/src/seed/defaults'),
    },
  },
});
