import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'multi-page-routing',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';

          // Handle view-split-lease with path segments (e.g., /view-split-lease.html/123?query=param)
          if (url.startsWith('/view-split-lease.html')) {
            // Extract query params if they exist
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            // Rewrite to serve the HTML file while preserving query params
            req.url = '/public/view-split-lease.html' + queryString;
          } else if (url.startsWith('/search.html')) {
            req.url = '/public/search.html' + (url.substring('/search.html'.length) || '');
          } else if (url.startsWith('/faq.html')) {
            req.url = '/public/faq.html' + (url.substring('/faq.html'.length) || '');
          }

          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';

          // Handle view-split-lease with path segments (e.g., /view-split-lease.html/123?query=param)
          if (url.startsWith('/view-split-lease.html/')) {
            // Extract query params if they exist
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            // Rewrite to serve the HTML file while preserving query params
            req.url = '/view-split-lease.html' + queryString;
          } else if (url.startsWith('/search.html')) {
            req.url = '/search.html' + (url.substring('/search.html'.length) || '');
          } else if (url.startsWith('/faq.html')) {
            req.url = '/faq.html' + (url.substring('/faq.html'.length) || '');
          }

          next();
        });
      }
    },
    {
      name: 'move-html-to-root',
      closeBundle() {
        // Move HTML files from dist/public to dist root after build
        const distDir = path.resolve(__dirname, 'dist');
        const publicDir = path.join(distDir, 'public');

        if (fs.existsSync(publicDir)) {
          const htmlFiles = fs.readdirSync(publicDir).filter(file => file.endsWith('.html'));

          htmlFiles.forEach(file => {
            const source = path.join(publicDir, file);
            const dest = path.join(distDir, file);
            fs.renameSync(source, dest);
            console.log(`Moved ${file} to dist root`);
          });

          // Remove empty public directory
          if (fs.readdirSync(publicDir).length === 0) {
            fs.rmdirSync(publicDir);
          }
        }

        // Copy _redirects file to dist root for Cloudflare Pages
        const redirectsSource = path.resolve(__dirname, 'public/_redirects');
        const redirectsDest = path.join(distDir, '_redirects');
        if (fs.existsSync(redirectsSource)) {
          fs.copyFileSync(redirectsSource, redirectsDest);
          console.log('Copied _redirects to dist root');
        }
      }
    }
  ],
  publicDir: 'public/assets',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        search: resolve(__dirname, 'public/search.html'),
        'view-split-lease': resolve(__dirname, 'public/view-split-lease.html'),
        faq: resolve(__dirname, 'public/faq.html')
      },
      output: {
        // Ensure HTML files are output to dist root, not dist/public
        assetFileNames: (assetInfo) => {
          return 'assets/[name]-[hash][extname]';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    // Copy HTML files to root of dist, not preserving directory structure
    emptyOutDir: true
  }
});
