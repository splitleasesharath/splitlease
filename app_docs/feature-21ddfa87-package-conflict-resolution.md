# Package Conflict Resolution Tooling

**ADW ID:** 21ddfa87
**Date:** 2025-11-01
**Specification:** specs/issue-28-adw-21ddfa87-sdlc_planner-resolve-package-conflicts.md

## Overview

This chore resolves merge conflicts in the components package-lock.json file and documents the existing dependency management tooling that prevents future package.json conflicts. The project has a dual-package architecture where both the root app and components library maintain separate dependency trees, which can lead to merge conflicts when multiple developers update dependencies simultaneously.

## What Was Built

- Resolved current package-lock.json merge conflicts in app/split-lease/components
- Enhanced README.md documentation to clearly explain the automated conflict resolution process
- Documented the existing conflict prevention tools (git merge driver, dependency sorting, pre-commit validation)
- Validated the complete build and test pipeline to ensure zero regressions

## Technical Implementation

### Files Modified

- `README.md:238-260`: Enhanced the "Merge Conflicts in package.json or package-lock.json" troubleshooting section
  - Added detailed explanation of what the automated script does
  - Documented the three conflict prevention tools (merge driver, sorting script, pre-commit validation)
  - Clarified that automated resolution is the primary approach with manual steps as fallback
  - Added reference to the comprehensive dependency management guide

- `app/split-lease/components/package-lock.json`: Regenerated lock file to resolve merge conflicts
  - Removed duplicate dependency entries that caused conflicts
  - Added new testing dependencies (@testing-library/jest-dom, @testing-library/react, @vitest packages)
  - Cleaned up 241 lines of conflicted dependency declarations
  - Ensured lock file is in sync with package.json

### Key Changes

1. **Conflict Resolution**: The package-lock.json file was regenerated using npm install to clear all merge conflict markers and ensure consistency with package.json
2. **Documentation Enhancement**: The README troubleshooting section now provides a clear workflow: automated script first, manual resolution as fallback
3. **Tool Visibility**: Made the three conflict prevention tools more discoverable by documenting them in the README
4. **Build Validation**: Confirmed TypeScript type checking, component builds, and all tests pass with the resolved dependencies

## How to Use

### Resolving Package Conflicts (Automated)

When you encounter merge conflicts in package.json or package-lock.json files:

1. Run the automated resolution script from the project root:
   ```bash
   ./scripts/resolve-package-conflicts.sh
   ```

2. The script will automatically:
   - Detect and resolve conflicts in both package.json and package-lock.json
   - Sort dependencies alphabetically to minimize future conflicts
   - Regenerate lock files from package.json when needed
   - Validate all changes to ensure builds still work

### Manual Resolution (Fallback)

If the automated script doesn't work or you prefer manual resolution:

1. For `package-lock.json` conflicts:
   ```bash
   cd app/split-lease/components
   rm package-lock.json
   npm install
   ```

2. For `package.json` conflicts:
   - Manually resolve the conflicts in your editor
   - Then run: `node scripts/sort-package-deps.mjs`

### Preventing Future Conflicts

The project includes three tools that work together to minimize conflicts:

1. **Git Merge Driver** (`npm-merge-driver.js`): Automatically regenerates package-lock.json during git merges
2. **Dependency Sorting** (`sort-package-deps.mjs`): Keeps dependencies in alphabetical order
3. **Pre-commit Validation** (`pre-commit-deps.js`): Validates dependency changes before commits

These tools run automatically, but you can manually invoke the sorting script:
```bash
node scripts/sort-package-deps.mjs
```

## Configuration

No additional configuration is required. The conflict prevention tools are already set up and will run automatically during:
- Git merges (merge driver)
- Git commits (pre-commit hook)
- Dependency installations (npm install)

## Testing

Validation was performed using the following commands:

```bash
# TypeScript type checking
cd app/split-lease/components && npm run typecheck

# Component build validation
cd app/split-lease/components && npm run build

# All component tests
cd app/test-harness && npm test

# Git status verification
git status

# Dependency sorting validation
node scripts/sort-package-deps.mjs --check
```

All validation commands passed successfully with zero regressions.

## Notes

- **Root Cause**: The underlying issue is an architectural anti-pattern where two separate npm projects (root app and components library) exist in the same Git repository without proper monorepo tooling
- **Current Solution**: Pragmatic approach using automated scripts and git hooks to manage conflicts until a monorepo refactor is undertaken
- **Long-term Solutions**:
  - Merge components into the main app (single project)
  - Implement npm Workspaces (proper monorepo with single lock file)
  - Use advanced monorepo tools like Turborepo (likely overkill for this project size)
- **Future Work**: Consider implementing a proper monorepo structure if package conflicts continue to be a significant pain point
- **Documentation**: See [docs/dependency-management.md](../docs/dependency-management.md) for comprehensive dependency management instructions
- **Root Cause Analysis**: See [docs/PACKAGE_CONFLICT_ROOT_CAUSE_ANALYSIS.md](../docs/PACKAGE_CONFLICT_ROOT_CAUSE_ANALYSIS.md) for detailed analysis of why these conflicts occur
