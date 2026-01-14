# Unified FP Refactor Orchestrator

**Complete end-to-end pipeline for functional programming refactoring with automated visual regression testing.**

## Overview

The Unified FP Refactor Orchestrator consolidates three separate workflows into a single, streamlined pipeline:

```
┌────────────────────────────────────────────────────────────┐
│         UNIFIED FP REFACTOR ORCHESTRATOR                   │
└────────────────────────────────────────────────────────────┘
                         │
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
  ┌─────────┐      ┌──────────┐     ┌──────────┐
  │  AUDIT  │      │IMPLEMENT │     │  REVIEW  │
  │ (Opus)  │      │ (Gemini) │     │(Gemini+  │
  │         │      │          │     │Playwright)│
  └─────────┘      └──────────┘     └──────────┘
       │                 │                 │
       ▼                 ▼                 ▼
  Generate Plan    Page-by-Page      Visual Parity
  Grouped by      Implementation     Checking with
    Pages          + Auto-Commit      MCP Sessions
```

### What It Does

1. **AUDIT PHASE (Claude Opus)**
   - Scans target directory for FP violations
   - Traces affected pages
   - Generates chunk-based refactoring plan grouped by page

2. **IMPLEMENTATION PHASE (Gemini Flash)**
   - Implements chunks page-by-page
   - Groups related changes together
   - Accumulates changes before testing

3. **REVIEW PHASE (Gemini Flash + Playwright MCP)**
   - Starts dev server on port 8010
   - Captures LIVE (split.lease) vs DEV (localhost:8010) screenshots
   - Uses appropriate MCP session (host/guest/public) based on page auth
   - Compares visual parity

4. **DECISION**
   - **PASS**: `git commit` with detailed message
   - **FAIL**: `git reset --hard`, skip to next page
   - Continues processing remaining pages regardless of failures

---

## Prerequisites

### 1. Install Dependencies

```bash
# Ensure uv is installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Python dependencies (handled by uv)
# No manual installation needed - dependencies are declared in script headers
```

### 2. Setup npm Scripts (REQUIRED)

The orchestrator requires npm scripts to manage the dev server on port 8010.

**Location**: `app/package.json`

Add these scripts:

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

### 3. Create kill-port.js (REQUIRED)

**Location**: `app/scripts/kill-port.js`

This script forcefully kills processes on a given port (Windows/Unix compatible).

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
    // Windows implementation
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
    // Unix implementation
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
  console.log(`No process found on port ${port}`);
}
```

Make it executable (Unix):

```bash
chmod +x app/scripts/kill-port.js
```

### 4. Verify Setup

```bash
# Test kill-port.js
cd app && node scripts/kill-port.js 8010

# Test dev:test:restart
cd app && bun run dev:test:restart
# Should start Vite on port 8010
# Press Ctrl+C to stop
```

---

## Usage

### Full Orchestration

```bash
# Process all page groups in a directory
uv run adw_unified_fp_orchestrator.py <target_path>

# Example: Audit and refactor app/src/logic
uv run adw_unified_fp_orchestrator.py app/src/logic
```

### Limited Testing (Recommended for First Run)

```bash
# Process only 1 page group
uv run adw_unified_fp_orchestrator.py app/src/logic --limit 1

# Process first 3 page groups
uv run adw_unified_fp_orchestrator.py app/src/logic --limit 3
```

### Specify Audit Type

```bash
# General audit (default)
uv run adw_unified_fp_orchestrator.py app/src/logic --audit-type general

# Performance-focused audit
uv run adw_unified_fp_orchestrator.py app/src/logic --audit-type performance

# Security-focused audit
uv run adw_unified_fp_orchestrator.py app/src/logic --audit-type security
```

---

## Testing Individual Components

The `test_orchestrator.py` script allows you to test each component independently:

### Test Code Audit (Claude Opus)

```bash
python test_orchestrator.py audit app/src/logic
```

**What it does:**
- Runs Claude Opus audit
- Generates plan file in `.claude/plans/New/`
- Does NOT implement changes

**Output:** Plan file path

---

### Test Chunk Parser

```bash
python test_orchestrator.py chunks .claude/plans/New/20260114210000_code_refactor_plan.md
```

**What it does:**
- Parses plan file
- Extracts page groups
- Shows chunk breakdown

**Output:** Summary of page groups and chunks

---

### Test Implementation (Gemini Flash)

```bash
# Test implementing all chunks from first page group
python test_orchestrator.py implement .claude/plans/New/20260114210000_code_refactor_plan.md

