# Functional Programming ADW Workflows

Two-phase workflow for auditing and refactoring code to follow functional programming principles.

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1: adw_fp_audit_iso.py                               │
│  ├─ Run FP audit script on target path                      │
│  ├─ Create isolated worktree with unique ports              │
│  ├─ Invoke /functional-code skill in Claude Code            │
│  └─ Generate prioritized refactoring plan                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 2: adw_fp_implement_iso.py                           │
│  ├─ Load refactoring plan from Phase 1                      │
│  ├─ Invoke /functional-code skill in Claude Code            │
│  ├─ Implement fixes priority-by-priority                    │
│  └─ Commit changes with detailed changelog                  │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Phase 1: Audit & Plan

```bash
# Audit logic layer (high-severity violations only)
uv run adw_fp_audit_iso.py app/src/logic --severity high

# Audit specific directory (all violations)
uv run adw_fp_audit_iso.py app/src/logic/workflows --severity all

# Resume existing audit (use same ADW ID)
uv run adw_fp_audit_iso.py app/src/logic abc12345
```

**Output:**
- Isolated worktree at `trees/<adw_id>/`
- Violations JSON: `agents/fp_audit_violations.json`
- Refactoring plan: `.claude/plans/New/<adw_id>_fp_refactor_plan.md`
- ADWState saved: `agents/<adw_id>/adw_state.json`

### Phase 2: Implement Fixes

```bash
# Implement Priority 1 fixes only (high-impact files)
uv run adw_fp_implement_iso.py abc12345 --priority 1

# Implement Priority 2 fixes
uv run adw_fp_implement_iso.py abc12345 --priority 2

# Implement all remaining fixes
uv run adw_fp_implement_iso.py abc12345 --priority all
```

**Output:**
- Modified source files with FP fixes applied
- Updated plan with checkboxes marked
- Implementation summary: `agents/<adw_id>/fp_implementation_summary.md`
- Git commit with detailed changelog

## What Gets Fixed

| Violation Type | Detected Pattern | Fix Applied |
|----------------|------------------|-------------|
| **Mutation** | `arr.push(item)` | `[...arr, item]` |
| **Mutation** | `arr.sort()` | `arr.toSorted()` or `[...arr].sort()` |
| **Mutation** | `arr[i] = val` | `arr.map((v, idx) => idx === i ? val : v)` |
| **I/O in Core** | `console.log` in calculators/rules/processors | Remove or return error data |
| **Imperative Loop** | `for` loop building array | `map/filter/reduce` |
| **Exception Flow** | `throw` for validation | Return `Result` type |

## Example Workflow

### 1. Run Audit

```bash
$ uv run adw_fp_audit_iso.py app/src/logic --severity high

=============================================================
ADW FP AUDIT (ISOLATED)
=============================================================
Generated ADW ID: fp9k2m4x

✅ Isolated worktree created:
   Path: trees/fp9k2m4x/
   Backend port: 9103
   Frontend port: 9203

=============================================================
PHASE: FP AUDIT
=============================================================
Target: app/src/logic
Severity filter: high

✅ Found 17 violations

=============================================================
PHASE: PLAN CREATION
=============================================================

🤖 Starting Claude Code session...
Agent output: agents/fp9k2m4x/fp_planner/raw_output.jsonl

✅ Plan created: .claude/plans/New/fp9k2m4x_fp_refactor_plan.md

=============================================================
✅ FP AUDIT COMPLETE
=============================================================
ADW ID: fp9k2m4x
Plan: .claude/plans/New/fp9k2m4x_fp_refactor_plan.md
Violations: 17
Worktree: trees/fp9k2m4x/

Next step:
  uv run adw_fp_implement_iso.py fp9k2m4x
```

### 2. Review Plan

```bash
$ cat .claude/plans/New/fp9k2m4x_fp_refactor_plan.md

# Functional Programming Refactoring Plan

ADW ID: fp9k2m4x
Date: 2026-01-10
Total Violations: 17

## Priority 1: High-Impact Files (Fix First)

### File: workflows/proposals/counterofferWorkflow.js (5 violations)

**Violations:**
1. Line 156: [MUTATING_METHOD] - Using .push() to build changes array
   - Current: `changes.push({ field: 'price', ... })`
   - Fix: `changes = [...changes, { field: 'price', ... }]`
   - Rationale: Mutation makes testing harder and violates immutability

2. Line 165: [MUTATING_METHOD] - Using .push() to build changes array
   ...

**Refactoring Steps:**
1. [ ] Replace all .push() calls with spread operator
2. [ ] Test counteroffer workflow with unit tests
3. [ ] Verify no regressions in proposal flow

...
```

### 3. Implement Fixes (Priority 1)

