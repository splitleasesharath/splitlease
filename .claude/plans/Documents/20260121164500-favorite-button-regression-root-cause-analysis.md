# FavoriteButton Regression - Root Cause Analysis

**Date**: 2026-01-21
**Component**: ViewSplitLeasePage
**Issue**: FavoriteButton not visible on listing detail page
**Severity**: High - Core user feature broken

---

## Executive Summary

The FavoriteButton component, successfully added to ViewSplitLeasePage on **2026-01-17** (commit `59bd2bda`), was invisible to users due to a **file architecture confusion** and **incomplete CSS variant implementation**. The feature was added to the subdirectory file (`ViewSplitLeasePage/ViewSplitLeasePage.jsx`) while the application imports from the root-level file (`ViewSplitLeasePage.jsx`), creating a shadow implementation that never executed.

Additionally, when the feature was correctly added to the active file, the CSS inline variant used dark overlay styling that was invisible against light backgrounds.

---

## Timeline of Events

### 2026-01-16: File Structure Created
- **Commit**: `593c923e` - "Refactor ViewSplitLeasePage to use new search page layout"
- **What Happened**: Refactoring created two ViewSplitLeasePage files:
  1. `app/src/islands/pages/ViewSplitLeasePage.jsx` (2,611 lines) - **ACTIVE FILE**
  2. `app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx` (3,030 lines) - **SHADOW FILE**

### 2026-01-17: Feature Added to Wrong File
- **Commit**: `59bd2bda` - "feat(view-split-lease): add favorite button to booking section"
- **File Modified**: `ViewSplitLeasePage/ViewSplitLeasePage.jsx` ❌ (subdirectory)
- **File Imported by App**: `ViewSplitLeasePage.jsx` ✅ (root level)
- **Result**: Code written but never executed

### 2026-01-17 - 2026-01-21: Silent Failure Period
- Users reported missing favorite button
- No console errors or build failures
- Feature appeared to exist in git history
- Debugging efforts focused on CSS caching

### 2026-01-21: Root Cause Identified
- **Discovery**: Two files with identical names exist
- **Import Resolution**: `import ViewSplitLeasePage from './islands/pages/ViewSplitLeasePage.jsx'` resolves to root-level file, NOT subdirectory
- **Shadow Implementation**: All changes to subdirectory file were never loaded

---

## Root Causes

### 1. **Ambiguous File Architecture** (Primary)

**The Problem:**
```
app/src/islands/pages/
├── ViewSplitLeasePage.jsx              ← ACTIVE (imported by entry)
├── ViewSplitLeasePage.module.css
└── ViewSplitLeasePage/
    ├── ViewSplitLeasePage.jsx          ← SHADOW (never imported)
    ├── ViewSplitLeasePage.css
    └── components/
```

**Why This Happened:**
- The refactor commit `593c923e` created a nested structure without removing the root file
- Both files are valid React components with similar structure
- No linter or build-time warning about duplicate component definitions
- Git commit successfully modified the subdirectory file, masking the issue

**Import Behavior:**
```javascript
// Entry file: app/src/view-split-lease.jsx
import ViewSplitLeasePage from './islands/pages/ViewSplitLeasePage.jsx';
//                                                 ^^^^^^^^^^^^^^^^^^
//                                                 Resolves to ROOT file
```

ESM import resolution rules:
1. Exact match takes precedence over directory index
2. `.jsx` extension explicitly targets the file, not a directory
3. No warning when both `Component.jsx` and `Component/Component.jsx` exist

### 2. **CSS Inline Variant Incomplete** (Secondary)

**The Problem:**
When FavoriteButton was eventually added to the correct file, it was invisible due to CSS styling:

```css
/* DEFAULT: Dark overlay for image cards */
.favorite-button-shared {
  background: rgba(0, 0, 0, 0.6);  /* Dark background */
  color: #fff;                      /* White icon */
}

/* INLINE VARIANT: Only changed position, not colors */
.favorite-button-shared.favorite-button--inline {
  position: static;  /* ← Only this was defined */
}
```

**Result**: Dark button with white icon on light purple gradient = invisible

### 3. **Desktop Implementation Missing**

Even after fixing the file issue, the FavoriteButton was only added to **mobile view** (line 2432), not **desktop view** (needed at line ~1942).

---

## Why This Was Hard to Debug

### 1. **No Error Signals**

| What We Expected | What Actually Happened |
|------------------|------------------------|
| Console error about missing component | ✅ No errors - component imported successfully |
| Build failure | ✅ Build succeeded - both files valid |
| Runtime exception | ✅ No exceptions - root file rendered correctly |
| Git showing uncommitted changes | ✅ Git showed feature committed |
| Linter warning about duplicate files | ❌ No such warning exists |

### 2. **Misleading Git History**

```bash
$ git log --oneline --all -- "ViewSplitLeasePage*"
59bd2bda feat(view-split-lease): add favorite button to booking section
```

The commit message and git history made it appear the feature was implemented. Viewing the commit showed valid code changes:

```bash
$ git show 59bd2bda --stat
ViewSplitLeasePage/ViewSplitLeasePage.jsx | 38 +++++++++---------
```

