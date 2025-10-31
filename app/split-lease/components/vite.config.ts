import { defineConfig } from 'vite';
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

  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
  },

  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SplitLeaseComponents',
      formats: ['es', 'umd'],
      fileName: (format) => `split-lease-components.${format}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'styled-components', 'framer-motion'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'styled-components': 'styled',
          'framer-motion': 'framerMotion',
        },
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    // Bundle size budgets
    chunkSizeWarningLimit: 500,
    // Source maps for debugging
    sourcemap: true,
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },

  // Development server configuration
  server: {
    port: 5173,
    open: false,
    cors: true,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'styled-components', 'framer-motion'],
  },

  // Test configuration with Vitest
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, 'tests/setup.ts')],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/index.ts',
        'vite.config.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    testTimeout: 10000,
  },
});
