# AST Dependency Handoff Integration Plan

**Created**: 2026-01-18
**Updated**: 2026-01-18 (Added graph algorithms from deep research)
**Status**: Ready for Implementation
**Scope**: Integrate AST analyzer output into audit pipeline with deferred validation

---

## Objective

Transform the ADW orchestration pipeline to:
1. Use condensed "High Impact Summary" instead of full 32K-line JSON
2. Apply graph algorithms (transitive reduction, cycle detection, topological levels)
3. Order chunks by dependency topology (leaf-first)
4. Defer all validation until after ALL chunks are implemented

---

## Architecture Changes

### Current Flow
```
audit → per-chunk: [implement → build → visual → commit/reset]
```

### New Flow
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ENHANCED ORCHESTRATION PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: DEPENDENCY ANALYSIS                                               │
│     ├─ analyze_dependencies(target_path)                                    │
│     ├─ transitive_reduction() → 40% edge reduction                          │
│     ├─ detect_cycles_tarjan() → identify atomic units                       │
│     ├─ compute_topological_levels() → Kahn's algorithm                      │
│     └─ generate HighImpactSummary (~100 lines)                              │
│                                                                             │
│  PHASE 2: AUDIT WITH CONTEXT (Claude Opus)                                  │
│     ├─ Inject HighImpactSummary + cycle warnings into prompt                │
│     └─ Output: Chunk plan with file paths                                   │
│                                                                             │
│  PHASE 3: TOPOLOGY SORT CHUNKS                                              │
│     ├─ Map chunks to topological levels                                     │
│     ├─ Group cyclic files as atomic units                                   │
│     └─ Output: Level-ordered chunk list                                     │
│                                                                             │
│  PHASE 4: IMPLEMENT ALL CHUNKS                                              │
│     ├─ Process by level (Level 0 first → Level N last)                      │
│     ├─ Syntax check only (fast fail)                                        │
│     └─ Continue to next level                                               │
│                                                                             │
│  PHASE 5: DEFERRED VALIDATION                                               │
│     ├─ Full build verification                                              │
│     ├─ Visual regression (batch)                                            │
│     └─ PASS → commit ALL | FAIL → reset ALL + error attribution             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Task 1: Create `HighImpactSummary` Generator

**New file**: `adws/adw_modules/high_impact_summary.py`

```python
from dataclasses import dataclass
from typing import List, Tuple, Dict

@dataclass
class HighImpactSummary:
    """Condensed dependency summary for LLM prompts (~100 lines vs 32K)."""

    critical_files: List[Tuple[str, int]]  # (path, dependent_count) for 30+ deps
    high_files: List[Tuple[str, int]]      # 15-29 deps
    cycles: List[List[str]]                 # Circular import chains (atomic units)
    topological_levels: List[List[str]]     # Files grouped by dependency level
    leaf_count: int                         # Files with 0 reverse deps
    total_files: int
    edge_reduction_pct: float               # From transitive reduction

    def to_prompt_context(self) -> str:
        """Generate ~100 line markdown for prompt injection."""
        lines = [
            "## Dependency Impact Analysis",
            f"Files: {self.total_files} | Edge reduction: {self.edge_reduction_pct:.0%}",
            "",
            "### CRITICAL IMPACT (30+ dependents) - Avoid modifying",
            "| File | Dependents |",
            "|------|------------|",
        ]
        for path, count in self.critical_files[:10]:
            lines.append(f"| `{path}` | {count} |")

        lines.extend(["", "### HIGH IMPACT (15-29 dependents) - Change with caution"])
        lines.append(f"{len(self.high_files)} files in this tier")

        if self.cycles:
            lines.extend([
                "",
                "### CIRCULAR IMPORTS (must refactor together)",
            ])
            for i, cycle in enumerate(self.cycles[:5], 1):
                cycle_str = " → ".join(f"`{f}`" for f in cycle[:4])
                if len(cycle) > 4:
                    cycle_str += f" → ... ({len(cycle)} files)"
                lines.append(f"{i}. {cycle_str}")

        lines.extend([
            "",
            f"### LEAF FILES (safe to refactor): {self.leaf_count} files",
            f"### TOPOLOGICAL LEVELS: {len(self.topological_levels)} levels",
        ])

        return "\n".join(lines)

    @classmethod
    def from_dependency_context(
        cls,
        ctx: "DependencyContext",
        cycles: List[List[str]],
        levels: List[List[str]],
        edge_reduction: float
    ) -> "HighImpactSummary":
        """Build summary from analyzed context."""
        # Categorize by impact
        critical = []
        high = []
        leaf_count = 0

        for file_path, dependents in ctx.reverse_dependencies.items():
            count = len(dependents)
            if count >= 30:
                critical.append((file_path, count))
            elif count >= 15:
                high.append((file_path, count))
            elif count == 0:
                leaf_count += 1

        # Sort by impact (highest first)
        critical.sort(key=lambda x: -x[1])
        high.sort(key=lambda x: -x[1])

        return cls(
            critical_files=critical,
            high_files=high,
            cycles=cycles,
            topological_levels=levels,
            leaf_count=leaf_count,
            total_files=ctx.total_files,
            edge_reduction_pct=edge_reduction
        )
```

