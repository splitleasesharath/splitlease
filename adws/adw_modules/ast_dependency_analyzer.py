"""
AST Dependency Analyzer

Uses tree-sitter to parse JavaScript/TypeScript files and extract:
- Exports (named, default, re-exports)
- Imports (named, default, namespace, side-effect)
- Builds dependency graph and reverse dependency map

Target Languages: JavaScript (.js, .jsx, .mjs, .cjs) and TypeScript (.ts, .tsx) ONLY

Usage:
    from adws.adw_modules.ast_dependency_analyzer import analyze_dependencies

    context = analyze_dependencies("app/src/logic")
    markdown = context.to_prompt_context()
"""

import os
import glob
import hashlib
from pathlib import Path
from typing import Optional, List, Tuple
from collections import defaultdict

import tree_sitter_javascript as ts_js
import tree_sitter_typescript as ts_ts
from tree_sitter import Language, Parser, Node

# Support both package import and direct script execution
try:
    from .ast_types import (
        DependencyContext,
        FileAnalysis,
        ExportedSymbol,
        ImportedSymbol,
        ExportType,
        ImportType,
        SUPPORTED_EXTENSIONS,
        is_refactorable_file,
    )
except ImportError:
    # Running as script directly (python ast_dependency_analyzer.py)
    from ast_types import (
        DependencyContext,
        FileAnalysis,
        ExportedSymbol,
        ImportedSymbol,
        ExportType,
        ImportType,
        SUPPORTED_EXTENSIONS,
        is_refactorable_file,
    )


