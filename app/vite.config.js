import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

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
      }
    }
  }
});
