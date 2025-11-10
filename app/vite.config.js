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
      name: 'multi-page-dev',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Map routes to their corresponding HTML files
          const routeMap = {
            '/search.html': '/public/search.html',
            '/view-split-lease.html': '/public/view-split-lease.html'
          };

          const publicPath = routeMap[req.url?.split('?')[0]];

          if (publicPath) {
            const filePath = path.resolve(__dirname, publicPath.slice(1));
            if (fs.existsSync(filePath)) {
              req.url = publicPath;
            }
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
        'view-split-lease': resolve(__dirname, 'public/view-split-lease.html')
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
