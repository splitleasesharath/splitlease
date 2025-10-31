#!/usr/bin/env node
/**
 * Deployment script
 * Automates the deployment process to production
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 Starting deployment process...\n');

/**
 * Run command with error handling
 */
function runCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    execSync(command, { cwd: rootDir, stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

try {
  // Step 1: Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  const distDir = join(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  console.log('✅ Cleaned\n');

  // Step 2: Run validation
  runCommand('npm run validate', 'Running pre-deployment validation');

  // Step 3: Run tests
  runCommand('npm test', 'Running tests');

  // Step 4: Type check
  runCommand('npm run typecheck', 'Type checking');

  // Step 5: Build components
  runCommand('npm run build:components', 'Building components');

  // Step 6: Build pages
  runCommand('npm run build:pages', 'Building pages');

  // Step 7: Deploy (placeholder - implement based on your deployment target)
  console.log('📦 Deploying to production...');
  console.log('⚠️  Deployment target not configured');
  console.log('Configure deployment in scripts/deploy.js based on your hosting provider:');
  console.log('  - AWS S3/CloudFront');
  console.log('  - Vercel');
  console.log('  - Netlify');
  console.log('  - GitHub Pages');
  console.log('  - Custom server\n');

  console.log('✅ Deployment process completed!');
  console.log('📁 Build artifacts are in the dist/ directory');
} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
}
