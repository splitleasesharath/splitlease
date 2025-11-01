# Dependency Management Guide

This document explains how to manage dependencies in the SplitLease repository and avoid package.json/package-lock.json merge conflicts.

## The Problem

This repository contains two Node.js projects:
- **Main app**: `app/split-lease/`
- **Components library**: `app/split-lease/components/`

Each has its own `package.json` and `package-lock.json`, with overlapping dependencies. This creates merge conflicts when:

1. Multiple feature branches add/update dependencies
2. Lock files are regenerated with different npm versions
3. Dependencies are listed in different orders
4. npm install runs in the wrong directory

## The Solution

We've implemented a 4-layer defense against merge conflicts:

### 1. Sorted Dependencies ✨

**Why it helps**: Alphabetically sorted dependencies prevent line-based merge conflicts.

**How to use**:
```bash
# From app/split-lease directory
npm run deps:sort

# Check if dependencies are sorted
npm run deps:check
```

**What it does**: Sorts all dependency sections (dependencies, devDependencies, peerDependencies, scripts) alphabetically in both package.json files.

### 2. Custom Merge Driver for package-lock.json 🔧

**Why it helps**: Instead of manually merging machine-generated lock files, Git automatically regenerates them from package.json.

**How it works**:
- When package-lock.json has a merge conflict, Git runs `scripts/npm-merge-driver.js`
- The script takes the current branch's package.json
- Runs `npm install --package-lock-only` to regenerate a valid lock file
- No manual conflict resolution needed!

**Setup** (already done):
```bash
git config --local merge.npm-merge-driver.driver "node scripts/npm-merge-driver.js %O %A %B %P"
```

### 3. Pre-commit Hook 🎣

**Why it helps**: Prevents committing unsorted package.json files.

**How it works**:
- Runs automatically before each commit
- Checks if package.json files have sorted dependencies
- Blocks the commit if dependencies are unsorted
- Prompts you to run `npm run deps:sort`

**Location**: `.git/hooks/pre-commit`

### 4. Workflow Best Practices 📋

Follow these practices to minimize conflicts:

#### Before Starting a Feature

```bash
# 1. Pull latest changes
git pull origin main

# 2. Create your feature branch
git checkout -b feature/your-feature

# 3. Ensure dependencies are sorted
cd app/split-lease
npm run deps:sort
```

#### Adding Dependencies

```bash
# 1. Navigate to the correct directory
cd app/split-lease          # For main app dependencies
# OR
cd app/split-lease/components   # For component library dependencies

# 2. Add the dependency
npm install package-name

# 3. Sort dependencies
npm run deps:sort  # From app/split-lease directory

# 4. Commit in a dedicated commit
git add package.json package-lock.json
git commit -m "chore: add package-name dependency"
```

#### Before Merging/Pulling

```bash
# 1. Commit your changes
git add .
git commit -m "your changes"

# 2. Pull latest main
git pull origin main

# 3. If there are package-lock.json conflicts:
#    - The merge driver will auto-resolve them
#    - Verify the lock file is valid:
cd app/split-lease
npm install  # Should complete without errors

# 4. Continue with your work
```

## Common Scenarios

### Scenario 1: Adding a New Dependency

```bash
cd app/split-lease
npm install react-query
npm run deps:sort
git add package.json package-lock.json
git commit -m "chore: add react-query for data fetching"
```

### Scenario 2: Updating Multiple Dependencies

```bash
cd app/split-lease
npm update typescript vite vitest
npm run deps:sort
git add package.json package-lock.json
git commit -m "chore: update build tooling"
```

### Scenario 3: Resolving a Merge Conflict

```bash
# Pull from main
git pull origin main

# If package-lock.json conflicts:
# 1. The merge driver should auto-resolve
# 2. Verify it worked:
cd app/split-lease
npm install

# If package.json conflicts:
# 1. Manually resolve the conflict in package.json
# 2. Sort dependencies
npm run deps:sort
# 3. Regenerate lock file
npm install
# 4. Complete the merge
git add package.json package-lock.json
git commit
```

### Scenario 4: Lock File Out of Sync

```bash
# If package-lock.json doesn't match package.json:
cd app/split-lease
npm install --package-lock-only
npm run deps:sort
git add package.json package-lock.json
git commit -m "chore: sync package-lock.json"
```

## Critical Rules

### ✅ DO

- **Sort before committing**: Always run `npm run deps:sort` before committing package.json changes
- **Pull frequently**: Merge main into your feature branch often to catch conflicts early
- **Isolate dependency changes**: Keep dependency updates in separate commits
- **Use correct npm version**: Use npm 9.x or 10.x (NOT 11.x) to match the repository standard
- **Install in the right directory**: Run npm commands in the directory you're modifying

### ❌ DON'T

- **Don't mix installs**: Don't run npm install in both app and components directories in the same commit
- **Don't commit unsorted dependencies**: The pre-commit hook will block this
- **Don't manually edit package-lock.json**: Always regenerate it with npm install
- **Don't use different npm versions**: Check `npm --version` (should be 9.x or 10.x)
- **Don't skip sorting**: Even if it seems unnecessary, always sort

## Checking Your Setup

Verify everything is configured correctly:

```bash
# 1. Check Git merge driver
git config --get merge.npm-merge-driver.driver
# Should output: node scripts/npm-merge-driver.js %O %A %B %P

# 2. Check pre-commit hook exists
ls -la .git/hooks/pre-commit
# Should exist and be executable

# 3. Check npm version
npm --version
# Should be 9.x or 10.x (NOT 11.x)

# 4. Test dependency sorting
cd app/split-lease
npm run deps:check
# Should output: ✓ All package.json files are properly sorted
```

## Troubleshooting

### Pre-commit hook not running

```bash
chmod +x .git/hooks/pre-commit
```

### Merge driver not working

```bash
git config --local merge.npm-merge-driver.driver "node scripts/npm-merge-driver.js %O %A %B %P"
```

### npm version mismatch

```bash
# Use nvm to switch to npm 10
nvm install 20
nvm use 20
npm --version  # Should be 10.x
```

### Lock file corrupted

```bash
cd app/split-lease
rm package-lock.json
npm install
npm run deps:sort
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run deps:sort` | Sort all package.json dependencies alphabetically |
| `npm run deps:check` | Verify dependencies are sorted |
| `npm install --package-lock-only` | Regenerate lock file without installing |
| `git pull origin main` | Get latest changes (conflicts auto-resolve) |

## Team Setup

When a new developer joins, they should run:

```bash
# 1. Clone the repository
git clone <repo-url>
cd <repo-dir>

# 2. Verify Git config (merge driver should already be configured)
git config --get merge.npm-merge-driver.driver

# 3. Verify pre-commit hook exists
ls -la .git/hooks/pre-commit

# 4. Use correct npm version
npm --version  # Should be 9.x or 10.x

# 5. Install dependencies
cd app/split-lease
npm install
cd components
npm install
```

## Questions?

If you encounter persistent merge conflicts:
1. Check that you've followed the workflow above
2. Verify your setup with the "Checking Your Setup" section
3. Ask the team for help in the #engineering channel

---

**Remember**: These tools are here to help, but they work best when you:
- Pull from main frequently
- Keep dependency changes in dedicated commits
- Always sort dependencies before committing
- Use the same npm version as the team
