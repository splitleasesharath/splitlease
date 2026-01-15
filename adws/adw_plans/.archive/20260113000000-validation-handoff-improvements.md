# Validation Handoff Improvements Plan

**Date:** 2026-01-13
**Purpose:** Make browser validation handoff reliable and resilient for FP refactoring workflow

---

## Current Issues

### 1. **Validation Detection is Brittle**
```python
# Current: Any text with "VALIDATION PASSED" passes
if "VALIDATION PASSED" in output.upper():
    return True
```
**Problem:** Claude could say "VALIDATION PASSED but I noticed..." and still pass.

### 2. **No Retry Logic**
- Single attempt only
- Network hiccups cause false failures
- Dev server startup race conditions

### 3. **No Visual Evidence**
- No screenshots captured
- Can't review what Claude saw if validation is disputed
- No baseline for human review

### 4. **Timeout Mismatches**
- Browser script: 5 minutes
- Orchestrator: 10 minutes
- Creates false timeout errors

### 5. **Unclear Prompt Structure**
- Mixes context with instructions
- "Specific tests" could be interpreted as actions to perform
- Not laser-focused on single goal: visual parity

### 6. **No Structured Output**
- Claude returns free-form text
- Hard to parse programmatically
- No confidence scores or structured diff data

---

## Proposed Improvements

### Improvement 1: Structured Validation Response Format

Replace free-form text with strict JSON output:

```python
validation_prompt = f"""You are a visual regression detector comparing two versions of a web page.

**Task:** Compare these two URLs and report ONLY visual differences:
- Localhost (refactored): http://localhost:{port}{context['page_url']}
- Production (baseline): https://www.split.lease{context['page_url']}

**Context for your reference:**
- This is testing a functional programming refactoring
- File changed: {chunk.file_path}:{chunk.line_number}
- Expected result: ZERO visual differences

**Your response MUST be valid JSON with this exact structure:**

```json
{{
  "verdict": "PASS" | "FAIL" | "ERROR",
  "confidence": 0-100,
  "visual_differences": [
    {{
      "type": "layout" | "styling" | "content" | "interaction" | "console_error",
      "description": "Brief description of difference",
      "severity": "critical" | "major" | "minor"
    }}
  ],
  "summary": "One sentence summary"
}}
```

**Verdict criteria:**
- PASS: Zero visual differences, pages are identical
- FAIL: One or more visual differences detected
- ERROR: Could not complete comparison (page didn't load, timeout, etc.)

**Important:**
- Be thorough but objective
- Ignore non-visual differences (e.g., HTML comments, whitespace in source)
- Focus on what the user would see/experience
- Empty visual_differences array means PASS

Take two screenshots (localhost + production) before responding.
"""
```

### Improvement 2: Response Parsing with Validation

```python
def parse_validation_response(output: str) -> dict:
    """Parse validation response and extract verdict.

    Returns:
        {
            'passed': bool,
            'verdict': str,
            'confidence': int,
            'differences': list,
            'raw_output': str
        }
    """
    import json
    import re

    # Try to extract JSON from output
    json_match = re.search(r'```json\s*(\{.*?\})\s*```', output, re.DOTALL)
    if not json_match:
        # Fallback: Look for raw JSON
        json_match = re.search(r'(\{.*?"verdict".*?\})', output, re.DOTALL)

    if not json_match:
        # Could not parse - treat as ERROR
        return {
            'passed': False,
            'verdict': 'ERROR',
            'confidence': 0,
            'differences': [{'type': 'parse_error', 'description': 'Could not parse response', 'severity': 'critical'}],
            'raw_output': output
        }

    try:
        data = json.loads(json_match.group(1))

        # Validate structure
        if 'verdict' not in data:
            raise ValueError("Missing 'verdict' field")

        verdict = data['verdict'].upper()
        passed = verdict == 'PASS'

        # PASS must have 0 differences and high confidence
        if verdict == 'PASS':
            if data.get('visual_differences') and len(data['visual_differences']) > 0:
                # Contradiction - Claude said PASS but listed differences
                passed = False
                verdict = 'FAIL'
            elif data.get('confidence', 0) < 80:
                # Low confidence PASS - treat as ERROR
                passed = False
                verdict = 'ERROR'

        return {
            'passed': passed,
            'verdict': verdict,
            'confidence': data.get('confidence', 0),
            'differences': data.get('visual_differences', []),
            'summary': data.get('summary', ''),
            'raw_output': output
        }

    except (json.JSONDecodeError, ValueError, KeyError) as e:
        return {
            'passed': False,
            'verdict': 'ERROR',
            'confidence': 0,
            'differences': [{'type': 'parse_error', 'description': f'Parse error: {e}', 'severity': 'critical'}],
            'raw_output': output
        }
```

