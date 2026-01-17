# AST Precursor Experiment: Dependency Graph for Audit Enhancement

> **Objective**: Test whether a deterministic Python AST script that generates a dependency graph/map improves audit outcomes when passed as context to the existing audit step.
>
> **Approach**: Minimal change - keep everything else the same, only add the AST precursor.
>
> **Target Languages**: JavaScript (`.js`, `.jsx`) and TypeScript (`.ts`, `.tsx`) **ONLY**
>
> **Created**: 2026-01-17
> **Status**: PLANNING

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Refactoring Definition (CRITICAL)](#15-refactoring-definition-critical)
3. [Target Language Scope](#16-target-language-scope)
4. [Experiment Design](#2-experiment-design)
5. [Implementation (Phase 1)](#3-implementation)
6. [AST Parsing Strategy](#4-ast-parsing-strategy)
7. [Output Format for Prompt](#5-output-format-for-prompt)
8. [Minimal Changes Required](#6-minimal-changes-required)
9. [Rollback Plan](#7-rollback-plan)
10. [Phase 1 Implementation Steps](#8-implementation-steps)
11. [Future Phases Overview](#11-future-phases-overview)
12. [Phase 2: Session Management & Resume](#12-phase-2-session-management--resume)
13. [Phase 3: Chunk ID System & Dependency-Minimized Chunking](#13-phase-3-chunk-id-system--dependency-minimized-chunking)
14. [Phase 4: Deferred Linting & Validation Pipeline](#14-phase-4-deferred-linting--validation-pipeline)
15. [Phase 5: Parallel Execution & Advanced Features](#15-phase-5-parallel-execution--advanced-features)
16. [Complete Data Flow Diagram](#16-complete-data-flow-diagram)
17. [File References](#9-file-references)
18. [Approval Checklist](#10-approval-checklist)

---

## 1. Problem Statement

The current audit step (`adw_code_audit.py`) asks Claude to:
1. Scan files in target directory
2. **Infer** import relationships by reading code
3. **Guess** which files are affected by changes
4. Group chunks by affected pages

**The issue**: Claude must do structural analysis (what imports what) AND semantic reasoning (what to refactor) simultaneously. The structural part is:
- Error-prone (LLMs can miss imports, especially re-exports)
- Non-deterministic (different runs may find different imports)
- Slow (Claude reads files to understand structure)

**The hypothesis**: If we pre-compute the dependency graph deterministically with Python/AST, Claude can focus on what it's good at—reasoning about refactoring—using accurate structural data.

---

## 1.5 Refactoring Definition (CRITICAL)

**Reference**: See [adws/CLAUDE.MD](../../adws/CLAUDE.MD) for the complete refactoring rules.

ADW refactoring is **behavior-preserving**. The goal is to make code more pure/functional without changing what it does.

### What "Refactor" Means

| ✅ This IS Refactoring | ❌ This is NOT Refactoring |
|------------------------|---------------------------|
| `arr.push(x)` → `[...arr, x]` | Adding validation that wasn't there |
| `for` loop → `.map()` | Fixing an off-by-one error |
| Extract pure function | Adding a new parameter |
| `let` → `const` | Changing error messages |
| Remove dead code | Adding logging |

### Hard Requirements

1. **All exported signatures must remain identical**
2. **All behavior must be unchanged** (same inputs → same outputs)
3. **All changes must pass**: `tsc --noEmit`, `bun run build`, existing tests
4. **Changes must be small and reversible**

### Violation Protocol

```
If any rule is violated: STOP. ROLLBACK. REPORT.
```

A change that alters behavior is **NOT** a refactor—it is a bug introduction.

**Bugs that exist in the codebase MUST remain as bugs.** We are not fixing anything. We are only restructuring code to be more functional while preserving exact behavior.

---

## 1.6 Target Language Scope

### Supported File Types

This ADW refactoring system targets **JavaScript and TypeScript files ONLY**:

| Extension | Language | Included |
|-----------|----------|----------|
| `.js` | JavaScript | ✅ Yes |
| `.jsx` | JavaScript + JSX | ✅ Yes |
| `.ts` | TypeScript | ✅ Yes |
| `.tsx` | TypeScript + JSX | ✅ Yes |
| `.mjs` | ES Modules | ✅ Yes |
| `.cjs` | CommonJS | ✅ Yes |
| `.py` | Python | ❌ No |
| `.css` | CSS | ❌ No |
| `.json` | JSON | ❌ No |
| `.md` | Markdown | ❌ No |

### File Discovery Pattern

```python
SUPPORTED_EXTENSIONS = {'.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'}

def is_refactorable_file(file_path: str) -> bool:
    """Check if file is a JavaScript/TypeScript file we should analyze."""
    ext = Path(file_path).suffix.lower()
    return ext in SUPPORTED_EXTENSIONS

def discover_files(target_path: str) -> list[str]:
    """Find all JS/TS files in target directory."""
    files = []
    for ext in SUPPORTED_EXTENSIONS:
        files.extend(glob.glob(f"{target_path}/**/*{ext}", recursive=True))
    return files
```

### Why JS/TS Only?

1. **Single Parser Strategy**: tree-sitter-javascript and tree-sitter-typescript handle all variants
2. **Consistent FP Patterns**: The refactoring rules (mutation → immutability, loops → map/filter/reduce) apply specifically to JS/TS idioms
3. **Unified Import/Export System**: ES6 modules provide consistent import/export patterns to analyze
4. **Project Scope**: The Split Lease codebase is React + Vite (JS/TS frontend) + Supabase Edge Functions (Deno/TS)

### Excluded by Design

- **Python files** (`adws/` scripts): These are the orchestrator, not the target
- **CSS/SCSS**: No FP patterns to refactor
- **JSON/YAML**: Configuration, not logic
- **Markdown**: Documentation

---

## 2. Experiment Design

### 2.1 Control vs Treatment

| Aspect | Control (Current) | Treatment (With AST) |
|--------|-------------------|----------------------|
| Dependency discovery | Claude infers from code | Pre-computed by Python |
| Symbol table | None (Claude guesses) | Explicit JSON |
| Affected files | Claude traces imports | Reverse dependency lookup |
| Cascading changes | Manual regex/heuristics | Graph traversal |

### 2.2 Success Metrics

| Metric | How to Measure | Target |
|--------|----------------|--------|
| Chunk accuracy | % of chunks that pass first validation | Increase |
| Missing imports | Chunks failing pre-LSP validation | Decrease |
| Cascading completeness | Renamed symbols found in all affected files | 100% |
| Audit time | Seconds for audit to complete | Neutral/decrease |

### 2.3 Test Procedure

1. Run audit on `app/src/logic/` **without** AST context (control)
2. Run audit on same target **with** AST context (treatment)
3. Compare:
   - Number of chunks generated
   - Validation pass rate per chunk
   - Quality of affected_pages identification
   - Cascading dependency coverage

---

## 3. Implementation

### 3.1 New File: `adws/adw_modules/ast_dependency_analyzer.py`

**Purpose**: Parse JavaScript/TypeScript files using tree-sitter, extract:
- Exports (named, default, re-exports)
- Imports (named, default, namespace)
- Build dependency graph

**Interface**:
```python
def analyze_dependencies(target_path: str) -> DependencyContext:
    """
    Analyze target directory and return dependency context.

    Args:
        target_path: Directory to analyze (e.g., "app/src/logic")

    Returns:
        DependencyContext with symbol_table, dependency_graph, reverse_deps
    """
    pass
```

**Output Schema** (`DependencyContext`):
```python
@dataclass
class DependencyContext:
    """Pre-computed semantic context for audit."""

    # What each file exports
    symbol_table: Dict[str, List[ExportedSymbol]]

    # What each file imports (and from where)
    dependency_graph: Dict[str, List[ImportedSymbol]]

    # Reverse lookup: who depends on this file?
    reverse_dependencies: Dict[str, List[str]]

    # Summary statistics
    total_files: int
    total_exports: int
    total_imports: int

    def to_prompt_context(self) -> str:
        """Format as markdown for inclusion in audit prompt."""
        pass
```

### 3.2 Data Types

```python
@dataclass
class ExportedSymbol:
    name: str                    # "calculatePrice"
    export_type: str             # "named" | "default" | "re-export"
    line: int                    # Line number
    source_file: Optional[str]   # For re-exports: original source

@dataclass
class ImportedSymbol:
    name: str                    # "calculatePrice" or "*" for namespace
    alias: Optional[str]         # "cp" if "import { calculatePrice as cp }"
    source: str                  # Relative path: "../../logic/calculators/pricing"
    resolved_path: str           # Absolute: "app/src/logic/calculators/pricing.js"
    line: int
    import_type: str             # "named" | "default" | "namespace" | "side-effect"
```

### 3.3 Prompt Injection Point

**File**: `adws/adw_code_audit.py`

**Current** (lines 43-51):
```python
prompt_template = prompt_template_path.read_text()
prompt = prompt_template.format(
    target_path=target_path,
    audit_type=audit_type,
    timestamp=timestamp,
    date=datetime.now().strftime('%Y-%m-%d')
)
```

**Modified**:
```python
from adws.adw_modules.ast_dependency_analyzer import analyze_dependencies

# NEW: Generate dependency context
dependency_context = analyze_dependencies(target_path)
semantic_context = dependency_context.to_prompt_context()

prompt_template = prompt_template_path.read_text()
prompt = prompt_template.format(
    target_path=target_path,
    audit_type=audit_type,
    timestamp=timestamp,
    date=datetime.now().strftime('%Y-%m-%d'),
    semantic_context=semantic_context,  # NEW
)
```

### 3.4 Prompt Template Modification

**File**: `adws/prompts/code_audit_opus.txt`

**Add after line 4** (before "Your Task"):
```markdown
## PRE-COMPUTED DEPENDENCY CONTEXT

The following dependency analysis was generated by AST parsing (100% accurate):

{semantic_context}

### How to Use This Context

1. **Symbol Table**: Shows what each file exports. When renaming a function, this tells you exactly where it's defined.

2. **Dependency Graph**: Shows what each file imports. Use this instead of scanning files yourself.

3. **Reverse Dependencies**: Shows who depends on each file. When modifying `pricing.js`, the reverse deps tell you EVERY file that imports from it.

**IMPORTANT**: Trust this data—it's machine-parsed, not inferred. Use it for:
- Identifying affected files (don't guess, look up in reverse_dependencies)
- Grouping cascading changes (all dependents of a modified file go together)
- Ordering chunks (files with no dependents can be modified first)
```

**Modify line 9** (current "Trace imports" instruction):
```markdown
- Use the provided dependency graph to identify affected pages (do NOT re-scan files)
```

---

## 4. AST Parsing Strategy

### 4.1 Parser Choice: tree-sitter

**Why tree-sitter**:
- Fast (written in C)
- Incremental (can re-parse only changed files)
- Accurate (full syntax tree, not regex)
- Language grammars maintained separately

**Installation**:
```bash
pip install tree-sitter tree-sitter-javascript tree-sitter-typescript
```

### 4.2 What to Extract

**From each file**, extract:

| Construct | AST Node Type | Example |
|-----------|--------------|---------|
| Named export | `export_statement` with `export_specifier` | `export { foo, bar }` |
| Default export | `export_statement` with `default` | `export default function` |
| Re-export | `export_statement` with `from` | `export { foo } from './other'` |
| Named import | `import_statement` with `import_specifier` | `import { foo } from './mod'` |
| Default import | `import_statement` with `default` | `import foo from './mod'` |
| Namespace import | `import_statement` with `*` | `import * as utils from './utils'` |
| Side-effect import | `import_statement` (no specifiers) | `import './styles.css'` |

### 4.3 Path Resolution

**Challenge**: Import paths are relative (`../../utils/helper`) but we need absolute paths for the dependency graph.

**Resolution strategy**:
```python
def resolve_import_path(importing_file: str, import_source: str) -> str:
    """
    Resolve relative import to absolute path.

    Examples:
        resolve_import_path("app/src/pages/search.jsx", "../../utils/helper")
        → "app/src/utils/helper.js"
    """
    # Handle different import styles
    if import_source.startswith('.'):
        # Relative import
        base_dir = os.path.dirname(importing_file)
        resolved = os.path.normpath(os.path.join(base_dir, import_source))
    elif import_source.startswith('@/'):
        # Alias import (common in Vite/Next.js)
        resolved = import_source.replace('@/', 'app/src/')
    else:
        # Package import (node_modules) - skip these
        return None

    # Try extensions: .js, .jsx, .ts, .tsx, /index.js, etc.
    return find_actual_file(resolved)
```

---

## 5. Output Format for Prompt

### 5.1 Compact Representation

For the prompt, we don't dump raw JSON. Instead, format as readable markdown:

```markdown
### Symbol Table (Exports by File)

| File | Exports |
|------|---------|
| `logic/calculators/pricing.js` | `calculatePrice`, `applyDiscount`, `getBaseRate` |
| `logic/rules/bookingRules.js` | `canBook`, `isAvailable`, `validateDates` |
| `lib/dayUtils.js` | `formatDay`, `parseDayIndex`, `getDayName` |

### Dependency Graph (Imports by File)

| File | Imports From |
|------|--------------|
| `pages/search.jsx` | `logic/calculators/pricing.js` (calculatePrice), `lib/dayUtils.js` (formatDay) |
| `logic/workflows/bookingWorkflow.js` | `logic/calculators/pricing.js` (*), `logic/rules/bookingRules.js` (canBook) |

### Reverse Dependencies (Who Depends on Each File)

| File | Depended On By |
|------|----------------|
| `logic/calculators/pricing.js` | `pages/search.jsx`, `pages/view.jsx`, `logic/workflows/bookingWorkflow.js` |
| `lib/dayUtils.js` | `pages/search.jsx`, `components/Calendar.jsx` |

### Summary

- **Total files analyzed**: 47
- **Total exports**: 156
- **Total import relationships**: 234
- **Files with most dependents**: `lib/dayUtils.js` (12), `lib/supabase.js` (9)
```

### 5.2 JSON for Machine Processing

Also save raw JSON for potential downstream use:

```json
{
  "generated_at": "2026-01-17T10:30:00Z",
  "target_path": "app/src/logic",
  "symbol_table": {
    "logic/calculators/pricing.js": [
      {"name": "calculatePrice", "type": "named", "line": 12},
      {"name": "applyDiscount", "type": "named", "line": 45}
    ]
  },
  "dependency_graph": {
    "pages/search.jsx": [
      {"name": "calculatePrice", "source": "logic/calculators/pricing.js", "line": 3}
    ]
  },
  "reverse_dependencies": {
    "logic/calculators/pricing.js": [
      "pages/search.jsx",
      "logic/workflows/bookingWorkflow.js"
    ]
  }
}
```

---

## 6. Minimal Changes Required

### 6.1 Files to Create

| File | Purpose |
|------|---------|
| `adws/adw_modules/ast_dependency_analyzer.py` | Main AST analyzer |
| `adws/adw_modules/ast_types.py` | Data types (ExportedSymbol, ImportedSymbol, etc.) |

### 6.2 Files to Modify

| File | Change |
|------|--------|
| `adws/adw_code_audit.py` | Add dependency context generation (5 lines) |
| `adws/prompts/code_audit_opus.txt` | Add semantic context section (~20 lines) |

### 6.3 Files NOT Modified

- `adws/adw_unified_fp_orchestrator.py` - No changes
- `adws/adw_modules/chunk_parser.py` - No changes
- `adws/adw_modules/agent.py` - No changes
- `adws/adw_modules/lsp_validator.py` - No changes

**Total impact**: ~2 new files, ~25 lines changed in existing files.

---

## 7. Rollback Plan

If the experiment doesn't improve outcomes:

1. Remove `semantic_context` from prompt template (revert to `{semantic_context}` placeholder)
2. Comment out dependency analysis call in `adw_code_audit.py`
3. Keep `ast_dependency_analyzer.py` for future use

**Risk**: Low. The AST analyzer is additive; the audit prompt gracefully handles missing context (empty string).

---

## 8. Implementation Steps

### Step 1: Create AST Analyzer (Day 1)
- [ ] Set up tree-sitter for JavaScript/TypeScript
- [ ] Implement export extraction
- [ ] Implement import extraction
- [ ] Implement path resolution
- [ ] Build dependency graph
- [ ] Build reverse dependency map
- [ ] Format output for prompt

### Step 2: Integrate with Audit (Day 1)
- [ ] Add 5 lines to `adw_code_audit.py`
- [ ] Add semantic context section to prompt template
- [ ] Test prompt generation (without running audit)

### Step 3: Run Comparison (Day 2)
- [ ] Run control audit (no AST context)
- [ ] Run treatment audit (with AST context)
- [ ] Compare chunk quality and validation rates
- [ ] Document findings

### Step 4: Evaluate (Day 2)
- [ ] Did cascading dependencies improve?
- [ ] Did pre-LSP validation pass rate increase?
- [ ] Did audit time change?
- [ ] Decision: adopt, iterate, or abandon

---

## 11. Future Phases Overview

Phase 1 (this document) focuses on the **AST precursor experiment**. The following phases build on its success to create a fully-featured refactoring orchestration system.

### Phase Allocation Matrix

| Phase | Feature | Complexity | Depends On | Files Affected |
|-------|---------|------------|------------|----------------|
| **1** | AST dependency analyzer | Medium | None | 2 new files |
| **1** | Prompt injection | Low | AST analyzer | 2 modified files |
| **2** | Session ID (`refactor_id`) | Low | Phase 1 success | `session_manager.py` (new) |
| **2** | State persistence | Low | Session ID | `session_manager.py` |
| **2** | Resume CLI flags | Low | State persistence | `adw_code_audit.py` |
| **3** | Chunk ID system (S01, M01, C01) | Low | Phase 2 | `chunk_parser.py` |
| **3** | Dependency-minimized chunking | High | AST graph + SCC | `chunk_generator.py` (new) |
| **3** | SCC-based chunk grouping | High | Dependency graph | `chunk_generator.py` |
| **4** | Deferred linting | Medium | Per-chunk commits | `validation_pipeline.py` (new) |
| **4** | End-of-session validation | Medium | Deferred linting | `validation_pipeline.py` |
| **5** | Parallel chunk execution | High | All above | `orchestrator.py` |

### Expected Improvements by Phase

| Phase | Problem Addressed | Current Failure Rate | Expected After |
|-------|-------------------|---------------------|----------------|
| 1 | LLM guesses dependencies | ~40% miss rate | <5% (AST is deterministic) |
| 2 | No session resumption | 100% restart on failure | Resume from last success |
| 3 | Page-grouped chunks have high coupling | ~60% cascading failures | <10% (dependency-minimized) |
| 4 | Per-chunk lint is slow & conflicts | 30% lint-related failures | <5% (holistic view) |
| 5 | Sequential execution is slow | N/A | 40-60% faster |

---

## 12. Phase 2: Session Management & Resume

### 12.1 Two-Level ID Architecture

Phase 2 introduces a **session-based execution model** inspired by the TAC-Clean ADW system:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SESSION ID (refactor_id)                         │
│                     Format: 8-char UUID                              │
│                     Example: "a1b2c3d4"                              │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    CHUNK IDs (within session)                │    │
│  │                    Format: {category}-{sequence}             │    │
│  │                    Examples: "S01", "M03", "C02"              │    │
│  │                                                              │    │
│  │  S01 ──→ S02 ──→ M01 ──→ M02 ──→ M03 ──→ C01 ──→ C02        │    │
│  │  (scaffold)      (migrate)              (cleanup)            │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 12.2 Session ID Generation

```python
import uuid

def make_refactor_id() -> str:
    """Generate unique session identifier for refactoring run."""
    return str(uuid.uuid4())[:8]  # e.g., "a1b2c3d4"
```

**Purpose:**
- Identifies an entire refactoring session
- Enables resumption of interrupted runs
- Links to state file, logs, and artifacts

### 12.3 Resumable Session State Schema

```python
from dataclasses import dataclass, field
from typing import Literal, Optional
from datetime import datetime

@dataclass
class RefactoringSessionState:
    """Persistent state for resumable refactoring sessions."""

    # Session identity
    refactor_id: str                          # Primary session ID
    created_at: str                           # ISO timestamp
    target_path: str                          # e.g., "app/src/logic"

    # Workflow tracking
    phase: Literal["audit", "execute", "validate", "complete", "failed"]

    # Plan state
    original_audit_output: str | None         # Raw audit response (for re-parsing)
    plan_file: str | None                     # Path to saved plan JSON
    dependency_context_file: str | None       # Path to AST-generated context

    # Chunk tracking
    chunks: list[dict]                        # All chunks in plan
    completed_chunks: list[str]               # Chunk IDs that succeeded
    failed_chunks: list[str]                  # Chunk IDs that failed (with errors)
    skipped_chunks: list[str]                 # Chunk IDs skipped (dependency failure)
    current_chunk: str | None                 # Chunk ID currently executing

    # Execution context
    git_branch: str | None                    # Working branch name
    base_commit: str | None                   # Commit SHA before changes
    last_commit: str | None                   # Most recent commit SHA

    # Resume metadata
    resumable: bool = True                    # Can this session be resumed?
    resume_count: int = 0                     # How many times resumed
    last_resumed_at: str | None = None        # Last resume timestamp
```

### 12.4 State File Location

Following TAC-Clean pattern:

```
agents/
└── code_refactor_{refactor_id}/
    ├── refactor_state.json      # Session state
    ├── audit_output.md          # Raw audit response
    ├── plan.json                # Parsed chunk plan
    ├── dependency_graph.json    # AST-generated dependencies
    ├── execution.log            # Detailed execution log
    └── chunks/
        ├── S01_completed.json   # Per-chunk result snapshots
        ├── M01_completed.json
        ├── M02_failed.json      # Includes error details
        └── ...
```

### 12.5 CLI Resume Interface

```bash
# Start new refactoring session
python adw_refactor.py --target app/src/logic --audit-type fp

# Resume existing session (explicit ID)
python adw_refactor.py --resume a1b2c3d4

# Resume most recent session
python adw_refactor.py --resume-latest

# Resume specific session from specific chunk
python adw_refactor.py --resume a1b2c3d4 --from-chunk M03

# List resumable sessions
python adw_refactor.py --list-sessions
```

### 12.6 Resume Logic Implementation

```python
def load_or_create_session(
    target_path: str | None = None,
    resume_id: str | None = None,
    from_chunk: str | None = None
) -> RefactoringSession:
    """Load existing session or create new one."""

    if resume_id:
        # RESUME MODE
        state = RefactoringSessionState.load(resume_id)
        if not state:
            raise SessionNotFoundError(f"No session found: {resume_id}")

        if not state.resumable:
            raise SessionNotResumableError(f"Session {resume_id} cannot be resumed")

        # Update resume metadata
        state.resume_count += 1
        state.last_resumed_at = datetime.now().isoformat()

        # Determine starting point
        if from_chunk:
            start_from = from_chunk
        else:
            start_from = find_first_incomplete_chunk(state)

        return RefactoringSession(state, resume_from=start_from)

    else:
        # NEW SESSION
        if not target_path:
            raise ValueError("target_path required for new session")

        refactor_id = make_refactor_id()
        state = RefactoringSessionState(
            refactor_id=refactor_id,
            created_at=datetime.now().isoformat(),
            target_path=target_path,
            phase="audit"
        )
        state.save()

        return RefactoringSession(state)
```

---

## 13. Phase 3: Chunk ID System & Dependency-Minimized Chunking

### 13.1 Chunk ID Format

```python
def make_chunk_id(category: str, sequence: int) -> str:
    """Generate human-readable chunk identifier.

    Args:
        category: "S" (scaffold), "M" (migrate), "C" (cleanup)
        sequence: 1-based index within category

    Returns:
        e.g., "S01", "M03", "C02"
    """
    return f"{category}{sequence:02d}"
```

**Why this format?**

| Aspect | Benefit |
|--------|---------|
| Human-readable | Easy to reference in logs ("Chunk M03 failed") |
| Sortable | Natural ordering within categories |
| Semantic | Category prefix indicates execution phase |
| Compact | 3 characters vs. full UUIDs |

### 13.2 Category Definitions

| Category | Code | Purpose | Execution Order |
|----------|------|---------|-----------------|
| Scaffold | `S` | Create new files, directories | 1st (before migrate) |
| Migrate | `M` | Update existing code, add imports | 2nd (after scaffold) |
| Cleanup | `C` | Remove old code, unused imports | 3rd (after migrate) |

### 13.3 Current vs. Proposed Chunking Strategy

| Aspect | Current (Page-Grouped) | Proposed (Dependency-Minimized) |
|--------|------------------------|--------------------------------|
| Grouping | Files by affected page | Files by dependency closure |
| Dependencies | High (page imports many files) | Minimal (independent units) |
| Failure blast radius | Large (whole page fails) | Small (single unit fails) |
| Parallelization | None (sequential pages) | High (independent chunks parallel) |

### 13.4 Dependency-Minimized Chunk Generation Algorithm

```python
def generate_dependency_minimized_chunks(
    refactoring_goals: list[RefactoringGoal],
    dependency_graph: DependencyGraph
) -> list[RefactoringChunk]:
    """Generate chunks that minimize cross-chunk dependencies.

    Algorithm:
    1. Build a graph where nodes = files to refactor
    2. Edges = import relationships between files
    3. Find strongly connected components (SCCs)
    4. Each SCC becomes a chunk (must change together)
    5. Order chunks topologically by SCC dependencies
    """

    # Step 1: Identify all files needing changes
    files_to_change = set()
    for goal in refactoring_goals:
        files_to_change.add(goal.target_file)
        # Add files that import the target (for cascading updates)
        files_to_change.update(dependency_graph.reverse_deps[goal.target_file])

    # Step 2: Build subgraph of only files being changed
    change_graph = dependency_graph.subgraph(files_to_change)

    # Step 3: Find strongly connected components (Tarjan's algorithm)
    sccs = tarjan_scc(change_graph)

    # Step 4: Create chunk per SCC
    chunks = []
    for i, scc in enumerate(sccs):
        category = determine_category(scc, refactoring_goals)
        chunk_id = make_chunk_id(category, i + 1)

        chunks.append(RefactoringChunk(
            id=chunk_id,
            category=category,
            files=list(scc),
            internal_deps=change_graph.internal_edges(scc),
            external_deps=change_graph.external_edges(scc),
        ))

    # Step 5: Topological sort of chunks by inter-SCC dependencies
    return topological_sort_chunks(chunks)
```

### 13.5 Chunk Data Structure

```python
@dataclass
class RefactoringChunk:
    id: str                           # "S01", "M03", etc.
    category: Literal["S", "M", "C"]  # Scaffold, Migrate, Cleanup
    files: list[str]                  # Files in this chunk

    # Dependency tracking
    depends_on: list[str]             # Chunk IDs this depends on
    depended_by: list[str]            # Chunk IDs that depend on this

    # For dependency-minimized generation
    scc_id: int                       # Strongly connected component ID
    coupling_score: float             # How coupled to other chunks (lower = better)

    # Code changes
    operations: list[RefactoringOperation]  # What to do in each file

    # Execution state
    status: Literal["pending", "running", "success", "failed", "skipped"]
    attempts: int = 0
    error_log: list[str] = field(default_factory=list)
    committed_sha: str | None = None
```

### 13.6 Execution Order Example

```
Given files with these dependencies:
  pricing.js ──imports──▶ dayUtils.js
  search.jsx ──imports──▶ pricing.js
  view.jsx ──imports──▶ pricing.js
  booking.js ──imports──▶ pricing.js, dayUtils.js

Dependency-minimized chunks:
  S01: [dayUtils.js]        # No dependencies, can go first
  S02: [pricing.js]         # Depends on dayUtils.js
  M01: [search.jsx]         # Depends on pricing.js
  M02: [view.jsx]           # Depends on pricing.js (parallel with M01)
  M03: [booking.js]         # Depends on pricing.js, dayUtils.js

Execution order: S01 → S02 → (M01 || M02) → M03
```

---

## 14. Phase 4: Deferred Linting & Validation Pipeline

### 14.1 Current vs. Proposed Validation Flow

```
CURRENT (lint per chunk):
  Chunk 1 → lint → fix → Chunk 2 → lint → fix → Chunk 3 → lint → fix
  Problems: Slow, lint rules interact, auto-fix conflicts

PROPOSED (lint at end):
  Chunk 1 → Chunk 2 → Chunk 3 → ... → Chunk N → LINT ALL → fix pass
  Benefits: Faster, holistic view, no conflicts
```

### 14.2 Validation Pipeline Tiers

```python
class ValidationPipeline:
    """Tiered validation with deferred linting."""

    # Per-chunk validations (fast, fail-fast)
    PER_CHUNK_VALIDATORS = [
        SyntaxValidator(),          # ESLint --parser-only (~100ms)
        ImportResolver(),           # Check imports resolve (~500ms)
        TypeScriptCompiler(),       # tsc --noEmit incremental (1-10s)
    ]

    # End-of-session validations (slow, comprehensive)
    END_OF_SESSION_VALIDATORS = [
        LintValidator(),            # bun run lint (full)
        BuildValidator(),           # bun run build (full)
        TestValidator(),            # Affected tests only
        VisualRegressionValidator() # Playwright screenshots (if routes affected)
    ]
```

### 14.3 Validation Timing Table

| Stage | Check | Typical Time | When Run | Fail Behavior |
|-------|-------|--------------|----------|---------------|
| 1 | Syntax (ESLint parsing) | <100ms | Per chunk | Immediate fail |
| 2 | Import resolution | <500ms | Per chunk | Immediate fail |
| 3 | TypeScript compilation | 1-10s | Per chunk | Immediate fail |
| 4 | Full lint (bun run lint) | 10-30s | End of session | Collect errors |
| 5 | Full build (bun run build) | 10-60s | End of session | Immediate fail |
| 6 | Affected unit tests | 5-30s | End of session | Collect errors |
| 7 | Visual regression (Playwright) | 30-120s | End of session | Collect errors |

### 14.4 Why Defer Linting?

| Reason | Explanation |
|--------|-------------|
| Lint rules interact | A change in file A may trigger lint errors in file B |
| Auto-fix conflicts | Running `lint --fix` per chunk can create merge conflicts |
| Performance | One lint pass is faster than N lint passes |
| Holistic view | Lint at end sees the "final state" of all changes |

### 14.5 Deferred Validation Implementation

```python
async def validate_chunk(self, chunk: RefactoringChunk) -> ValidationResult:
    """Fast per-chunk validation (NO LINT)."""
    for validator in self.PER_CHUNK_VALIDATORS:
        result = await validator.validate(chunk)
        if not result.passed:
            return result  # Fail fast
    return ValidationResult(passed=True)

async def validate_session(self, session: RefactoringSession) -> ValidationResult:
    """Comprehensive end-of-session validation (INCLUDES LINT)."""
    results = []

    # Run lint ONCE at end
    lint_result = await self.lint_validator.validate(session)
    results.append(lint_result)

    # Run build
    build_result = await self.build_validator.validate(session)
    results.append(build_result)

    # Run affected tests
    test_result = await self.test_validator.validate(session)
    results.append(test_result)

    return AggregatedValidationResult(results)
```

---

## 15. Phase 5: Parallel Execution & Advanced Features

### 15.1 Parallel Chunk Execution

Once dependency-minimized chunking is in place (Phase 3), chunks with no interdependencies can execute in parallel:

```python
async def execute_parallel_chunks(
    chunks: list[RefactoringChunk],
    max_concurrency: int = 3
) -> list[ExecutionResult]:
    """Execute independent chunks in parallel."""

    # Group chunks by dependency layer
    layers = build_dependency_layers(chunks)

    results = []
    for layer in layers:
        # All chunks in same layer are independent
        layer_results = await asyncio.gather(*[
            execute_chunk(chunk) for chunk in layer
        ])
        results.extend(layer_results)

        # Check for failures before proceeding to next layer
        if any(r.status == "failed" for r in layer_results):
            # Mark dependent chunks as skipped
            mark_dependents_skipped(layer_results, chunks)

    return results
```

### 15.2 Incremental Re-Auditing

After failures, re-audit only the remaining work:

```python
def should_reaudit(self) -> bool:
    """Determine if we need to re-plan remaining chunks."""
    return (self.chunks_since_audit >= self.REAUDIT_THRESHOLD or
            self.failure_count >= 2)

async def incremental_reaudit(
    self,
    remaining_chunks: list[RefactoringChunk]
) -> list[RefactoringChunk]:
    """Re-audit only remaining work based on current codebase state."""
    current_state = self.analyze_current_state()
    original_goals = self.extract_goals(remaining_chunks)

    # Use Opus to re-plan remaining work
    new_plan = await self.audit_agent.plan(
        current_state=current_state,
        goals=original_goals,
        completed_chunks=self.completed_chunks
    )
    return new_plan.chunks
```

### 15.3 AI-Assisted Repair

When a chunk fails validation, attempt automatic repair:

```python
async def attempt_repair(
    self,
    chunk: RefactoringChunk,
    errors: list[str],
    max_attempts: int = 2
) -> RefactoringChunk | None:
    """Attempt to fix failing chunk with AI assistance."""

    for attempt in range(max_attempts):
        repair_prompt = f"""
        The following refactoring chunk failed validation:

        Chunk ID: {chunk.id}
        Files: {chunk.files}

        Errors:
        {format_errors(errors)}

        Current code:
        {read_files(chunk.files)}

        Fix ONLY the validation errors. Do NOT:
        - Change behavior
        - Add features
        - Fix unrelated bugs
        """

        repaired_chunk = await self.repair_agent.repair(repair_prompt)

        # Validate the repair
        result = await self.validate_chunk(repaired_chunk)
        if result.passed:
            return repaired_chunk

    return None  # Repair failed, quarantine chunk
```

---

## 16. Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 1: AST PRECURSOR                                 │
│  ┌─────────────────┐                                                            │
│  │ Target Path     │──→ ast_dependency_analyzer.py ──→ DependencyContext        │
│  │ app/src/logic   │         (tree-sitter)              (symbol_table,          │
│  │ (JS/TS ONLY)    │                                     dependency_graph,       │
│  └─────────────────┘                                     reverse_deps)           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 2: SESSION MANAGEMENT                            │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────────┐  │
│  │ --resume flag?  │───▶│ Load existing   │───▶│ RefactoringSessionState     │  │
│  │                 │ NO │ Create new      │    │ refactor_id: "a1b2c3d4"     │  │
│  │                 │───▶│ refactor_id     │    │ phase: "audit"              │  │
│  └─────────────────┘YES └─────────────────┘    │ chunks: []                  │  │
│                                                 │ completed_chunks: []        │  │
│                                                 └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 3: CHUNK GENERATION                              │
│  ┌─────────────────────────┐    ┌─────────────────────────────────────────────┐ │
│  │ Audit Output +          │    │ Dependency-Minimized Chunking               │ │
│  │ DependencyContext       │───▶│                                             │ │
│  │                         │    │ 1. Build change subgraph                    │ │
│  └─────────────────────────┘    │ 2. Find SCCs (strongly connected)           │ │
│                                  │ 3. Assign chunk IDs: S01, M01, M02, C01     │ │
│                                  │ 4. Topological sort by SCC deps             │ │
│                                  └─────────────────────────────────────────────┘ │
│                                                    │                             │
│                                                    ▼                             │
│                                  ┌─────────────────────────────────────────────┐ │
│                                  │ Chunks with minimal cross-dependencies:     │ │
│                                  │                                             │ │
│                                  │ S01 (pricing.js) ──┐                        │ │
│                                  │                    ├──▶ M01 (search.jsx)    │ │
│                                  │ S02 (dayUtils.js) ─┘                        │ │
│                                  │                                             │ │
│                                  │ M02 (view.jsx) ────────▶ C01 (old_utils.js) │ │
│                                  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 4: EXECUTION LOOP                                │
│                                                                                  │
│  FOR each chunk in topological order:                                            │
│    ┌────────────────────────────────────────────────────────────────────────┐   │
│    │ 1. Check dependencies satisfied (all depends_on chunks succeeded)      │   │
│    │ 2. Execute chunk (apply changes)                                       │   │
│    │ 3. Per-chunk validation (syntax, imports, types) ──── NO LINT YET      │   │
│    │ 4. On success: git commit, mark completed                              │   │
│    │ 5. On failure: attempt repair (max 2), else quarantine                 │   │
│    │ 6. Save state after each chunk (enables resume)                        │   │
│    └────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  State after each chunk:                                                         │
│    completed_chunks: ["S01", "S02", "M01"]                                       │
│    current_chunk: "M02"                                                          │
│    failed_chunks: []                                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 4: END-OF-SESSION VALIDATION                     │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ After ALL chunks complete:                                                  │ │
│  │                                                                             │ │
│  │ 1. bun run lint ──────────────▶ Collect all lint errors                    │ │
│  │ 2. bun run lint --fix ────────▶ Auto-fix where possible                    │ │
│  │ 3. bun run build ─────────────▶ Full production build                      │ │
│  │ 4. Run affected tests ────────▶ Test coverage                              │ │
│  │ 5. Visual regression (if routes affected) ▶ Screenshot comparison          │ │
│  │                                                                             │ │
│  │ If lint introduced new errors:                                              │ │
│  │   - Create follow-up "lint-fix" chunks                                      │ │
│  │   - OR: Report for manual review                                            │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FINALIZATION                                           │
│                                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────────┐  │
│  │ Generate        │    │ Update state:   │    │ Report:                     │  │
│  │ summary report  │    │ phase="complete"│    │ - Completed: S01,S02,M01,M02│  │
│  │                 │    │ resumable=false │    │ - Failed: (none)            │  │
│  └─────────────────┘    └─────────────────┘    │ - Lint fixes: 3 files       │  │
│                                                 └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. File References

### Phase 1 Files (Current Scope)

| File | Relevance |
|------|-----------|
| [adws/CLAUDE.MD](../../adws/CLAUDE.MD) | **Strict refactoring rules** - must be followed |
| [adw_code_audit.py](../../adws/adw_code_audit.py) | Audit entry point - injection site for AST context |
| [code_audit_opus.txt](../../adws/prompts/code_audit_opus.txt) | Prompt template - context section to modify |
| [chunk_parser.py](../../adws/adw_modules/chunk_parser.py) | Reference for expected output format |

### Future Phase Files (To Be Created)

| Phase | File | Purpose |
|-------|------|---------|
| 1 | `adws/adw_modules/ast_dependency_analyzer.py` | Main AST analyzer (tree-sitter) |
| 1 | `adws/adw_modules/ast_types.py` | Data types for exports/imports |
| 2 | `adws/adw_modules/session_manager.py` | Session state persistence & resume |
| 3 | `adws/adw_modules/chunk_generator.py` | Dependency-minimized chunk generation |
| 4 | `adws/adw_modules/validation_pipeline.py` | Tiered validation with deferred lint |
| 5 | `adws/adw_modules/parallel_executor.py` | Parallel chunk execution |

### Reference Documents

| File | Relevance |
|------|-----------|
| [AST Orchestrator Plan](20260116181630_ADW_Modular_AST_Orchestrator_Redesign.md) | Full redesign plan (this is Phase 1 subset) |
| [TAC-Clean ADW System](C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL1\TAC - Clean\TAC - Clean\adws) | Reference implementation for session management |
| [Deep Research: AI-driven refactoring](AI-driven refactoring orchestration-Solving dependency ordering and failure recovery at scale.md) | Theoretical foundation for chunk ordering |

### Target Codebase Files (JS/TS Only)

| Directory | Contains | File Count (approx) |
|-----------|----------|---------------------|
| `app/src/logic/` | Business logic (calculators, rules, processors, workflows) | ~50 files |
| `app/src/islands/` | React page components | ~30 files |
| `app/src/lib/` | Shared utilities (dayUtils, supabase, auth) | ~15 files |
| `supabase/functions/` | Edge Functions (Deno/TypeScript) | ~20 files |

---

## 10. Approval Checklist

### Phase 1 Approval (Current)

- [ ] Confirm tree-sitter as parser choice
- [ ] Approve output format (markdown tables for prompt)
- [ ] Approve minimal change scope (2 new files, ~25 lines modified)
- [ ] Set comparison test target directory (`app/src/logic` recommended)
- [ ] Confirm success metrics (chunk accuracy, validation rate)
- [ ] Confirm JS/TS only scope (`.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`)
- [ ] Review refactoring rules in `adws/CLAUDE.MD`

### Phase 2 Approval (Future - After Phase 1 Success)

- [ ] Approve session ID format (8-char UUID)
- [ ] Approve state file location (`agents/code_refactor_{id}/`)
- [ ] Approve CLI resume interface (`--resume`, `--resume-latest`, `--from-chunk`)
- [ ] Review TAC-Clean patterns for compatibility

### Phase 3 Approval (Future - After Phase 2)

- [ ] Approve chunk ID format (`S01`, `M01`, `C01`)
- [ ] Approve category definitions (Scaffold, Migrate, Cleanup)
- [ ] Approve SCC-based chunking algorithm (Tarjan's)
- [ ] Review dependency-minimized vs. page-grouped trade-offs

### Phase 4 Approval (Future - After Phase 3)

- [ ] Approve deferred linting strategy
- [ ] Approve validation pipeline tiers
- [ ] Confirm lint-at-end timing is acceptable

### Phase 5 Approval (Future - After Phase 4)

- [ ] Approve parallel execution model
- [ ] Approve incremental re-audit threshold
- [ ] Approve AI-assisted repair prompts

---

## Glossary

| Term | Definition |
|------|------------|
| **refactor_id** | 8-character UUID identifying a refactoring session (Phase 2) |
| **Chunk ID** | Human-readable identifier like `S01`, `M03` for refactoring units (Phase 3) |
| **SCC** | Strongly Connected Component - files that must change together |
| **AST** | Abstract Syntax Tree - parsed code structure |
| **tree-sitter** | C-based incremental parser for JavaScript/TypeScript |
| **Scaffold** | Chunk category for creating new files |
| **Migrate** | Chunk category for updating existing code |
| **Cleanup** | Chunk category for removing old code |
| **Deferred Linting** | Running lint once at end instead of per-chunk |

---

**Document Version**: 2.0
**Status**: AWAITING APPROVAL
**Last Updated**: 2026-01-17

### Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-17 | Initial AST precursor experiment plan |
| 2.0 | 2026-01-17 | Added future phases (2-5), session management, chunk ID system, deferred linting, JS/TS scope constraint, complete data flow diagram |
