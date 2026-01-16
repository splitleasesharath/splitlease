# Implementation Plan: Build Check Gate for ADW Orchestrator

**Created**: 2026-01-16 03:45:00
**Status**: Awaiting Review
**Classification**: BUILD
**Estimated Time**: ~15 minutes implementation + testing

---

## Problem Statement

The ADW Unified FP Orchestrator fails visual parity checks when refactored code contains compilation errors that crash Vite on startup. Currently:

1. Chunks are implemented by Gemini
2. Dev server startup is attempted
3. If code has errors, Vite crashes silently
4. Visual check fails with "Connection refused"
5. Time is wasted on failed visual check attempts (~2 min per page group)

**Evidence from last run** (`adws/adw_run_logs/20260116011408_unified_fp_refactor_run.log`):
- 4 of 6 page groups failed due to "Connection refused on port 8010"
- The 2 groups that passed (AUTO / Shared Components, AUTO / Cleanup) used build checks instead of visual checks

---

## Proposed Solution

Add a **build check gate** after chunk implementation, before attempting to start the dev server. If the build fails, reset immediately without wasting time on dev server startup and visual checks.

### New Flow for Testable Pages

```
Current:
  Implement chunks → Start dev server → Visual check → Commit/Reset

Proposed:
  Implement chunks → BUILD CHECK → Start dev server → Visual check → Commit/Reset
                          ↓
                    (if fails, reset immediately)
```

---

## Implementation Details

### File to Modify

**`adws/adw_unified_fp_orchestrator.py`** (lines 330-340)

### Current Code (lines 330-340)

```python
# 4b. Start dev server (only for testable pages)
logger.step("Starting dev server...")
try:
    port, base_url = dev_server.start()
except Exception as e:
    logger.log(f"  [FAIL] Dev server failed: {e}")
    subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir, check=False)
    stats["failed"] += 1
    count += 1
    logger.phase_complete(f"Page {page_path}", success=False, error=f"Dev server: {e}")
    continue
```

### Proposed Code (insert BEFORE line 330)

```python
# 4b. Build check gate - verify code compiles before starting dev server
logger.step("Running build check...")
try:
    build_result = subprocess.run(
        ["bun", "run", "build"],
        cwd=working_dir / "app",
        capture_output=True,
        text=True,
        timeout=120
    )
    if build_result.returncode != 0:
        # Extract error message from build output
        error_output = build_result.stderr or build_result.stdout
        error_lines = [l for l in error_output.split('\n') if l.strip()]
        error_snippet = error_lines[-3:] if error_lines else ['Unknown build error']

        logger.log(f"  [FAIL] Build check failed:")
        for line in error_snippet:
            logger.log(f"    {line[:100]}")

        subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir, check=False)
        stats["failed"] += 1
        count += 1
        logger.phase_complete(f"Page {page_path}", success=False, error="Build check failed")
        continue

    logger.log(f"  [OK] Build check passed")

except subprocess.TimeoutExpired:
    logger.log(f"  [FAIL] Build check timed out (120s)")
    subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir, check=False)
    stats["failed"] += 1
    count += 1
    logger.phase_complete(f"Page {page_path}", success=False, error="Build timeout")
    continue
except Exception as e:
    logger.log(f"  [FAIL] Build check error: {e}")
    subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir, check=False)
    stats["failed"] += 1
    count += 1
    logger.phase_complete(f"Page {page_path}", success=False, error=str(e)[:50])
    continue

# 4c. Start dev server (only if build passed)
logger.step("Starting dev server...")
# ... rest of existing code
```

---

## Step-by-Step Changes

### Step 1: Locate insertion point

In `adws/adw_unified_fp_orchestrator.py`, find line 330:
```python
# 4b. Start dev server (only for testable pages)
```

### Step 2: Insert build check gate

Insert the new build check code block **before** the dev server start section.

### Step 3: Update comment numbering

- Change `# 4b. Start dev server` to `# 4c. Start dev server`
- Change `# 4c. Visual regression check` to `# 4d. Visual regression check`
- Change `# 4d. Commit or reset` to `# 4e. Commit or reset`

---

## Expected Log Output

After implementation, the log should show:

```
[02:01:17]   → Processing /search (chunks: 1, 2, 3, 4, 5)
[02:01:17]   → Implementing chunk 1: SearchPage violates Hollow Component pattern
...
[01:59:38]   → Running build check...
[01:59:50]     [FAIL] Build check failed:
[01:59:50]       SyntaxError: Unexpected token (line 42)
[01:59:50]       at SearchPage.jsx:42:15
[01:59:50] [FAIL] Page /search
```

Instead of:

```
[01:59:38]   → Starting dev server...
[01:59:51]   → Visual check: LIVE(public) vs DEV(public)
[02:01:16]   [FAIL] Visual parity failed: Connection refused
```

---

## Benefits

| Metric | Before | After |
|--------|--------|-------|
| Time per failed page group | ~2 min (dev server + visual check timeout) | ~15s (build check only) |
| Error message clarity | "Connection refused" | Actual build error with file/line |
| Debugging info | None | Full Vite error output |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Build check adds ~15s per page group | Acceptable tradeoff vs 2 min wasted on failed visual checks |
| Build might pass but Vite dev fails | Unlikely - both use same Vite config. If happens, new diagnostic logging will catch it |
| Timeout might be too short for large codebases | 120s matches existing timeout for non-page groups |

---

## Testing Plan

1. **Manual test**: Run `bun run build` in `app/` to verify build works currently
2. **Introduce error**: Temporarily add syntax error to a file
3. **Run orchestrator**: `uv run adws/adw_unified_fp_orchestrator.py app --limit 1`
4. **Verify**: Build check should fail with clear error message
5. **Restore**: Remove syntax error, verify build check passes

---

## Files Referenced

| File | Purpose |
|------|---------|
| [adws/adw_unified_fp_orchestrator.py](../../adws/adw_unified_fp_orchestrator.py) | Main orchestrator - **TO BE MODIFIED** |
| [adws/adw_modules/dev_server.py](../../adws/adw_modules/dev_server.py) | Dev server management (recently updated with diagnostics) |
| [adws/adw_run_logs/20260116011408_unified_fp_refactor_run.log](../../adws/adw_run_logs/20260116011408_unified_fp_refactor_run.log) | Evidence of the problem |
| [app/package.json](../../app/package.json) | Contains `build` script definition |

---

## Approval Checklist

- [ ] Plan reviewed and approved
- [ ] Implementation approach agreed
- [ ] Testing plan adequate
- [ ] Ready to implement

---

**Next Step**: After approval, implement the changes to `adws/adw_unified_fp_orchestrator.py`