class ASTDependencyAnalyzer:
    """AST-based dependency analyzer for JavaScript/TypeScript codebases.

    Uses tree-sitter for accurate parsing of:
    - ES6 imports/exports
    - CommonJS require/module.exports
    - TypeScript type imports/exports
    - Re-exports and barrel files
    """

    def __init__(self, root_dir: str):
        """Initialize the analyzer.

        Args:
            root_dir: Root directory to analyze (e.g., "app/src/logic")
        """
        self.root_dir = Path(root_dir).resolve()
        self.parser = Parser()

        # Build language objects
        self.js_language = Language(ts_js.language())
        self.ts_language = Language(ts_ts.language_typescript())
        self.tsx_language = Language(ts_ts.language_tsx())

    def _get_language(self, file_path: Path) -> Language:
        """Select parser language based on file extension.

        Args:
            file_path: Path to the file

        Returns:
            Appropriate tree-sitter Language object
        """
        suffix = file_path.suffix.lower()
        if suffix == '.ts':
            return self.ts_language
        elif suffix in ('.tsx', '.jsx'):
            return self.tsx_language
        else:  # .js, .mjs, .cjs
            return self.js_language

    def _get_node_text(self, node: Node, content: bytes) -> str:
        """Extract text content from an AST node.

        Args:
            node: tree-sitter Node
            content: Source file content as bytes

        Returns:
            Text content of the node
        """
        return content[node.start_byte:node.end_byte].decode('utf-8')

    def _find_child_by_type(self, node: Node, type_name: str) -> Optional[Node]:
        """Find first child node of given type.

        Args:
            node: Parent node to search in
            type_name: Type name to find

        Returns:
            First matching child node or None
        """
        for child in node.children:
            if child.type == type_name:
                return child
        return None

    def _find_children_by_type(self, node: Node, type_name: str) -> List[Node]:
        """Find all child nodes of given type.

        Args:
            node: Parent node to search in
            type_name: Type name to find

        Returns:
            List of matching child nodes
        """
        return [child for child in node.children if child.type == type_name]

    def _extract_string_content(self, node: Node, content: bytes) -> str:
        """Extract string content, removing quotes.

        Args:
            node: String node
            content: Source content

        Returns:
            String content without quotes
        """
        text = self._get_node_text(node, content)
        # Remove quotes (single, double, or template)
        if text.startswith(("'", '"', '`')) and len(text) >= 2:
            return text[1:-1]
        return text

    def _extract_exports(self, root: Node, content: bytes) -> List[ExportedSymbol]:
        """Extract all export statements from AST.

        Handles:
        - export { foo, bar }
        - export { foo as bar }
        - export default function/class/expression
        - export const/let/var foo = ...
        - export function foo() {}
        - export class Foo {}
        - export { foo } from './other'
        - export * from './other'
        - export type { Foo } (TypeScript)

        Args:
            root: Root AST node
            content: Source file content as bytes

        Returns:
            List of ExportedSymbol objects
        """
        exports = []

        def visit(node: Node):
            # Handle export statements
            if node.type == 'export_statement':
                exports.extend(self._parse_export_statement(node, content))

            # Recurse into children
            for child in node.children:
                visit(child)

        visit(root)
        return exports

    def _parse_export_statement(self, node: Node, content: bytes) -> List[ExportedSymbol]:
        """Parse a single export statement.

        Args:
            node: export_statement AST node
            content: Source content

        Returns:
            List of ExportedSymbol objects from this statement
        """
        exports = []
        line = node.start_point[0] + 1  # 1-based line numbers

        # Check for type export (TypeScript)
        is_type_export = any(
            child.type == 'type' for child in node.children
        )

        # Check for re-export source
        source_node = None
        for child in node.children:
            if child.type == 'string':
                source_node = child
                break

        source_file = None
        if source_node:
            source_file = self._extract_string_content(source_node, content)

        # Handle export clause: export { foo, bar } or export { foo } from './other'
        export_clause = self._find_child_by_type(node, 'export_clause')
        if export_clause:
            for child in export_clause.children:
                if child.type == 'export_specifier':
                    name_node = child.child_by_field_name('name')
                    alias_node = child.child_by_field_name('alias')

                    if name_node:
                        original_name = self._get_node_text(name_node, content)
                        exported_name = original_name

                        if alias_node:
                            exported_name = self._get_node_text(alias_node, content)

                        export_type = ExportType.RE_EXPORT if source_file else ExportType.NAMED
                        if is_type_export:
                            export_type = ExportType.TYPE

                        exports.append(ExportedSymbol(
                            name=exported_name,
                            export_type=export_type,
                            line=line,
                            source_file=source_file,
                            original_name=original_name if alias_node else None
                        ))

        # Handle export * from './other'
        if self._find_child_by_type(node, '*') and source_file:
            exports.append(ExportedSymbol(
                name='*',
                export_type=ExportType.RE_EXPORT,
                line=line,
                source_file=source_file
            ))

        # Handle default export
        if any(child.type == 'default' for child in node.children):
            exports.append(ExportedSymbol(
                name='default',
                export_type=ExportType.DEFAULT,
                line=line
            ))

        # Handle export declarations: export const/let/var/function/class
        declaration = self._find_child_by_type(node, 'lexical_declaration')
        if declaration:
            exports.extend(self._extract_declaration_names(declaration, content, line))

        for decl_type in ['function_declaration', 'class_declaration']:
            decl = self._find_child_by_type(node, decl_type)
            if decl:
                name_node = decl.child_by_field_name('name')
                if name_node:
                    exports.append(ExportedSymbol(
                        name=self._get_node_text(name_node, content),
                        export_type=ExportType.DECLARATION,
                        line=line
                    ))

        return exports

    def _extract_declaration_names(
        self, node: Node, content: bytes, line: int
    ) -> List[ExportedSymbol]:
        """Extract variable names from lexical declarations.

        Handles: const foo = ..., const { a, b } = ..., const [x, y] = ...

        Args:
            node: lexical_declaration node
            content: Source content
            line: Line number

        Returns:
            List of ExportedSymbol for each declared variable
        """
        exports = []

        for child in node.children:
            if child.type == 'variable_declarator':
                name_node = child.child_by_field_name('name')
                if name_node:
                    if name_node.type == 'identifier':
                        exports.append(ExportedSymbol(
                            name=self._get_node_text(name_node, content),
                            export_type=ExportType.DECLARATION,
                            line=line
                        ))
                    elif name_node.type == 'object_pattern':
                        # Handle destructuring: const { a, b } = ...
                        for prop in name_node.children:
                            if prop.type in ('shorthand_property_identifier_pattern', 'shorthand_property_identifier'):
                                exports.append(ExportedSymbol(
                                    name=self._get_node_text(prop, content),
                                    export_type=ExportType.DECLARATION,
                                    line=line
                                ))
                    elif name_node.type == 'array_pattern':
                        # Handle array destructuring: const [x, y] = ...
                        for elem in name_node.children:
                            if elem.type == 'identifier':
                                exports.append(ExportedSymbol(
                                    name=self._get_node_text(elem, content),
                                    export_type=ExportType.DECLARATION,
                                    line=line
                                ))

        return exports

    def _extract_imports(self, root: Node, content: bytes) -> List[ImportedSymbol]:
        """Extract all import statements from AST.

        Handles:
        - import { foo, bar } from './mod'
        - import { foo as bar } from './mod'
        - import foo from './mod'
        - import * as foo from './mod'
        - import './styles.css'
        - import type { Foo } from './types'
        - const foo = require('./mod')
        - const { foo } = require('./mod')

        Args:
            root: Root AST node
            content: Source file content as bytes

        Returns:
            List of ImportedSymbol objects
        """
        imports = []

        def visit(node: Node):
            # Handle import statements
            if node.type == 'import_statement':
                imports.extend(self._parse_import_statement(node, content))

            # Handle CommonJS require
            if node.type == 'call_expression':
                callee = node.child_by_field_name('function')
                if callee and self._get_node_text(callee, content) == 'require':
                    imports.extend(self._parse_require_call(node, content))

            # Recurse into children
            for child in node.children:
                visit(child)

        visit(root)
        return imports

    def _parse_import_statement(self, node: Node, content: bytes) -> List[ImportedSymbol]:
        """Parse a single import statement.

        Args:
            node: import_statement AST node
            content: Source content

        Returns:
            List of ImportedSymbol objects from this statement
        """
        imports = []
        line = node.start_point[0] + 1

        # Check for type import (TypeScript)
        is_type_import = any(
            child.type == 'type' for child in node.children
        )

        # Get source module
        source_node = self._find_child_by_type(node, 'string')
        if not source_node:
            return imports

        source = self._extract_string_content(source_node, content)

        # Check for import clause
        import_clause = self._find_child_by_type(node, 'import_clause')
        if not import_clause:
            # Side-effect import: import './styles.css'
            imports.append(ImportedSymbol(
                name='*',
                import_type=ImportType.SIDE_EFFECT,
                source=source,
                line=line
            ))
            return imports

        for child in import_clause.children:
            # Default import: import foo from './mod'
            if child.type == 'identifier':
                imports.append(ImportedSymbol(
                    name=self._get_node_text(child, content),
                    import_type=ImportType.DEFAULT,
                    source=source,
                    line=line
                ))

            # Named imports: import { foo, bar } from './mod'
            elif child.type == 'named_imports':
                for specifier in child.children:
                    if specifier.type == 'import_specifier':
                        name_node = specifier.child_by_field_name('name')
                        alias_node = specifier.child_by_field_name('alias')

                        if name_node:
                            name = self._get_node_text(name_node, content)
                            alias = None
                            if alias_node:
                                alias = self._get_node_text(alias_node, content)

                            import_type = ImportType.TYPE if is_type_import else ImportType.NAMED
                            imports.append(ImportedSymbol(
                                name=name,
                                import_type=import_type,
                                source=source,
                                line=line,
                                alias=alias
                            ))

            # Namespace import: import * as foo from './mod'
            elif child.type == 'namespace_import':
                alias_node = None
                for subchild in child.children:
                    if subchild.type == 'identifier':
                        alias_node = subchild
                        break

                imports.append(ImportedSymbol(
                    name='*',
                    import_type=ImportType.NAMESPACE,
                    source=source,
                    line=line,
                    alias=self._get_node_text(alias_node, content) if alias_node else None
                ))

        return imports

    def _parse_require_call(self, node: Node, content: bytes) -> List[ImportedSymbol]:
        """Parse CommonJS require() call.

        Args:
            node: call_expression AST node
            content: Source content

        Returns:
            List of ImportedSymbol objects
        """
        imports = []
        line = node.start_point[0] + 1

        args = node.child_by_field_name('arguments')
        if args and args.child_count > 0:
            for arg in args.children:
                if arg.type == 'string':
                    source = self._extract_string_content(arg, content)
                    imports.append(ImportedSymbol(
                        name='*',
                        import_type=ImportType.NAMESPACE,  # require() is like namespace import
                        source=source,
                        line=line
                    ))
                    break

        return imports

    def _resolve_import_path(
        self, source: str, importing_file: Path
    ) -> Optional[str]:
        """Resolve relative import to absolute path.

        Args:
            source: Import source as written (e.g., '../../utils/helper')
            importing_file: Path of the file containing the import

        Returns:
            Resolved relative path from root_dir, or None for external packages
        """
        # Skip node_modules packages
        if not source.startswith('.') and not source.startswith('@/'):
            return None

        # Handle alias imports (e.g., @/utils/helper)
        if source.startswith('@/'):
            # Common Vite/Next.js alias - adjust based on project config
            source = source.replace('@/', 'src/')

        # Resolve relative path
        base_dir = importing_file.parent
        resolved = (base_dir / source).resolve()

        # Try various extensions
        extensions_to_try = list(SUPPORTED_EXTENSIONS) + ['/index.js', '/index.ts', '/index.jsx', '/index.tsx']

        for ext in extensions_to_try:
            candidate = resolved.parent / (resolved.name + ext) if not ext.startswith('/') else resolved / ext[1:]
            if not ext.startswith('/'):
                candidate = Path(str(resolved) + ext)
            else:
                candidate = resolved / ext[1:]

            if candidate.exists():
                try:
                    return str(candidate.relative_to(self.root_dir))
                except ValueError:
                    # File is outside root_dir
                    return str(candidate)

        # Check if it's already a valid file
        if resolved.exists():
            try:
                return str(resolved.relative_to(self.root_dir))
            except ValueError:
                return str(resolved)

        # Try without extension if file exists with any supported extension
        for ext in SUPPORTED_EXTENSIONS:
            candidate = Path(str(resolved) + ext)
            if candidate.exists():
                try:
                    return str(candidate.relative_to(self.root_dir))
                except ValueError:
                    return str(candidate)

        return None

    def analyze_file(self, file_path: Path) -> FileAnalysis:
        """Parse and analyze a single file.

        Args:
            file_path: Path to the file to analyze

        Returns:
            FileAnalysis object with exports, imports, and dependencies
        """
        try:
            relative_path = str(file_path.relative_to(self.root_dir))
        except ValueError:
            relative_path = str(file_path)

        analysis = FileAnalysis(
            file_path=str(file_path),
            relative_path=relative_path
        )

        try:
            content = file_path.read_text(encoding='utf-8')
            content_bytes = content.encode('utf-8')

            # Set parser language and parse
            self.parser.language = self._get_language(file_path)
            tree = self.parser.parse(content_bytes)

            # Extract exports and imports
            analysis.exports = self._extract_exports(tree.root_node, content_bytes)
            analysis.imports = self._extract_imports(tree.root_node, content_bytes)

            # Resolve import paths
            for imp in analysis.imports:
                resolved = self._resolve_import_path(imp.source, file_path)
                if resolved:
                    imp.resolved_path = resolved
                    analysis.dependencies.add(resolved)

        except Exception as e:
            analysis.parse_errors.append(f"Parse error: {str(e)}")

        return analysis

    def analyze_directory(self) -> DependencyContext:
        """Analyze all JS/TS files in the root directory.

        Returns:
            DependencyContext with complete dependency information
        """
        context = DependencyContext(root_dir=str(self.root_dir))

        # Discover all JS/TS files
        files: List[Path] = []
        for ext in SUPPORTED_EXTENSIONS:
            pattern = str(self.root_dir / '**' / f'*{ext}')
            files.extend(Path(p) for p in glob.glob(pattern, recursive=True))

        # Skip non-source directories (node_modules, build output, etc.)
        exclude_patterns = ['node_modules', 'dist', 'build', '.next', 'coverage', '__pycache__']
        files = [
            f for f in files
            if not any(excl in str(f) for excl in exclude_patterns)
        ]

        # Analyze each file
        for file_path in files:
            analysis = self.analyze_file(file_path)

            # Add to symbol table
            if analysis.exports:
                context.symbol_table[analysis.relative_path] = analysis.exports
                context.total_exports += len(analysis.exports)

            # Add to dependency graph
            if analysis.imports:
                context.dependency_graph[analysis.relative_path] = analysis.imports
                context.total_imports += len(analysis.imports)

            # Track parse errors
            if analysis.parse_errors:
                context.parse_error_count += 1

            context.total_files += 1

        # Build reverse dependency map
        context.reverse_dependencies = self._build_reverse_dependencies(context)

        return context

    def _build_reverse_dependencies(
        self, context: DependencyContext
    ) -> dict:
        """Build reverse dependency map from dependency graph.

        For each file, find all files that import from it.

        Args:
            context: DependencyContext with populated dependency_graph

        Returns:
            Dictionary mapping file_path -> [files that import from it]
        """
        reverse_deps = defaultdict(list)

        for file_path, imports in context.dependency_graph.items():
            for imp in imports:
                if imp.resolved_path:
                    reverse_deps[imp.resolved_path].append(file_path)

        return dict(reverse_deps)


