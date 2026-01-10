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
uv run adw_fp_audit.py app/src/logic --severity high

# Audit specific directory (all violations)
uv run adw_fp_audit.py app/src/logic/workflows --severity all

# Audit with medium severity threshold
uv run adw_fp_audit.py app/src/logic --severity medium
```

**Output:**
- Violations JSON: `agents/fp_audit_violations.json`
- Refactoring plan: `.claude/plans/New/<timestamp>_fp_refactor_plan.md`
- Agent logs: `agents/fp_planner/raw_output.jsonl`

### Phase 2: Implement Fixes

```bash
# Implement all fixes from the latest plan
uv run adw_fp_implement.py
```

**Output:**
- Modified source files with FP fixes applied
- Updated plan with checkboxes marked
- Implementation summary: `agents/fp_implementation_summary.md`
- Agent logs: `agents/fp_implementor/raw_output.jsonl`

**Piecemeal Approach:**
Each chunk is a **discrete, self-contained fix** that can be:
- Implemented in 5-10 minutes
- Tested independently
- Committed separately
- Fixed in any order (chunks are independent)

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
$ uv run adw_fp_audit.py app/src/logic --severity high

=============================================================
ADW FP AUDIT
=============================================================

=============================================================
PHASE: FP AUDIT & PLAN CREATION
=============================================================

🤖 Starting Claude Code agent...
Agent output: agents/fp_planner/raw_output.jsonl

Agent will:
  1. Run FP audit script on: app/src/logic
  2. Analyze violations (severity: high)
  3. Create chunk-based plan at: .claude/plans/New/20260110120000_fp_refactor_plan.md

✅ Claude Code completed successfully

✅ Plan created: .claude/plans/New/20260110120000_fp_refactor_plan.md

=============================================================
✅ FP AUDIT COMPLETE
=============================================================
Plan: .claude/plans/New/20260110120000_fp_refactor_plan.md

Next step:
  uv run adw_fp_implement.py
```

### 2. Review Plan (Chunk-Based Format)

```bash
$ cat .claude/plans/New/20260110120000_fp_refactor_plan.md

# Functional Programming Refactoring Plan

Date: 2026-01-10
Target: agents/fp_audit_violations.json
Severity Filter: high

---

## 🔴 CHUNK 1: Replace .push() in counterofferWorkflow.js:156

**File:** workflows/proposals/counterofferWorkflow.js
**Line:** 156
**Violation:** MUTATING_METHOD - Using .push() to mutate array
**Severity:** 🔴 High

**Current Code:**
```javascript
const changes = []
if (priceChanged) {
  changes.push({ field: 'price', old: originalPrice, new: newPrice })
}
```

**Refactored Code:**
```javascript
const changes = [
  priceChanged && { field: 'price', old: originalPrice, new: newPrice }
].filter(Boolean)
```

**Why This Matters:**
Mutation makes testing harder. Declarative array construction is more predictable.

**Testing:**
- [ ] Run unit tests for counteroffer workflow
- [ ] Verify proposal changes are tracked correctly
- [ ] Check that price changes still trigger properly

---

## 🔴 CHUNK 2: Replace .push() in counterofferWorkflow.js:165

**File:** workflows/proposals/counterofferWorkflow.js
**Line:** 165
**Violation:** MUTATING_METHOD
**Severity:** 🔴 High

[Full chunk details...]

---

[17 total chunks, each separated by `---`]
```

**Key Features:**
- ✅ Each chunk is numbered sequentially (CHUNK 1, CHUNK 2, etc.)
- ✅ Horizontal rules (`---`) clearly separate chunks
- ✅ Complete before/after code (no truncation)
- ✅ Testing checklist per chunk
- ✅ Can be implemented in any order

### 3. Implement Fixes

```bash
$ uv run adw_fp_implement.py

=============================================================
ADW FP IMPLEMENT
=============================================================

=============================================================
PHASE: FIND PLAN
=============================================================
✅ Found plan: 20260110120000_fp_refactor_plan.md
   Modified: 2026-01-10 12:00:00

=============================================================
PHASE: IMPLEMENTATION
=============================================================

🤖 Starting Claude Code session...
Agent output: agents/fp_implementor/raw_output.jsonl

✅ Implementation complete

Summary:
## Implementation Complete

**Violations Fixed:** 17
**Files Modified:** 8

**Changes by Type:**
- MUTATING_METHOD: 12 fixes
- IO_IN_CORE: 3 fixes
- IMPERATIVE_LOOP: 2 fixes

**Modified Files:**
- workflows/proposals/counterofferWorkflow.js
- workflows/proposals/approvalWorkflow.js
- calculators/pricing/calculateTotal.js
- [... 5 more files]

=============================================================
✅ FP IMPLEMENTATION COMPLETE
=============================================================
Plan: .claude/plans/New/20260110120000_fp_refactor_plan.md
Violations fixed: 17
Files modified: 8
```

