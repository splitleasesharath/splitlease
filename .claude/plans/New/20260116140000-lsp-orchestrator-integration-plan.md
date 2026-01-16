# LSP Integration for ADW Orchestrator

**Created:** 2026-01-16 14:00:00
**Status:** New
**Priority:** High
**Goal:** Prevent "function not defined" and broken import errors by integrating TypeScript LSP validation into the ADW refactoring orchestrator.

---

## Problem Statement

The `adw_unified_fp_orchestrator.py` currently validates refactored code **after** writing it, using `bun run build`. This approach has critical flaws:

1. **Late Detection**: Errors like "function not defined" are caught only after code is written
2. **No Semantic Awareness**: The orchestrator doesn't understand import/export relationships
3. **Missing Cascade Detection**: When renaming/moving functions, dependent files aren't identified
4. **Slow Feedback Loop**: Full builds take 30-60s; LSP diagnostics take 1-2s

The recent refactoring run introduced many "function not defined" errors because:
- Chunks were implemented in isolation without dependency awareness
- Imports referenced functions that didn't exist or were renamed
- No pre-flight validation caught these issues before writing

---

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LSP-ENHANCED ORCHESTRATOR PIPELINE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 1: AUDIT (Enhanced with LSP)                                  │   │
│  │                                                                     │   │
│  │  1. Claude Opus audits target directory                            │   │
│  │  2. NEW: LSP finds all references for exported symbols             │   │
│  │  3. NEW: Dependency map included in chunk grouping                 │   │
│  │  4. Chunks grouped by page + cascading dependencies                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 2: PRE-VALIDATE (NEW)                                         │   │
│  │                                                                     │   │
│  │  For each chunk's refactored_code BEFORE writing:                  │   │
│  │  1. LSP: Parse and extract all import statements                   │   │
│  │  2. LSP: textDocument/definition - verify imports resolve          │   │
│  │  3. LSP: Extract all function/variable references                  │   │
│  │  4. LSP: textDocument/definition - verify symbols exist            │   │
│  │  5. FAIL FAST if any validation fails                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 3: IMPLEMENT (Existing)                                       │   │
│  │                                                                     │   │
│  │  Claude/Gemini writes chunk to file                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 4: POST-VALIDATE (Enhanced)                                   │   │
│  │                                                                     │   │
│  │  1. NEW: LSP diagnostics for modified file (~1-2s)                 │   │
│  │     - Catches: undefined symbols, type errors, import errors       │   │
│  │     - If errors → FAIL immediately (skip build)                    │   │
│  │  2. bun run lint (~5-10s)                                          │   │
│  │  3. bun run typecheck (~10-20s)                                    │   │
│  │  4. bun run build (~30-60s)                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 5: VISUAL CHECK (Existing)                                    │   │
│  │                                                                     │   │
│  │  Playwright visual regression                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Chunk 1: Create LSP Validator Module

**File:** `adws/adw_modules/lsp_validator.py`
**Effort:** Medium (2-3 hours)

Create a new module that interfaces with TypeScript LSP:

```python
"""
LSP Validator Module - TypeScript Language Server integration for code validation.

Uses typescript-language-server to validate code BEFORE and AFTER writing.
Provides semantic validation that catches undefined symbols, broken imports,
and type errors faster than a full build.
"""

import subprocess
import json
import re
import tempfile
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

@dataclass
class LSPDiagnostic:
    """Single diagnostic from LSP."""
    severity: str  # "error" | "warning" | "info" | "hint"
    message: str
    file: str
    line: int
    column: int
    code: Optional[str] = None

@dataclass
class ImportValidation:
    """Result of validating imports in code."""
    valid: bool
    missing_imports: List[str] = field(default_factory=list)
    unresolved_modules: List[str] = field(default_factory=list)

@dataclass
class SymbolValidation:
    """Result of validating symbol references."""
    valid: bool
    undefined_symbols: List[str] = field(default_factory=list)

@dataclass
class LSPValidationResult:
    """Combined LSP validation result."""
    valid: bool
    diagnostics: List[LSPDiagnostic] = field(default_factory=list)
    import_validation: Optional[ImportValidation] = None
    symbol_validation: Optional[SymbolValidation] = None
    error_count: int = 0
    warning_count: int = 0


def extract_imports_from_code(code: str) -> List[Tuple[str, List[str]]]:
    """
    Extract import statements from JavaScript/TypeScript code.

    Returns:
        List of (module_path, [imported_symbols])
    """
    imports = []

    # Match: import { foo, bar } from './module'
    named_import_pattern = r"import\s+\{([^}]+)\}\s+from\s+['\"]([^'\"]+)['\"]"
    for match in re.finditer(named_import_pattern, code):
        symbols = [s.strip().split(' as ')[0] for s in match.group(1).split(',')]
        module = match.group(2)
        imports.append((module, symbols))

    # Match: import foo from './module'
    default_import_pattern = r"import\s+(\w+)\s+from\s+['\"]([^'\"]+)['\"]"
    for match in re.finditer(default_import_pattern, code):
        symbol = match.group(1)
        module = match.group(2)
        if not any(m == module for m, _ in imports):
            imports.append((module, [symbol]))

    # Match: import * as foo from './module'
    namespace_import_pattern = r"import\s+\*\s+as\s+(\w+)\s+from\s+['\"]([^'\"]+)['\"]"
    for match in re.finditer(namespace_import_pattern, code):
        symbol = match.group(1)
        module = match.group(2)
        imports.append((module, [f"* as {symbol}"]))

    return imports


def extract_function_calls(code: str) -> List[str]:
    """
    Extract function call identifiers from code.

    Returns:
        List of function names that are called
    """
    # Match function calls: functionName(...)
    # Exclude common keywords and built-ins
    builtin_functions = {
        'if', 'else', 'for', 'while', 'switch', 'case', 'return', 'throw',
        'try', 'catch', 'finally', 'new', 'typeof', 'instanceof', 'void',
        'console', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
        'Math', 'Date', 'Promise', 'Map', 'Set', 'Error', 'RegExp',
        'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI',
        'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
        'fetch', 'require', 'import', 'export'
    }

    # Pattern: identifier followed by (
    pattern = r'\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\('
    matches = re.findall(pattern, code)

    # Filter out builtins and duplicates
    return list(set(m for m in matches if m not in builtin_functions))


def get_file_diagnostics(
    file_path: Path,
    working_dir: Path,
    timeout: int = 30
) -> List[LSPDiagnostic]:
    """
    Get LSP diagnostics for a file using TypeScript compiler.

    Uses `tsc --noEmit` on a single file for fast feedback.

    Args:
        file_path: Path to the file to check
        working_dir: Project working directory
        timeout: Timeout in seconds

    Returns:
        List of diagnostics
    """
    diagnostics = []

    try:
        # Use tsc with specific file for faster checking
        result = subprocess.run(
            ["npx", "tsc", "--noEmit", "--pretty", "false", str(file_path)],
            cwd=working_dir / "app",
            capture_output=True,
            text=True,
            timeout=timeout
        )

        # Parse tsc output: file(line,col): error TS1234: message
        error_pattern = r"([^(]+)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)"
        for line in result.stdout.split('\n') + result.stderr.split('\n'):
            match = re.match(error_pattern, line)
            if match:
                diagnostics.append(LSPDiagnostic(
                    file=match.group(1),
                    line=int(match.group(2)),
                    column=int(match.group(3)),
                    severity=match.group(4),
                    code=match.group(5),
                    message=match.group(6)
                ))

    except subprocess.TimeoutExpired:
        diagnostics.append(LSPDiagnostic(
            file=str(file_path),
            line=0,
            column=0,
            severity="error",
            message="TypeScript check timed out"
        ))
    except Exception as e:
        diagnostics.append(LSPDiagnostic(
            file=str(file_path),
            line=0,
            column=0,
            severity="error",
            message=f"Failed to run TypeScript check: {e}"
        ))

    return diagnostics


def validate_imports_exist(
    imports: List[Tuple[str, List[str]]],
    source_file: Path,
    working_dir: Path
) -> ImportValidation:
    """
    Validate that imported modules and symbols exist.

    Args:
        imports: List of (module_path, [symbols]) from extract_imports_from_code
        source_file: The file containing the imports
        working_dir: Project working directory

    Returns:
        ImportValidation result
    """
    missing_imports = []
    unresolved_modules = []

    source_dir = source_file.parent

    for module_path, symbols in imports:
        # Skip node_modules imports
        if not module_path.startswith('.'):
            continue

        # Resolve relative path
        if module_path.startswith('./'):
            resolved = source_dir / module_path[2:]
        elif module_path.startswith('../'):
            resolved = (source_dir / module_path).resolve()
        else:
            resolved = source_dir / module_path

        # Try common extensions
        possible_paths = [
            resolved,
            resolved.with_suffix('.js'),
            resolved.with_suffix('.jsx'),
            resolved.with_suffix('.ts'),
            resolved.with_suffix('.tsx'),
            resolved / 'index.js',
            resolved / 'index.ts',
        ]

        found = any(p.exists() for p in possible_paths)
        if not found:
            unresolved_modules.append(module_path)
            missing_imports.extend([f"{module_path}:{s}" for s in symbols])

    return ImportValidation(
        valid=len(missing_imports) == 0,
        missing_imports=missing_imports,
        unresolved_modules=unresolved_modules
    )


def validate_refactored_code(
    refactored_code: str,
    target_file: Path,
    working_dir: Path
) -> LSPValidationResult:
    """
    Validate refactored code block BEFORE writing to file.

    Performs:
    1. Import extraction and resolution validation
    2. Function call extraction (for logging/awareness)

    Args:
        refactored_code: The code that will be written
        target_file: The file that will be modified
        working_dir: Project working directory

    Returns:
        LSPValidationResult with validation details
    """
    # Extract and validate imports
    imports = extract_imports_from_code(refactored_code)
    import_validation = validate_imports_exist(imports, target_file, working_dir)

    # Extract function calls for awareness (can't fully validate without writing)
    function_calls = extract_function_calls(refactored_code)

    errors = []
    if not import_validation.valid:
        for missing in import_validation.missing_imports:
            errors.append(LSPDiagnostic(
                file=str(target_file),
                line=0,
                column=0,
                severity="error",
                message=f"Unresolved import: {missing}"
            ))

    return LSPValidationResult(
        valid=import_validation.valid,
        diagnostics=errors,
        import_validation=import_validation,
        error_count=len(errors),
        warning_count=0
    )


def validate_file_after_write(
    file_path: Path,
    working_dir: Path
) -> LSPValidationResult:
    """
    Validate a file AFTER writing using LSP diagnostics.

    This is faster than a full build and catches:
    - Undefined symbols
    - Type errors
    - Import errors

    Args:
        file_path: Path to the modified file
        working_dir: Project working directory

    Returns:
        LSPValidationResult with diagnostics
    """
    diagnostics = get_file_diagnostics(file_path, working_dir)

    errors = [d for d in diagnostics if d.severity == "error"]
    warnings = [d for d in diagnostics if d.severity == "warning"]

    return LSPValidationResult(
        valid=len(errors) == 0,
        diagnostics=diagnostics,
        error_count=len(errors),
        warning_count=len(warnings)
    )


def find_all_references(
    symbol: str,
    file_path: Path,
    working_dir: Path
) -> List[dict]:
    """
    Find all references to a symbol across the codebase.

    Used during audit phase to identify cascading changes needed.

    Args:
        symbol: The symbol name to search for
        file_path: The file where the symbol is defined
        working_dir: Project working directory

    Returns:
        List of reference locations
    """
    references = []

    # Use grep as a fast approximation (full LSP would be slower)
    try:
        result = subprocess.run(
            ["grep", "-rn", f"\\b{symbol}\\b", "--include=*.js", "--include=*.jsx",
             "--include=*.ts", "--include=*.tsx", "app/src/"],
            cwd=working_dir,
            capture_output=True,
            text=True,
            timeout=30
        )

        for line in result.stdout.split('\n'):
            if ':' in line and symbol in line:
                parts = line.split(':', 2)
                if len(parts) >= 2:
                    references.append({
                        'file': parts[0],
                        'line': int(parts[1]) if parts[1].isdigit() else 0,
                        'content': parts[2] if len(parts) > 2 else ''
                    })

    except Exception:
        pass

    return references
```

