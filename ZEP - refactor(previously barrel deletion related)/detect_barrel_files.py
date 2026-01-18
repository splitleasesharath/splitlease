#!/usr/bin/env -S uv run
# /// script
# dependencies = ["tree-sitter", "tree-sitter-javascript", "tree-sitter-typescript"]
# ///

"""
Barrel File Detector

Scans a JavaScript/TypeScript codebase to identify:
1. Barrel files (files with `export * from` statements)
2. Hub files (files with many re-exports)
3. Files that import from barrels (consumers to update)

Usage:
    uv run detect_barrel_files.py <target_path> [--json] [--min-reexports N]

Examples:
    uv run detect_barrel_files.py app/src
    uv run detect_barrel_files.py app/src --json > barrels.json
    uv run detect_barrel_files.py app/src --min-reexports 3
"""

import argparse
import glob
import json
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import List, Dict, Set, Optional
from collections import defaultdict

import tree_sitter_javascript as ts_js
import tree_sitter_typescript as ts_ts
from tree_sitter import Language, Parser, Node


# =============================================================================
# Configuration
# =============================================================================

SUPPORTED_EXTENSIONS = {'.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'}

EXCLUDE_PATTERNS = {
    'node_modules',
    'dist',
    'build',
    '.next',
    'coverage',
    '__tests__',
    '__snapshots__',
}


# =============================================================================
# Data Types
# =============================================================================

@dataclass
class StarExport:
    """A star re-export: export * from './module'"""
    source: str
    line: int
    resolved_path: Optional[str] = None


@dataclass
class NamedReexport:
    """A named re-export: export { foo } from './module'"""
    names: List[str]
    source: str
    line: int
    resolved_path: Optional[str] = None


@dataclass
class BarrelFile:
    """A file identified as a barrel (re-exports from other modules)."""
    file_path: str
    relative_path: str
    star_exports: List[StarExport] = field(default_factory=list)
    named_reexports: List[NamedReexport] = field(default_factory=list)
    direct_exports: int = 0  # Exports defined in this file (not re-exports)

    @property
    def total_reexport_sources(self) -> int:
        """Number of different modules this file re-exports from."""
        sources = set()
        for se in self.star_exports:
            sources.add(se.source)
        for nr in self.named_reexports:
            sources.add(nr.source)
        return len(sources)

    @property
    def is_pure_barrel(self) -> bool:
        """True if file ONLY re-exports (no local definitions)."""
        return self.direct_exports == 0 and self.total_reexport_sources > 0

    @property
    def barrel_score(self) -> float:
        """Score from 0-1 indicating how "barrel-like" this file is."""
        if self.total_reexport_sources == 0:
            return 0.0
        total = self.direct_exports + self.total_reexport_sources
        return self.total_reexport_sources / total

    @property
    def severity(self) -> str:
        """Categorize barrel severity."""
        if len(self.star_exports) > 0:
            return "high"  # Star exports are worst - hide actual exports
        if self.total_reexport_sources > 5:
            return "high"
        if self.total_reexport_sources > 2:
            return "medium"
        return "low"


@dataclass
class BarrelConsumer:
    """A file that imports from a barrel."""
    file_path: str
    barrel_path: str
    imported_names: List[str]
    line: int
    import_statement: str


@dataclass
class BarrelReport:
    """Complete report of barrel files in a codebase."""
    root_dir: str
    total_files_scanned: int
    barrel_files: List[BarrelFile]
    consumers: Dict[str, List[BarrelConsumer]]  # barrel_path -> consumers
    circular_barrels: List[List[str]]  # Barrels that import from each other

    @property
    def high_severity_count(self) -> int:
        return len([b for b in self.barrel_files if b.severity == "high"])

    @property
    def total_star_exports(self) -> int:
        return sum(len(b.star_exports) for b in self.barrel_files)


# =============================================================================
# Parser Setup
# =============================================================================

