# Cleanup Plan: ADW Claude Browser CLI Pattern Alignment

**Created**: 2026-01-10 14:35:00
**Type**: CLEANUP
**Status**: Pending
**Affected File**: `adws/adw_claude_browser.py`

---

## 1. Executive Summary

### What is Being Cleaned Up
The `adws/adw_claude_browser.py` script currently uses a complex template execution path (`execute_template()` via `AgentTemplateRequest`) when a simpler, validated CLI pattern exists: `claude --chrome --print "<prompt>"`.

### Why This Cleanup is Needed
- **Complexity mismatch**: The current approach routes through JSONL streaming, complex error parsing, and model selection logic that is unnecessary for browser automation
- **Validated pattern exists**: The `/invoke-claude-chrome` skill documents a proven working pattern
- **Simplification**: Direct CLI invocation is cleaner, more maintainable, and reduces dependencies

### Expected Outcomes
- Simplified `adw_claude_browser.py` with direct subprocess call
- Removal of unnecessary abstraction layers for this use case
- Alignment with documented working pattern
- Reduced code complexity and improved maintainability

### Scope and Boundaries
- **In scope**: `adw_claude_browser.py` main execution logic
- **Out of scope**: `adw_modules/agent.py` (remains unchanged for other use cases)
- **Out of scope**: Other ADW scripts that legitimately need template execution

---

## 2. Current State Analysis

### File Inventory

| File | Full Path | Role |
|------|-----------|------|
| Main script | `c:\Users\Split Lease\Documents\Split Lease - Dev\adws\adw_claude_browser.py` | Entry point to cleanup |
| Agent module | `c:\Users\Split Lease\Documents\Split Lease - Dev\adws\adw_modules\agent.py` | Contains `execute_template()` - NOT MODIFIED |
| Data types | `c:\Users\Split Lease\Documents\Split Lease - Dev\adws\adw_modules\data_types.py` | Defines `AgentTemplateRequest` - NOT MODIFIED |
| Skill doc | `c:\Users\Split Lease\Documents\Split Lease - Dev\.claude\commands\invoke-claude-chrome.md` | Documents validated pattern |
| Environment | `c:\Users\Split Lease\Documents\Split Lease - Dev\.env` | Contains `CLAUDE_CODE_PATH=claude` |

### Current Pattern (Complex)

```python
# Current approach in adw_claude_browser.py (lines 85-99)
from adw_modules.data_types import AgentTemplateRequest
from adw_modules.agent import execute_template

# Create template request for the /claude_browser command
request = AgentTemplateRequest(
    agent_name=AGENT_CLAUDE_BROWSER,
    slash_command="/claude_browser",
    args=[prompt_arg],
    adw_id=adw_id,
    working_dir=None,  # Use current directory
)

# Execute the template
response = execute_template(request)
```

**This triggers the following execution path:**

```
execute_template()
    ├── get_model_for_slash_command() → loads ADWState, determines model
    ├── Creates AgentPromptRequest with --output-format stream-json --verbose
    └── prompt_claude_code_with_retry()
            └── prompt_claude_code()
                    ├── Streams output to JSONL file
                    ├── Parses JSONL for result message
                    ├── Converts JSONL to JSON array
                    └── Returns AgentPromptResponse
```

### Validated Pattern (Simple)

From `/invoke-claude-chrome` skill documentation (lines 23-29):

```python
# Validated pattern from skill documentation
subprocess.run(
    [CLAUDE_PATH, "--chrome", "--print", user_prompt],
    capture_output=True,
    text=True,
    encoding='utf-8'
)
```

**Direct execution path:**
```
subprocess.run() → Claude CLI with Chrome → stdout captured → done
```

### Dependencies and Relationships

**Current imports in `adw_claude_browser.py` (lines 30-35):**
```python
from adw_modules.state import ADWState
from adw_modules.utils import setup_logger, check_env_vars, make_adw_id
from adw_modules.data_types import AgentTemplateRequest  # TO REMOVE
from adw_modules.agent import execute_template            # TO REMOVE
```

**What depends on `adw_claude_browser.py`:**
- Nothing - this is a standalone entry point script