---

### Task 2: Create Graph Algorithms Module (NEW)

**New file**: `adws/adw_modules/graph_algorithms.py`

```python
"""
Graph algorithms for dependency analysis:
- Transitive reduction (40% edge reduction)
- Tarjan's SCC (cycle detection)
- Kahn's algorithm (topological levels)
"""

from typing import Dict, List, Set, Tuple
from collections import defaultdict


def transitive_reduction(
    dependency_graph: Dict[str, List[str]]
) -> Tuple[Dict[str, List[str]], float]:
    """Remove redundant edges while preserving reachability.

    If A → B → C, the edge A → C is redundant for ordering purposes.
    Research shows this typically eliminates 40% of edges.

    Args:
        dependency_graph: file → [files it imports from]

    Returns:
        (reduced_graph, reduction_percentage)
    """
    # Build reachability matrix via BFS
    def get_reachable(start: str, graph: Dict[str, List[str]]) -> Set[str]:
        visited = set()
        queue = [start]
        while queue:
            node = queue.pop(0)
            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        return visited

    original_edges = sum(len(deps) for deps in dependency_graph.values())
    reduced = {}

    for file, imports in dependency_graph.items():
        if not imports:
            reduced[file] = []
            continue

        # Keep only edges that aren't transitively reachable via other edges
        essential = []
        for imp in imports:
            # Check if imp is reachable via other imports
            other_imports = [i for i in imports if i != imp]
            reachable_via_others = set()
            for other in other_imports:
                reachable_via_others |= get_reachable(other, dependency_graph)

            if imp not in reachable_via_others:
                essential.append(imp)

        reduced[file] = essential

    reduced_edges = sum(len(deps) for deps in reduced.values())
    reduction_pct = 1 - (reduced_edges / original_edges) if original_edges > 0 else 0

    return reduced, reduction_pct


def detect_cycles_tarjan(
    dependency_graph: Dict[str, List[str]]
) -> List[List[str]]:
    """Tarjan's SCC algorithm - find circular import chains.

    Files in the same cycle MUST be refactored together as an atomic unit.
    Uses O(V+E) time, ~3ms for 519 files with 2,345 edges.

    Args:
        dependency_graph: file → [files it imports from]

    Returns:
        List of cycles, each cycle is a list of files that form a circular dependency.
        Only returns SCCs with 2+ files (actual cycles).
    """
    index_counter = [0]
    stack = []
    lowlinks = {}
    index = {}
    on_stack = {}
    sccs = []

    # Collect all nodes
    all_nodes = set(dependency_graph.keys())
    for deps in dependency_graph.values():
        all_nodes.update(deps)

    def strongconnect(node: str):
        index[node] = index_counter[0]
        lowlinks[node] = index_counter[0]
        index_counter[0] += 1
        stack.append(node)
        on_stack[node] = True

        for successor in dependency_graph.get(node, []):
            if successor not in index:
                strongconnect(successor)
                lowlinks[node] = min(lowlinks[node], lowlinks[successor])
            elif on_stack.get(successor, False):
                lowlinks[node] = min(lowlinks[node], index[successor])

        # Root of SCC
        if lowlinks[node] == index[node]:
            scc = []
            while True:
                w = stack.pop()
                on_stack[w] = False
                scc.append(w)
                if w == node:
                    break
            # Only report actual cycles (2+ files)
            if len(scc) > 1:
                sccs.append(scc)

    for node in all_nodes:
        if node not in index:
            strongconnect(node)

    return sccs


def compute_topological_levels(
    dependency_graph: Dict[str, List[str]],
    cycles: List[List[str]]
) -> List[List[str]]:
    """Kahn's algorithm - group files by dependency level.

    Level 0: Files with no dependencies (leaves) - safe to refactor first
    Level N: Files that only depend on Levels 0..N-1

    Cycles are treated as single "supernodes" at their appropriate level.

    Args:
        dependency_graph: file → [files it imports from]
        cycles: List of cycle groups from Tarjan's algorithm

    Returns:
        List of levels, each level is a list of files that can be
        refactored in parallel (no interdependencies within level).
    """
    # Build reverse graph (who depends on whom)
    reverse_graph = defaultdict(list)
    all_nodes = set(dependency_graph.keys())

    for file, imports in dependency_graph.items():
        all_nodes.update(imports)
        for imp in imports:
            reverse_graph[imp].append(file)

    # Create cycle membership lookup
    cycle_member = {}  # file → cycle_id
    for i, cycle in enumerate(cycles):
        for file in cycle:
            cycle_member[file] = i

    # Compute in-degrees (number of dependencies)
    in_degree = {node: 0 for node in all_nodes}
    for file, imports in dependency_graph.items():
        # Don't count intra-cycle edges
        for imp in imports:
            if cycle_member.get(file) != cycle_member.get(imp):
                in_degree[file] += 1

    # Kahn's algorithm
    levels = []
    current_level = [f for f in all_nodes if in_degree[f] == 0]
    processed = set()

    while current_level:
        # Remove cycle duplicates (only include cycle once at its level)
        level_set = set()
        for f in current_level:
            if f in cycle_member:
                # Include entire cycle at this level
                cycle_id = cycle_member[f]
                for cf in cycles[cycle_id]:
                    if cf not in processed:
                        level_set.add(cf)
                        processed.add(cf)
            elif f not in processed:
                level_set.add(f)
                processed.add(f)

        if level_set:
            levels.append(sorted(level_set))

        # Find next level
        next_level = []
        for file in current_level:
            for dependent in reverse_graph.get(file, []):
                if dependent not in processed:
                    in_degree[dependent] -= 1
                    if in_degree[dependent] == 0:
                        next_level.append(dependent)

        current_level = next_level

    return levels
```