## Chunk-Based Refactoring

### What is a Chunk?

A **chunk** is a single, atomic FP violation fix:
- Takes 5-10 minutes to implement
- Affects specific lines in one file
- Can be tested independently
- Can be committed separately
- Is independent of other chunks

### Chunk Format

Each chunk contains:
- **Header**: File, line, violation type, severity
- **Current Code**: Exact code being replaced
- **Refactored Code**: Exact replacement code
- **Why This Matters**: FP principle explanation
- **Testing**: Checklist for verification

### Working with Chunks

The implementation ADW processes all chunks in the plan at once. Each chunk is still:
- Independent and self-contained
- Testable separately (via testing checklist)
- Documented with before/after code
- Explained with FP principle rationale

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

### adw_fp_audit.py

```
Usage: uv run adw_fp_audit.py [target_path] [--severity LEVEL]

Arguments:
  target_path       Path to audit (default: app/src/logic)

Options:
  --severity       Filter by severity: high, medium, all (default: high)
```

### adw_fp_implement.py

```
Usage: uv run adw_fp_implement.py

No arguments required - automatically finds latest plan in .claude/plans/New/
```

## Output Files

The workflows generate these files in the current working directory:

```
project-root/
├── .claude/plans/New/
│   └── <timestamp>_fp_refactor_plan.md    # Generated plan
├── agents/
│   ├── fp_audit_violations.json           # Raw violations from audit
│   ├── fp_planner/
│   │   └── raw_output.jsonl               # Audit agent logs
│   ├── fp_implementor/
│   │   └── raw_output.jsonl               # Implementation agent logs
│   └── fp_implementation_summary.md       # Summary of fixes applied
```

Benefits:
- All work happens in your current branch
- No worktree complexity
- Simple file-based state tracking
- Easy to review and commit incrementally

## Best Practices

### 1. Start with High Severity
```bash
# Focus on critical violations first
uv run adw_fp_audit.py app/src/logic --severity high
```

### 2. Review the Generated Plan
```bash
# Always review the plan before implementing
cat .claude/plans/New/<timestamp>_fp_refactor_plan.md

# Check the violations file for raw data
cat agents/fp_audit_violations.json
```

### 3. Implement All Fixes
```bash
# Run implementation (processes all chunks in the plan)
uv run adw_fp_implement.py
```

### 4. Test After Implementation
```bash
# Run tests to verify fixes
npm run test

# Check the summary for what was changed
cat agents/fp_implementation_summary.md
```

## Troubleshooting

### "Plan file not created"
- Check Claude Code session output in agent logs
- Agent may have failed to run the audit script
- Review agent logs: `agents/fp_planner/raw_output.jsonl`
- Verify audit script exists: `.claude/skills/functional-code/scripts/fp_audit.py`

### "No violations found"
- Target path may not contain FP violations
- Try different severity filter (--severity all)
- Check that target path exists and has JavaScript/TypeScript files

### "Implementation failed"
- Check agent logs: `agents/fp_implementor/raw_output.jsonl`
- Plan may have incorrect file paths or line numbers
- Agent may not have found the files to modify

### "No FP refactoring plans found"
- Run `adw_fp_audit.py` first to generate a plan
- Check `.claude/plans/New/` directory for plan files

## Cleanup

```bash
# Move completed plan to Done
mv .claude/plans/New/<timestamp>_fp_refactor_plan.md .claude/plans/Done/

# Remove agent outputs (optional)
rm -rf agents/fp_planner agents/fp_implementor

# Keep violations file and summary for reference
```

## Related Documentation

- [FP Audit Script](../.claude/skills/functional-code/scripts/fp_audit.py)
- [Functional-Code Skill](../.claude/skills/functional-code/SKILL.md)
- [ADW Architecture](./README.md)
- [FP Principles Bible](../.claude/Documentation/Architecture/The Functional Programming Bible A Practical Reference for Writing Pure, Functional Code.md)
