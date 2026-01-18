# Orchestrator Robustness Fixes Plan

**Created**: 2026-01-18
**Status**: Ready for Implementation
**Scope**: Fix git reset scope, add test-driven pageless validation, integrate Slack screenshots

---

## Problem Statement

### Issue 1: Git Reset Destroys Pipeline Fixes
**Current behavior**: `git reset --hard HEAD` resets ALL changes, including:
- Pipeline bug fixes made during the session
- Configuration changes
- AST cache updates

**Required behavior**: Only reset files that were modified by the refactoring process.

### Issue 2: Pageless Chunks Lack Validation
**Current behavior**: Chunks that don't affect pages skip visual regression entirely.

**Required behavior**: For pageless chunks (logic files), use test-driven validation:
1. Generate tests that verify CURRENT behavior (should PASS before refactor)
2. Generate tests that should FAIL before refactor (proving change will have effect)
3. Run tests until predictable
4. Implement refactor
5. Verify tests have expected outcomes

### Issue 3: Parity Screenshots Not Sent to Slack
**Current behavior**: Visual parity results are logged but screenshots aren't sent to Slack.

**Required behavior**: Send screenshots as replies to the parity check Slack message.

---

## Implementation Tasks

### Task 1: Scoped Git Reset

**New file**: `adws/adw_modules/scoped_git_ops.py`

```python
"""
Scoped Git Operations - Track and reset only refactored files.

This module provides git operations that are scoped to specific files,
preventing accidental reset of pipeline fixes or other changes.
"""

from pathlib import Path
from typing import List, Set, Optional
import subprocess
from dataclasses import dataclass, field


@dataclass
class RefactorScope:
    """Tracks files modified during refactoring for scoped reset."""

    modified_files: Set[str] = field(default_factory=set)
    working_dir: Path = field(default_factory=Path.cwd)

    def track_file(self, file_path: str) -> None:
        """Add a file to the refactor scope."""
        normalized = str(Path(file_path).resolve())
        self.modified_files.add(normalized)

    def track_files(self, file_paths: List[str]) -> None:
        """Add multiple files to the refactor scope."""
        for fp in file_paths:
            self.track_file(fp)

    def get_relative_paths(self) -> List[str]:
        """Get tracked files as relative paths from working_dir."""
        relative = []
        for fp in self.modified_files:
            try:
                rel = Path(fp).relative_to(self.working_dir)
                relative.append(str(rel))
            except ValueError:
                relative.append(fp)
        return relative

    def reset_scoped(self) -> bool:
        """Reset only the tracked files, preserving other changes.

        Returns:
            True if reset succeeded, False otherwise
        """
        if not self.modified_files:
            return True

        relative_paths = self.get_relative_paths()

        # Use git checkout to reset specific files
        # This preserves other changes (pipeline fixes, config updates)
        cmd = ["git", "checkout", "HEAD", "--"] + relative_paths

        result = subprocess.run(
            cmd,
            cwd=self.working_dir,
            capture_output=True,
            text=True
        )

        return result.returncode == 0

    def get_staged_files(self) -> List[str]:
        """Get list of currently staged files."""
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            cwd=self.working_dir,
            capture_output=True,
            text=True
        )
        return result.stdout.strip().split('\n') if result.stdout.strip() else []

    def get_modified_files(self) -> List[str]:
        """Get list of currently modified (unstaged) files."""
        result = subprocess.run(
            ["git", "diff", "--name-only"],
            cwd=self.working_dir,
            capture_output=True,
            text=True
        )
        return result.stdout.strip().split('\n') if result.stdout.strip() else []


def create_refactor_scope(working_dir: Path) -> RefactorScope:
    """Factory function to create a RefactorScope."""
    return RefactorScope(working_dir=working_dir)
```

**Modifications to**: `adws/adw_unified_fp_orchestrator.py`

Replace `git reset --hard HEAD` calls with scoped reset:

```python
# At start of pipeline, create scope tracker
from adw_modules.scoped_git_ops import RefactorScope

refactor_scope = RefactorScope(working_dir=working_dir)

# During implementation, track modified files
for chunk in chunks_to_process:
    refactor_scope.track_file(chunk.file_path)
    success = implement_chunk_syntax_only(chunk, working_dir, logger)
    ...

# On failure, use scoped reset instead of hard reset
if validation_result.success:
    # Commit as before
    ...
else:
    # SCOPED RESET - only reset refactored files
    logger.log(f"Resetting {len(refactor_scope.modified_files)} refactored files...")
    refactor_scope.reset_scoped()

    # Log what was preserved
    logger.log(f"Preserved: pipeline fixes, config changes, AST cache")
```

---

### Task 2: Test-Driven Validation for Pageless Chunks

**New file**: `adws/adw_modules/test_driven_validation.py`

