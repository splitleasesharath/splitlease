"""
Chunk Validation Module - Shared validation logic for orchestrators

This module provides validation functions that can be used by both
the full orchestrator and mini orchestrator to ensure consistency.
"""

import subprocess
import tempfile
import time
from pathlib import Path
from typing import Tuple, Dict, Any
from datetime import datetime

from .config import (
    BROWSER_CLAUDE_TIMEOUT,
    VALIDATION_MAX_RETRIES,
    VALIDATION_RETRY_BACKOFF_BASE,
    PRODUCTION_BASE_URL
)
from .validation_parser import parse_validation_response, format_validation_result, ValidationResult
from .webhook import notify_success, notify_failure, notify_in_progress


def build_validation_prompt(
    localhost_url: str,
    production_url: str,
    chunk_title: str,
    file_path: str,
    line_number: str,
    additional_context: Dict[str, Any] = None
) -> str:
    """Build structured validation prompt for Claude browser.

    Args:
        localhost_url: Full localhost URL (e.g., "http://localhost:5173/search")
        production_url: Full production URL (e.g., "https://www.split.lease/search")
        chunk_title: Description of the chunk being validated
        file_path: File that was modified
        line_number: Line number(s) that were modified
        additional_context: Optional dict with extra context

    Returns:
        Validation prompt string optimized for JSON response
    """
    additional_notes = ""
    if additional_context:
        if "additional_pages" in additional_context:
            other_pages = ", ".join(additional_context["additional_pages"])
            additional_notes = f"\n\n**Also affects:** {other_pages}"

    prompt = f"""Compare these two URLs for visual differences:

**Localhost (refactored):** {localhost_url}
**Production (baseline):** {production_url}

**Your ONLY task:** Report visual differences a user would notice.

**Context (for reference only):**
- Refactored file: {file_path}:{line_number}
- Change type: {chunk_title}
- Expected: ZERO visual changes{additional_notes}

**Response format (MUST be valid JSON):**
```json
{{
  "verdict": "PASS|FAIL|ERROR",
  "confidence": 0-100,
  "visual_differences": [
    {{
      "type": "layout|styling|content|interaction|console_error",
      "description": "Brief description",
      "severity": "critical|major|minor"
    }}
  ],
  "summary": "One sentence summary"
}}
```

**Verdict rules:**
- **PASS**: Pages are visually identical (confidence ≥ 80%)
- **FAIL**: One or more visual differences detected
- **ERROR**: Could not complete comparison (page didn't load, timeout, etc.)

**Important instructions:**
1. Navigate to BOTH URLs explicitly (don't assume you're already there)
2. Take a screenshot of the localhost page
3. Take a screenshot of the production page
4. Compare the screenshots carefully
5. Check browser console for errors on both pages
6. Respond with JSON ONLY (no additional commentary)

Do NOT attempt to fix any issues. Report only.
"""

    return prompt


