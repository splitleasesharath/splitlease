# Code Refactoring with Visual Regression Testing - Pending Tasks

**Created**: 2026-01-14 12:00:00
**Branch**: tac2
**Status**: Implementation Complete, Testing Pending
**Original Plan**: [20260114100000-code-refactoring-visual-regression.md](../../../adws/adw_plans/20260114100000-code-refactoring-visual-regression.md)

---

## Executive Summary

The code refactoring workflow with automated visual regression testing has been **fully implemented** but **not yet tested or committed**. All three core scripts and supporting files exist as untracked files in the repository.

**Workflow**: Opus audits directory → Gemini implements refactors (grouped by page) → Playwright validates visual parity → Commit if pass, reset if fail

---

## Implementation Status: ✅ COMPLETE (Pending Testing)

### Core Files Created (All Untracked)

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `adws/adw_code_audit.py` | 131 | Opus orchestrator for codebase audit | ✅ Complete |
| `adws/adw_code_implement_orchestrator.py` | 309 | Main refactoring orchestrator | ✅ Complete |
| `adws/adw_modules/visual_regression.py` | 105 | Visual parity validation | ✅ Complete |
| `adws/prompts/code_audit_opus.txt` | N/A | Opus audit prompt template | ✅ Complete |
| `adws/prompts/visual_check_gemini.txt` | N/A | Gemini visual check prompt | ✅ Complete |

All files exist in working directory, not yet committed to git.

---

## Pending Tasks

### 1. Testing & Validation (HIGH PRIORITY)

#### Test Phase 1: Opus Audit Generation
- [ ] **Run audit on small test directory**
  ```bash
  uv run adws/adw_code_audit.py app/src/logic/calculators/pricing --audit-type general
  ```
- [ ] Verify plan file created at `.claude/plans/New/<timestamp>_code_refactor_plan.md`
- [ ] Verify chunks properly formatted with `~~~~~` delimiters
- [ ] Verify PAGE GROUP headers present
- [ ] Verify each chunk has Current Code and Refactored Code blocks

#### Test Phase 2: Orchestrator Chunk Parsing
- [ ] Run orchestrator with generated plan
- [ ] Verify PAGE GROUPS extracted correctly
- [ ] Verify chunks grouped by page

#### Test Phase 3: Visual Regression Check
- [ ] Test visual_regression.py on public page `/search`
- [ ] Test on protected page (HOST): `/listing-dashboard`
- [ ] Verify Playwright MCP integration works
- [ ] Verify JSON response parsed correctly

#### Test Phase 4: End-to-End Workflow
- [ ] Run full pipeline on non-critical code
- [ ] Verify git commits created for PASS cases
- [ ] Verify git resets occur for FAIL cases
- [ ] Check Slack notifications sent correctly

---

### 2. Known Issues to Investigate (MEDIUM PRIORITY)

#### Issue 1: MCP Session Parameter Passing
**File**: `adw_modules/visual_regression.py:45-47`

**Action Required**:
- [ ] Verify `adw_modules/agent.py` maps `mcp_session` from `AgentPromptRequest` to CLI flag
- [ ] Test with `--mcp-session playwright-host` for protected pages

**Risk**: Visual checks on protected pages (HOST/GUEST) may fail if MCP session not passed correctly

---

#### Issue 2: Opus Plan Format Compliance
**File**: `adw_code_implement_orchestrator.py:109-145` (chunk parsing)

Parser assumes Opus follows strict format with `~~~~~` delimiters and PAGE GROUP headers.

**Action Required**:
- [ ] Test Opus audit to verify format compliance
- [ ] Document what to do if Opus deviates from format

**Risk**: Medium - If Opus output format is inconsistent, orchestrator will fail to parse chunks

---

#### Issue 3: Git Reset Safety
**File**: `adw_code_implement_orchestrator.py:259`

Uses `git reset --hard HEAD` which discards ALL uncommitted changes.

**Action Required**:
- [ ] Confirm this is acceptable behavior
- [ ] Consider safer alternative: stash changes instead

**Risk**: High - Destructive operation, could lose work if run accidentally

---

## Integration Points Status

| Integration | Status | Notes |
|-------------|--------|-------|
| Opus audit via `/ralph-loop` | ✅ Ready | Uses `prompt_claude_code()` |
| Gemini implementation | ✅ Ready | Uses `model="sonnet"` (maps to Gemini Flash) |
| Playwright MCP sessions | ⚠️ Needs Testing | Session parameter passing unverified |
| Dev server lifecycle | ✅ Ready | `DevServerManager` integrated |
| Git operations | ⚠️ Needs Review | `git reset --hard` is destructive |
| Slack notifications | ✅ Ready | Uses existing webhook integration |

---

## Success Criteria

### Minimum Viable Testing
1. ✅ All files created and syntactically valid
2. ⬜ Opus audit generates properly formatted plan
3. ⬜ Orchestrator successfully parses plan file
4. ⬜ Gemini implements at least one chunk
5. ⬜ Visual regression check returns valid JSON
6. ⬜ Git commit occurs on PASS
7. ⬜ Git reset occurs on FAIL

---

## Next Actions (Prioritized)

### Immediate (Today)
1. **Commit untracked files** to tac2 branch
   ```bash
   git add adws/adw_code_audit.py
   git add adws/adw_code_implement_orchestrator.py
   git add adws/adw_modules/visual_regression.py
   git add adws/prompts/code_audit_opus.txt
   git add adws/prompts/visual_check_gemini.txt
   git commit -m "feat(adw): Add code refactoring workflow with visual regression testing"
   ```

2. **Test Phase 1**: Run Opus audit on small directory
   - Target: `app/src/logic/rules` (small, non-critical)
   - Review generated plan format

### Short-term (This Week)
3. **Test Phase 2**: Run orchestrator with generated plan
4. **Test Phase 3**: Validate visual regression check on single page
5. **Investigate MCP session parameter passing** in agent.py

---

## Files Pending Commit

All files below are untracked and ready to commit:

```
?? adws/adw_code_audit.py
?? adws/adw_code_implement_orchestrator.py
?? adws/adw_modules/visual_regression.py
?? adws/prompts/code_audit_opus.txt
?? adws/prompts/visual_check_gemini.txt
```

**Branch**: tac2
**Commit Message**: `feat(adw): Add code refactoring workflow with visual regression testing`

---

**Last Updated**: 2026-01-14 12:00:00
**Status**: IMPLEMENTATION COMPLETE, TESTING PENDING
