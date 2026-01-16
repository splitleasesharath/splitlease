# ADW Modular AST-Enhanced Orchestrator Redesign

> **Comprehensive Implementation Plan for Semantic Code Understanding in Refactoring Workflows**
>
> **Created**: 2026-01-16
> **Status**: PLANNING (Awaiting Approval)
> **Complexity**: HIGH - Multi-phase, architectural redesign

---

## Executive Summary

This plan addresses the fundamental tension in the current ADW (AI Developer Workflow) unified FP orchestrator:

| Problem | Root Cause | Impact |
|---------|------------|--------|
| **Too Restrictive** | 5-layer validation with full build per chunk | Legitimate changes rejected; slow iteration |
| **Not Restrictive Enough** | Regex-based code parsing; no semantic understanding | Broken imports, undefined symbols slip through |
| **Code Definition Drift** | No dependency graph; chunks processed linearly | Cascading failures when symbols are renamed/moved |

**The Solution**: Introduce an **AST-based semantic precursor step** that provides Claude Code with a dependency graph and symbol table BEFORE generating refactoring chunks. This enables:

1. **Informed Chunking**: Claude knows which files import what, enabling correct dependency ordering
2. **Pre-validated Refactoring**: Symbol renames/moves include all affected files automatically
3. **Faster Validation**: Skip redundant full builds; use targeted type-checking
4. **Better Recovery**: When chunks fail, the dependency graph enables intelligent re-planning

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Target Architecture](#2-target-architecture)
3. [Phase 1: AST Semantic Analyzer (FULLY DETAILED)](#3-phase-1-ast-semantic-analyzer)
4. [Phase 2: Dependency-Aware Chunk Generation](#4-phase-2-dependency-aware-chunk-generation)
5. [Phase 3: Intelligent Validation Pipeline](#5-phase-3-intelligent-validation-pipeline)
6. [Phase 4: Failure Recovery & Re-planning](#6-phase-4-failure-recovery--re-planning)
7. [Phase 5: Integration & Testing](#7-phase-5-integration--testing)
8. [File References](#8-file-references)
9. [Risk Assessment](#9-risk-assessment)

---

## 1. Current State Analysis

### 1.1 Original Orchestrator (Commit 17745263)

The original `adw_unified_fp_orchestrator.py` was elegantly simple:

```
AUDIT (Opus) → PARSE → FOR EACH PAGE GROUP:
    IMPLEMENT (Sonnet) → DEV SERVER → VISUAL CHECK → COMMIT/RESET
```

**285 lines** | **5 phases** | **No LSP validation**

**Strengths**:
- Simple, linear flow
- Fast execution (no per-chunk builds)
- Easy to debug

**Weaknesses**:
- Blind to code semantics
- No pre-validation of changes
- Cascading failures when imports break

### 1.2 Current Orchestrator (HEAD)

The current implementation added defensive layers:

```
AUDIT (Opus) → PARSE → FOR EACH PAGE GROUP:
    PRE-LSP VALIDATE → IMPLEMENT (Sonnet) → POST-LSP VALIDATE →
    INCREMENTAL BUILD → FINAL BUILD → DEV SERVER → VISUAL CHECK → COMMIT/RESET
```

**594 lines** | **7+ validation layers** | **Per-chunk builds**

**Additions since original**:
| Feature | Lines | Purpose | Problem |
|---------|-------|---------|---------|
| `_cleanup_browser_processes()` | 68-134 | Kill zombie Playwright | Masks MCP session bugs |
| Pre-LSP validation | 167-185 | Check imports before write | Regex-based; misses re-exports |
| Post-LSP validation | 243-261 | Check types after write | Runs full tsc (~30s) |
| Incremental build | 271-298 | Catch build errors early | Redundant with post-LSP |
| Final build gate | 477-516 | Safety net before visual | Triple-checks same thing |
| Browser cleanup per visual | 533 | Prevent session conflicts | Band-aid, not fix |

**Result**: ~120 seconds per chunk (vs ~20 seconds originally)

### 1.3 Core Problems

#### Problem 1: Regex-Based Code Understanding

**Current approach** (lsp_validator.py:58-98):
```python
# Regex extraction
named_import_pattern = r"import\s+\{([^}]+)\}\s+from\s+['\"]([^'\"]+)['\"]"
```

**What it misses**:
- Re-exports: `export { foo } from './other'`
- Type-only imports: `import type { Foo } from './types'`
- Dynamic imports: `const mod = await import('./dynamic')`
- Aliased imports: `import { foo as bar } from './module'`
- Computed properties: `obj[key]()`
- Chained calls: `getConfig().validate()`

#### Problem 2: No Dependency Graph

**Current approach** (chunk_parser.py):
- Chunks are parsed in document order
- `affected_pages` is metadata only, not enforced
- No validation that Chunk 3's import exists before Chunk 1 creates it

**What breaks**:
```
Chunk 1: Create new file utils/newHelper.js (exports helper())
Chunk 3: Update component.jsx to import from utils/newHelper.js

If processed in order: Chunk 3 tries to import before Chunk 1 creates the file
```

#### Problem 3: Validation Timing Mismatch

| Validation | When | Catches | Misses |
|------------|------|---------|--------|
| Pre-LSP | Before write | Missing module paths | Symbol existence |
| Post-LSP | After write | Type errors | Build-only errors |
| Build | After write | Everything | Fast feedback |

**The gap**: No validation can check if a symbol will exist until the file is written. But by then, we've already invested time in the change.

---

## 2. Target Architecture

### 2.1 Proposed Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NEW ORCHESTRATION PIPELINE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 0: AST SEMANTIC ANALYSIS (NEW)                                       │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  1. Parse all JS/JSX/TS/TSX files in target directory           │     │
│     │  2. Build symbol table: exports, imports, function signatures   │     │
│     │  3. Build dependency graph: file → [imported files]             │     │
│     │  4. Output: semantic_context.json for Claude                    │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                    │                                        │
│                                    ▼                                        │
│  PHASE 1: INFORMED AUDIT (Opus + Semantic Context)                          │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  Claude receives:                                                │     │
│     │  - Target files + semantic_context.json                         │     │
│     │  - Dependency graph showing import relationships                 │     │
│     │  - Symbol table showing what each file exports                   │     │
│     │                                                                  │     │
│     │  Claude outputs:                                                 │     │
│     │  - Chunks with explicit `depends_on: [chunk_ids]`               │     │
│     │  - Chunks categorized: SCAFFOLD → MIGRATE → CLEANUP              │     │
│     │  - Cascading changes included in same chunk group               │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                    │                                        │
│                                    ▼                                        │
│  PHASE 2: DEPENDENCY-ORDERED EXECUTION                                      │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  1. Build execution order from dependency graph                  │     │
│     │  2. Category phasing: all SCAFFOLD before any MIGRATE            │     │
│     │  3. Within category: topological sort by depends_on              │     │
│     │  4. Per-chunk atomic commits (not per-group)                     │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                    │                                        │
│                                    ▼                                        │
│  PHASE 3: TIERED VALIDATION (Fail-Fast)                                     │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  Tier 1: Syntax (ESLint parse) ─────────── <100ms ──→ FAIL?     │     │
│     │  Tier 2: Import resolution ─────────────── <500ms ──→ FAIL?     │     │
│     │  Tier 3: Affected-only type check ──────── 2-10s ───→ FAIL?     │     │
│     │  Tier 4: Build (only after all chunks) ─── 10-30s ──→ FAIL?     │     │
│     │  Tier 5: Visual regression ─────────────── 30-60s ──→ DONE      │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **AST in Python, not TypeScript** | Avoid adding Node.js dependency; Python has excellent parsers |
| **Dependency graph as JSON** | Claude can consume structured data; enables reasoning |
| **Category-based phasing** | Solves 90% of dependency issues with simple rule |
| **Per-chunk commits** | Failed chunk doesn't discard successful work |
| **Affected-only validation** | 5x faster than full project type check |

---

## 3. Phase 1: AST Semantic Analyzer (FULLY DETAILED)

### 3.1 Overview

Create a new Python module `adws/adw_modules/ast_analyzer.py` that:
1. Parses JavaScript/TypeScript files using a real parser (not regex)
2. Extracts exports, imports, and function signatures
3. Builds a dependency graph
4. Outputs structured JSON for Claude's consumption

### 3.2 Technology Choice: `tree-sitter` via Python

**Why tree-sitter**:
- Battle-tested (used by GitHub, Neovim, Helix)
- Python bindings available via `tree-sitter-python`
- Supports JavaScript, TypeScript, JSX, TSX
- Incremental parsing (fast on subsequent runs)
- No Node.js dependency

**Installation**:
```bash
pip install tree-sitter tree-sitter-javascript tree-sitter-typescript
```

### 3.3 Implementation Specification

#### 3.3.1 Data Structures

```python
# adws/adw_modules/ast_analyzer.py

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from pathlib import Path
from enum import Enum

class ExportType(str, Enum):
    NAMED = "named"           # export { foo, bar }
    DEFAULT = "default"       # export default function
    RE_EXPORT = "re-export"   # export { foo } from './other'
    TYPE = "type"             # export type { Foo }

class ImportType(str, Enum):
    NAMED = "named"           # import { foo } from './mod'
    DEFAULT = "default"       # import foo from './mod'
    NAMESPACE = "namespace"   # import * as foo from './mod'
    SIDE_EFFECT = "side-effect"  # import './styles.css'
    DYNAMIC = "dynamic"       # await import('./mod')
    TYPE = "type"             # import type { Foo }

@dataclass
class ExportedSymbol:
    name: str
    type: ExportType
    line: int
    is_function: bool = False
    is_class: bool = False
    is_constant: bool = False
    function_params: Optional[List[str]] = None  # For functions
    original_name: Optional[str] = None  # For `export { foo as bar }`

@dataclass
class ImportedSymbol:
    name: str
    type: ImportType
    source_module: str
    line: int
    alias: Optional[str] = None  # For `import { foo as bar }`
    is_type_only: bool = False

@dataclass
class FunctionSignature:
    name: str
    line: int
    params: List[str]
    is_async: bool = False
    is_arrow: bool = False
    is_exported: bool = False

@dataclass
class FileAnalysis:
    """Complete analysis of a single file."""
    file_path: str
    relative_path: str
    exports: List[ExportedSymbol] = field(default_factory=list)
    imports: List[ImportedSymbol] = field(default_factory=list)
    functions: List[FunctionSignature] = field(default_factory=list)
    dependencies: Set[str] = field(default_factory=set)  # Resolved file paths
    dependents: Set[str] = field(default_factory=set)    # Files that import this
    parse_errors: List[str] = field(default_factory=list)

@dataclass
class SemanticContext:
    """Complete semantic analysis of a directory."""
    root_dir: str
    files: Dict[str, FileAnalysis]  # relative_path -> analysis
    dependency_graph: Dict[str, List[str]]  # file -> [imported files]
    reverse_graph: Dict[str, List[str]]  # file -> [files that import it]
    symbol_index: Dict[str, str]  # symbol_name -> defining_file
    analysis_timestamp: str
    total_files: int
    total_exports: int
    total_imports: int
    parse_error_count: int
```

#### 3.3.2 Parser Implementation

```python
# adws/adw_modules/ast_analyzer.py (continued)

import tree_sitter_javascript as tsjs
import tree_sitter_typescript as tsts
from tree_sitter import Language, Parser
import json
from datetime import datetime

class ASTAnalyzer:
    """AST-based semantic analyzer for JavaScript/TypeScript codebases."""

    def __init__(self, working_dir: Path):
        self.working_dir = working_dir
        self.parser = Parser()

        # Build languages
        self.js_language = Language(tsjs.language())
        self.ts_language = Language(tsts.language_typescript())
        self.tsx_language = Language(tsts.language_tsx())

    def _get_language(self, file_path: Path) -> Language:
        """Select parser language based on file extension."""
        suffix = file_path.suffix.lower()
        if suffix in ('.ts',):
            return self.ts_language
        elif suffix in ('.tsx', '.jsx'):
            return self.tsx_language
        else:
            return self.js_language

    def analyze_file(self, file_path: Path) -> FileAnalysis:
        """Parse and analyze a single file."""
        relative = str(file_path.relative_to(self.working_dir))
        analysis = FileAnalysis(
            file_path=str(file_path),
            relative_path=relative
        )

        try:
            content = file_path.read_text(encoding='utf-8')
            self.parser.language = self._get_language(file_path)
            tree = self.parser.parse(content.encode('utf-8'))

            # Extract exports
            analysis.exports = self._extract_exports(tree.root_node, content)

            # Extract imports
            analysis.imports = self._extract_imports(tree.root_node, content)

            # Extract functions
            analysis.functions = self._extract_functions(tree.root_node, content)

            # Resolve dependencies to file paths
            for imp in analysis.imports:
                resolved = self._resolve_import(imp.source_module, file_path)
                if resolved:
                    analysis.dependencies.add(resolved)

        except Exception as e:
            analysis.parse_errors.append(str(e))

        return analysis

    def _extract_exports(self, node, content: str) -> List[ExportedSymbol]:
        """Extract all export statements from AST."""
        exports = []

        def visit(n):
            # Named exports: export { foo, bar }
            if n.type == 'export_statement':
                # Check for re-export: export { foo } from './other'
                source = None
                for child in n.children:
                    if child.type == 'string':
                        source = child.text.decode('utf-8').strip("'\"")

                export_type = ExportType.RE_EXPORT if source else ExportType.NAMED

                # Find export clause
                for child in n.children:
                    if child.type == 'export_clause':
                        for spec in child.children:
                            if spec.type == 'export_specifier':
                                name_node = spec.child_by_field_name('name')
                                alias_node = spec.child_by_field_name('alias')
                                if name_node:
                                    exports.append(ExportedSymbol(
                                        name=alias_node.text.decode('utf-8') if alias_node else name_node.text.decode('utf-8'),
                                        type=export_type,
                                        line=n.start_point[0] + 1,
                                        original_name=name_node.text.decode('utf-8') if alias_node else None
                                    ))

                    # export const foo = ...
                    if child.type in ('lexical_declaration', 'variable_declaration'):
                        for decl in child.children:
                            if decl.type == 'variable_declarator':
                                name_node = decl.child_by_field_name('name')
                                if name_node:
                                    exports.append(ExportedSymbol(
                                        name=name_node.text.decode('utf-8'),
                                        type=ExportType.NAMED,
                                        line=n.start_point[0] + 1,
                                        is_constant=True
                                    ))

                    # export function foo() {}
                    if child.type == 'function_declaration':
                        name_node = child.child_by_field_name('name')
                        params_node = child.child_by_field_name('parameters')
                        if name_node:
                            exports.append(ExportedSymbol(
                                name=name_node.text.decode('utf-8'),
                                type=ExportType.NAMED,
                                line=n.start_point[0] + 1,
                                is_function=True,
                                function_params=self._extract_param_names(params_node)
                            ))

                    # export class Foo {}
                    if child.type == 'class_declaration':
                        name_node = child.child_by_field_name('name')
                        if name_node:
                            exports.append(ExportedSymbol(
                                name=name_node.text.decode('utf-8'),
                                type=ExportType.NAMED,
                                line=n.start_point[0] + 1,
                                is_class=True
                            ))

            # Default exports: export default function/class/expression
            if n.type == 'export_statement' and any(c.type == 'default' for c in n.children):
                for child in n.children:
                    if child.type == 'function_declaration':
                        name_node = child.child_by_field_name('name')
                        exports.append(ExportedSymbol(
                            name=name_node.text.decode('utf-8') if name_node else 'default',
                            type=ExportType.DEFAULT,
                            line=n.start_point[0] + 1,
                            is_function=True
                        ))
                    elif child.type == 'class_declaration':
                        name_node = child.child_by_field_name('name')
                        exports.append(ExportedSymbol(
                            name=name_node.text.decode('utf-8') if name_node else 'default',
                            type=ExportType.DEFAULT,
                            line=n.start_point[0] + 1,
                            is_class=True
                        ))
                    elif child.type == 'identifier':
                        exports.append(ExportedSymbol(
                            name=child.text.decode('utf-8'),
                            type=ExportType.DEFAULT,
                            line=n.start_point[0] + 1
                        ))

            # Recurse
            for child in n.children:
                visit(child)

        visit(node)
        return exports

    def _extract_imports(self, node, content: str) -> List[ImportedSymbol]:
        """Extract all import statements from AST."""
        imports = []

        def visit(n):
            if n.type == 'import_statement':
                source = None
                is_type_only = False

                # Find source module
                for child in n.children:
                    if child.type == 'string':
                        source = child.text.decode('utf-8').strip("'\"")
                    if child.type == 'type':
                        is_type_only = True

                if not source:
                    for child in n.children:
                        visit(child)
                    return

                # Check for side-effect import: import './styles.css'
                has_clause = any(c.type in ('import_clause', 'named_imports') for c in n.children)
                if not has_clause:
                    imports.append(ImportedSymbol(
                        name='*',
                        type=ImportType.SIDE_EFFECT,
                        source_module=source,
                        line=n.start_point[0] + 1
                    ))
                    return

                for child in n.children:
                    # Default import: import foo from './mod'
                    if child.type == 'import_clause':
                        for clause_child in child.children:
                            if clause_child.type == 'identifier':
                                imports.append(ImportedSymbol(
                                    name=clause_child.text.decode('utf-8'),
                                    type=ImportType.TYPE if is_type_only else ImportType.DEFAULT,
                                    source_module=source,
                                    line=n.start_point[0] + 1,
                                    is_type_only=is_type_only
                                ))

                            # Namespace import: import * as foo from './mod'
                            if clause_child.type == 'namespace_import':
                                name_node = clause_child.child_by_field_name('alias')
                                if name_node:
                                    imports.append(ImportedSymbol(
                                        name=name_node.text.decode('utf-8'),
                                        type=ImportType.NAMESPACE,
                                        source_module=source,
                                        line=n.start_point[0] + 1
                                    ))

                            # Named imports: import { foo, bar as baz } from './mod'
                            if clause_child.type == 'named_imports':
                                for spec in clause_child.children:
                                    if spec.type == 'import_specifier':
                                        name_node = spec.child_by_field_name('name')
                                        alias_node = spec.child_by_field_name('alias')
                                        if name_node:
                                            imports.append(ImportedSymbol(
                                                name=name_node.text.decode('utf-8'),
                                                type=ImportType.TYPE if is_type_only else ImportType.NAMED,
                                                source_module=source,
                                                line=n.start_point[0] + 1,
                                                alias=alias_node.text.decode('utf-8') if alias_node else None,
                                                is_type_only=is_type_only
                                            ))

            # Dynamic import: await import('./mod')
            if n.type == 'call_expression':
                func = n.child_by_field_name('function')
                if func and func.type == 'import':
                    args = n.child_by_field_name('arguments')
                    if args:
                        for arg in args.children:
                            if arg.type == 'string':
                                imports.append(ImportedSymbol(
                                    name='*',
                                    type=ImportType.DYNAMIC,
                                    source_module=arg.text.decode('utf-8').strip("'\""),
                                    line=n.start_point[0] + 1
                                ))

            for child in n.children:
                visit(child)

        visit(node)
        return imports

    def _extract_functions(self, node, content: str) -> List[FunctionSignature]:
        """Extract function signatures from AST."""
        functions = []
        exported_names = set()

        # First pass: collect exported function names
        def collect_exports(n):
            if n.type == 'export_statement':
                for child in n.children:
                    if child.type == 'function_declaration':
                        name_node = child.child_by_field_name('name')
                        if name_node:
                            exported_names.add(name_node.text.decode('utf-8'))
            for child in n.children:
                collect_exports(child)

        collect_exports(node)

        # Second pass: extract all functions
        def visit(n):
            if n.type == 'function_declaration':
                name_node = n.child_by_field_name('name')
                params_node = n.child_by_field_name('parameters')
                if name_node:
                    name = name_node.text.decode('utf-8')
                    functions.append(FunctionSignature(
                        name=name,
                        line=n.start_point[0] + 1,
                        params=self._extract_param_names(params_node),
                        is_async='async' in content[n.start_byte:n.start_byte+10],
                        is_exported=name in exported_names
                    ))

            # Arrow functions assigned to variables
            if n.type == 'variable_declarator':
                name_node = n.child_by_field_name('name')
                value_node = n.child_by_field_name('value')
                if name_node and value_node and value_node.type == 'arrow_function':
                    params_node = value_node.child_by_field_name('parameters')
                    name = name_node.text.decode('utf-8')
                    functions.append(FunctionSignature(
                        name=name,
                        line=n.start_point[0] + 1,
                        params=self._extract_param_names(params_node),
                        is_arrow=True,
                        is_exported=name in exported_names
                    ))

            for child in n.children:
                visit(child)

        visit(node)
        return functions

    def _extract_param_names(self, params_node) -> List[str]:
        """Extract parameter names from function parameters node."""
        if not params_node:
            return []

        params = []
        for child in params_node.children:
            if child.type == 'identifier':
                params.append(child.text.decode('utf-8'))
            elif child.type in ('required_parameter', 'optional_parameter'):
                pattern = child.child_by_field_name('pattern')
                if pattern:
                    params.append(pattern.text.decode('utf-8'))
            elif child.type == 'rest_pattern':
                params.append('...' + (child.children[1].text.decode('utf-8') if len(child.children) > 1 else ''))

        return params

    def _resolve_import(self, module_path: str, source_file: Path) -> Optional[str]:
        """Resolve an import path to a file path relative to working_dir."""
        if not module_path.startswith('.'):
            return None  # Node module, skip

        source_dir = source_file.parent

        if module_path.startswith('./'):
            resolved = source_dir / module_path[2:]
        elif module_path.startswith('../'):
            resolved = (source_dir / module_path).resolve()
        else:
            resolved = source_dir / module_path

        # Try common extensions
        extensions = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx', '/index.ts', '/index.tsx']
        for ext in extensions:
            candidate = Path(str(resolved) + ext)
            if candidate.exists():
                try:
                    return str(candidate.relative_to(self.working_dir))
                except ValueError:
                    return str(candidate)

        return None

    def analyze_directory(self, target_dir: Path) -> SemanticContext:
        """Analyze all JS/TS files in a directory."""
        files: Dict[str, FileAnalysis] = {}
        dependency_graph: Dict[str, List[str]] = {}
        reverse_graph: Dict[str, List[str]] = {}
        symbol_index: Dict[str, str] = {}

        # Find all relevant files
        patterns = ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx']
        all_files = []
        for pattern in patterns:
            all_files.extend(target_dir.glob(pattern))

        # Filter out node_modules, dist, etc.
        all_files = [f for f in all_files if 'node_modules' not in str(f) and 'dist' not in str(f)]

        # Analyze each file
        for file_path in all_files:
            analysis = self.analyze_file(file_path)
            files[analysis.relative_path] = analysis

            # Build dependency graph
            dependency_graph[analysis.relative_path] = list(analysis.dependencies)

            # Build symbol index
            for export in analysis.exports:
                symbol_index[export.name] = analysis.relative_path

        # Build reverse graph
        for file_path, deps in dependency_graph.items():
            for dep in deps:
                if dep not in reverse_graph:
                    reverse_graph[dep] = []
                reverse_graph[dep].append(file_path)

        # Update dependents in file analyses
        for file_path, dependents in reverse_graph.items():
            if file_path in files:
                files[file_path].dependents = set(dependents)

        return SemanticContext(
            root_dir=str(target_dir),
            files=files,
            dependency_graph=dependency_graph,
            reverse_graph=reverse_graph,
            symbol_index=symbol_index,
            analysis_timestamp=datetime.now().isoformat(),
            total_files=len(files),
            total_exports=sum(len(f.exports) for f in files.values()),
            total_imports=sum(len(f.imports) for f in files.values()),
            parse_error_count=sum(len(f.parse_errors) for f in files.values())
        )

    def to_json(self, context: SemanticContext) -> str:
        """Convert SemanticContext to JSON for Claude consumption."""
        def serialize(obj):
            if isinstance(obj, set):
                return list(obj)
            if hasattr(obj, '__dataclass_fields__'):
                return {k: serialize(v) for k, v in obj.__dict__.items()}
            if isinstance(obj, dict):
                return {k: serialize(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [serialize(v) for v in obj]
            if isinstance(obj, Enum):
                return obj.value
            return obj

        return json.dumps(serialize(context), indent=2)
```

#### 3.3.3 CLI Entry Point

```python
# adws/adw_modules/ast_analyzer.py (continued)

def main():
    """CLI entry point for standalone AST analysis."""
    import argparse

    parser = argparse.ArgumentParser(description="AST Semantic Analyzer")
    parser.add_argument("target_path", help="Directory to analyze")
    parser.add_argument("--output", "-o", help="Output JSON file", default="semantic_context.json")
    parser.add_argument("--working-dir", "-w", help="Working directory", default=".")

    args = parser.parse_args()

    working_dir = Path(args.working_dir).resolve()
    target_dir = working_dir / args.target_path

    analyzer = ASTAnalyzer(working_dir)
    context = analyzer.analyze_directory(target_dir)

    output_path = working_dir / args.output
    output_path.write_text(analyzer.to_json(context), encoding='utf-8')

    print(f"Analyzed {context.total_files} files")
    print(f"Found {context.total_exports} exports, {context.total_imports} imports")
    print(f"Parse errors: {context.parse_error_count}")
    print(f"Output: {output_path}")

if __name__ == "__main__":
    main()
```

### 3.4 Integration with Orchestrator

#### 3.4.1 Modified Orchestrator Flow

```python
# adw_unified_fp_orchestrator.py - Phase 0 addition

from adw_modules.ast_analyzer import ASTAnalyzer

def run_semantic_analysis(target_path: str, working_dir: Path, logger: RunLogger) -> Path:
    """Run AST analysis and output semantic context for Claude."""
    logger.phase_start("PHASE 0: SEMANTIC ANALYSIS")

    analyzer = ASTAnalyzer(working_dir)
    target_dir = working_dir / target_path

    context = analyzer.analyze_directory(target_dir)

    # Save for Claude's consumption
    output_file = working_dir / "adws" / "semantic_context.json"
    output_file.write_text(analyzer.to_json(context), encoding='utf-8')

    logger.step(f"Analyzed {context.total_files} files")
    logger.step(f"Built dependency graph: {len(context.dependency_graph)} nodes")
    logger.step(f"Indexed {len(context.symbol_index)} symbols")

    if context.parse_error_count > 0:
        logger.step(f"Warning: {context.parse_error_count} parse errors", notify=True)

    logger.phase_complete("PHASE 0: SEMANTIC ANALYSIS", success=True)

    return output_file
```

#### 3.4.2 Modified Audit Prompt

The audit prompt (`adws/prompts/code_audit_opus.txt`) will be modified to include:

```markdown
/ralph-loop:ralph-loop

## SEMANTIC CONTEXT AVAILABLE

I have pre-analyzed the codebase and generated a dependency graph.
Load and use this file: adws/semantic_context.json

This file contains:
- **dependency_graph**: file → [files it imports]
- **reverse_graph**: file → [files that import it]
- **symbol_index**: symbol_name → defining_file
- **Per-file analysis**: exports, imports, function signatures

## YOUR TASK

1. **Read the semantic context** to understand the codebase structure
2. **Scan files** in {target_path} for {audit_type} issues
3. **For each refactoring:**
   - Check dependency_graph to find downstream impact
   - Check reverse_graph to find files that import changed symbols
   - Include ALL affected files in the SAME chunk group
4. **Generate chunks with dependency metadata:**
   - `depends_on: [chunk_ids]` for chunks that must run first
   - `category: SCAFFOLD|MIGRATE|CLEANUP`
   - `creates_exports: [symbol_names]` for new files
   - `requires_imports: [symbol_names]` for files needing new imports

## CHUNK CATEGORIES

| Category | Description | Execution Order |
|----------|-------------|-----------------|
| SCAFFOLD | Create new files, directories | First |
| MIGRATE | Update existing code, add imports | Second |
| CLEANUP | Remove old code, unused imports | Last |

## OUTPUT FORMAT

Create plan at: .claude/plans/New/{timestamp}_code_refactor_plan.md

Each chunk must include:
- **Category:** SCAFFOLD | MIGRATE | CLEANUP
- **Depends On:** [list of chunk numbers that must complete first]
- **Creates Exports:** [symbols this chunk will export]
- **Requires Imports:** [symbols this chunk needs]

Example:
### CHUNK 1: Create utility helper
**Category:** SCAFFOLD
**Depends On:** none
**Creates Exports:** calculatePrice, formatCurrency
...

### CHUNK 3: Update component to use new helper
**Category:** MIGRATE
**Depends On:** 1
**Requires Imports:** calculatePrice
...
```

### 3.5 Testing Phase 1

#### 3.5.1 Unit Tests

```python
# adws/adw_tests/test_ast_analyzer.py

import pytest
from pathlib import Path
from adw_modules.ast_analyzer import ASTAnalyzer, ExportType, ImportType

@pytest.fixture
def analyzer(tmp_path):
    return ASTAnalyzer(tmp_path)

def test_extract_named_exports(analyzer, tmp_path):
    code = '''
    export const FOO = 'bar';
    export function doSomething(a, b) {}
    export class MyClass {}
    '''
    (tmp_path / "test.js").write_text(code)

    analysis = analyzer.analyze_file(tmp_path / "test.js")

    assert len(analysis.exports) == 3
    assert analysis.exports[0].name == 'FOO'
    assert analysis.exports[0].is_constant
    assert analysis.exports[1].name == 'doSomething'
    assert analysis.exports[1].is_function
    assert analysis.exports[2].name == 'MyClass'
    assert analysis.exports[2].is_class

def test_extract_re_exports(analyzer, tmp_path):
    code = '''
    export { foo, bar } from './other';
    export { default as baz } from './another';
    '''
    (tmp_path / "test.js").write_text(code)

    analysis = analyzer.analyze_file(tmp_path / "test.js")

    assert len(analysis.exports) >= 2
    assert any(e.type == ExportType.RE_EXPORT for e in analysis.exports)

def test_extract_named_imports(analyzer, tmp_path):
    code = '''
    import { foo, bar as baz } from './module';
    import type { MyType } from './types';
    '''
    (tmp_path / "test.ts").write_text(code)

    analysis = analyzer.analyze_file(tmp_path / "test.ts")

    assert len(analysis.imports) >= 2
    foo_import = next(i for i in analysis.imports if i.name == 'foo')
    assert foo_import.type == ImportType.NAMED

    bar_import = next(i for i in analysis.imports if i.name == 'bar')
    assert bar_import.alias == 'baz'

def test_resolve_relative_imports(analyzer, tmp_path):
    # Create file structure
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "utils").mkdir()
    (tmp_path / "src" / "utils" / "helper.js").write_text("export const help = 1;")
    (tmp_path / "src" / "component.js").write_text("import { help } from './utils/helper';")

    analysis = analyzer.analyze_file(tmp_path / "src" / "component.js")

    assert "src/utils/helper.js" in analysis.dependencies

def test_build_dependency_graph(analyzer, tmp_path):
    # Create interconnected files
    (tmp_path / "a.js").write_text("export const A = 1;")
    (tmp_path / "b.js").write_text("import { A } from './a'; export const B = A + 1;")
    (tmp_path / "c.js").write_text("import { B } from './b'; export const C = B + 1;")

    context = analyzer.analyze_directory(tmp_path)

    assert "a.js" in context.dependency_graph
    assert "b.js" in context.dependency_graph["c.js"]
    assert "c.js" in context.reverse_graph.get("b.js", [])

def test_symbol_index(analyzer, tmp_path):
    (tmp_path / "math.js").write_text("export function add(a, b) { return a + b; }")
    (tmp_path / "utils.js").write_text("export const format = (x) => x.toString();")

    context = analyzer.analyze_directory(tmp_path)

    assert context.symbol_index.get("add") == "math.js"
    assert context.symbol_index.get("format") == "utils.js"
```

#### 3.5.2 Integration Test

```python
# adws/adw_tests/test_ast_integration.py

def test_full_analysis_on_real_codebase():
    """Test AST analyzer on actual Split Lease codebase."""
    from adw_modules.ast_analyzer import ASTAnalyzer
    from pathlib import Path

    working_dir = Path(__file__).parent.parent.parent  # Project root
    target_dir = working_dir / "app" / "src" / "logic"

    if not target_dir.exists():
        pytest.skip("Split Lease codebase not available")

    analyzer = ASTAnalyzer(working_dir)
    context = analyzer.analyze_directory(target_dir)

    # Basic sanity checks
    assert context.total_files > 0
    assert context.total_exports > 0
    assert len(context.dependency_graph) > 0

    # Verify no catastrophic parse errors
    assert context.parse_error_count < context.total_files * 0.1  # <10% error rate
```

### 3.6 Deliverables for Phase 1

| Item | Path | Status |
|------|------|--------|
| AST Analyzer module | `adws/adw_modules/ast_analyzer.py` | TO CREATE |
| Unit tests | `adws/adw_tests/test_ast_analyzer.py` | TO CREATE |
| Integration test | `adws/adw_tests/test_ast_integration.py` | TO CREATE |
| Updated dependencies | `adws/pyproject.toml` or script header | TO UPDATE |
| Updated audit prompt | `adws/prompts/code_audit_opus.txt` | TO UPDATE |

### 3.7 Phase 1 Success Criteria

- [ ] AST analyzer parses all files in `app/src/logic/` without crashing
- [ ] Parse error rate < 5%
- [ ] Dependency graph correctly identifies import relationships
- [ ] Symbol index maps all exported symbols to defining files
- [ ] JSON output is valid and < 5MB for full codebase
- [ ] Analysis completes in < 30 seconds for typical directory

---

## 4. Phase 2: Dependency-Aware Chunk Generation

> **Status**: OUTLINED - Details to be expanded after Phase 1 completion

### 4.1 Overview

Modify the chunk parser and orchestrator to:
1. Parse new chunk metadata (category, depends_on, creates_exports)
2. Build execution order using topological sort
3. Validate chunk dependencies before execution

### 4.2 Key Changes

**chunk_parser.py modifications**:
- Extract `Category`, `Depends On`, `Creates Exports`, `Requires Imports` fields
- Update `ChunkData` dataclass with new fields
- Add dependency validation function

**Execution ordering**:
```python
# Pseudocode
def build_execution_order(chunks: List[ChunkData]) -> List[ChunkData]:
    # 1. Group by category
    scaffold = [c for c in chunks if c.category == 'SCAFFOLD']
    migrate = [c for c in chunks if c.category == 'MIGRATE']
    cleanup = [c for c in chunks if c.category == 'CLEANUP']

    # 2. Topological sort within each category
    scaffold_ordered = topological_sort(scaffold, key=lambda c: c.depends_on)
    migrate_ordered = topological_sort(migrate, key=lambda c: c.depends_on)
    cleanup_ordered = topological_sort(cleanup, key=lambda c: c.depends_on)

    # 3. Concatenate: SCAFFOLD → MIGRATE → CLEANUP
    return scaffold_ordered + migrate_ordered + cleanup_ordered
```

### 4.3 References for Phase 2

- [chunk_parser.py](adws/adw_modules/chunk_parser.py) - Current parser implementation
- [Research Document: Dependency ordering problem](#the-dependency-ordering-problem-requires-explicit-graph-construction) - From attached research
- [TAC Architecture: State-Based Sequencing](#pattern-2-state-based-sequencing) - From TAC guide

---

## 5. Phase 3: Intelligent Validation Pipeline

> **Status**: OUTLINED - Details to be expanded after Phase 2 completion

### 5.1 Overview

Replace the current 5-layer redundant validation with a tiered fail-fast pipeline:

| Tier | Check | Time | Action on Fail |
|------|-------|------|----------------|
| 1 | ESLint syntax parse | <100ms | Immediate fail |
| 2 | Import resolution (from AST context) | <500ms | Immediate fail |
| 3 | Affected-file type check | 2-10s | Immediate fail |
| 4 | Full build (once per page group) | 10-30s | Immediate fail |
| 5 | Visual regression | 30-60s | Commit or reset |

### 5.2 Key Changes

**Remove**:
- Redundant pre-LSP validation (replaced by AST context)
- Per-chunk full builds (moved to end of page group)
- Final build gate (redundant with Tier 4)

**Add**:
- AST-based import verification
- Affected-only type checking (using `tsc --incremental`)
- Tier tracking for debugging

### 5.3 References for Phase 3

- [lsp_validator.py](adws/adw_modules/lsp_validator.py) - Current validation
- [Research Document: Optimal validation pipeline](#the-optimal-validation-pipeline-uses-tiered-fail-fast-ordering) - From attached research

---

## 6. Phase 4: Failure Recovery & Re-planning

> **Status**: OUTLINED - Details to be expanded after Phase 3 completion

### 6.1 Overview

Implement intelligent failure recovery:
1. Per-chunk atomic commits (not per-group)
2. Quarantine failed chunks, continue with independent chunks
3. Incremental re-audit after N failures or N chunks

### 6.2 Key Changes

**Commit granularity**:
- Each successful chunk gets its own commit
- Failed chunks reset only themselves
- Dependent chunks are skipped (not reset)

**Re-planning triggers**:
- After 5 successful chunks (context may have shifted)
- After 2 failures (plan may be stale)
- After any SCAFFOLD chunk (file structure changed)

### 6.3 References for Phase 4

- [Research Document: Atomic per-chunk commits](#atomic-per-chunk-commits-eliminate-cascading-resets) - From attached research
- [Research Document: Incremental re-auditing](#incremental-re-auditing-solves-plan-staleness) - From attached research

---

## 7. Phase 5: Integration & Testing

> **Status**: OUTLINED - Details to be expanded after Phase 4 completion

### 7.1 Overview

Full integration testing and performance benchmarking:
1. Run on real refactoring tasks
2. Compare success rates: old vs new
3. Benchmark execution time
4. Document edge cases

### 7.2 Success Metrics

| Metric | Target | Current Baseline |
|--------|--------|------------------|
| First-pass success rate | >80% | ~40% (estimated) |
| Execution time per chunk | <30s | ~120s |
| False positive rate | <5% | ~20% (estimated) |
| Cascading failure rate | <2% | ~30% (estimated) |

### 7.3 References for Phase 5

- [Research Document: Expected improvements](#expected-improvements-with-recommended-architecture) - From attached research

---

## 8. File References

### Core Files to Modify

| File | Phase | Changes |
|------|-------|---------|
| [adw_unified_fp_orchestrator.py](adws/adw_unified_fp_orchestrator.py) | 1-5 | Add semantic analysis, new validation |
| [adw_code_audit.py](adws/adw_code_audit.py) | 1 | Pass semantic context to Claude |
| [adw_modules/chunk_parser.py](adws/adw_modules/chunk_parser.py) | 2 | Parse new metadata fields |
| [adw_modules/lsp_validator.py](adws/adw_modules/lsp_validator.py) | 3 | Integrate AST-based validation |
| [prompts/code_audit_opus.txt](adws/prompts/code_audit_opus.txt) | 1 | Add semantic context instructions |

### New Files to Create

| File | Phase | Purpose |
|------|-------|---------|
| `adw_modules/ast_analyzer.py` | 1 | Tree-sitter based AST analyzer |
| `adw_modules/dependency_graph.py` | 2 | Topological sorting, cycle detection |
| `adw_modules/tiered_validator.py` | 3 | Fail-fast validation pipeline |
| `adw_tests/test_ast_analyzer.py` | 1 | Unit tests for AST analyzer |
| `adw_tests/test_dependency_graph.py` | 2 | Unit tests for dependency ordering |

### Reference Documentation

| Document | Relevance |
|----------|-----------|
| [AI-driven refactoring orchestration research](attached) | Core design patterns |
| [TAC Architecture Guide](.claude/plans/Documents/20260116193000_TAC_Clean_Architecture_Guide.md) | Isolation, state management patterns |
| [miniCLAUDE.md](Documentation/miniCLAUDE.md) | Quick reference for simple tasks |
| [largeCLAUDE.md](Documentation/largeCLAUDE.md) | Full context for complex tasks |

---

## 9. Risk Assessment

### High Risk

| Risk | Mitigation |
|------|------------|
| Tree-sitter parse failures on edge cases | Fallback to regex extraction; track error rate |
| Performance regression from AST analysis | Cache results; incremental analysis |
| Breaking change to chunk format | Version the format; support both old and new |

### Medium Risk

| Risk | Mitigation |
|------|------------|
| Dependency cycles in chunk graph | Detect and report; break with heuristics |
| Claude misinterpreting semantic context | Iterate on prompt; provide examples |
| Per-chunk commits creating many commits | Squash option at end of run |

### Low Risk

| Risk | Mitigation |
|------|------------|
| Tree-sitter dependency issues | Well-maintained library; pip install |
| JSON output too large | Compression; selective inclusion |

---

## Approval Checklist

Before proceeding to implementation:

- [ ] Review Phase 1 specification in detail
- [ ] Confirm tree-sitter as appropriate parser choice
- [ ] Validate data structures meet Claude's needs
- [ ] Approve testing strategy
- [ ] Set timeline expectations

---

**Document Version**: 1.0
**Created**: 2026-01-16
**Author**: Claude Opus (via orchestration analysis)
**Status**: AWAITING APPROVAL
