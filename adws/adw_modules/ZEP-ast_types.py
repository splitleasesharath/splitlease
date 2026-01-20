"""
AST Types for Dependency Analysis

Data structures for representing exports, imports, and dependency relationships
extracted from JavaScript/TypeScript files via AST parsing.

Target Languages: JavaScript (.js, .jsx, .mjs, .cjs) and TypeScript (.ts, .tsx)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from enum import Enum
from datetime import datetime
from pathlib import Path
import hashlib
import json
import glob


# Supported file extensions for JS/TS analysis
SUPPORTED_EXTENSIONS = frozenset({'.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'})


class ExportType(str, Enum):
    """Types of export statements in JavaScript/TypeScript."""
    NAMED = "named"           # export { foo, bar }
    DEFAULT = "default"       # export default function
    RE_EXPORT = "re-export"   # export { foo } from './other'
    TYPE = "type"             # export type { Foo }
    DECLARATION = "declaration"  # export const foo = ...


class ImportType(str, Enum):
    """Types of import statements in JavaScript/TypeScript."""
    NAMED = "named"           # import { foo } from './mod'
    DEFAULT = "default"       # import foo from './mod'
    NAMESPACE = "namespace"   # import * as foo from './mod'
    SIDE_EFFECT = "side-effect"  # import './styles.css'
    DYNAMIC = "dynamic"       # await import('./mod')
    TYPE = "type"             # import type { Foo }


@dataclass
class ExportedSymbol:
    """An exported symbol from a JavaScript/TypeScript file.

    Attributes:
        name: The exported name (what consumers import as)
        export_type: Type of export (named, default, re-export, etc.)
        line: Line number in source file (1-based)
        source_file: For re-exports, the original source module
        original_name: For aliased exports like `export { foo as bar }`
    """
    name: str
    export_type: ExportType
    line: int
    source_file: Optional[str] = None  # For re-exports only
    original_name: Optional[str] = None  # For aliased exports


@dataclass
class ImportedSymbol:
    """An imported symbol in a JavaScript/TypeScript file.

    Attributes:
        name: The imported symbol name (or '*' for namespace imports)
        import_type: Type of import (named, default, namespace, etc.)
        source: The module specifier as written (e.g., '../../utils/helper')
        resolved_path: Resolved absolute path to the source file
        line: Line number in source file (1-based)
        alias: For aliased imports like `import { foo as bar }`
    """
    name: str
    import_type: ImportType
    source: str
    resolved_path: Optional[str] = None  # Resolved path (None for node_modules)
    line: int = 0
    alias: Optional[str] = None  # For `import { foo as bar }`


@dataclass
class FileAnalysis:
    """Complete analysis results for a single JS/TS file.

    Attributes:
        file_path: Absolute path to the file
        relative_path: Path relative to analysis root
        exports: List of exported symbols
        imports: List of imported symbols
        dependencies: Set of resolved file paths this file imports from
        parse_errors: Any errors encountered during parsing
    """
    file_path: str
    relative_path: str
    exports: List[ExportedSymbol] = field(default_factory=list)
    imports: List[ImportedSymbol] = field(default_factory=list)
    dependencies: Set[str] = field(default_factory=set)  # Resolved file paths
    parse_errors: List[str] = field(default_factory=list)

    @property
    def export_names(self) -> List[str]:
        """Get list of all exported symbol names."""
        return [exp.name for exp in self.exports]

    @property
    def import_sources(self) -> Set[str]:
        """Get set of all import source modules."""
        return {imp.source for imp in self.imports}


@dataclass
class DependencyContext:
    """Pre-computed semantic context for audit.

    This is the main output of AST analysis, containing:
    - symbol_table: What each file exports
    - dependency_graph: What each file imports (and from where)
    - reverse_dependencies: Who depends on each file (reverse lookup)

    Attributes:
        root_dir: The directory that was analyzed
        symbol_table: Mapping of relative_path -> List[ExportedSymbol]
        dependency_graph: Mapping of relative_path -> List[ImportedSymbol]
        reverse_dependencies: Mapping of relative_path -> List[files that import it]
        total_files: Number of files analyzed
        total_exports: Total number of exported symbols
        total_imports: Total number of import statements
        analysis_timestamp: When the analysis was performed
        parse_error_count: Number of files with parse errors
        content_hash: SHA256 hash of all analyzed file contents (for cache validation)
    """
    root_dir: str
    symbol_table: Dict[str, List[ExportedSymbol]] = field(default_factory=dict)
    dependency_graph: Dict[str, List[ImportedSymbol]] = field(default_factory=dict)
    reverse_dependencies: Dict[str, List[str]] = field(default_factory=dict)
    total_files: int = 0
    total_exports: int = 0
    total_imports: int = 0
    analysis_timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    parse_error_count: int = 0
    content_hash: str = ""  # SHA256 of all file contents for cache invalidation

    def get_dependents(self, file_path: str) -> List[str]:
        """Get list of files that depend on (import from) the given file.

        Args:
            file_path: Relative path to the file

        Returns:
            List of relative paths of files that import from this file
        """
        return self.reverse_dependencies.get(file_path, [])

    def get_dependencies(self, file_path: str) -> List[str]:
        """Get list of files that the given file imports from.

        Args:
            file_path: Relative path to the file

        Returns:
            List of resolved paths that this file imports from
        """
        imports = self.dependency_graph.get(file_path, [])
        return [imp.resolved_path for imp in imports if imp.resolved_path]

    def get_exports(self, file_path: str) -> List[str]:
        """Get list of exported symbol names from the given file.

        Args:
            file_path: Relative path to the file

        Returns:
            List of exported symbol names
        """
        exports = self.symbol_table.get(file_path, [])
        return [exp.name for exp in exports]

    def to_prompt_context(self) -> str:
        """Format as markdown for inclusion in audit prompt.

        Returns:
            Markdown-formatted string suitable for LLM consumption
        """
        lines = []

        # Symbol Table section
        lines.append("### Symbol Table (Exports by File)\n")
        lines.append("| File | Exports |")
        lines.append("|------|---------|")

        for file_path, exports in sorted(self.symbol_table.items()):
            if exports:
                export_names = ", ".join(f"`{e.name}`" for e in exports[:10])
                if len(exports) > 10:
                    export_names += f", ... (+{len(exports) - 10} more)"
                lines.append(f"| `{file_path}` | {export_names} |")

        lines.append("")

        # Dependency Graph section
        lines.append("### Dependency Graph (Imports by File)\n")
        lines.append("| File | Imports From |")
        lines.append("|------|--------------|")

        for file_path, imports in sorted(self.dependency_graph.items()):
            if imports:
                # Group imports by source
                by_source: Dict[str, List[str]] = {}
                for imp in imports:
                    source = imp.resolved_path or imp.source
                    if source not in by_source:
                        by_source[source] = []
                    if imp.name != "*":
                        by_source[source].append(imp.name)

                import_strs = []
                for source, names in list(by_source.items())[:5]:
                    if names:
                        import_strs.append(f"`{source}` ({', '.join(names[:3])})")
                    else:
                        import_strs.append(f"`{source}` (*)")

                if len(by_source) > 5:
                    import_strs.append(f"... (+{len(by_source) - 5} more)")

                lines.append(f"| `{file_path}` | {'; '.join(import_strs)} |")

        lines.append("")

        # Reverse Dependencies section
        lines.append("### Reverse Dependencies (Who Depends on Each File)\n")
        lines.append("| File | Depended On By |")
        lines.append("|------|----------------|")

        # Sort by number of dependents (most depended-on first)
        sorted_deps = sorted(
            self.reverse_dependencies.items(),
            key=lambda x: len(x[1]),
            reverse=True
        )

        for file_path, dependents in sorted_deps[:30]:  # Top 30
            if dependents:
                dep_list = ", ".join(f"`{d}`" for d in dependents[:5])
                if len(dependents) > 5:
                    dep_list += f", ... (+{len(dependents) - 5} more)"
                lines.append(f"| `{file_path}` | {dep_list} |")

        lines.append("")

        # Summary section
        lines.append("### Summary\n")
        lines.append(f"- **Total files analyzed**: {self.total_files}")
        lines.append(f"- **Total exports**: {self.total_exports}")
        lines.append(f"- **Total import relationships**: {self.total_imports}")

        # Files with most dependents
        if sorted_deps:
            top_deps = sorted_deps[:5]
            top_list = ", ".join(f"`{f}` ({len(d)})" for f, d in top_deps if d)
            lines.append(f"- **Files with most dependents**: {top_list}")

        if self.parse_error_count > 0:
            lines.append(f"- **Parse errors**: {self.parse_error_count} files")

        return "\n".join(lines)

    def to_json_dict(self) -> dict:
        """Convert to JSON-serializable dictionary.

        Returns:
            Dictionary suitable for JSON serialization
        """
        return {
            "generated_at": self.analysis_timestamp,
            "root_dir": self.root_dir,
            "content_hash": self.content_hash,
            "total_files": self.total_files,
            "total_exports": self.total_exports,
            "total_imports": self.total_imports,
            "parse_error_count": self.parse_error_count,
            "symbol_table": {
                path: [
                    {
                        "name": exp.name,
                        "type": exp.export_type.value,
                        "line": exp.line,
                        "source_file": exp.source_file,
                        "original_name": exp.original_name
                    }
                    for exp in exports
                ]
                for path, exports in self.symbol_table.items()
            },
            "dependency_graph": {
                path: [
                    {
                        "name": imp.name,
                        "type": imp.import_type.value,
                        "source": imp.source,
                        "resolved_path": imp.resolved_path,
                        "line": imp.line,
                        "alias": imp.alias
                    }
                    for imp in imports
                ]
                for path, imports in self.dependency_graph.items()
            },
            "reverse_dependencies": dict(self.reverse_dependencies)
        }

    def save(self, cache_path: Path) -> None:
        """Save analysis results to a JSON cache file.

        Args:
            cache_path: Path where the cache file should be saved
        """
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(
            json.dumps(self.to_json_dict(), indent=2),
            encoding='utf-8'
        )

    @classmethod
    def load(cls, cache_path: Path) -> Optional["DependencyContext"]:
        """Load analysis results from a JSON cache file.

        Args:
            cache_path: Path to the cache file

        Returns:
            DependencyContext if cache exists and is valid, None otherwise
        """
        if not cache_path.exists():
            return None

        try:
            data = json.loads(cache_path.read_text(encoding='utf-8'))
            return cls.from_json_dict(data)
        except (json.JSONDecodeError, KeyError, ValueError):
            return None

    @classmethod
    def from_json_dict(cls, data: dict) -> "DependencyContext":
        """Reconstruct DependencyContext from JSON dictionary.

        Args:
            data: Dictionary from to_json_dict()

        Returns:
            Reconstructed DependencyContext object
        """
        # Reconstruct symbol_table
        symbol_table: Dict[str, List[ExportedSymbol]] = {}
        for path, exports_data in data.get("symbol_table", {}).items():
            symbol_table[path] = [
                ExportedSymbol(
                    name=exp["name"],
                    export_type=ExportType(exp["type"]),
                    line=exp["line"],
                    source_file=exp.get("source_file"),
                    original_name=exp.get("original_name")
                )
                for exp in exports_data
            ]

        # Reconstruct dependency_graph
        dependency_graph: Dict[str, List[ImportedSymbol]] = {}
        for path, imports_data in data.get("dependency_graph", {}).items():
            dependency_graph[path] = [
                ImportedSymbol(
                    name=imp["name"],
                    import_type=ImportType(imp["type"]),
                    source=imp["source"],
                    resolved_path=imp.get("resolved_path"),
                    line=imp.get("line", 0),
                    alias=imp.get("alias")
                )
                for imp in imports_data
            ]

        return cls(
            root_dir=data["root_dir"],
            symbol_table=symbol_table,
            dependency_graph=dependency_graph,
            reverse_dependencies=data.get("reverse_dependencies", {}),
            total_files=data.get("total_files", 0),
            total_exports=data.get("total_exports", 0),
            total_imports=data.get("total_imports", 0),
            analysis_timestamp=data.get("generated_at", datetime.now().isoformat()),
            parse_error_count=data.get("parse_error_count", 0),
            content_hash=data.get("content_hash", "")
        )

    @staticmethod
    def compute_content_hash(root_dir: str) -> str:
        """Compute a SHA256 hash of all JS/TS file contents in a directory.

        The hash includes file paths and contents, sorted for determinism.
        This is used to detect when files have changed and cache is stale.

        Args:
            root_dir: Directory to compute hash for

        Returns:
            SHA256 hex digest string
        """
        root_path = Path(root_dir).resolve()
        hasher = hashlib.sha256()

        # Discover all JS/TS files
        all_files: List[Path] = []
        for ext in SUPPORTED_EXTENSIONS:
            pattern = str(root_path / '**' / f'*{ext}')
            all_files.extend(Path(p) for p in glob.glob(pattern, recursive=True))

        # Skip node_modules
        all_files = [f for f in all_files if 'node_modules' not in str(f)]

        # Sort for deterministic ordering
        all_files.sort()

        # Hash each file's path and content
        for file_path in all_files:
            try:
                relative = str(file_path.relative_to(root_path))
                content = file_path.read_bytes()
                hasher.update(relative.encode('utf-8'))
                hasher.update(b'\x00')  # Separator
                hasher.update(content)
                hasher.update(b'\x00')  # Separator
            except (IOError, ValueError):
                continue

        return hasher.hexdigest()


def is_refactorable_file(file_path: str) -> bool:
    """Check if file is a JavaScript/TypeScript file we should analyze.

    Args:
        file_path: Path to the file (can be relative or absolute)

    Returns:
        True if the file extension indicates a JS/TS file
    """
    from pathlib import Path
    ext = Path(file_path).suffix.lower()
    return ext in SUPPORTED_EXTENSIONS
