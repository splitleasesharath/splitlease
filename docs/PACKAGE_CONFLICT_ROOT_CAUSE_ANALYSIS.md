# Package Conflict Root Cause Analysis

## Executive Summary

**The problem is not a Git problem or a workflow problem. It's an architecture problem.**

Your repository contains two **separate npm projects with duplicate dependencies** living in the same Git repository without proper monorepo tooling. Every time someone updates dependencies in either project, you get conflicts because:

1. Both projects maintain independent dependency trees
2. The same dependencies are duplicated with different versions
3. There's no single source of truth for shared dependencies
4. npm generates massive lock files that inevitably collide

**The scripts I created earlier are band-aids.** They reduce pain but don't fix the root cause.

## The Real Problem: Anti-Pattern Architecture

### Current Structure (❌ Anti-Pattern)

```
app/split-lease/
├── package.json              # Project 1: Main app
├── package-lock.json         # Lock file 1
├── node_modules/             # Dependencies 1
└── components/
    ├── package.json          # Project 2: Component library
    ├── package-lock.json     # Lock file 2
    └── node_modules/         # Dependencies 2 (DUPLICATES!)
```

### Why This Causes Conflicts

**1. Duplicate Dependencies with Version Drift**

```bash
# Main app has:
"zod": "^3.23.8"
"vitest": "^2.1.8"
"@testing-library/react": "^16.1.0"

# Components has:
"zod": "^4.1.12"          # ⚠️ DIFFERENT VERSION
"vitest": "^4.0.6"         # ⚠️ DIFFERENT VERSION
"@testing-library/react": "^16.3.0"  # ⚠️ DIFFERENT VERSION
```

**Problem**: When Developer A updates vitest in the main app and Developer B updates vitest in components, both touch overlapping parts of their respective lock files. Even though they're "different" files, Git doesn't care - it sees both PRs modifying dependency manifests and creates conflicts.

**2. No Shared Dependency Resolution**

Each project resolves dependencies independently:
- Main app: Installs 500+ packages
- Components: Installs 400+ packages
- **Overlap**: ~80% of packages are duplicated

When npm runs in either directory, it regenerates its lock file based on its view of the world. If two developers run npm at different times with different npm versions, they get different lock files.

**3. Nested Project Anti-Pattern**

The components package is **inside** the main app directory. This creates confusion:
- Which package.json should I modify?
- Which node_modules does my import use?
- Can I run npm install from the root?

This is not a monorepo. It's two repos pretending to be one.

## Why Current "Solutions" Are Band-Aids

### 1. Sorting Dependencies
**What it does**: Reduces line-based conflicts
**What it doesn't fix**: Version drift, duplicate dependencies, separate lock files

### 2. Git Merge Drivers
**What it does**: Auto-resolves lock file conflicts by regenerating
**What it doesn't fix**: The fact that you're maintaining 2 separate lock files

### 3. Pre-commit Hooks
**What it does**: Enforces sorting
**What it doesn't fix**: The fundamental architecture issue

### 4. npm Version Standardization
**What it does**: Reduces lock file format differences
**What it doesn't fix**: Two independent dependency trees

## The Clean Solutions

There are **three proper architectural approaches**, from simplest to most robust:

---

## Solution 1: Single Project (Recommended for Your Scale)

**Merge the components package into the main app as a regular directory.**

### Structure
```
app/split-lease/
├── package.json              # ONE package.json
├── package-lock.json         # ONE lock file
├── node_modules/             # ONE node_modules
├── src/
│   ├── components/          # Not a separate npm package
│   │   ├── Header/
│   │   ├── Footer/
│   │   └── index.ts
│   ├── islands/
│   ├── pages/
│   └── api/
└── tests/
```

### Pros
✅ Single source of truth for all dependencies
✅ No version drift - one version of each package
✅ One lock file = no lock file conflicts
✅ Simpler build process
✅ Faster CI (one npm install instead of two)
✅ No confusion about where to add dependencies

### Cons
❌ Components aren't separately publishable (but they're already `private: true`)
❌ Can't version components separately (but you're not doing this anyway)

### When to Use
- Components are only used within this app (✓ your case)
- Components package is `private: true` (✓ your case)
- You're not publishing to npm (✓ your case)
- Team size < 20 developers

### Migration Steps