class BarrelDetector:
    """Detects barrel files using tree-sitter parsing."""

    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir).resolve()
        self.parser = Parser()

        # Build language objects
        self.js_language = Language(ts_js.language())
        self.ts_language = Language(ts_ts.language_typescript())
        self.tsx_language = Language(ts_ts.language_tsx())

    def _get_language(self, file_path: Path) -> Language:
        """Select parser language based on file extension."""
        suffix = file_path.suffix.lower()
        if suffix == '.ts':
            return self.ts_language
        elif suffix in ('.tsx', '.jsx'):
            return self.tsx_language
        return self.js_language

    def _get_node_text(self, node: Node, content: bytes) -> str:
        """Extract text from AST node."""
        return content[node.start_byte:node.end_byte].decode('utf-8')

    def _extract_string_content(self, node: Node, content: bytes) -> str:
        """Extract string content without quotes."""
        text = self._get_node_text(node, content)
        if text.startswith(("'", '"', '`')) and len(text) >= 2:
            return text[1:-1]
        return text

    def _should_skip(self, file_path: Path) -> bool:
        """Check if file should be excluded."""
        path_str = str(file_path)
        for pattern in EXCLUDE_PATTERNS:
            if f'/{pattern}/' in path_str or f'\\{pattern}\\' in path_str:
                return True
            if path_str.endswith(f'/{pattern}') or path_str.endswith(f'\\{pattern}'):
                return True
        return False

    def _resolve_import_path(self, source: str, from_file: Path) -> Optional[str]:
        """Resolve relative import to a file path."""
        if not source.startswith('.'):
            return None  # External package

        base_dir = from_file.parent
        resolved = (base_dir / source).resolve()

        # Try extensions
        for ext in SUPPORTED_EXTENSIONS:
            candidate = Path(str(resolved) + ext)
            if candidate.exists():
                try:
                    return str(candidate.relative_to(self.root_dir))
                except ValueError:
                    return str(candidate)

        # Try index files
        for ext in SUPPORTED_EXTENSIONS:
            candidate = resolved / f'index{ext}'
            if candidate.exists():
                try:
                    return str(candidate.relative_to(self.root_dir))
                except ValueError:
                    return str(candidate)

        if resolved.exists():
            try:
                return str(resolved.relative_to(self.root_dir))
            except ValueError:
                return str(resolved)

        return None

    def analyze_file(self, file_path: Path) -> Optional[BarrelFile]:
        """Analyze a single file for barrel patterns."""
        try:
            relative_path = str(file_path.relative_to(self.root_dir))
        except ValueError:
            relative_path = str(file_path)

        try:
            content = file_path.read_text(encoding='utf-8')
            content_bytes = content.encode('utf-8')
        except Exception:
            return None

        self.parser.language = self._get_language(file_path)
        tree = self.parser.parse(content_bytes)

        star_exports: List[StarExport] = []
        named_reexports: List[NamedReexport] = []
        direct_exports = 0

        def visit(node: Node):
            nonlocal direct_exports

            if node.type == 'export_statement':
                line = node.start_point[0] + 1

                # Find source string (from clause)
                source_node = None
                for child in node.children:
                    if child.type == 'string':
                        source_node = child
                        break

                # Check for star export: export * from './x'
                has_star = any(child.type == '*' for child in node.children)

                if has_star and source_node:
                    source = self._extract_string_content(source_node, content_bytes)
                    resolved = self._resolve_import_path(source, file_path)
                    star_exports.append(StarExport(
                        source=source,
                        line=line,
                        resolved_path=resolved
                    ))

                # Check for named re-export: export { x, y } from './z'
                elif source_node:
                    source = self._extract_string_content(source_node, content_bytes)
                    resolved = self._resolve_import_path(source, file_path)

                    # Extract exported names
                    names = []
                    export_clause = None
                    for child in node.children:
                        if child.type == 'export_clause':
                            export_clause = child
                            break

                    if export_clause:
                        for spec in export_clause.children:
                            if spec.type == 'export_specifier':
                                name_node = spec.child_by_field_name('name')
                                alias_node = spec.child_by_field_name('alias')
                                if alias_node:
                                    names.append(self._get_node_text(alias_node, content_bytes))
                                elif name_node:
                                    names.append(self._get_node_text(name_node, content_bytes))

                    if names:
                        named_reexports.append(NamedReexport(
                            names=names,
                            source=source,
                            line=line,
                            resolved_path=resolved
                        ))

                # Direct export (not a re-export)
                elif not source_node:
                    direct_exports += 1

            for child in node.children:
                visit(child)

        visit(tree.root_node)

        # Only return if this file has re-exports
        if star_exports or named_reexports:
            return BarrelFile(
                file_path=str(file_path),
                relative_path=relative_path,
                star_exports=star_exports,
                named_reexports=named_reexports,
                direct_exports=direct_exports
            )

        return None

    def find_consumers(self, barrel_paths: Set[str]) -> Dict[str, List[BarrelConsumer]]:
        """Find all files that import from the identified barrels."""
        consumers: Dict[str, List[BarrelConsumer]] = defaultdict(list)

        # Discover all files
        files: List[Path] = []
        for ext in SUPPORTED_EXTENSIONS:
            pattern = str(self.root_dir / '**' / f'*{ext}')
            files.extend(Path(p) for p in glob.glob(pattern, recursive=True))

        files = [f for f in files if not self._should_skip(f)]

        for file_path in files:
            try:
                content = file_path.read_text(encoding='utf-8')
                content_bytes = content.encode('utf-8')
            except Exception:
                continue

            self.parser.language = self._get_language(file_path)
            tree = self.parser.parse(content_bytes)

            def visit(node: Node):
                if node.type == 'import_statement':
                    line = node.start_point[0] + 1

                    # Get source
                    source_node = None
                    for child in node.children:
                        if child.type == 'string':
                            source_node = child
                            break

                    if source_node:
                        source = self._extract_string_content(source_node, content_bytes)
                        resolved = self._resolve_import_path(source, file_path)

                        if resolved and resolved in barrel_paths:
                            # Extract imported names
                            names = []
                            import_clause = None
                            for child in node.children:
                                if child.type == 'import_clause':
                                    import_clause = child
                                    break

                            if import_clause:
                                for child in import_clause.children:
                                    if child.type == 'identifier':
                                        names.append(self._get_node_text(child, content_bytes))
                                    elif child.type == 'named_imports':
                                        for spec in child.children:
                                            if spec.type == 'import_specifier':
                                                name_node = spec.child_by_field_name('name')
                                                if name_node:
                                                    names.append(self._get_node_text(name_node, content_bytes))
                                    elif child.type == 'namespace_import':
                                        names.append('* (namespace)')

                            try:
                                rel_path = str(file_path.relative_to(self.root_dir))
                            except ValueError:
                                rel_path = str(file_path)

                            consumers[resolved].append(BarrelConsumer(
                                file_path=rel_path,
                                barrel_path=resolved,
                                imported_names=names,
                                line=line,
                                import_statement=self._get_node_text(node, content_bytes)
                            ))

                for child in node.children:
                    visit(child)

            visit(tree.root_node)

        return dict(consumers)

    def detect_circular_barrels(self, barrels: List[BarrelFile]) -> List[List[str]]:
        """Find barrels that import from each other."""
        barrel_paths = {b.relative_path for b in barrels}

        # Build graph of barrel -> barrels it re-exports from
        graph: Dict[str, Set[str]] = defaultdict(set)
        for barrel in barrels:
            for se in barrel.star_exports:
                if se.resolved_path and se.resolved_path in barrel_paths:
                    graph[barrel.relative_path].add(se.resolved_path)
            for nr in barrel.named_reexports:
                if nr.resolved_path and nr.resolved_path in barrel_paths:
                    graph[barrel.relative_path].add(nr.resolved_path)

        # Simple cycle detection
        cycles = []
        visited = set()

        def dfs(node: str, path: List[str]):
            if node in path:
                cycle_start = path.index(node)
                cycles.append(path[cycle_start:] + [node])
                return
            if node in visited:
                return
            visited.add(node)
            for neighbor in graph.get(node, set()):
                dfs(neighbor, path + [node])

        for barrel_path in barrel_paths:
            dfs(barrel_path, [])

        return cycles

    def scan(self, min_reexports: int = 1) -> BarrelReport:
        """Scan the codebase for barrel files."""
        # Discover all files
        files: List[Path] = []
        for ext in SUPPORTED_EXTENSIONS:
            pattern = str(self.root_dir / '**' / f'*{ext}')
            files.extend(Path(p) for p in glob.glob(pattern, recursive=True))

        files = [f for f in files if not self._should_skip(f)]

        # Analyze each file
        barrels: List[BarrelFile] = []
        for file_path in files:
            result = self.analyze_file(file_path)
            if result and result.total_reexport_sources >= min_reexports:
                barrels.append(result)

        # Sort by severity and re-export count
        barrels.sort(key=lambda b: (
            0 if b.severity == "high" else 1 if b.severity == "medium" else 2,
            -b.total_reexport_sources
        ))

        # Find consumers
        barrel_paths = {b.relative_path for b in barrels}
        consumers = self.find_consumers(barrel_paths)

        # Detect circular barrel dependencies
        circular = self.detect_circular_barrels(barrels)

        return BarrelReport(
            root_dir=str(self.root_dir),
            total_files_scanned=len(files),
            barrel_files=barrels,
            consumers=consumers,
            circular_barrels=circular
        )