This appeared correct without inspecting **which** ViewSplitLeasePage file was modified.

### 3. **Browser Cache Red Herring**

Initial debugging focused on CSS caching because:
- Component was imported (no import errors)
- State existed (`isFavorited` in both files)
- CSS file was recently modified
- Hard refresh is a common fix for Vite HMR issues

This led to:
- Multiple hard refreshes
- Cache clearing
- Version bumping (v4, v5)
- Entry file modifications

All of which were **correct debugging steps** but addressed the wrong problem.

### 4. **File Discovery Required Manual Inspection**

Finding the duplicate files required:
```bash
$ find . -name "*ViewSplitLease*" -type f
./ViewSplitLeasePage/ViewSplitLeasePage.jsx
./ViewSplitLeasePage.jsx
./ViewSplitLeasePage.module.css
```

Most debugging tools (DevTools, React DevTools, Vite inspector) showed the **rendered** component, not which file provided it.

### 5. **Console Logs Were Misleading**

The v4/v5 version bump logs appeared in the console:
```
🚀 view-split-lease entry v4 - FavoriteButton DESKTOP + MOBILE
```

This **confirmed the entry file loaded** but didn't indicate which ViewSplitLeasePage component was rendering.

---

## Impact Assessment

### User Impact
- **Severity**: High
- **Duration**: ~4 days (2026-01-17 to 2026-01-21)
- **Affected Users**: All users viewing listing detail pages
- **Functionality Loss**: Cannot favorite listings from detail view
- **Workaround**: Users could favorite from search page

### Development Impact
- **Time Lost**: ~2 hours debugging
- **False Leads**: CSS caching, browser issues, Vite HMR
- **Code Churn**: 5 commits attempting to fix
- **Trust Impact**: Feature appeared "complete" in git but wasn't working

---

## Prevention Strategies

### 1. **Enforce Single Component Definition**

**ESLint Rule:**
```javascript
// .eslintrc.js
{
  "rules": {
    "no-duplicate-imports": "error",
    "import/no-duplicates": "error"
  }
}
```

**Custom Script:**
```bash
# Find duplicate component names
find app/src -type f -name "*.jsx" |
  sed 's|.*/||' |
  sort |
  uniq -d
```

### 2. **File Architecture Convention**

**Decision**: Choose ONE pattern project-wide:

**Option A**: Flat structure (current root file)
```
pages/
├── ViewSplitLeasePage.jsx
├── ViewSplitLeasePage.module.css
└── SearchPage.jsx
```

**Option B**: Nested structure (current subdirectory)
```
pages/
├── ViewSplitLeasePage/
│   ├── index.jsx              ← Use index.jsx for export
│   ├── ViewSplitLeasePage.jsx
│   └── components/
└── SearchPage/
    └── index.jsx
```

**Recommendation**: Remove one of the duplicate files immediately.

### 3. **Import Verification in CI**

```bash
# Verify all imports resolve to expected files
npm run build --dry-run --verbose
```

### 4. **Console Logging Standard**

```javascript
// Add file path to debug logs
console.log(`🔄 ViewSplitLeasePage v5 - ${__filename}`);
```

### 5. **Visual Regression Testing**

Use Playwright to screenshot critical UI elements:
```javascript
test('favorite button visible on listing detail', async ({ page }) => {
  await page.goto('/view-split-lease/...');
  await expect(page.locator('[aria-label="Add to favorites"]')).toBeVisible();
});
```

---

## Resolution

### Immediate Fix (Commit `0e8a6876`)

1. ✅ Added FavoriteButton to correct file (`ViewSplitLeasePage.jsx`)
2. ✅ Added to desktop view (was missing)
3. ✅ Fixed CSS inline variant visibility
4. ✅ Verified component renders correctly

### Recommended Next Steps

1. **Delete shadow file**: Remove `ViewSplitLeasePage/ViewSplitLeasePage.jsx`
2. **Consolidate styling**: Merge `.module.css` and `.css` files
3. **Add E2E test**: Verify favorite button presence
4. **Document architecture**: Update CLAUDE.md with file structure rules

---

## Key Lessons

1. **File naming matters**: Component.jsx and Component/Component.jsx create ambiguity
2. **Git history isn't ground truth**: Committed code ≠ executed code
3. **Test what users see**: Build-time success ≠ runtime success
4. **Validate assumptions**: "Feature is committed" ≠ "Feature works"
5. **Check import chains**: Where code lives ≠ where it's imported from

---

## Appendix: File Comparison

| Metric | Root File | Subdirectory File |
|--------|-----------|------------------|
| Path | `pages/ViewSplitLeasePage.jsx` | `pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx` |
| Lines | 2,611 | 3,030 |
| Last Modified | 2026-01-21 (active) | 2026-01-21 (stale) |
| Imported By | `view-split-lease.jsx` ✅ | Nothing ❌ |
| Has FavoriteButton | ✅ Now (as of commit `0e8a6876`) | ✅ Since commit `59bd2bda` |
| CSS File | `.module.css` | `.css` |
| Components Subfolder | ❌ No | ✅ Yes |

**Conclusion**: Two valid implementations existed, only one was active.