```python
"""
Test-Driven Validation for Pageless Chunks

For chunks that don't affect visual pages, we use test-driven validation:
1. Generate tests that verify CURRENT behavior (should PASS)
2. Generate tests that should FAIL (proving change has effect)
3. Run tests until predictable
4. Implement refactor
5. Verify test outcomes match expectations
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import subprocess
import tempfile


@dataclass
class TestCase:
    """A single test case for validation."""
    name: str
    code: str
    expected_before: str  # "pass" or "fail"
    expected_after: str   # "pass" or "fail"
    actual_before: Optional[str] = None
    actual_after: Optional[str] = None


@dataclass
class TestSuite:
    """Collection of tests for a chunk."""
    chunk_number: int
    file_path: str
    tests: List[TestCase] = field(default_factory=list)
    predictable: bool = False

    def add_passing_test(self, name: str, code: str) -> None:
        """Add a test that should PASS before AND after refactor."""
        self.tests.append(TestCase(
            name=name,
            code=code,
            expected_before="pass",
            expected_after="pass"
        ))

    def add_behavior_change_test(self, name: str, code: str) -> None:
        """Add a test that should FAIL before but PASS after refactor."""
        self.tests.append(TestCase(
            name=name,
            code=code,
            expected_before="fail",
            expected_after="pass"
        ))

    def add_regression_test(self, name: str, code: str) -> None:
        """Add a test that verifies no regression (PASS before and after)."""
        self.tests.append(TestCase(
            name=name,
            code=code,
            expected_before="pass",
            expected_after="pass"
        ))


@dataclass
class TestDrivenResult:
    """Result of test-driven validation."""
    predictable: bool
    all_tests_passed: bool
    suite: TestSuite
    error_message: Optional[str] = None

    def to_summary(self) -> str:
        passing = sum(1 for t in self.suite.tests
                     if t.actual_after == t.expected_after)
        total = len(self.suite.tests)
        status = "PASS" if self.all_tests_passed else "FAIL"
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
        chunk: The chunk data with current and refactored code
        working_dir: Project root directory

    Returns:
        TestSuite with generated tests
    """
    suite = TestSuite(
        chunk_number=chunk.number,
        file_path=chunk.file_path
    )

    # Extract function name from chunk
    import re
    func_match = re.search(r'(?:export\s+)?(?:async\s+)?function\s+(\w+)', chunk.current_code)
    if not func_match:
        func_match = re.search(r'(?:export\s+)?const\s+(\w+)\s*=', chunk.current_code)

    if func_match:
        func_name = func_match.group(1)

        # Generate import test (should always pass)
        suite.add_passing_test(
            name=f"import_{func_name}",
            code=f"""
import {{ {func_name} }} from '{chunk.file_path}';
console.assert(typeof {func_name} === 'function', '{func_name} should be a function');
"""
        )

        # If chunk removes console.log, generate test for that
        if 'console.log' in chunk.current_code and 'console.log' not in chunk.refactored_code:
            suite.add_behavior_change_test(
                name=f"{func_name}_no_console_log",
                code=f"""
// After refactor, this function should not have console.log
const source = {func_name}.toString();
console.assert(!source.includes('console.log'), 'Should not contain console.log after refactor');
"""
            )

    return suite


def run_tests_before_refactor(
    suite: TestSuite,
    working_dir: Path
) -> Tuple[bool, List[str]]:
    """Run test suite before refactoring to establish baseline.

    Returns:
        (predictable, errors) - True if all tests match expected_before
    """
    errors = []
    predictable = True

    for test in suite.tests:
        result = _run_single_test(test, working_dir)
        test.actual_before = result

        if result != test.expected_before:
            predictable = False
            errors.append(
                f"Test '{test.name}' expected {test.expected_before} but got {result}"
            )

    suite.predictable = predictable
    return predictable, errors


def run_tests_after_refactor(
    suite: TestSuite,
    working_dir: Path
) -> TestDrivenResult:
    """Run test suite after refactoring to verify outcomes.

    Returns:
        TestDrivenResult with pass/fail status
    """
    all_passed = True

    for test in suite.tests:
        result = _run_single_test(test, working_dir)
        test.actual_after = result

        if result != test.expected_after:
            all_passed = False

    return TestDrivenResult(
        predictable=suite.predictable,
        all_tests_passed=all_passed,
        suite=suite
    )


def _run_single_test(test: TestCase, working_dir: Path) -> str:
    """Run a single test and return 'pass' or 'fail'."""
    # Write test to temp file
    with tempfile.NamedTemporaryFile(
        mode='w',
        suffix='.mjs',
        dir=working_dir / 'app',
        delete=False
    ) as f:
        f.write(test.code)
        test_file = f.name

    try:
        result = subprocess.run(
            ["node", test_file],
            cwd=working_dir / 'app',
            capture_output=True,
            text=True,
            timeout=30
        )
        return "pass" if result.returncode == 0 else "fail"
    except subprocess.TimeoutExpired:
        return "fail"
    finally:
        Path(test_file).unlink(missing_ok=True)
```

---

### Task 3: Slack Screenshot Integration

**Modifications to**: `adws/adw_modules/visual_regression.py`

Add screenshot upload to Slack:

```python
def upload_screenshot_to_slack(
    screenshot_path: Path,
    channel: str,
    thread_ts: str,
    title: str
) -> bool:
    """Upload a screenshot to Slack as a reply in a thread.

    Args:
        screenshot_path: Path to the screenshot file
        channel: Slack channel ID
        thread_ts: Thread timestamp to reply to
        title: Title for the screenshot

    Returns:
        True if upload succeeded
    """
    from adw_modules.slack_client import get_slack_client

    client = get_slack_client()
    if not client:
        return False

    try:
        with open(screenshot_path, 'rb') as f:
            response = client.files_upload_v2(
                channel=channel,
                file=f,
                filename=screenshot_path.name,
                title=title,
                thread_ts=thread_ts
            )
        return response.get('ok', False)
    except Exception as e:
        print(f"Failed to upload screenshot: {e}")
        return False


def send_parity_results_with_screenshots(
    results: Dict,
    screenshots: Dict[str, Path],
    channel: str,
    thread_ts: str
) -> None:
    """Send parity check results with screenshots to Slack.

    Args:
        results: Parity check results dict
        screenshots: Dict mapping 'live'/'dev' to screenshot paths
        channel: Slack channel ID
        thread_ts: Thread timestamp to reply to
    """
    from adw_modules.slack_client import get_slack_client

    client = get_slack_client()
    if not client:
        return

    # Format results message
    parity = results.get('visualParity', 'unknown')
    emoji = ":white_check_mark:" if parity == 'match' else ":x:"

    message = f"{emoji} *Visual Parity: {parity.upper()}*\n"

    if results.get('explanation'):
        message += f"_{results['explanation']}_\n"

    if results.get('issues'):
        message += "\n*Issues:*\n"
        for issue in results['issues']:
            message += f"  - {issue}\n"

    # Send message as reply
    client.chat_postMessage(
        channel=channel,
        thread_ts=thread_ts,
        text=message
    )

    # Upload screenshots as replies
    if 'live' in screenshots:
        upload_screenshot_to_slack(
            screenshots['live'],
            channel,
            thread_ts,
            "LIVE Environment"
        )

    if 'dev' in screenshots:
        upload_screenshot_to_slack(
            screenshots['dev'],
            channel,
            thread_ts,
            "DEV Environment"
        )
```

---

## Integration Points

### Orchestrator Flow Changes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     UPDATED ORCHESTRATION PIPELINE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1-3: (unchanged)                                                     │
│                                                                             │
│  PHASE 4: IMPLEMENT ALL CHUNKS                                              │
│     ├─ Create RefactorScope to track modified files                         │
│     ├─ For each chunk:                                                      │
│     │   ├─ Track file in scope                                              │
│     │   ├─ Implement chunk                                                  │
│     │   └─ Syntax check only                                                │
│     └─ Continue to validation                                               │
│                                                                             │
│  PHASE 5: VALIDATION (UPDATED)                                              │
│     ├─ Build verification                                                   │
│     ├─ For chunks WITH affected pages:                                      │
│     │   ├─ Run visual regression                                            │
│     │   ├─ Capture screenshots                                              │
│     │   └─ Send to Slack with results                                       │
│     ├─ For chunks WITHOUT affected pages (pageless):                        │
│     │   ├─ Generate test suite                                              │
│     │   ├─ Run tests (verify predictable before refactor)                   │
│     │   ├─ After refactor, verify test outcomes                             │
│     │   └─ Report results                                                   │
│     └─ Aggregate results                                                    │
│                                                                             │
│  PHASE 6: COMMIT/RESET (UPDATED)                                            │
│     ├─ SUCCESS: Commit all changes                                          │
│     └─ FAILURE: SCOPED reset (only refactored files)                        │
│         └─ Pipeline fixes and config preserved                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Reference Summary

### New Files
| File | Purpose |
|------|---------|
| `adws/adw_modules/scoped_git_ops.py` | Scoped git reset, file tracking |
| `adws/adw_modules/test_driven_validation.py` | Test generation/execution for pageless chunks |

### Modified Files
| File | Changes |
|------|---------|
| `adws/adw_unified_fp_orchestrator.py` | Use RefactorScope, add test-driven validation path |
| `adws/adw_modules/visual_regression.py` | Add Slack screenshot upload |
| `adws/adw_modules/deferred_validation.py` | Integrate test-driven validation for pageless |

---

## Execution Order

1. **Task 1**: Create `scoped_git_ops.py` (standalone, no dependencies)
2. **Task 3**: Update `visual_regression.py` with Slack integration (standalone)
3. **Task 2**: Create `test_driven_validation.py` (standalone)
4. **Task 4**: Update orchestrator to use all new modules
5. **Task 5**: Update deferred_validation.py to route pageless chunks

---

## Testing Strategy

1. **Scoped Git Reset**
   - Create test file, modify it, track in scope
   - Modify another file NOT in scope
   - Call `reset_scoped()`
   - Verify: tracked file reset, other file preserved

2. **Test-Driven Validation**
   - Generate tests for a known chunk
   - Verify tests are predictable (run multiple times)
   - Mock refactor
   - Verify outcomes match expectations

3. **Slack Screenshots**
   - Run visual regression
   - Verify screenshots uploaded to correct thread
   - Verify message format matches existing style
