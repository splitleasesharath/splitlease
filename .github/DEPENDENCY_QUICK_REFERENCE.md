# Dependency Management Quick Reference

## 🚨 Before Every Commit

```bash
cd app/split-lease
npm run deps:sort
```

## 📦 Adding Dependencies

```bash
# Main app
cd app/split-lease
npm install package-name
npm run deps:sort
git add package.json package-lock.json
git commit -m "chore: add package-name"

# Components library
cd app/split-lease/components
npm install package-name
cd ..
npm run deps:sort
git add components/package.json components/package-lock.json
git commit -m "chore: add package-name to components"
```

## 🔄 Before Merging/Pulling

```bash
# Ensure your changes are committed
git status

# Pull with confidence (merge driver will handle lock conflicts)
git pull origin main

# Verify lock files are valid
cd app/split-lease
npm install  # Should complete without errors
```

## 🔧 Setup (One-time per clone)

```bash
# Run the setup script
./scripts/setup-git-merge-driver.sh

# Verify setup
git config --get merge.npm-merge-driver.driver
# Should output: node scripts/npm-merge-driver.js %O %A %B %P
```

## ⚡ Common Commands

| Command | What It Does |
|---------|-------------|
| `npm run deps:sort` | Sort all dependencies alphabetically |
| `npm run deps:check` | Verify dependencies are sorted |
| `npm install --package-lock-only` | Regenerate lock file only |

## 🚫 What NOT to Do

- ❌ Don't manually edit package-lock.json
- ❌ Don't use npm 11+ (use 9.x or 10.x)
- ❌ Don't mix installing in different directories
- ❌ Don't commit unsorted dependencies (pre-commit hook will block)

## 📖 Full Documentation

See [DEPENDENCY_MANAGEMENT.md](../DEPENDENCY_MANAGEMENT.md) for complete guidelines.
