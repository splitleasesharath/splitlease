import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@components': resolve(__dirname, './src'),
      '@types': resolve(__dirname, '../types'),
      '@api': resolve(__dirname, '../api'),
      '@utils': resolve(__dirname, '../pages/shared/utils'),
    },
  },

  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.a11y.test.{ts,tsx}',
        'src/test/**',
        'src/**/*.d.ts',
        'src/**/index.ts',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
    server: {
      deps: {
        inline: ['parse5'],
      },
    },
  },
});
