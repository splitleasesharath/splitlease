/**
 * Generate Cloudflare Pages _redirects and _routes.json from Route Registry
 *
 * This script is run as a prebuild step to ensure routing files are always
 * in sync with the Route Registry (single source of truth).
 *
 * @see ../src/routes.config.js for the route definitions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { routes, getBasePath, excludedFromFunctions } from '../src/routes.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

/**
 * Generates Cloudflare Pages _redirects file from Route Registry
 */
function generateRedirects() {
  // Count routes upfront for the header (avoids timestamp-based merge conflicts)
  const dynamicRouteCount = routes.filter(r => r.hasDynamicSegment && !r.devOnly).length;
  const staticRouteCount = routes.filter(r => !r.hasDynamicSegment && !r.devOnly).length;

  const lines = [
    '# Cloudflare Pages redirects and rewrites',
    '# AUTO-GENERATED from routes.config.js - DO NOT EDIT MANUALLY',
    `# Routes: ${dynamicRouteCount} dynamic, ${staticRouteCount} static`,
    '#',
    '# See: https://developers.cloudflare.com/pages/configuration/redirects/',
    ''
  ];

  // Group routes by type for organized output
  const dynamicRoutes = routes.filter(r => r.hasDynamicSegment && !r.devOnly);
  const staticRoutes = routes.filter(r => !r.hasDynamicSegment && !r.devOnly);

  // Dynamic routes first (more specific) - these need special handling
  lines.push('# ===== DYNAMIC ROUTES (with parameters) =====');
  lines.push('# These routes use _internal/ files to avoid Cloudflare\'s 308 redirects');
  lines.push('');

  for (const route of dynamicRoutes) {
    const basePath = getBasePath(route);

    // Special case: /help-center/:category only needs the wildcard rule
    // The base /help-center is handled separately as a static route
    if (route.path === '/help-center/:category') {
      lines.push(`# ${route.path} → ${route.file} (wildcard only, base handled separately)`);
      lines.push(`${basePath}/*  /_internal/${route.internalName}  200`);
      lines.push('');
      continue;
    }

    if (route.cloudflareInternal && route.internalName) {
      // Use _internal/ directory to avoid Cloudflare's "pretty URL" normalization
      // Content-Type is set via _headers file, not file extension
      lines.push(`# ${route.path} → ${route.file}`);
      lines.push(`${basePath}  /_internal/${route.internalName}  200`);
      lines.push(`${basePath}/  /_internal/${route.internalName}  200`);
      lines.push(`${basePath}/*  /_internal/${route.internalName}  200`);
    } else {
      // Direct rewrite to HTML file
      lines.push(`# ${route.path} → ${route.file}`);
      lines.push(`${basePath}/*  /${route.file}  200`);
    }
    lines.push('');
  }

  // Static routes
  lines.push('# ===== STATIC PAGES =====');
  lines.push('');

  for (const route of staticRoutes) {
    const basePath = getBasePath(route);

    // Skip routes that don't need explicit redirects
    // Cloudflare serves .html files directly
    if (basePath === '/') {
      lines.push('# Homepage');
      lines.push('/  /index.html  200');
      lines.push('/index.html  /index.html  200');
      lines.push('');
    } else if (route.cloudflareInternal && route.internalName) {
      // Content-Type is set via _headers file, not file extension
      lines.push(`# ${basePath} → ${route.file}`);
      lines.push(`${basePath}  /_internal/${route.internalName}  200`);
      lines.push(`${basePath}/  /_internal/${route.internalName}  200`);
      lines.push('');
    } else {
      // Add rewrites for both clean URL and .html extension
      lines.push(`# ${basePath}`);
      lines.push(`${basePath}  /${route.file}  200`);
      lines.push(`${basePath}/  /${route.file}  200`);
      lines.push(`${basePath}.html  /${route.file}  200`);
      lines.push('');
    }
  }

  lines.push('# Note: Cloudflare Pages automatically serves /404.html for not found routes');
  lines.push('# No explicit catch-all rule needed - native 404.html support handles this');

  const content = lines.join('\n');
  const outputPath = path.join(publicDir, '_redirects');

  fs.writeFileSync(outputPath, content);
  console.log('✅ Generated _redirects file from Route Registry');
  console.log(`   ${dynamicRoutes.length} dynamic routes, ${staticRoutes.length} static routes`);
}

/**
 * Generates Cloudflare Pages _routes.json from Route Registry
 */
function generateRoutesJson() {
  // Get unique exclusions
  const uniqueExclusions = [...new Set(excludedFromFunctions)];

  const routesJson = {
    version: 1,
    include: ['/api/*'],
    exclude: uniqueExclusions
  };

  const content = JSON.stringify(routesJson, null, 2) + '\n';
  const outputPath = path.join(publicDir, '_routes.json');

  fs.writeFileSync(outputPath, content);
  console.log('✅ Generated _routes.json file from Route Registry');
  console.log(`   Excluded ${uniqueExclusions.length} routes from Cloudflare Functions`);
}

/**
 * Validate Route Registry
 * Ensures all routes are properly defined
 */
function validateRoutes() {
  const errors = [];
  const paths = new Set();

  for (const route of routes) {
    // Check for duplicate paths
    if (paths.has(route.path)) {
      errors.push(`Duplicate path: ${route.path}`);
    }
    paths.add(route.path);

    // Check required fields
    if (!route.path) {
      errors.push(`Route missing path`);
    }
    if (!route.file) {
      errors.push(`Route ${route.path} missing file`);
    }

    // Check cloudflareInternal requires internalName
    if (route.cloudflareInternal && !route.internalName) {
      errors.push(`Route ${route.path} has cloudflareInternal but no internalName`);
    }
  }

  if (errors.length > 0) {
    console.error('❌ Route Registry validation failed:');
    errors.forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  }

  console.log('✅ Route Registry validation passed');
  console.log(`   ${routes.length} routes defined`);
}

// Run generators
console.log('\n🔧 Generating routing files from Route Registry...\n');

validateRoutes();
generateRedirects();
generateRoutesJson();

console.log('\n✨ Routing files generated successfully!\n');
