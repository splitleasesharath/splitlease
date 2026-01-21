# ADW Refactoring Strategy Analysis

**Date:** 2026-01-16
**Context:** Analysis of why `adw_unified_fp_orchestrator.py` failed to make progress on code refactoring

---

## Executive Summary

The current run achieved **0 net code changes** despite identifying 25 valid refactoring opportunities. This is because the pre-validation system (LSP validator) correctly catches missing imports but the **plan structure doesn't account for the order of file creation**.

---

## Failure Categories

### Category 1: New File Dependencies (Chunks 1, 4, 8)

**The Problem:** These chunks propose creating a "hollow component" pattern by splitting a large file into 2-3 smaller files. The refactored code imports from files that *should be created* but don't exist yet.

| Chunk | Files Needed | Status |
|-------|--------------|--------|
| 1 | `useSearchPageLogic.js`, `SearchPageUI.jsx` | Not created - pre-validation fails |
| 4 | `useViewSplitLeasePageLogic.js` | Not created - pre-validation fails |
| 8 | `lib/services/amenitiesService.js`, `lib/services/neighborhoodService.js` | Chunk 11/12 creates these, but comes AFTER chunk 8 |

**Why it fails:** The LSP validator runs `validate_imports_exist()` which checks if the imported modules exist on the filesystem. Since the new files aren't created yet, it correctly flags them as unresolved.

### Category 2: Out-of-Order Consolidation (Chunks 8, 9)

**The Problem:** Chunk 8 tries to update imports to use `lib/services/amenitiesService.js`, but that file is created in Chunk 11. The chunks are ordered by page group, not by dependency.

**Correct Order Would Be:**
1. Create consolidated service (Chunk 11 first)
2. Update consumers (Chunk 8, 9 after)

### Category 3: Build Failures (Chunk 9)

**The Problem:** Chunk 9 passed pre-validation and LSP diagnostics but failed the build check. The error message is truncated but suggests a TypeScript error.

---

## Why Net Zero Outcome

The current logic:
```python
for chunk in page_chunks:
    pre_validate()  # Fails if imports don't resolve
    if fail:
        git reset --hard  # Revert ALL changes for this page
        mark page as failed
        continue to next page
```

**The reset behavior is correct** - it prevents broken code from accumulating. But the plan structure causes early chunks to fail, which resets successful later chunks within the same page group.

---

## Brainstormed Solutions

### Option A: Re-order Chunks by Dependency Graph (Recommended)

**What:** Modify the plan parser to build a dependency graph and execute chunks in topological order.

**Implementation:**
1. During plan parsing, identify chunks that CREATE new files
2. Identify chunks that CONSUME those files (via imports)
3. Execute creators before consumers

**Pros:**
- Preserves safety net (validation still runs)
- Works with existing plan structure
- Chunks can still be atomic

**Cons:**
- Requires modifying `chunk_parser.py`
- Plan file format may need `depends_on` field

---

### Option B: Multi-Pass Execution

**What:** Run all "create new file" chunks first, then run all "update imports" chunks.

**Implementation:**
1. Scan plan for chunk types:
   - `CREATE_FILE`: Chunks that add new files
   - `UPDATE_IMPORTS`: Chunks that change import paths
   - `MODIFY_LOGIC`: Chunks that change business logic
2. Execute in order: CREATE_FILE → UPDATE_IMPORTS → MODIFY_LOGIC

**Pros:**
- Simple categorization
- Natural separation of concerns

**Cons:**
- Requires chunk type metadata in plan
- May still have cross-type dependencies

---

### Option C: Scaffold-First Strategy

**What:** Generate empty/stub files for all new modules BEFORE executing any chunks.

**Implementation:**
1. Parse plan to find all "Files to CREATE" references
2. Generate stub files with proper exports (empty functions/hooks)
3. Run normal chunk execution
4. Stubs get replaced by real implementations

**Pros:**
- No changes to chunk ordering
- Pre-validation will pass (files exist)

**Cons:**
- Stubs might pass validation but break at runtime
- More complex orchestration

---

### Option D: Batch Commits Instead of Per-Page Resets

**What:** Allow partial progress within a page group by resetting only the failed chunk, not all chunks.

**Current behavior:**
```
Page /search: Chunk 1 fails → git reset → Chunk 2, 3 never run
```

