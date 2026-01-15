# Orchestrator Refactor Summary

**Date:** 2026-01-13
**Status:** Implementation in progress

---

## Key Changes Applied

### 1. ✅ New Shared Modules Created

| Module | Purpose | Location |
|--------|---------|----------|
| `config.py` | Centralized configuration for timeouts, ports, URLs | `adws/adw_modules/config.py` |
| `dev_server_manager.py` | Dynamic port detection and dev server lifecycle | `adws/adw_modules/dev_server_manager.py` |
| `validation_parser.py` | Structured JSON response parsing with validation | `adws/adw_modules/validation_parser.py` |
| `chunk_validation.py` | Shared validation logic with retry for both orchestrators | `adws/adw_modules/chunk_validation.py` |

### 2. ✅ New Stateless Browser Script

- **File:** `adws/adw_claude_browser_stateless.py`
- **Purpose:** Pure validation worker that doesn't manage dev server
- **Usage:** Receives full URLs in prompt, executes Claude browser, returns output
- **Benefit:** Eliminates dev server race conditions and URL confusion

---

## Changes Required in Both Orchestrators

### A. Import New Modules

```python
from adw_modules.config import (
    PRODUCTION_BASE_URL,
    VALIDATION_MAX_RETRIES
)
from adw_modules.dev_server_manager import DevServerManager
from adw_modules.chunk_validation import validate_chunk_with_retry
from adw_modules.validation_parser import ValidationResult
```

### B. Dev Server Management Pattern

**OLD** (per-validation startup):
```python
def validate_with_browser(chunk, working_dir, logger, port=8000):
    # Browser script starts dev server internally
    # Port is hardcoded
    # Multiple dev servers may run
```

**NEW** (orchestrator-managed, start once):
```python
def main():
    # Start dev server ONCE before chunk loop
    dev_server = DevServerManager(working_dir, logger)
    port, base_url = dev_server.start()

    try:
        for chunk in chunks:
            # Use dev_server.get_url(page_path) to build URLs
            localhost_url = dev_server.get_url(page_path)
            production_url = f"{PRODUCTION_BASE_URL}{page_path}"

            # Validate using shared module
            passed, result = validate_chunk_with_retry(
                localhost_url,
                production_url,
                chunk.number,
                chunk.title,
                chunk.file_path,
                chunk.line_number,
                working_dir,
                logger
            )
    finally:
        # Stop dev server ONCE after all chunks
        dev_server.stop()
```

### C. URL Construction Pattern

**OLD** (ambiguous):
```python
context['page_url'] = "/search"  # Just a path
full_url = f"http://localhost:{port}{context['page_url']}"
# Production URL might be constructed elsewhere or not at all
```

**NEW** (explicit, logged):
```python
# Extract page path from chunk
page_path = determine_page_path(chunk)

# Build full URLs
localhost_url = dev_server.get_url(page_path)  # http://localhost:5173/search
production_url = f"{PRODUCTION_BASE_URL}{page_path}"  # https://www.split.lease/search

# Log both URLs clearly
logger.log(f"Localhost URL: {localhost_url}", to_stdout=True)
logger.log(f"Production URL: {production_url}", to_stdout=True)
print(f"🔍 Testing: {localhost_url}")
print(f"📊 Baseline: {production_url}")

# Pass BOTH full URLs to validation
passed, result = validate_chunk_with_retry(
    localhost_url,  # Full URL, not path
    production_url,  # Full URL, not path
    ...
)
```

### D. Page Path Determination

**Function to add:**
```python
def determine_page_path(chunk: ChunkData) -> str:
    """Determine which page path to test for this chunk.

    Priority:
    1. chunk.affected_pages (from plan, if not "AUTO")
    2. Inferred from chunk.file_path (file path analysis)
    3. Default to "/" (homepage)

    Returns:
        Page path starting with / (e.g., "/search", "/view-split-lease")
    """
    # If plan specifies pages
    if chunk.affected_pages and chunk.affected_pages.upper() != "AUTO":
        # Parse first page from comma-separated list
        page_urls = [url.strip() for url in chunk.affected_pages.split(',')]
        return page_urls[0]

    # Otherwise infer from file path
    return infer_page_from_file_path(chunk.file_path)
```

### E. Validation Response Handling

**OLD** (string matching):
```python
if "VALIDATION PASSED" in output.upper():
    return True
else:
    return False
```