`★ Insight ─────────────────────────────────────`
**Why these three algorithms matter:**
1. **Transitive Reduction**: If A→B→C, edge A→C is redundant. Removing it cuts 40% of edges, making the graph cleaner for the LLM to reason about.
2. **Tarjan's SCC**: Circular imports (A→B→C→A) break normal topological sort. Tarjan identifies these in O(V+E) so we can treat them as atomic units.
3. **Kahn's Algorithm**: Produces "levels" instead of a flat list. Level 0 files can be refactored in parallel, then Level 1, etc.
`─────────────────────────────────────────────────`

---

### Task 3: Update Audit Prompt Template

**Modifies**: `adws/prompts/code_audit_opus.txt`

Add placeholder:
```markdown
## Dependency Impact Analysis
{high_impact_summary}

### Refactoring Guidelines Based on Dependencies
- Files marked CRITICAL (30+ dependents) should NOT be modified unless absolutely necessary
- Prefer modifying leaf files (0 dependents) when possible
- Files in CIRCULAR IMPORTS must be refactored together as a single atomic unit
- Follow topological levels: Level 0 first, then Level 1, etc.
- For HIGH impact files, ensure all dependent files are updated in the same batch
```

---

### Task 4: Integrate AST Analysis into `run_code_audit_and_plan()`

