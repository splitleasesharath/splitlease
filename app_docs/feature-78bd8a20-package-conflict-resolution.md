# Package Merge Conflict Resolution System

**ADW ID:** 78bd8a20
**Date:** 2025-11-01
**Specification:** specs/issue-25-adw-78bd8a20-sdlc_planner-fix-package-merge-conflicts.md

## Overview

This feature implements a comprehensive solution to eliminate persistent merge conflicts in `package.json` and `package-lock.json` files. The repository contains two separate Node.js packages (root app and components library) with overlapping dependencies, which previously caused conflicts on every pull request. The solution includes Git merge strategies, dependency sorting automation, conflict resolution scripts, version enforcement, and developer documentation.

## What Was Built

- **Git Merge Strategy Configuration** - `.gitattributes` file with `merge=ours` strategy for lock files
- **Node.js Version Management** - `.nvmrc` and `.npmrc` files to enforce consistent environments
- **Dependency Sorting Script** - `scripts/sort-package-deps.mjs` to alphabetically sort package.json dependencies
- **Conflict Resolution Helper** - `scripts/resolve-package-conflicts.sh` to automate conflict resolution
- **Developer Documentation** - `docs/dependency-management.md` with comprehensive best practices
- **Updated Package Files** - Both `app/split-lease/package.json` and `app/split-lease/components/package.json` sorted alphabetically
- **Updated Lock Files** - Regenerated lock files with consistent formatting
- **README Updates** - Added troubleshooting section and link to dependency management guide

## Technical Implementation

### Files Modified

- `.gitattributes`: Added merge strategy configuration for package-lock.json files and line ending rules
- `.npmrc`: Created npm configuration with `engine-strict=true` to enforce version requirements
- `.nvmrc`: Specified Node.js version 18.20.0 for consistent environment
- `README.md`: Added troubleshooting section with package conflict resolution guidance
- `app/split-lease/components/package-lock.json`: Regenerated with 507 fewer lines (streamlined dependencies)
- `app/split-lease/components/package.json`: Sorted dependencies alphabetically and aligned versions
- `app/split-lease/package-lock.json`: Regenerated for consistency
- `app/split-lease/package.json`: Sorted dependencies alphabetically
- `app/split-lease/types/api.ts`: Minor type adjustments (4 line changes)
- `docs/dependency-management.md`: Created comprehensive 451-line guide for dependency management
- `scripts/resolve-package-conflicts.sh`: Created 193-line bash script for automated conflict resolution
- `scripts/sort-package-deps.mjs`: Created 130-line Node.js script for sorting package.json files

### Key Changes

1. **Git Merge Strategy**: Configured `**/package-lock.json merge=ours` to prevent manual merging of machine-generated lock files, forcing regeneration after conflicts

2. **Dependency Alphabetization**: All `dependencies`, `devDependencies`, `peerDependencies`, and `scripts` in both package.json files are now alphabetically sorted, reducing line-based conflicts

3. **Version Enforcement**: Added `.nvmrc` (Node 18.20.0) and `.npmrc` (engine-strict=true) to ensure all developers use consistent Node.js and npm versions

4. **Automated Conflict Resolution**: Created helper script that detects conflicts, removes problematic lock files, regenerates them via `npm install`, and validates the result

5. **Comprehensive Documentation**: 451-line guide covering dual-package structure, best practices, troubleshooting, and future monorepo considerations

## How to Use

### For Developers: Adding/Updating Dependencies

1. **Update from main branch first**:
   ```bash
   git checkout main
   git pull origin main
   git checkout your-feature-branch
   git merge main
   ```

2. **Install dependencies in the correct directory**:
   ```bash
   # For root app
   cd app/split-lease
   npm install <package-name>

   # For components library
   cd app/split-lease/components
   npm install <package-name>
   ```

3. **Sort the package files**:
   ```bash
   node scripts/sort-package-deps.mjs
   ```

4. **Commit with descriptive message**:
   ```bash
   git add app/split-lease/package.json app/split-lease/package-lock.json
   git commit -m "chore: add <package-name> to root app"
   ```

### For Developers: Resolving Merge Conflicts

#### Automatic Resolution (Recommended)

```bash
./scripts/resolve-package-conflicts.sh
```

This script will:
- Detect conflicts in package.json and package-lock.json
- Guide you through manual resolution of package.json conflicts
- Automatically remove and regenerate conflicted lock files
- Sort dependencies alphabetically
- Validate that package.json files are valid JSON

#### Manual Resolution

For `package.json` conflicts:
1. Open the file and manually merge dependencies (keep all unique entries)
2. Remove conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
3. Run `node scripts/sort-package-deps.mjs` to sort
4. Stage the file with `git add`

