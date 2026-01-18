# Barrel Fix Commit Auditor

## Purpose
This document contains instructions for Claude Code to audit recent commits and verify they actually addressed barrel files (not unrelated changes).

## Usage
Run this as a prompt to Claude Code after completing a barrel elimination session:

```
Read the instructions in adws/audit_barrel_commits.md and execute the audit
```

---

## CLAUDE CODE INSTRUCTIONS

### Task Overview
Audit the last N commits to verify they are legitimate barrel file fixes. Flag any commits that:
1. Don't actually modify barrel files or their consumers
2. Include unrelated changes (scope creep)
3. Introduce new barrel patterns
4. Break the codebase

### Step 1: Gather Recent Commits

```bash
# Get last 10 commits with files changed
git log --oneline -10 --name-status

# For more detail on a specific commit range:
git log --oneline --since="2 hours ago" --name-status
```

**Expected commit message patterns for barrel fixes:**
- `refactor: eliminate barrel export in <file>`
- `refactor: convert star export to named exports in <file>`
- `refactor: update imports to bypass <barrel-file>`
- `chore: remove unused barrel file <file>`

### Step 2: For Each Commit, Verify the Changes

For each commit hash, run:

```bash
# Show what changed
git show <commit-hash> --stat

# Show the actual diff
git show <commit-hash> -- "*.js" "*.jsx" "*.ts" "*.tsx"
```

**Verification checklist for each commit:**

#### 2a. Was a barrel file actually modified?
Look for these patterns being REMOVED:
```javascript
// Star re-exports (HIGH priority to remove)
export * from './module'

// Named re-exports (lower priority)
export { foo, bar } from './module'
```

#### 2b. Were consumers updated correctly?
Look for import changes like:
```javascript
// BEFORE (importing from barrel)
import { calculatePrice } from '../logic'
import { validateSchedule } from '../../lib/scheduleSelector'

// AFTER (direct imports)
import { calculatePrice } from '../logic/calculators/pricing/calculatePrice'
import { validateSchedule } from '../../lib/scheduleSelector/validators'
```

#### 2c. Check for scope creep
The diff should ONLY contain:
- Removal of `export *` or `export { } from` statements
- Changes to `import` statements (path changes)
- Possible deletion of pure barrel files

**RED FLAGS (scope creep):**
- Logic changes inside functions
- New features added
- Unrelated file modifications
- Changes to non-JS/TS files (except maybe package.json)

### Step 3: Run Barrel Detection on Current State

```bash
# Run the barrel detector to see what's left
uv run adws/detect_barrel_files.py app/src --min-reexports 1
```

Compare the output to a previous run (if available) to verify barrels were actually eliminated.

### Step 4: Verify Build Still Works

```bash
cd app && bun run build
```

If build fails, the barrel elimination introduced errors.

### Step 5: Generate Audit Report

Create a summary in this format:

```markdown
## Barrel Commit Audit Report
**Audit Date:** [timestamp]
**Commits Reviewed:** [N]
**Commit Range:** [oldest-hash]..[newest-hash]

### Summary
| Metric | Count |
|--------|-------|
| Legitimate barrel fixes | X |
| Scope creep detected | Y |
| New barrels introduced | Z |
| Build status | PASS/FAIL |

### Commit Details

#### ✅ [commit-hash] - [message]
- Files modified: [list]
- Barrel patterns removed: [count]
- Consumers updated: [count]
- Verdict: LEGITIMATE

#### ⚠️ [commit-hash] - [message]
- Files modified: [list]
- Issue: [description of scope creep]
- Verdict: NEEDS REVIEW

#### ❌ [commit-hash] - [message]
- Files modified: [list]
- Issue: Introduced new barrel pattern in [file]
- Verdict: REVERT RECOMMENDED

### Remaining Barrels
[Output from barrel detector]

### Recommendations
1. [Next barrel to fix]
2. [Any commits to revert]
3. [Process improvements]
```

---

## Quick Verification Commands

```bash
# One-liner to check if last commit touched barrel-related code
git diff HEAD~1 --name-only | xargs grep -l "export \* from\|export {.*} from" 2>/dev/null

# Check if any new star exports were introduced
git diff HEAD~1 | grep "^\+" | grep "export \* from"

# Count barrel patterns before/after
git show HEAD~1:app/src/**/*.js 2>/dev/null | grep -c "export \* from" || echo "0"
git show HEAD:app/src/**/*.js 2>/dev/null | grep -c "export \* from" || echo "0"
```

---

## Automated Audit Script

You can also run this as a more automated check:

```bash
#!/bin/bash
# audit_barrel_commits.sh

COMMITS=${1:-5}  # Default to last 5 commits

echo "=== BARREL COMMIT AUDIT ==="
echo "Reviewing last $COMMITS commits..."
echo ""

for hash in $(git log --oneline -$COMMITS --format="%H"); do
    msg=$(git log -1 --format="%s" $hash)
    echo "--- $hash ---"
    echo "Message: $msg"

    # Check if commit touches JS/TS files
    js_files=$(git show $hash --name-only --format="" | grep -E "\.(js|jsx|ts|tsx)$" | wc -l)
    echo "JS/TS files changed: $js_files"

    # Check for barrel pattern removals
    removals=$(git show $hash | grep "^-.*export \* from\|^-.*export {.*} from" | wc -l)
    echo "Barrel patterns removed: $removals"

    # Check for barrel pattern additions (BAD)
    additions=$(git show $hash | grep "^\+.*export \* from" | wc -l)
    if [ $additions -gt 0 ]; then
        echo "⚠️  WARNING: New star exports added: $additions"
    fi

    # Verdict
    if [ $removals -gt 0 ] && [ $additions -eq 0 ]; then
        echo "✅ LEGITIMATE barrel fix"
    elif [ $removals -eq 0 ] && [ $additions -eq 0 ]; then
        echo "⚪ No barrel changes (may be consumer update)"
    else
        echo "❌ NEEDS REVIEW"
    fi
    echo ""
done

echo "=== CURRENT BARREL STATUS ==="
# If detector exists, run it
if [ -f "adws/detect_barrel_files.py" ]; then
    uv run adws/detect_barrel_files.py app/src --min-reexports 2 2>/dev/null | head -30
else
    echo "Run: uv run detect_barrel_files.py app/src"
fi
```

---

## Expected Workflow

1. **Before starting barrel elimination:**
   ```bash
   uv run detect_barrel_files.py app/src --json > barrels_before.json
   ```

2. **After each batch of fixes:**
   ```bash
   # Verify commits
   # [Read this file and execute audit]

   # Check remaining barrels
   uv run detect_barrel_files.py app/src --json > barrels_after.json

   # Diff the results
   diff barrels_before.json barrels_after.json
   ```

3. **Track progress:**
   - Barrel count should decrease
   - No new star exports should appear
   - Build should always pass
