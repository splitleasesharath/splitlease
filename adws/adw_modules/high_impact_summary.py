"""
High Impact Summary Generator

Generates a condensed (~100 lines) dependency summary for LLM prompts,
replacing the full 32K-line JSON dependency output. This summary highlights:
- Critical files (30+ dependents) - avoid modifying
- High impact files (15-29 dependents) - change with caution
- Circular import chains - must refactor together
- Leaf files (0 dependents) - safe to refactor
- Topological levels - process in order (Level 0 first)
"""

from dataclasses import dataclass
from typing import List, Tuple, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from .ast_types import DependencyContext
    from .graph_algorithms import GraphAnalysisResult


@dataclass
class HighImpactSummary:
    """Condensed dependency summary for LLM prompts (~100 lines vs 32K).

    This summary provides the LLM with actionable dependency information
    without overwhelming context. Files are categorized by impact level
    to guide refactoring decisions.

    Attributes:
        critical_files: Files with 30+ dependents (path, count pairs)
        high_files: Files with 15-29 dependents
        cycles: Circular import chains that must be refactored together
        topological_levels: Files grouped by dependency level
        leaf_count: Number of files with 0 reverse dependencies
        total_files: Total files analyzed
        edge_reduction_pct: Percentage of edges removed by transitive reduction
    """

    critical_files: List[Tuple[str, int]]  # (path, dependent_count) for 30+ deps
    high_files: List[Tuple[str, int]]      # 15-29 deps
    cycles: List[List[str]]                 # Circular import chains (atomic units)
    topological_levels: List[List[str]]     # Files grouped by dependency level
    leaf_count: int                         # Files with 0 reverse deps
    total_files: int
    edge_reduction_pct: float               # From transitive reduction

    def to_prompt_context(self) -> str:
        """Generate ~100 line markdown for prompt injection.

        Returns:
            Markdown-formatted string suitable for LLM consumption,
            highlighting dependency impact and refactoring constraints.
        """
        lines = [
            "## Dependency Impact Analysis",
            f"Files: {self.total_files} | Edge reduction: {self.edge_reduction_pct:.0%}",
            "",
            "### CRITICAL IMPACT (30+ dependents) - Avoid modifying",
            "| File | Dependents |",
            "|------|------------|",
        ]

        # Show top 10 critical files
        for path, count in self.critical_files[:10]:
            lines.append(f"| `{path}` | {count} |")

        if len(self.critical_files) > 10:
            lines.append(f"| ... | +{len(self.critical_files) - 10} more |")

        # High impact section
        lines.extend(["", "### HIGH IMPACT (15-29 dependents) - Change with caution"])
        if self.high_files:
            lines.append(f"{len(self.high_files)} files in this tier")

            # Show top 5 high impact files as examples
            if len(self.high_files) <= 5:
                for path, count in self.high_files:
                    lines.append(f"- `{path}` ({count} dependents)")
            else:
                for path, count in self.high_files[:5]:
                    lines.append(f"- `{path}` ({count} dependents)")
                lines.append(f"- ... and {len(self.high_files) - 5} more")
        else:
            lines.append("No files in this tier")

        # Circular imports section
        if self.cycles:
            lines.extend([
                "",
                "### CIRCULAR IMPORTS (must refactor together)",
            ])
            for i, cycle in enumerate(self.cycles[:5], 1):
                cycle_str = " -> ".join(f"`{f}`" for f in cycle[:4])
                if len(cycle) > 4:
                    cycle_str += f" -> ... ({len(cycle)} files)"
                lines.append(f"{i}. {cycle_str}")

            if len(self.cycles) > 5:
                lines.append(f"... and {len(self.cycles) - 5} more cycles")
        else:
            lines.extend([
                "",
                "### CIRCULAR IMPORTS",
                "No circular dependencies detected",
            ])

        # Summary stats
        lines.extend([
            "",
            f"### LEAF FILES (safe to refactor): {self.leaf_count} files",
            f"### TOPOLOGICAL LEVELS: {len(self.topological_levels)} levels",
        ])

        # Show level distribution
        if self.topological_levels:
            lines.append("")
            lines.append("Level distribution:")
            for level_idx, level_files in enumerate(self.topological_levels[:5]):
                lines.append(f"- Level {level_idx}: {len(level_files)} files")
            if len(self.topological_levels) > 5:
                remaining_files = sum(
                    len(level) for level in self.topological_levels[5:]
                )
                lines.append(f"- Levels 5-{len(self.topological_levels)-1}: {remaining_files} files")

        return "\n".join(lines)

    @classmethod
    def from_dependency_context(
        cls,
        ctx: "DependencyContext",
        cycles: List[List[str]],
        levels: List[List[str]],
        edge_reduction: float
    ) -> "HighImpactSummary":
        """Build summary from analyzed context.

        Args:
            ctx: DependencyContext from AST analyzer (for reverse dependencies)
            cycles: Cycle groups from Tarjan's algorithm
            levels: Topological levels from Kahn's algorithm
            edge_reduction: Percentage of edges removed by transitive reduction

        Returns:
            HighImpactSummary ready for prompt injection
        """
        # Categorize by impact
        critical: List[Tuple[str, int]] = []
        high: List[Tuple[str, int]] = []
        leaf_count = 0

        for file_path, dependents in ctx.reverse_dependencies.items():
            count = len(dependents)
            if count >= 30:
                critical.append((file_path, count))
            elif count >= 15:
                high.append((file_path, count))
            elif count == 0:
                leaf_count += 1

        # Also count files that have no reverse dependencies at all
        # (not in reverse_dependencies dict = no one imports them)
        all_files = set(ctx.symbol_table.keys()) | set(ctx.dependency_graph.keys())
        files_with_dependents = set(ctx.reverse_dependencies.keys())
        files_without_dependents = all_files - files_with_dependents
        leaf_count += len(files_without_dependents)

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

    @classmethod
    def from_graph_result(
        cls,
        graph_result: "GraphAnalysisResult",
        reverse_dependencies: Dict[str, List[str]],
        total_files: int
    ) -> "HighImpactSummary":
        """Build summary from GraphAnalysisResult.

        Alternative factory method that takes GraphAnalysisResult directly
        instead of DependencyContext.

        Args:
            graph_result: GraphAnalysisResult from analyze_graph()
            reverse_dependencies: Reverse dependency map
            total_files: Total number of files analyzed

        Returns:
            HighImpactSummary ready for prompt injection
        """
        # Categorize by impact
        critical: List[Tuple[str, int]] = []
        high: List[Tuple[str, int]] = []
        leaf_count = 0

        for file_path, dependents in reverse_dependencies.items():
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
            cycles=graph_result.cycles,
            topological_levels=graph_result.topological_levels,
            leaf_count=leaf_count,
            total_files=total_files,
            edge_reduction_pct=graph_result.edge_reduction_pct
        )