# =============================================================================
# Output Formatting
# =============================================================================

def format_report_text(report: BarrelReport) -> str:
    """Format report as readable text."""
    lines = []

    lines.append("=" * 70)
    lines.append("BARREL FILE DETECTION REPORT")
    lines.append("=" * 70)
    lines.append(f"\nRoot: {report.root_dir}")
    lines.append(f"Files scanned: {report.total_files_scanned}")
    lines.append(f"Barrel files found: {len(report.barrel_files)}")
    lines.append(f"High severity: {report.high_severity_count}")
    lines.append(f"Total star exports: {report.total_star_exports}")

    if report.circular_barrels:
        lines.append(f"\n⚠️  CIRCULAR BARREL DEPENDENCIES: {len(report.circular_barrels)}")
        for cycle in report.circular_barrels[:5]:
            lines.append(f"   {' -> '.join(cycle)}")

    lines.append("\n" + "-" * 70)
    lines.append("BARREL FILES (sorted by severity)")
    lines.append("-" * 70)

    for barrel in report.barrel_files:
        severity_icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}[barrel.severity]
        consumer_count = len(report.consumers.get(barrel.relative_path, []))

        lines.append(f"\n{severity_icon} {barrel.relative_path}")
        lines.append(f"   Severity: {barrel.severity.upper()}")
        lines.append(f"   Star exports: {len(barrel.star_exports)}")
        lines.append(f"   Named re-exports: {len(barrel.named_reexports)}")
        lines.append(f"   Direct exports: {barrel.direct_exports}")
        lines.append(f"   Consumers: {consumer_count} files")

        if barrel.star_exports:
            lines.append("   Star export sources:")
            for se in barrel.star_exports:
                lines.append(f"      - {se.source} (line {se.line})")

        if barrel.named_reexports:
            lines.append("   Named re-export sources:")
            for nr in barrel.named_reexports[:5]:
                names_preview = ", ".join(nr.names[:3])
                if len(nr.names) > 3:
                    names_preview += f" +{len(nr.names)-3} more"
                lines.append(f"      - {nr.source}: {names_preview}")

        # Show consumers
        consumers = report.consumers.get(barrel.relative_path, [])
        if consumers:
            lines.append(f"   Imported by:")
            for consumer in consumers[:5]:
                names = ", ".join(consumer.imported_names[:3]) or "(default/namespace)"
                lines.append(f"      - {consumer.file_path}:{consumer.line} [{names}]")
            if len(consumers) > 5:
                lines.append(f"      ... and {len(consumers) - 5} more files")

    # Summary recommendations
    lines.append("\n" + "=" * 70)
    lines.append("RECOMMENDATIONS")
    lines.append("=" * 70)

    high_severity = [b for b in report.barrel_files if b.severity == "high"]
    if high_severity:
        lines.append(f"\n1. Fix {len(high_severity)} high-severity barrels first:")
        for b in high_severity[:5]:
            consumers = len(report.consumers.get(b.relative_path, []))
            lines.append(f"   - {b.relative_path} ({consumers} consumers)")

    if report.circular_barrels:
        lines.append(f"\n2. Break {len(report.circular_barrels)} circular barrel dependencies")

    pure_barrels = [b for b in report.barrel_files if b.is_pure_barrel]
    if pure_barrels:
        lines.append(f"\n3. Consider deleting {len(pure_barrels)} pure barrel files:")
        for b in pure_barrels[:5]:
            lines.append(f"   - {b.relative_path}")

    return "\n".join(lines)


