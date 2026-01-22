# Revitalize Visual Parity Check from Old Orchestrator

**Created**: 2026-01-21 14:35:00
**Type**: FEATURE RESTORATION
**Priority**: CRITICAL
**Status**: PENDING

---

## Executive Summary

The old orchestrator (`adws/adw_unified_fp_orchestrator.py`, deleted in commit `5879ef13`) had a working visual parity check that:
1. **FAILED the entire page group if visual check failed**
2. **Reset changes immediately on failure**
3. **Sent Slack notifications with screenshots**

The new "deferred validation" architecture lost this behavior. This plan restores the fail-fast semantics while adapting to the batch validation model.

---

## Critical Design Principle Violated

### The Old Behavior (CORRECT):

```
Visual Check → FAIL → git reset → STOP
Visual Check → BLOCKED → git reset → STOP
Visual Check → PASS → git commit → CONTINUE
```

### The New Behavior (BROKEN):

```
Visual Check → TODO/SKIP → mark as PASS → git commit → CONTINUE
```

**This is fundamentally wrong.** An unimplemented check should be treated as a FAILURE, not a PASS.

---

## Architecture Comparison

### Old Orchestrator Flow (Per-Page):

```
FOR EACH page_group:
    1. Implement chunks for this page
    2. Build check
    3. Start dev server
    4. Visual parity check (LIVE vs DEV)
       ├─ PASS → commit this page group
       └─ FAIL/BLOCKED → reset this page group, continue to next
    5. Stop dev server
```

**Pros**: Immediate feedback, isolated failures
**Cons**: Slow (build per page, dev server restarts)

### New Orchestrator Flow (Batch):

```
1. Implement ALL chunks
2. Single build check
3. Start dev server once
4. Visual parity check ALL affected pages
   ├─ ALL PASS → commit everything
   └─ ANY FAIL → reset everything
5. Stop dev server
```

**Pros**: Much faster (single build, single dev server)
**Cons**: All-or-nothing (but this is actually safer)

---

## Restoration Plan

### Phase 1: Fail-Fast Semantics

**Principle**: If visual parity cannot be verified, the validation MUST FAIL.

**File**: `adws/functional-code-refactor/modules/deferred_validation.py`

**Change the default behavior**:

```python
# BEFORE (broken - silent success):
if not skip_visual and batch.affected_pages:
    # TODO: Implement batch visual regression
    result.visual_passed = True  # WRONG!
    logger.log("  [SKIP] Batch visual regression not yet implemented")

# AFTER (fail-safe):
if not skip_visual and batch.affected_pages:
    if not _visual_regression_available():
        result.visual_passed = False
        result.errors.append(ValidationError(
            message="Visual regression required but not available. Use --skip-visual to bypass."
        ))
        logger.log("  [FAIL] Visual regression required but not implemented")
        return result

    # ... actual visual regression code ...
```

This ensures:
- If visual regression isn't implemented → FAIL
- If `--skip-visual` is passed → SKIP (explicit opt-out)
- If visual regression runs and fails → FAIL
- If visual regression runs and passes → PASS

---

### Phase 2: Port the Visual Check Loop

**Source**: `git show 5879ef13^:adws/adw_unified_fp_orchestrator.py` lines 432-470

**Target**: `adws/functional-code-refactor/modules/deferred_validation.py`

**Ported Code**:

