# Barrel Removal Verification Checklist

## Purpose
After barrel files are eliminated, this document guides Claude Code to verify that all necessary fixes are in place and no broken imports remain.

## Usage
Run this as a prompt to Claude Code after a barrel elimination session:

```
Read the instructions in adws/verify_barrel_removal.md and verify the fixes are complete
```

---

## CLAUDE CODE INSTRUCTIONS

### Task Overview
Verify that barrel file removal was done correctly by checking:
1. No dangling imports (imports pointing to deleted/modified barrels)
2. All consumers now use direct imports
3. No new barrel patterns were accidentally introduced
4. Build and type-check pass
5. Import paths are consistent and follow conventions

---

## Phase 1: Identify What Was Changed

### 1.1 Get the list of barrel files that were modified/deleted

```bash
# Find recently modified files that HAD barrel patterns
git diff HEAD~5 --name-only | xargs -I{} sh -c 'git show HEAD~5:{} 2>/dev/null | grep -q "export \* from" && echo {}'

# Or check the barrel detection output for what SHOULD have been fixed
cat barrels_before.json | jq -r '.barrel_files[].path'
```

### 1.2 Identify affected consumers

For each barrel that was modified, find files that imported from it:

```bash
# Search for imports from a specific barrel path
# Example: if barrel was 'src/logic/index.js'
grep -r "from ['\"].*logic['\"]" app/src --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" -l

# Or for the schedule selector barrel
grep -r "from ['\"].*listing-schedule-selector['\"]" app/src --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" -l
```

---

## Phase 2: Verify No Broken Imports

### 2.1 TypeScript/Build Check (Most Important)

```bash
cd app

# TypeScript check (if using TS)
npx tsc --noEmit 2>&1 | head -50

# Build check
bun run build 2>&1 | grep -i "error\|cannot find\|not found"
```

**Expected:** No errors. If there are errors, they indicate broken imports.

### 2.2 Search for Imports to Deleted Barrels

If a barrel file was deleted, ensure no files still import from it:

```bash
# Example: check if anything still imports from a deleted barrel
# Replace 'path/to/deleted/barrel' with actual path

grep -r "from ['\"].*path/to/deleted/barrel" app/src --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"
```

**Expected:** No results. Any matches are broken imports that need fixing.

### 2.3 Check for "Module Not Found" Patterns

```bash
# Common error patterns to search for in build output
bun run build 2>&1 | grep -E "Module not found|Cannot find module|Unable to resolve"
```

---

## Phase 3: Verify Import Consistency

### 3.1 Check That Imports Are Now Direct

For each consumer that was updated, verify the import path points to the actual file:

```bash
# Get a sample of updated imports
git diff HEAD~5 -- "*.js" "*.jsx" "*.ts" "*.tsx" | grep "^\+.*import.*from"
```

**Good patterns (direct imports):**
```javascript
import { calculatePrice } from '../logic/calculators/pricing/calculatePrice'
import { validateSchedule } from '../../lib/scheduleSelector/validators'
import { isDateInRange } from '../logic/rules/scheduling/isDateInRange'
```

**Bad patterns (still using barrels):**
```javascript
import { calculatePrice } from '../logic'  // Still using barrel!
import { validateSchedule, isDateInRange, calculateNights } from '../../lib/scheduleSelector'  // Still barrel
```

### 3.2 Verify Files Exist at Import Paths

For a sample of the new direct imports, verify the target files exist:

```bash
# Extract import paths and check they exist
# This is a manual spot-check process

# Example: if you see this import:
# import { calculatePrice } from '../logic/calculators/pricing/calculatePrice'
# From file: app/src/islands/pages/SearchPage/useSearchPageLogic.js

# Verify the target exists:
ls -la app/src/logic/calculators/pricing/calculatePrice.js
# or with extension resolution:
ls -la app/src/logic/calculators/pricing/calculatePrice.*
```

### 3.3 Check Import Path Conventions

Verify imports follow project conventions:

```bash
# Check for inconsistent path styles
# All should use the same style (relative vs alias)

# Find any @/ alias imports (if project uses them)
grep -r "from ['\"]@/" app/src --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" | head -10

# Find relative imports
grep -r "from ['\"]\.\." app/src --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" | head -10
```

---

## Phase 4: Verify No New Barrels Introduced

### 4.1 Run Barrel Detector

```bash
uv run adws/detect_barrel_files.py app/src --min-reexports 1
```