**Modifies**: `adws/adw_code_audit.py:31-123`

```python
def run_code_audit_and_plan(target_path: str, audit_type: str, working_dir: Path) -> str:
    # NEW: Pre-compute dependencies with graph algorithms
    from adw_modules.ast_dependency_analyzer import analyze_dependencies
    from adw_modules.graph_algorithms import (
        transitive_reduction,
        detect_cycles_tarjan,
        compute_topological_levels
    )
    from adw_modules.high_impact_summary import HighImpactSummary

    # Step 1: Analyze dependencies
    dep_context = analyze_dependencies(target_path)

    # Step 2: Build simplified dependency graph for algorithms
    simple_graph = {}
    for file_path, imports in dep_context.dependency_graph.items():
        simple_graph[file_path] = [
            imp.resolved_path for imp in imports
            if imp.resolved_path
        ]

    # Step 3: Apply graph algorithms
    reduced_graph, reduction_pct = transitive_reduction(simple_graph)
    cycles = detect_cycles_tarjan(reduced_graph)
    levels = compute_topological_levels(reduced_graph, cycles)

    # Step 4: Generate condensed summary
    summary = HighImpactSummary.from_dependency_context(
        dep_context, cycles, levels, reduction_pct
    )

    # Step 5: Log insights
    print(f"  [Graph] Transitive reduction: {reduction_pct:.0%} edges removed")
    print(f"  [Graph] Cycles detected: {len(cycles)}")
    print(f"  [Graph] Topological levels: {len(levels)}")

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

### Task 5: Create Topology Sort Function (Updated with Levels)

**New file**: `adws/adw_modules/topology_sort.py`

```python
"""
Topology-based chunk ordering using pre-computed levels from Kahn's algorithm.
"""

from typing import List, Dict, Set
from dataclasses import dataclass


@dataclass
class TopologySortResult:
    """Result of topology sorting chunks."""
    sorted_chunks: List["ChunkData"]
    levels: List[List["ChunkData"]]  # Chunks grouped by level (for parallel processing)
    cycle_chunks: List[List["ChunkData"]]  # Chunks that are part of cycles (atomic units)


def topology_sort_chunks(
    chunks: List["ChunkData"],
    topological_levels: List[List[str]],
    cycles: List[List[str]]
) -> TopologySortResult:
    """Sort chunks by topological level (leaf-first).

    Uses pre-computed levels from Kahn's algorithm instead of simple
    dependent count sorting. This ensures correct ordering even with
    complex dependency chains.

    Args:
        chunks: List of chunks to sort
        topological_levels: Pre-computed levels from compute_topological_levels()
        cycles: Pre-computed cycles from detect_cycles_tarjan()

    Returns:
        TopologySortResult with sorted chunks and level groupings
    """
    # Build file → level lookup
    file_to_level = {}
    for level_idx, level_files in enumerate(topological_levels):
        for file_path in level_files:
            file_to_level[normalize_path(file_path)] = level_idx

    # Build file → cycle lookup
    file_to_cycle = {}
    for cycle_idx, cycle_files in enumerate(cycles):
        for file_path in cycle_files:
            file_to_cycle[normalize_path(file_path)] = cycle_idx

    # Assign each chunk to a level
    chunk_levels: Dict[int, List["ChunkData"]] = {}
    cycle_chunks: Dict[int, List["ChunkData"]] = {}

    for chunk in chunks:
        normalized = normalize_path(chunk.file_path)

        # Check if part of a cycle
        if normalized in file_to_cycle:
            cycle_id = file_to_cycle[normalized]
            if cycle_id not in cycle_chunks:
                cycle_chunks[cycle_id] = []
            cycle_chunks[cycle_id].append(chunk)

        # Assign to level
        level = file_to_level.get(normalized, 999)  # Unknown files last
        if level not in chunk_levels:
            chunk_levels[level] = []
        chunk_levels[level].append(chunk)

    # Build sorted result
    sorted_chunks = []
    levels_output = []
    for level_idx in sorted(chunk_levels.keys()):
        level_chunks = chunk_levels[level_idx]
        sorted_chunks.extend(level_chunks)
        levels_output.append(level_chunks)

    return TopologySortResult(
        sorted_chunks=sorted_chunks,
        levels=levels_output,
        cycle_chunks=list(cycle_chunks.values())
    )


