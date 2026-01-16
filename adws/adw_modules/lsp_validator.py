"""
LSP Validator Module - TypeScript Language Server integration for code validation.

Uses typescript-language-server to validate code BEFORE and AFTER writing.
Provides semantic validation that catches undefined symbols, broken imports,
and type errors faster than a full build.

This module provides:
1. Pre-implementation validation (import resolution check)
2. Post-implementation validation (LSP diagnostics via tsc)
3. Reference finding for cascade detection
"""

import subprocess
import re
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

    Handles three import patterns:
    1. Named imports: import { foo, bar } from './module'
    2. Default imports: import foo from './module'
    3. Namespace imports: import * as foo from './module'

    Args:
        code: JavaScript/TypeScript source code

    Returns:
        List of (module_path, [imported_symbols])
    """
    imports = []

    # Match: import { foo, bar } from './module'
    named_import_pattern = r"import\s+\{([^}]+)\}\s+from\s+['\"]([^'\"]+)['\"]"
    for match in re.finditer(named_import_pattern, code):
        symbols = [s.strip().split(' as ')[0].strip() for s in match.group(1).split(',')]
        module = match.group(2)
        imports.append((module, symbols))

    # Match: import foo from './module'
    default_import_pattern = r"import\s+(\w+)\s+from\s+['\"]([^'\"]+)['\"]"
    for match in re.finditer(default_import_pattern, code):
        symbol = match.group(1)
        module = match.group(2)
        # Avoid duplicating if already captured by named import
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

    Filters out common keywords, built-ins, and language constructs
    to focus on user-defined function calls.

    Args:
        code: JavaScript/TypeScript source code

    Returns:
        List of unique function names that are called
    """
    # Exclude common keywords and built-ins
    builtin_functions = {
        'if', 'else', 'for', 'while', 'switch', 'case', 'return', 'throw',
        'try', 'catch', 'finally', 'new', 'typeof', 'instanceof', 'void',
        'console', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
        'Math', 'Date', 'Promise', 'Map', 'Set', 'Error', 'RegExp',
        'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI',
        'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
        'fetch', 'require', 'import', 'export', 'async', 'await',
        'function', 'class', 'const', 'let', 'var', 'delete',
        # React hooks
        'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef',
        'useContext', 'useReducer', 'useLayoutEffect', 'useImperativeHandle',
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

    Uses project-wide `bun run tsc --noEmit` for accurate checking.
    Single-file tsc checks don't use tsconfig.json settings, causing
    false positives for Vite projects (import.meta.env, etc.).

    Note: This runs the full project type check, which is slower but accurate.
    The build check (Layer 5) provides similar validation, so this is
    optional when --lsp-only mode is disabled.

    Args:
        file_path: Path to the file to check (used for filtering output)
        working_dir: Project working directory
        timeout: Timeout in seconds

    Returns:
        List of diagnostics (errors and warnings) for the specified file
    """
    diagnostics = []

    try:
        # Run project-wide tsc to use tsconfig.json settings
        # This avoids false positives from import.meta.env, custom globals, etc.
        result = subprocess.run(
            ["bun", "run", "tsc", "--noEmit", "--pretty", "false"],
            cwd=working_dir / "app",
            capture_output=True,
            text=True,
            timeout=timeout
        )

        # Parse tsc output: file(line,col): error TS1234: message
        error_pattern = r"([^(]+)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)"

        # Normalize the target file path for comparison
        target_file_str = str(file_path).replace('\\', '/')
        target_file_name = Path(file_path).name

        for line in result.stdout.split('\n') + result.stderr.split('\n'):
            match = re.match(error_pattern, line.strip())
            if match:
                error_file = match.group(1).replace('\\', '/')

                # Filter to only errors in the target file
                # Match by filename or full path
                if target_file_name in error_file or target_file_str in error_file:
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
    except FileNotFoundError:
        diagnostics.append(LSPDiagnostic(
            file=str(file_path),
            line=0,
            column=0,
            severity="error",
            message="bun not found - ensure Bun is installed (https://bun.sh)"
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
    Validate that imported modules exist on the filesystem.

    Only validates relative imports (starting with . or ..).
    Node modules are assumed to exist if installed.

    Args:
        imports: List of (module_path, [symbols]) from extract_imports_from_code
        source_file: The file containing the imports
        working_dir: Project working directory

    Returns:
        ImportValidation result with missing imports listed
    """
    missing_imports = []
    unresolved_modules = []

    source_dir = source_file.parent

    for module_path, symbols in imports:
        # Skip node_modules imports (non-relative)
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
            resolved / 'index.jsx',
            resolved / 'index.tsx',
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

    This is a pre-flight check that catches:
    - Imports to non-existent modules
    - Basic syntax issues (via regex)

    Cannot catch undefined symbols until code is written and
    TypeScript can analyze the full file context.

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

    # Extract function calls for awareness/logging
    # (Can't fully validate without writing - just for diagnostics)
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
    Validate a file AFTER writing using TypeScript diagnostics.

    This is faster than a full build (~1-2s vs ~30-60s) and catches:
    - Undefined symbols
    - Type errors
    - Import errors
    - Syntax errors

    Args:
        file_path: Path to the modified file
        working_dir: Project working directory

    Returns:
        LSPValidationResult with all diagnostics
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
    working_dir: Path,
    timeout: int = 30
) -> List[dict]:
    """
    Find all references to a symbol across the codebase.

    Used during audit phase to identify cascading changes needed
    when renaming or moving a function/constant.

    Uses grep as a fast approximation. Full LSP would be more accurate
    but slower for this use case.

    Args:
        symbol: The symbol name to search for
        file_path: The file where the symbol is defined (for context)
        working_dir: Project working directory
        timeout: Timeout in seconds

    Returns:
        List of reference locations with file, line, and content
    """
    references = []

    try:
        # Use grep for fast searching (works on Windows with Git Bash or WSL)
        # Fallback to findstr on Windows if grep not available
        try:
            result = subprocess.run(
                ["grep", "-rn", f"\\b{symbol}\\b",
                 "--include=*.js", "--include=*.jsx",
                 "--include=*.ts", "--include=*.tsx",
                 "app/src/"],
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=timeout
            )
        except FileNotFoundError:
            # Fallback to Windows findstr
            result = subprocess.run(
                ["findstr", "/S", "/N", f"/R", f"\\<{symbol}\\>",
                 "app\\src\\*.js", "app\\src\\*.jsx",
                 "app\\src\\*.ts", "app\\src\\*.tsx"],
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=timeout,
                shell=True
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

    except subprocess.TimeoutExpired:
        pass  # Return partial results
    except Exception:
        pass  # Return empty list on error

    return references


def run_eslint_on_file(
    file_path: Path,
    working_dir: Path,
    timeout: int = 60
) -> List[LSPDiagnostic]:
    """
    Run ESLint on a single file for fast style/error checking.

    Faster than running on entire codebase and catches:
    - Undefined variables
    - Unused imports
    - Style violations

    Args:
        file_path: Path to the file to lint
        working_dir: Project working directory
        timeout: Timeout in seconds

    Returns:
        List of ESLint diagnostics
    """
    diagnostics = []

    try:
        # Use bun to run eslint for better PATH compatibility on Windows
        result = subprocess.run(
            ["bun", "run", "eslint", "--format", "compact", str(file_path)],
            cwd=working_dir / "app",
            capture_output=True,
            text=True,
            timeout=timeout
        )

        # Parse compact format: file: line:col  severity  message  rule
        # Example: /path/file.js: 10:5  error  'foo' is not defined  no-undef
        for line in result.stdout.split('\n'):
            if ': ' in line and ('error' in line or 'warning' in line):
                try:
                    parts = line.split(': ', 1)
                    if len(parts) >= 2:
                        location_and_rest = parts[1]
                        # Parse line:col
                        loc_match = re.match(r'(\d+):(\d+)\s+(error|warning)\s+(.+)', location_and_rest)
                        if loc_match:
                            diagnostics.append(LSPDiagnostic(
                                file=parts[0],
                                line=int(loc_match.group(1)),
                                column=int(loc_match.group(2)),
                                severity=loc_match.group(3),
                                message=loc_match.group(4)
                            ))
                except (ValueError, IndexError):
                    continue

    except subprocess.TimeoutExpired:
        diagnostics.append(LSPDiagnostic(
            file=str(file_path),
            line=0,
            column=0,
            severity="error",
            message="ESLint check timed out"
        ))
    except Exception as e:
        diagnostics.append(LSPDiagnostic(
            file=str(file_path),
            line=0,
            column=0,
            severity="error",
            message=f"Failed to run ESLint: {e}"
        ))

    return diagnostics