def validate_chunk_with_retry(
    localhost_url: str,
    production_url: str,
    chunk_number: int,
    chunk_title: str,
    file_path: str,
    line_number: str,
    working_dir: Path,
    logger,
    additional_context: Dict[str, Any] = None,
    max_retries: int = VALIDATION_MAX_RETRIES
) -> Tuple[bool, ValidationResult]:
    """Validate chunk changes with automatic retry on ERROR verdicts.

    Args:
        localhost_url: Full localhost URL to test
        production_url: Full production URL to compare against
        chunk_number: Chunk number being validated
        chunk_title: Chunk title/description
        file_path: File that was modified
        line_number: Line number(s) modified
        working_dir: Working directory
        logger: RunLogger instance
        additional_context: Optional context dict
        max_retries: Maximum retry attempts (default from config)

    Returns:
        Tuple of (passed: bool, result: ValidationResult)
    """
    notify_in_progress(
        step=f"Validating Chunk {chunk_number}",
        details=f"Testing {localhost_url} vs {production_url}",
        metadata={
            "localhost": localhost_url,
            "production": production_url,
            "chunk": chunk_number
        }
    )

    logger.log_section(f"VALIDATION - CHUNK {chunk_number}", to_stdout=False)
    logger.log(f"Localhost URL: {localhost_url}", to_stdout=False)
    logger.log(f"Production URL: {production_url}", to_stdout=False)
    logger.log(f"File: {file_path}:{line_number}", to_stdout=False)
    logger.log(f"Max retries: {max_retries}", to_stdout=False)

    # Build validation prompt
    validation_prompt = build_validation_prompt(
        localhost_url,
        production_url,
        chunk_title,
        file_path,
        line_number,
        additional_context
    )

    logger.log_section("VALIDATION PROMPT", to_stdout=False)
    logger.log(validation_prompt, to_stdout=False)
    logger.log_separator(to_stdout=False)

    # Retry loop
    for attempt in range(1, max_retries + 1):
        logger.log(f"Validation attempt {attempt}/{max_retries}", to_stdout=False)
        print(f"🔍 Validation attempt {attempt}/{max_retries}...")

        try:
            # Execute validation
            result = _execute_validation(
                validation_prompt,
                working_dir,
                logger,
                attempt
            )

            # Log result
            logger.log(f"Attempt {attempt} result: {result.verdict}", to_stdout=False)
            logger.log(f"Confidence: {result.confidence}%", to_stdout=False)
            logger.log(f"Passed: {result.passed}", to_stdout=False)

            # If ERROR verdict, retry
            if result.verdict == 'ERROR':
                if attempt < max_retries:
                    wait_time = VALIDATION_RETRY_BACKOFF_BASE ** attempt
                    logger.log(f"ERROR verdict, retrying in {wait_time}s...", to_stdout=False)
                    print(f"⏳ Got ERROR verdict, retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.log(f"Max retries reached with ERROR verdict", to_stdout=False)
                    print(f"❌ Max retries reached with ERROR verdict")
                    notify_failure(
                        step=f"Chunk {chunk_number} validation failed",
                        error=f"ERROR after {max_retries} attempts: {result.summary}"
                    )
                    return False, result

            # PASS or FAIL verdict - return immediately
            if result.passed:
                logger.log(f"✅ Validation PASSED", to_stdout=False)
                print(f"✅ Validation PASSED!")
                print(f"   {result.summary}")
                notify_success(
                    step=f"Chunk {chunk_number} validation passed",
                    details=result.summary
                )
            else:
                logger.log(f"❌ Validation FAILED", to_stdout=False)
                print(f"❌ Validation FAILED!")
                print(f"   {result.summary}")
                if result.differences:
                    print(f"   Differences ({len(result.differences)}):")
                    for diff in result.differences:
                        print(f"     - [{diff.severity}] {diff.type}: {diff.description}")
                notify_failure(
                    step=f"Chunk {chunk_number} validation failed",
                    error=result.summary[:100]
                )

            logger.log(format_validation_result(result), to_stdout=False)
            logger.log_separator(to_stdout=False)

            return result.passed, result

        except Exception as e:
            logger.log(f"Attempt {attempt} raised exception: {e}", to_stdout=False)
            print(f"💥 Attempt {attempt} crashed: {e}")

            if attempt < max_retries:
                wait_time = VALIDATION_RETRY_BACKOFF_BASE ** attempt
                logger.log(f"Retrying in {wait_time}s...", to_stdout=False)
                print(f"⏳ Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                logger.log(f"Max retries reached after exception", to_stdout=False)
                print(f"❌ Max retries reached after exception")
                notify_failure(
                    step=f"Chunk {chunk_number} validation crashed",
                    error=str(e)[:100]
                )
                # Return error result
                from .validation_parser import ValidationResult, ValidationDifference
                return False, ValidationResult(
                    verdict='ERROR',
                    confidence=0,
                    differences=[ValidationDifference(
                        type='exception',
                        description=str(e),
                        severity='critical'
                    )],
                    summary=f'Validation crashed: {str(e)}',
                    passed=False,
                    raw_output=str(e)
                )

    # Should never reach here
    logger.log("Unexpected: Reached end of retry loop", to_stdout=False)
    from .validation_parser import ValidationResult, ValidationDifference
    return False, ValidationResult(
        verdict='ERROR',
        confidence=0,
        differences=[ValidationDifference(
            type='unknown_error',
            description='Unexpected error in retry loop',
            severity='critical'
        )],
        summary='Unknown error in validation retry loop',
        passed=False,
        raw_output='Unknown error'
    )


def _execute_validation(
    validation_prompt: str,
    working_dir: Path,
    logger,
    attempt: int
) -> ValidationResult:
    """Execute single validation attempt.

    Args:
        validation_prompt: Prompt to send to Claude
        working_dir: Working directory
        logger: Logger instance
        attempt: Attempt number (for logging)

    Returns:
        ValidationResult

    Raises:
        Exception: If subprocess execution fails
    """
    # Use stateless browser script
    browser_script = working_dir / "adws" / "adw_claude_browser_stateless.py"

    if not browser_script.exists():
        raise FileNotFoundError(f"Browser script not found: {browser_script}")

    # Write prompt to temp file to avoid Windows command-line length limits
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as tmp:
        tmp.write(validation_prompt)
        prompt_file = tmp.name

    logger.log(f"Created temp prompt file: {prompt_file}", to_stdout=False)
    logger.log(f"Prompt length: {len(validation_prompt)} characters", to_stdout=False)

    try:
        # Execute browser script
        logger.log(f"Executing: uv run {browser_script} @{prompt_file}", to_stdout=False)

        result = subprocess.run(
            ["uv", "run", str(browser_script), f"@{prompt_file}"],
            cwd=working_dir,
            capture_output=True,
            text=True,
            timeout=BROWSER_CLAUDE_TIMEOUT,
            encoding='utf-8',
            errors='replace'
        )

        logger.log(f"Browser script exit code: {result.returncode}", to_stdout=False)
        logger.log(f"STDOUT length: {len(result.stdout)} chars", to_stdout=False)
        logger.log(f"STDERR length: {len(result.stderr)} chars", to_stdout=False)

        # Parse response
        output = result.stdout if result.returncode == 0 else result.stderr

        logger.log_section(f"RAW OUTPUT (Attempt {attempt})", to_stdout=False)
        logger.log(output, to_stdout=False)
        logger.log_separator(to_stdout=False)

        # Parse structured response
        validation_result = parse_validation_response(output)

        return validation_result

    finally:
        # Clean up temp file
        import os
        try:
            os.unlink(prompt_file)
            logger.log(f"Cleaned up temp file: {prompt_file}", to_stdout=False)
        except Exception as cleanup_err:
            logger.log(f"Failed to cleanup temp file: {cleanup_err}", to_stdout=False)