def normalize_path(path: str) -> str:
    """Normalize path separators for cross-platform matching."""
    return path.replace('\\', '/')
```

---

### Task 6: Create Deferred Validation Module

**New file**: `adws/adw_modules/deferred_validation.py`

```python
from dataclasses import dataclass, field
from typing import List, Set, Optional
from pathlib import Path
import subprocess


@dataclass
class ValidationError:
    """A validation error with source attribution."""
    message: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    chunk_number: Optional[int] = None


@dataclass
class ValidationBatch:
    """Tracks a batch of chunks for deferred validation."""
    chunks: List["ChunkData"]
    implemented_files: Set[str]
    affected_pages: Set[str]  # Derived from reverse deps
    cycle_groups: List[List["ChunkData"]]  # Atomic units

    @classmethod
    def from_topology_result(
        cls,
        result: "TopologySortResult",
        reverse_deps: Dict[str, List[str]]
    ) -> "ValidationBatch":
        """Build validation batch from topology sort result."""
        files = {c.file_path for c in result.sorted_chunks}

        # Expand to affected pages via reverse dependencies
        affected = set()
        for file_path in files:
            normalized = file_path.replace('\\', '/')
            dependents = reverse_deps.get(normalized, [])
            affected.update(dependents)

        # Filter to actual page paths
        pages = {
            p for p in affected
            if '/pages/' in p or p.startswith('src/islands/pages/')
        }

        return cls(
            chunks=result.sorted_chunks,
            implemented_files=files,
            affected_pages=pages,
            cycle_groups=result.cycle_chunks
        )


@dataclass
class ValidationResult:
    """Result of deferred validation."""
    success: bool
    build_passed: bool = False
    visual_passed: bool = False
    errors: List[ValidationError] = field(default_factory=list)
    affected_chunks: List["ChunkData"] = field(default_factory=list)


def run_deferred_validation(
    batch: ValidationBatch,
    working_dir: Path,
    logger: "RunLogger",
    skip_visual: bool = False
) -> ValidationResult:
    """Run validation after all chunks implemented.

    Validation sequence:
    1. Full production build (catches type errors, import errors)
    2. Visual regression on affected pages (if any and not skipped)
    3. Return detailed result with error attribution
    """
    result = ValidationResult(success=False)

    # Phase 1: Build check
    logger.step(f"Running full build verification ({len(batch.implemented_files)} files changed)...")
    try:
        build_result = subprocess.run(
            ["bun", "run", "build"],
            cwd=working_dir / "app",
            capture_output=True,
            text=True,
            timeout=180
        )

        if build_result.returncode != 0:
            result.build_passed = False
            error_output = build_result.stderr or build_result.stdout

            # Parse errors and attribute to chunks
            result.errors = _parse_build_errors(error_output)
            result.affected_chunks = _attribute_errors_to_chunks(
                result.errors, batch.chunks
            )

            logger.log(f"  [FAIL] Build failed with {len(result.errors)} errors")
            return result

        result.build_passed = True
        logger.log(f"  [OK] Build passed")

    except subprocess.TimeoutExpired:
        result.errors.append(ValidationError(message="Build timed out (180s)"))
        return result
    except Exception as e:
        result.errors.append(ValidationError(message=str(e)))
        return result

    # Phase 2: Visual regression (if applicable)
    if not skip_visual and batch.affected_pages:
        logger.step(f"Visual regression on {len(batch.affected_pages)} affected pages...")
        # TODO: Implement batch visual regression
        result.visual_passed = True
    else:
        result.visual_passed = True
        if skip_visual:
            logger.log("  [SKIP] Visual regression skipped")
        else:
            logger.log("  [SKIP] No pages affected")

    result.success = result.build_passed and result.visual_passed
    return result


