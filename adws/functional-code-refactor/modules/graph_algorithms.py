"""
Graph algorithms for dependency analysis:
- Transitive reduction (40% edge reduction)
- Tarjan's SCC (cycle detection)
- Kahn's algorithm (topological levels)

This module provides the foundational algorithms for analyzing dependency graphs
in the ADW orchestration pipeline. All downstream steps (topology sort, audit
injection, validation) consume the GraphAnalysisResult produced here.
"""

from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field
from collections import defaultdict
import os


def normalize_path(path: str) -> str:
    """Normalize path for cross-platform matching.

    CRITICAL: All path comparisons MUST use this function.
    Windows uses backslashes, AST analyzer may output forward slashes,
    and user inputs can vary. This ensures consistent matching.

    Args:
        path: Any file path string

    Returns:
        Normalized path with forward slashes, no trailing slash, lowercase on Windows
    """
    # Convert to forward slashes
    normalized = path.replace('\\', '/')

    # Remove trailing slash
    normalized = normalized.rstrip('/')

    # Remove leading ./ if present
    if normalized.startswith('./'):
        normalized = normalized[2:]

    # On Windows, normalize case for consistent matching
    if os.name == 'nt':
        normalized = normalized.lower()

    return normalized


@dataclass
class GraphAnalysisResult:
    """Bundle all graph algorithm outputs for handoff to downstream consumers.

    This is the PRIMARY handoff contract from graph analysis phase.
    All downstream steps (topology sort, audit injection, validation) consume this.

    Attributes:
        reduced_graph: Dependency graph after transitive reduction
        cycles: List of strongly connected components (2+ file groups)
        topological_levels: Files grouped by dependency level (Kahn's output)
        original_edge_count: Edge count before reduction
        reduced_edge_count: Edge count after reduction
        edge_reduction_pct: Percentage of edges removed
        cycle_count: Number of cycles detected
        level_count: Number of topological levels
        file_to_level: Pre-computed lookup for O(1) level access
        file_to_cycle: Pre-computed lookup for cycle membership
    """

    # Core graph data
    reduced_graph: Dict[str, List[str]]      # After transitive reduction
    cycles: List[List[str]]                   # Tarjan's SCC output (2+ file groups)
    topological_levels: List[List[str]]       # Kahn's algorithm output

    # Metrics (for logging and prompt context)
    original_edge_count: int
    reduced_edge_count: int
    edge_reduction_pct: float
    cycle_count: int
    level_count: int

    # Reverse lookups (pre-computed for O(1) access)
    file_to_level: Dict[str, int] = field(default_factory=dict)
    file_to_cycle: Dict[str, Optional[int]] = field(default_factory=dict)

    @classmethod
    def from_analysis(
        cls,
        original_graph: Dict[str, List[str]],
        reduced_graph: Dict[str, List[str]],
        cycles: List[List[str]],
        levels: List[List[str]],
        reduction_pct: float
    ) -> "GraphAnalysisResult":
        """Factory method with pre-computed lookups.

        Args:
            original_graph: Original dependency graph (for edge count)
            reduced_graph: Graph after transitive reduction
            cycles: Strongly connected components from Tarjan's algorithm
            levels: Topological levels from Kahn's algorithm
            reduction_pct: Percentage of edges removed by reduction

        Returns:
            GraphAnalysisResult with all lookups pre-computed
        """
        # Build file -> level lookup
        file_to_level = {}
        for level_idx, level_files in enumerate(levels):
            for f in level_files:
                file_to_level[normalize_path(f)] = level_idx

        # Build file -> cycle lookup
        file_to_cycle: Dict[str, Optional[int]] = {}
        for cycle_idx, cycle_files in enumerate(cycles):
            for f in cycle_files:
                file_to_cycle[normalize_path(f)] = cycle_idx

        return cls(
            reduced_graph=reduced_graph,
            cycles=cycles,
            topological_levels=levels,
            original_edge_count=sum(len(deps) for deps in original_graph.values()),
            reduced_edge_count=sum(len(deps) for deps in reduced_graph.values()),
            edge_reduction_pct=reduction_pct,
            cycle_count=len(cycles),
            level_count=len(levels),
            file_to_level=file_to_level,
            file_to_cycle=file_to_cycle
        )

    def get_level(self, file_path: str) -> int:
        """Get topological level for a file. Returns 999 if unknown.

        Args:
            file_path: Path to the file

        Returns:
            Level index (0 = leaves, higher = more dependencies)
        """
        return self.file_to_level.get(normalize_path(file_path), 999)

    def get_cycle_id(self, file_path: str) -> Optional[int]:
        """Get cycle group ID if file is in a cycle, else None.

        Args:
            file_path: Path to the file

        Returns:
            Cycle index if file is in a cycle, None otherwise
        """
        return self.file_to_cycle.get(normalize_path(file_path))

    def is_in_cycle(self, file_path: str) -> bool:
        """Check if file is part of a circular dependency.

        Args:
            file_path: Path to the file

        Returns:
            True if file is in a cycle
        """
        return self.get_cycle_id(file_path) is not None

    def get_cycle_members(self, file_path: str) -> List[str]:
        """Get all files in the same cycle as the given file.

        Args:
            file_path: Path to the file

        Returns:
            List of files in the cycle (including the given file),
            or empty list if not in a cycle
        """
        cycle_id = self.get_cycle_id(file_path)
        if cycle_id is not None and cycle_id < len(self.cycles):
            return self.cycles[cycle_id]
        return []


