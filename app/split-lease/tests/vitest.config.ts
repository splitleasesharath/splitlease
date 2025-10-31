/**
 * Vitest configuration for unit and integration tests
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.config.{ts,js}',
        '**/*.d.ts',
        '**/types/**',
        '**/mocks/**',
        '**/factories.ts',
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
  resolve: {
    alias: {
      '@/components': path.resolve(__dirname, '../components/src'),
      '@/types': path.resolve(__dirname, '../types'),
      '@/api': path.resolve(__dirname, '../api'),
      '@/utils': path.resolve(__dirname, '../utils'),
      '@/islands': path.resolve(__dirname, '../islands'),
      '@/tests': path.resolve(__dirname, '../tests'),
    },
  },
});
