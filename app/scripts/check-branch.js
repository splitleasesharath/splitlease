#!/usr/bin/env node
/**
 * Branch Guard Script
 *
 * Usage:
 *   node check-branch.js --require-main   # Fails if NOT on main branch
 *   node check-branch.js --block-main     # Fails if ON main branch
 *
 * Security: Uses execFileSync instead of execSync to avoid shell injection.
 */

import { execFileSync } from 'child_process';

const args = process.argv.slice(2);
const requireMain = args.includes('--require-main');
const blockMain = args.includes('--block-main');

if (!requireMain && !blockMain) {
  console.error('Error: Must specify --require-main or --block-main');
  process.exit(1);
}

if (requireMain && blockMain) {
  console.error('Error: Cannot specify both --require-main and --block-main');
  process.exit(1);
}

let currentBranch;
try {
  // Using execFileSync with argument array - no shell injection possible
  currentBranch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    encoding: 'utf-8'
  }).trim();
} catch (error) {
  console.error('Error: Failed to get current git branch. Are you in a git repository?');
  process.exit(1);
}

const isMainBranch = currentBranch === 'main' || currentBranch === 'master';

if (requireMain && !isMainBranch) {
  console.error('');
  console.error('========================================');
  console.error('  DEPLOYMENT BLOCKED');
  console.error('========================================');
  console.error('');
  console.error(`  Current branch: ${currentBranch}`);
  console.error('  Required branch: main');
  console.error('');
  console.error('  Production deployments (bun run deploy) can only');
  console.error('  be executed from the main branch.');
  console.error('');
  console.error('  To deploy to development, use: bun run deploy:dev');
  console.error('');
  console.error('========================================');
  console.error('');
  process.exit(1);
}

if (blockMain && isMainBranch) {
  console.error('');
  console.error('========================================');
  console.error('  DEPLOYMENT BLOCKED');
  console.error('========================================');
  console.error('');
  console.error(`  Current branch: ${currentBranch}`);
  console.error('');
  console.error('  Development deployments (bun run deploy:dev) cannot');
  console.error('  be executed from the main branch.');
  console.error('');
  console.error('  To deploy to production, use: bun run deploy');
  console.error('  Or checkout a feature branch first.');
  console.error('');
  console.error('========================================');
  console.error('');
  process.exit(1);
}

// Branch check passed - exit successfully
console.log(`Branch check passed: ${currentBranch}`);
process.exit(0);
