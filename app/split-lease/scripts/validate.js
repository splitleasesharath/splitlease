#!/usr/bin/env node
/**
 * Pre-commit validation script
 * Runs linting, formatting checks, and type checking
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔍 Running validation checks...\n');

let hasErrors = false;

/**
 * Run validation command
 */
function validate(command, description) {
  console.log(`📋 ${description}...`);
  try {
    execSync(command, { cwd: rootDir, stdio: 'inherit' });
    console.log(`✅ ${description} passed\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed\n`);
    hasErrors = true;
    return false;
  }
}

// Run checks
validate('npm run format:check', 'Checking code formatting');
validate('npm run lint', 'Linting code');
validate('npm run typecheck', 'Type checking');

// Summary
if (hasErrors) {
  console.error('\n❌ Validation failed! Please fix the errors above.');
  console.log('\n💡 Quick fixes:');
  console.log('  - Run "npm run format" to auto-fix formatting issues');
  console.log('  - Run "npm run lint:fix" to auto-fix linting issues');
  console.log('  - Check TypeScript errors and fix manually\n');
  process.exit(1);
} else {
  console.log('✅ All validation checks passed!');
  process.exit(0);
}
