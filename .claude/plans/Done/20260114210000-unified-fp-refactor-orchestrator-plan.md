# Unified FP Refactor Orchestrator - Comprehensive Implementation Plan

**Created**: 2026-01-14 21:00:00
**Branch**: tac2
**Goal**: Consolidate all FP refactoring workflows into a unified orchestrator with audit → implement → visual parity checking

---

## Executive Summary

This plan consolidates:
- `adw_code_audit.py` (Claude Opus audit → Changed to Gemini Flash based on current implementation)
- `adw_code_implement_orchestrator.py` (Gemini 3 Flash implementation)
- `adw_modules/visual_regression.py` (Playwright MCP visual checking)
- `adw_modules/dev_server.py` (Port 8010 management)
- `adw_modules/page_classifier.py` (Auth/MCP session mapping)

Into a **single unified orchestrator** that:
1. Audits codebase directory (Claude Opus for audit, Gemini Flash for implementation)
2. Implements changes chunk-by-chunk grouped by page (Gemini 3 Flash)
3. Runs concurrent visual parity checks (2 Playwright MCP sessions)
4. Commits on PASS, discards on FAIL
5. Moves to next page group either way

---

## Current State Analysis

### Existing Components

#### ✅ Working Scripts

| Script | Purpose | Model | Status |
|--------|---------|-------|--------|
| `adw_code_audit.py` | Generates chunk-based plan grouped by page | Gemini Flash | ✅ Working |
| `adw_code_implement_orchestrator.py` | Implements chunks + visual checks | Gemini Flash | ✅ Working |
| `adw_modules/visual_regression.py` | Playwright MCP visual checker | Gemini Flash | ✅ Working |
| `adw_modules/dev_server.py` | Port 8010 dev server manager | N/A | ✅ Working |
| `adw_modules/page_classifier.py` | Auth/MCP session mapper | N/A | ✅ Working |
| `adw_modules/agent.py` | Model routing (Opus/Gemini) | N/A | ✅ Working |

#### ⚠️ Missing Dependencies

| Dependency | Location | Status | Action Required |
|------------|----------|--------|-----------------|
| npm scripts | `app/package.json` | ❌ Missing | Add `dev:test`, `dev:test:stop`, `dev:test:restart` |
| kill-port.js | `app/scripts/kill-port.js` | ❌ Missing | Create Node.js script to kill process on port 8010 |

#### 🔄 Model Selection Flow

**Current implementation in `agent.py`:**

```python
# Line 32-33
GEMINI_BASE_MODEL = "gemini-3-flash-preview"
GEMINI_HEAVY_MODEL = "gemini-3-flash-preview"

# Line 49
"/implement": {"base": "sonnet", "heavy": "opus"}

# When model="sonnet" and provider="gemini":
#   - Maps to GEMINI_BASE_MODEL = "gemini-3-flash-preview"
```

**For this orchestrator:**
- Audit: Use **Claude Opus** explicitly via `model="opus"` and `provider="claude"`
- Implement: Use **Gemini 3 Flash** via `model="sonnet"` (maps to gemini-3-flash-preview)
- Visual Check: Use **Gemini 3 Flash** via `model="sonnet"` (maps to gemini-3-flash-preview)

---

## Architecture Design

### Three-Pronged Approach

```
┌────────────────────────────────────────────────────────────────┐
│                   UNIFIED FP REFACTOR ORCHESTRATOR              │
└────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │  AUDIT  │          │IMPLEMENT│          │ REVIEW  │
   │  (Opus) │          │ (Gemini)│          │(Gemini) │
   └─────────┘          └─────────┘          └─────────┘
        │                     │                     │
        │                     │                     │
        ▼                     ▼                     ▼
  Generate Plan      Page-by-Page       Concurrent Visual
  Grouped by       Implementation      Parity Checking
     Pages           + Commits           (2 MCP sessions)
```

### Workflow Steps