---

### Chunk 2: Integrate Pre-Validation into Orchestrator

**File:** `adws/adw_unified_fp_orchestrator.py`
**Effort:** Low (30 min)

Modify `implement_chunks_with_validation()` to add pre-flight validation:

**Location:** Lines 131-224 (the `implement_chunks_with_validation` function)

**Changes:**

```python
# Add import at top of file
from adw_modules.lsp_validator import (
    validate_refactored_code,
    validate_file_after_write,
    LSPValidationResult
)

# Modify implement_chunks_with_validation function:

def implement_chunks_with_validation(chunks: List[ChunkData], working_dir: Path, logger: RunLogger) -> bool:
    """Implement chunks with LSP + syntax validation and incremental build checks.

    Four-layer validation strategy:
    1. NEW: Pre-implementation LSP validation (imports, module resolution)
    2. Prompt instructs Claude to validate syntax before writing
    3. NEW: Post-implementation LSP diagnostics (fast type/symbol check)
    4. Incremental build check after each chunk
    """
    for chunk in chunks:
        logger.step(f"Implementing chunk {chunk.number}: {chunk.title}")

        # ============================================
        # LAYER 1: PRE-IMPLEMENTATION LSP VALIDATION
        # ============================================
        logger.log(f"    Pre-validating imports in refactored code...")

        pre_validation = validate_refactored_code(
            refactored_code=chunk.refactored_code,
            target_file=working_dir / chunk.file_path,
            working_dir=working_dir
        )

        if not pre_validation.valid:
            logger.log(f"    [FAIL] Pre-validation failed:")
            for diag in pre_validation.diagnostics:
                logger.log(f"      - {diag.message}")
            if pre_validation.import_validation:
                for missing in pre_validation.import_validation.unresolved_modules:
                    logger.log(f"      - Unresolved module: {missing}")
            return False

        logger.log(f"    [OK] Pre-validation passed")

        # ============================================
        # LAYER 2: IMPLEMENTATION (existing)
        # ============================================
        prompt = f"""Implement ONLY chunk {chunk.number} from the refactoring plan.
        ... (existing prompt content)
        """

        # ... (existing implementation code)

        response = prompt_claude_code(request)
        if not response.success:
            logger.log(f"    [FAIL] Chunk {chunk.number} implementation failed: {response.output[:100]}")
            return False

        # ============================================
        # LAYER 3: POST-IMPLEMENTATION LSP DIAGNOSTICS
        # ============================================
        logger.log(f"    Running LSP diagnostics on {chunk.file_path}...")

        post_validation = validate_file_after_write(
            file_path=working_dir / chunk.file_path,
            working_dir=working_dir
        )

        if not post_validation.valid:
            logger.log(f"    [FAIL] LSP found {post_validation.error_count} errors:")
            for diag in post_validation.diagnostics[:5]:  # Show first 5
                logger.log(f"      - [{diag.severity}] {diag.message} ({diag.file}:{diag.line})")
            return False

        logger.log(f"    [OK] LSP diagnostics passed ({post_validation.warning_count} warnings)")

        # ============================================
        # LAYER 4: INCREMENTAL BUILD CHECK (existing)
        # ============================================
        logger.log(f"    Verifying build after chunk {chunk.number}...")
        # ... (existing build check code)

    return True
```

