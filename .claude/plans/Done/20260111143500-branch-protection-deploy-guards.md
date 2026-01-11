# Implementation Plan: Branch Protection Guards for Deployment Commands

## Overview

Add branch protection guards to deployment commands in `app/package.json`. The `deploy:dev` command will fail if run on the `main` branch, while the `deploy` command will fail if run on any non-main branch. This prevents accidental deployments to the wrong environment.

## Success Criteria

- [ ] `bun run deploy` fails with clear error message when NOT on `main` branch
- [ ] `bun run deploy:dev` fails with clear error message when ON `main` branch
- [ ] `bun run dev` remains unchanged (no branch restrictions)
- [ ] Error messages are clear and actionable
- [ ] Solution works in Windows PowerShell environment
- [ ] No new dependencies required

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/package.json` | NPM/Bun scripts configuration | Modify `deploy` and `deploy:dev` scripts to include branch guards |
| `app/scripts/` | Build scripts directory | Create new script for branch checking |

### Related Documentation

- [miniCLAUDE.md](../Documentation/miniCLAUDE.md) - Project conventions and commands reference

### Existing Patterns to Follow

- **Script Composition**: Current scripts use `&&` for chaining commands (e.g., `deploy:dev` chains `build:dev && wrangler deploy`)
- **Bun as Runner**: All scripts run via `bun run <script>`
- **Node.js Scripts**: Complex logic is extracted to `app/scripts/` directory (see `generate-redirects.js`)

## Implementation Steps

### Step 1: Create Branch Guard Script

**Files:** `app/scripts/check-branch.js`
**Purpose:** Create a reusable Node.js script that checks the current git branch and exits with an error if the branch doesn't match expected conditions.

**Details:**
- Create `app/scripts/check-branch.js` that:
  - Accepts a command-line argument: `--require-main` or `--block-main`
  - Uses `child_process.execFileSync` to run `git rev-parse --abbrev-ref HEAD` (safer than execSync with shell)
  - Compares the current branch against the expected condition
  - Exits with code 0 (success) if condition is met
  - Exits with code 1 (failure) with clear error message if condition is not met

**Script Content:**
```javascript
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
```

**Validation:**
- Run `node app/scripts/check-branch.js --require-main` on main branch (should pass)
- Run `node app/scripts/check-branch.js --require-main` on feature branch (should fail)
- Run `node app/scripts/check-branch.js --block-main` on main branch (should fail)
- Run `node app/scripts/check-branch.js --block-main` on feature branch (should pass)

### Step 2: Update package.json Scripts

**Files:** `app/package.json`
**Purpose:** Modify the `deploy` and `deploy:dev` scripts to run the branch guard before executing deployment commands.

**Details:**
- Prefix `deploy` script with branch guard requiring main: `node scripts/check-branch.js --require-main && wrangler pages deploy dist --project-name splitlease`
- Prefix `deploy:dev` script with branch guard blocking main: `node scripts/check-branch.js --block-main && bun run build:dev && wrangler pages deploy dist --project-name splitlease --branch development`

**Before (current):**
```json
"scripts": {
  "dev": "vite --port 8000",
  "generate-routes": "node scripts/generate-redirects.js",
  "prebuild": "bun run generate-routes",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "preview": "vite preview --port 8000",
  "deploy": "wrangler pages deploy dist --project-name splitlease",
  "deploy:dev": "bun run build:dev && wrangler pages deploy dist --project-name splitlease --branch development",
  "lint": "eslint src/",
  "lint:fix": "eslint src/ --fix",
  "lint:check": "eslint src/ --max-warnings 0"
}
```

**After (updated):**
```json
"scripts": {
  "dev": "vite --port 8000",
  "generate-routes": "node scripts/generate-redirects.js",
  "prebuild": "bun run generate-routes",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "preview": "vite preview --port 8000",
  "deploy": "node scripts/check-branch.js --require-main && wrangler pages deploy dist --project-name splitlease",
  "deploy:dev": "node scripts/check-branch.js --block-main && bun run build:dev && wrangler pages deploy dist --project-name splitlease --branch development",
  "lint": "eslint src/",
  "lint:fix": "eslint src/ --fix",
  "lint:check": "eslint src/ --max-warnings 0"
}
```

**Validation:**
- Run `bun run deploy` on main branch with pre-built dist (should proceed to wrangler)
- Run `bun run deploy` on non-main branch (should fail with error message)
- Run `bun run deploy:dev` on main branch (should fail with error message)
- Run `bun run deploy:dev` on non-main branch (should proceed to build and deploy)

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| Not in a git repository | Script outputs clear error message and exits with code 1 |
| Detached HEAD state | `git rev-parse --abbrev-ref HEAD` returns "HEAD" - treated as non-main branch |
| Branch named "master" (legacy) | Script checks for both "main" and "master" as valid production branches |
| Git not installed | execFileSync will throw - caught and displays helpful error |
| Windows vs Unix | Node.js `child_process.execFileSync` works cross-platform |

## Testing Considerations

**Manual Testing Scenarios:**

1. **Production deploy on main branch:**
   - Checkout main branch
   - Run `bun run deploy`
   - Expected: Branch check passes, deployment proceeds

2. **Production deploy on feature branch:**
   - Checkout any non-main branch (e.g., `feature/test`)
   - Run `bun run deploy`
   - Expected: Branch check fails with clear error message, deployment blocked

3. **Development deploy on feature branch:**
   - Checkout any non-main branch
   - Run `bun run deploy:dev`
   - Expected: Branch check passes, build runs, deployment proceeds

4. **Development deploy on main branch:**
   - Checkout main branch
   - Run `bun run deploy:dev`
   - Expected: Branch check fails with clear error message, deployment blocked

5. **Dev server (no restrictions):**
   - Run `bun run dev` on any branch
   - Expected: Dev server starts normally (unchanged behavior)

## Rollback Strategy

If issues arise:
1. Revert `app/package.json` to previous version (restore original script definitions)
2. Delete `app/scripts/check-branch.js`
3. Commit the revert

Since this is a simple script addition with no database or API changes, rollback is straightforward.

## Dependencies & Blockers

- **Prerequisites:** None - uses only Node.js built-in modules (`child_process`)
- **Blockers:** None identified
- **New Dependencies:** None required

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Script fails silently and allows wrong deployment | Low | High | Script explicitly exits with code 1 on failure; `&&` chaining prevents subsequent commands |
| Branch detection incorrect on CI/CD | Medium | Medium | Test in local environment first; CI/CD typically provides branch info via env vars if needed |
| Windows compatibility issues | Low | Medium | Node.js `child_process` is cross-platform; git CLI works identically on Windows |
| Breaks existing deployment workflow | Low | Low | Guards only add a check; underlying deployment commands unchanged |

## Implementation Notes

### Why a Node.js Script Instead of Inline Shell Commands

1. **Cross-platform compatibility**: Node.js runs identically on Windows, macOS, and Linux
2. **Clear error messages**: Easier to format multi-line error messages in JavaScript
3. **Testability**: Script can be tested independently
4. **Maintainability**: Logic is visible and easily modified
5. **Existing pattern**: Project already uses Node.js scripts in `app/scripts/` directory

### Security Consideration

The script uses `execFileSync` instead of `execSync` to avoid shell injection vulnerabilities. With `execFileSync`, arguments are passed as an array and are not processed by a shell, making it impossible for any input to be interpreted as shell commands.

### Alternative Approaches Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| Inline PowerShell in npm scripts | No extra file | Windows-only, hard to read | Rejected |
| Inline bash in npm scripts | Simple | Not Windows-compatible without WSL | Rejected |
| Node.js script (chosen) | Cross-platform, testable, readable, secure | Extra file | Accepted |
| Pre-deploy npm hook | Automatic | Less explicit, magic behavior | Rejected |

---

## Files Referenced in This Plan

| File | Type | Action |
|------|------|--------|
| `c:\Users\Split Lease\Documents\Split Lease\app\package.json` | Existing | Modify scripts section |
| `c:\Users\Split Lease\Documents\Split Lease\app\scripts\check-branch.js` | New | Create branch guard script |
| `c:\Users\Split Lease\Documents\Split Lease\.claude\Documentation\miniCLAUDE.md` | Reference | Project conventions |

---

**Plan Created:** 2026-01-11T14:35:00
**Estimated Implementation Time:** 15-20 minutes
**Complexity:** Low