```python
def _run_batch_visual_regression(
    affected_pages: Set[str],
    working_dir: Path,
    logger: "RunLogger",
    slack_channel: Optional[str] = None,
    port: int = 8010
) -> Tuple[bool, List[ValidationError], Dict[str, Dict]]:
    """
    Run visual parity checks on all affected pages.

    FAIL-FAST: Returns False if ANY page fails or is blocked.

    Args:
        affected_pages: Set of page paths to check
        working_dir: Project root directory
        logger: RunLogger for output
        slack_channel: Optional Slack channel for notifications
        port: Dev server port

    Returns:
        Tuple of (all_passed, errors, screenshots_by_page)
    """
    from .visual_regression import check_visual_parity
    from .page_classifier import get_mcp_sessions_for_page, get_page_info

    errors: List[ValidationError] = []
    screenshots: Dict[str, Dict] = {}

    # Clean up zombie browser processes before starting
    _cleanup_browser_processes_for_visual()

    for page_path in affected_pages:
        # Get MCP sessions for this page type
        mcp_live, mcp_dev = get_mcp_sessions_for_page(page_path)
        page_info = get_page_info(page_path)
        auth_type = page_info.auth_type if page_info else "public"

        logger.log(f"  [Visual] Checking {page_path} (LIVE:{mcp_live or 'public'}, DEV:{mcp_dev or 'public'})")

        # Run visual parity check - THIS IS THE KEY CALL
        visual_result = check_visual_parity(
            page_path=page_path,
            mcp_session=mcp_live,
            mcp_session_dev=mcp_dev,
            auth_type=auth_type,
            port=port,
            concurrent=True,
            slack_channel=slack_channel  # Screenshots sent to Slack automatically
        )

        parity_status = visual_result.get("visualParity", "FAIL")

        # Collect screenshots
        if visual_result.get("screenshots"):
            screenshots[page_path] = visual_result["screenshots"]

        # Handle result - FAIL-FAST on any non-PASS
        if parity_status == "PASS":
            logger.log(f"    [PASS] Visual parity OK")

        elif parity_status == "BLOCKED":
            # BLOCKED = Environment unreachable = FAIL
            issues = visual_result.get('issues', ['Environment unreachable'])
            logger.log(f"    [BLOCKED] {issues[0]}")
            errors.append(ValidationError(
                message=f"Visual check BLOCKED for {page_path}: {issues[0]}",
                file_path=page_path
            ))
            # Don't return early - check all pages to report full scope

        else:  # FAIL
            issues = visual_result.get('issues', ['Visual difference detected'])
            logger.log(f"    [FAIL] {issues[0]}")
            errors.append(ValidationError(
                message=f"Visual parity FAILED for {page_path}: {issues[0]}",
                file_path=page_path
            ))

    all_passed = len(errors) == 0
    return all_passed, errors, screenshots


def _cleanup_browser_processes_for_visual() -> None:
    """Kill zombie browser processes before visual checks."""
    import subprocess
    import platform

    if platform.system() == "Windows":
        subprocess.run(
            ["powershell", "-Command",
             "Get-Process -Name chrome, chromium, msedge -ErrorAction SilentlyContinue | "
             "Stop-Process -Force -ErrorAction SilentlyContinue"],
            capture_output=True, timeout=15
        )
```

---

### Phase 3: Integrate into `run_deferred_validation()`

**Replace the TODO block with the actual implementation**:

```python
def run_deferred_validation(
    batch: ValidationBatch,
    working_dir: Path,
    logger: "RunLogger",
    skip_visual: bool = False,
    build_timeout: int = 180,
    slack_channel: Optional[str] = None
) -> ValidationResult:
    """Run validation after all chunks implemented."""

    result = ValidationResult(success=False)

    # Phase 1: Build check (unchanged)
    # ... existing build check code ...

    # Phase 2: Visual regression
    if not skip_visual and batch.affected_pages:
        logger.step(f"Running visual regression on {len(batch.affected_pages)} affected pages...")

        all_passed, visual_errors, screenshots = _run_batch_visual_regression(
            affected_pages=batch.affected_pages,
            working_dir=working_dir,
            logger=logger,
            slack_channel=slack_channel
        )

        result.visual_passed = all_passed
        result.errors.extend(visual_errors)

        if all_passed:
            logger.log(f"  [OK] All {len(batch.affected_pages)} pages passed visual check")
        else:
            logger.log(f"  [FAIL] Visual regression failed: {len(visual_errors)} pages with issues")

    elif not batch.affected_pages and batch.chunks:
        # Pageless chunks - use test-driven validation (existing code)
        # ... existing test-driven validation code ...

    else:
        result.visual_passed = True
        if skip_visual:
            logger.log("  [SKIP] Visual regression skipped by --skip-visual flag")
        else:
            logger.log("  [SKIP] No pages affected")

    result.success = result.build_passed and result.visual_passed
    return result
```

---

### Phase 4: Ensure Slack Screenshots are Sent

