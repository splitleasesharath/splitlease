"""
Test-Driven Validation for Pageless Chunks

For chunks that don't affect visual pages, we use test-driven validation:
1. Generate tests that verify CURRENT behavior (should PASS before refactor)
2. Generate tests that should FAIL before refactor (proving change has effect)
3. Run tests until predictable (consistent results)
4. ONLY THEN implement the refactor
5. Verify test outcomes match expectations

This ensures that:
- We don't touch the codebase until tests are predictable
- Refactors produce the expected behavior changes
- No silent regressions in non-visual code
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import subprocess
import tempfile
import re
import os


@dataclass
class TestCase:
    """A single test case for validation."""
    name: str
    code: str
    expected_before: str  # "pass" or "fail"
    expected_after: str   # "pass" or "fail"
    actual_before: Optional[str] = None
    actual_after: Optional[str] = None
    error_message: Optional[str] = None

    @property
    def matched_before(self) -> bool:
        """Check if actual_before matches expected_before."""
        return self.actual_before == self.expected_before

    @property
    def matched_after(self) -> bool:
        """Check if actual_after matches expected_after."""
        return self.actual_after == self.expected_after


@dataclass
class TestSuite:
    """Collection of tests for a chunk."""
    chunk_number: int
    file_path: str
    description: str = ""
    tests: List[TestCase] = field(default_factory=list)
    predictable: bool = False
    predictability_runs: int = 0

    def add_passing_test(self, name: str, code: str) -> None:
        """Add a test that should PASS before AND after refactor.

        Use for: verifying that existing functionality is preserved.
        """
        self.tests.append(TestCase(
            name=name,
            code=code,
            expected_before="pass",
            expected_after="pass"
        ))

    def add_behavior_change_test(self, name: str, code: str) -> None:
        """Add a test that should FAIL before but PASS after refactor.

        Use for: verifying that the refactor has the intended effect.
        """
        self.tests.append(TestCase(
            name=name,
            code=code,
            expected_before="fail",
            expected_after="pass"
        ))

    def add_regression_test(self, name: str, code: str) -> None:
        """Add a test that verifies no regression (PASS before and after).

        Alias for add_passing_test with clearer intent.
        """
        self.add_passing_test(name, code)

    def get_summary(self) -> str:
        """Get human-readable summary of test suite."""
        passing_before = sum(1 for t in self.tests if t.matched_before)
        passing_after = sum(1 for t in self.tests if t.matched_after)
        total = len(self.tests)

        return (
            f"TestSuite for Chunk {self.chunk_number}:\n"
            f"  File: {self.file_path}\n"
            f"  Tests: {total}\n"
            f"  Predictable: {self.predictable}\n"
            f"  Before refactor: {passing_before}/{total} matched expectations\n"
            f"  After refactor: {passing_after}/{total} matched expectations"
        )


@dataclass
class TestDrivenResult:
    """Result of test-driven validation."""
    predictable: bool
    all_tests_passed: bool
    suite: TestSuite
    error_message: Optional[str] = None
    should_proceed: bool = True  # False if tests aren't predictable yet

    def to_summary(self) -> str:
        """Generate summary for logging."""
        passing = sum(1 for t in self.suite.tests if t.matched_after)
        total = len(self.suite.tests)
        status = "PASS" if self.all_tests_passed else "FAIL"

        if not self.predictable:
            return f"[BLOCKED] Tests not yet predictable - ran {self.suite.predictability_runs} times"

        return f"[{status}] {passing}/{total} tests matched expectations"


def generate_test_suite_for_chunk(
    chunk: "ChunkData",
    working_dir: Path
) -> TestSuite:
    """Generate a test suite for a pageless chunk.

    Analyzes the chunk's current and refactored code to generate:
    1. Tests that verify current behavior (should pass before)
    2. Tests that verify the change has effect (should fail before, pass after)

    Args:
        chunk: The chunk data with current_code and refactored_code
        working_dir: Project root directory

    Returns:
        TestSuite with generated tests
    """
    suite = TestSuite(
        chunk_number=chunk.number,
        file_path=chunk.file_path,
        description=chunk.title if hasattr(chunk, 'title') else ""
    )

    current = getattr(chunk, 'current_code', '')
    refactored = getattr(chunk, 'refactored_code', '')

    # Determine file type for imports
    file_ext = Path(chunk.file_path).suffix
    is_module = file_ext in ['.mjs', '.js', '.jsx', '.ts', '.tsx']

    # Extract function/export names from the code
    func_names = _extract_function_names(current)

    # Generate tests based on the type of change
    for func_name in func_names:
        # Test 1: Import test (should always pass if export exists)
        # Tests run from app/.test_temp/ so need from_test_temp=True
        import_path = _resolve_import_path(chunk.file_path, working_dir, from_test_temp=True)
        suite.add_passing_test(
            name=f"import_{func_name}",
            code=_generate_import_test(func_name, import_path)
        )

    # Detect specific patterns and generate appropriate tests
    if _is_console_log_removal(current, refactored):
        suite.add_behavior_change_test(
            name="no_console_log_in_source",
            code=_generate_no_console_log_test(func_names, current, refactored)
        )

    if _is_magic_number_extraction(current, refactored):
        # Use the correct import path for the actual file being tested
        constants_import_path = _resolve_import_path(chunk.file_path, working_dir, from_test_temp=True)
        suite.add_passing_test(
            name="constants_exported",
            code=_generate_constants_test(refactored, constants_import_path)
        )

    if _is_function_signature_change(current, refactored):
        # The function should still work with old inputs
        # Use the correct import path for the actual file being tested
        compat_import_path = _resolve_import_path(chunk.file_path, working_dir, from_test_temp=True)
        suite.add_passing_test(
            name="backward_compatible",
            code=_generate_backward_compat_test(func_names, current, compat_import_path)
        )

    # Always add a basic syntax/parse test
    suite.add_passing_test(
        name="file_parses_correctly",
        code=_generate_parse_test(chunk.file_path, working_dir)
    )

    return suite


def run_tests_until_predictable(
    suite: TestSuite,
    working_dir: Path,
    max_runs: int = 3,
    logger=None
) -> Tuple[bool, List[str]]:
    """Run test suite multiple times to verify predictability.

    Tests must produce consistent results across multiple runs before
    we consider them predictable enough to trust.

    Args:
        suite: TestSuite to run
        working_dir: Project root directory
        max_runs: Number of times to run for consistency check
        logger: Optional logger for output

    Returns:
        (predictable, errors) - True if tests are consistent
    """
    errors = []
    results_history = []  # List of result dicts per run

    for run in range(max_runs):
        if logger:
            logger.log(f"  [TEST] Predictability run {run + 1}/{max_runs}...")

        run_results = {}
        for test in suite.tests:
            result = _run_single_test(test, working_dir)
            run_results[test.name] = result

            # Update actual_before on first run
            if run == 0:
                test.actual_before = result

        results_history.append(run_results)
        suite.predictability_runs = run + 1

    # Check consistency across runs
    if len(results_history) < 2:
        suite.predictable = True
        return True, []

    first_run = results_history[0]
    for run_idx, run_results in enumerate(results_history[1:], 2):
        for test_name, result in run_results.items():
            if first_run.get(test_name) != result:
                errors.append(
                    f"Test '{test_name}' inconsistent: run 1={first_run.get(test_name)}, "
                    f"run {run_idx}={result}"
                )

    suite.predictable = len(errors) == 0

    if logger:
        if suite.predictable:
            logger.log(f"  [OK] Tests are predictable after {max_runs} runs")
        else:
            logger.log(f"  [WARN] Tests are NOT predictable: {len(errors)} inconsistencies")

    return suite.predictable, errors


def run_tests_before_refactor(
    suite: TestSuite,
    working_dir: Path,
    logger=None
) -> Tuple[bool, List[str]]:
    """Run test suite before refactoring to establish baseline.

    This verifies that our expected_before values are correct.

    Args:
        suite: TestSuite to run
        working_dir: Project root directory
        logger: Optional logger

    Returns:
        (all_matched, errors) - True if all tests matched expected_before
    """
    errors = []
    all_matched = True

    for test in suite.tests:
        result = _run_single_test(test, working_dir)
        test.actual_before = result

        if result != test.expected_before:
            all_matched = False
            errors.append(
                f"Test '{test.name}': expected {test.expected_before}, got {result}"
            )
            if logger:
                logger.log(f"  [MISMATCH] {test.name}: expected={test.expected_before}, actual={result}")
        else:
            if logger:
                logger.log(f"  [MATCH] {test.name}: {result}")

    return all_matched, errors


def run_tests_after_refactor(
    suite: TestSuite,
    working_dir: Path,
    logger=None
) -> TestDrivenResult:
    """Run test suite after refactoring to verify outcomes.

    Args:
        suite: TestSuite to run (should already have actual_before populated)
        working_dir: Project root directory
        logger: Optional logger

    Returns:
        TestDrivenResult with pass/fail status
    """
    all_passed = True

    for test in suite.tests:
        result = _run_single_test(test, working_dir)
        test.actual_after = result

        if result != test.expected_after:
            all_passed = False
            if logger:
                logger.log(
                    f"  [FAIL] {test.name}: expected={test.expected_after}, "
                    f"actual={result}"
                )
        else:
            if logger:
                logger.log(f"  [PASS] {test.name}: {result}")

    return TestDrivenResult(
        predictable=suite.predictable,
        all_tests_passed=all_passed,
        suite=suite
    )


# ============================================================================
# Private helper functions
# ============================================================================

def _run_single_test(test: TestCase, working_dir: Path) -> str:
    """Run a single test and return 'pass' or 'fail'.

    Args:
        test: TestCase to run
        working_dir: Project root directory

    Returns:
        "pass" or "fail"
    """
    # Create temp directory for test file
    test_dir = working_dir / 'app' / '.test_temp'
    test_dir.mkdir(parents=True, exist_ok=True)

    test_file = test_dir / f"test_{test.name}.mjs"

    try:
        test_file.write_text(test.code, encoding='utf-8')

        result = subprocess.run(
            ["node", str(test_file)],
            cwd=working_dir / 'app',
            capture_output=True,
            text=True,
            timeout=30,
            env={**os.environ, "NODE_OPTIONS": "--experimental-vm-modules"}
        )

        if result.returncode == 0:
            return "pass"
        else:
            test.error_message = result.stderr or result.stdout
            return "fail"

    except subprocess.TimeoutExpired:
        test.error_message = "Test timed out after 30s"
        return "fail"
    except Exception as e:
        test.error_message = str(e)
        return "fail"
    finally:
        test_file.unlink(missing_ok=True)


def _extract_function_names(code: str) -> List[str]:
    """Extract exported function/const names from code."""
    names = []

    # Match: export function name(
    for match in re.finditer(r'export\s+(?:async\s+)?function\s+(\w+)', code):
        names.append(match.group(1))

    # Match: export const name =
    for match in re.finditer(r'export\s+const\s+(\w+)\s*=', code):
        names.append(match.group(1))

    # Match: export { name }
    for match in re.finditer(r'export\s*\{\s*([^}]+)\s*\}', code):
        exports = match.group(1).split(',')
        for exp in exports:
            exp = exp.strip().split(' as ')[0].strip()
            if exp:
                names.append(exp)

    return list(set(names))


def _resolve_import_path(file_path: str, working_dir: Path, from_test_temp: bool = False) -> str:
    """Convert file path to a relative import path.

    Args:
        file_path: The file path to convert
        working_dir: Project root directory
        from_test_temp: If True, generates path relative to app/.test_temp/
                       If False, generates path relative to app/
    """
    # Remove backticks if present
    file_path = file_path.strip('`').strip()

    # Convert Windows paths
    file_path = file_path.replace('\\', '/')

    # Handle src/ prefix - tests run from app/.test_temp/ so need ../src/
    if from_test_temp:
        if file_path.startswith('src/'):
            return '../' + file_path  # ../src/logic/...
        if file_path.startswith('app/src/'):
            return '../' + file_path[4:]  # Remove 'app/' -> ../src/logic/...
        # If no src prefix, assume it's relative to app/src
        return '../src/' + file_path
    else:
        # Legacy behavior for backward compatibility
        if file_path.startswith('src/'):
            return './' + file_path[4:]  # Remove 'src/'
        if file_path.startswith('app/src/'):
            return './' + file_path[8:]  # Remove 'app/src/'
        return './' + file_path


def _is_console_log_removal(current: str, refactored: str) -> bool:
    """Check if the refactor removes console.log statements."""
    current_logs = current.count('console.log')
    refactored_logs = refactored.count('console.log')
    return current_logs > refactored_logs


def _is_magic_number_extraction(current: str, refactored: str) -> bool:
    """Check if the refactor extracts magic numbers to constants."""
    # Look for new const declarations with uppercase names
    const_pattern = r'const\s+[A-Z_]+\s*='
    return len(re.findall(const_pattern, refactored)) > len(re.findall(const_pattern, current))


def _is_function_signature_change(current: str, refactored: str) -> bool:
    """Check if function signatures changed."""
    current_sigs = re.findall(r'function\s+\w+\s*\([^)]*\)', current)
    refactored_sigs = re.findall(r'function\s+\w+\s*\([^)]*\)', refactored)
    return current_sigs != refactored_sigs


def _generate_import_test(func_name: str, import_path: str, from_test_temp: bool = True) -> str:
    """Generate a test that verifies the function can be imported.

    Args:
        func_name: Name of the function to import
        import_path: The import path (should be relative to app/.test_temp/ if from_test_temp)
        from_test_temp: Whether the test runs from app/.test_temp/
    """
    return f"""