For `package-lock.json` conflicts:
1. Delete the conflicted lock file: `rm app/split-lease/package-lock.json`
2. Regenerate: `cd app/split-lease && npm install`
3. Stage the new lock file: `git add app/split-lease/package-lock.json`

### Verifying Dependency Sorting

Check if package.json files are properly sorted:
```bash
node scripts/sort-package-deps.mjs --check
```

Sort package.json files:
```bash
node scripts/sort-package-deps.mjs
```

## Configuration

### Node.js and npm Version Requirements

- **Node.js**: `>=18.20.0` (LTS versions 18.x or 20.x)
- **npm**: `>=9.0.0`

**Using nvm (recommended)**:
```bash
nvm use  # Uses version from .nvmrc
```

**Checking your versions**:
```bash
node --version  # Should output v18.20.0 or higher
npm --version   # Should output v9.0.0 or higher
```

### Git Merge Strategy

The `.gitattributes` file configures:
- `**/package-lock.json merge=ours` - Prefer current branch's lock file during merges, then regenerate
- Text file normalization with LF line endings for consistency
- Binary file marking for images and fonts

### npm Configuration

The `.npmrc` file enforces:
- `engine-strict=true` - Prevents installation with incompatible Node.js/npm versions
- `package-lock=true` - Ensures lock files are always generated

## Testing

### Validation Commands

Run these commands to ensure the changes work correctly:

```bash
# Verify Node.js and npm versions
node --version && npm --version

# Check TypeScript types
cd app/split-lease/components && npm run typecheck
cd app/split-lease && npm run type-check

# Run builds
cd app/split-lease/components && npm run build
cd app/split-lease && npm run build

# Run tests
cd app/split-lease/components && npm test
cd app/split-lease && npm test

# Verify dependencies are sorted
node scripts/sort-package-deps.mjs --check

# Check git status
git status
```

### Testing Conflict Resolution Script

To test the conflict resolution script without actual conflicts:

```bash
# Make script executable (if not already)
chmod +x scripts/resolve-package-conflicts.sh

# Run the script
./scripts/resolve-package-conflicts.sh
```

The script will check for conflicts and report the status of all package files.

## Notes

### Why This Was Needed

The repository structure contains two separate Node.js projects:
1. **Root app** (`app/split-lease/`) - Main Islands architecture application
2. **Components library** (`app/split-lease/components/`) - Standalone React component library

Both packages share many dependencies (react, react-dom, styled-components, TypeScript, Vite, etc.), causing:
- **Frequent line-based conflicts** when branches add/update dependencies in the same unsorted blocks
- **Lock file conflicts** when different branches run `npm install` with varying npm versions or timing
- **Wasted developer time** manually resolving conflicts on every pull request

### Key Decisions

1. **Alphabetical Sorting**: Reduces the likelihood that two branches will modify the same line when adding different dependencies

2. **Lock File Strategy (`merge=ours`)**: Lock files should never be manually merged. This strategy accepts the current branch's lock file, then developers must regenerate it with `npm install`

3. **Version Enforcement**: Different npm versions can rewrite lock file structure even without dependency changes. `.nvmrc` and `engine-strict=true` prevent this

4. **Automation Over Manual Process**: The helper script reduces human error and makes conflict resolution consistent across the team

### Future Considerations

If conflicts persist despite these improvements, consider migrating to a **monorepo tool**:

- **npm workspaces**: Single lock file at repository root, shared dependency hoisting
- **pnpm**: Faster installs, better disk space usage, strict dependency resolution
- **yarn workspaces**: Similar to npm workspaces with additional features

Example npm workspaces structure:
```json
{
  "name": "splitlease-monorepo",
  "private": true,
  "workspaces": [
    "app/split-lease",
    "app/split-lease/components"
  ]
}
```

Benefits:
- One `package-lock.json` for entire repository
- Single `npm install` command
- Automatic dependency version alignment
- Virtually eliminates package merge conflicts

### Related Documentation

- [Dependency Management Guide](../docs/dependency-management.md) - Comprehensive 451-line guide covering:
  - Dual-package structure explanation
  - Best practices for adding/updating dependencies
  - Detailed conflict resolution workflows
  - Troubleshooting common issues
  - CI/CD considerations
  - Future monorepo migration guidance

### Statistics

- **Files changed**: 13
- **Lines added**: 1,076
- **Lines removed**: 485
- **Net change**: +591 lines
- **Lock file size reduction**: 507 lines in components package-lock.json (streamlined dependencies)