**NEW** (structured parsing):
```python
# validate_chunk_with_retry returns ValidationResult
passed, result = validate_chunk_with_retry(...)

# result has:
# - result.verdict: "PASS" | "FAIL" | "ERROR"
# - result.confidence: 0-100
# - result.differences: List[ValidationDifference]
# - result.summary: str
# - result.passed: bool (computed with validation rules)

if result.passed:
    # Commit chunk
else:
    if result.verdict == "ERROR":
        # Log that validation couldn't run
        logger.log(f"Validation error: {result.summary}")
    else:  # FAIL
        # Log actual failures
        logger.log(f"Visual differences: {len(result.differences)}")
    # Rollback chunk
```

---

## Specific Changes Per File

### Full Orchestrator (`adw_fp_audit_browser_implement_orchestrator.py`)

**Changes needed:**

1. **Add imports** (top of file, after existing imports):
   ```python
   from adw_modules.config import PRODUCTION_BASE_URL, VALIDATION_MAX_RETRIES
   from adw_modules.dev_server_manager import DevServerManager
   from adw_modules.chunk_validation import validate_chunk_with_retry
   from adw_modules.validation_parser import ValidationResult
   ```

2. **Add helper function** (after `infer_validation_context`):
   ```python
   def determine_page_path(chunk: ChunkData) -> str:
       """Determine page path to test."""
       # ... implementation from section D above
   ```

3. **Replace `validate_with_browser` function** entirely:
   - Remove old implementation (lines 424-680)
   - Replace with calls to `validate_chunk_with_retry` from shared module

4. **Update `process_chunks` function**:
   - Accept `dev_server` parameter
   - Use `dev_server.get_url(page_path)` to build localhost URLs
   - Pass full URLs to validation

5. **Update `main` function**:
   - Start dev server before chunk processing:
     ```python
     dev_server = DevServerManager(working_dir, logger)
     port, base_url = dev_server.start()
     logger.log(f"Dev server running at {base_url}")
     ```
   - Pass `dev_server` to `process_chunks`
   - Stop dev server in `finally` block

### Mini Orchestrator (`adw_fp_browser_implement_mini.py`)

**Apply identical changes** as full orchestrator:
- Same imports
- Same `determine_page_path` helper
- Same dev server management in `main`
- Updated `process_chunks_mini` to use shared validation

---

## Benefits of These Changes

### ✅ Port Detection
- No more hardcoded port 8000
- Vite chooses port dynamically (usually 5173)
- Automatically detected from `bun run dev` output

### ✅ URL Clarity
- Both localhost AND production URLs logged explicitly
- No ambiguity about which page is being tested
- Full URLs visible in logs and console output

### ✅ Validation Reliability
- Structured JSON response with confidence scores
- Automatic retry on ERROR verdicts (not FAIL)
- Clear distinction between validation failure vs validation error

### ✅ Code Reuse
- Shared validation logic in `chunk_validation.py`
- Both orchestrators use identical validation approach
- Fixes apply to both automatically

### ✅ Debugging
- Comprehensive logging at every step
- Temp prompt files for inspection
- Validation result details captured

---

## Testing Plan

1. **Test dev server startup:**
   ```bash
   # Should detect port and show "Dev server running at http://localhost:XXXX"
   uv run adws/adw_fp_audit_browser_implement_orchestrator.py app/src/logic --chunks 1
   ```

2. **Test URL construction:**
   - Check console output for "Testing: http://localhost:XXXX/page-name"
   - Check console output for "Baseline: https://www.split.lease/page-name"
   - Verify page-name matches the actual page being tested

3. **Test validation response:**
   - PASS case: No differences → should commit
   - FAIL case: Visual difference → should rollback
   - ERROR case: Page didn't load → should retry 3 times then skip

4. **Test retry logic:**
   - Simulate ERROR by killing dev server mid-validation
   - Should see "Got ERROR verdict, retrying in 2s..."
   - Should see exponential backoff (2s, 4s, 8s)

---

## Next Steps

1. ✅ Create shared modules (DONE)
2. ⏳ Update full orchestrator with new pattern (IN PROGRESS)
3. ⏳ Update mini orchestrator with same pattern
4. ⏳ Test with real FP refactoring plan
5. ⏳ Document any issues found

---

## Files Modified

- ✅ `adws/adw_modules/config.py` (NEW)
- ✅ `adws/adw_modules/dev_server_manager.py` (NEW)
- ✅ `adws/adw_modules/validation_parser.py` (NEW)
- ✅ `adws/adw_modules/chunk_validation.py` (NEW)
- ✅ `adws/adw_claude_browser_stateless.py` (NEW)
- ⏳ `adws/adw_fp_audit_browser_implement_orchestrator.py` (PENDING)
- ⏳ `adws/adw_fp_browser_implement_mini.py` (PENDING)

---

## References

- Improvement plan: `.claude/plans/Documents/20260113000000-validation-handoff-improvements.md`
- Original orchestrator backup: `adws/adw_fp_audit_browser_implement_orchestrator.py.backup`
