#!/usr/bin/env node
/**
 * Development server script
 * Starts local development server with hot reload
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { parse } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const pagesDir = join(rootDir, 'pages');
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting development server...\n');

/**
 * Simple static file server
 */
const server = http.createServer((req, res) => {
  const parsedUrl = parse(req.url);
  let pathname = parsedUrl.pathname;

  // Default to index.html for directories
  if (pathname === '/') {
    pathname = '/index.html';
  } else if (!path.extname(pathname)) {
    pathname = path.join(pathname, 'index.html');
  }

  const filePath = path.join(pagesDir, pathname);

  // Check if file exists
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }

    // Determine content type
    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
    }[ext] || 'text/plain';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Development server running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${pagesDir}`);
  console.log('\n💡 Tips:');
  console.log('  - Edit files in pages/ to see changes');
  console.log('  - Component changes require rebuilding with: npm run build:components');
  console.log('  - Press Ctrl+C to stop the server\n');
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    console.log('Try a different port: PORT=3001 npm run dev');
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down development server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
