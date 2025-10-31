#!/usr/bin/env node
/**
 * Build script for static HTML pages
 * Processes and optimizes HTML, CSS, and JS assets
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const pagesDir = join(rootDir, 'pages');
const distDir = join(rootDir, 'dist', 'pages');

console.log('🔨 Building static pages...\n');

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Process HTML files to inject component island scripts
 */
function processHtmlFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Add meta tags if not present
  if (!content.includes('<meta charset')) {
    content = content.replace(
      '<head>',
      '<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">'
    );
  }

  // Link to shared CSS
  if (!content.includes('shared/css')) {
    content = content.replace(
      '</head>',
      '  <link rel="stylesheet" href="/shared/css/variables.css">\n  <link rel="stylesheet" href="/shared/css/reset.css">\n  <link rel="stylesheet" href="/shared/css/global.css">\n</head>'
    );
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}

try {
  // Create dist directory
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  console.log('📄 Copying pages...');
  copyDir(pagesDir, distDir);

  console.log('⚙️  Processing HTML files...');
  const htmlFiles = [];

  function findHtmlFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        findHtmlFiles(fullPath);
      } else if (entry.name.endsWith('.html')) {
        htmlFiles.push(fullPath);
      }
    }
  }

  findHtmlFiles(distDir);

  for (const htmlFile of htmlFiles) {
    processHtmlFile(htmlFile);
    console.log(`  ✓ Processed ${path.relative(distDir, htmlFile)}`);
  }

  console.log('\n✅ Static pages built successfully!');
  console.log(`📁 Output directory: ${distDir}`);
} catch (error) {
  console.error('\n❌ Page build failed:', error.message);
  process.exit(1);
}