### Improvement 3: Retry Logic with Exponential Backoff

```python
def validate_with_browser_retry(
    chunk: ChunkData,
    working_dir: Path,
    logger,
    port: int = 8000,
    max_retries: int = 3
) -> tuple[bool, dict]:
    """Validate with automatic retry on transient failures.

    Returns:
        (passed: bool, details: dict)
    """
    import time

    for attempt in range(1, max_retries + 1):
        logger.log(f"Validation attempt {attempt}/{max_retries}", to_stdout=False)

        try:
            result = validate_with_browser(chunk, working_dir, logger, port)

            # If ERROR verdict (not FAIL), retry
            if result['verdict'] == 'ERROR':
                if attempt < max_retries:
                    wait_time = 2 ** attempt  # 2, 4, 8 seconds
                    logger.log(f"Got ERROR verdict, retrying in {wait_time}s...", to_stdout=False)
                    time.sleep(wait_time)
                    continue
                else:
                    logger.log("Max retries reached with ERROR verdict", to_stdout=False)
                    return False, result

            # PASS or FAIL verdict - return immediately
            return result['passed'], result

        except Exception as e:
            logger.log(f"Attempt {attempt} raised exception: {e}", to_stdout=False)
            if attempt < max_retries:
                wait_time = 2 ** attempt
                logger.log(f"Retrying in {wait_time}s...", to_stdout=False)
                time.sleep(wait_time)
            else:
                return False, {
                    'verdict': 'ERROR',
                    'confidence': 0,
                    'differences': [{'type': 'exception', 'description': str(e), 'severity': 'critical'}],
                    'raw_output': str(e)
                }

    # Should never reach here
    return False, {'verdict': 'ERROR', 'confidence': 0, 'differences': [], 'raw_output': 'Unknown error'}
```

### Improvement 4: Screenshot Capture for Evidence

```python
def capture_validation_screenshots(
    chunk: ChunkData,
    context: dict,
    working_dir: Path,
    port: int
) -> dict:
    """Capture screenshots of both versions for evidence.

    Returns:
        {
            'localhost_screenshot': 'path/to/localhost.png',
            'production_screenshot': 'path/to/production.png'
        }
    """
    screenshots_dir = working_dir / "agents" / f"fp_chunk_{chunk.number}" / "validation_screenshots"
    screenshots_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')

    localhost_path = screenshots_dir / f"{timestamp}_localhost.png"
    production_path = screenshots_dir / f"{timestamp}_production.png"

    # Note: This would require extending adw_claude_browser.py to support
    # screenshot capture mode OR using playwright MCP directly

    return {
        'localhost_screenshot': str(localhost_path),
        'production_screenshot': str(production_path)
    }
```

### Improvement 5: Unified Timeout Configuration

**File:** `adws/adw_modules/config.py` (new file)

```python
"""Centralized configuration for ADW scripts."""

# Browser validation timeouts
BROWSER_CLAUDE_TIMEOUT = 600  # 10 minutes - time for Claude to analyze
DEV_SERVER_STARTUP_TIMEOUT = 30  # 30 seconds - time for server to start
VALIDATION_TOTAL_TIMEOUT = 660  # 11 minutes - total including retries

# Validation settings
VALIDATION_MAX_RETRIES = 3
VALIDATION_MIN_CONFIDENCE = 80  # Minimum confidence for PASS verdict

# Dev server
DEV_SERVER_PORT = 8000
DEV_SERVER_HOST = "localhost"
```

Then update both scripts to import from this config:

```python
from adw_modules.config import (
    BROWSER_CLAUDE_TIMEOUT,
    DEV_SERVER_PORT,
    VALIDATION_MAX_RETRIES,
    VALIDATION_MIN_CONFIDENCE
)
```

### Improvement 6: Enhanced Validation Prompt (Simplified)

