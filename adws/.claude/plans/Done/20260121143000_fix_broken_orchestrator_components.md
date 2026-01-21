# Fix Broken Orchestrator Components

**Created**: 2026-01-21 14:30:00
**Type**: BUG FIX / COMPLETION
**Priority**: CRITICAL
**Status**: PENDING

---

## Executive Summary

The `functional-code-refactor` orchestrator has several incomplete or disconnected components that were left behind during the Jan 18 "deferred validation" refactor. This plan addresses each broken component systematically.

---

## Problem Statement

During the refactor from per-page validation to batch/deferred validation:
1. Visual regression was left as a TODO placeholder
2. Slack integration was disconnected
3. Webhook notifications were never wired up
4. The pipeline silently succeeds when visual checks should fail

**Critical Issue**: The current implementation marks `visual_passed = True` unconditionally when visual regression should run but isn't implemented, allowing broken visual changes to pass validation.

---

## Components to Fix

### 1. CRITICAL: Batch Visual Regression TODO

**File**: `adws/functional-code-refactor/modules/deferred_validation.py`
**Lines**: 350-387

**Current Broken Code**:
```python
# Phase 2: Visual regression OR Test-driven validation
if not skip_visual and batch.affected_pages:
    # Chunks with affected pages: run visual regression
    logger.step(f"Visual regression on {len(batch.affected_pages)} affected pages...")
    # TODO: Implement batch visual regression
    # For now, mark as passed - visual regression handled separately
    result.visual_passed = True
    logger.log("  [SKIP] Batch visual regression not yet implemented")
```

**Required Fix**:
```python
# Phase 2: Visual regression OR Test-driven validation
if not skip_visual and batch.affected_pages:
    logger.step(f"Visual regression on {len(batch.affected_pages)} affected pages...")

    visual_errors = []
    visual_screenshots = {}

    for page_path in batch.affected_pages:
        # Get MCP sessions for this page
        mcp_live, mcp_dev = get_mcp_sessions_for_page(page_path)

        visual_result = check_visual_parity(
            page_path=page_path,
            mcp_session=mcp_live,
            mcp_session_dev=mcp_dev,
            auth_type=get_page_auth_type(page_path),
            port=8010,
            concurrent=True,
            slack_channel=slack_channel  # Pass through from orchestrator
        )

        parity_status = visual_result.get("visualParity", "FAIL")

        if parity_status == "PASS":
            logger.log(f"  [PASS] {page_path}")
        elif parity_status == "BLOCKED":
            logger.log(f"  [BLOCKED] {page_path}: {visual_result.get('issues', ['Unknown'])[0]}")
            visual_errors.append(ValidationError(
                message=f"Visual check blocked for {page_path}",
                file_path=page_path
            ))
        else:  # FAIL
            issues = visual_result.get('issues', ['Unknown visual difference'])
            logger.log(f"  [FAIL] {page_path}: {issues[0]}")
            visual_errors.append(ValidationError(
                message=f"Visual parity failed for {page_path}: {issues[0]}",
                file_path=page_path
            ))

        # Collect screenshots for Slack
        if visual_result.get("screenshots"):
            visual_screenshots[page_path] = visual_result["screenshots"]

    result.visual_passed = len(visual_errors) == 0
    result.errors.extend(visual_errors)

    if not result.visual_passed:
        logger.log(f"  [FAIL] Visual regression failed with {len(visual_errors)} errors")
```

**Required Imports to Add**:
```python
from .visual_regression import check_visual_parity
from .page_classifier import get_mcp_sessions_for_page, get_page_info
```

---

### 2. Wire Up `to_slack_message()` in Orchestrator

**File**: `adws/functional-code-refactor/orchestrator.py`
**Location**: After Phase 5 completion (around line 590-606)