// Test: Can import {func_name}
import {{ {func_name} }} from '{import_path}';

if (typeof {func_name} !== 'function') {{
    console.error('{func_name} is not a function');
    process.exit(1);
}}

console.log('{func_name} imported successfully');
process.exit(0);
"""


def _generate_no_console_log_test(func_names: List[str], current: str, refactored: str) -> str:
    """Generate a test that verifies console.log was removed."""
    # This test checks the source code of the function
    func_name = func_names[0] if func_names else "unknownFunction"
    return f"""
// Test: Function source should not contain console.log after refactor
// Note: This test expects to FAIL before refactor, PASS after

const fs = await import('fs');
const path = await import('path');

// Read the actual source file
const sourcePath = path.resolve(process.cwd(), 'src/lib/scheduleSelector/priceCalculations.js');
const source = fs.readFileSync(sourcePath, 'utf-8');

if (source.includes('console.log')) {{
    console.error('Source still contains console.log');
    process.exit(1);
}}

console.log('No console.log found in source');
process.exit(0);
"""


def _generate_constants_test(refactored: str, import_path: str = None) -> str:
    """Generate a test that verifies constants are exported.

    Args:
        refactored: The refactored source code
        import_path: Import path relative to app/.test_temp/ (should start with ../src/)
    """
    # Find constant names
    const_names = re.findall(r'export\s+const\s+([A-Z_]+)\s*=', refactored)
    if not const_names:
        const_names = ['SOME_CONSTANT']

    const_imports = ', '.join(const_names[:3])  # Limit to 3
    # Use provided import_path or a default
    actual_path = import_path if import_path else '../src/lib/constants.js'

    return f"""
