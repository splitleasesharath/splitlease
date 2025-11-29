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

          // Handle root path, /index, and index.html
          if (url === '/' || url === '/index' || url.startsWith('/index?') || url.startsWith('/index.html')) {
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            req.url = '/public/index.html' + queryString;
          }
          // Handle index-dev.html
          else if (url.startsWith('/index-dev.html')) {
            req.url = '/public/index-dev.html' + (url.substring('/index-dev.html'.length) || '');
          }
          // Handle view-split-lease with clean URL structure (e.g., /view-split-lease/123?query=param)
          // Also handle exact /view-split-lease path (no trailing slash or query)
          else if (url === '/view-split-lease' || url.startsWith('/view-split-lease/') || url.startsWith('/view-split-lease?')) {
            // Serve the HTML file - the JS will extract the listing ID from window.location
            req.url = '/public/view-split-lease.html';
          }
          // Legacy support for old URL structure
          else if (url.startsWith('/view-split-lease.html')) {
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            req.url = '/public/view-split-lease.html' + queryString;
          } else if (url.startsWith('/search.html')) {
            req.url = '/public/search.html' + (url.substring('/search.html'.length) || '');
          } else if (url.startsWith('/search-test.html')) {
            req.url = '/public/search-test.html' + (url.substring('/search-test.html'.length) || '');
          } else if (url.startsWith('/search-test')) {
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            req.url = '/public/search-test.html' + queryString;
          } else if (url.startsWith('/faq.html')) {
            req.url = '/public/faq.html' + (url.substring('/faq.html'.length) || '');
          } else if (url.startsWith('/policies.html')) {
            req.url = '/public/policies.html' + (url.substring('/policies.html'.length) || '');
          } else if (url.startsWith('/list-with-us.html')) {
            req.url = '/public/list-with-us.html' + (url.substring('/list-with-us.html'.length) || '');
          } else if (url.startsWith('/guest-success.html')) {
            req.url = '/public/guest-success.html' + (url.substring('/guest-success.html'.length) || '');
          } else if (url.startsWith('/guest-success')) {
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            req.url = '/public/guest-success.html' + queryString;
          } else if (url.startsWith('/why-split-lease.html')) {
            req.url = '/public/why-split-lease.html' + (url.substring('/why-split-lease.html'.length) || '');
          } else if (url.startsWith('/careers.html')) {
            req.url = '/public/careers.html' + (url.substring('/careers.html'.length) || '');
          } else if (url.startsWith('/careers')) {
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            req.url = '/public/careers.html' + queryString;
          } else if (url.startsWith('/host-success.html')) {
            req.url = '/public/host-success.html' + (url.substring('/host-success.html'.length) || '');
          } else if (url.startsWith('/host-success')) {
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            req.url = '/public/host-success.html' + queryString;
          } else if (url.startsWith('/account-profile.html')) {
            req.url = '/public/account-profile.html' + (url.substring('/account-profile.html'.length) || '');
          } else if (url.startsWith('/account-profile')) {
            // Preserve the full path including user ID
            // e.g., /account-profile/USER_ID or /account-profile/USER_ID?query=value
            const pathAfterPrefix = url.substring('/account-profile'.length);
            req.url = '/public/account-profile.html' + pathAfterPrefix;
          } else if (url.startsWith('/self-listing.html')) {
            req.url = '/public/self-listing.html' + (url.substring('/self-listing.html'.length) || '');
          } else if (url.startsWith('/self-listing')) {
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            req.url = '/public/self-listing.html' + queryString;
          }
          // Handle help-center routes
          else if (url === '/help-center' || url === '/help-center/') {
            req.url = '/public/help-center.html';
          } else if (url.startsWith('/help-center/') && !url.includes('.')) {
            // Handle category pages like /help-center/guests, /help-center/hosts, etc.
            const pathAfterPrefix = url.substring('/help-center'.length);
            req.url = '/public/help-center-category.html' + pathAfterPrefix;
          } else if (url.startsWith('/help-center.html')) {
            req.url = '/public/help-center.html' + (url.substring('/help-center.html'.length) || '');
          }

          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';

          // Handle root path, /index, and index.html (preview mode - files in dist root)
          if (url === '/' || url === '/index' || url.startsWith('/index?') || url.startsWith('/index.html')) {
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            req.url = '/index.html' + queryString;
          }
          // Handle view-split-lease with clean URL structure (e.g., /view-split-lease/123?query=param)
          // Also handle exact /view-split-lease path (no trailing slash or query)
          else if (url === '/view-split-lease' || url.startsWith('/view-split-lease/') || url.startsWith('/view-split-lease?')) {
            // Serve the HTML file - the JS will extract the listing ID from window.location
            req.url = '/view-split-lease.html';
          }
          // Legacy support for old URL structure
          else if (url.startsWith('/view-split-lease.html')) {
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            req.url = '/view-split-lease.html' + queryString;
          } else if (url.startsWith('/search.html')) {
            req.url = '/search.html' + (url.substring('/search.html'.length) || '');
          } else if (url.startsWith('/search-test.html')) {
            req.url = '/search-test.html' + (url.substring('/search-test.html'.length) || '');
          } else if (url.startsWith('/search-test')) {
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            req.url = '/search-test.html' + queryString;
          } else if (url.startsWith('/faq.html')) {
            req.url = '/faq.html' + (url.substring('/faq.html'.length) || '');
          } else if (url.startsWith('/policies.html')) {
            req.url = '/policies.html' + (url.substring('/policies.html'.length) || '');
          } else if (url.startsWith('/list-with-us.html')) {
            req.url = '/list-with-us.html' + (url.substring('/list-with-us.html'.length) || '');
          } else if (url.startsWith('/guest-success.html')) {
            req.url = '/guest-success.html' + (url.substring('/guest-success.html'.length) || '');
          } else if (url.startsWith('/guest-success')) {
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            req.url = '/guest-success.html' + queryString;
          } else if (url.startsWith('/why-split-lease.html')) {
            req.url = '/why-split-lease.html' + (url.substring('/why-split-lease.html'.length) || '');
          } else if (url.startsWith('/careers.html')) {
            req.url = '/careers.html' + (url.substring('/careers.html'.length) || '');
          } else if (url.startsWith('/careers')) {
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            req.url = '/careers.html' + queryString;
          } else if (url.startsWith('/host-success.html')) {
            req.url = '/host-success.html' + (url.substring('/host-success.html'.length) || '');
          } else if (url.startsWith('/host-success')) {
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            req.url = '/host-success.html' + queryString;
          } else if (url.startsWith('/account-profile.html')) {
            req.url = '/account-profile.html' + (url.substring('/account-profile.html'.length) || '');
          } else if (url.startsWith('/account-profile')) {
            // Preserve the full path including user ID
            // e.g., /account-profile/USER_ID or /account-profile/USER_ID?query=value
            const pathAfterPrefix = url.substring('/account-profile'.length);
            req.url = '/account-profile.html' + pathAfterPrefix;
          } else if (url.startsWith('/self-listing.html')) {
            req.url = '/self-listing.html' + (url.substring('/self-listing.html'.length) || '');
          } else if (url.startsWith('/self-listing')) {
            const queryStart = url.indexOf('?');
            const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
            req.url = '/self-listing.html' + queryString;
          }
          // Handle help-center routes
          else if (url === '/help-center' || url === '/help-center/') {
            req.url = '/help-center.html';
          } else if (url.startsWith('/help-center/') && !url.includes('.')) {
            // Handle category pages like /help-center/guests, /help-center/hosts, etc.
            const pathAfterPrefix = url.substring('/help-center'.length);
            req.url = '/help-center-category.html' + pathAfterPrefix;
          } else if (url.startsWith('/help-center.html')) {
            req.url = '/help-center.html' + (url.substring('/help-center.html'.length) || '');
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

        // Create _internal directory and copy view-split-lease.html as listing-view (no .html extension)
        // This avoids Cloudflare's "pretty URL" normalization which causes 308 redirects
        const internalDir = path.join(distDir, '_internal');
        if (!fs.existsSync(internalDir)) {
          fs.mkdirSync(internalDir, { recursive: true });
        }
        const viewSplitLeaseSource = path.join(distDir, 'view-split-lease.html');
        const listingViewDest = path.join(internalDir, 'listing-view');
        if (fs.existsSync(viewSplitLeaseSource)) {
          fs.copyFileSync(viewSplitLeaseSource, listingViewDest);
          console.log('Created _internal/listing-view for Cloudflare routing');
        }

        // Create help-center internal files to avoid Cloudflare's "pretty URL" normalization
        const helpCenterSource = path.join(distDir, 'help-center.html');
        const helpCenterDest = path.join(internalDir, 'help-center-view');
        if (fs.existsSync(helpCenterSource)) {
          fs.copyFileSync(helpCenterSource, helpCenterDest);
          console.log('Created _internal/help-center-view for Cloudflare routing');
        }

        const helpCenterCategorySource = path.join(distDir, 'help-center-category.html');
        const helpCenterCategoryDest = path.join(internalDir, 'help-center-category-view');
        if (fs.existsSync(helpCenterCategorySource)) {
          fs.copyFileSync(helpCenterCategorySource, helpCenterCategoryDest);
          console.log('Created _internal/help-center-category-view for Cloudflare routing');
        }

        // Copy images directory to dist root
        const imagesSource = path.resolve(__dirname, 'public/images');
        const imagesDest = path.join(distDir, 'images');
        if (fs.existsSync(imagesSource)) {
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

          copyDirectory(imagesSource, imagesDest);
          console.log('Copied images directory to dist root');
        }

        // Copy help-center-articles directory to dist root (static article HTML files)
        const articlesSource = path.resolve(__dirname, 'public/help-center-articles');
        const articlesDest = path.join(distDir, 'help-center-articles');
        if (fs.existsSync(articlesSource)) {
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

          copyDirectory(articlesSource, articlesDest);
          console.log('Copied help-center-articles directory to dist root');
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
  server: {
    host: '127.0.0.1', // Ensure IPv4 binding for localhost
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
        '404': resolve(__dirname, 'public/404.html'),
        faq: resolve(__dirname, 'public/faq.html'),
        policies: resolve(__dirname, 'public/policies.html'),
        'list-with-us': resolve(__dirname, 'public/list-with-us.html'),
        'guest-success': resolve(__dirname, 'public/guest-success.html'),
        'host-success': resolve(__dirname, 'public/host-success.html'),
        'why-split-lease': resolve(__dirname, 'public/why-split-lease.html'),
        careers: resolve(__dirname, 'public/careers.html'),
        'account-profile': resolve(__dirname, 'public/account-profile.html'),
        'self-listing': resolve(__dirname, 'public/self-listing.html'),
        'help-center': resolve(__dirname, 'public/help-center.html'),
        'help-center-category': resolve(__dirname, 'public/help-center-category.html')
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
