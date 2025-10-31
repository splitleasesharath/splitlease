import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.config.ts',
        '**/*.config.js',
        '**/types/',
        '**/*.d.ts',
        '**/scripts/',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'build', 'tests/e2e'],
  },
  resolve: {
    alias: {
      '@components': resolve(__dirname, './components/src'),
      '@types': resolve(__dirname, './types'),
      '@api': resolve(__dirname, './api'),
      '@tests': resolve(__dirname, './tests'),
      '@islands': resolve(__dirname, './islands'),
      '@utils': resolve(__dirname, './pages/shared/utils'),
    },
  },
});
