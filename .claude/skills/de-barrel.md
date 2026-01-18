# De-Barrel Skill

Remove barrel (index.js) files by updating consumer imports to point directly to source files.

## Trigger

- `/de-barrel` - Run the barrel detector and optionally remove barrels
- `/de-barrel <path>` - Remove a specific barrel file

## What Are Barrel Files?

Barrel files (typically `index.js`) re-export code from other files to enable cleaner imports:

```javascript
// Barrel file: FavoriteButton/index.js
export { default } from './FavoriteButton.jsx';

// Enables this import pattern:
import FavoriteButton from './FavoriteButton';  // Resolves to index.js
```

**Why remove them?** Barrel files create dense dependency graphs that make refactoring harder. Direct imports create sparse graphs that are easier to analyze and modify.

## Process

### Step 1: Detect Barrels

Run the barrel detector to see current state:

```bash
python refactor/barrel_detector.py
```

This categorizes all index files:
- **PURE_BARREL**: Only re-exports (safe to remove)
- **MIXED**: Has re-exports AND logic (needs manual review - may be false positive from multi-line exports)
- **ENTRY_POINT**: Actual component/code (keep)

### Step 2: Analyze Target Barrel

For the target barrel file, determine:

1. **What it exports** - Read the file and map each export to its source
2. **Who imports from it** - Find all consumers

```bash
# Example: Analyze FavoriteButton barrel
cat app/src/islands/shared/FavoriteButton/index.js

# Find consumers
grep -r "from.*FavoriteButton['\"]" app/src --include="*.js" --include="*.jsx" | grep -v index.js
```

### Step 3: Create Export Map

Document the mapping from barrel exports to source files:

```
Export Map: app/src/islands/shared/FavoriteButton/index.js
--------------------------------------------------------------
default     -> ./FavoriteButton.jsx
```

For barrels with multiple exports:
```
Export Map: app/src/islands/pages/SearchPage/components/index.js
--------------------------------------------------------------
SearchFilters    -> ./SearchFilters.jsx
SearchResults    -> ./SearchResults.jsx
MapView          -> ./MapView.jsx
```

### Step 4: Update Consumer Imports

Transform each consumer's import from barrel to direct:

**Single default export:**
```javascript
// BEFORE
import FavoriteButton from '@/islands/shared/FavoriteButton';

// AFTER
import FavoriteButton from '@/islands/shared/FavoriteButton/FavoriteButton.jsx';
```

**Multiple named exports:**
```javascript
// BEFORE
import { SearchFilters, SearchResults, MapView } from './components';

// AFTER
import { SearchFilters } from './components/SearchFilters.jsx';
import { SearchResults } from './components/SearchResults.jsx';
import { MapView } from './components/MapView.jsx';
```

**Re-exported default as named:**
```javascript
// BEFORE (barrel has: export { default as Button } from './Button.jsx')
import { Button } from './components';

// AFTER
import Button from './components/Button.jsx';
```

### Step 5: Delete the Barrel

```bash
rm <barrel-file-path>
```

### Step 6: Verify

1. **Dev server starts**: `bun run dev`
2. **Build succeeds**: `bun run build`
3. **Barrel count decreased**: `python refactor/barrel_detector.py`

### Step 7: Commit

```bash
git add -A
git commit -m "refactor(cleanup): remove <ComponentName> barrel file

- Updated imports to point directly to source files
- Barrel count: X -> Y"
```

## Constraints

- **NEVER modify source component files** - Only update imports in consumer files
- **STOP if barrel contains actual logic** - Flag for manual extraction first
- **PRESERVE TypeScript type imports** - Handle them separately if needed
- **FLAG namespace imports** - `import * as X from './barrel'` requires manual refactor of usage sites

## Output Format

After completing the de-barrel, report:

```
DE-BARREL COMPLETE
==================
Target:     <barrel_file_path>
Status:     SUCCESS | FAILED | NEEDS_REVIEW
Exports:    <count>
Consumers:  <count> files updated

Changes:
  - <consumer_file_1>: updated <n> imports
  - <consumer_file_2>: updated <n> imports

Verification:
  - Dev server: PASS/FAIL
  - Build:      PASS/FAIL

Barrel Count: X -> Y
```

## Error Handling

**If barrel contains logic:**
```
WARNING: BARREL CONTAINS LOGIC - MANUAL REVIEW REQUIRED
File: <path>
Reason: <description>
Action: Verify if this is a false positive (multi-line exports) or extract logic first
```

**If namespace import found:**
```
WARNING: NAMESPACE IMPORT DETECTED - MANUAL REVIEW REQUIRED
Consumer: <consumer_path>
Pattern: import * as <name> from '<barrel>'
Action: Refactor usage sites to use direct imports before removing barrel
```

## Quick Reference Commands

```bash
# See all barrels
python refactor/barrel_detector.py

# List only pure barrels (paths only)
python refactor/barrel_detector.py --pure-only

# JSON report
python refactor/barrel_detector.py --json

# Save baseline
python refactor/barrel_detector.py --json -o refactor/reports/baseline.json

# Find consumers of a barrel
grep -r "from.*<BarrelDir>['\"]" app/src --include="*.js" --include="*.jsx"
```

## Batch Processing

To remove multiple barrels in sequence:

1. Get list of pure barrels: `python refactor/barrel_detector.py --pure-only`
2. Start with LOW RISK targets (few exports, few consumers)
3. Remove one at a time, verify after each
4. Commit after each successful removal

## Files

| File | Purpose |
|------|---------|
| `refactor/barrel_detector.py` | Detection script |
| `refactor/reports/` | Baseline and progress reports |
| `.claude/plans/New/20260117-debarrel-implementation-plan.md` | Full implementation plan |
