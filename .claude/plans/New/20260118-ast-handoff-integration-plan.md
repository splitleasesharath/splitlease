# AST Dependency Handoff Integration Plan

**Created**: 2026-01-18
**Status**: Ready for Implementation
**Scope**: Integrate AST analyzer output into audit pipeline with deferred validation

---

## Objective

Transform the ADW orchestration pipeline to:
1. Use condensed "High Impact Summary" instead of full 32K-line JSON
2. Order chunks by dependency topology (leaf-first)
3. Defer all validation until after ALL chunks are implemented

---

## Architecture Changes

### Current Flow
```
audit → per-chunk: [implement → build → visual → commit/reset]
```

### New Flow
```
analyze_deps → audit(with context) → topology_sort → implement_all → validate_once → commit/reset
```

---

## Implementation Tasks

### Task 1: Create `HighImpactSummary` Generator

**New file**: `adws/adw_modules/high_impact_summary.py`

```python
@dataclass
class HighImpactSummary:
    critical_files: List[Tuple[str, int]]  # (path, dependent_count) for 30+ deps
    high_files: List[Tuple[str, int]]      # 15-29 deps
    leaf_count: int                         # Files with 0 reverse deps
    total_files: int

    def to_prompt_context(self) -> str:
        """Generate ~100 line markdown for prompt injection."""
        ...

    @classmethod
    def from_dependency_context(cls, ctx: DependencyContext) -> "HighImpactSummary":
        """Extract high-impact files from full context."""
        ...
```

**Modifies**: `adws/adw_modules/ast_types.py` (add method to DependencyContext)

---

### Task 2: Update Audit Prompt Template

**Modifies**: `adws/prompts/code_audit_opus.txt`

Add placeholder:
```markdown
## Dependency Impact Analysis
{high_impact_summary}

### Refactoring Guidelines Based on Dependencies
- Files marked CRITICAL (30+ dependents) should NOT be modified unless absolutely necessary
- Prefer modifying leaf files (0 dependents) when possible
- For HIGH impact files, ensure all dependent files are updated in the same batch
```

---

### Task 3: Integrate AST Analysis into `run_code_audit_and_plan()`

**Modifies**: `adws/adw_code_audit.py:31-123`

```python
def run_code_audit_and_plan(target_path: str, audit_type: str, working_dir: Path) -> str:
    # NEW: Pre-compute dependencies
    from adw_modules.ast_dependency_analyzer import analyze_dependencies
    from adw_modules.high_impact_summary import HighImpactSummary

    dep_context = analyze_dependencies(target_path)
    summary = HighImpactSummary.from_dependency_context(dep_context)

    # Load and format prompt with dependency context
    prompt = prompt_template.format(
        target_path=target_path,
        audit_type=audit_type,
        timestamp=timestamp,
        date=datetime.now().strftime('%Y-%m-%d'),
        high_impact_summary=summary.to_prompt_context()  # NEW
    )
    ...
```

---

### Task 4: Create Topology Sort Function

**New file**: `adws/adw_modules/topology_sort.py`

```python
def topology_sort_chunks(
    chunks: List[ChunkData],
    dep_context: DependencyContext
) -> List[ChunkData]:
    """Sort chunks: leaf-first (0 dependents) → hub-last (many dependents)."""

    def get_dependent_count(chunk: ChunkData) -> int:
        normalized = normalize_path(chunk.file_path)
        return len(dep_context.reverse_dependencies.get(normalized, []))

    return sorted(chunks, key=get_dependent_count)


def normalize_path(path: str) -> str:
    """Normalize path separators for cross-platform matching."""
    # Try both Windows and Unix separators
    return path.replace('\\', '/')
```

---

### Task 5: Create Deferred Validation Module

**New file**: `adws/adw_modules/deferred_validation.py`

```python
@dataclass
class ValidationBatch:
    chunks: List[ChunkData]
    implemented_files: Set[str]
    affected_pages: Set[str]  # Derived from reverse deps


@dataclass
class ValidationResult:
    success: bool
    build_passed: bool = False
    visual_passed: bool = False
    errors: List[ValidationError] = field(default_factory=list)
    affected_chunks: List[ChunkData] = field(default_factory=list)


def run_deferred_validation(
    batch: ValidationBatch,
    working_dir: Path,
    logger: RunLogger,
    skip_visual: bool = False
) -> ValidationResult:
    """Run validation after all chunks implemented."""
    ...
```

---

### Task 6: Refactor Orchestrator for Deferred Validation

**Modifies**: `adws/adw_unified_fp_orchestrator.py`

Key changes:
1. Remove per-chunk build checks (lines 196-223)
2. Remove per-chunk visual regression (lines 431-468)
3. Add topology sort after parsing (after line 285)
4. Add deferred validation phase (new Phase 5)
5. Single commit/reset at the end

```python
# PHASE 4: IMPLEMENT ALL CHUNKS (No validation per chunk)
for chunk in topology_sorted_chunks:
    success = implement_chunk_syntax_only(chunk, working_dir, logger)
    if not success:
        # Syntax error - abort early
        subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir)
        break

# PHASE 5: DEFERRED VALIDATION
validation_batch = ValidationBatch.from_chunks(
    topology_sorted_chunks,
    dep_context.reverse_dependencies
)
result = run_deferred_validation(validation_batch, working_dir, logger)

if result.success:
    # Commit ALL changes
    commit_all_chunks(topology_sorted_chunks, working_dir)
else:
    # Reset ALL and report
    subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir)
    report_validation_failure(result, logger)
```

---

## File Reference Summary

### New Files
| File | Purpose |
|------|---------|
| `adws/adw_modules/high_impact_summary.py` | Condensed dependency summary generator |
| `adws/adw_modules/topology_sort.py` | Leaf-first chunk ordering |
| `adws/adw_modules/deferred_validation.py` | Batch validation after implementation |

### Modified Files
| File | Changes |
|------|---------|
| `adws/adw_code_audit.py` | Inject AST context into audit prompt |
| `adws/adw_unified_fp_orchestrator.py` | Remove per-chunk validation, add deferred validation |
| `adws/prompts/code_audit_opus.txt` | Add `{high_impact_summary}` placeholder |
| `adws/adw_modules/ast_types.py` | Add `to_high_impact_summary()` method |

### Unchanged (Reference Only)
| File | Role |
|------|------|
| `adws/adw_modules/ast_dependency_analyzer.py` | Core AST analysis (already working) |
| `adws/adw_modules/chunk_parser.py` | Chunk extraction from plan |
| `adws/adw_modules/run_logger.py` | Logging infrastructure |

---

## Execution Order

1. **Task 1**: Create `high_impact_summary.py` (standalone, testable)
2. **Task 4**: Create `topology_sort.py` (standalone, testable)
3. **Task 5**: Create `deferred_validation.py` (standalone, testable)
4. **Task 2**: Update audit prompt template
5. **Task 3**: Integrate into `adw_code_audit.py`
6. **Task 6**: Refactor orchestrator (most complex, do last)

---

## Testing Strategy

1. **Unit test** `HighImpactSummary.from_dependency_context()` with mock data
2. **Unit test** `topology_sort_chunks()` with known ordering
3. **Integration test**: Run full pipeline on small target (`app/src/logic/rules`)
4. **Regression test**: Compare chunk output with/without dependency context

---

## Rollback Plan

If issues arise:
1. Orchestrator has `--legacy` flag to use old per-chunk validation
2. Audit prompt falls back to no dependency context if `{high_impact_summary}` missing
3. All changes are on a feature branch until validated