# Test implementing specific chunk only
python test_orchestrator.py implement .claude/plans/New/20260114210000_code_refactor_plan.md 3
```

**What it does:**
- Reads plan file
- Implements specified chunks using Gemini
- **MODIFIES CODE** (asks for confirmation)
- Does NOT commit

**Output:** Success/failure status

⚠️ **WARNING**: This modifies your code! Use `git stash` or work on a clean branch.

---

### Test Visual Regression

```bash
# Test public page (no auth)
python test_orchestrator.py visual /listing

# Test host-authenticated page
python test_orchestrator.py visual /host/listings

# Test guest-authenticated page
python test_orchestrator.py visual /guest/dashboard
```

**What it does:**
- Starts dev server on port 8010
- Determines appropriate MCP session
- Captures LIVE vs DEV screenshots
- Compares visual parity

**Output:** PASS/FAIL verdict with explanation

---

### Test Dev Server Management

```bash
python test_orchestrator.py dev-server
```

**What it does:**
- Starts dev server on port 8010
- Waits 5 seconds
- Stops dev server
- Verifies cleanup

**Output:** Server status and port info

---

### Test Full Pipeline (Dry Run)

```bash
python test_orchestrator.py full app/src/logic
```

**What it does:**
- Runs full orchestrator with `--limit 1`
- Audits → Implements → Tests → Commits/Resets

**Output:** Complete pipeline execution

---

## Workflow Details

### Phase 1: Code Audit

**Model**: Claude Opus
**Purpose**: Comprehensive analysis and planning

```bash
# Automatically called by orchestrator
# Can also run standalone:
uv run adw_code_audit.py app/src/logic
```

**Outputs**:
- Plan file: `.claude/plans/New/<timestamp>_code_refactor_plan.md`
- Chunks grouped by affected page
- Each chunk includes current code, refactored code, and metadata

---

### Phase 2: Plan Parsing

**Module**: `adw_modules/chunk_parser.py`
**Purpose**: Extract page groups and chunks from plan

**Format**:
```markdown
## PAGE GROUP: /listing (Chunks: 1, 2, 3)

### CHUNK 1: Refactor calculatePrice function
**File:** app/src/logic/calculators/pricing/calculatePrice.js
**Lines:** 42-68
**Affected Pages:** /listing, /host/listings

**Current Code:**
```javascript
function calculatePrice(params) { ... }
```