1. **Move component source code:**
```bash
mv app/split-lease/components/src app/split-lease/src/components
```

2. **Merge dependencies into main package.json:**
```bash
# Add any components-only dependencies to main package.json
# Update all versions to latest
```

3. **Update imports:**
```bash
# Change from:
import { Header } from '@split-lease/components';

# To:
import { Header } from '@/components';
```

4. **Update build config:**
```bash
# Remove separate component build
# Components are now just TypeScript files in src/
```

5. **Delete redundant files:**
```bash
rm -rf app/split-lease/components/package.json
rm -rf app/split-lease/components/package-lock.json
rm -rf app/split-lease/components/node_modules
```

---

## Solution 2: Proper Monorepo with npm Workspaces

**Use npm's built-in workspace feature to manage multiple packages properly.**

### Structure
```
app/split-lease/              # Root
├── package.json              # Workspace root
├── package-lock.json         # SINGLE lock file for ALL packages
├── node_modules/             # Shared dependencies
├── packages/
│   ├── main-app/
│   │   ├── package.json
│   │   └── src/
│   └── components/
│       ├── package.json
│       └── src/
```

### Root package.json
```json
{
  "name": "split-lease-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "devDependencies": {
    "typescript": "^5.7.2",
    "vite": "^5.4.11",
    "vitest": "^4.0.6"
  }
}
```

### Pros
✅ Single lock file (ONE source of truth)
✅ Shared dependencies installed once
✅ Can still build components separately
✅ npm automatically hoists shared dependencies
✅ Native npm support (no external tools)

### Cons
❌ Requires restructuring
❌ More complex than single project
❌ Requires understanding workspaces

### When to Use
- You have multiple truly independent packages
- You want to publish some packages separately later
- Team size 10-50 developers
- You need separate versioning

---

## Solution 3: Advanced Monorepo (Turborepo/Nx)

**Use a proper monorepo tool for enterprise-scale projects.**

### Structure
```
apps/
├── web/                     # Main app
│   ├── package.json
│   └── src/
packages/
├── components/              # Shared components
│   ├── package.json
│   └── src/
├── utils/                   # Shared utilities
│   ├── package.json
│   └── src/
├── config/                  # Shared config
│   └── package.json
package.json                 # Root workspace
turbo.json                   # Build orchestration
```

### Pros
✅ Best-in-class dependency management
✅ Parallel task execution
✅ Remote caching
✅ Incremental builds
✅ Scales to 100+ packages

### Cons
❌ Significant complexity
❌ Learning curve
❌ Overkill for 2 packages

### When to Use
- Multiple teams working on different packages
- Team size 50+ developers
- 10+ separate packages
- **NOT your current situation**

---

## Recommended Approach for SplitLease

Based on your current setup, I recommend **Solution 1: Single Project**.

### Why?

1. **Your components are private**: `"private": true` in components/package.json means you're not publishing to npm
2. **Components are app-specific**: They reference `@types`, `@api`, `@utils` from the parent app
3. **No separate versioning**: Both packages share the same version `0.1.0`
4. **Small team**: The complexity of a monorepo isn't justified
5. **Build simplification**: Components are just UMD bundles for the main app

### What You're Actually Doing

Looking at your vite config, components aren't really a separate "library" - they're just TypeScript files that get:
- Built to UMD format
- Imported by the main app
- Tested alongside the main app

This is the **definition of a single project**, not a monorepo.

---

## Migration Plan: Single Project Approach

### Phase 1: Preparation (1 hour)

1. **Create migration branch**
```bash
git checkout -b refactor/merge-components-into-main-app
```

2. **Audit dependencies**
```bash
# Document which dependencies are unique to components
# Identify version conflicts to resolve
```

3. **Update import paths**
```bash
# Plan the new import structure
# From: '@split-lease/components'
# To: '@/components' or '@components'
```

### Phase 2: Merge Dependencies (1 hour)

1. **Consolidate package.json**
```json
{
  "dependencies": {
    "framer-motion": "^11.11.17",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "styled-components": "^6.1.13",
    "zod": "^4.1.12"  // Use latest version
  },
  "devDependencies": {
    // Merge both devDependencies, using latest versions
    // Remove duplicates
  }
}
```

2. **Install and verify**
```bash
cd app/split-lease
npm install
npm run type-check
npm test
```

### Phase 3: Move Source Code (2 hours)

