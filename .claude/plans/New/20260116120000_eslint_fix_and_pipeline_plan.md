# Implementation Plan: ESLint Error Fixes + ADW Pipeline Integration

**Created**: 2026-01-16 12:00:00
**Status**: Awaiting Approval
**Classification**: BUILD + INFRASTRUCTURE

---

## Executive Summary

**Current State**: 194 ESLint errors (178 `no-undef` + 16 `react-hooks/rules-of-hooks`)
**Risk Level**: 🔴 CRITICAL - These cause runtime crashes
**Estimated Effort**: ~2-3 hours for fixes, ~30 min for pipeline integration

---

## Part 1: ESLint Error Analysis

### Error Breakdown

| Rule | Count | Severity | Runtime Impact |
|------|-------|----------|----------------|
| `no-undef` | 178 | Error | 🔴 Page crash - "X is not defined" |
| `react-hooks/rules-of-hooks` | 16 | Error | 🔴 React breaks - unpredictable behavior |
| **Total Errors** | **194** | | |

### Root Cause Analysis

The `no-undef` errors cluster around specific patterns:

| Undefined Variable | Count | Likely Cause |
|-------------------|-------|--------------|
| `formData` | 40 | Form state not passed to child component |
| `handleInputChange` | 22 | Handler not passed as prop |
| `handleInputBlur` | 16 | Handler not passed as prop |
| `getInputClassName` | 16 | Utility not imported/passed |
| `verificationStatus` | 12 | State not passed to child |
| `handleRadioChange` | 8 | Handler not passed as prop |
| `documentStatus` | 6 | State not passed to child |

**Pattern**: These appear to be from component extraction where child components reference variables from parent scope that weren't passed as props.

### Files with Hook Violations

| File | Lines | Issue |
|------|-------|-------|
| `AmenityIcons.jsx` | 845-919 | Multiple useState/useMemo after early return |
| `Toast.jsx` | 198-234 | useState/useCallback after conditional |

---

## Part 2: Fix Strategy

### Phase 1: Fix React Hooks Violations (16 errors) - HIGHEST PRIORITY

These cause the most unpredictable bugs. Fix pattern:

```javascript
// ❌ BEFORE - Hook after early return
function Component({ data }) {
  if (!data) return null;  // Early return

  const [state, setState] = useState(false);  // Hook after return = ERROR
}

// ✅ AFTER - Hook before any returns
function Component({ data }) {
  const [state, setState] = useState(false);  // Hook first

  if (!data) return null;  // Early return after hooks
}
```

**Files to fix**:
1. `app/src/islands/shared/SuggestedProposals/components/AmenityIcons.jsx`
2. `app/src/islands/shared/Toast.jsx`

### Phase 2: Fix no-undef Errors (178 errors)

Two sub-strategies based on error pattern:

#### Strategy A: Props Threading (Most Common)

When child components reference parent variables:

```javascript
// ❌ BEFORE - Child references parent's formData directly
function ParentForm() {
  const [formData, setFormData] = useState({});
  return <ChildInput />;  // formData not passed
}

function ChildInput() {
  return <input value={formData.name} />;  // ERROR: formData not defined
}

// ✅ AFTER - Pass as props
function ParentForm() {
  const [formData, setFormData] = useState({});
  return <ChildInput formData={formData} />;
}

function ChildInput({ formData }) {
  return <input value={formData.name} />;
}
```

#### Strategy B: Missing Imports

When utilities aren't imported:

```javascript
// ❌ BEFORE
function Component() {
  const className = getInputClassName(field);  // Not imported
}

// ✅ AFTER
import { getInputClassName } from '../../utils/formUtils';

function Component() {
  const className = getInputClassName(field);
}
```

### Phase 3: Verification

After fixes, target state:
```bash
$ bun run lint
✨ No errors or warnings
```

---

## Part 3: ADW Pipeline Integration

### Current Validation Flow

```
Chunk Implementation → Build Check → Visual Check
```

### Proposed Validation Flow

```
Chunk Implementation → ESLINT CHECK → Build Check → Visual Check
                            ↓
                    (fail fast on errors)
```

### Implementation Location

**File**: `adws/adw_unified_fp_orchestrator.py`
**Function**: `implement_chunks_with_validation()`
**Insert After**: Claude implementation, **Before**: Build check

### Proposed Code Addition

