#!/usr/bin/env node
/**
 * Build script for React component library
 * Compiles components and islands using Vite
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔨 Building component library...\n');

try {
  // Navigate to components directory and build
  const componentsDir = join(rootDir, 'components');

  if (!fs.existsSync(componentsDir)) {
    console.error('❌ Components directory not found');
    process.exit(1);
  }

  console.log('📦 Building components with Vite...');
  execSync('npm run build', {
    cwd: componentsDir,
    stdio: 'inherit',
  });

  console.log('\n✅ Component library built successfully!');
} catch (error) {
  console.error('\n❌ Component build failed:', error.message);
  process.exit(1);
}
