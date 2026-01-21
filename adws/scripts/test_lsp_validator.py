#!/usr/bin/env -S uv run
# /// script
# dependencies = ["pydantic"]
# ///

"""
Test script for LSP validator module.

Verifies that the LSP validation functions work correctly:
1. Import extraction from code
2. Function call extraction
3. Pre-implementation validation (import resolution)
4. Post-implementation validation (TypeScript diagnostics)
5. Reference finding for cascade detection

Usage:
    uv run adws/scripts/test_lsp_validator.py
"""

import sys
from pathlib import Path

# Add adws to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from adw_modules.lsp_validator import (
    extract_imports_from_code,
    extract_function_calls,
    validate_refactored_code,
    validate_file_after_write,
    validate_imports_exist,
    find_all_references,
    LSPValidationResult,
)


def test_extract_imports():
    """Test import extraction from JavaScript/TypeScript code."""
    print("\n" + "=" * 50)
    print("TEST: extract_imports_from_code")
    print("=" * 50)

    code = """
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import MyComponent from './MyComponent';
import * as utils from '../utils';
import { foo as bar, baz } from './helpers';
"""
    imports = extract_imports_from_code(code)
    print("Extracted imports:")
    for module, symbols in imports:
        print(f"  {module}: {symbols}")

    # Verify expected imports
    modules = [m for m, _ in imports]
    assert 'react' in modules, "Should extract 'react' import"
    assert '../lib/supabase.js' in modules, "Should extract '../lib/supabase.js' import"
    assert './MyComponent' in modules, "Should extract './MyComponent' import"
    assert '../utils' in modules, "Should extract '../utils' import"
    assert './helpers' in modules, "Should extract './helpers' import"

    # Check symbols
    react_symbols = next((s for m, s in imports if m == 'react'), [])
    assert 'useState' in react_symbols, "Should extract 'useState' symbol"
    assert 'useEffect' in react_symbols, "Should extract 'useEffect' symbol"

    print("[PASS] Import extraction test PASSED")
    return True


def test_extract_function_calls():
    """Test function call extraction from code."""
    print("\n" + "=" * 50)
    print("TEST: extract_function_calls")
    print("=" * 50)

    code = """
const result = calculateTotal(items);
const formatted = formatDate(date);
if (isValid(input)) {
    console.log('Valid');
    myCustomFunction(data);
}

const handler = async () => {
    await fetchData();
    processResults(data);
};
"""
    calls = extract_function_calls(code)
    print(f"Extracted function calls: {calls}")

    # Verify expected calls
    assert 'calculateTotal' in calls, "Should extract 'calculateTotal'"
    assert 'formatDate' in calls, "Should extract 'formatDate'"
    assert 'isValid' in calls, "Should extract 'isValid'"
    assert 'myCustomFunction' in calls, "Should extract 'myCustomFunction'"
    assert 'fetchData' in calls, "Should extract 'fetchData'"
    assert 'processResults' in calls, "Should extract 'processResults'"

    # Verify builtins are filtered
    assert 'console' not in calls, "Should filter out 'console'"
    assert 'if' not in calls, "Should filter out 'if'"
    assert 'async' not in calls, "Should filter out 'async'"

    print("[PASS] Function call extraction test PASSED")
    return True


