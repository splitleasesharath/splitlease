# Simplified FP Refactor Pipeline - Implementation Plan

**Date**: 2026-01-21
**Status**: Ready for implementation
**Goal**: Eliminate chunk-based parsing, use /prime + /ralph-loop for holistic refactoring

---

## Executive Summary

Replace the current 6-phase chunk-based pipeline with a simplified 4-phase approach:

| Current Pipeline | New Pipeline |
|------------------|--------------|
| Phase 1: AUDIT (chunk-based plan) | Phase 1: AUDIT + PRIME (holistic plan) |
| Phase 1.5: GRAPH ANALYSIS | Phase 1.5: GRAPH ANALYSIS (unchanged) |
| Phase 2: PARSE & TOPOLOGY SORT | **ELIMINATED** |
| Phase 3: DEV SERVER SETUP | Phase 2: DEV SERVER SETUP |
| Phase 4: IMPLEMENT (chunk-by-chunk) | Phase 3: IMPLEMENT (single session) |
| Phase 5: VALIDATE | Phase 4: VALIDATE (simplified) |
| Phase 6: COMMIT/ROLLBACK | Phase 5: COMMIT/ROLLBACK |

---

## Architecture Changes

### 1. New Prompt Structure (`code_audit_opus.txt`)

The new prompt will:
1. Use `/prime {target_path}` to load full codebase context (JS/JSX files only)
2. Use `/ralph-loop:ralph-loop` for persistent session
3. Output a **single implementation plan** (not chunked markdown)
4. Claude executes the entire plan in Phase 3

### 2. New Output Format

Instead of:
```markdown
### CHUNK 1: Extract validation
**File:** app/src/logic/rules.js
**Current Code:** ...
**Refactored Code:** ...
~~~~~
### CHUNK 2: ...
```

The new format is:
```markdown
# Implementation Plan - {target_path}

## Summary
- Total files to modify: N
- Affected pages: [list]
- Risk level: LOW/MEDIUM/HIGH

## Files to Modify

### 1. `app/src/logic/rules/proposalRules.js`
**Changes:**
- Extract `validateProposalDates()` to pure function
- Remove side effects from `checkAvailability()`

**Before:**
```javascript
// exact code
```

**After:**
```javascript
// refactored code
```

### 2. `app/src/logic/calculators/pricingCalculators.js`
...

## Implementation Order
1. proposalRules.js (leaf - no dependents)
2. pricingCalculators.js (depends on proposalRules)
3. useProposalLogic.js (depends on both)

## Verification Steps
- [ ] Run `bun run lint` - expect 0 errors
- [ ] Run `bun run build` - expect success
- [ ] Visual check: /host-proposals, /guest-proposals
```

### 3. Orchestrator Changes

**Remove/Deprecate:**
- `chunk_parser.py` - No longer needed
- `topology_sort.py` - Order baked into plan
- `implement_chunk_syntax_only()` - Replace with single-session implementation

**Modify:**
- `orchestrator.py` - New flow (see below)
- `deferred_validation.py` - Simplified ValidationBatch
- `code_audit.py` - New prompt template

**Keep:**
- `graph_algorithms.py` - Still needed for dependency context
- `ast_dependency_analyzer.py` - Still needed
- `scoped_git_ops.py` - Track files via git diff
- `deferred_validation.py` - Core validation logic

---

## Detailed Implementation

### File 1: `prompts/code_audit_opus.txt` (REWRITE)

```
/prime {target_path}

/ralph-loop:ralph-loop

You are auditing the codebase for {audit_type} improvements.

## Dependency Analysis Context
{high_impact_summary}

## Guidelines
- Prefer modifying leaf files (0 dependents) first
- Files in CIRCULAR IMPORTS must be modified together
- HIGH impact files (30+ dependents) require careful consideration

## Your Task

1. **Read all .js and .jsx files** in {target_path}
2. **Identify refactoring opportunities**: {audit_type} issues, anti-patterns, duplication
3. **Create a comprehensive implementation plan**

## Output Requirements

Create an implementation plan at: `adws/adw_plans/{timestamp}_implementation_plan.md`

The plan MUST include:

### Header
```markdown
# Implementation Plan - {target_path}
Date: {date}
Audit Type: {audit_type}

## Summary
- Files to modify: [count]
- Implementation order: [list files in dependency order]
- Risk assessment: LOW/MEDIUM/HIGH
```

### For Each File
```markdown
### `path/to/file.js`
**Reason:** Why this file needs changes
**Dependencies:** Files that import this (from dependency analysis)

**Current Code:**
```javascript
// exact current code
```

**Refactored Code:**
```javascript
// complete refactored code
```
```

### Implementation Order Section
List files in the order they should be modified (leaves first, then dependents).

### Verification Section
- Build commands to run
- Pages to visually verify

## CRITICAL RULES
1. Include COMPLETE code blocks (not snippets)
2. Follow the dependency order from the analysis
3. If a change affects exports, include ALL importing files
4. Use `/implement` skill format for the refactored code sections
```

### File 2: `orchestrator.py` (MODIFY)

**New Flow:**

