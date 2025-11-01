/**
 * Homepage Build Script
 *
 * Builds the homepage islands for production deployment to Cloudflare Pages
 */

import { build } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function buildHomepage() {
  console.log('🏗️  Building homepage islands...\n');

  try {
    // Build popular-listings island
    await build({
      root: resolve(__dirname, '..'),
      build: {
        outDir: resolve(__dirname, '../pages/home/js'),
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, '../islands/popular-listings.tsx'),
          name: 'PopularListingsIsland',
          fileName: 'popular-listings',
          formats: ['es'],
        },
        rollupOptions: {
          external: ['react', 'react-dom'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
            },
          },
        },
      },
    });

    console.log('✅ Built popular-listings island');

    // Build schedule-selector island
    await build({
      root: resolve(__dirname, '..'),
      build: {
        outDir: resolve(__dirname, '../pages/home/js'),
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, '../islands/schedule-selector.tsx'),
          name: 'ScheduleSelectorIsland',
          fileName: 'schedule-selector',
          formats: ['es'],
        },
        rollupOptions: {
          external: ['react', 'react-dom'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
            },
          },
        },
      },
    });

    console.log('✅ Built schedule-selector island');

    console.log('\n🎉 Homepage islands built successfully!');
    console.log('\n📦 Output: app/split-lease/pages/home/js/');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildHomepage();