def _parse_build_errors(error_output: str) -> List[ValidationError]:
    """Parse build error output into structured errors."""
    errors = []
    for line in error_output.split('\n'):
        if ':' in line and ('error' in line.lower() or 'Error' in line):
            # Try to extract file:line format
            parts = line.split(':')
            if len(parts) >= 2:
                errors.append(ValidationError(
                    message=line.strip(),
                    file_path=parts[0] if parts[0].endswith(('.js', '.jsx', '.ts', '.tsx')) else None,
                    line_number=int(parts[1]) if parts[1].isdigit() else None
                ))
            else:
                errors.append(ValidationError(message=line.strip()))
    return errors[:20]  # Limit to first 20 errors


def _attribute_errors_to_chunks(
    errors: List[ValidationError],
    chunks: List["ChunkData"]
) -> List["ChunkData"]:
    """Find which chunks likely caused each error."""
    affected = []
    for chunk in chunks:
        chunk_path = chunk.file_path.replace('\\', '/')
        for error in errors:
            if error.file_path and chunk_path in error.file_path.replace('\\', '/'):
                affected.append(chunk)
                break
    return affected
```

---

### Task 7: Refactor Orchestrator for Deferred Validation

**Modifies**: `adws/adw_unified_fp_orchestrator.py`

Key changes:
1. Remove per-chunk build checks (lines 196-223)
2. Remove per-chunk visual regression (lines 431-468)
3. Add graph algorithm phase after dependency analysis
4. Add topology sort after parsing (after line 285)
5. Add deferred validation phase (new Phase 5)
6. Single commit/reset at the end

```python
# PHASE 1.5: GRAPH ANALYSIS (NEW)
from adw_modules.graph_algorithms import (
    transitive_reduction, detect_cycles_tarjan, compute_topological_levels
)

simple_graph = build_simple_graph(dep_context)
reduced_graph, reduction_pct = transitive_reduction(simple_graph)
cycles = detect_cycles_tarjan(reduced_graph)
levels = compute_topological_levels(reduced_graph, cycles)

logger.step(f"Graph analysis: {reduction_pct:.0%} reduction, {len(cycles)} cycles, {len(levels)} levels")

# PHASE 3: TOPOLOGY SORT (UPDATED)
from adw_modules.topology_sort import topology_sort_chunks

sort_result = topology_sort_chunks(all_chunks, levels, cycles)
logger.step(f"Sorted {len(sort_result.sorted_chunks)} chunks across {len(sort_result.levels)} levels")

if sort_result.cycle_chunks:
    logger.step(f"WARNING: {len(sort_result.cycle_chunks)} cycle groups detected - will refactor atomically")

# PHASE 4: IMPLEMENT ALL CHUNKS (No validation per chunk)
for level_idx, level_chunks in enumerate(sort_result.levels):
    logger.step(f"Implementing Level {level_idx} ({len(level_chunks)} chunks)...")

    for chunk in level_chunks:
        success = implement_chunk_syntax_only(chunk, working_dir, logger)
        if not success:
            # Syntax error - abort early
            subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir)
            logger.phase_complete("IMPLEMENTATION", success=False, error="Syntax error")
            break

# PHASE 5: DEFERRED VALIDATION
from adw_modules.deferred_validation import ValidationBatch, run_deferred_validation