**Current Code** (doesn't send to Slack):
```python
if orchestration_result:
    logger.summary(...)
    logger.log(f"\n{orchestration_result.to_summary()}")
```

**Required Fix** - Add Slack notification:
```python
if orchestration_result:
    logger.summary(...)
    logger.log(f"\n{orchestration_result.to_summary()}")

    # Send final result to Slack
    try:
        from modules.slack_client import create_slack_client_from_env
        slack_client = create_slack_client_from_env()
        slack_msg = orchestration_result.to_slack_message()
        slack_client.send_message(text=slack_msg)
        logger.log("[Slack] Final result notification sent")
    except Exception as e:
        logger.log(f"[Slack] Failed to send notification: {e}")
```

---

### 3. Wire Up Webhook Notifications

**File**: `adws/functional-code-refactor/orchestrator.py`

**Required Changes**:

**Add import at top**:
```python
from modules.webhook import notify_started, notify_in_progress, notify_success, notify_failure
```

**Add notifications at key points**:

1. **After Phase 1 (Audit)**:
```python
notify_started("FP Refactor", details=f"Target: {args.target_path}")
```

2. **After Phase 4 (Implementation)**:
```python
notify_in_progress("Implementation", details=f"{chunks_implemented}/{total_chunks} chunks")
```

3. **After Phase 5 Success**:
```python
notify_success("FP Refactor", details=f"{chunks_implemented} chunks committed")
```

4. **After Phase 5 Failure**:
```python
notify_failure("FP Refactor", error=f"{len(validation_result.errors)} validation errors")
```

5. **On Exception**:
```python
except Exception as e:
    notify_failure("FP Refactor", error=str(e)[:100])
    logger.error(e, context="Orchestrator crashed")
```

---

### 4. Add `slack_channel` Parameter Threading

**File**: `adws/functional-code-refactor/orchestrator.py`

**Add CLI argument**:
```python
parser.add_argument("--slack-channel", default=None,
    help="Slack channel for notifications (e.g., #dev-alerts)")
```

**Thread through to `run_deferred_validation()`**:
```python
validation_result = run_deferred_validation(
    validation_batch,
    project_root,
    logger,
    skip_visual=args.skip_visual,
    slack_channel=args.slack_channel  # ADD THIS
)
```

**Update `run_deferred_validation()` signature**:
```python
def run_deferred_validation(
    batch: ValidationBatch,
    working_dir: Path,
    logger: "RunLogger",
    skip_visual: bool = False,
    build_timeout: int = 180,
    slack_channel: Optional[str] = None  # ADD THIS
) -> ValidationResult:
```

---

### 5. Remove Dead Imports (Cleanup)

**File**: `adws/functional-code-refactor/orchestrator.py`

These imports exist but are never used - either use them or remove them:

```python
# Line 47 - EITHER USE OR REMOVE:
from modules.visual_regression import check_visual_parity  # Used if we implement batch visual

# Lines 53-58 - Currently unused, consider using or removing:
from modules.concurrent_parity import (
    create_parity_check_plan,
    get_capture_config,
    LIVE_BASE_URL,
    DEV_BASE_URL,
)
```

---

## Implementation Order

| Step | Component | Effort | Risk |
|------|-----------|--------|------|
| 1 | Add `slack_channel` parameter threading | Low | Low |
| 2 | Implement batch visual regression (TODO) | High | Medium |
| 3 | Wire up `to_slack_message()` | Low | Low |
| 4 | Wire up webhook notifications | Medium | Low |
| 5 | Clean up dead imports | Low | Low |

---

## Testing Plan

1. **Unit Test**: Mock `check_visual_parity()` to return FAIL, verify pipeline fails
2. **Unit Test**: Mock `check_visual_parity()` to return BLOCKED, verify pipeline fails
3. **Integration Test**: Run with `--slack-channel=#test` and verify notifications
4. **Regression Test**: Run full pipeline with `--skip-visual` to verify existing behavior unchanged

---

## Files to Modify

| File | Changes |
|------|---------|
| `adws/functional-code-refactor/orchestrator.py` | Add slack_channel arg, wire webhooks, call to_slack_message |
| `adws/functional-code-refactor/modules/deferred_validation.py` | Implement batch visual regression, add slack_channel param |

---

## References

- **Old working orchestrator**: `git show 5879ef13^:adws/adw_unified_fp_orchestrator.py`
- **Slack integration commit**: `1e26ab38` (Jan 18, 09:50)
- **Deferred validation refactor**: `5879ef13` (Jan 18, 15:43)
