# ADW Orchestrator Failure Analysis

**Created:** 2026-01-20 14:30:00
**Status:** Analysis Complete - Awaiting Implementation
**Scope:** Investigation of 7 orchestrator runs with 0% success rate

---

## Executive Summary

The ADW (Agentic Development Workflow) orchestrator has executed **7 runs** with a **0% success rate**. Analysis reveals **3 critical blockers** and **2 operational issues** that must be resolved before the system can function correctly.

---

## Failure Categories

### CATEGORY 1: Build Configuration Failures (4 runs)

| Run ID | Error | Impact |
|--------|-------|--------|
| `20260117135657` | CSS module resolution failures | All 5 page groups failed |
| `20260120061703` | Missing `@tailwindcss/postcss` | Build failed at 18.9s |

**Root Cause:** Build dependencies are not installed or available when orchestrator runs. The orchestrator executes from `adws/` but builds from `../app/`, and `node_modules` may be stale or missing.

**Affected Files:**
- [postcss.config.js](app/postcss.config.js)
- [package.json](app/package.json) (build dependencies)
- Orchestrator pre-flight checks (missing)

---

### CATEGORY 2: Python Module Import Error (1 run)

| Run ID | Error | Location |
|--------|-------|----------|
| `20260120060930` | `ModuleNotFoundError: No module named 'modules.utils'` | `modules/agent.py:271` |

**Root Cause:** The import `from .utils import get_safe_subprocess_env` fails because Python cannot resolve the relative import. This indicates either:
1. Missing `__init__.py` in the `modules/` directory
2. Incorrect package structure
3. Python path issues when running from different directories

**Affected Files:**
- [adws/functional-code-refactor/modules/agent.py](adws/functional-code-refactor/modules/agent.py) - Line 271
- [adws/functional-code-refactor/modules/utils.py](adws/functional-code-refactor/modules/utils.py)
- [adws/functional-code-refactor/modules/__init__.py](adws/functional-code-refactor/modules/__init__.py) (possibly missing)

---

### CATEGORY 3: Test Validation Framework Broken (1 run)

| Run ID | Error | Impact |
|--------|-------|--------|
| `20260120063703` | All 10 chunks fail validation tests | Build succeeds but changes rejected |

**Evidence of Incorrect Test Generation:**

| Chunk | Purpose | Test That Failed | Contradiction |
|-------|---------|------------------|---------------|
| 9 | Remove console.log statements | `no_console_log_in_source` | The fix fails its own validation |
| 3 | Remove duplicate canCancelProposal | `backward_compatible` | Expected to break compatibility |
| ALL | Various refactors | `file_parses_correctly` | Code builds successfully but "doesn't parse" |

**Root Cause:** The test generation system in `test_driven_validation.py` creates assertions that don't match actual implementation outcomes. The tests are "predictably wrong" - they consistently fail in ways that contradict reality.

**Affected Files:**
- [adws/functional-code-refactor/modules/test_driven_validation.py](adws/functional-code-refactor/modules/test_driven_validation.py)
- Test generation prompts/templates

---

### CATEGORY 4: Silent Timeouts (2 runs)

| Run ID | Duration | Symptom |
|--------|----------|---------|
| `20260120065648` | ~105s | Phase 1 starts, no completion, no error |
| `20260120065833` | <2min | Phase 1 starts, no completion, no error |

**Root Cause:** External process calls (Claude/Gemini CLI) hang without timeout handling. When `prompt_claude_code()` or similar functions don't respond, the orchestrator waits indefinitely then terminates silently.

**Affected Files:**
- [adws/functional-code-refactor/modules/agent.py](adws/functional-code-refactor/modules/agent.py) - `prompt_claude_code()` function
- [adws/functional-code-refactor/adw_unified_fp_orchestrator.py](adws/functional-code-refactor/adw_unified_fp_orchestrator.py) - Main loop

---

## Prioritized Fix List

### PRIORITY 1: CRITICAL (Must fix for any successful run)

#### Fix 1.1: Add Build Dependency Pre-Flight Check

**Location:** Orchestrator startup or Phase 3 initialization

