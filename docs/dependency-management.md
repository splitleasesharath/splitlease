# Dependency Management Guide

This guide explains how to manage dependencies in the SplitLease project and how to handle merge conflicts in package files.

## Table of Contents

- [Project Structure](#project-structure)
- [Understanding the Dual-Package Setup](#understanding-the-dual-package-setup)
- [Best Practices](#best-practices)
- [Adding or Updating Dependencies](#adding-or-updating-dependencies)
- [Resolving Merge Conflicts](#resolving-merge-conflicts)
- [Node.js and npm Version Requirements](#nodejs-and-npm-version-requirements)
- [Troubleshooting](#troubleshooting)

---

## Project Structure

The SplitLease repository contains **two separate Node.js projects**:

1. **Root Application** (`app/split-lease/`)
   - Main Islands architecture application
   - Contains `package.json` and `package-lock.json`
   - Uses React, Vite, TypeScript, and testing tools

2. **Components Library** (`app/split-lease/components/`)
   - Standalone React component library
   - Has its own `package.json` and `package-lock.json`
   - Exports components as UMD and ES modules
   - Shares many dependencies with the root app

### Why Two Packages?

The components are built as a separate library to enable:
- Independent versioning and publishing
- Reuse across different projects
- Isolated testing and building
- Cleaner dependency management for component consumers

---

## Understanding the Dual-Package Setup

### Overlapping Dependencies

Both projects share these core dependencies:
- `react` and `react-dom` (components use them as peer dependencies)
- `styled-components` - for styling components
- `framer-motion` - for animations
- `typescript` - for type checking
- `vite` and `vitest` - for building and testing
- `zod` - for schema validation

### Important: Keep Shared Dependencies Aligned

When both projects use the same dependency, **keep them on the same major version** to avoid:
- Runtime conflicts
- Type mismatches
- Build errors
- Confusing behavior differences

**Example:** Both projects now use `zod ^4.1.12` (previously root used v3, components used v4)

---

## Best Practices

Follow these practices to minimize merge conflicts:

### 1. Update from `main` Frequently

Before starting work on dependencies:
```bash
git checkout main
git pull origin main
git checkout your-feature-branch
git merge main
# Or use rebase:
git rebase main
```

### 2. Isolate Dependency Changes

When adding or updating dependencies:
- Make dependency changes in a **dedicated commit**
- Don't mix dependency updates with feature code changes
- Use descriptive commit messages like:
  - `chore: add lodash dependency`
  - `chore: update react to v18.3.1`
  - `chore: align zod versions across packages`

### 3. Run npm install in the Correct Directory

- For app dependencies: `cd app/split-lease && npm install`
- For component dependencies: `cd app/split-lease/components && npm install`
- **Never run npm install from the repository root** (there's no package.json there)

### 4. Use Consistent Node.js and npm Versions

The project requires:
- **Node.js**: `>=18.20.0` (LTS versions 18.x or 20.x)
- **npm**: `>=9.0.0`

Check your versions:
```bash
node --version  # Should be v18.20.0+ or v20.x.x
npm --version   # Should be v9.0.0+
```

Install the correct Node.js version using nvm:
```bash
nvm install 18.20.0
nvm use 18.20.0
```

The repository includes a `.nvmrc` file, so you can also just run:
```bash
nvm use
```

---

## Adding or Updating Dependencies

### Adding a New Dependency

**For the root app:**
```bash
cd app/split-lease
npm install <package-name>
```

**For the components library:**
```bash
cd app/split-lease/components
npm install <package-name>
```

**Questions to ask:**
1. Is this dependency needed in both packages?
   - If yes, add it to both with the same version
2. Is this a React component dependency?
   - Add to components package
   - Make sure it doesn't conflict with peer dependencies
3. Is this a build tool or test utility?
   - Add to `devDependencies` in the appropriate package

### Updating an Existing Dependency

**Check current version:**
```bash
npm list <package-name>
```

**Update to latest within range:**
```bash
npm update <package-name>
```

**Update to specific version:**
```bash
npm install <package-name>@<version>
```

**Update major version (breaking change):**
```bash
npm install <package-name>@latest
# Then update the other package if needed
```

### After Installing/Updating

1. Run the sort script to maintain alphabetical order:
   ```bash
   node scripts/sort-package-deps.mjs
   ```

2. Run validation commands:
   ```bash
   # For root app
   cd app/split-lease
   npm run type-check
   npm run build
   npm test

   # For components
   cd app/split-lease/components
   npm run typecheck
   npm run build
   npm test
   ```

3. Commit the changes:
   ```bash
   git add app/split-lease/package.json app/split-lease/package-lock.json
   git commit -m "chore: add/update <package-name>"
   ```

---

## Resolving Merge Conflicts

### Automatic Resolution with Helper Script

We provide a helper script to automatically resolve common package conflicts:

```bash
./scripts/resolve-package-conflicts.sh
```

**What it does:**
1. Detects merge conflicts in package.json and package-lock.json files
2. For package.json: guides you through manual resolution, then sorts dependencies
3. For package-lock.json: removes conflicted files and regenerates via npm install
4. Validates that the resolution is successful

### Manual Resolution Process

If you prefer to resolve conflicts manually:

#### For package.json Conflicts

1. **Open the conflicted file** in your editor
2. **Resolve conflicts** by keeping all unique dependencies from both branches
3. For version conflicts, choose the **newer or more compatible version**
4. **Remove conflict markers** (`<<<<<<<`, `=======`, `>>>>>>>`)
5. **Sort the file**:
   ```bash
   node scripts/sort-package-deps.mjs
   ```
6. **Stage the resolved file**:
   ```bash
   git add app/split-lease/package.json
   ```

#### For package-lock.json Conflicts

**NEVER manually edit package-lock.json conflicts.** Always regenerate:

1. **Remove the conflicted lock file**:
   ```bash
   rm app/split-lease/package-lock.json
   # or
   rm app/split-lease/components/package-lock.json
   ```

2. **Regenerate it**:
   ```bash
   cd app/split-lease && npm install
   # or
   cd app/split-lease/components && npm install
   ```

3. **Stage the new lock file**:
   ```bash
   git add app/split-lease/package-lock.json
   ```

### Git Merge Strategy

The repository is configured with a `.gitattributes` file that uses the `merge=ours` strategy for lock files:

```gitattributes
**/package-lock.json merge=ours
```

This tells Git to prefer the current branch's lock file during merges, which should be followed by regenerating the lock file with `npm install`.

---

## Node.js and npm Version Requirements

### Checking Your Versions

```bash
node --version  # Should output v18.20.0 or higher (v18.x or v20.x)
npm --version   # Should output v9.0.0 or higher
```

### Installing the Correct Version

**Using nvm (recommended):**

```bash
# Install nvm if you don't have it
# Visit: https://github.com/nvm-sh/nvm

# Install and use the correct Node.js version
nvm install 18.20.0
nvm use 18.20.0

# Or use the .nvmrc file:
nvm use
```

**Using direct installation:**

Download Node.js 18.20.0 or later from [nodejs.org](https://nodejs.org/)

### Why Version Matters

Using a different npm version can:
- Rewrite lock file structure (lockfileVersion 3 format)
- Create conflicts even without dependency changes
- Make CI/CD builds inconsistent
- Waste time debugging phantom issues

The `.npmrc` file enforces version requirements with `engine-strict=true`.

---

## Troubleshooting

### Problem: Constant Merge Conflicts in package-lock.json

**Solution:**
1. Ensure you're using the correct Node.js/npm versions (see above)
2. Always regenerate lock files after merging, don't manually edit them
3. Run `npm install` only in the directory you're modifying
4. Pull latest changes from main before installing new dependencies

### Problem: Different Versions in Root vs Components

**Solution:**
1. Check both package.json files:
   ```bash
   grep "package-name" app/split-lease/package.json
   grep "package-name" app/split-lease/components/package.json
   ```
2. Align to the same version (preferably latest compatible):
   ```bash
   # Update both
   cd app/split-lease && npm install package-name@version
   cd app/split-lease/components && npm install package-name@version
   ```

### Problem: Lock File Out of Sync

**Solution:**
1. Delete lock file
2. Regenerate from package.json:
   ```bash
   cd app/split-lease
   rm package-lock.json
   npm install
   ```

### Problem: Build Fails After Dependency Update

**Solution:**
1. Check for breaking changes in the dependency's changelog
2. Verify TypeScript types are compatible
3. Run type checking:
   ```bash
   npm run type-check
   ```
4. Check for peer dependency warnings:
   ```bash
   npm install 2>&1 | grep -i "peer"
   ```

### Problem: Dependencies Appear Unsorted After Edit

**Solution:**
```bash
node scripts/sort-package-deps.mjs
```

You can verify sorting with:
```bash
node scripts/sort-package-deps.mjs --check
```

---

## CI/CD Considerations

When working with CI/CD pipelines:

1. **Ensure CI uses the correct Node.js version**
   - Check `.github/workflows` or CI config files
   - Should reference `.nvmrc` or specify Node 18.20.0+

2. **Run npm install in the correct directories**
   ```yaml
   - run: cd app/split-lease && npm install
   - run: cd app/split-lease/components && npm install
   ```

3. **Cache node_modules appropriately**
   - Cache keys should include lock file hashes
   - Separate caches for root and components

---

## Future Considerations

If merge conflicts persist despite following these practices, consider:

### Monorepo Tools

Migrating to a monorepo tool can provide:
- **Single lock file** for the entire repository
- **Workspace management** (npm workspaces, pnpm, or yarn workspaces)
- **Shared dependency hoisting** to reduce duplication
- **Centralized scripts** for building and testing

### Example with npm workspaces:

Create a root `package.json`:
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
- One `package-lock.json` at the root
- Shared dependencies hoisted to root `node_modules`
- Single `npm install` command
- Easier to keep versions aligned

---

## Summary

**Key Takeaways:**

✅ Use the correct Node.js and npm versions
✅ Update from main frequently
✅ Isolate dependency changes in dedicated commits
✅ Run npm install in the correct directory
✅ Never manually edit package-lock.json
✅ Use the helper script to resolve conflicts
✅ Keep shared dependencies aligned across packages
✅ Sort package.json files alphabetically

**For Help:**

- Run the conflict resolution script: `./scripts/resolve-package-conflicts.sh`
- Check dependency alignment: `node scripts/sort-package-deps.mjs --check`
- Verify your setup: `node --version && npm --version`

---

*Last updated: 2025-11-01*
