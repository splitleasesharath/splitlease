# ADW Orchestrator Fixes Plan

**Created**: 2026-01-15 14:00:00
**Status**: Analysis Complete - Awaiting Approval

---

## Summary of Issues

The unified FP orchestrator run failed with multiple cascading problems:

| Issue | Severity | Root Cause |
|-------|----------|------------|
| Gemini 429 rate limits | HIGH | Quota exhausted, every request falling back to Claude |
| Build failure (ViewSplitLeasePage deleted) | CRITICAL | Agent ran destructive `Remove-Item` commands |
| Visual parity failures | MEDIUM | Pre-existing DEV vs LIVE differences, not refactor-related |
| Unauthorized command execution | CRITICAL | Prompt doesn't constrain agent; `dangerously_skip_permissions=True` |

---

## Issue 1: Gemini 429 Rate Limits

**Symptom**: Every Gemini request hits 429 and falls back to Claude Sonnet.

**Impact**:
- Doubled API costs
- Slower execution
- Slack notification spam

**Root Cause**: Gemini API quota exhausted or aggressive rate limiting.

**Solutions**:

### Option A: Disable Gemini, Use Claude Only (Recommended Short-Term)
Set `ADW_PROVIDER=claude` in environment to skip Gemini entirely until quota resets.

### Option B: Add Rate Limit Delay Between Requests
Add configurable delay between chunk implementations to stay under rate limits.

### Option C: Implement Request Batching
Group multiple small edits into single prompts to reduce API calls.

---

## Issue 2: Agent Deleting Required Files

**Symptom**: Build fails with `Could not resolve "./islands/pages/ViewSplitLeasePage.jsx"`

**Root Cause**: Chunk 2 instructed "Remove deprecated ViewSplitLeasePage-old.jsx" but the agent ran:
```powershell
Get-ChildItem -Recurse -Filter "* (1).*" | Remove-Item -Force
```

This is a **prompt interpretation problem**. The agent interpreted "remove" as "delete files" and used shell commands instead of the Edit tool.

**Solution**: Constrain the prompt to ONLY allow specific tools.

---

## Issue 3: Unauthorized Command Execution

**User Requirement**: Agent should ONLY run `bun run dev:test:restart`, nothing else.

**Current State**: The prompt has no tool restrictions. With `dangerously_skip_permissions=True`, the agent can:
- Run any shell command
- Delete any file
- Modify anything

**Solution**: Add explicit tool constraints to the implementation prompt.

---

## Proposed Fix: Constrained Implementation Prompt

Replace the current prompt in `adw_unified_fp_orchestrator.py` lines 68-91:

```python
prompt = f"""Implement ONLY chunk {chunk.number} from the refactoring plan.

**Chunk Details:**
- File: {chunk.file_path}
- Line: {chunk.line_number}
- Title: {chunk.title}

**Current Code:**
```javascript
{chunk.current_code}
```

**Refactored Code:**
```javascript
{chunk.refactored_code}
```

**STRICT INSTRUCTIONS:**
1. Use ONLY the Edit tool to make changes. Do NOT use Bash/shell commands.
2. Read the file: {chunk.file_path}
3. Find the exact "Current Code" block shown above.
4. Use Edit tool to replace it with the "Refactored Code" EXACTLY as shown.
5. Do NOT run any shell commands (no rm, del, Remove-Item, etc.)
6. Do NOT commit.
7. Do NOT run build, test, or any verification commands.

**FORBIDDEN ACTIONS:**
- Running shell commands to delete files
- Running any commands other than file read/edit
- Making changes to files not listed above
- Running bun, npm, or any build tools
"""
```

---

## Issue 4: Visual Parity Detecting Pre-Existing Differences

**Symptom**: Visual checks fail with differences like:
- "DEV has horizontal filter layout... LIVE uses compact filter button"
- "DEV shows 'Refine Neighborhood(s)' search textbox... LIVE shows Manhattan tag"

**Analysis**: These are **pre-existing UI differences** between your development branch and production. The refactoring didn't cause these - they exist because DEV is ahead of LIVE.

**Solutions**:

### Option A: Skip Visual Parity for FP Refactors (Recommended)
FP refactors are internal code changes that shouldn't affect UI. Use build-only verification:
- Build succeeds = PASS
- Build fails = FAIL

### Option B: Compare DEV Before vs DEV After
Instead of comparing DEV vs LIVE, compare:
1. Take screenshot before implementing chunk
2. Implement chunk
3. Take screenshot after
4. Compare before vs after (should be identical for FP refactors)

### Option C: Visual Parity Tolerance Mode
Allow visual parity to PASS if differences match a known "acceptable differences" list.

---

## Recommended Implementation Order

1. **Immediate**: Add tool constraints to implementation prompt
2. **Immediate**: Switch to Claude-only (`ADW_PROVIDER=claude`) until Gemini quota resets
3. **Short-term**: Use build-only verification for FP refactors (no visual parity)
4. **Later**: Implement before/after screenshot comparison for true visual regression

---

## Files to Modify

| File | Change |
|------|--------|
| `adws/adw_unified_fp_orchestrator.py` | Update implementation prompt with tool constraints |
| `adws/adw_unified_fp_orchestrator.py` | Add option to skip visual parity for non-page groups |
| `.env` or environment | Set `ADW_PROVIDER=claude` temporarily |

---

## References

- [adw_unified_fp_orchestrator.py](adws/adw_unified_fp_orchestrator.py) - Lines 63-111
- [agent.py](adws/adw_modules/agent.py) - Fallback logic lines 353-418
- [visual_regression.py](adws/adw_modules/visual_regression.py) - Visual check logic
- [chunk_parser.py](adws/adw_modules/chunk_parser.py) - Chunk extraction
