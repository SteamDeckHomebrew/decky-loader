import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/.stryker-tmp/**', '**/node_modules/**'],
    coverage: {
      exclude: ['**/.stryker-tmp/**'],
      include: ['src/plugin-importer.ts'],
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