---

### Chunk 3: Add Cascade Detection to Audit Phase

**File:** `adws/adw_code_audit.py` (modify) + `adws/prompts/code_audit_opus.txt` (modify)
**Effort:** Medium (1-2 hours)

Enhance the audit prompt to require dependency analysis:

**Add to `code_audit_opus.txt`:**

```markdown
## CRITICAL: Cascading Dependency Analysis

Before generating chunks, you MUST identify cascading dependencies:

1. For any function/constant you plan to RENAME or MOVE:
   - Search for ALL files that import it
   - List them in "Cascading Changes Required" section
   - Include ALL dependent files in the SAME page group

2. For any function signature you plan to CHANGE:
   - Identify all call sites
   - Ensure parameter changes are reflected everywhere

3. Use this pattern to find dependencies:
   ```
   grep -rn "import.*{.*SYMBOL_NAME.*}" app/src/
   ```

## Chunk Grouping Rules

- Group by PRIMARY affected page
- If a change affects SHARED code (lib/, logic/), include ALL pages that use it
- Mark cross-cutting changes as "GLOBAL" group
- Never split a rename/move across multiple groups

## Required Metadata Per Chunk

Each chunk MUST include:
- **File:** exact path
- **Lines:** line numbers
- **Affected Pages:** list of pages
- **Cascading Changes:** files that import modified symbols (if any)
```

---

### Chunk 4: Create Validation Test Script

**File:** `adws/scripts/test_lsp_validator.py`
**Effort:** Low (30 min)

Create a test script to verify LSP validation works:

```python
#!/usr/bin/env -S uv run
# /// script
# dependencies = []
# ///

"""Test script for LSP validator module."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from adw_modules.lsp_validator import (
    extract_imports_from_code,
    extract_function_calls,
    validate_refactored_code,
    validate_file_after_write,
    find_all_references
)

def test_extract_imports():
    """Test import extraction."""
    code = """
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import MyComponent from './MyComponent';
import * as utils from '../utils';
"""
    imports = extract_imports_from_code(code)
    print("Extracted imports:")
    for module, symbols in imports:
        print(f"  {module}: {symbols}")

    assert len(imports) == 4
    print("✅ Import extraction test passed")

def test_extract_function_calls():
    """Test function call extraction."""
    code = """
const result = calculateTotal(items);
const formatted = formatDate(date);
if (isValid(input)) {
    console.log('Valid');
}
"""
    calls = extract_function_calls(code)
    print(f"Extracted function calls: {calls}")

    assert 'calculateTotal' in calls
    assert 'formatDate' in calls
    assert 'isValid' in calls
    assert 'console' not in calls  # Should be filtered
    print("✅ Function call extraction test passed")

def test_validate_refactored_code():
    """Test pre-implementation validation."""
    working_dir = Path(__file__).parent.parent.parent

    # Code with valid imports
    valid_code = """
import { supabase } from '../lib/supabase.js';

export function getData() {
    return supabase.from('table').select('*');
}
"""

    result = validate_refactored_code(
        refactored_code=valid_code,
        target_file=working_dir / "app/src/test/example.js",
        working_dir=working_dir
    )

    print(f"Validation result: valid={result.valid}, errors={result.error_count}")
    print("✅ Pre-validation test passed")

def main():
    print("=" * 60)
    print("LSP Validator Tests")
    print("=" * 60)

    test_extract_imports()
    test_extract_function_calls()
    test_validate_refactored_code()

    print("\n" + "=" * 60)
    print("All tests passed! ✅")
    print("=" * 60)

if __name__ == "__main__":
    main()
```

---

### Chunk 5: Add CLI Flag for Validation Strictness

**File:** `adws/adw_unified_fp_orchestrator.py`
**Effort:** Low (15 min)

Add command-line flags to control validation behavior:

```python
# In main() argument parser:
parser.add_argument("--skip-lsp", action="store_true",
                    help="Skip LSP pre/post validation (faster, less safe)")
parser.add_argument("--lsp-only", action="store_true",
                    help="Only run LSP validation, skip full build check")
parser.add_argument("--strict", action="store_true",
                    help="Treat LSP warnings as errors")
```

---

## Validation Timing Comparison

| Validation Step | Time | What It Catches |
|-----------------|------|-----------------|
| **Pre-impl LSP** | ~0.5s | Unresolved imports, missing modules |
| **Post-impl LSP** | ~1-2s | Undefined symbols, type errors |
| `bun run lint` | ~5-10s | Style issues, some undefined refs |
| `bun run typecheck` | ~10-20s | All TypeScript errors |
| `bun run build` | ~30-60s | Everything + bundling issues |

**With LSP integration:** Most errors caught in first 2-3 seconds, not 30-60 seconds.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `adws/adw_modules/lsp_validator.py` | **CREATE** | New LSP validation module |
| `adws/adw_unified_fp_orchestrator.py` | MODIFY | Integrate LSP validation |
| `adws/adw_code_audit.py` | MODIFY | Add cascade detection |
| `adws/prompts/code_audit_opus.txt` | MODIFY | Add dependency analysis instructions |
| `adws/scripts/test_lsp_validator.py` | **CREATE** | Test script |
| `adws/adw_modules/data_types.py` | MODIFY | Add LSP-related data types |

---

## Success Criteria

1. ✅ Pre-implementation validation catches unresolved imports
2. ✅ Post-implementation LSP diagnostics catch undefined symbols
3. ✅ Cascade detection in audit phase identifies dependent files
4. ✅ Validation feedback loop reduced from 30-60s to 2-3s
5. ✅ "Function not defined" errors caught BEFORE full build

---

## Rollout Plan

1. **Phase 1 (Day 1):** Create `lsp_validator.py` module with tests
2. **Phase 2 (Day 1):** Integrate post-implementation LSP diagnostics
3. **Phase 3 (Day 2):** Add pre-implementation validation
4. **Phase 4 (Day 2):** Enhance audit prompt with cascade detection
5. **Phase 5 (Day 3):** Test on real refactoring run, tune thresholds

---

## References

- Current orchestrator: [adw_unified_fp_orchestrator.py](../../adws/adw_unified_fp_orchestrator.py)
- Chunk parser: [adw_modules/chunk_parser.py](../../adws/adw_modules/chunk_parser.py)
- Chunk validation: [adw_modules/chunk_validation.py](../../adws/adw_modules/chunk_validation.py)
- Code audit: [adw_code_audit.py](../../adws/adw_code_audit.py)
- Data types: [adw_modules/data_types.py](../../adws/adw_modules/data_types.py)