```bash
$ uv run adw_fp_implement_iso.py fp9k2m4x --priority 1

=============================================================
ADW FP IMPLEMENT (ISOLATED)
=============================================================
ADW ID: fp9k2m4x

=============================================================
PHASE: VALIDATION
=============================================================
✅ ADW ID: fp9k2m4x
✅ Worktree: trees/fp9k2m4x/
✅ Plan: .claude/plans/New/fp9k2m4x_fp_refactor_plan.md

=============================================================
PHASE: IMPLEMENTATION
=============================================================
Priority: 1

🤖 Starting Claude Code session...
Agent output: agents/fp9k2m4x/fp_implementor/raw_output.jsonl

✅ Implementation complete

Summary:
## Files Modified
- workflows/proposals/counterofferWorkflow.js
- calculators/scheduling/calculateCheckInOutDays.js

## Violations Fixed: 7

- 5 mutation violations (replaced .push with spread)
- 2 mutation violations (replaced .sort with toSorted)

=============================================================
✅ FP IMPLEMENTATION COMPLETE
=============================================================
ADW ID: fp9k2m4x
Priority: 1
Violations fixed: 7
Files modified: 2
Worktree: trees/fp9k2m4x/

Next step (optional):
  uv run adw_fp_implement_iso.py fp9k2m4x --priority 2
```

## Priority Levels

| Priority | Files | Criteria | When to Fix |
|----------|-------|----------|-------------|
| **1 - High Impact** | Most violations + Core logic | Affects testability, used frequently | **Fix first** |
| **2 - Medium Impact** | Moderate violations | Improves code quality | After Priority 1 |
| **3 - Low Impact** | Few violations | Nice to have | When time permits |

## Integration with Claude Code Skills

Both workflows leverage the `/functional-code` skill:

### Phase 1 (Audit)
- Loads skill for FP principle guidance
- Uses skill patterns to prioritize violations
- References skill docs in generated plan

### Phase 2 (Implement)
- Loads skill for implementation guidance
- Follows skill's refactoring patterns
- Validates fixes against skill principles

## Command-Line Options

### adw_fp_audit_iso.py

```
Usage: uv run adw_fp_audit_iso.py [target_path] [--severity LEVEL] [adw-id]

Arguments:
  target_path       Path to audit (default: app/src/logic)
  adw-id           Resume existing ADW (optional)

Options:
  --severity       Filter by severity: high, medium, all (default: high)
```

### adw_fp_implement_iso.py

```
Usage: uv run adw_fp_implement_iso.py <adw-id> [--priority LEVEL]

Arguments:
  adw-id           ADW ID from audit phase (required)

Options:
  --priority       Which level to implement: 1, 2, 3, all (default: 1)
```

## State Management

Both workflows use persistent state (`agents/<adw_id>/adw_state.json`):

```json
{
  "adw_id": "fp9k2m4x",
  "worktree_path": "trees/fp9k2m4x",
  "backend_port": 9103,
  "frontend_port": 9203,
  "plan_file": ".claude/plans/New/fp9k2m4x_fp_refactor_plan.md"
}
```

This enables:
- Resuming workflows after interruption
- Running phases independently
- Tracking progress across multiple sessions

## Worktree Isolation

Each FP workflow runs in its own isolated worktree:

```
trees/
└── fp9k2m4x/                    # Isolated worktree
    ├── app/src/logic/           # Modified source files
    ├── .claude/plans/New/       # Generated plan
    ├── agents/fp9k2m4x/         # Agent outputs
    │   ├── fp_planner/
    │   │   └── raw_output.jsonl
    │   ├── fp_implementor/
    │   │   └── raw_output.jsonl
    │   └── fp_implementation_summary.md
    └── agents/fp_audit_violations.json
```

Benefits:
- No interference with main codebase
- Safe experimentation
- Easy rollback (delete worktree)
- Parallel execution possible

## Best Practices

### 1. Start with High Severity
```bash
# Focus on critical violations first
uv run adw_fp_audit_iso.py app/src/logic --severity high
```

### 2. Implement Incrementally
```bash
# Fix high-impact files first
uv run adw_fp_implement_iso.py abc12345 --priority 1

# Review changes before proceeding
git diff

# Then continue with medium-impact
uv run adw_fp_implement_iso.py abc12345 --priority 2
```

### 3. Test After Each Priority
```bash
# Run tests after Priority 1 fixes
cd trees/abc12345/
npm run test

# If tests pass, proceed to Priority 2
```

### 4. Review Generated Plans
```bash
# Always review the plan before implementing
cat .claude/plans/New/abc12345_fp_refactor_plan.md

# Adjust priorities if needed (manually edit plan)
```

## Troubleshooting

### "No state found for ADW"
- You need to run `adw_fp_audit_iso.py` first
- Or provide correct ADW ID from previous run

### "Worktree not found"
- Worktree may have been deleted
- Run audit phase again to recreate

### "Plan file not created"
- Check Claude Code session output
- May indicate prompt interpretation issue
- Review agent logs in `agents/<adw_id>/fp_planner/raw_output.jsonl`

### "No violations fixed"
- Plan may not have clear instructions
- Claude Code may not have found files
- Check implementation summary for details

## Cleanup

```bash
# Remove worktree after merging changes
git worktree remove trees/abc12345

# Remove state files
rm -rf agents/abc12345

# Move completed plan to Done
mv .claude/plans/New/abc12345_fp_refactor_plan.md .claude/plans/Done/
```

## Related Documentation

- [FP Audit Script](../.claude/skills/functional-code/scripts/fp_audit.py)
- [Functional-Code Skill](../.claude/skills/functional-code/SKILL.md)
- [ADW Architecture](./README.md)
- [FP Principles Bible](../.claude/Documentation/Architecture/The Functional Programming Bible A Practical Reference for Writing Pure, Functional Code.md)