def analyze_dependencies(
    target_path: str,
    cache_dir: Optional[str] = None,
    force_refresh: bool = False,
    max_age_hours: int = 24
) -> DependencyContext:
    """Analyze target directory and return dependency context.

    This is the main entry point for the AST analyzer.
    Supports caching: reuses cached results if:
    1. Cache file exists for same directory and date
    2. Cache is less than max_age_hours old
    3. File contents haven't changed (content hash match)

    Args:
        target_path: Directory to analyze (e.g., "app/src/logic")
        cache_dir: Optional directory to store/load cached results
                   If None, defaults to adws/ast_cache/
        force_refresh: If True, bypass cache and re-analyze
        max_age_hours: Maximum cache age in hours (default: 24)

    Returns:
        DependencyContext with symbol_table, dependency_graph, reverse_deps

    Example:
        context = analyze_dependencies("app/src/logic")
        print(context.to_prompt_context())  # Markdown for prompt
        print(context.to_json_dict())  # JSON for storage
    """
    from datetime import datetime, timedelta

    # Resolve paths
    target_resolved = Path(target_path).resolve()

    # Determine cache location
    if cache_dir is None:
        # Default: adws/ast_cache/ relative to this module
        cache_dir_path = Path(__file__).parent.parent / "ast_cache"
    else:
        cache_dir_path = Path(cache_dir)

    # Create cache filename: <YYMMDD>-<directory_name>.json (timestamp-first for sorting)
    dir_name = target_resolved.name  # Last part of path (e.g., "logic" from "app/src/logic")
    today_str = datetime.now().strftime("%y%m%d")
    cache_file = cache_dir_path / f"{today_str}-{dir_name}.json"

    # Compute current content hash for comparison
    current_hash = DependencyContext.compute_content_hash(str(target_resolved))

    # Try to load from cache if not forcing refresh
    if not force_refresh:
        # Check for today's cache file first
        if cache_file.exists():
            cached = DependencyContext.load(cache_file)
            if cached and cached.content_hash == current_hash:
                print(f"  [AST Cache] HIT - Using cached analysis ({cached.total_files} files)")
                return cached
            elif cached:
                print(f"  [AST Cache] STALE - Files changed, re-analyzing...")
            else:
                print(f"  [AST Cache] CORRUPT - Re-analyzing...")
        else:
            # Check for recent cache files (within max_age_hours)
            recent_cache = _find_recent_cache(cache_dir_path, dir_name, max_age_hours)
            if recent_cache:
                cached = DependencyContext.load(recent_cache)
                if cached and cached.content_hash == current_hash:
                    print(f"  [AST Cache] HIT - Using recent cache from {recent_cache.name} ({cached.total_files} files)")
                    return cached
                elif cached:
                    print(f"  [AST Cache] STALE - Files changed since {recent_cache.name}, re-analyzing...")

    # Analyze fresh
    print(f"  [AST Cache] MISS - Analyzing {target_path}...")
    analyzer = ASTDependencyAnalyzer(target_path)
    context = analyzer.analyze_directory()

    # Set the content hash
    context.content_hash = current_hash

    # Save to cache with today's date
    context.save(cache_file)
    print(f"  [AST Cache] Saved to {cache_file.name}")

    # Clean up old cache files for this directory (keep last 3)
    _cleanup_old_caches(cache_dir_path, dir_name, keep_count=3)

    return context