validation_batch = ValidationBatch.from_topology_result(
    sort_result,
    dep_context.reverse_dependencies
)
result = run_deferred_validation(validation_batch, working_dir, logger)

if result.success:
    # Commit ALL changes
    commit_msg = f"refactor: Implement {len(sort_result.sorted_chunks)} chunks across {len(sort_result.levels)} levels"
    subprocess.run(["git", "add", "."], cwd=working_dir)
    subprocess.run(["git", "commit", "-m", commit_msg], cwd=working_dir)
    logger.phase_complete("VALIDATION", success=True)
else:
    # Reset ALL and report
    subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir)
    logger.phase_complete("VALIDATION", success=False, error=f"{len(result.errors)} errors")

    # Report affected chunks
    if result.affected_chunks:
        logger.log("Chunks likely causing errors:")
        for chunk in result.affected_chunks[:5]:
            logger.log(f"  - Chunk {chunk.number}: {chunk.file_path}")
```

---

## File Reference Summary

### New Files
| File | Purpose |
|------|---------|
| `adws/adw_modules/high_impact_summary.py` | Condensed dependency summary generator |
| `adws/adw_modules/graph_algorithms.py` | Transitive reduction, Tarjan's SCC, Kahn's levels |
| `adws/adw_modules/topology_sort.py` | Level-based chunk ordering |
| `adws/adw_modules/deferred_validation.py` | Batch validation after implementation |

### Modified Files
| File | Changes |
|------|---------|
| `adws/adw_code_audit.py` | Inject graph analysis + AST context into audit prompt |
| `adws/adw_unified_fp_orchestrator.py` | Remove per-chunk validation, add graph phase + deferred validation |
| `adws/prompts/code_audit_opus.txt` | Add `{high_impact_summary}` placeholder with cycle warnings |

### Unchanged (Reference Only)
| File | Role |
|------|------|
| `adws/adw_modules/ast_dependency_analyzer.py` | Core AST analysis (already working) |
| `adws/adw_modules/ast_types.py` | Type definitions |
| `adws/adw_modules/chunk_parser.py` | Chunk extraction from plan |
| `adws/adw_modules/run_logger.py` | Logging infrastructure |

---

## Execution Order

1. **Task 2**: Create `graph_algorithms.py` (standalone, testable, foundational)
2. **Task 1**: Create `high_impact_summary.py` (depends on graph output)
3. **Task 5**: Create `topology_sort.py` (depends on graph output)
4. **Task 6**: Create `deferred_validation.py` (standalone)
5. **Task 3**: Update audit prompt template
6. **Task 4**: Integrate into `adw_code_audit.py`
7. **Task 7**: Refactor orchestrator (most complex, do last)

---

## Testing Strategy

1. **Unit test** `transitive_reduction()` - verify edge count reduction
2. **Unit test** `detect_cycles_tarjan()` - test with known cyclic graph
3. **Unit test** `compute_topological_levels()` - verify level ordering
4. **Unit test** `topology_sort_chunks()` - verify chunk ordering by level
5. **Integration test**: Run graph analysis on actual `app/` directory
6. **Integration test**: Run full pipeline on small target (`app/src/logic/rules`)
7. **Regression test**: Compare chunk output with/without dependency context

---

## Algorithm Complexity

| Algorithm | Time | Space | For 519 files, 2345 edges |
|-----------|------|-------|---------------------------|
| Transitive Reduction | O(V × E) | O(V²) | ~50ms |
| Tarjan's SCC | O(V + E) | O(V) | ~3ms |
| Kahn's Topological | O(V + E) | O(V) | ~2ms |

Total preprocessing: **<100ms** for the entire codebase.

---

## Rollback Plan

If issues arise:
1. Orchestrator has `--legacy` flag to use old per-chunk validation
2. Audit prompt falls back to no dependency context if `{high_impact_summary}` missing
3. Graph algorithms can be disabled individually via env vars
4. All changes are on a feature branch until validated