```python
def main():
    # Phase 1: AUDIT + PRIME
    # - Runs /prime to load context
    # - Runs /ralph-loop for persistent planning
    # - Output: Implementation plan markdown

    # Phase 1.5: GRAPH ANALYSIS (unchanged)
    # - AST analysis for dependency context
    # - Injected into prompt as {high_impact_summary}

    # Phase 2: DEV SERVER SETUP (was Phase 3)
    # - Same as before

    # Phase 3: IMPLEMENT (was Phase 4)
    # - Single Claude session reads the plan
    # - Implements ALL changes in one go
    # - Track modified files via git diff

    # Phase 4: VALIDATE (was Phase 5)
    # - Build validation (lint, typecheck, vite)
    # - Visual regression
    # - ValidationBatch built from git diff, not chunks

    # Phase 5: COMMIT/ROLLBACK (was Phase 6)
    # - Same as before
```

**Key Changes:**

1. **Remove chunk iteration loop:**
```python
# OLD (remove this)
for chunk in chunks_to_process:
    refactor_scope.track_from_chunk(chunk)
    success = implement_chunk_syntax_only(chunk, ...)

# NEW (replace with)
success = implement_full_plan(plan_file, project_root, adws_dir, logger)
modified_files = get_modified_files_from_git(project_root)
refactor_scope.track_files(modified_files)
```

2. **New implementation function:**
```python
def implement_full_plan(
    plan_file: Path,
    project_root: Path,
    adws_dir: Path,
    logger: RunLogger
) -> bool:
    """Implement the entire plan in a single Claude session."""

    prompt = f"""You have an implementation plan at: {plan_file}

Read the plan and implement ALL changes described in it.

For each file in the plan:
1. Read the current file
2. Apply the refactored code from the plan
3. Verify the change was applied correctly

Work through the files in the order specified in the plan.
Do NOT commit changes - just implement them.

When complete, output a summary of files modified.
"""

    request = AgentPromptRequest(
        prompt=prompt,
        model="sonnet",  # or "opus" for complex plans
        working_dir=str(adws_dir),
        dangerously_skip_permissions=True
    )

    response = prompt_claude_code(request)
    return response.success
```

3. **Track files via git diff:**
```python
def get_modified_files_from_git(project_root: Path) -> Set[str]:
    """Get list of modified files from git status."""
    result = subprocess.run(
        ["git", "diff", "--name-only"],
        cwd=project_root,
        capture_output=True,
        text=True
    )
    return set(result.stdout.strip().split('\n')) if result.stdout.strip() else set()
```

### File 3: `deferred_validation.py` (SIMPLIFY)

**New ValidationBatch creation:**

```python
def create_validation_batch_from_files(
    modified_files: Set[str],
    reverse_deps: Dict[str, List[str]] = None
) -> ValidationBatch:
    """Create validation batch directly from file paths.

    Args:
        modified_files: Set of modified file paths from git diff
        reverse_deps: Optional reverse dependency map

    Returns:
        ValidationBatch ready for validation
    """
    # Trace to affected pages (if we have reverse deps)
    pages = set()
    if reverse_deps:
        pages = _trace_to_pages(modified_files, reverse_deps)

    return ValidationBatch(
        chunks=[],  # No chunks in new approach
        implemented_files=modified_files,
        affected_pages=pages,
        cycle_groups=[]
    )
```

### File 4: `scoped_git_ops.py` (ADD METHOD)

```python
class RefactorScope:
    # ... existing methods ...

    def track_files(self, file_paths: Set[str]) -> None:
        """Track multiple files for potential rollback.

        Args:
            file_paths: Set of file paths (relative to project root)
        """
        for path in file_paths:
            self.track_file(path)
```

---

## Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `prompts/code_audit_opus.txt` | REWRITE | New prompt with /prime + /ralph-loop |
| `orchestrator.py` | MODIFY | Remove chunk loop, add single-session implementation |
| `code_audit.py` | MINOR | Update output path format |
| `deferred_validation.py` | ADD | `create_validation_batch_from_files()` function |
| `scoped_git_ops.py` | ADD | `track_files()` method |
| `chunk_parser.py` | DEPRECATE | Mark as deprecated, keep for reference |
| `topology_sort.py` | DEPRECATE | Mark as deprecated, keep for reference |

---

## Migration Path

1. **Phase A**: Create new prompt template (non-breaking)
2. **Phase B**: Add new functions to validation/git modules (non-breaking)
3. **Phase C**: Modify orchestrator to use new flow (breaking change)
4. **Phase D**: Test with `--limit 1` equivalent (implement one file)
5. **Phase E**: Full integration test
6. **Phase F**: Deprecate old chunk-based modules

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Single-session implementation may miss changes | Plan includes verification steps |
| No chunk-level error attribution | File-level errors still available |
| Larger context window usage | Use /prime to pre-load, /ralph-loop for persistence |
| Plan may be incomplete | /ralph-loop iterates until plan is complete |

---

## Verification Checklist

- [ ] New prompt generates valid implementation plan
- [ ] Implementation plan can be executed in single session
- [ ] Git diff correctly captures modified files
- [ ] ValidationBatch works without chunks
- [ ] Scoped rollback works with file-based tracking
- [ ] Build validation passes
- [ ] Visual regression passes

---

## Referenced Files

- [orchestrator.py](../../functional-code-refactor/orchestrator.py)
- [code_audit.py](../../functional-code-refactor/code_audit.py)
- [prompts/code_audit_opus.txt](../../functional-code-refactor/prompts/code_audit_opus.txt)
- [modules/deferred_validation.py](../../functional-code-refactor/modules/deferred_validation.py)
- [modules/scoped_git_ops.py](../../functional-code-refactor/modules/scoped_git_ops.py)
- [modules/chunk_parser.py](../../functional-code-refactor/modules/chunk_parser.py)
- [modules/topology_sort.py](../../functional-code-refactor/modules/topology_sort.py)