def transitive_reduction(
    dependency_graph: Dict[str, List[str]]
) -> Tuple[Dict[str, List[str]], float]:
    """Remove redundant edges while preserving reachability.

    If A -> B -> C, the edge A -> C is redundant for ordering purposes.
    Research shows this typically eliminates 40% of edges.

    Uses BFS-based reachability to identify which edges can be removed
    without affecting the transitive closure of the graph.

    Args:
        dependency_graph: file -> [files it imports from]

    Returns:
        Tuple of (reduced_graph, reduction_percentage)
    """
    def get_reachable(start: str, graph: Dict[str, List[str]]) -> Set[str]:
        """BFS to find all nodes reachable from start."""
        visited: Set[str] = set()
        queue = [start]
        while queue:
            node = queue.pop(0)
            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        return visited

    original_edges = sum(len(deps) for deps in dependency_graph.values())
    if original_edges == 0:
        return {}, 0.0

    reduced: Dict[str, List[str]] = {}

    for file, imports in dependency_graph.items():
        if not imports:
            reduced[file] = []
            continue

        # Keep only edges that aren't transitively reachable via other edges
        essential = []
        for imp in imports:
            # Check if imp is reachable via other imports
            other_imports = [i for i in imports if i != imp]
            reachable_via_others: Set[str] = set()
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

    Tarjan's algorithm finds strongly connected components (SCCs) by:
    1. DFS traversal tracking discovery index and low-link values
    2. Using a stack to track the current component path
    3. Identifying SCC roots when low-link equals discovery index

    Args:
        dependency_graph: file -> [files it imports from]

    Returns:
        List of cycles, each cycle is a list of files that form a circular dependency.
        Only returns SCCs with 2+ files (actual cycles).
    """
    index_counter = [0]
    stack: List[str] = []
    lowlinks: Dict[str, int] = {}
    index: Dict[str, int] = {}
    on_stack: Dict[str, bool] = {}
    sccs: List[List[str]] = []

    # Collect all nodes (including those only appearing as dependencies)
    all_nodes: Set[str] = set(dependency_graph.keys())
    for deps in dependency_graph.values():
        all_nodes.update(deps)

    def strongconnect(node: str) -> None:
        """Tarjan's recursive component of the algorithm."""
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

        # Root of SCC - pop all members
        if lowlinks[node] == index[node]:
            scc: List[str] = []
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
    All files in a cycle appear at the same level (the level where the
    cycle's dependencies are satisfied).

    Args:
        dependency_graph: file -> [files it imports from]
        cycles: List of cycle groups from Tarjan's algorithm

    Returns:
        List of levels, each level is a list of files that can be
        refactored in parallel (no interdependencies within level).
    """
    # Build reverse graph (who depends on whom)
    reverse_graph: Dict[str, List[str]] = defaultdict(list)
    all_nodes: Set[str] = set(dependency_graph.keys())

    for file, imports in dependency_graph.items():
        all_nodes.update(imports)
        for imp in imports:
            reverse_graph[imp].append(file)

    # Create cycle membership lookup
    cycle_member: Dict[str, int] = {}  # file -> cycle_id
    for i, cycle in enumerate(cycles):
        for file in cycle:
            cycle_member[file] = i

    # Compute in-degrees (number of dependencies)
    # Don't count intra-cycle edges for cycle members
    in_degree: Dict[str, int] = {node: 0 for node in all_nodes}
    for file, imports in dependency_graph.items():
        for imp in imports:
            # Don't count edges within the same cycle
            if cycle_member.get(file) != cycle_member.get(imp):
                in_degree[file] += 1

    # Kahn's algorithm
    levels: List[List[str]] = []
    current_level = [f for f in all_nodes if in_degree[f] == 0]
    processed: Set[str] = set()

    while current_level:
        # Remove cycle duplicates (only include cycle once at its level)
        level_set: Set[str] = set()
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

        # Find next level (nodes whose dependencies are now satisfied)
        next_level: List[str] = []
        for file in current_level:
            for dependent in reverse_graph.get(file, []):
                if dependent not in processed:
                    in_degree[dependent] -= 1
                    if in_degree[dependent] == 0:
                        next_level.append(dependent)

        current_level = next_level

    return levels


def analyze_graph(
    dependency_graph: Dict[str, List[str]]
) -> GraphAnalysisResult:
    """Run full graph analysis pipeline.

    This is the main entry point for graph analysis. It runs:
    1. Transitive reduction (removes redundant edges)
    2. Tarjan's SCC (detects circular dependencies)
    3. Kahn's algorithm (computes topological levels)

    Args:
        dependency_graph: file -> [files it imports from]
            All paths should be pre-normalized

    Returns:
        GraphAnalysisResult with all computed data and lookups
    """
    # Step 1: Transitive reduction
    reduced_graph, reduction_pct = transitive_reduction(dependency_graph)

    # Step 2: Cycle detection (on reduced graph)
    cycles = detect_cycles_tarjan(reduced_graph)

    # Step 3: Topological levels
    levels = compute_topological_levels(reduced_graph, cycles)

    # Build result with pre-computed lookups
    return GraphAnalysisResult.from_analysis(
        original_graph=dependency_graph,
        reduced_graph=reduced_graph,
        cycles=cycles,
        levels=levels,
        reduction_pct=reduction_pct
    )


def build_simple_graph(dep_context: "DependencyContext") -> Dict[str, List[str]]:
    """Build simplified dependency graph from DependencyContext.

    Converts the AST analyzer's ImportedSymbol-based graph to a simple
    file -> [files] mapping suitable for graph algorithms.

    Args:
        dep_context: DependencyContext from AST analyzer

    Returns:
        Simple graph mapping file paths to their dependencies
    """
    simple_graph: Dict[str, List[str]] = {}

    for file_path, imports in dep_context.dependency_graph.items():
        normalized_file = normalize_path(file_path)
        resolved_deps = [
            normalize_path(imp.resolved_path)
            for imp in imports
            if imp.resolved_path is not None
        ]
        simple_graph[normalized_file] = resolved_deps

    return simple_graph
