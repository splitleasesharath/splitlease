import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { routes, getInternalRoutes, getBasePath, buildRollupInputs } from './src/routes.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Shared routing logic for both dev and preview servers
 * Uses the Route Registry as single source of truth
 *
 * @param {Object} req - Request object
 * @param {string} publicPrefix - '/public' for dev, '' for preview
 */
function handleRouting(req, publicPrefix = '') {
  const url = req.url || '';
  const [urlPath, queryStringPart] = url.split('?');
  const queryString = queryStringPart ? `?${queryStringPart}` : '';

  // Special handling for help-center category routes (e.g., /help-center/guests)
  // Must check before general route matching
  // The category is extracted from the URL by the client-side JavaScript
  if (urlPath.startsWith('/help-center/') && !urlPath.includes('.')) {
    req.url = `${publicPrefix}/help-center-category.html${queryString}`;
    return;
  }

  // Find matching route from registry
  for (const route of routes) {
    const basePath = getBasePath(route);

    // Check exact match on base path
    if (urlPath === basePath || urlPath === basePath + '/') {
      req.url = `${publicPrefix}/${route.file}${queryString}`;
      return;
    }

    // Check if URL starts with query string on base path
    if (url.startsWith(basePath + '?')) {
      req.url = `${publicPrefix}/${route.file}${queryString}`;
      return;
    }

    // Check dynamic segments (e.g., /view-split-lease/123, /account-profile/userId)
    // The dynamic segment (ID) is read from window.location.pathname by client-side JS
    if (route.hasDynamicSegment && urlPath.startsWith(basePath + '/')) {
      req.url = `${publicPrefix}/${route.file}${queryString}`;
      return;
    }

    // Check aliases (e.g., /faq.html, /index.html)
    if (route.aliases) {
      for (const alias of route.aliases) {
        if (urlPath === alias) {
          req.url = `${publicPrefix}/${route.file}${queryString}`;
          return;
        }
        // Handle alias with additional path/query
        if (urlPath.startsWith(alias)) {
          const remainder = url.substring(alias.length);
          req.url = `${publicPrefix}/${route.file}${remainder}`;
          return;
        }
      }
    }
  }
}

/**
 * Copy directory recursively
 */