```python
# After chunk implementation, before build check
# ESLint check - catch undefined variables and hook violations
logger.log(f"    Running ESLint check after chunk {chunk.number}...")
try:
    lint_result = subprocess.run(
        ["bun", "run", "lint:check"],  # Uses --max-warnings 0
        cwd=working_dir / "app",
        capture_output=True,
        text=True,
        timeout=60
    )
    if lint_result.returncode != 0:
        # Extract error count and first few errors
        error_output = lint_result.stdout or lint_result.stderr
        error_lines = [l for l in error_output.split('\n') if 'error' in l.lower()][:5]

        logger.log(f"    [FAIL] ESLint found errors after chunk {chunk.number}:")
        for line in error_lines:
            logger.log(f"      {line[:100]}")
        return False

    logger.log(f"    [OK] ESLint passed")

except subprocess.TimeoutExpired:
    logger.log(f"    [WARN] ESLint timed out, continuing with build check")
except Exception as e:
    logger.log(f"    [WARN] ESLint check failed: {e}, continuing with build check")
```

### Why ESLint Before Build?

| Check Order | Rationale |
|-------------|-----------|
| 1. ESLint (~5s) | Catches undefined vars that cause runtime crashes |
| 2. Build (~15s) | Catches import resolution and syntax errors |
| 3. Visual (~60s) | Catches rendering issues |

ESLint is faster and catches issues that build misses (like `no-undef`).

---

## Part 4: Baseline Strategy for Existing Warnings

### Problem

The codebase has **1,395 warnings**. We can't fix all of them now, but we want to prevent *new* warnings.

### Solution: Warning Baseline

1. **Record current warning count** as baseline
2. **Fail if warning count increases** after changes
3. **Gradually reduce** warnings over time

### Implementation

```python
# In ADW orchestrator - warning baseline check
BASELINE_WARNINGS = 1395  # Current count

# After lint check
warning_match = re.search(r'(\d+) warnings?', lint_output)
if warning_match:
    warning_count = int(warning_match.group(1))
    if warning_count > BASELINE_WARNINGS:
        logger.log(f"    [FAIL] Warning count increased: {warning_count} > {BASELINE_WARNINGS}")
        return False
```

---

## Part 5: Implementation Checklist

### Phase 1: Fix Hooks Violations (Do First)

- [ ] Fix `AmenityIcons.jsx` - move hooks before early returns
- [ ] Fix `Toast.jsx` - move hooks before conditionals
- [ ] Verify: `bun run lint 2>&1 | grep react-hooks` returns 0 results

### Phase 2: Fix no-undef Errors

- [ ] Identify all affected files: `bun run lint 2>&1 | grep no-undef`
- [ ] For each file, determine if fix is:
  - Props threading (pass variable as prop)
  - Missing import (add import statement)
- [ ] Fix all 178 no-undef errors
- [ ] Verify: `bun run lint 2>&1 | grep "error"` returns 0 results

### Phase 3: Add ESLint to ADW Pipeline

- [ ] Add ESLint check to `implement_chunks_with_validation()`
- [ ] Add after Claude implementation, before build check
- [ ] Test with intentional error to verify detection
- [ ] Commit changes

### Phase 4: Add Warning Baseline

- [ ] Record current warning count (1,395)
- [ ] Add baseline check to prevent regression
- [ ] Document baseline in code comment

---

## Files to Modify

| File | Purpose |
|------|---------|
| `app/src/islands/shared/SuggestedProposals/components/AmenityIcons.jsx` | Fix hooks violations |
| `app/src/islands/shared/Toast.jsx` | Fix hooks violations |
| Multiple files with `no-undef` errors | Fix undefined variable references |
| `adws/adw_unified_fp_orchestrator.py` | Add ESLint to validation pipeline |

---

## Expected Outcomes

### After Phase 1-2 (Error Fixes)

```bash
$ bun run lint 2>&1 | grep "error" | wc -l
0

$ bun run lint
✖ 0 errors, 1395 warnings
```

### After Phase 3-4 (Pipeline Integration)

```
ADW Orchestrator Log:
[12:00:00]   → Implementing chunk 1: Extract FilterPanel
[12:00:15]   → Running ESLint check after chunk 1...
[12:00:20]     [OK] ESLint passed
[12:00:20]   → Verifying build after chunk 1...
[12:00:35]     [OK] Build verified
```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| ESLint fixes break functionality | Run visual tests after each fix batch |
| Pipeline ESLint slows ADW | ~5s per chunk is acceptable |
| Warning baseline too strict | Can adjust baseline as warnings are fixed |

---

## Approval Checklist

- [ ] Plan reviewed and understood
- [ ] Phase 1-2 error fix approach approved
- [ ] Phase 3-4 pipeline integration approved
- [ ] Ready to implement

---

**Next Step**: After approval, begin with Phase 1 (hooks violations) as these are most critical.
