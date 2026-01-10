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
 * Generate redirect lines for a single dynamic route
 */
const generateDynamicRouteLines = (route) => {
  const basePath = getBasePath(route);

  if (route.path === '/help-center/:category') {
    return [
      `# ${route.path} → ${route.file} (wildcard only, base handled separately)`,
      `${basePath}/*  /_internal/${route.internalName}  200`,
      ''
    ];
  }

  if (route.cloudflareInternal && route.internalName) {
    return [
      `# ${route.path} → ${route.file}`,
      `${basePath}  /_internal/${route.internalName}  200`,
      `${basePath}/  /_internal/${route.internalName}  200`,
      `${basePath}/*  /_internal/${route.internalName}  200`,
      ''
    ];
  }

  return [
    `# ${route.path} → ${route.file}`,
    `${basePath}/*  /${route.file}  200`,
    ''
  ];
};

/**
 * Generate redirect lines for a single static route
 */
const generateStaticRouteLines = (route) => {
  const basePath = getBasePath(route);

  if (basePath === '/') {
    return [
      '# Homepage',
      '/  /index.html  200',
      '/index.html  /index.html  200',
      ''
    ];
  }

  if (route.cloudflareInternal && route.internalName) {
    return [
      `# ${basePath} → ${route.file}`,
      `${basePath}  /_internal/${route.internalName}  200`,
      `${basePath}/  /_internal/${route.internalName}  200`,
      ''
    ];
  }

  return [
    `# ${basePath}`,
    `${basePath}  /${route.file}  200`,
    `${basePath}/  /${route.file}  200`,
    `${basePath}.html  /${route.file}  200`,
    ''
  ];
};

/**
 * Generates Cloudflare Pages _redirects file from Route Registry
 */
function generateRedirects() {
  const dynamicRoutes = routes.filter(r => r.hasDynamicSegment && !r.devOnly);
  const staticRoutes = routes.filter(r => !r.hasDynamicSegment && !r.devOnly);

  const lines = [
    '# Cloudflare Pages redirects and rewrites',
    '# AUTO-GENERATED from routes.config.js - DO NOT EDIT MANUALLY',
    `# Generated: ${new Date().toISOString()}`,
    '#',
    '# See: https://developers.cloudflare.com/pages/configuration/redirects/',
    '',
    '# ===== DYNAMIC ROUTES (with parameters) =====',
    '# These routes use _internal/ files to avoid Cloudflare\'s 308 redirects',
    '',
    ...dynamicRoutes.flatMap(generateDynamicRouteLines),
    '# ===== STATIC PAGES =====',
    '',
    ...staticRoutes.flatMap(generateStaticRouteLines),
    '# Note: Cloudflare Pages automatically serves /404.html for not found routes',
    '# No explicit catch-all rule needed - native 404.html support handles this'
  ];

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