function copyDirectory(src, dest) {
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
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'multi-page-routing',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          handleRouting(req, '/public');
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          handleRouting(req, '');
          next();
        });
      }
    },
    {
      name: 'move-html-to-root',
      closeBundle() {
        const distDir = path.resolve(__dirname, 'dist');
        const publicDir = path.join(distDir, 'public');

        // Move HTML files from dist/public to dist root after build
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
          if (!fs.existsSync(assetsDest)) {
            fs.mkdirSync(assetsDest, { recursive: true });
          }
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

        // Copy _headers file to dist root for Cloudflare Pages
        const headersSource = path.resolve(__dirname, 'public/_headers');
        const headersDest = path.join(distDir, '_headers');
        if (fs.existsSync(headersSource)) {
          fs.copyFileSync(headersSource, headersDest);
          console.log('Copied _headers to dist root');
        }

        // Copy _routes.json file to dist root for Cloudflare Pages routing control
        const routesSource = path.resolve(__dirname, 'public/_routes.json');
        const routesDest = path.join(distDir, '_routes.json');
        if (fs.existsSync(routesSource)) {
          fs.copyFileSync(routesSource, routesDest);
          console.log('Copied _routes.json to dist root');
        }

        // Create _internal directory and copy files for routes that need it
        // This avoids Cloudflare's "pretty URL" normalization which causes 308 redirects
        const internalDir = path.join(distDir, '_internal');
        if (!fs.existsSync(internalDir)) {
          fs.mkdirSync(internalDir, { recursive: true });
        }

        // Generate _internal files from Route Registry
        // Files should NOT have .html extension - Content-Type is set via _headers file
        const internalRoutes = getInternalRoutes();
        for (const route of internalRoutes) {
          const source = path.join(distDir, route.file);
          const dest = path.join(internalDir, route.internalName);

          if (fs.existsSync(source)) {
            fs.copyFileSync(source, dest);
            console.log(`Created _internal/${route.internalName} for Cloudflare routing`);
          }
        }

        // Copy images directory to dist root
        const imagesSource = path.resolve(__dirname, 'public/images');
        const imagesDest = path.join(distDir, 'images');
        if (fs.existsSync(imagesSource)) {
          copyDirectory(imagesSource, imagesDest);
          console.log('Copied images directory to dist root');
        }

        // Copy help-center-articles directory to dist root (static article HTML files)
        const articlesSource = path.resolve(__dirname, 'public/help-center-articles');
        const articlesDest = path.join(distDir, 'help-center-articles');
        if (fs.existsSync(articlesSource)) {
          copyDirectory(articlesSource, articlesDest);
          console.log('Copied help-center-articles directory to dist root');
        }

        // Copy functions directory to dist root for Cloudflare Pages Functions
        const functionsSource = path.resolve(__dirname, 'functions');
        const functionsDest = path.join(distDir, 'functions');
        if (fs.existsSync(functionsSource)) {
          copyDirectory(functionsSource, functionsDest);
          console.log('Copied functions directory to dist root');
        }
      }
    }
  ],
  publicDir: 'public', // Enable public directory serving for static assets
  server: {
    host: true, // Listen on all addresses (127.0.0.1 and localhost)
    // Proxy /api routes to handle Cloudflare Pages Functions locally
    // Note: FAQ inquiries now use Supabase Edge Functions (slack function)
    // This proxy is for any remaining Cloudflare Pages Functions
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8788', // Default wrangler pages dev port
        changeOrigin: true,
        secure: false,
        // If wrangler isn't running, we need to handle it gracefully
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'API proxy error - ensure wrangler pages dev is running for full functionality'
            }));
          });
        }
      }
    }
  },
  preview: {
    host: '127.0.0.1',
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        search: resolve(__dirname, 'public/search.html'),
        'search-test': resolve(__dirname, 'public/search-test.html'),
        'view-split-lease': resolve(__dirname, 'public/view-split-lease.html'),
        'preview-split-lease': resolve(__dirname, 'public/preview-split-lease.html'),
        '404': resolve(__dirname, 'public/404.html'),
        faq: resolve(__dirname, 'public/faq.html'),
        policies: resolve(__dirname, 'public/policies.html'),
        'list-with-us': resolve(__dirname, 'public/list-with-us.html'),
        'guest-success': resolve(__dirname, 'public/guest-success.html'),
        'host-success': resolve(__dirname, 'public/host-success.html'),
        'why-split-lease': resolve(__dirname, 'public/why-split-lease.html'),
        'guest-proposals': resolve(__dirname, 'public/guest-proposals.html'),
        careers: resolve(__dirname, 'public/careers.html'),
        'account-profile': resolve(__dirname, 'public/account-profile.html'),
        'self-listing': resolve(__dirname, 'public/self-listing.html'),
        'self-listing-v2': resolve(__dirname, 'public/self-listing-v2.html'),
        'help-center': resolve(__dirname, 'public/help-center.html'),
        'help-center-category': resolve(__dirname, 'public/help-center-category.html'),
        'rental-application': resolve(__dirname, 'public/rental-application.html'),
        'listing-dashboard': resolve(__dirname, 'public/listing-dashboard.html'),
        'host-overview': resolve(__dirname, 'public/host-overview.html'),
        'host-proposals': resolve(__dirname, 'public/host-proposals.html'),
        'favorite-listings': resolve(__dirname, 'public/favorite-listings.html'),
        'about-us': resolve(__dirname, 'public/about-us.html'),
        '_internal-test': resolve(__dirname, 'public/_internal-test.html'),
        'reset-password': resolve(__dirname, 'public/reset-password.html'),
        'messages': resolve(__dirname, 'public/messages.html'),
        'auth-verify': resolve(__dirname, 'public/auth-verify.html')
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