```
1. AUDIT PHASE (Claude Opus)
   └─→ Run adw_code_audit.py (modified to use Opus)
       ├─→ Scan target directory
       ├─→ Identify issues/violations
       ├─→ Trace affected pages
       └─→ Generate plan: .claude/plans/New/<timestamp>_code_refactor_plan.md
           Format: PAGE GROUP sections with chunks

2. FOR EACH PAGE GROUP:

   A. IMPLEMENT PHASE (Gemini 3 Flash)
      └─→ For each chunk in page group:
          ├─→ Gemini implements exact refactoring
          └─→ No commit yet (accumulate changes)

   B. DEV SERVER RESTART
      └─→ bun run dev:test:restart (port 8010)

   C. REVIEW PHASE (Gemini 3 Flash + Playwright MCP)
      └─→ Visual parity check:
          ├─→ Determine MCP session (playwright-host or playwright-guest)
          ├─→ CONCURRENT URL construction:
          │   ├─→ LIVE: https://splitlease.com{page_path}
          │   └─→ DEV: http://localhost:8010{page_path}
          ├─→ Navigate LIVE, screenshot
          ├─→ Navigate DEV, screenshot
          └─→ Compare and return: {"visualParity": "PASS"|"FAIL", "issues": [...]}

   D. DECISION:
      ├─→ PASS:
      │   ├─→ git add .
      │   ├─→ git commit -m "refactor({page}): Chunks N,M,O"
      │   └─→ Move to next page group
      │
      └─→ FAIL:
          ├─→ git reset --hard HEAD
          └─→ Move to next page group (don't block pipeline)

3. COMPLETION
   └─→ Summary: N pages passed, M pages failed
```

---

## File Structure

### New Unified Orchestrator

```
adws/
├── adw_unified_fp_orchestrator.py  ← NEW: Main orchestrator
│   └── Orchestrates: audit → implement → review pipeline
│
├── adw_code_audit.py               ← UPDATE: Use Opus for audit
├── adw_code_implement_orchestrator.py  ← DEPRECATE: Logic moves to unified
│
├── adw_modules/
│   ├── agent.py                    ← KEEP: Model routing
│   ├── dev_server.py               ← KEEP: Port 8010 management
│   ├── visual_regression.py        ← KEEP: Playwright MCP checks
│   ├── page_classifier.py          ← KEEP: Auth/MCP mapping
│   └── chunk_parser.py             ← NEW: Extract logic from orchestrator
│
├── prompts/
│   ├── code_audit_opus.txt         ← UPDATE: Ensure Opus-specific
│   └── visual_check_gemini.txt     ← KEEP: Gemini visual prompt
│
└── README_UNIFIED_FP_ORCHESTRATOR.md  ← NEW: Documentation
```

---

## Implementation Details

### Phase 1: Prerequisites (CRITICAL)

#### 1.1 Add npm Scripts to app/package.json

**File**: `app/package.json`

```json
{
  "scripts": {
    "dev": "vite --port 8000",
    "dev:test": "vite --port 8010 --strictPort",
    "dev:test:stop": "node scripts/kill-port.js 8010",
    "dev:test:restart": "bun run dev:test:stop && bun run dev:test"
  }
}
```

#### 1.2 Create kill-port.js Script

**File**: `app/scripts/kill-port.js`

```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');

const port = process.argv[2];
if (!port) {
  console.error('Usage: node kill-port.js <port>');
  process.exit(1);
}

try {
  if (process.platform === 'win32') {
    // Windows: Find and kill process using port
    const cmd = `netstat -ano | findstr :${port}`;
    const result = execSync(cmd, { encoding: 'utf8' });
    const lines = result.split('\n');

    const pids = new Set();
    lines.forEach(line => {
      const match = line.match(/LISTENING\s+(\d+)/);
      if (match) pids.add(match[1]);
    });

    pids.forEach(pid => {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`Killed process ${pid} on port ${port}`);
      } catch (e) {
        // Process might have already exited
      }
    });
  } else {
    // Unix: Use lsof
    const cmd = `lsof -ti:${port}`;
    const result = execSync(cmd, { encoding: 'utf8' });
    const pids = result.trim().split('\n').filter(Boolean);

    pids.forEach(pid => {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
      console.log(`Killed process ${pid} on port ${port}`);
    });
  }

  console.log(`Port ${port} is now free`);
} catch (e) {
  // Port might already be free
  console.log(`No process found on port ${port}`);
}
```

Make executable (Unix):
```bash
chmod +x app/scripts/kill-port.js
```

---

### Phase 2: Extract Chunk Parser Module

**File**: `adws/adw_modules/chunk_parser.py`

Extract the chunk parsing logic from `adw_code_implement_orchestrator.py` into a reusable module.

---

### Phase 3: Update Code Audit to Use Opus

**File**: `adws/adw_code_audit.py`

Change line 71-72 from:
```python
model="gemini-3-flash-preview",
```

To:
```python
model="opus",
```

This ensures the audit phase uses Claude Opus for comprehensive analysis.

---

### Phase 4: Create Unified Orchestrator

**File**: `adws/adw_unified_fp_orchestrator.py`