The `check_visual_parity()` function already has Slack integration built in. When `slack_channel` is provided:

1. It calls `notify_parity_check_result()` internally
2. Which sends a message with PASS/FAIL/BLOCKED status
3. And uploads LIVE + DEV screenshots as thread replies

**No additional code needed** - just ensure `slack_channel` is passed through.

---

### Phase 5: Add Final Summary to Slack

**File**: `adws/functional-code-refactor/orchestrator.py`

After validation completes, send a final summary:

```python
# After validation phase
if orchestration_result:
    # Send final summary to Slack
    if args.slack_channel:
        try:
            from modules.slack_client import create_slack_client_from_env
            client = create_slack_client_from_env(default_channel=args.slack_channel)

            # Build summary message
            emoji = "✅" if orchestration_result.success else "❌"
            status = "SUCCESS" if orchestration_result.success else "FAILED"

            summary = (
                f"{emoji} *FP Refactor {status}*\n"
                f"• Chunks: {orchestration_result.chunks_implemented}/{orchestration_result.total_chunks}\n"
                f"• Duration: {orchestration_result.total_duration_seconds:.1f}s\n"
                f"• Phase: {orchestration_result.phase_reached}"
            )

            if orchestration_result.errors:
                summary += f"\n• Errors: {len(orchestration_result.errors)}"
                for err in orchestration_result.errors[:3]:
                    summary += f"\n  - {err[:60]}"

            client.send_message(text=summary)
            logger.log(f"[Slack] Summary sent to {args.slack_channel}")

        except Exception as e:
            logger.log(f"[Slack] Failed to send summary: {e}")
```

---

## Key Behavioral Changes

| Scenario | Old Behavior | Broken Behavior | Restored Behavior |
|----------|--------------|-----------------|-------------------|
| Visual not implemented | N/A (was implemented) | PASS (silent) | **FAIL** (explicit) |
| Visual returns FAIL | FAIL + reset | PASS (not called) | **FAIL + reset** |
| Visual returns BLOCKED | FAIL + reset | PASS (not called) | **FAIL + reset** |
| Visual returns PASS | PASS + commit | PASS (not called) | **PASS + commit** |
| `--skip-visual` flag | Skip + PASS | Skip + PASS | Skip + PASS |
| No affected pages | Skip + PASS | Skip + PASS | Skip + PASS |

---

## Testing Checklist

### Failure Cases (MUST FAIL):
- [ ] Visual regression returns FAIL for any page
- [ ] Visual regression returns BLOCKED for any page
- [ ] Visual regression throws exception
- [ ] Dev server not accessible

### Success Cases (MUST PASS):
- [ ] Visual regression returns PASS for all pages
- [ ] `--skip-visual` flag bypasses visual check
- [ ] No affected pages (pageless chunks)

### Slack Integration:
- [ ] Screenshots uploaded on FAIL
- [ ] Screenshots uploaded on PASS
- [ ] Final summary sent after completion
- [ ] Error details included in failure messages

---

## Files to Modify

| File | Changes |
|------|---------|
| `adws/functional-code-refactor/modules/deferred_validation.py` | Add `_run_batch_visual_regression()`, add `slack_channel` param, implement fail-fast |
| `adws/functional-code-refactor/orchestrator.py` | Add `--slack-channel` arg, thread to validation, send final summary |

---

## Git Reference Commands

```bash
# View the old working orchestrator
git show 5879ef13^:adws/adw_unified_fp_orchestrator.py

# View the visual regression with Slack (still works)
git show 1e26ab38:adws/adw_modules/visual_regression.py

# Compare old vs new orchestrator
git diff 5879ef13^..HEAD -- adws/adw_unified_fp_orchestrator.py
```

---

## Why This Matters

The original implementation understood a fundamental principle:

> **If you can't verify something, you must assume it's broken.**

The refactored code violated this by treating "not yet implemented" as "passed". This is dangerous because:

1. **Silent Failures**: Visual regressions ship to production
2. **False Confidence**: Logs show SUCCESS when checks didn't run
3. **Debugging Nightmare**: "But the pipeline passed!" when it didn't actually check

The fix restores the correct behavior: **verification failures are failures**.