**Compare to before:**
- Barrel count should be LOWER
- No NEW high-severity barrels
- Star export count should be lower

### 4.2 Check for Accidentally Created Barrels

Sometimes during refactoring, new barrel patterns are accidentally created:

```bash
# Find any NEW star exports in recently modified files
git diff HEAD~5 | grep "^\+.*export \* from"

# Should return NOTHING - we should only be removing these
```

### 4.3 Verify Barrel Files Were Actually Simplified/Deleted

For barrels that were supposed to be eliminated:

```bash
# Check if barrel still exists and what it contains now
cat app/src/listing-schedule-selector.jsx  # Example barrel

# It should either:
# 1. Be deleted, OR
# 2. Contain only direct exports (no re-exports), OR
# 3. Be a thin facade with explicit named exports (no star)
```

---

## Phase 5: Runtime Verification (Optional but Recommended)

### 5.1 Start Dev Server

```bash
cd app && bun run dev
```

**Check for:**
- Server starts without errors
- No runtime import errors in console
- Pages load correctly

### 5.2 Quick Smoke Test

If you have the visual parity system set up:

```bash
# Run parity check on affected pages
uv run adws/adw_visual_parity.py --pages "/search,/view-listing"
```

---

## Phase 6: Generate Verification Report

Create a summary:

```markdown
## Barrel Removal Verification Report
**Date:** [timestamp]
**Barrels Targeted:** [list from before]
**Barrels Remaining:** [count from detector]

### Build Status
- TypeScript Check: ✅ PASS / ❌ FAIL
- Production Build: ✅ PASS / ❌ FAIL
- Dev Server: ✅ PASS / ❌ FAIL

### Import Verification
- Broken imports found: [count]
- Files still importing from old barrels: [list]
- New barrel patterns introduced: [count]

### Files Verified
| File | Status | Notes |
|------|--------|-------|
| src/logic/index.js | ✅ Removed | Was pure barrel |
| src/listing-schedule-selector.jsx | ⚠️ Simplified | Still has 2 named re-exports |
| src/islands/pages/SearchPage/useSearchPageLogic.js | ✅ Updated | Now imports directly |

### Remaining Work
1. [Any broken imports to fix]
2. [Any barrels still to eliminate]
3. [Any inconsistencies found]

### Verification Commands Run
```
bun run build ✅
npx tsc --noEmit ✅
uv run detect_barrel_files.py app/src ✅
```
```

---

## Quick Verification Checklist

Run these commands in sequence for a quick verification:

```bash
#!/bin/bash
# quick_verify_barrel_removal.sh

echo "=== BARREL REMOVAL VERIFICATION ==="

echo ""
echo "1. Build check..."
cd app && bun run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Build passes"
else
    echo "   ❌ Build FAILED - check for broken imports"
    exit 1
fi

echo ""
echo "2. Checking for star exports..."
star_count=$(grep -r "export \* from" src --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
echo "   Star exports remaining: $star_count"

echo ""
echo "3. Checking for new star exports in recent changes..."
new_stars=$(git diff HEAD~5 | grep "^\+.*export \* from" | wc -l)
if [ $new_stars -eq 0 ]; then
    echo "   ✅ No new star exports introduced"
else
    echo "   ❌ WARNING: $new_stars new star exports found!"
fi

echo ""
echo "4. Barrel detector summary..."
cd .. && uv run adws/detect_barrel_files.py app/src --min-reexports 2 2>/dev/null | grep -E "Barrel files found|High severity|Total star"

echo ""
echo "=== VERIFICATION COMPLETE ==="
```

---

## Common Issues and Fixes

### Issue: "Cannot find module '../logic'"
**Cause:** Import still points to deleted/modified barrel
**Fix:** Update import to point to specific file:
```javascript
// Before
import { foo } from '../logic'
// After
import { foo } from '../logic/path/to/actual/foo'
```

### Issue: Build passes but runtime error
**Cause:** Dynamic imports or webpack aliases not updated
**Fix:** Check for:
- `import()` dynamic imports
- Webpack/Vite alias configuration
- Jest module mappings

### Issue: Circular dependency introduced
**Cause:** Direct imports created a cycle that barrel was hiding
**Fix:** Refactor to break the cycle (may need to move code)

### Issue: Too many imports in one file now
**Cause:** File was importing 10+ things from one barrel, now has 10+ import lines
**Fix:** This is actually correct! But consider:
- Grouping related imports with comments
- Checking if file does too much (might need splitting)
