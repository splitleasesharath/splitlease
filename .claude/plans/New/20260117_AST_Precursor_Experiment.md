# AST Precursor Experiment: Dependency Graph for Audit Enhancement

> **Objective**: Test whether a deterministic Python AST script that generates a dependency graph/map improves audit outcomes when passed as context to the existing audit step.
>
> **Approach**: Minimal change - keep everything else the same, only add the AST precursor.
>
> **Created**: 2026-01-17
> **Status**: PLANNING

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

## 9. File References

| File | Relevance |
|------|-----------|
| [adw_code_audit.py](adws/adw_code_audit.py) | Audit entry point - injection site |
| [code_audit_opus.txt](adws/prompts/code_audit_opus.txt) | Prompt template - context section |
| [chunk_parser.py](adws/adw_modules/chunk_parser.py) | Reference for expected output format |
| [AST Orchestrator Plan](.claude/plans/New/20260116181630_ADW_Modular_AST_Orchestrator_Redesign.md) | Full redesign plan (this is Phase 1 subset) |

---

## 10. Approval Checklist

- [ ] Confirm tree-sitter as parser choice
- [ ] Approve output format (markdown tables for prompt)
- [ ] Approve minimal change scope (2 new files, ~25 lines modified)
- [ ] Set comparison test target directory (`app/src/logic` recommended)
- [ ] Confirm success metrics (chunk accuracy, validation rate)

---

**Document Version**: 1.0
**Status**: AWAITING APPROVAL