**What `adw_claude_browser.py` depends on:**
- `ADWState` - for state persistence (KEEP)
- `setup_logger`, `check_env_vars`, `make_adw_id` - for utilities (KEEP)
- `AgentTemplateRequest`, `execute_template` - complex template path (REMOVE)
- `os.getenv("CLAUDE_CODE_PATH")` - for CLI path (ADD)

### Statistics

| Metric | Current | After Cleanup |
|--------|---------|---------------|
| Lines of code | ~129 | ~120 (estimated) |
| Imports from agent module | 2 | 0 |
| Execution complexity | High (JSONL parsing) | Low (direct capture) |
| Output files created | JSONL + JSON | None (stdout only) |

---

## 3. Target State Definition

### Desired End State

The `adw_claude_browser.py` script will use direct CLI invocation matching the validated pattern from `/invoke-claude-chrome`:

```python
import subprocess
import os
from dotenv import load_dotenv

load_dotenv()
CLAUDE_PATH = os.getenv("CLAUDE_CODE_PATH", "claude")

def run_claude_browser(prompt: str) -> tuple[bool, str]:
    """Execute Claude CLI with Chrome integration.

    Args:
        prompt: The task/prompt to send to Claude

    Returns:
        Tuple of (success, output_text)
    """
    result = subprocess.run(
        [CLAUDE_PATH, "--chrome", "--print", prompt],
        capture_output=True,
        text=True,
        encoding='utf-8'
    )

    success = result.returncode == 0
    output = result.stdout if success else result.stderr
    return success, output
```

### Target Patterns with Examples

**Before (complex):**
```python
request = AgentTemplateRequest(
    agent_name=AGENT_CLAUDE_BROWSER,
    slash_command="/claude_browser",
    args=[prompt_arg],
    adw_id=adw_id,
    working_dir=None,
)
response = execute_template(request)
if response.success:
    print(response.output)
```

**After (simple):**
```python
success, output = run_claude_browser(prompt_arg)
if success:
    print(output)
```

### Success Criteria

1. Script executes `claude --chrome --print "<prompt>"` directly via subprocess
2. No imports from `adw_modules.agent` or related template types
3. Output is captured directly from stdout (no JSONL parsing)
4. Error handling captures stderr on failure
5. State tracking (`ADWState`) remains functional for workflow continuity
6. Logging remains functional for debugging
7. Script passes manual testing with a simple prompt

---

## 4. File-by-File Action Plan

### File: `c:\Users\Split Lease\Documents\Split Lease - Dev\adws\adw_claude_browser.py`

**Current State**: Uses `execute_template()` with `AgentTemplateRequest` for complex JSONL-based execution

**Required Changes**:

#### Change 1: Update imports (lines 30-35)

**Current:**
```python
from adw_modules.state import ADWState
from adw_modules.utils import setup_logger, check_env_vars, make_adw_id
from adw_modules.data_types import AgentTemplateRequest
from adw_modules.agent import execute_template
```

**Target:**
```python
import subprocess
from adw_modules.state import ADWState
from adw_modules.utils import setup_logger, check_env_vars, make_adw_id
```

#### Change 2: Add CLAUDE_PATH constant (after line 26)

**Add after existing imports:**
```python
# Get Claude Code CLI path from environment
CLAUDE_PATH = os.getenv("CLAUDE_CODE_PATH", "claude")
```

#### Change 3: Remove AGENT_CLAUDE_BROWSER constant (line 38)

**Remove:**
```python
# Agent name constant
AGENT_CLAUDE_BROWSER = "claude_browser"
```

#### Change 4: Add new execution function (before main function)

**Add new function:**
```python
def run_claude_browser(prompt: str, logger: logging.Logger) -> tuple[bool, str]:
    """Execute Claude CLI with Chrome integration.

    Uses the validated pattern: claude --chrome --print "<prompt>"

    Args:
        prompt: The task/prompt to send to Claude
        logger: Logger instance for debugging

    Returns:
        Tuple of (success, output_text)
    """
    cmd = [CLAUDE_PATH, "--chrome", "--print", prompt]
    logger.debug(f"Executing command: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            timeout=300  # 5 minute timeout for browser operations
        )

        success = result.returncode == 0
        output = result.stdout if success else result.stderr

        logger.debug(f"Command completed with return code: {result.returncode}")
        return success, output.strip()

    except subprocess.TimeoutExpired:
        logger.error("Claude browser command timed out after 5 minutes")
        return False, "Error: Command timed out after 5 minutes"
    except FileNotFoundError:
        logger.error(f"Claude CLI not found at: {CLAUDE_PATH}")
        return False, f"Error: Claude CLI not found. Check CLAUDE_CODE_PATH in .env"
    except Exception as e:
        logger.error(f"Unexpected error executing Claude browser: {e}")
        return False, f"Error: {str(e)}"
```