def _find_recent_cache(cache_dir: Path, dir_name: str, max_age_hours: int) -> Optional[Path]:
    """Find a recent cache file within the max age window.

    Args:
        cache_dir: Directory containing cache files
        dir_name: Directory name suffix to match
        max_age_hours: Maximum age in hours

    Returns:
        Path to most recent valid cache file, or None
    """
    from datetime import datetime, timedelta

    if not cache_dir.exists():
        return None

    cutoff = datetime.now() - timedelta(hours=max_age_hours)
    candidates = []

    # New format: <YYMMDD>-<dir_name>.json (timestamp-first)
    for cache_file in cache_dir.glob(f"*-{dir_name}.json"):
        # Extract date from filename: <YYMMDD>-<dir_name>.json
        try:
            date_part = cache_file.stem.split('-')[0]  # Get YYMMDD part (first segment)
            file_date = datetime.strptime(date_part, "%y%m%d")
            # Assume end of day for comparison
            file_datetime = file_date.replace(hour=23, minute=59, second=59)
            if file_datetime >= cutoff:
                candidates.append((file_datetime, cache_file))
        except (ValueError, IndexError):
            continue

    if candidates:
        # Return most recent
        candidates.sort(reverse=True)
        return candidates[0][1]

    return None


def _cleanup_old_caches(cache_dir: Path, dir_name: str, keep_count: int = 3) -> None:
    """Remove old cache files, keeping only the most recent ones.

    Args:
        cache_dir: Directory containing cache files
        dir_name: Directory name suffix to match
        keep_count: Number of recent cache files to keep
    """
    if not cache_dir.exists():
        return

    # Find all cache files for this directory (new format: <YYMMDD>-<dir_name>.json)
    cache_files = list(cache_dir.glob(f"*-{dir_name}.json"))

    if len(cache_files) <= keep_count:
        return

    # Sort by filename (date prefix means alphabetical = chronological)
    cache_files.sort(reverse=True)

    # Remove old files
    for old_file in cache_files[keep_count:]:
        try:
            old_file.unlink()
            print(f"  [AST Cache] Cleaned up old cache: {old_file.name}")
        except OSError:
            pass


