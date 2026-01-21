# Functional Code Refactor - Project Plan

## Overview

Establish a working automated refactoring pipeline that uses AST-based dependency analysis to safely refactor `app/src/logic/` code to functional programming patterns.

**Command:** `python orchestrator.py app/src/logic`

**Reference:** `activity.md`

---

## Task List

```json
[
  {
    "category": "setup",
    "description": "Create required directory structure",
    "steps": [
      "Create adw_plans/ directory in functional-code-refactor/",
      "Create agents/ directory if missing",
      "Verify prompts/ directory has all required templates",
      "Verify ast_cache/ directory exists"
    ],
    "passes": false
  },
  {
    "category": "bugfix",
    "description": "Fix AST dependency analyzer path resolution",
    "steps": [
      "Open modules/ast_dependency_analyzer.py",
      "Find where root_dir is computed",
      "Trace how target_path is resolved to absolute path",
      "Fix path resolution to correctly include 'Split Lease' project directory",
      "Clear ast_cache/260120-logic.json to force re-analysis",
      "Run: python -c \"from modules.ast_dependency_analyzer import analyze_dependencies; print(analyze_dependencies('../app/src/logic'))\""
    ],
    "passes": false
  },
  {
    "category": "bugfix",
    "description": "Verify orchestrator path computation",
    "steps": [
      "Read orchestrator.py lines 260-263 (path computation)",
      "Add debug logging to confirm project_root resolves correctly",
      "Run: python orchestrator.py app/src/logic --limit 0 (dry run)",
      "Confirm project_root = C:\\Users\\Split Lease\\Documents\\Split Lease"
    ],
    "passes": false
  },
  {
    "category": "testing",
    "description": "Test AST dependency analysis in isolation",
    "steps": [
      "Run: python -c \"from modules.ast_dependency_analyzer import analyze_dependencies; ctx = analyze_dependencies('C:/Users/Split Lease/Documents/Split Lease/app/src/logic'); print(f'Files: {ctx.total_files}')\"",
      "Verify total_files > 0",
      "Verify dependency_graph is populated",
      "Verify reverse_dependencies is populated"
    ],
    "passes": false
  },
  {
    "category": "testing",
    "description": "Test graph algorithms in isolation",
    "steps": [
      "Run graph analysis on valid dependency context",
      "Verify transitive reduction works",
      "Verify cycle detection works",
      "Verify topological levels are computed"
    ],
    "passes": false
  },
  {
    "category": "testing",
    "description": "Test code audit phase (Phase 1)",
    "steps": [
      "Run: python code_audit.py app/src/logic --audit-type general",
      "Verify plan file is created in adw_plans/",
      "Verify plan file has correct chunk format",
      "Verify affected pages are identified"
    ],
    "passes": false
  },
  {
    "category": "testing",
    "description": "Test chunk parser on generated plan",
    "steps": [
      "Run chunk parser on generated plan file",
      "Verify chunks are extracted correctly",
      "Verify file paths in chunks are valid",
      "Verify current_code and refactored_code blocks are captured"
    ],
    "passes": false
  },
  {
    "category": "testing",
    "description": "Test dev server management",
    "steps": [
      "Run dev server manager in isolation",
      "Verify server starts on correct port",
      "Verify server health check passes",
      "Verify server can be stopped cleanly"
    ],
    "passes": false
  },
  {
    "category": "integration",
    "description": "Run full pipeline with --limit 1",
    "steps": [
      "Run: python orchestrator.py app/src/logic --limit 1 --skip-visual",
      "Monitor Phase 1: Audit completes",
      "Monitor Phase 1.5: Graph analysis succeeds",
      "Monitor Phase 2: Chunks parsed and sorted",
      "Monitor Phase 3: Dev server starts",
      "Monitor Phase 4: Single chunk implemented",
      "Monitor Phase 5: Build validation runs",
      "Check git status for changes"
    ],
    "passes": false
  },
  {
    "category": "integration",
    "description": "Handle validation failures gracefully",
    "steps": [
      "Intentionally introduce syntax error in refactored code",
      "Run pipeline and observe failure handling",
      "Verify scoped reset only resets refactored files",
      "Verify pipeline fixes are preserved",
      "Verify error is reported clearly"
    ],
    "passes": false
  },
  {
    "category": "integration",
    "description": "Run full pipeline with --limit 5",
    "steps": [
      "Run: python orchestrator.py app/src/logic --limit 5 --skip-visual",
      "Monitor all 5 chunks implemented",
      "Verify build passes",
      "Verify git commit is created",
      "Review commit message format"
    ],
    "passes": false
  },
  {
    "category": "production",
    "description": "Run full pipeline without limits",
    "steps": [
      "Run: python orchestrator.py app/src/logic --skip-visual",
      "Monitor all chunks across all topological levels",
      "Verify deferred validation catches all issues",
      "Verify final commit contains all changes",
      "Run app and verify functionality preserved"
    ],
    "passes": false
  }
]
```

---

## Agent Instructions

1. Read `activity.md` first to understand current state
2. Find next task with `"passes": false`
3. Complete all steps for that task
4. Verify in terminal that changes work
5. Update task to `"passes": true`
6. Log completion in `activity.md`
7. Repeat until all tasks pass

**Important:** Only modify the `passes` field. Do not remove or rewrite tasks.

---

## Completion Criteria

All tasks marked with `"passes": true`

---

## Quick Reference

### Key Commands

```bash
# From functional-code-refactor/ directory
python orchestrator.py app/src/logic --limit 1 --skip-visual  # Test single chunk
python orchestrator.py app/src/logic --limit 5               # Test 5 chunks
python orchestrator.py app/src/logic                          # Full run

# Test modules in isolation
python -c "from modules.ast_dependency_analyzer import analyze_dependencies; print(analyze_dependencies('../app/src/logic'))"
python code_audit.py app/src/logic --skip-deps               # Skip dependency analysis
```

### Key Files to Watch

| File | Purpose |
|------|---------|
| `modules/ast_dependency_analyzer.py:analyze_dependencies()` | Path resolution |
| `orchestrator.py:260-263` | Working directory setup |
| `code_audit.py:run_dependency_analysis()` | Dependency analysis entry |
| `adw_plans/*.md` | Generated refactoring plans |
| `ast_cache/*.json` | Cached dependency data |

### Success Metrics

- AST analysis finds 50+ files in `app/src/logic/`
- Graph analysis shows transitive reduction > 30%
- Chunks parse without errors
- Build passes after refactoring
- No regressions in app functionality
