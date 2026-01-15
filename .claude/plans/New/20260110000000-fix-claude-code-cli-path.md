# Fix Claude Code CLI Path Configuration

**Created**: 2026-01-10
**Type**: DEBUG
**Priority**: HIGH
**Status**: Ready for Execution

---

## Problem Statement

The ADW Claude Browser workflow (`adw_claude_browser.py`) is failing with:

```
Error: Claude Code CLI is not installed. Expected at: C:\Users\igor\AppData\Roaming\npm\claude.cmd
```

The `.env` file is configured to use an **incorrect npm installation path** at a **different user's directory** (`igor`), instead of the **authenticated CLI installation** at `C:\Users\Split Lease\.local\bin\claude.exe`.

---

## Root Cause

**File**: `.env` (line 10)
**Current (Broken) Value**:
```
CLAUDE_CODE_PATH=C:\Users\igor\AppData\Roaming\npm\claude.cmd
```

**Why This Fails**:
1. Points to wrong user directory (`igor` instead of `Split Lease`)
2. Uses npm installation instead of official Claude Code CLI
3. The npm version lacks proper authentication/browser automation capabilities

---

## Solution

Update the `CLAUDE_CODE_PATH` environment variable to use the correct Claude Code CLI path.

### Option 1: Use System PATH (Recommended)

Set to `claude` and rely on the Windows PATH where the correct installation is registered:

```
CLAUDE_CODE_PATH=claude
```

**Benefits**:
- ✅ Uses system-registered CLI (already in PATH)
- ✅ No hardcoded paths
- ✅ Works across different environments

### Option 2: Use Explicit Path

Use the full path to the authenticated CLI:

```
CLAUDE_CODE_PATH=C:\Users\Split Lease\.local\bin\claude.exe
```

**Benefits**:
- ✅ Explicit and unambiguous
- ✅ Guaranteed to use the correct installation

**Recommendation**: Use **Option 1** for simplicity and portability.

---

## Implementation Steps

1. **Update `.env` file** (line 10)
   - Replace current value with `CLAUDE_CODE_PATH=claude`

2. **Verify the fix**
   - Run `adw_claude_browser.py` with a test prompt
   - Check that it uses the correct CLI path
   - Confirm browser automation works

3. **Optional: Run health check**
   - Execute `adws/adw_tests/health_check.py`
   - Verify environment configuration

---

## How the Workflow Works

```
adw_claude_browser.py (Entry Point)
    ↓
execute_template() → prompt_claude_code()
    ↓
Uses CLAUDE_PATH from .env or defaults to "claude"
    ↓
Executes: [CLAUDE_PATH, "--model", "sonnet", ...]
    ↓
Captures JSONL output from Claude Code CLI
    ↓
Returns response to user
```

**Key Configuration Loading**:

File: `adws/adw_modules/agent.py` (line 26)
```python
CLAUDE_PATH = os.getenv("CLAUDE_CODE_PATH", "claude")
```

This means:
1. First checks `.env` for `CLAUDE_CODE_PATH`
2. If not found, defaults to `"claude"` (system PATH)

---

## Verification

After applying the fix, verify with:

```bash
# Test 1: Check CLI is accessible
claude --version

# Test 2: Run ADW browser with simple prompt
python adws/adw_claude_browser.py "Open claude.ai"

# Test 3: Run health check
python adws/adw_tests/health_check.py
```

Expected output:
- ✅ CLI version displays correctly
- ✅ Browser launches and executes prompt
- ✅ Health check shows correct `claude_code_path`

---

## Files Referenced

| File | Line(s) | Purpose |
|------|---------|---------|
| `.env` | 10 | **REQUIRES UPDATE** - Claude Code CLI path configuration |
| `adws/adw_modules/agent.py` | 26, 148-160 | Reads `CLAUDE_CODE_PATH` and validates CLI installation |
| `adws/adw_claude_browser.py` | 44, 86-99, 343 | Entry point, loads env vars, executes CLI |
| `adws/adw_tests/health_check.py` | 66-109 | Environment validation script |
| `.claude/commands/claude_browser.md` | - | Documentation for `/claude_browser` command |

---

## Success Criteria

- [x] `.env` updated with correct `CLAUDE_CODE_PATH`
- [ ] `adw_claude_browser.py` executes without "CLI not installed" error
- [ ] Browser launches successfully
- [ ] Claude Code responds to prompts
- [ ] Health check passes

---

## Notes

- The correct Claude Code CLI is already installed at `C:\Users\Split Lease\.local\bin\claude.exe`
- This path is already in the Windows PATH (verified by system discovery)
- Using `claude` as the value leverages the existing PATH configuration
- The npm installation at `C:\Users\igor\AppData\Roaming\npm\claude.cmd` should be ignored

---

**Implementation Time**: < 2 minutes
**Risk Level**: LOW (simple configuration change)
**Rollback**: Revert `.env` line 10 to previous value