Main orchestrator script that:
1. Calls `run_code_audit_and_plan()` from `adw_code_audit.py` (Opus)
2. Parses plan using `chunk_parser.py`
3. For each page group:
   - Implements chunks (Gemini Flash)
   - Restarts dev server
   - Runs visual check (Gemini Flash + Playwright MCP)
   - Commits or resets based on result

---

### Phase 5: Mark Deprecated Files

Rename files that are superseded:

```bash
# In adws/
mv adw_code_implement_orchestrator.py z-adw_code_implement_orchestrator.py
mv adw_parity_check.py z-adw_parity_check.py
mv adw_fp_audit_browser_implement_orchestrator.py z-adw_fp_audit_browser_implement_orchestrator.py
```

---

### Phase 6: Create Documentation

**File**: `adws/README_UNIFIED_FP_ORCHESTRATOR.md`

Comprehensive documentation covering:
- Prerequisites
- Usage
- Workflow details
- Model usage
- Authentication mapping
- Troubleshooting
- Migration guide

---

## Testing Plan

### Test 1: Prerequisites Validation

```bash
# 1. Check npm scripts
cd app && cat package.json | grep -A 2 "dev:test"

# 2. Test kill-port.js
node app/scripts/kill-port.js 8010

# 3. Test dev server restart
cd app && bun run dev:test:restart
# Should start server on port 8010
# Ctrl+C to stop
```

### Test 2: Dry Run (Single Page Group)

```bash
# Limit to 1 page group for testing
uv run adw_unified_fp_orchestrator.py app/src/logic --limit 1

# Expected output:
# 1. Audit completes (Opus generates plan)
# 2. Parses 1 page group from plan
# 3. Implements chunks for that page (Gemini)
# 4. Starts dev server on 8010
# 5. Visual check runs (Gemini + Playwright MCP)
# 6. Commits if PASS, resets if FAIL
# 7. Summary shows: 1 passed or 1 failed
```

### Test 3: Full Run

```bash
# Process all page groups
uv run adw_unified_fp_orchestrator.py app/src/logic

# Monitor in separate terminal:
watch -n 2 'git log --oneline -10'
# Should see commits appearing for each passed page group
```

---

## Rollout Strategy

### Step 1: Add Prerequisites ✅ MUST DO FIRST

- Add npm scripts to app/package.json
- Create app/scripts/kill-port.js
- Test both work

### Step 2: Create New Modules

- Create chunk_parser.py
- Update adw_code_audit.py to use Opus
- Create unified orchestrator
- Test parsing logic independently

### Step 3: Validate Components

Test each component in isolation before running end-to-end.

### Step 4: End-to-End Test

Run full orchestrator with `--limit 1` to verify all phases work.

### Step 5: Production Run

Run full orchestrator on target directory.

---

## Success Criteria

- [ ] Prerequisites added (npm scripts, kill-port.js)
- [ ] Chunk parser extracts page groups correctly
- [ ] Audit phase uses Claude Opus
- [ ] Implementation phase uses Gemini Flash
- [ ] Visual regression uses Gemini Flash + Playwright MCP
- [ ] Concurrent URL construction works (LIVE + DEV)
- [ ] Dev server starts on port 8010
- [ ] MCP session selection works (host/guest/public)
- [ ] Commits created for passed page groups
- [ ] Resets happen for failed page groups
- [ ] Pipeline continues after failures
- [ ] Slack notifications sent
- [ ] Statistics reported at end
- [ ] Documentation complete

---

## Related Files

### Key Scripts
- `adws/adw_unified_fp_orchestrator.py` (NEW)
- `adws/adw_code_audit.py` (UPDATE - use Opus)
- `adws/adw_modules/chunk_parser.py` (NEW)
- `adws/adw_modules/visual_regression.py` (KEEP)
- `adws/adw_modules/dev_server.py` (KEEP)
- `adws/adw_modules/page_classifier.py` (KEEP)
- `adws/adw_modules/agent.py` (KEEP)

### npm Scripts
- `app/package.json` (UPDATE)
- `app/scripts/kill-port.js` (CREATE)

### Deprecated Scripts
- `adws/z-adw_code_implement_orchestrator.py`
- `adws/z-adw_parity_check.py`
- `adws/z-adw_fp_audit_browser_implement_orchestrator.py`

### Documentation
- `.claude/plans/Documents/20260114203000-visual-parity-implementation-traceback.md`
- `adws/README_UNIFIED_FP_ORCHESTRATOR.md` (CREATE)
- `adws/README_FP_ORCHESTRATOR.md` (EXISTING)
- `adws/README_FP_WORKFLOWS.md` (EXISTING)
- `adws/README_CODE_REFACTOR_WORKFLOW.md` (EXISTING)

---

**END OF PLAN**
