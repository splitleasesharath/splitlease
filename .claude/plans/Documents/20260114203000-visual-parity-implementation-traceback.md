# Visual Parity Check Implementation Traceback

**Created**: 2026-01-14 20:30:00
**Branch**: tac2  
**Analysis Period**: 2026-01-14 (Past 24 hours)

---

## Executive Summary

Evolution from **ADW Claude Browser** (chrome flag) to **Playwright MCP concurrent approach** (Gemini + MCP tools).

Key findings:
- **Missing npm scripts**: `dev:test:restart`, `dev:test:stop`, `dev:test` never added to app/package.json
- **Model switch**: Now using `gemini-3-flash-preview` for visual checks
- **Port standardization**: Moved from 8000 to hardcoded 8010

---

## Timeline

### Phase 1: Initial Implementation (d710ad1e)
**Date**: 2026-01-14 10:56 AM

Created:
- `adws/adw_modules/page_classifier.py` (262 lines) - Auth matrix
- `adws/adw_parity_check.py` (38 lines) - STUB ONLY
- Prompts for public/protected page checks

Architecture: Python + Gemini CLI + Playwright MCP

---

### Phase 2: Port 8010 Hardcoding (d6a61260, d86ec147)  
**Date**: 2026-01-14 05:02 AM

dev_server.py refactored:
- FROM: 391 lines (psutil, platform-specific)
- TO: 115 lines (delegates to npm scripts)
- Single function: `restart_dev_server_on_port_8010()`
- Calls: `bun run dev:test:restart`

**CRITICAL ISSUE**: These npm scripts were NEVER ADDED to app/package.json:
```json
"dev:test": "vite --port 8010 --strictPort",
"dev:test:stop": "node scripts/kill-port.js 8010",
"dev:test:restart": "bun run dev:test:stop && bun run dev:test"
```

---

### Phase 3: Visual Regression Workflow (3b7c9cd3)
**Date**: 2026-01-14 15:44 PM

New files:
- `adw_code_audit.py` (130 lines) - Opus audits codebase
- `adw_code_implement_orchestrator.py` (309 lines) - Main orchestrator
- `adw_modules/visual_regression.py` (105 lines) - Playwright MCP checker
- `prompts/visual_check_gemini.txt` (24 lines) - Gemini prompt

Workflow:
1. Opus audits directory
2. Gemini implements refactors (grouped by page)
3. Visual regression validates LIVE vs DEV
4. Git commit if PASS, reset if FAIL

---

### Phase 4: Gemini 3 Flash Preview Switch (3b7c9cd3)

agent.py updated:
```python
GEMINI_BASE_MODEL = "gemini-3-flash-preview"
GEMINI_HEAVY_MODEL = "gemini-3-flash-preview"
```

When `model="sonnet"` passed to AgentPromptRequest:
- Maps to GEMINI_BASE_MODEL
- Invokes: `gemini --model gemini-3-flash-preview ...`

---

## Architecture Comparison

### OLD: ADW Claude Browser
```
claude --chrome --print <prompt>
  ├─ Single Chrome tab
  ├─ Sequential: LIVE → DEV
  └─ Port 8000
```

### NEW: Playwright MCP
```
gemini --model gemini-3-flash-preview \
       --allowed-mcp-server-names playwright-host \
       --print <prompt>
  
Gemini uses MCP tools:
  • browser_navigate (LIVE: splitlease.com)
  • browser_take_screenshot (LIVE)
  • browser_navigate (DEV: localhost:8010)
  • browser_take_screenshot (DEV)
  • Compares, returns JSON
```

**Advantages**:
- Concurrent LIVE + DEV sessions
- Port 8010 (consistent)
- MCP session isolation (playwright-host vs playwright-guest)
- Gemini 3 Flash (faster, cheaper)

---

## Critical Missing Pieces

### 1. npm Scripts (app/package.json)
❌ **MISSING**:
```json
"dev:test": "vite --port 8010 --strictPort",
"dev:test:stop": "node scripts/kill-port.js 8010",  
"dev:test:restart": "bun run dev:test:stop && bun run dev:test"
```

Current app/package.json only has:
```json
"dev": "vite --port 8000"
```

### 2. kill-port.js Script
❌ **MISSING**: `app/scripts/kill-port.js`

### 3. adw_parity_check.py
⚠️ **INCOMPLETE**: Only 38-line stub

---

## MCP Session Implementation

### agent.py Flag Handling

**Gemini**:
```python
if mcp_session:
    cmd.extend(["--allowed-mcp-server-names", mcp_session])
```

**Claude**:
```python
if mcp_session:
    cmd.extend(["--mcp-session", mcp_session])
```

### visual_regression.py Usage
```python
def check_visual_parity(
    page_path: str,
    mcp_session: Optional[str] = None,  # "playwright-host"
    auth_type: str = "public",
    port: int = 8010
) -> Dict[str, Any]:
```

Examples:
```python
# Public page
check_visual_parity("/search", mcp_session=None, auth_type="public")

# HOST protected page  
check_visual_parity("/listing-dashboard", mcp_session="playwright-host", auth_type="host")
```

---

## Testing Status

- [x] **Phase 1**: Opus audit generation COMPLETE
- [ ] **Phase 2**: Orchestrator parsing NOT TESTED
- [ ] **Phase 3**: Visual regression NOT TESTED (missing npm scripts)
- [ ] **Phase 4**: End-to-end NOT TESTED (blocked)

---

## Action Items (Priority Order)

### CRITICAL
1. Add npm scripts to app/package.json
2. Create app/scripts/kill-port.js

### HIGH  
3. Test `bun run dev:test:restart` on port 8010
4. Test visual_regression module

### MEDIUM
5. Complete adw_parity_check.py or deprecate
6. Run end-to-end workflow test

---

## Related Files

- `.claude/plans/Done/20260114153000_port_8010_hardcoded_cleanup_plan.md`
- `.claude/plans/Documents/20260114120000-code-refactor-visual-regression-pending.md`
- `.claude/plans/New/20260114152244_code_refactor_plan.md`
- `adws/README_CODE_REFACTOR_WORKFLOW.md`

---

## Conclusion

**Evolution Complete**:
1. FROM: Single Chrome (`claude --chrome`) → TO: Concurrent Playwright MCP
2. FROM: Port 8000 (dynamic) → TO: Port 8010 (hardcoded)
3. FROM: Claude → TO: Gemini 3 Flash Preview

**Critical Blocker**: Missing npm scripts in app/package.json

**Next Step**: Add missing scripts, validate workflow

---

**Last Updated**: 2026-01-14 20:30:00  
**Branch**: tac2  
**Commit**: 3b7c9cd3