**Implementation:**
```python
import subprocess
import os

def verify_build_dependencies(app_path: str) -> bool:
    """Ensure build dependencies are installed before running."""
    node_modules = os.path.join(app_path, "node_modules")

    # Check if node_modules exists
    if not os.path.isdir(node_modules):
        print("[PRE-FLIGHT] node_modules missing, running bun install...")
        result = subprocess.run(
            ["bun", "install"],
            cwd=app_path,
            capture_output=True,
            timeout=300
        )
        if result.returncode != 0:
            raise RuntimeError(f"bun install failed: {result.stderr.decode()}")

    # Verify critical packages exist
    critical_packages = ["@tailwindcss/postcss", "vite", "react"]
    for pkg in critical_packages:
        pkg_path = os.path.join(node_modules, pkg)
        if not os.path.exists(pkg_path):
            raise RuntimeError(f"Missing critical package: {pkg}")

    return True
```

**Why:** 4 of 7 runs failed because build dependencies weren't available.

---

#### Fix 1.2: Fix Python Module Import Path

**Option A:** Add `__init__.py` if missing
```bash
# Check if file exists
ls adws/functional-code-refactor/modules/__init__.py

# If missing, create it
echo "# Python package marker" > adws/functional-code-refactor/modules/__init__.py
```

**Option B:** Use absolute imports instead of relative
```python
# In modules/agent.py, change:
# from .utils import get_safe_subprocess_env

# To:
from modules.utils import get_safe_subprocess_env
```

**Why:** Run `20260120060930` crashed immediately on this import.

---

#### Fix 1.3: Disable or Fix Test Validation Framework

**Immediate workaround:** Bypass chunk test validation
```python
# In deferred_validation.py, add bypass flag
SKIP_CHUNK_TESTS = True  # Temporary until test generation is fixed

def validate_chunk(chunk_id, test_suite):
    if SKIP_CHUNK_TESTS:
        logger.warning(f"Chunk {chunk_id} test validation bypassed (known framework issue)")
        return True  # Assume valid if build passes
    # ... existing logic
```

**Long-term fix:** Rewrite test generation to use AST-based validation instead of generated assertions.

**Why:** Run `20260120063703` had a successful build but rejected all changes due to broken test logic.

---

### PRIORITY 2: HIGH (Prevents silent failures)

#### Fix 2.1: Add Explicit Timeouts to External Calls

**Implementation:**
```python
import signal
from contextlib import contextmanager

class TimeoutError(Exception):
    pass

@contextmanager
def timeout(seconds: int, operation: str = "operation"):
    def handler(signum, frame):
        raise TimeoutError(f"{operation} timed out after {seconds}s")

    # Windows doesn't support SIGALRM, use threading instead
    import threading
    timer = threading.Timer(seconds, lambda: (_ for _ in ()).throw(TimeoutError(f"{operation} timed out")))
    timer.start()
    try:
        yield
    finally:
        timer.cancel()

# Usage in agent.py:
def prompt_claude_code(prompt: str, timeout_seconds: int = 300) -> str:
    with timeout(timeout_seconds, "Claude API call"):
        # ... existing implementation
```

**Why:** 2 runs terminated silently with no error information.

---

#### Fix 2.2: Expand Error Output Capture

**Implementation:**
```python
def run_build_with_full_logging(app_path: str, log_dir: str) -> tuple[bool, str]:
    """Run build and capture full output for debugging."""
    import tempfile
    from datetime import datetime

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    stdout_log = os.path.join(log_dir, f"build_stdout_{timestamp}.log")
    stderr_log = os.path.join(log_dir, f"build_stderr_{timestamp}.log")

    with open(stdout_log, 'w') as out, open(stderr_log, 'w') as err:
        result = subprocess.run(
            ["bun", "run", "build"],
            cwd=app_path,
            stdout=out,
            stderr=err,
            timeout=600
        )

    if result.returncode != 0:
        with open(stderr_log, 'r') as f:
            error_content = f.read()
        return False, f"Build failed. Full error in: {stderr_log}\nFirst 500 chars: {error_content[:500]}"

    return True, "Build succeeded"
```

**Why:** CSS errors were truncated, making diagnosis difficult.

---

### PRIORITY 3: MEDIUM (Improves reliability)

#### Fix 3.1: Add Pre-Flight System Checks

Create a comprehensive pre-flight check function:

```python
def run_preflight_checks() -> dict:
    """Verify all system requirements before orchestrator run."""
    checks = {
        "bun_available": False,
        "node_modules_present": False,
        "python_modules_valid": False,
        "ports_available": False,
        "working_directory_correct": False
    }

    # Check bun CLI
    try:
        subprocess.run(["bun", "--version"], capture_output=True, timeout=10)
        checks["bun_available"] = True
    except Exception:
        pass

    # Check node_modules
    checks["node_modules_present"] = os.path.isdir("../app/node_modules")

    # Check Python imports
    try:
        from modules.utils import get_safe_subprocess_env
        checks["python_modules_valid"] = True
    except ImportError:
        pass

    # Check ports (8000, 8010, etc.)
    import socket
    for port in [8000, 8010]:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        checks["ports_available"] = sock.connect_ex(('localhost', port)) != 0
        sock.close()

    # Verify working directory
    checks["working_directory_correct"] = os.getcwd().endswith("functional-code-refactor")

    return checks
```

---

#### Fix 3.2: Clear Vite Cache Before Validation

```python
def clear_build_cache(app_path: str):
    """Clear Vite cache to prevent stale state issues."""
    import shutil

    cache_paths = [
        os.path.join(app_path, "node_modules", ".vite"),
        os.path.join(app_path, "dist"),
    ]

    for cache_path in cache_paths:
        if os.path.exists(cache_path):
            shutil.rmtree(cache_path)
            print(f"[CACHE] Cleared: {cache_path}")
```

---

## Test Validation Framework - Deep Dive

The test validation framework failure deserves special attention. Here's what's happening:

### Current Flow (Broken)

```
1. Generate refactoring plan for chunk
2. Generate test suite based on expected outcomes
3. Implement refactor
4. Run generated tests
5. Tests fail → Rollback changes
```

### Problem Analysis

The test generation produces assertions like:
- "Function X should still be importable" → But the refactor was to REMOVE duplicates
- "File should parse correctly" → File builds but AST check fails on valid code
- "No console.log in source" → The chunk that removes them fails this check

### Recommended New Flow

```
1. Generate refactoring plan for chunk
2. Implement refactor
3. Run BUILD validation (does it compile?)
4. Run RUNTIME validation (do existing tests pass?)
5. Run STATIC ANALYSIS (ESLint, type-check)
6. If all pass → Accept changes
```

This removes the "generated test" layer which is producing incorrect assertions.

---

## Files Referenced

### Orchestrator Core
- [adws/functional-code-refactor/adw_unified_fp_orchestrator.py](adws/functional-code-refactor/adw_unified_fp_orchestrator.py)
- [adws/functional-code-refactor/modules/agent.py](adws/functional-code-refactor/modules/agent.py)
- [adws/functional-code-refactor/modules/utils.py](adws/functional-code-refactor/modules/utils.py)
- [adws/functional-code-refactor/modules/test_driven_validation.py](adws/functional-code-refactor/modules/test_driven_validation.py)
- [adws/functional-code-refactor/modules/deferred_validation.py](adws/functional-code-refactor/modules/deferred_validation.py)
- [adws/functional-code-refactor/modules/dev_server.py](adws/functional-code-refactor/modules/dev_server.py)

### Build Configuration
- [app/postcss.config.js](app/postcss.config.js)
- [app/vite.config.js](app/vite.config.js)
- [app/package.json](app/package.json)

### Log Files Analyzed
- `adws/adw_run_logs/20260117134338_unified_fp_refactor_run.log`
- `adws/adw_run_logs/20260117135657_unified_fp_refactor_run.log`
- `adws/adw_run_logs/20260120060930_unified_fp_refactor_run.log`
- `adws/adw_run_logs/20260120061703_unified_fp_refactor_run.log`
- `adws/adw_run_logs/20260120063703_unified_fp_refactor_run.log`
- `adws/adw_run_logs/20260120065648_unified_fp_refactor_run.log`
- `adws/adw_run_logs/20260120065833_unified_fp_refactor_run.log`

---

## Next Steps

1. **Immediate:** Fix Python module import (Fix 1.2) - prevents early crash
2. **Before next run:** Add build dependency check (Fix 1.1)
3. **Before next run:** Disable broken test validation (Fix 1.3)
4. **After basic runs work:** Add timeout handling (Fix 2.1)
5. **Ongoing:** Rewrite test validation framework to use build/lint validation instead of generated tests

---

## Success Criteria

The orchestrator should be considered "fixed" when:
- [ ] Pre-flight checks pass before Phase 1 starts
- [ ] Build phase completes without CSS/dependency errors
- [ ] Validation phase uses build success + lint pass (not generated tests)
- [ ] Timeout errors are caught and logged with diagnostics
- [ ] At least 1 full run completes all 6 phases successfully