def format_report_json(report: BarrelReport) -> str:
    """Format report as JSON."""
    data = {
        "root_dir": report.root_dir,
        "total_files_scanned": report.total_files_scanned,
        "summary": {
            "barrel_count": len(report.barrel_files),
            "high_severity_count": report.high_severity_count,
            "total_star_exports": report.total_star_exports,
            "circular_barrel_count": len(report.circular_barrels),
        },
        "circular_barrels": report.circular_barrels,
        "barrel_files": [
            {
                "path": b.relative_path,
                "severity": b.severity,
                "is_pure_barrel": b.is_pure_barrel,
                "barrel_score": round(b.barrel_score, 2),
                "star_exports": [
                    {"source": se.source, "line": se.line, "resolved": se.resolved_path}
                    for se in b.star_exports
                ],
                "named_reexports": [
                    {"source": nr.source, "names": nr.names, "line": nr.line}
                    for nr in b.named_reexports
                ],
                "direct_exports": b.direct_exports,
                "consumer_count": len(report.consumers.get(b.relative_path, [])),
                "consumers": [
                    {
                        "file": c.file_path,
                        "line": c.line,
                        "imports": c.imported_names
                    }
                    for c in report.consumers.get(b.relative_path, [])
                ]
            }
            for b in report.barrel_files
        ]
    }
    return json.dumps(data, indent=2)


# =============================================================================
# CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Detect barrel files in a JavaScript/TypeScript codebase"
    )
    parser.add_argument("target_path", help="Directory to scan")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument(
        "--min-reexports", type=int, default=1,
        help="Minimum re-export sources to be considered a barrel (default: 1)"
    )

    args = parser.parse_args()

    target = Path(args.target_path)
    if not target.exists():
        print(f"Error: Path does not exist: {target}", file=sys.stderr)
        sys.exit(1)

    detector = BarrelDetector(str(target))
    report = detector.scan(min_reexports=args.min_reexports)

    if args.json:
        print(format_report_json(report))
    else:
        print(format_report_text(report))


if __name__ == "__main__":
    main()