**Refactored Code:**
```javascript
export const calculatePrice = (params) => { ... }
```
```

---

### Phase 3: Implementation

**Model**: Gemini 3 Flash
**Purpose**: Fast, accurate code changes

For each page group:
1. Gemini implements all chunks for that page
2. Changes accumulate (not committed yet)
3. File writes happen sequentially
4. No git operations until visual check

---

### Phase 4: Visual Regression

**Model**: Gemini 3 Flash + Playwright MCP
**Purpose**: Ensure visual parity between LIVE and refactored code

**Process**:

1. **Start Dev Server**
   ```bash
   bun run dev:test:restart
   # Kills port 8010, starts Vite
   ```

2. **Determine MCP Session**

   | Page Type | MCP Session | Auth |
   |-----------|-------------|------|
   | Host pages (`/host/*`) | `playwright-host` | Protected |
   | Guest pages (`/guest/*`) | `playwright-guest` | Protected |
   | Shared protected | `playwright-host` | Protected |
   | Public pages | `null` (default MCP) | Public |

3. **Concurrent URL Construction**
   - LIVE: `https://split.lease{page_path}`
   - DEV: `http://localhost:8010{page_path}`

4. **Playwright Actions**
   ```
   1. Navigate to LIVE URL
   2. Wait for page load
   3. Screenshot LIVE
   4. Navigate to DEV URL
   5. Wait for page load
   6. Screenshot DEV
   7. Compare screenshots
   ```

5. **Gemini Analysis**
   - Compares screenshots side-by-side
   - Identifies visual differences
   - Returns: `{"visualParity": "PASS"|"FAIL", "issues": [...]}`

---

### Phase 5: Decision & Commit

**PASS**:
```bash
git add .
git commit -m "refactor(/listing): Implement chunks 1, 2, 3

Visual parity verified: All elements match, layout consistent."
```

**FAIL**:
```bash
git reset --hard HEAD
# Discard all changes for this page group
# Continue to next page group
```

**Slack Notifications**:
- Success: Green notification with page path and chunk IDs
- Failure: Red notification with issues list

---

## Model Usage

| Phase | Model | Provider | Rationale |
|-------|-------|----------|-----------|
| Audit | Claude Opus | Anthropic | Comprehensive analysis, better at identifying subtle issues |
| Implementation | Gemini 3 Flash | Google | Fast execution, accurate code transformation |
| Visual Check | Gemini 3 Flash | Google | Fast screenshot analysis, good at visual comparison |

### Model Selection in Code

```python
# Audit (adw_code_audit.py)
model="opus"  # Explicitly Claude Opus

# Implementation (adw_unified_fp_orchestrator.py)
model="sonnet"  # Maps to gemini-3-flash-preview via agent.py

# Visual Check (adw_modules/visual_regression.py)
model="sonnet"  # Maps to gemini-3-flash-preview via agent.py
```

---

## Authentication Mapping

The orchestrator automatically determines the correct MCP session and authentication type based on the page path.

### Page Classification

**File**: `adw_modules/page_classifier.py`

```python
HOST_PAGES = [
    "/host/dashboard",
    "/host/listings",
    "/host/proposals",
    # ... more host pages
]

GUEST_PAGES = [
    "/guest/dashboard",
    "/guest/proposals",
    "/guest/bookings",
    # ... more guest pages
]

SHARED_PROTECTED_PAGES = [
    "/messages",
    "/profile",
    # ... shared pages requiring auth
]
```

### MCP Session Selection Logic

```python
def get_mcp_session_for_page(page_path: str) -> Optional[str]:
    if page_path in HOST_PAGES:
        return "playwright-host"  # Host-authenticated browser
    if page_path in GUEST_PAGES:
        return "playwright-guest"  # Guest-authenticated browser
    if page_path in SHARED_PROTECTED_PAGES:
        return "playwright-host"  # Default to host for shared protected
    return None  # Public page, use default MCP
```

### Pre-Authenticated Sessions

The MCP sessions (`playwright-host`, `playwright-guest`) are pre-configured with:
- Cookies
- Local storage tokens
- Session state

This allows the orchestrator to access protected pages without manual login.

---

## File Structure

```
adws/
├── adw_unified_fp_orchestrator.py  ← Main orchestrator
├── adw_code_audit.py               ← Audit script (updated to use Opus)
├── test_orchestrator.py            ← Component tester
│
├── adw_modules/
│   ├── agent.py                    ← Model routing
│   ├── chunk_parser.py             ← NEW: Plan parsing
│   ├── dev_server.py               ← Dev server management
│   ├── visual_regression.py        ← Playwright MCP visual checks
│   ├── page_classifier.py          ← Auth/MCP mapping
│   ├── run_logger.py               ← Run logging
│   └── webhook.py                  ← Slack notifications
│
├── prompts/
│   └── code_audit_opus.txt         ← Opus audit prompt template
│
├── ZEP/                            ← Deprecated files
│   ├── adw_code_implement_orchestrator.py
│   ├── adw_fp_audit_browser_implement_orchestrator.py
│   └── adw_parity_check.py
│
└── README_UNIFIED_FP_ORCHESTRATOR.md  ← This file
```

---

## Troubleshooting

### Port 8010 Already in Use

```bash
# Manually kill process
cd app && bun run dev:test:stop

# Or use kill-port.js directly
node app/scripts/kill-port.js 8010
```

### Dev Server Fails to Start

**Check**:
```bash
# Verify npm scripts exist
cat app/package.json | grep -A 3 "dev:test"

# Verify kill-port.js exists
ls -la app/scripts/kill-port.js

# Test kill-port.js
node app/scripts/kill-port.js 8010
```

### Visual Check Always Fails

**Possible causes**:
1. **Authentication issue**: Check MCP session mapping in `page_classifier.py`
2. **Page not loading**: Check dev server logs
3. **Timing issue**: Page might need more time to render (increase wait time in `visual_regression.py`)

**Debug**:
```bash
# Test visual check independently
python test_orchestrator.py visual /listing

# Check dev server
python test_orchestrator.py dev-server
```

### Implementation Fails

**Possible causes**:
1. **File not found**: Chunk references wrong file path
2. **Code mismatch**: Current code doesn't match plan
3. **Syntax error**: Refactored code has issues

**Debug**:
```bash
# Test implementation on single chunk
python test_orchestrator.py implement <plan_file> 1

# Check plan file format
python test_orchestrator.py chunks <plan_file>
```

### Audit Produces No Plan

**Possible causes**:
1. **No issues found**: Directory is already compliant
2. **Opus quota exceeded**: Check API limits
3. **Target path invalid**: Verify directory exists

**Debug**:
```bash
# Run audit standalone
uv run adw_code_audit.py app/src/logic

# Check for plan file
ls -la .claude/plans/New/
```

---

## Example Commands

### Quick Start (Recommended)

```bash
# 1. Process single page group for testing
uv run adw_unified_fp_orchestrator.py app/src/logic --limit 1

# 2. If successful, process more
uv run adw_unified_fp_orchestrator.py app/src/logic --limit 5

# 3. Full run (all pages)
uv run adw_unified_fp_orchestrator.py app/src/logic
```

### Testing Workflow

```bash
# 1. Test audit only
python test_orchestrator.py audit app/src/logic

# 2. Test parsing the generated plan
python test_orchestrator.py chunks .claude/plans/New/<timestamp>_code_refactor_plan.md

# 3. Test visual check on a known page
python test_orchestrator.py visual /listing

# 4. Test full pipeline with limit
python test_orchestrator.py full app/src/logic
```

### Monitoring

```bash
# Watch git commits in real-time (separate terminal)
watch -n 2 'git log --oneline -10'

# Monitor port 8010 (separate terminal)
watch -n 2 'netstat -ano | findstr :8010'  # Windows
watch -n 2 'lsof -i :8010'                # Unix
```

---

## Migration from Old Scripts

If you were using the old scripts, here's the mapping:

| Old Script | New Component | Test Command |
|------------|---------------|--------------|
| `adw_code_audit.py` | Unchanged (updated to Opus) | `python test_orchestrator.py audit <path>` |
| `adw_code_implement_orchestrator.py` | Merged into unified | `python test_orchestrator.py full <path>` |
| `adw_fp_audit_browser_implement_orchestrator.py` | Deprecated (ZEP/) | Use unified orchestrator |
| `adw_parity_check.py` | Merged into unified | `python test_orchestrator.py visual <page>` |

**Old workflow**:
```bash
# Step 1
uv run adw_code_audit.py app/src/logic

# Step 2
uv run adw_code_implement_orchestrator.py .claude/plans/New/<plan>.md
```

**New workflow** (single command):
```bash
uv run adw_unified_fp_orchestrator.py app/src/logic
```

---

## Success Criteria

After running the orchestrator, you should see:

✅ **Audit Phase**:
- Plan file created in `.claude/plans/New/`
- Page groups identified
- Chunks extracted

✅ **Implementation Phase**:
- Chunks implemented per page
- Code changes applied
- No syntax errors

✅ **Review Phase**:
- Dev server starts on port 8010
- MCP sessions determined correctly
- Screenshots captured
- Visual parity checked

✅ **Commit Phase**:
- PASS: Git commits created with detailed messages
- FAIL: Changes reverted cleanly
- Slack notifications sent

✅ **Summary**:
- Statistics reported (passed/failed/total)
- All page groups processed
- No leftover dev server processes

---

## Advanced Usage

### Custom Audit Prompts

Edit `adws/prompts/code_audit_opus.txt` to customize audit behavior:

```
You are auditing {target_path} for functional programming violations.

Focus on:
- Impure functions
- Mutable data structures
- Side effects
- ... your custom criteria ...

Group chunks by affected page.
```

### Custom Visual Check Prompts

Edit `adws/adw_modules/visual_regression.py` to adjust comparison logic:

```python
prompt = f"""Compare these screenshots:
1. LIVE: production version
2. DEV: refactored version

Focus on:
- Layout shifts
- Missing elements
- Color changes
- ... your custom criteria ...
"""
```

### Parallel Page Processing (Future)

The current orchestrator processes pages sequentially. For parallel processing:

1. Modify `adw_unified_fp_orchestrator.py` to use `concurrent.futures`
2. Start multiple dev servers on different ports
3. Use separate MCP sessions per worker

---

## Support

- **Issues**: File in GitHub repo
- **Questions**: Check existing documentation in `.claude/plans/Documents/`
- **Slack**: Automated notifications sent to configured webhook

---

**Last Updated**: 2026-01-14
**Version**: 1.0.0
**Author**: ADW Orchestrator Team
