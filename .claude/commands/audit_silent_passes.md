# Audit Silent Passes

Scans the codebase for **silent pass anti-patterns** - where incomplete code, TODOs, or skipped checks allow processes to continue as if they succeeded.

## Overview

This audit identifies dangerous patterns where:
1. A TODO/placeholder exists but the code path continues successfully
2. A check is skipped but marked as "passed"
3. An error is caught but not propagated
4. A validation is stubbed to always return true

These patterns violate the **fail-safe principle**: if you can't verify something, you must treat it as a failure.

## Execution

### Step 1: Prime Target Directories

Run `/prime` on the target directories to understand the codebase structure:

```
/prime app
/prime supabase
```

If an $ARGUMENT is provided, prime that directory instead:
```
/prime $ARGUMENT
```

### Step 2: Scan for Silent Pass Patterns

Search for these anti-pattern categories:

#### Category A: TODO with Bypass
Patterns where TODO exists but execution continues as success:

```bash
# Search for TODO followed by assignment to true/success/pass
grep -rn "TODO\|FIXME" app/ supabase/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.py" -A5 | grep -E "(= true|= True|passed|success|PASS)"
```

#### Category B: Unconditional Success
Patterns that always succeed regardless of actual state:

```bash
# Functions that always return true/success
grep -rn "return true\|return True\|\.passed = true\|\.success = true" app/ supabase/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.py" -B10 | grep -E "(TODO|SKIP|stub|mock|placeholder|not.*implement)"
```

#### Category C: Swallowed Errors
Patterns that catch errors but don't fail:

```bash
# Empty catch blocks or catch with just logging
grep -rn "catch.*{" app/ supabase/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" -A3 | grep -E "(console\.(log|warn)|// ignore|pass$|return null|return undefined)"
```

#### Category D: Conditional Skip as Pass
Patterns that skip checks but mark as successful:

```bash
# SKIP patterns that set passed/success
grep -rn "\[SKIP\]\|\[skip\]" app/ supabase/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.py" -B5 -A5 | grep -E "(passed|success|= true|= True)"
```

#### Category E: Stub Functions
Functions that exist but don't do anything:

```bash
# Functions with only pass/return/noop
grep -rn "def.*:\s*$\|function.*{\s*$" app/ supabase/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.py" -A2 | grep -E "^\s*(pass|return;?|// noop|\})\s*$"
```

#### Category F: Dead Code Imports
Imports that exist but are never used (potential incomplete features):

```bash
# Python: imported but unused
grep -rn "^from .* import\|^import " supabase/ --include="*.py" | cut -d: -f1 | sort -u | while read f; do
  for imp in $(grep "^from .* import\|^import " "$f" | sed 's/.*import //;s/,/ /g;s/ as .*//g'); do
    if ! grep -q "$imp" "$f" 2>/dev/null | grep -v "^import\|^from"; then
      echo "UNUSED: $f imports $imp"
    fi
  done
done
```

### Step 3: Classify Findings

For each finding, classify into:

| Severity | Description | Example |
|----------|-------------|---------|
| 🔴 CRITICAL | Silent pass in validation/verification code | `result.visual_passed = True  # TODO` |
| 🟠 HIGH | Swallowed error in business logic | `catch(e) { console.log(e) }` in payment flow |
| 🟡 MEDIUM | Stub function in non-critical path | Empty analytics handler |
| 🟢 LOW | Dead import / unused code | Imported but never called |

### Step 4: Generate Report

Output a structured report:

```markdown
# Silent Pass Audit Report

**Date**: YYYY-MM-DD HH:MM
**Directories Scanned**: app/, supabase/
**Total Files Scanned**: N

## Summary

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | N |
| 🟠 HIGH | N |
| 🟡 MEDIUM | N |
| 🟢 LOW | N |

## Critical Findings

### Finding 1: [Title]
**File**: `path/to/file.js:123`
**Pattern**: TODO with Bypass
**Code**:
```
[code snippet]
```
**Impact**: [Description of what fails silently]
**Fix**: [Recommended action]

---

[Repeat for each finding]

## Recommendations

1. [Priority action items]
2. ...

## Files Requiring Manual Review

- `path/to/complex/file.js` - Multiple patterns detected
- ...
```

### Step 5: Save Report

Save the report to `.claude/plans/Documents/` with timestamp:

```
.claude/plans/Documents/YYYYMMDDHHMMSS_silent_pass_audit.md
```

## Pattern Reference

### Known Dangerous Patterns

```javascript
// DANGEROUS: TODO that passes
if (shouldValidate) {
  // TODO: implement validation
  isValid = true;  // 🔴 SILENT PASS
}

// DANGEROUS: Skipped check marked as success
if (!featureEnabled) {
  result.passed = true;  // 🔴 Should be false or throw
  return result;
}

// DANGEROUS: Swallowed error
try {
  await criticalOperation();
} catch (e) {
  console.log(e);  // 🟠 Error not propagated
}

// DANGEROUS: Always-true validation
function validateInput(input) {
  // TODO: add validation rules
  return true;  // 🔴 SILENT PASS
}
```

### Safe Patterns

```javascript
// SAFE: Explicit skip with flag
if (skipValidation) {
  logger.warn("Validation skipped by flag");
  // Does NOT mark as passed - caller decides
}

// SAFE: Error re-thrown or returned
try {
  await operation();
} catch (e) {
  logger.error(e);
  throw e;  // ✅ Propagated
}

// SAFE: TODO that fails
if (shouldValidate) {
  // TODO: implement validation
  throw new Error("Validation not implemented");  // ✅ Fails explicitly
}
```

## Arguments

| Argument | Description |
|----------|-------------|
| (none) | Scan `app/` and `supabase/` directories |
| `$ARGUMENT` | Scan the specified directory only |
| `--critical-only` | Only report CRITICAL severity findings |
| `--save` | Save report to .claude/plans/Documents/ |

## Exit Behavior

After generating the report:
1. Display summary table in terminal
2. If `--save` flag present, save full report to file
3. List action items for critical findings

## Related Commands

- `/prime` - Understand codebase structure
- `/health_check` - Run system health checks
- `/review` - Code review for specific changes