1. **Move component files**
```bash
mkdir -p app/split-lease/src/components
mv app/split-lease/components/src/* app/split-lease/src/components/
```

2. **Update tsconfig.json**
```json
{
  "compilerOptions": {
    "paths": {
      "@components/*": ["./src/components/*"],
      "@types/*": ["./types/*"],
      // ...
    }
  }
}
```

3. **Update all imports**
```bash
# Use find/replace across codebase
# '@split-lease/components' → '@components'
```

### Phase 4: Update Build (1 hour)

1. **Remove separate component build or merge into main build**
2. **Update vite.config.ts**
3. **Update npm scripts**
4. **Test build output**

### Phase 5: Cleanup (30 min)

```bash
rm app/split-lease/components/package.json
rm app/split-lease/components/package-lock.json
rm -rf app/split-lease/components/node_modules
rm -rf app/split-lease/components/vite.config.ts
rm -rf app/split-lease/components/tsconfig.json
```

### Phase 6: Verify (1 hour)

1. **Run all tests**
2. **Build all artifacts**
3. **Check bundle sizes**
4. **Verify no broken imports**

### Total Time: ~6-7 hours

---

## Alternative: npm Workspaces (If You Insist on Separate Packages)

If you truly need separate packages, here's the workspace setup:

### 1. Create Workspace Root

**Current structure:**
```
app/split-lease/
```

**New structure:**
```
app/split-lease/              # Workspace root
├── package.json              # Workspace config (NEW)
├── package-lock.json         # SINGLE lock file
├── packages/
│   ├── main/                 # Moved from root
│   │   ├── package.json
│   │   └── src/
│   └── components/           # Moved from components/
│       ├── package.json
│       └── src/
```

### 2. Root package.json

```json
{
  "name": "split-lease-workspace",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "type-check": "npm run type-check --workspaces"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "typescript": "^5.7.2",
    "vite": "^5.4.11",
    "vitest": "^4.0.6"
  }
}
```

### 3. Package-specific package.json

**packages/main/package.json:**
```json
{
  "name": "@split-lease/main",
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@split-lease/components": "workspace:*"  // Links to sibling
  }
}
```

**packages/components/package.json:**
```json
{
  "name": "@split-lease/components",
  "peerDependencies": {
    "react": "^18",
    "react-dom": "^18"
  }
}
```

### 4. Install Once

```bash
cd app/split-lease  # Workspace root
npm install         # Installs for ALL packages
```

**Result**: ONE package-lock.json, no more conflicts.

---

## Decision Matrix

| Criteria | Single Project | npm Workspaces | Turborepo |
|----------|---------------|----------------|-----------|
| Setup complexity | ⭐ Simple | ⭐⭐ Moderate | ⭐⭐⭐ Complex |
| Merge conflicts | ✅ Eliminated | ✅ Eliminated | ✅ Eliminated |
| Build speed | ⭐⭐⭐ Fast | ⭐⭐ Medium | ⭐⭐⭐ Fast |
| Team size | 1-20 | 5-50 | 20-500 |
| Separate versioning | ❌ No | ✅ Yes | ✅ Yes |
| Learning curve | ⭐ Easy | ⭐⭐ Moderate | ⭐⭐⭐ Steep |
| Your use case fit | ✅ Perfect | ⚠️ Overkill | ❌ Overkill |

---

## Immediate Next Steps

### Option A: Do It Right (Recommended)
1. Read this document with your team
2. Decide: Single Project or npm Workspaces
3. Set aside a sprint to migrate properly
4. Delete the band-aid scripts I created earlier
5. Never have package conflicts again

### Option B: Keep the Band-Aids
1. Use the scripts I created earlier
2. Accept that you'll have occasional conflicts
3. Plan to refactor "someday" (which never comes)
4. Continue with suboptimal architecture

---

## Conclusion

**Package merge conflicts are a symptom, not the disease.**

The disease is having two separate npm projects with duplicate dependencies in one Git repository without proper monorepo tooling.

You can either:
- **Fix the architecture** (eliminate conflicts permanently)
- **Manage the symptoms** (reduce conflicts with tooling)

The choice is yours, but understand that tooling solutions are temporary workarounds for a fundamental architectural problem.

I strongly recommend **Solution 1: Single Project** for your use case. It's the cleanest, simplest solution that matches how you're actually using the code.