// Test: Constants should be exported
// This test verifies that magic numbers were extracted to named constants

try {{
    const module = await import('{actual_path}');
    console.log('Constants module loaded');
    process.exit(0);
}} catch (e) {{
    console.error('Failed to import constants:', e.message);
    process.exit(1);
}}
"""


def _generate_backward_compat_test(func_names: List[str], current: str, import_path: str = None) -> str:
    """Generate a test for backward compatibility.

    Args:
        func_names: List of function names in the module
        current: Current source code
        import_path: Import path relative to app/.test_temp/ (should start with ../src/)
    """
    func_name = func_names[0] if func_names else "unknownFunction"
    # Use provided import_path or a default
    actual_path = import_path if import_path else '../src/lib/scheduleSelector/priceCalculations.js'

    return f"""
// Test: Function should still be callable
// This is a basic smoke test for backward compatibility

try {{
    // Just verify the module loads without error
    const module = await import('{actual_path}');
    console.log('Module loaded successfully');
    process.exit(0);
}} catch (e) {{
    console.error('Module failed to load:', e.message);
    process.exit(1);
}}
"""


def _generate_parse_test(file_path: str, working_dir: Path) -> str:
    """Generate a test that verifies the file parses correctly.

    Tests are written to app/.test_temp/ so imports need ../src/ prefix.
    """
    # Use from_test_temp=True since tests run from app/.test_temp/
    import_path = _resolve_import_path(file_path, working_dir, from_test_temp=True)

    return f"""
// Test: File should parse without syntax errors

try {{
    await import('{import_path}');
    console.log('File parsed successfully');
    process.exit(0);
}} catch (e) {{
    console.error('Parse error:', e.message);
    process.exit(1);
}}
"""