def test_validate_imports_exist():
    """Test import validation against filesystem."""
    print("\n" + "=" * 50)
    print("TEST: validate_imports_exist")
    print("=" * 50)

    working_dir = Path(__file__).parent.parent.parent

    # Test with imports that should exist
    existing_imports = [
        ('../lib/supabase.js', ['supabase']),
    ]

    # Use a real file path as source
    source_file = working_dir / "app/src/islands/pages/SearchPage/SearchPage.jsx"

    if source_file.exists():
        result = validate_imports_exist(existing_imports, source_file, working_dir)
        print(f"Existing imports validation: valid={result.valid}")
        print(f"  Missing: {result.missing_imports}")
        print(f"  Unresolved: {result.unresolved_modules}")
    else:
        print(f"Skipping test - source file not found: {source_file}")

    # Test with imports that don't exist
    non_existing_imports = [
        ('./nonexistent-module.js', ['foo', 'bar']),
        ('../fake/path.js', ['baz']),
    ]

    result = validate_imports_exist(non_existing_imports, source_file, working_dir)
    print(f"Non-existing imports validation: valid={result.valid}")
    print(f"  Missing: {result.missing_imports}")
    print(f"  Unresolved: {result.unresolved_modules}")

    assert not result.valid, "Should fail validation for non-existing imports"
    assert len(result.unresolved_modules) == 2, "Should have 2 unresolved modules"

    print("[PASS] Import existence validation test PASSED")
    return True


def test_validate_refactored_code():
    """Test pre-implementation validation."""
    print("\n" + "=" * 50)
    print("TEST: validate_refactored_code")
    print("=" * 50)

    working_dir = Path(__file__).parent.parent.parent

    # Code with valid imports (react is node_modules, not checked)
    valid_code = """
import { useState } from 'react';

export function MyComponent() {
    const [data, setData] = useState(null);
    return <div>{data}</div>;
}
"""

    # Use a real-ish path
    target_file = working_dir / "app/src/test/example.jsx"

    result = validate_refactored_code(
        refactored_code=valid_code,
        target_file=target_file,
        working_dir=working_dir
    )

    print(f"Valid code validation: valid={result.valid}, errors={result.error_count}")
    if not result.valid:
        for diag in result.diagnostics:
            print(f"  - {diag.message}")

    # Node modules imports (react) are skipped, so this should pass
    assert result.valid, "Should pass validation for code with only node_modules imports"

    # Code with broken relative import
    broken_code = """
import { useState } from 'react';
import { brokenFunction } from './totally-fake-module.js';

export function MyComponent() {
    return brokenFunction();
}
"""

    result = validate_refactored_code(
        refactored_code=broken_code,
        target_file=target_file,
        working_dir=working_dir
    )

    print(f"Broken code validation: valid={result.valid}, errors={result.error_count}")
    if not result.valid:
        for diag in result.diagnostics:
            print(f"  - {diag.message}")

    assert not result.valid, "Should fail validation for broken relative imports"

    print("[PASS] Pre-implementation validation test PASSED")
    return True


def test_find_all_references():
    """Test reference finding for cascade detection."""
    print("\n" + "=" * 50)
    print("TEST: find_all_references")
    print("=" * 50)

    working_dir = Path(__file__).parent.parent.parent

    # Search for a common symbol that should exist
    symbol = "supabase"
    file_path = working_dir / "app/src/lib/supabase.js"

    print(f"Searching for references to '{symbol}'...")
    refs = find_all_references(symbol, file_path, working_dir)

    print(f"Found {len(refs)} references")
    for ref in refs[:5]:  # Show first 5
        print(f"  - {ref['file']}:{ref['line']}")

    # Should find some references to supabase
    assert len(refs) > 0, f"Should find references to '{symbol}'"

    print("[PASS] Reference finding test PASSED")
    return True


def main():
    """Run all tests."""
    print("=" * 60)
    print("LSP VALIDATOR TEST SUITE")
    print("=" * 60)

    tests = [
        test_extract_imports,
        test_extract_function_calls,
        test_validate_imports_exist,
        test_validate_refactored_code,
        test_find_all_references,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
                print(f"[FAIL] {test.__name__} FAILED")
        except AssertionError as e:
            failed += 1
            print(f"[FAIL] {test.__name__} FAILED: {e}")
        except Exception as e:
            failed += 1
            print(f"[FAIL] {test.__name__} ERROR: {e}")

    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)

    if failed > 0:
        sys.exit(1)
    else:
        print("\n[PASS] All tests passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()
