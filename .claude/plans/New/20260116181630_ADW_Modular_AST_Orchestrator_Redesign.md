# ADW Modular AST-Enhanced Orchestrator Redesign

> **Comprehensive Implementation Plan for Semantic Code Understanding in Refactoring Workflows**
>
> **Created**: 2026-01-16
> **Updated**: 2026-01-17
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
4. [Phase 1.5: Dynamic FP Zone Classification (NEW)](#4-phase-15-dynamic-fp-zone-classification)
5. [Phase 1.6: Idempotency & Construct Tracking (NEW)](#5-phase-16-idempotency--construct-tracking)
6. [Phase 1.7: Modular LLM Provider System (NEW)](#6-phase-17-modular-llm-provider-system)
7. [Phase 1.8: ADW Ecosystem Restructure (NEW)](#7-phase-18-adw-ecosystem-restructure)
8. [Phase 2: Dependency-Aware Chunk Generation](#8-phase-2-dependency-aware-chunk-generation)
9. [Phase 3: Intelligent Validation Pipeline](#9-phase-3-intelligent-validation-pipeline)
10. [Phase 4: Failure Recovery & Re-planning](#10-phase-4-failure-recovery--re-planning)
11. [Phase 5: Integration & Testing](#11-phase-5-integration--testing)
12. [File References](#12-file-references)
13. [Risk Assessment](#13-risk-assessment)

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
│     │  Claude receives:                                               │     │
│     │  - Target files + semantic_context.json                         │     │
│     │  - Dependency graph showing import relationships                │     │
│     │  - Symbol table showing what each file exports                  │     │
│     │                                                                 │     │
│     │  Claude outputs:                                                │     │
│     │  - Chunks with explicit `depends_on: [chunk_ids]`               │     │
│     │  - Chunks categorized: SCAFFOLD → MIGRATE → CLEANUP             │     │
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

## 4. Phase 1.5: Dynamic FP Zone Classification (NEW)

> **Status**: FULLY DETAILED
> **Added**: 2026-01-17
> **Purpose**: Classify code by purity requirements WITHOUT hardcoding file paths

### 4.1 Problem Statement

Hardcoded rules like `if path.includes('logic/calculators')` are brittle:
- Adding `logic/validators/` breaks the rules
- Renaming `lib/` to `services/` breaks the rules
- Files in "pure" directories might contain I/O (misplaced code)
- Files in "impure" directories might be pure (opportunity for extraction)

**Solution**: Classify based on **code characteristics**, not file paths. The code itself tells you whether it should be pure.

### 4.2 FP Zone Definitions

| Zone | Description | Target Purity | Refactoring Strategy |
|------|-------------|---------------|---------------------|
| `pure-core` | Pure functions with zero side effects | 100% | Aggressive FP enforcement |
| `orchestration` | Pure coordination of other functions | 95% | Composition patterns |
| `effect-boundary` | React hooks, effect containers | 50% | Extract pure parts to pure-core |
| `io-shell` | I/O operations - side effects expected | 20% | Leave impure, isolate I/O |

### 4.3 Heuristic-Based Classification

Analyze AST to **infer** zone membership regardless of file location:

```python
# adws/adw_modules/fp_classifier.py

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum

class FPZone(str, Enum):
    PURE_CORE = "pure-core"
    ORCHESTRATION = "orchestration"
    EFFECT_BOUNDARY = "effect-boundary"
    IO_SHELL = "io-shell"

@dataclass
class ClassificationSignal:
    type: str  # 'positive' or 'negative'
    signal: str
    weight: float
    details: Optional[str] = None

@dataclass
class FPClassification:
    zone: FPZone
    confidence: float  # 0.0 - 1.0
    signals: List[ClassificationSignal] = field(default_factory=list)
    recommended_purity: int = 0  # 0-100
    warnings: List[str] = field(default_factory=list)
    should_refactor: bool = True

class FPClassifier:
    """
    Classify files by FP zone using code heuristics, not file paths.
    """

    # Positive signals (indicate purity)
    PURE_SIGNALS = {
        'no_io_imports': 0.8,
        'only_logic_imports': 0.6,
        'calculator_naming': 0.4,  # calculate*, compute*, get*, derive*
        'predicate_naming': 0.4,   # is*, can*, should*, has*, does*
        'processor_naming': 0.3,   # process*, adapt*, format*, transform*
        'boolean_return': 0.5,
        'no_mutations': 0.6,
        'const_only': 0.4,
        'no_this_keyword': 0.3,
        'pure_jsdoc_marker': 1.0,  # @pure annotation
    }

    # Negative signals (indicate impurity)
    IMPURE_SIGNALS = {
        'io_imports': 0.8,         # supabase, fetch, localStorage
        'react_hooks': 0.9,        # useState, useEffect
        'io_naming': 0.5,          # fetch*, save*, update*, delete*, post*, send*
        'contains_mutations': 0.6, # .push(), .pop(), .splice()
        'async_with_io': 0.7,      # await fetch, await supabase
        'browser_apis': 0.8,       # document, window, localStorage
        'io_jsdoc_marker': 1.0,    # @io annotation
    }

    # Import patterns that indicate I/O
    IO_IMPORT_PATTERNS = [
        'supabase', '@supabase',
        'fetch', 'axios',
        'localStorage', 'sessionStorage',
        'fs', 'path',  # Node.js
        'Deno',        # Deno runtime
    ]

    # Function naming patterns
    PURE_NAME_PATTERNS = {
        'calculator': r'^(calculate|compute|get|derive|sum|total)',
        'predicate': r'^(is|can|should|has|does|was|will|check)',
        'processor': r'^(process|adapt|format|transform|parse|map|filter|reduce)',
    }

    IO_NAME_PATTERNS = {
        'fetcher': r'^(fetch|load|get(?!ter)|retrieve)',
        'mutator': r'^(save|update|delete|remove|create|insert|post|send|push)',
        'handler': r'^(handle|on[A-Z])',
    }

    def classify_file(self, file_analysis: 'FileAnalysis') -> FPClassification:
        """Classify a single file based on its AST analysis."""
        signals: List[ClassificationSignal] = []

        # Check for explicit JSDoc markers first (highest priority)
        marker_result = self._check_jsdoc_markers(file_analysis)
        if marker_result:
            return marker_result

        # Analyze imports
        signals.extend(self._analyze_imports(file_analysis))

        # Analyze function signatures
        signals.extend(self._analyze_functions(file_analysis))

        # Analyze code patterns (mutations, async, etc.)
        signals.extend(self._analyze_patterns(file_analysis))

        # Calculate zone from signals
        return self._calculate_zone(signals, file_analysis)

    def _check_jsdoc_markers(self, file_analysis) -> Optional[FPClassification]:
        """Check for explicit @pure or @io markers."""
        # Implementation reads JSDoc comments from AST
        # If @pure found: return pure-core with 100% confidence
        # If @io found: return io-shell with 100% confidence
        # If @fp-ignore found: return classification with should_refactor=False
        pass

    def _analyze_imports(self, file_analysis) -> List[ClassificationSignal]:
        """Analyze imports to detect I/O dependencies."""
        signals = []

        has_io_imports = False
        only_logic_imports = True

        for imp in file_analysis.imports:
            # Check for I/O imports
            if any(pattern in imp.source_module for pattern in self.IO_IMPORT_PATTERNS):
                has_io_imports = True
                signals.append(ClassificationSignal(
                    type='negative',
                    signal='io_imports',
                    weight=self.IMPURE_SIGNALS['io_imports'],
                    details=f"Imports from {imp.source_module}"
                ))

            # Check if imports are only from logic/ layer
            if not imp.source_module.startswith('./logic') and \
               not imp.source_module.startswith('../logic'):
                if not imp.source_module.startswith('.'):  # External package
                    only_logic_imports = False

        if not has_io_imports:
            signals.append(ClassificationSignal(
                type='positive',
                signal='no_io_imports',
                weight=self.PURE_SIGNALS['no_io_imports'],
                details="No I/O-related imports detected"
            ))

        if only_logic_imports and file_analysis.imports:
            signals.append(ClassificationSignal(
                type='positive',
                signal='only_logic_imports',
                weight=self.PURE_SIGNALS['only_logic_imports'],
                details="All imports from logic layer"
            ))

        return signals

    def _analyze_functions(self, file_analysis) -> List[ClassificationSignal]:
        """Analyze function signatures for naming patterns."""
        signals = []

        for fn in file_analysis.functions:
            # Check pure naming patterns
            for pattern_name, regex in self.PURE_NAME_PATTERNS.items():
                import re
                if re.match(regex, fn.name, re.IGNORECASE):
                    signals.append(ClassificationSignal(
                        type='positive',
                        signal=f'{pattern_name}_naming',
                        weight=self.PURE_SIGNALS.get(f'{pattern_name}_naming', 0.3),
                        details=f"Function '{fn.name}' matches {pattern_name} pattern"
                    ))
                    break

            # Check I/O naming patterns
            for pattern_name, regex in self.IO_NAME_PATTERNS.items():
                import re
                if re.match(regex, fn.name, re.IGNORECASE):
                    signals.append(ClassificationSignal(
                        type='negative',
                        signal='io_naming',
                        weight=self.IMPURE_SIGNALS['io_naming'],
                        details=f"Function '{fn.name}' matches {pattern_name} pattern"
                    ))
                    break

        return signals

    def _analyze_patterns(self, file_analysis) -> List[ClassificationSignal]:
        """Analyze code patterns like mutations, async, React hooks."""
        signals = []

        # Check for React hooks (from imports)
        react_hooks = ['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef']
        for imp in file_analysis.imports:
            if imp.name in react_hooks:
                signals.append(ClassificationSignal(
                    type='negative',
                    signal='react_hooks',
                    weight=self.IMPURE_SIGNALS['react_hooks'],
                    details=f"Uses React hook: {imp.name}"
                ))

        # Additional pattern detection would analyze the AST body
        # for mutations (.push, .pop, etc.), this reference, etc.

        return signals

    def _calculate_zone(self, signals: List[ClassificationSignal],
                        file_analysis) -> FPClassification:
        """Calculate final zone from weighted signals."""
        positive_score = sum(s.weight for s in signals if s.type == 'positive')
        negative_score = sum(s.weight for s in signals if s.type == 'negative')

        total = positive_score + negative_score
        if total == 0:
            # No strong signals - default to orchestration
            return FPClassification(
                zone=FPZone.ORCHESTRATION,
                confidence=0.5,
                signals=signals,
                recommended_purity=70,
                warnings=["No strong classification signals detected"]
            )

        purity_ratio = positive_score / total

        # Determine zone based on ratio
        if purity_ratio >= 0.8:
            zone = FPZone.PURE_CORE
            recommended_purity = 100
        elif purity_ratio >= 0.6:
            zone = FPZone.ORCHESTRATION
            recommended_purity = 95
        elif purity_ratio >= 0.4:
            zone = FPZone.EFFECT_BOUNDARY
            recommended_purity = 50
        else:
            zone = FPZone.IO_SHELL
            recommended_purity = 20

        # Generate warnings for mismatches
        warnings = []
        if zone == FPZone.PURE_CORE and negative_score > 0:
            warnings.append(f"Pure-core file has impure signals: {[s.signal for s in signals if s.type == 'negative']}")

        return FPClassification(
            zone=zone,
            confidence=abs(purity_ratio - 0.5) * 2,  # 0.5 = low confidence, 0/1 = high
            signals=signals,
            recommended_purity=recommended_purity,
            warnings=warnings,
            should_refactor=(zone in [FPZone.PURE_CORE, FPZone.ORCHESTRATION, FPZone.EFFECT_BOUNDARY])
        )
```

### 4.4 Configuration File: `.fp-zones.yaml`

Instead of hardcoding, use a versioned config file that evolves with the codebase:

```yaml
# .fp-zones.yaml - FP Zone Configuration
# This file guides the ADW orchestrator on purity expectations
# Update this as the codebase architecture evolves

version: "1.0"

# Zone definitions with refactoring targets
zones:
  pure-core:
    description: "Pure functions with zero side effects"
    target_purity: 100
    refactoring_strategy: "aggressive"
    allowed_patterns:
      - "map, filter, reduce, flatMap"
      - "const declarations only"
      - "pure function composition"
      - "Result/Either types for errors"
    forbidden_patterns:
      - "fetch, await (external)"
      - "console.*, localStorage, document"
      - "mutations (push, pop, splice)"
      - "let/var reassignment"
      - "this keyword"

  orchestration:
    description: "Pure coordination of other functions"
    target_purity: 95
    refactoring_strategy: "moderate"
    allowed_patterns:
      - "calling other pure functions"
      - "async/await for coordination (not I/O)"
      - "Result/Either composition"
    forbidden_patterns:
      - "direct I/O calls"
      - "state mutations"

  effect-boundary:
    description: "React hooks and similar effect containers"
    target_purity: 50
    refactoring_strategy: "extract"
    guidance: "Extract pure logic to pure-core layer"
    allowed_patterns:
      - "useState, useEffect, useCallback"
      - "calling io-shell functions"
    refactoring_actions:
      - "Extract calculations to logic/calculators/"
      - "Extract validations to logic/rules/"
      - "Extract transformations to logic/processors/"

  io-shell:
    description: "I/O operations - side effects expected here"
    target_purity: 20
    refactoring_strategy: "leave"
    guidance: "Keep I/O isolated, return data to pure layers"
    allowed_patterns:
      - "fetch, supabase calls"
      - "localStorage, cookies"
      - "external API calls"
      - "browser APIs"
    note: "Do NOT try to make this pure - I/O is the point"

# Classification rules (evaluated in order)
classification:
  # Explicit markers always win
  - type: marker
    markers: ["@pure", "@io", "@orchestration", "@effect-boundary", "@fp-ignore"]
    priority: 100

  # Heuristic rules (code analysis)
  - type: heuristic
    name: "io-imports"
    condition: "imports supabase, fetch, or browser APIs"
    zone: io-shell
    confidence: 0.8

  - type: heuristic
    name: "react-hooks"
    condition: "contains useState or useEffect"
    zone: effect-boundary
    confidence: 0.9

  - type: heuristic
    name: "pure-naming"
    condition: "all exports match /^(calculate|is|can|should|has|get|process)/"
    zone: pure-core
    confidence: 0.7

  - type: heuristic
    name: "no-external-deps"
    condition: "only imports from logic/ or no imports"
    zone: pure-core
    confidence: 0.6

  # Directory hints (lowest priority - soft guidance only)
  - type: directory-hint
    note: "These are HINTS, not rules. Code analysis overrides."
    patterns:
      - match: "**/logic/calculators/**"
        zone: pure-core
        confidence: 0.5
      - match: "**/logic/rules/**"
        zone: pure-core
        confidence: 0.5
      - match: "**/logic/processors/**"
        zone: pure-core
        confidence: 0.5
      - match: "**/logic/workflows/**"
        zone: orchestration
        confidence: 0.4
      - match: "**/lib/**Service.js"
        zone: io-shell
        confidence: 0.6
      - match: "**/use*Logic.js"
        zone: effect-boundary
        confidence: 0.4

# Conflict resolution
conflicts:
  # When heuristics contradict directory hints: trust code analysis
  heuristic_vs_directory: "trust-heuristic"

  # When multiple heuristics conflict: highest confidence wins
  heuristic_vs_heuristic: "highest-confidence-wins"

  # Flag these for human review
  flag_for_review:
    - "pure-core zone file contains I/O imports"
    - "io-shell zone file has no I/O (maybe misplaced?)"
    - "effect-boundary file with 0 React hooks"

# Refactoring priorities by zone
refactoring_priorities:
  # What to fix in pure-core zone
  pure-core:
    high:
      - "imperative loops → map/filter/reduce"
      - "mutations → immutable operations"
      - "let/var → const"
    medium:
      - "try/catch → Result types"
      - "nested conditionals → early returns"
    low:
      - "implicit returns → explicit"

  # What to fix in effect-boundary zone
  effect-boundary:
    high:
      - "extract calculations to logic/calculators/"
      - "extract validations to logic/rules/"
    medium:
      - "extract transformations to logic/processors/"
    skip:
      - "React hook patterns (these are correct here)"
      - "State management (this is the shell)"

  # What to leave alone in io-shell zone
  io-shell:
    skip:
      - "async/await patterns"
      - "error handling around I/O"
      - "retry logic"
    flag_only:
      - "business logic mixed with I/O (should extract)"
```

### 4.5 Classification Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DYNAMIC FP CLASSIFICATION FLOW                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: CHECK EXPLICIT MARKERS (Priority 100)                              │
│     └─ Scan JSDoc for @pure, @io, @orchestration, @fp-ignore               │
│     └─ If found → DONE (100% confidence, no further analysis)              │
│                                                                             │
│  Step 2: ANALYZE CODE HEURISTICS (Priority 80)                              │
│     ├─ Import analysis                                                      │
│     │   └─ supabase, fetch, browser APIs → io-shell signal                 │
│     │   └─ only logic/ imports → pure-core signal                          │
│     ├─ Function naming                                                      │
│     │   └─ calculate*, is*, can* → pure-core signal                        │
│     │   └─ fetch*, save*, update* → io-shell signal                        │
│     ├─ Body analysis                                                        │
│     │   └─ mutations detected → impure signal                              │
│     │   └─ this keyword → impure signal                                    │
│     └─ React patterns                                                       │
│         └─ useState/useEffect → effect-boundary signal                     │
│                                                                             │
│  Step 3: APPLY DIRECTORY HINTS (Priority 50, soft guidance)                 │
│     └─ If path matches hint pattern, blend with heuristic score            │
│     └─ Heuristics ALWAYS override directory hints on conflict              │
│                                                                             │
│  Step 4: RESOLVE & WARN                                                     │
│     └─ Calculate final zone from weighted signals                          │
│     └─ Generate warnings for mismatches:                                   │
│         • "File in logic/calculators/ imports supabase"                    │
│         • "File in lib/ has no I/O (consider moving)"                      │
│                                                                             │
│  Step 5: OUTPUT CLASSIFICATION                                              │
│     └─ { zone, confidence, signals, recommended_purity, should_refactor }  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.6 Integration with AST Analyzer

Extend the `SemanticContext` from Phase 1:

```python
@dataclass
class SemanticContext:
    """Complete semantic analysis of a directory - EXTENDED."""
    root_dir: str
    files: Dict[str, FileAnalysis]
    dependency_graph: Dict[str, List[str]]
    reverse_graph: Dict[str, List[str]]
    symbol_index: Dict[str, str]

    # NEW: FP Classification per file
    fp_classifications: Dict[str, FPClassification]

    # NEW: Aggregated stats
    zone_distribution: Dict[FPZone, int]  # Count of files per zone
    files_needing_refactor: List[str]     # Files where should_refactor=True
    files_to_skip: List[str]              # Files where should_refactor=False

    # Existing fields...
    analysis_timestamp: str
    total_files: int
    total_exports: int
    total_imports: int
    parse_error_count: int
```

### 4.7 Phase 1.5 Deliverables

| Item | Path | Status |
|------|------|--------|
| FP Classifier module | `adws/adw_modules/fp_classifier.py` | TO CREATE |
| Zone config file | `.fp-zones.yaml` | TO CREATE |
| Config loader | `adws/adw_modules/fp_config.py` | TO CREATE |
| Unit tests | `adws/adw_tests/test_fp_classifier.py` | TO CREATE |

### 4.8 Phase 1.5 Success Criteria

- [ ] Classifier correctly identifies zone for 90%+ of `app/src/logic/` files
- [ ] Classifier detects misplaced code (I/O in pure zones)
- [ ] Config file is human-readable and version-controlled
- [ ] Explicit markers (@pure, @io) override all heuristics
- [ ] Classification runs in <5 seconds for full codebase

---

## 5. Phase 1.6: Idempotency & Construct Tracking (NEW)

> **Status**: FULLY DETAILED
> **Added**: 2026-01-17
> **Purpose**: Prevent re-refactoring already-processed code

### 5.1 Problem Statement

When running the orchestrator multiple times:
- Already-refactored code gets re-processed (wasted compute)
- Each transformation has non-zero risk of subtle behavior changes
- Developers lose confidence that "run again" won't undo manual improvements

**Solution**: Track refactoring state at the **construct level** (functions, hooks, components), not file level.

### 5.2 Why Construct-Level, Not File-Level?

With AST + semantic search, the unit of work isn't a file—it's a code construct:

```
File-Level Tracking:               Construct-Level Tracking:
┌─────────────────────┐            ┌─────────────────────────────────────┐
│  useListingLogic.js │  ────→     │  useListingLogic (hook)             │
│  (one entry)        │            │  calculateDisplayPrice (function)   │
│                     │            │  validateFormData (function)        │
│                     │            │  handleSubmit (handler)             │
└─────────────────────┘            └─────────────────────────────────────┘
                                          ▲
                                          │ Each tracked independently!
```

**Benefits**:
- Partial file processing (fix one function, leave others)
- Independent tracking of co-located constructs
- Precise audit trail of what was changed and why

### 5.3 Data Structures

```python
# adws/adw_modules/refactor_registry.py

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from datetime import datetime
from enum import Enum

class ConstructType(str, Enum):
    FUNCTION = "function"
    HOOK = "hook"
    COMPONENT = "component"
    CLASS = "class"
    CONSTANT = "constant"
    MODULE = "module"

class RefactorStatus(str, Enum):
    PENDING = "pending"           # Detected, not yet processed
    TRANSFORMED = "transformed"   # Successfully refactored
    SKIPPED_CLEAN = "skipped-clean"  # No anti-patterns found
    SKIPPED_IO = "skipped-io"     # In io-shell zone, intentionally skipped
    MANUALLY_FIXED = "manually-fixed"  # Code changed, patterns gone
    NEEDS_REVIEW = "needs-review"  # Transformation may have regressed

@dataclass
class ConstructIdentity:
    """Stable identifier for a code construct."""
    file_path: str
    construct_type: ConstructType
    construct_name: str
    ast_path: str  # e.g., "Program > ExportNamedDeclaration > FunctionDeclaration"

    @property
    def id(self) -> str:
        return f"{self.file_path}::{self.construct_name}"

@dataclass
class ConstructState:
    """Tracking state for a single construct."""
    identity: ConstructIdentity
    content_hash: str           # Hash of construct's source code
    fp_zone: str                # Zone at time of classification
    status: RefactorStatus
    last_processed: Optional[str] = None  # ISO timestamp
    transforms_applied: List[str] = field(default_factory=list)
    anti_patterns_found: List[str] = field(default_factory=list)
    anti_patterns_remaining: List[str] = field(default_factory=list)

@dataclass
class TransformationReceipt:
    """Audit record of a transformation."""
    receipt_id: str             # UUID
    timestamp: str              # ISO timestamp
    construct_id: str           # ConstructIdentity.id
    transform_type: str         # e.g., "imperative-to-functional"
    before_hash: str
    after_hash: str
    before_snippet: str         # First 200 chars
    after_snippet: str
    patterns_fixed: List[str]
    verified: bool = False
    verification_timestamp: Optional[str] = None

@dataclass
class RefactorRegistry:
    """Complete state of refactoring progress."""
    version: str = "1.0"
    last_run: Optional[str] = None
    constructs: Dict[str, ConstructState] = field(default_factory=dict)
    receipts: List[TransformationReceipt] = field(default_factory=list)

    # Aggregated stats
    total_constructs: int = 0
    transformed_count: int = 0
    skipped_clean_count: int = 0
    skipped_io_count: int = 0
    pending_count: int = 0
```

### 5.4 Idempotency Decision Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    IDEMPOTENCY DECISION FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  For each construct discovered by AST + Semantic Search:                    │
│                                                                             │
│  Step 1: ZONE CHECK                                                         │
│     └─ Is construct in io-shell zone?                                      │
│         └─ YES → SKIP (status: skipped-io, reason: "I/O zone")             │
│         └─ NO  → Continue to Step 2                                        │
│                                                                             │
│  Step 2: PATTERN DETECTION (Primary Gate)                                   │
│     └─ Scan construct AST for anti-patterns                                │
│     └─ No anti-patterns found?                                             │
│         └─ YES → SKIP (status: skipped-clean, reason: "already clean")     │
│         └─ NO  → Continue to Step 3 (has patterns to fix)                  │
│                                                                             │
│  Step 3: REGISTRY CHECK (Secondary Gate)                                    │
│     └─ Construct ID exists in registry?                                    │
│         └─ NO  → PROCESS (new construct, never seen)                       │
│         └─ YES → Compare content hash                                      │
│               ├─ SAME hash → SKIP (unchanged since last run)               │
│               └─ DIFF hash → Continue to Step 4 (code changed)             │
│                                                                             │
│  Step 4: REGRESSION CHECK                                                   │
│     └─ Code changed since last transformation                              │
│     └─ Re-run pattern detection                                            │
│         ├─ Patterns present → REPROCESS (regression detected)              │
│         └─ Patterns absent → UPDATE registry (manual fix applied)          │
│             └─ status: manually-fixed                                      │
│                                                                             │
│  Step 5: PROCESS CONSTRUCT                                                  │
│     └─ Apply transformations                                               │
│     └─ Generate receipt                                                    │
│     └─ Update registry (status: transformed, new hash)                     │
│                                                                             │
│  Step 6: VERIFICATION                                                       │
│     └─ Re-parse transformed code                                           │
│     └─ Confirm anti-patterns eliminated                                    │
│     └─ Mark receipt as verified                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Implementation

```python
# adws/adw_modules/refactor_registry.py (continued)

import json
import hashlib
from pathlib import Path
from typing import Tuple

class RefactorRegistryManager:
    """Manages refactoring state and idempotency checks."""

    STATE_DIR = Path(".claude/adw-state")
    REGISTRY_FILE = "refactor-registry.json"
    RECEIPTS_DIR = "receipts"

    def __init__(self, working_dir: Path):
        self.working_dir = working_dir
        self.state_dir = working_dir / self.STATE_DIR
        self.registry_path = self.state_dir / self.REGISTRY_FILE
        self.receipts_path = self.state_dir / self.RECEIPTS_DIR

        self._ensure_state_dir()
        self.registry = self._load_registry()

    def _ensure_state_dir(self):
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.receipts_path.mkdir(exist_ok=True)

    def _load_registry(self) -> RefactorRegistry:
        if self.registry_path.exists():
            data = json.loads(self.registry_path.read_text())
            return self._deserialize_registry(data)
        return RefactorRegistry()

    def save_registry(self):
        data = self._serialize_registry(self.registry)
        self.registry_path.write_text(json.dumps(data, indent=2))

    def should_process(
        self,
        construct: ConstructIdentity,
        content_hash: str,
        fp_zone: str,
        anti_patterns: List[str]
    ) -> Tuple[bool, str]:
        """
        Determine if a construct should be processed.

        Returns: (should_process: bool, reason: str)
        """
        construct_id = construct.id

        # Step 1: Zone check
        if fp_zone == "io-shell":
            self._update_construct(construct, content_hash, fp_zone,
                                   RefactorStatus.SKIPPED_IO, [])
            return False, "io-shell zone - I/O is intentional"

        # Step 2: Pattern detection (already done by caller)
        if not anti_patterns:
            self._update_construct(construct, content_hash, fp_zone,
                                   RefactorStatus.SKIPPED_CLEAN, [])
            return False, "no anti-patterns detected - already clean"

        # Step 3: Registry check
        existing = self.registry.constructs.get(construct_id)

        if not existing:
            # New construct, never seen
            self._update_construct(construct, content_hash, fp_zone,
                                   RefactorStatus.PENDING, anti_patterns)
            return True, "new construct - first analysis"

        if existing.content_hash == content_hash:
            # Unchanged since last run
            if existing.status == RefactorStatus.TRANSFORMED:
                return False, "unchanged since transformation"
            elif existing.status == RefactorStatus.SKIPPED_CLEAN:
                return False, "unchanged and clean"

        # Step 4: Code changed - check for regression
        if existing.status == RefactorStatus.TRANSFORMED:
            # Was transformed, but code changed - possible regression
            if anti_patterns:
                self._update_construct(construct, content_hash, fp_zone,
                                       RefactorStatus.NEEDS_REVIEW, anti_patterns)
                return True, "regression detected - patterns reappeared after transformation"
            else:
                # Code changed but patterns still gone - manual improvement
                self._update_construct(construct, content_hash, fp_zone,
                                       RefactorStatus.MANUALLY_FIXED, [])
                return False, "manually improved - patterns absent"

        # Default: process
        self._update_construct(construct, content_hash, fp_zone,
                               RefactorStatus.PENDING, anti_patterns)
        return True, "patterns detected - needs refactoring"

    def _update_construct(
        self,
        construct: ConstructIdentity,
        content_hash: str,
        fp_zone: str,
        status: RefactorStatus,
        anti_patterns: List[str]
    ):
        """Update or create construct state in registry."""
        self.registry.constructs[construct.id] = ConstructState(
            identity=construct,
            content_hash=content_hash,
            fp_zone=fp_zone,
            status=status,
            last_processed=datetime.now().isoformat(),
            anti_patterns_found=anti_patterns if status == RefactorStatus.PENDING else [],
            anti_patterns_remaining=anti_patterns
        )

    def record_transformation(
        self,
        construct: ConstructIdentity,
        transform_type: str,
        before_hash: str,
        after_hash: str,
        before_snippet: str,
        after_snippet: str,
        patterns_fixed: List[str]
    ) -> TransformationReceipt:
        """Record a successful transformation."""
        import uuid

        receipt = TransformationReceipt(
            receipt_id=str(uuid.uuid4()),
            timestamp=datetime.now().isoformat(),
            construct_id=construct.id,
            transform_type=transform_type,
            before_hash=before_hash,
            after_hash=after_hash,
            before_snippet=before_snippet[:200],
            after_snippet=after_snippet[:200],
            patterns_fixed=patterns_fixed
        )

        # Save receipt to file
        receipt_file = self.receipts_path / f"{receipt.receipt_id}.json"
        receipt_file.write_text(json.dumps(self._serialize_receipt(receipt), indent=2))

        # Update registry
        state = self.registry.constructs.get(construct.id)
        if state:
            state.status = RefactorStatus.TRANSFORMED
            state.content_hash = after_hash
            state.transforms_applied.append(transform_type)
            state.anti_patterns_remaining = [
                p for p in state.anti_patterns_found if p not in patterns_fixed
            ]

        self.registry.receipts.append(receipt)
        return receipt

    def get_processing_summary(self) -> Dict:
        """Get summary of what will be processed vs skipped."""
        summary = {
            'total': len(self.registry.constructs),
            'to_process': 0,
            'skip_io_shell': 0,
            'skip_clean': 0,
            'skip_unchanged': 0,
            'needs_review': 0,
            'by_zone': {}
        }

        for state in self.registry.constructs.values():
            zone = state.fp_zone
            summary['by_zone'][zone] = summary['by_zone'].get(zone, 0) + 1

            if state.status == RefactorStatus.PENDING:
                summary['to_process'] += 1
            elif state.status == RefactorStatus.SKIPPED_IO:
                summary['skip_io_shell'] += 1
            elif state.status == RefactorStatus.SKIPPED_CLEAN:
                summary['skip_clean'] += 1
            elif state.status == RefactorStatus.TRANSFORMED:
                summary['skip_unchanged'] += 1
            elif state.status == RefactorStatus.NEEDS_REVIEW:
                summary['needs_review'] += 1

        return summary
```

### 5.6 State File Structure

```
.claude/adw-state/
├── refactor-registry.json     # Main construct tracking
├── receipts/
│   ├── 2026-01-17/
│   │   ├── abc123-def456.json  # Individual transformation receipts
│   │   └── ghi789-jkl012.json
│   └── index.json              # Quick lookup by file/construct
└── fp-analysis-cache.json     # Cached FP classifications
```

**refactor-registry.json example**:
```json
{
  "version": "1.0",
  "last_run": "2026-01-17T14:30:00Z",
  "constructs": {
    "app/src/logic/calculators/pricing/calculateFourWeekRent.js::calculateFourWeekRent": {
      "identity": {
        "file_path": "app/src/logic/calculators/pricing/calculateFourWeekRent.js",
        "construct_type": "function",
        "construct_name": "calculateFourWeekRent",
        "ast_path": "Program > ExportNamedDeclaration > FunctionDeclaration"
      },
      "content_hash": "a1b2c3d4e5f6",
      "fp_zone": "pure-core",
      "status": "skipped-clean",
      "last_processed": "2026-01-17T14:30:00Z",
      "transforms_applied": [],
      "anti_patterns_found": [],
      "anti_patterns_remaining": []
    },
    "app/src/islands/pages/ListingPage/useListingPageLogic.js::calculateDisplayPrice": {
      "identity": {
        "file_path": "app/src/islands/pages/ListingPage/useListingPageLogic.js",
        "construct_type": "function",
        "construct_name": "calculateDisplayPrice",
        "ast_path": "Program > VariableDeclaration > ArrowFunction"
      },
      "content_hash": "f6e5d4c3b2a1",
      "fp_zone": "effect-boundary",
      "status": "transformed",
      "last_processed": "2026-01-17T14:35:00Z",
      "transforms_applied": ["imperative-to-functional", "extract-to-calculator"],
      "anti_patterns_found": ["imperative-loop", "mutation"],
      "anti_patterns_remaining": []
    }
  },
  "total_constructs": 156,
  "transformed_count": 23,
  "skipped_clean_count": 98,
  "skipped_io_count": 35,
  "pending_count": 0
}
```

### 5.7 Anti-Pattern Detection

```python
# adws/adw_modules/pattern_detector.py

from dataclasses import dataclass
from typing import List
from enum import Enum

class AntiPattern(str, Enum):
    IMPERATIVE_LOOP = "imperative-loop"       # for, while, do-while
    MUTATION = "mutation"                      # .push, .pop, .splice, etc.
    REASSIGNMENT = "reassignment"              # let x = 1; x = 2;
    MIXED_CONCERNS = "mixed-concerns"          # I/O mixed with calculation
    MISSING_ERROR_BOUNDARY = "missing-error-boundary"
    THIS_USAGE = "this-usage"                  # this keyword in non-class
    NESTED_CONDITIONALS = "nested-conditionals"  # Deep if/else nesting
    IMPLICIT_ANY = "implicit-any"              # TypeScript any inference

@dataclass
class PatternMatch:
    pattern: AntiPattern
    location: str  # AST path
    line: int
    snippet: str   # Code snippet showing the pattern
    severity: str  # "high", "medium", "low"
    suggested_fix: str

class PatternDetector:
    """Detect FP anti-patterns in AST nodes."""

    def detect_patterns(self, ast_node, fp_zone: str) -> List[PatternMatch]:
        """
        Detect anti-patterns in a construct.
        Zone-aware: some patterns are OK in io-shell.
        """
        patterns = []

        # Skip all detection for io-shell zone
        if fp_zone == "io-shell":
            return []

        # Detect imperative loops
        patterns.extend(self._detect_imperative_loops(ast_node))

        # Detect mutations
        patterns.extend(self._detect_mutations(ast_node))

        # Detect reassignments
        patterns.extend(self._detect_reassignments(ast_node))

        # Detect this usage (only flag in pure-core)
        if fp_zone == "pure-core":
            patterns.extend(self._detect_this_usage(ast_node))

        return patterns

    def _detect_imperative_loops(self, node) -> List[PatternMatch]:
        """Find for, while, do-while loops."""
        matches = []

        def visit(n):
            if n.type in ('for_statement', 'while_statement', 'do_statement'):
                matches.append(PatternMatch(
                    pattern=AntiPattern.IMPERATIVE_LOOP,
                    location=self._get_ast_path(n),
                    line=n.start_point[0] + 1,
                    snippet=self._get_snippet(n),
                    severity="high",
                    suggested_fix="Replace with map/filter/reduce"
                ))
            for child in n.children:
                visit(child)

        visit(node)
        return matches

    def _detect_mutations(self, node) -> List[PatternMatch]:
        """Find array/object mutations."""
        MUTATION_METHODS = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
        matches = []

        def visit(n):
            if n.type == 'call_expression':
                callee = n.child_by_field_name('function')
                if callee and callee.type == 'member_expression':
                    prop = callee.child_by_field_name('property')
                    if prop and prop.text.decode('utf-8') in MUTATION_METHODS:
                        matches.append(PatternMatch(
                            pattern=AntiPattern.MUTATION,
                            location=self._get_ast_path(n),
                            line=n.start_point[0] + 1,
                            snippet=self._get_snippet(n),
                            severity="high",
                            suggested_fix=f"Replace .{prop.text.decode('utf-8')}() with immutable operation"
                        ))
            for child in n.children:
                visit(child)

        visit(node)
        return matches
```

### 5.8 Phase 1.6 Deliverables

| Item | Path | Status |
|------|------|--------|
| Refactor Registry module | `adws/adw_modules/refactor_registry.py` | TO CREATE |
| Pattern Detector module | `adws/adw_modules/pattern_detector.py` | TO CREATE |
| State directory structure | `.claude/adw-state/` | TO CREATE |
| Unit tests | `adws/adw_tests/test_refactor_registry.py` | TO CREATE |
| Unit tests | `adws/adw_tests/test_pattern_detector.py` | TO CREATE |

### 5.9 Phase 1.6 Success Criteria

- [ ] Registry correctly tracks construct state across multiple runs
- [ ] Already-transformed constructs are skipped (no re-processing)
- [ ] Manual fixes are detected (code changed, patterns gone)
- [ ] Regressions are flagged (code changed, patterns returned)
- [ ] io-shell constructs are always skipped
- [ ] Transformation receipts provide full audit trail
- [ ] State persists across orchestrator invocations

---

## 6. Phase 1.7: Modular LLM Provider System (NEW)

> **Status**: NEW - Per-script model configuration for flexible provider switching
> **Priority**: HIGH - Enables cost optimization and model-specific task routing

### 6.1 Problem Statement

The current ADW system has a dual-provider architecture with limitations:

| Current State | Problem |
|---------------|---------|
| Global `ADW_PROVIDER` env var | Cannot mix providers within single workflow |
| `SLASH_COMMAND_MODEL_MAP` hardcoded | Adding new scripts requires code changes |
| Fallback from Gemini → Claude | Hides provider failures instead of surfacing |
| Model selection at command level | Cannot tune per-script (audit vs implement vs review) |

**User Requirement**: Per-script model configuration allowing:
- Audit phase: Use Opus (high reasoning for understanding code)
- Implementation phase: Use Sonnet (balanced speed/quality)
- Review phase: Use different model (cost/quality tradeoff)
- Each script independently configurable via environment variables

### 6.2 Existing Implementation Analysis

**Current provider abstraction** (from `adws/adw_modules/agent.py`):

```python
# Current model mapping - command-level, not script-level
SLASH_COMMAND_MODEL_MAP: Dict[SlashCommand, Dict[ModelSet, str]] = {
    "/implement": {"base": "sonnet", "heavy": "opus"},
    "/test": {"base": "sonnet", "heavy": "sonnet"},
    "/review": {"base": "sonnet", "heavy": "sonnet"},
    # ... 18 total commands mapped
}

# Provider selection (global)
provider = os.environ.get("ADW_PROVIDER", "gemini")

# Gemini model translation
GEMINI_MODEL_MAP = {
    "sonnet": os.environ.get("GEMINI_BASE_MODEL", "gemini-2.0-flash"),
    "opus": os.environ.get("GEMINI_HEAVY_MODEL", "gemini-2.0-flash-exp")
}
```

### 6.3 Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MODULAR LLM PROVIDER SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  adws/.env (ADW-specific environment)                                       │
│  ├── ADW_DEFAULT_PROVIDER=gemini                                            │
│  ├── ADW_AUDIT_MODEL=claude-opus                                            │
│  ├── ADW_IMPLEMENT_MODEL=gemini-flash                                       │
│  ├── ADW_REVIEW_MODEL=claude-sonnet                                         │
│  ├── ADW_CHUNK_MODEL=gemini-flash                                           │
│  └── ADW_VALIDATE_MODEL=gemini-flash                                        │
│                                                                             │
│  llm_provider.py (New unified provider interface)                           │
│  ├── LLMProvider (base class)                                               │
│  ├── ClaudeProvider (implements claude-opus, claude-sonnet)                 │
│  ├── GeminiProvider (implements gemini-flash, gemini-pro)                   │
│  └── get_provider_for_script(script_name) → LLMProvider                     │
│                                                                             │
│  Model Resolution Order:                                                    │
│  1. Script-specific env var (ADW_AUDIT_MODEL)                               │
│  2. Provider default (ADW_DEFAULT_PROVIDER)                                 │
│  3. Hardcoded fallback (gemini-flash)                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Data Types

```python
from enum import Enum
from dataclasses import dataclass
from typing import Optional, Callable, Any
from abc import ABC, abstractmethod

class ModelId(str, Enum):
    """Supported model identifiers."""
    CLAUDE_OPUS = "claude-opus"
    CLAUDE_SONNET = "claude-sonnet"
    GEMINI_FLASH = "gemini-flash"
    GEMINI_PRO = "gemini-pro"

class ProviderType(str, Enum):
    """LLM provider types."""
    CLAUDE = "claude"
    GEMINI = "gemini"

@dataclass(frozen=True)
class ModelConfig:
    """Configuration for a specific model."""
    model_id: ModelId
    provider: ProviderType
    api_model_name: str  # Actual API model identifier
    max_tokens: int = 8192
    temperature: float = 0.7

@dataclass(frozen=True)
class ScriptModelMapping:
    """Maps ADW scripts to their configured models."""
    audit: ModelId
    implement: ModelId
    review: ModelId
    chunk: ModelId
    validate: ModelId
    fp_classify: ModelId
    pattern_detect: ModelId

# Model registry with API names
MODEL_REGISTRY: dict[ModelId, ModelConfig] = {
    ModelId.CLAUDE_OPUS: ModelConfig(
        model_id=ModelId.CLAUDE_OPUS,
        provider=ProviderType.CLAUDE,
        api_model_name="claude-opus-4-5-20251101",
        max_tokens=8192
    ),
    ModelId.CLAUDE_SONNET: ModelConfig(
        model_id=ModelId.CLAUDE_SONNET,
        provider=ProviderType.CLAUDE,
        api_model_name="claude-sonnet-4-20250514",
        max_tokens=8192
    ),
    ModelId.GEMINI_FLASH: ModelConfig(
        model_id=ModelId.GEMINI_FLASH,
        provider=ProviderType.GEMINI,
        api_model_name="gemini-2.0-flash",
        max_tokens=8192
    ),
    ModelId.GEMINI_PRO: ModelConfig(
        model_id=ModelId.GEMINI_PRO,
        provider=ProviderType.GEMINI,
        api_model_name="gemini-1.5-pro",
        max_tokens=8192
    ),
}
```

### 6.5 LLM Provider Interface

```python
class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    def __init__(self, config: ModelConfig):
        self.config = config

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """Generate a response from the LLM."""
        pass

    @abstractmethod
    async def generate_with_tools(
        self,
        prompt: str,
        tools: list[dict],
        system_prompt: Optional[str] = None
    ) -> dict:
        """Generate response with tool calling capability."""
        pass

    @property
    def model_name(self) -> str:
        return self.config.api_model_name


class ClaudeProvider(LLMProvider):
    """Claude-specific provider using Claude Code CLI."""

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        # Use Claude Code CLI (cc) for invocation
        # This preserves existing Claude Code integration
        cmd = ["cc", "--model", self.config.api_model_name]
        if system_prompt:
            cmd.extend(["--system", system_prompt])
        # ... implementation using subprocess
        pass


class GeminiProvider(LLMProvider):
    """Gemini-specific provider using direct API."""

    def __init__(self, config: ModelConfig):
        super().__init__(config)
        import google.generativeai as genai
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel(self.config.api_model_name)

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        generation_config = {
            "temperature": temperature or self.config.temperature,
            "max_output_tokens": max_tokens or self.config.max_tokens,
        }
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        response = await self.model.generate_content_async(
            full_prompt,
            generation_config=generation_config
        )
        return response.text
```

### 6.6 Script-to-Model Resolution

```python
import os
from pathlib import Path
from dotenv import load_dotenv

class ADWModelResolver:
    """Resolves which model to use for each ADW script."""

    # Environment variable names for each script
    SCRIPT_ENV_VARS = {
        "audit": "ADW_AUDIT_MODEL",
        "implement": "ADW_IMPLEMENT_MODEL",
        "review": "ADW_REVIEW_MODEL",
        "chunk": "ADW_CHUNK_MODEL",
        "validate": "ADW_VALIDATE_MODEL",
        "fp_classify": "ADW_FP_CLASSIFY_MODEL",
        "pattern_detect": "ADW_PATTERN_DETECT_MODEL",
    }

    def __init__(self, adws_root: Path):
        self.adws_root = adws_root
        self._load_adw_env()

    def _load_adw_env(self):
        """Load ADW-specific .env file."""
        env_file = self.adws_root / ".env"
        if env_file.exists():
            load_dotenv(env_file, override=True)

    def get_model_for_script(self, script_name: str) -> ModelConfig:
        """
        Get the configured model for a specific script.

        Resolution order:
        1. Script-specific env var (e.g., ADW_AUDIT_MODEL)
        2. Default provider env var (ADW_DEFAULT_MODEL)
        3. Hardcoded fallback (gemini-flash)
        """
        # Try script-specific env var
        env_var = self.SCRIPT_ENV_VARS.get(script_name)
        if env_var:
            model_str = os.environ.get(env_var)
            if model_str:
                try:
                    model_id = ModelId(model_str)
                    return MODEL_REGISTRY[model_id]
                except (ValueError, KeyError):
                    pass  # Invalid model, fall through

        # Try default model
        default_model = os.environ.get("ADW_DEFAULT_MODEL")
        if default_model:
            try:
                model_id = ModelId(default_model)
                return MODEL_REGISTRY[model_id]
            except (ValueError, KeyError):
                pass

        # Hardcoded fallback
        return MODEL_REGISTRY[ModelId.GEMINI_FLASH]

    def get_provider_for_script(self, script_name: str) -> LLMProvider:
        """Get initialized provider for a script."""
        config = self.get_model_for_script(script_name)

        if config.provider == ProviderType.CLAUDE:
            return ClaudeProvider(config)
        elif config.provider == ProviderType.GEMINI:
            return GeminiProvider(config)
        else:
            raise ValueError(f"Unknown provider: {config.provider}")
```

### 6.7 ADW Environment File Structure

**File: `adws/.env`** (ADW-specific, gitignored)

```bash
# ============================================
# ADW Modular LLM Provider Configuration
# ============================================

# Default provider when script-specific not set
ADW_DEFAULT_MODEL=gemini-flash

# Per-script model configuration
# Options: claude-opus, claude-sonnet, gemini-flash, gemini-pro
ADW_AUDIT_MODEL=claude-opus
ADW_IMPLEMENT_MODEL=gemini-flash
ADW_REVIEW_MODEL=claude-sonnet
ADW_CHUNK_MODEL=gemini-flash
ADW_VALIDATE_MODEL=gemini-flash
ADW_FP_CLASSIFY_MODEL=gemini-flash
ADW_PATTERN_DETECT_MODEL=gemini-flash

# API Keys (if not set globally)
# GEMINI_API_KEY=your-key-here
# ANTHROPIC_API_KEY=your-key-here
```

**File: `adws/.env.example`** (committed to repo)

```bash
# ADW Environment Configuration Template
# Copy to .env and customize

ADW_DEFAULT_MODEL=gemini-flash

# Per-script models (options: claude-opus, claude-sonnet, gemini-flash, gemini-pro)
ADW_AUDIT_MODEL=claude-opus
ADW_IMPLEMENT_MODEL=gemini-flash
ADW_REVIEW_MODEL=claude-sonnet
ADW_CHUNK_MODEL=gemini-flash
ADW_VALIDATE_MODEL=gemini-flash
ADW_FP_CLASSIFY_MODEL=gemini-flash
ADW_PATTERN_DETECT_MODEL=gemini-flash
```

### 6.8 Integration with Existing Code

**Migration path from current `agent.py`**:

```python
# BEFORE (agent.py current)
SLASH_COMMAND_MODEL_MAP: Dict[SlashCommand, Dict[ModelSet, str]] = {
    "/implement": {"base": "sonnet", "heavy": "opus"},
    # ...
}

# AFTER (using new system)
from adws.adw_modules.llm_provider import ADWModelResolver

resolver = ADWModelResolver(Path("adws"))

# In orchestrator
async def run_audit():
    provider = resolver.get_provider_for_script("audit")
    result = await provider.generate(audit_prompt, system_prompt=FP_AUDIT_SYSTEM)
    return result

async def run_implementation(chunk: ChunkData):
    provider = resolver.get_provider_for_script("implement")
    result = await provider.generate(implement_prompt)
    return result
```

### 6.9 Phase 1.7 Deliverables

| Item | Path | Status |
|------|------|--------|
| LLM Provider module | `adws/adw_modules/llm_provider.py` | TO CREATE |
| Model registry | `adws/adw_modules/model_registry.py` | TO CREATE |
| ADW environment file | `adws/.env.example` | TO CREATE |
| Provider unit tests | `adws/adw_tests/test_llm_provider.py` | TO CREATE |
| Migration of agent.py | `adws/adw_modules/agent.py` | TO MODIFY |

### 6.10 Phase 1.7 Success Criteria

- [ ] Each script can be configured to use a different model via env var
- [ ] ADW-specific `.env` file is loaded and respected
- [ ] Provider switching is transparent to calling code
- [ ] Existing Claude Code integration preserved for Claude models
- [ ] Gemini direct API integration working
- [ ] Invalid model configurations fail fast with clear error
- [ ] Model resolution order documented and tested

---

## 7. Phase 1.8: ADW Ecosystem Restructure (NEW)

> **Status**: NEW - Move FP skill into ADW system for self-contained ecosystem
> **Priority**: MEDIUM - Enables ADW-specific tooling without polluting global .claude

### 7.1 Problem Statement

Current state:
- FP audit tooling lives in `.claude/skills/functional-code/`
- ADW scripts reference global `.claude` directory
- No clear separation between "Claude Code skills" and "ADW-specific tooling"
- ADW system not self-contained - has external dependencies

**Goal**: Make `adws/` directory a self-contained ecosystem that:
1. Contains all ADW-specific tooling (including FP analysis)
2. Has its own documentation separate from project docs
3. Can reference parent project context when needed
4. Maintains clear boundaries with global Claude Code configuration

### 7.2 Current FP Skill Structure

**Files to migrate from `.claude/skills/functional-code/`**:

| File | Lines | Purpose | Migration Target |
|------|-------|---------|------------------|
| `scripts/fp_audit.py` | 378 | FP violation detection | `adws/adw_modules/fp/fp_audit.py` |
| `SKILL.md` | 416 | FP principles guide | `adws/docs/FP_GUIDE.md` |

**Key components in `fp_audit.py`**:
- `JavaScriptFPAuditor` class - regex-based pattern detection
- `FPViolation` dataclass - violation representation
- `ViolationType` and `Severity` enums
- `generate_markdown_report()` - report generation

### 7.3 Target Directory Structure

```
adws/
├── .env                              # ADW-specific environment (gitignored)
├── .env.example                      # Environment template (committed)
├── README.md                         # ADW ecosystem overview
│
├── docs/                             # ADW-specific documentation
│   ├── FP_GUIDE.md                   # Functional programming principles (from SKILL.md)
│   ├── ADW_ARCHITECTURE.md           # How ADW orchestration works
│   ├── MODEL_CONFIGURATION.md        # LLM provider setup guide
│   └── PYTHON_CONVENTIONS.md         # Python-specific coding standards
│
├── adw_modules/                      # Core ADW modules
│   ├── __init__.py
│   ├── agent.py                      # Claude Code agent interface
│   ├── gemini_agent.py               # Gemini direct API
│   ├── llm_provider.py               # NEW: Unified provider system
│   ├── model_registry.py             # NEW: Model configurations
│   ├── chunk_parser.py               # Chunk extraction
│   ├── lsp_validator.py              # LSP validation
│   ├── data_types.py                 # Shared data types
│   │
│   ├── ast/                          # NEW: AST analysis modules
│   │   ├── __init__.py
│   │   ├── analyzer.py               # Main AST analyzer (Phase 1)
│   │   ├── symbol_table.py           # Symbol extraction
│   │   └── dependency_graph.py       # Import/export graph
│   │
│   ├── fp/                           # NEW: FP analysis modules
│   │   ├── __init__.py
│   │   ├── fp_audit.py               # Migrated from .claude/skills
│   │   ├── fp_classifier.py          # Dynamic FP zone classification
│   │   └── pattern_detector.py       # AST-based pattern detection
│   │
│   └── registry/                     # NEW: Idempotency tracking
│       ├── __init__.py
│       └── refactor_registry.py      # Construct tracking
│
├── adw_tests/                        # ADW test suite
│   ├── __init__.py
│   ├── test_llm_provider.py
│   ├── test_fp_audit.py
│   └── test_ast_analyzer.py
│
├── templates/                        # Prompt templates
│   ├── fp_audit_prompt.md
│   ├── implementation_prompt.md
│   └── review_prompt.md
│
└── state/                            # Runtime state (gitignored)
    ├── .gitkeep
    ├── refactor_registry.json
    └── construct_hashes/
```

### 7.4 Documentation Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DOCUMENTATION HIERARCHY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROJECT LEVEL (.claude/)                                                   │
│  └── CLAUDE.md                 → Project context, architecture, rules       │
│  └── Documentation/            → Project-wide documentation                 │
│      ├── miniCLAUDE.md         → Quick reference                           │
│      └── largeCLAUDE.md        → Full context                              │
│                                                                             │
│  ADW LEVEL (adws/docs/)                                                     │
│  └── README.md                 → ADW ecosystem overview                     │
│  └── FP_GUIDE.md               → Functional programming principles          │
│  └── ADW_ARCHITECTURE.md       → Orchestration pipeline details             │
│  └── MODEL_CONFIGURATION.md    → LLM provider setup                         │
│  └── PYTHON_CONVENTIONS.md     → Python coding standards for ADW           │
│                                                                             │
│  REFERENCE (parent → child)                                                 │
│  ADW docs can reference project docs via relative paths:                    │
│  "See ../../.claude/Documentation/miniCLAUDE.md for project context"       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.5 FP Audit Migration

**Before** (`.claude/skills/functional-code/scripts/fp_audit.py`):
```python
class JavaScriptFPAuditor:
    MUTATION_PATTERNS = [r'\.push\(', r'\.pop\(', ...]
    IO_PATTERNS = [r'console\.', r'fetch\(', ...]
```

**After** (`adws/adw_modules/fp/fp_audit.py`):
```python
"""
FP Audit Module - Functional Programming Violation Detection

This module scans JavaScript/TypeScript codebases for FP violations.
Part of the ADW (AI Developer Workflow) ecosystem.

For FP principles and guidelines, see: adws/docs/FP_GUIDE.md
For project context, see: .claude/CLAUDE.md
"""

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import List, Optional

# Import shared types from ADW modules
from adws.adw_modules.data_types import FileAnalysis


class Severity(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ViolationType(Enum):
    # ... same as before
    pass


@dataclass
class FPViolation:
    """Represents a single FP principle violation."""
    file_path: str
    line_number: int
    violation_type: ViolationType
    severity: Severity
    principle: str
    description: str
    current_code: str
    suggested_fix: str
    rationale: str


class FPAuditor:
    """
    Audits JavaScript/TypeScript files for FP violations.

    This is the regex-based auditor. For AST-based detection,
    see PatternDetector in adws/adw_modules/fp/pattern_detector.py
    """

    def __init__(self, root_path: Path, config: Optional[dict] = None):
        self.root_path = root_path
        self.config = config or {}
        self.violations: List[FPViolation] = []

    def audit(self) -> List[FPViolation]:
        """Run full audit on codebase."""
        # ... implementation
        pass
```

### 7.6 ADW README.md

```markdown
# ADW - AI Developer Workflow

> Modular AST-enhanced code refactoring orchestration system

## Overview

ADW is a self-contained ecosystem for automated code refactoring with:

- **AST-based code analysis** - Semantic understanding of JavaScript/TypeScript
- **Functional programming enforcement** - Automated FP violation detection
- **Modular LLM providers** - Switch between Claude and Gemini per-task
- **Idempotent operations** - Track and skip already-processed code

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your model preferences

# 2. Run FP audit
python -m adws.adw_modules.fp.fp_audit app/src

# 3. Run full orchestration
python adws/unified_fp_orchestrator.py
```

## Documentation

| Document | Purpose |
|----------|---------|
| [FP_GUIDE.md](docs/FP_GUIDE.md) | Functional programming principles |
| [ADW_ARCHITECTURE.md](docs/ADW_ARCHITECTURE.md) | Pipeline architecture |
| [MODEL_CONFIGURATION.md](docs/MODEL_CONFIGURATION.md) | LLM provider setup |
| [PYTHON_CONVENTIONS.md](docs/PYTHON_CONVENTIONS.md) | Python coding standards |

## Project Context

For broader project documentation:
- [Project CLAUDE.md](../.claude/CLAUDE.md) - Main project context
- [miniCLAUDE.md](../.claude/Documentation/miniCLAUDE.md) - Quick reference
```

### 7.7 Cleanup of .claude/skills/

After migration, the FP skill in `.claude/skills/functional-code/` should be:

**Option A**: Delete entirely (ADW owns FP tooling)
```
.claude/skills/functional-code/ → DELETE
```

**Option B**: Replace with redirect notice
```markdown
# .claude/skills/functional-code/SKILL.md

> ⚠️ **MOVED**: This skill has been migrated to the ADW ecosystem.
>
> New location: `adws/docs/FP_GUIDE.md`
> Audit script: `adws/adw_modules/fp/fp_audit.py`
>
> Run: `python -m adws.adw_modules.fp.fp_audit <path>`
```

**Recommendation**: Option B - maintains discoverability while redirecting.

### 7.8 Phase 1.8 Deliverables

| Item | Path | Status |
|------|------|--------|
| ADW README | `adws/README.md` | TO CREATE |
| FP Guide | `adws/docs/FP_GUIDE.md` | TO CREATE (from SKILL.md) |
| ADW Architecture doc | `adws/docs/ADW_ARCHITECTURE.md` | TO CREATE |
| Model Configuration doc | `adws/docs/MODEL_CONFIGURATION.md` | TO CREATE |
| Python Conventions doc | `adws/docs/PYTHON_CONVENTIONS.md` | TO CREATE |
| FP Audit module | `adws/adw_modules/fp/fp_audit.py` | TO CREATE (from scripts/) |
| FP Classifier module | `adws/adw_modules/fp/fp_classifier.py` | TO CREATE |
| Pattern Detector module | `adws/adw_modules/fp/pattern_detector.py` | TO CREATE |
| Redirect notice | `.claude/skills/functional-code/SKILL.md` | TO MODIFY |

### 7.9 Phase 1.8 Success Criteria

- [ ] `adws/` directory is self-contained with own docs and tooling
- [ ] FP audit can be run from `adws/adw_modules/fp/fp_audit.py`
- [ ] ADW docs reference project docs via relative paths
- [ ] `.claude/skills/functional-code/` contains redirect notice
- [ ] All ADW Python code follows `PYTHON_CONVENTIONS.md`
- [ ] ADW environment variables isolated to `adws/.env`

---

## 8. Phase 2: Dependency-Aware Chunk Generation

> **Status**: OUTLINED - Details to be expanded after Phase 1.8 completion

### 8.1 Overview

Modify the chunk parser and orchestrator to:
1. Parse new chunk metadata (category, depends_on, creates_exports)
2. Build execution order using topological sort
3. Validate chunk dependencies before execution

### 8.2 Key Changes

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

### 8.3 References for Phase 2

- [chunk_parser.py](adws/adw_modules/chunk_parser.py) - Current parser implementation
- [Research Document: Dependency ordering problem](#the-dependency-ordering-problem-requires-explicit-graph-construction) - From attached research
- [TAC Architecture: State-Based Sequencing](#pattern-2-state-based-sequencing) - From TAC guide

---

## 9. Phase 3: Intelligent Validation Pipeline

> **Status**: OUTLINED - Details to be expanded after Phase 2 completion

### 9.1 Overview

Replace the current 5-layer redundant validation with a tiered fail-fast pipeline:

| Tier | Check | Time | Action on Fail |
|------|-------|------|----------------|
| 1 | ESLint syntax parse | <100ms | Immediate fail |
| 2 | Import resolution (from AST context) | <500ms | Immediate fail |
| 3 | Affected-file type check | 2-10s | Immediate fail |
| 4 | Full build (once per page group) | 10-30s | Immediate fail |
| 5 | Visual regression | 30-60s | Commit or reset |

### 9.2 Key Changes

**Remove**:
- Redundant pre-LSP validation (replaced by AST context)
- Per-chunk full builds (moved to end of page group)
- Final build gate (redundant with Tier 4)

**Add**:
- AST-based import verification
- Affected-only type checking (using `tsc --incremental`)
- Tier tracking for debugging

### 9.3 References for Phase 3

- [lsp_validator.py](adws/adw_modules/lsp_validator.py) - Current validation
- [Research Document: Optimal validation pipeline](#the-optimal-validation-pipeline-uses-tiered-fail-fast-ordering) - From attached research

---

## 10. Phase 4: Failure Recovery & Re-planning

> **Status**: OUTLINED - Details to be expanded after Phase 3 completion

### 10.1 Overview

Implement intelligent failure recovery:
1. Per-chunk atomic commits (not per-group)
2. Quarantine failed chunks, continue with independent chunks
3. Incremental re-audit after N failures or N chunks

### 10.2 Key Changes

**Commit granularity**:
- Each successful chunk gets its own commit
- Failed chunks reset only themselves
- Dependent chunks are skipped (not reset)

**Re-planning triggers**:
- After 5 successful chunks (context may have shifted)
- After 2 failures (plan may be stale)
- After any SCAFFOLD chunk (file structure changed)

### 10.3 References for Phase 4

- [Research Document: Atomic per-chunk commits](#atomic-per-chunk-commits-eliminate-cascading-resets) - From attached research
- [Research Document: Incremental re-auditing](#incremental-re-auditing-solves-plan-staleness) - From attached research

---

## 11. Phase 5: Integration & Testing

> **Status**: OUTLINED - Details to be expanded after Phase 4 completion

### 11.1 Overview

Full integration testing and performance benchmarking:
1. Run on real refactoring tasks
2. Compare success rates: old vs new
3. Benchmark execution time
4. Document edge cases

### 11.2 Success Metrics

| Metric | Target | Current Baseline |
|--------|--------|------------------|
| First-pass success rate | >80% | ~40% (estimated) |
| Execution time per chunk | <30s | ~120s |
| False positive rate | <5% | ~20% (estimated) |
| Cascading failure rate | <2% | ~30% (estimated) |

### 11.3 References for Phase 5

- [Research Document: Expected improvements](#expected-improvements-with-recommended-architecture) - From attached research

---

## 12. File References

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
| `adw_modules/fp_classifier.py` | 1.5 | Dynamic FP zone classification |
| `adw_modules/fp_config.py` | 1.5 | Load .fp-zones.yaml configuration |
| `adw_modules/refactor_registry.py` | 1.6 | Construct-level state tracking |
| `adw_modules/pattern_detector.py` | 1.6 | Anti-pattern detection in AST |
| `adw_modules/llm_provider.py` | 1.7 | Unified LLM provider interface |
| `adw_modules/model_registry.py` | 1.7 | Model configurations and registry |
| `adws/.env.example` | 1.7 | ADW environment template |
| `adws/docs/FP_GUIDE.md` | 1.8 | FP principles guide (migrated) |
| `adws/docs/ADW_ARCHITECTURE.md` | 1.8 | ADW pipeline architecture |
| `adws/docs/MODEL_CONFIGURATION.md` | 1.8 | LLM provider setup guide |
| `adws/docs/PYTHON_CONVENTIONS.md` | 1.8 | Python coding standards |
| `adws/README.md` | 1.8 | ADW ecosystem overview |
| `adw_modules/fp/fp_audit.py` | 1.8 | FP audit (migrated from .claude/skills) |
| `adw_modules/fp/fp_classifier.py` | 1.8 | FP zone classifier (moved) |
| `adw_modules/fp/pattern_detector.py` | 1.8 | AST-based pattern detection |
| `adw_modules/dependency_graph.py` | 2 | Topological sorting, cycle detection |
| `adw_modules/tiered_validator.py` | 3 | Fail-fast validation pipeline |
| `.fp-zones.yaml` | 1.5 | FP zone configuration (project root) |
| `.claude/adw-state/` | 1.6 | Refactoring state directory |
| `adws/state/` | 1.8 | ADW runtime state directory |
| `adw_tests/test_ast_analyzer.py` | 1 | Unit tests for AST analyzer |
| `adw_tests/test_fp_classifier.py` | 1.5 | Unit tests for FP classifier |
| `adw_tests/test_refactor_registry.py` | 1.6 | Unit tests for registry |
| `adw_tests/test_pattern_detector.py` | 1.6 | Unit tests for pattern detection |
| `adw_tests/test_llm_provider.py` | 1.7 | Unit tests for LLM provider |
| `adw_tests/test_dependency_graph.py` | 2 | Unit tests for dependency ordering |

### Reference Documentation

| Document | Relevance |
|----------|-----------|
| [AI-driven refactoring orchestration research](attached) | Core design patterns |
| [TAC Architecture Guide](.claude/plans/Documents/20260116193000_TAC_Clean_Architecture_Guide.md) | Isolation, state management patterns |
| [miniCLAUDE.md](Documentation/miniCLAUDE.md) | Quick reference for simple tasks |
| [largeCLAUDE.md](Documentation/largeCLAUDE.md) | Full context for complex tasks |

---

## 13. Risk Assessment

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
| FP classifier misclassifying files | Heuristics override directory hints; explicit markers as escape hatch |
| Registry state corruption | JSON schema validation; backup before writes |
| Config file drift from codebase | Periodic audit via CI; config validation |
| Provider API rate limits | Exponential backoff; model-specific rate limiting |
| Model config env var typos | Validation on load; fail-fast with clear errors |
| FP skill migration breaks existing workflows | Redirect notice in old location; transition period |

### Low Risk

| Risk | Mitigation |
|------|------------|
| Tree-sitter dependency issues | Well-maintained library; pip install |
| JSON output too large | Compression; selective inclusion |

---

## Approval Checklist

Before proceeding to implementation:

**Phase 1: AST Semantic Analyzer**
- [ ] Review Phase 1 specification in detail
- [ ] Confirm tree-sitter as appropriate parser choice
- [ ] Validate data structures meet Claude's needs

**Phase 1.5: Dynamic FP Zone Classification**
- [ ] Review zone definitions (pure-core, orchestration, effect-boundary, io-shell)
- [ ] Confirm heuristic weights and thresholds
- [ ] Approve `.fp-zones.yaml` configuration structure
- [ ] Validate JSDoc marker strategy (@pure, @io, @fp-ignore)

**Phase 1.6: Idempotency & Construct Tracking**
- [ ] Review construct-level tracking approach
- [ ] Confirm idempotency decision flow
- [ ] Approve state file structure (`.claude/adw-state/`)
- [ ] Validate anti-pattern detection strategy

**Phase 1.7: Modular LLM Provider System**
- [ ] Review per-script model configuration approach
- [ ] Confirm model identifier naming (claude-opus, claude-sonnet, gemini-flash, gemini-pro)
- [ ] Approve ADW-specific `.env` file structure
- [ ] Validate model resolution order (script-specific → default → fallback)
- [ ] Confirm Claude Code CLI integration for Claude models
- [ ] Confirm Gemini direct API integration

**Phase 1.8: ADW Ecosystem Restructure**
- [ ] Review target directory structure for `adws/`
- [ ] Approve FP skill migration path from `.claude/skills/`
- [ ] Confirm documentation hierarchy (project-level vs ADW-level)
- [ ] Approve redirect notice strategy for deprecated skill location
- [ ] Validate Python conventions document scope

**General**
- [ ] Approve testing strategy across all phases
- [ ] Set timeline expectations
- [ ] Confirm phased rollout approach (1 → 1.5 → 1.6 → 1.7 → 1.8 → 2 → ...)

---

**Document Version**: 3.0
**Created**: 2026-01-16
**Updated**: 2026-01-17
**Author**: Claude Opus (via orchestration analysis)
**Status**: AWAITING APPROVAL

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-16 | Initial plan with AST analyzer and dependency ordering |
| 2.0 | 2026-01-17 | Added Phase 1.5 (Dynamic FP Zone Classification) and Phase 1.6 (Idempotency & Construct Tracking) |
| 3.0 | 2026-01-17 | Added Phase 1.7 (Modular LLM Provider System) and Phase 1.8 (ADW Ecosystem Restructure); renumbered subsequent phases |