#### Change 5: Replace execution block (lines 80-120)

**Current (lines 80-120):**
```python
    # Execute the Claude browser interaction
    logger.info("Launching Claude browser session")
    print("🌐 Launching Claude.ai in Chrome...")
    print("📨 Sending prompt to Claude...\n")

    # Create template request for the /claude_browser command
    request = AgentTemplateRequest(
        agent_name=AGENT_CLAUDE_BROWSER,
        slash_command="/claude_browser",
        args=[prompt_arg],
        adw_id=adw_id,
        working_dir=None,  # Use current directory
    )

    logger.debug(
        f"claude_browser_request: {request.model_dump_json(indent=2, by_alias=True)}"
    )

    # Execute the template
    response = execute_template(request)

    logger.debug(
        f"claude_browser_response: {response.model_dump_json(indent=2, by_alias=True)}"
    )

    # Display results
    print(f"\n{'='*60}")
    if response.success:
        print("✅ Claude browser interaction completed!")
        print(f"{'='*60}\n")
        print(response.output)
        print(f"\n{'='*60}")
        print(f"📁 Output saved to: agents/{adw_id}/{AGENT_CLAUDE_BROWSER}/")
        print(f"{'='*60}\n")
        logger.info("Claude browser interaction completed successfully")
    else:
        print("❌ Claude browser interaction failed!")
        print(f"{'='*60}\n")
        print(f"Error: {response.output}")
        print(f"\n{'='*60}\n")
        logger.error(f"Claude browser interaction failed: {response.output}")
        sys.exit(1)
```

**Target:**
```python
    # Execute the Claude browser interaction
    logger.info("Launching Claude browser session")
    print("Launching Claude.ai in Chrome...")
    print("Sending prompt to Claude...\n")

    # Execute using validated CLI pattern
    success, output = run_claude_browser(prompt_arg, logger)

    # Display results
    print(f"\n{'='*60}")
    if success:
        print("Claude browser interaction completed!")
        print(f"{'='*60}\n")
        print(output)
        print(f"\n{'='*60}\n")
        logger.info("Claude browser interaction completed successfully")
    else:
        print("Claude browser interaction failed!")
        print(f"{'='*60}\n")
        print(f"Error: {output}")
        print(f"\n{'='*60}\n")
        logger.error(f"Claude browser interaction failed: {output}")
        sys.exit(1)
```

**Dependencies**: None affected

**Verification**:
1. Run `uv run adws/adw_claude_browser.py "Navigate to google.com and take a screenshot"`
2. Verify Chrome launches with Claude integration
3. Verify output is captured and displayed
4. Check that return code 0 = success, non-zero = failure

---

## 5. Execution Order

### Phase 1: Preparation (no code changes)
1. Verify `.env` has `CLAUDE_CODE_PATH=claude`
2. Verify Claude CLI is accessible: `claude --version`

### Phase 2: Code Changes (single file, atomic)
All changes to `adw_claude_browser.py` should be made in a single commit:

1. Update imports (remove `AgentTemplateRequest`, `execute_template`, add `subprocess`)
2. Add `CLAUDE_PATH` constant
3. Remove `AGENT_CLAUDE_BROWSER` constant
4. Add `run_claude_browser()` function
5. Replace execution block in `main()`
6. Update output messages (remove emoji per project convention, remove "saved to" message since no files are created)

### Phase 3: Verification
1. Run script with test prompt
2. Verify Chrome launches
3. Verify output capture
4. Verify error handling (test with invalid prompt or offline state)

### Safe Stopping Points
- After Phase 1: No code changes yet, safe to stop
- After Phase 2: All changes complete, must proceed to Phase 3 to verify
- After Phase 3: Cleanup complete, ready for commit