**Proposed behavior:**
```
Page /search: Chunk 1 fails → skip → Chunk 2 runs → Chunk 3 runs
```

**Pros:**
- More incremental progress
- Independent chunks can succeed

**Cons:**
- May leave codebase in inconsistent state if chunks have hidden dependencies
- Need to track which chunks succeeded

---

### Option E: Plan Splitting - Separate Plans for Different Phases

**What:** Generate multiple plans instead of one big plan:

1. **Phase 1 Plan: Infrastructure** (New files, services)
   - Create `lib/services/amenitiesService.js`
   - Create `lib/services/neighborhoodService.js`
   - Create `useSearchPageLogic.js` (stub)

2. **Phase 2 Plan: Migration** (Update imports)
   - Update imports in `useAIImportAssistant.js`
   - Update imports in `Section2Features.tsx`

3. **Phase 3 Plan: Cleanup** (Remove duplicates, logging)
   - Delete old service files
   - Clean up console logs

**Pros:**
- Each phase can be run independently
- Clear separation of concerns
- Can verify each phase before moving on

**Cons:**
- Manual phase management
- Multiple runs required

---

### Option F: Relaxed Pre-Validation for New Files

**What:** Allow pre-validation to pass if the missing import is a NEW file being created by the same chunk.

**Implementation:**
```python
def validate_imports_exist(imports, new_files_in_chunk=[]):
    for module_path, symbols in imports:
        if module_path in new_files_in_chunk:
            continue  # Skip - this file will be created
        # Normal validation...
```

**Pros:**
- Minimal change to existing flow
- Chunks that create + use can work

**Cons:**
- Requires plan to declare which files each chunk creates
- Still doesn't solve cross-chunk dependencies

---

## Recommended Approach: Hybrid A + E

**Phase 1: Modify Plan Format**

Add a `creates` and `depends_on` field to each chunk:
```markdown
### CHUNK 11: Consolidate amenitiesService
**File:** Create: `app/src/lib/services/amenitiesService.js`
**Creates:** amenitiesService.js
**Depends On:** (none)

### CHUNK 8: useAIImportAssistant imports from duplicate service
**File:** `app/src/islands/pages/ListingDashboardPage/hooks/useAIImportAssistant.js`
**Creates:** (none)
**Depends On:** CHUNK 11
```

**Phase 2: Topological Sort in chunk_parser.py**

```python
def order_chunks_by_dependencies(chunks):
    """Order chunks so dependencies are created first."""
    graph = build_dependency_graph(chunks)
    return topological_sort(graph)
```

**Phase 3: Split Large Refactors into Phases**

For chunks like SearchPage (create 3 new files + update existing), split into sub-chunks:
- 1a: Create `useSearchPageLogic.js` (empty export)
- 1b: Create `SearchPageUI.jsx` (empty component)
- 1c: Migrate state to `useSearchPageLogic.js`
- 1d: Migrate JSX to `SearchPageUI.jsx`
- 1e: Update `SearchPage.jsx` to import and use

---

## Immediate Low-Hanging Fruit

These chunks should work with minimal changes:

| Chunk | Issue | Fix |
|-------|-------|-----|
| 7 | Deep import path fix | ✅ Already passed |
| 14 | Rename processProposalData | ✅ Already passed |
| 15 | Consolidate suggestedProposalService | In progress (was running) |
| 2, 5, 13, 19, 21, 22, 25 | Console logging cleanup | No new file dependencies |

**Quick Win:** Run a modified plan with only the "logging cleanup" chunks first.

---

## File References

- [lsp_validator.py](../adws/adw_modules/lsp_validator.py) - Pre-validation logic
- [chunk_parser.py](../adws/adw_modules/chunk_parser.py) - Plan parsing
- [adw_unified_fp_orchestrator.py](../adws/adw_unified_fp_orchestrator.py) - Main orchestrator
- [20260116161549_code_refactor_plan.md](.claude/plans/New/20260116161549_code_refactor_plan.md) - Failed plan

---

## Decision Needed

Which approach do you want to pursue?

1. **Quick: Logging-only plan** - Subset of chunks that have no file creation
2. **Medium: Chunk ordering** - Add dependencies to plan format
3. **Full: Phase-based execution** - Split into infrastructure → migration → cleanup