```python
validation_prompt = f"""Compare these two URLs for visual differences:

**Localhost (refactored):** http://localhost:{port}{context['page_url']}
**Production (baseline):** https://www.split.lease{context['page_url']}

**Your ONLY task:** Report visual differences a user would notice.

**Context (for reference only):**
- Refactored file: {chunk.file_path}:{chunk.line_number}
- Change type: Functional programming refactoring (architectural only)
- Expected: ZERO visual changes

**Response format (JSON only):**
```json
{{
  "verdict": "PASS",
  "confidence": 95,
  "visual_differences": [],
  "summary": "Pages are visually identical"
}}
```

**Verdict rules:**
- PASS: Pages are visually identical (confidence ≥ 80%)
- FAIL: One or more visual differences detected
- ERROR: Could not complete comparison

**Before responding:**
1. Take screenshot of localhost page
2. Take screenshot of production page
3. Compare the screenshots
4. Respond with JSON only

Do NOT attempt to fix any issues. Report only.
"""
```

### Improvement 7: Validation Result Logging

```python
def log_validation_result(
    logger,
    chunk: ChunkData,
    result: dict,
    attempt: int = 1
) -> None:
    """Log detailed validation result."""

    logger.log_section(f"VALIDATION RESULT (Attempt {attempt})", to_stdout=False)
    logger.log(f"Verdict: {result['verdict']}", to_stdout=False)
    logger.log(f"Confidence: {result['confidence']}%", to_stdout=False)

    if result['differences']:
        logger.log(f"Differences found: {len(result['differences'])}", to_stdout=False)
        for i, diff in enumerate(result['differences'], 1):
            logger.log(f"  {i}. [{diff['severity']}] {diff['type']}: {diff['description']}", to_stdout=False)
    else:
        logger.log("No differences detected", to_stdout=False)

    logger.log(f"Summary: {result.get('summary', 'N/A')}", to_stdout=False)

    if 'localhost_screenshot' in result:
        logger.log(f"Screenshots saved:", to_stdout=False)
        logger.log(f"  Localhost: {result['localhost_screenshot']}", to_stdout=False)
        logger.log(f"  Production: {result['production_screenshot']}", to_stdout=False)

    logger.log_separator(to_stdout=False)
```

---

## Implementation Priority

1. **High Priority (Do First):**
   - ✅ Structured JSON response format
   - ✅ Response parsing with validation
   - ✅ Unified timeout configuration
   - ✅ Enhanced validation result logging

2. **Medium Priority:**
   - ✅ Retry logic with exponential backoff
   - ✅ Screenshot capture (optional but valuable)

3. **Future Enhancements:**
   - Visual diff generation (highlight differences in images)
   - Confidence threshold tuning based on historical data
   - Parallel validation across multiple affected pages
   - Validation result caching (if same chunk re-run)

---

## Files to Modify

1. **`adw_fp_audit_browser_implement_orchestrator.py`:**
   - Replace `validate_with_browser()` with new structured version
   - Add `parse_validation_response()` function
   - Add `validate_with_browser_retry()` wrapper
   - Update validation result checking logic

2. **`adw_claude_browser.py`:**
   - Update timeout to match config
   - Ensure proper error propagation
   - Add screenshot capture mode (optional)

3. **`adws/adw_modules/config.py`:** (NEW)
   - Create centralized config file
   - Define all timeout and validation constants

4. **`adw_fp_browser_implement_mini.py`:**
   - Import and use new retry validation logic

---

## Testing Checklist

After implementing improvements:

- [ ] Test PASS case: No visual changes detected
- [ ] Test FAIL case: Visual difference introduced
- [ ] Test ERROR case: Page doesn't load
- [ ] Test retry logic: Temporary network failure
- [ ] Test timeout: Ensure both scripts use same timeout
- [ ] Test JSON parsing: Malformed response handling
- [ ] Test screenshot capture: Files created correctly
- [ ] Test confidence threshold: Low confidence rejected
- [ ] Test contradiction: Claude says PASS but lists differences

---

## References

- Current orchestrator: [adw_fp_audit_browser_implement_orchestrator.py](../../../adws/adw_fp_audit_browser_implement_orchestrator.py)
- Browser wrapper: [adw_claude_browser.py](../../../adws/adw_claude_browser.py)
- Mini orchestrator: [adw_fp_browser_implement_mini.py](../../../adws/adw_fp_browser_implement_mini.py)