---

## 6. Risk Assessment

### Potential Breaking Changes

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| JSONL output files no longer created | Expected | Low | These files were not used by other workflows |
| Different error message format | Expected | Low | Error messages now come directly from CLI |
| Timeout behavior different | Low | Medium | Explicit 5-minute timeout added |

### Edge Cases to Watch

1. **Chrome not installed**: Will fail with clear error from CLI
2. **Permission prompts in Chrome**: First run may require user interaction
3. **Long-running browser tasks**: 5-minute timeout should be sufficient; can increase if needed
4. **Special characters in prompt**: Passed directly to subprocess, should work correctly

### Rollback Considerations

If rollback is needed:
1. Revert to previous commit
2. No database or external state changes to undo
3. No dependency changes required

---

## 7. Verification Checklist

### Pre-Implementation Checks
- [ ] Verify `claude --version` works from command line
- [ ] Verify `.env` contains `CLAUDE_CODE_PATH=claude`
- [ ] Verify Chrome is installed and accessible

### Post-Implementation Checks
- [ ] Script runs without import errors
- [ ] Simple prompt test: `uv run adws/adw_claude_browser.py "Navigate to google.com"`
- [ ] Error handling test: `uv run adws/adw_claude_browser.py ""` (empty prompt)
- [ ] ADWState is created and saved correctly
- [ ] Logger outputs expected debug information
- [ ] Return code is 0 on success, 1 on failure

### Definition of Done
- [ ] All code changes implemented as specified
- [ ] Manual test passes with real browser interaction
- [ ] No imports from `adw_modules.agent` remain
- [ ] Commit created with descriptive message
- [ ] This plan moved to `.claude/plans/Done/`

---

## 8. Reference Appendix

### All File Paths

| File | Path | Action |
|------|------|--------|
| Main script (MODIFY) | `c:\Users\Split Lease\Documents\Split Lease - Dev\adws\adw_claude_browser.py` | Update |
| Agent module (NO CHANGE) | `c:\Users\Split Lease\Documents\Split Lease - Dev\adws\adw_modules\agent.py` | Reference only |
| Data types (NO CHANGE) | `c:\Users\Split Lease\Documents\Split Lease - Dev\adws\adw_modules\data_types.py` | Reference only |
| Utils (NO CHANGE) | `c:\Users\Split Lease\Documents\Split Lease - Dev\adws\adw_modules\utils.py` | Used by script |
| State (NO CHANGE) | `c:\Users\Split Lease\Documents\Split Lease - Dev\adws\adw_modules\state.py` | Used by script |
| Skill documentation | `c:\Users\Split Lease\Documents\Split Lease - Dev\.claude\commands\invoke-claude-chrome.md` | Reference pattern |
| Environment config | `c:\Users\Split Lease\Documents\Split Lease - Dev\.env` | Contains CLAUDE_CODE_PATH |

### Key Code Patterns

**Before: Template-based execution**
```python
from adw_modules.data_types import AgentTemplateRequest
from adw_modules.agent import execute_template

request = AgentTemplateRequest(
    agent_name="claude_browser",
    slash_command="/claude_browser",
    args=[prompt],
    adw_id=adw_id,
    working_dir=None,
)
response = execute_template(request)
```

**After: Direct CLI execution**
```python
import subprocess

CLAUDE_PATH = os.getenv("CLAUDE_CODE_PATH", "claude")

result = subprocess.run(
    [CLAUDE_PATH, "--chrome", "--print", prompt],
    capture_output=True,
    text=True,
    encoding='utf-8',
    timeout=300
)
success = result.returncode == 0
output = result.stdout if success else result.stderr
```

### Relevant Documentation Links

- `/invoke-claude-chrome` skill: Defines the validated pattern
- `adw_modules/agent.py` line 343: Shows complex `prompt_claude_code()` that is being bypassed
- `.env` line 10: `CLAUDE_CODE_PATH=claude` configuration

---

## Complete Replacement Code

For convenience, here is the complete target state of `adw_claude_browser.py`:

```python
#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
ADW Claude Browser - AI Developer Workflow for browser-based Claude interactions (No Worktree)

Usage:
  uv run adw_claude_browser.py "<prompt>" [adw-id]

Workflow:
1. Generate ADW ID (or use provided)
2. Execute Claude CLI with Chrome integration
3. Capture Claude's response
4. Display results

This is a SIMPLIFIED version without worktree creation - runs in current directory.
Perfect for testing and development.

Example:
  uv run adw_claude_browser.py "Analyze the performance of our API endpoints"
  uv run adw_claude_browser.py "Explain React Server Components" abc12345
"""

import sys
import os
import logging
import subprocess
from dotenv import load_dotenv

from adw_modules.state import ADWState
from adw_modules.utils import setup_logger, check_env_vars, make_adw_id

# Load environment variables
load_dotenv()

# Get Claude Code CLI path from environment
CLAUDE_PATH = os.getenv("CLAUDE_CODE_PATH", "claude")


def run_claude_browser(prompt: str, logger: logging.Logger) -> tuple[bool, str]:
    """Execute Claude CLI with Chrome integration.

    Uses the validated pattern: claude --chrome --print "<prompt>"

    Args:
        prompt: The task/prompt to send to Claude
        logger: Logger instance for debugging

    Returns:
        Tuple of (success, output_text)
    """
    cmd = [CLAUDE_PATH, "--chrome", "--print", prompt]
    logger.debug(f"Executing command: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            timeout=300  # 5 minute timeout for browser operations
        )

        success = result.returncode == 0
        output = result.stdout if success else result.stderr

        logger.debug(f"Command completed with return code: {result.returncode}")
        return success, output.strip()

    except subprocess.TimeoutExpired:
        logger.error("Claude browser command timed out after 5 minutes")
        return False, "Error: Command timed out after 5 minutes"
    except FileNotFoundError:
        logger.error(f"Claude CLI not found at: {CLAUDE_PATH}")
        return False, f"Error: Claude CLI not found. Check CLAUDE_CODE_PATH in .env"
    except Exception as e:
        logger.error(f"Unexpected error executing Claude browser: {e}")
        return False, f"Error: {str(e)}"


def main():
    """Main entry point."""
    # Parse command line args
    if len(sys.argv) < 2:
        print("Usage: uv run adw_claude_browser.py \"<prompt>\" [adw-id]")
        print("\nExamples:")
        print('  uv run adw_claude_browser.py "Analyze our API performance"')
        print('  uv run adw_claude_browser.py "Explain React hooks" abc12345')
        sys.exit(1)

    prompt_arg = sys.argv[1]
    adw_id = sys.argv[2] if len(sys.argv) > 2 else make_adw_id()

    # Set up logger
    logger = setup_logger(adw_id, "adw_claude_browser")
    logger.info(f"ADW Claude Browser starting - ID: {adw_id}")
    logger.info(f"Prompt: {prompt_arg}")

    # Validate environment
    check_env_vars(logger)

    # Create or load state (no worktree)
    state = ADWState.load(adw_id, logger)
    if not state:
        logger.info("Creating new ADW state (no worktree)")
        state = ADWState(adw_id)

    # Track that this workflow has run
    state.append_adw_id("adw_claude_browser")
    state.save("adw_claude_browser")

    print(f"\n{'='*60}")
    print(f"ADW Claude Browser - ID: {adw_id}")
    print(f"Prompt: {prompt_arg}")
    print(f"{'='*60}\n")

    # Execute the Claude browser interaction
    logger.info("Launching Claude browser session")
    print("Launching Claude.ai in Chrome...")
    print("Sending prompt to Claude...\n")

    # Execute using validated CLI pattern
    success, output = run_claude_browser(prompt_arg, logger)

    # Display results
    print(f"\n{'='*60}")
    if success:
        print("Claude browser interaction completed!")
        print(f"{'='*60}\n")
        print(output)
        print(f"\n{'='*60}\n")
        logger.info("Claude browser interaction completed successfully")
    else:
        print("Claude browser interaction failed!")
        print(f"{'='*60}\n")
        print(f"Error: {output}")
        print(f"\n{'='*60}\n")
        logger.error(f"Claude browser interaction failed: {output}")
        sys.exit(1)

    # Save final state
    state.save("adw_claude_browser")


if __name__ == "__main__":
    main()
```

---

**END OF PLAN**