def _find_project_root() -> Optional[Path]:
    """Find project root by looking for markers like package.json + app/ combo.

    Searches from current working directory upward.
    Prioritizes directories that have both package.json AND app/ folder,
    which indicates the main project root (not a subproject).

    Returns:
        Path to project root, or None if not found
    """
    current = Path.cwd()

    # First pass: look for the "definitive" combo (package.json + app/)
    for _ in range(10):  # Limit search depth
        if (current / 'package.json').exists() and (current / 'app').is_dir():
            return current
        parent = current.parent
        if parent == current:
            break
        current = parent

    # Second pass: fall back to simpler markers
    current = Path.cwd()
    markers = ['.git', 'package.json', 'bun.lockb']
    for _ in range(10):
        for marker in markers:
            if (current / marker).exists():
                return current
        parent = current.parent
        if parent == current:
            break
        current = parent

    return None


def _resolve_target_path(target: str) -> Path:
    """Resolve target path intelligently.

    Handles common shorthand paths like 'app', 'app/src/logic', etc.
    If the path doesn't exist relative to CWD, tries from project root.

    Args:
        target: Target path as specified by user

    Returns:
        Resolved absolute path
    """
    # First try as-is (relative to CWD or absolute)
    direct_path = Path(target)
    if direct_path.exists():
        return direct_path.resolve()

    # If not found, try from project root
    project_root = _find_project_root()
    if project_root:
        root_relative = project_root / target
        if root_relative.exists():
            return root_relative.resolve()

    # Fall back to the original resolution (will likely fail, but with a clear error)
    return direct_path.resolve()


# CLI support for testing
if __name__ == "__main__":
    import sys
    import json

    if len(sys.argv) < 2:
        print("Usage: python ast_dependency_analyzer.py <target_path> [--json]")
        print("\nExamples:")
        print("  python -m ast_dependency_analyzer app")
        print("  python -m ast_dependency_analyzer app/src/logic")
        print("  python -m ast_dependency_analyzer . --json")
        sys.exit(1)

    target = sys.argv[1]
    output_json = "--json" in sys.argv

    # Resolve path intelligently (tries CWD first, then project root)
    resolved_target = _resolve_target_path(target)

    if not resolved_target.exists():
        print(f"Error: Target path does not exist: {target}")
        print(f"  Resolved to: {resolved_target}")
        project_root = _find_project_root()
        if project_root:
            print(f"  Project root: {project_root}")
        sys.exit(1)

    print(f"Analyzing: {target}")
    print(f"  Resolved: {resolved_target}")
    context = analyze_dependencies(str(resolved_target))

    if output_json:
        print(json.dumps(context.to_json_dict(), indent=2))
    else:
        print(context.to_prompt_context())
