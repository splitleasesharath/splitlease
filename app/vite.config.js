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

          // Handle view-split-lease with clean URL structure (e.g., /view-split-lease/123?query=param)
          if (url.startsWith('/view-split-lease/') || url.startsWith('/view-split-lease?')) {
            // Extract query params if they exist
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            // Rewrite to serve the HTML file while preserving query params
            req.url = '/public/view-split-lease.html' + queryString;
          }
          // Legacy support for old URL structure
          else if (url.startsWith('/view-split-lease.html')) {
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            req.url = '/public/view-split-lease.html' + queryString;
          }
          else if (url.startsWith('/search.html')) {
            req.url = '/public/search.html' + (url.substring('/search.html'.length) || '');
          } else if (url.startsWith('/faq.html')) {
            req.url = '/public/faq.html' + (url.substring('/faq.html'.length) || '');
          } else if (url.startsWith('/policies.html')) {
            req.url = '/public/policies.html' + (url.substring('/policies.html'.length) || '');
          } else if (url.startsWith('/list-with-us.html')) {
            req.url = '/public/list-with-us.html' + (url.substring('/list-with-us.html'.length) || '');
          } else if (url.startsWith('/success-stories.html')) {
            req.url = '/public/success-stories.html' + (url.substring('/success-stories.html'.length) || '');
          } else if (url.startsWith('/why-split-lease.html')) {
            req.url = '/public/why-split-lease.html' + (url.substring('/why-split-lease.html'.length) || '');
          }

          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';

          // Handle view-split-lease with clean URL structure (e.g., /view-split-lease/123?query=param)
          if (url.startsWith('/view-split-lease/') || url.startsWith('/view-split-lease?')) {
            // Extract query params if they exist
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            // Rewrite to serve the HTML file while preserving query params
            req.url = '/view-split-lease.html' + queryString;
          }
          // Legacy support for old URL structure
          else if (url.startsWith('/view-split-lease.html')) {
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            req.url = '/view-split-lease.html' + queryString;
          }
          else if (url.startsWith('/search.html')) {
            req.url = '/search.html' + (url.substring('/search.html'.length) || '');
          } else if (url.startsWith('/faq.html')) {
            req.url = '/faq.html' + (url.substring('/faq.html'.length) || '');
          } else if (url.startsWith('/policies.html')) {
            req.url = '/policies.html' + (url.substring('/policies.html'.length) || '');
          } else if (url.startsWith('/list-with-us.html')) {
            req.url = '/list-with-us.html' + (url.substring('/list-with-us.html'.length) || '');
          } else if (url.startsWith('/success-stories.html')) {
            req.url = '/success-stories.html' + (url.substring('/success-stories.html'.length) || '');
          } else if (url.startsWith('/why-split-lease.html')) {
            req.url = '/why-split-lease.html' + (url.substring('/why-split-lease.html'.length) || '');
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

        // Copy assets directory to dist/assets preserving structure
        const assetsSource = path.resolve(__dirname, 'public/assets');
        const assetsDest = path.join(distDir, 'assets');

        if (fs.existsSync(assetsSource)) {
          // Create dist/assets if it doesn't exist
          if (!fs.existsSync(assetsDest)) {
            fs.mkdirSync(assetsDest, { recursive: true });
          }

          // Copy all subdirectories (images, fonts, lotties)
          const copyDirectory = (src, dest) => {
            if (!fs.existsSync(dest)) {
              fs.mkdirSync(dest, { recursive: true });
            }

            const entries = fs.readdirSync(src, { withFileTypes: true });

            for (const entry of entries) {
              const srcPath = path.join(src, entry.name);
              const destPath = path.join(dest, entry.name);

              if (entry.isDirectory()) {
                copyDirectory(srcPath, destPath);
              } else {
                fs.copyFileSync(srcPath, destPath);
              }
            }
          };

          copyDirectory(assetsSource, assetsDest);
          console.log('Copied assets directory to dist/assets');
        }

        // Copy _redirects file to dist root for Cloudflare Pages
        const redirectsSource = path.resolve(__dirname, 'public/_redirects');
        const redirectsDest = path.join(distDir, '_redirects');
        if (fs.existsSync(redirectsSource)) {
          fs.copyFileSync(redirectsSource, redirectsDest);
          console.log('Copied _redirects to dist root');
        }

        // Copy functions directory to dist root for Cloudflare Pages Functions
        const functionsSource = path.resolve(__dirname, 'functions');
        const functionsDest = path.join(distDir, 'functions');
        if (fs.existsSync(functionsSource)) {
          const copyDirectory = (src, dest) => {
            if (!fs.existsSync(dest)) {
              fs.mkdirSync(dest, { recursive: true });
            }

            const entries = fs.readdirSync(src, { withFileTypes: true });

            for (const entry of entries) {
              const srcPath = path.join(src, entry.name);
              const destPath = path.join(dest, entry.name);

              if (entry.isDirectory()) {
                copyDirectory(srcPath, destPath);
              } else {
                fs.copyFileSync(srcPath, destPath);
              }
            }
          };

          copyDirectory(functionsSource, functionsDest);
          console.log('Copied functions directory to dist root');
        }
      }
    }
  ],
  publicDir: false, // Disable automatic public directory copying
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        search: resolve(__dirname, 'public/search.html'),
        'view-split-lease': resolve(__dirname, 'public/view-split-lease.html'),
        faq: resolve(__dirname, 'public/faq.html'),
        policies: resolve(__dirname, 'public/policies.html'),
        'list-with-us': resolve(__dirname, 'public/list-with-us.html'),
        'success-stories': resolve(__dirname, 'public/success-stories.html'),
        'why-split-lease': resolve(__dirname, 'public/why-split-lease.html')
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
