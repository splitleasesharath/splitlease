#!/usr/bin/env node

/**
 * Build Script for SplitLease Application
 *
 * Orchestrates the complete build process:
 * 1. Clean previous builds
 * 2. Type check
 * 3. Build component library
 * 4. Copy static assets
 * 5. Generate build report
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Log with color and timestamp
 */
function log(message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

/**
 * Execute command and handle errors
 */
function exec(command, options = {}) {
  try {
    log(`Running: ${command}`, colors.cyan);
    execSync(command, {
      cwd: rootDir,
      stdio: 'inherit',
      ...options,
    });
    return true;
  } catch (error) {
    log(`Error executing: ${command}`, colors.red);
    return false;
  }
}

/**
 * Step 1: Clean previous builds
 */
function clean() {
  log('Cleaning previous builds...', colors.yellow);

  const dirsToClean = [
    join(rootDir, 'dist'),
    join(rootDir, 'components', 'dist'),
    join(rootDir, '.vite'),
  ];

  for (const dir of dirsToClean) {
    if (existsSync(dir)) {
      log(`Removing ${dir}`, colors.cyan);
      rmSync(dir, { recursive: true, force: true });
    }
  }

  // Create dist directory
  mkdirSync(join(rootDir, 'dist'), { recursive: true });

  log('Clean complete', colors.green);
}

/**
 * Step 2: Type check
 */
function typeCheck() {
  log('Type checking...', colors.yellow);

  if (process.env.SKIP_TYPE_CHECK === 'true') {
    log('Skipping type check (SKIP_TYPE_CHECK=true)', colors.yellow);
    return true;
  }

  const success = exec('npm run type-check');

  if (success) {
    log('Type check passed', colors.green);
  } else {
    log('Type check failed', colors.red);
    process.exit(1);
  }

  return success;
}

/**
 * Step 3: Build component library
 */
function buildComponents() {
  log('Building component library...', colors.yellow);

  const success = exec('npm run build', {
    cwd: join(rootDir, 'components'),
  });

  if (success) {
    log('Component library built', colors.green);
  } else {
    log('Component library build failed', colors.red);
    process.exit(1);
  }

  return success;
}

/**
 * Step 4: Build summary
 */
function buildSummary() {
  log('\n' + '='.repeat(50), colors.bright);
  log('Build Summary', colors.bright);
  log('='.repeat(50), colors.bright);

  const componentsDist = join(rootDir, 'components', 'dist');

  if (existsSync(componentsDist)) {
    log('✓ Component library built', colors.green);
  } else {
    log('✗ Component library missing', colors.red);
  }

  log('='.repeat(50) + '\n', colors.bright);
  log('Build complete!', colors.green);
}

/**
 * Main build process
 */
async function main() {
  const startTime = Date.now();

  log('\n' + '='.repeat(50), colors.bright);
  log('SplitLease Build Process', colors.bright);
  log('='.repeat(50) + '\n', colors.bright);

  try {
    // Step 1: Clean
    clean();

    // Step 2: Type check
    typeCheck();

    // Step 3: Build components
    buildComponents();

    // Step 4: Summary
    buildSummary();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\nTotal build time: ${duration}s`, colors.cyan);

    process.exit(0);
  } catch (error) {
    log(`\nBuild failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Run the build
main();
