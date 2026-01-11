# ADW FP Automation - LLM Reference

**GENERATED**: 2026-01-11 (Updated with deterministic port management)
**SCOPE**: adws/adw_fp_audit.py, adws/adw_claude_browser.py, adws/adw_fp_audit_browser_implement_orchestrator.py, adws/adw_fp_implement.py, adws/adw_modules/dev_server.py, adws/adw_modules/run_logger.py
**OPTIMIZATION**: Semantic Searchability + Digestibility

---

## QUICK_STATS

[TOTAL_FILES]: 6
[TOTAL_DIRECTORIES]: 2
[PRIMARY_LANGUAGE]: Python
[KEY_PATTERNS]: CLI automation, Claude Code agent orchestration, functional-programming refactor planning, browser-based validation, deterministic port management, timestamped run logging, git workflow management

---

## WORKFLOW SCRIPTS

### adws/adw_fp_audit.py
[INTENT]: Runs Claude Code to audit a target path for functional-programming violations and generates a chunked refactor plan plus violations JSON.
[EXPORTS]: run_fp_audit_and_plan(), main()
[DEPENDS_ON]: argparse, datetime, pathlib.Path, adw_modules.agent.prompt_claude_code, adw_modules.data_types.AgentPromptRequest
[USED_BY]: adws/adw_fp_audit_browser_implement_orchestrator.py run_audit_phase()

### adws/adw_claude_browser.py
[INTENT]: Launches Claude CLI with Chrome integration after DETERMINISTICALLY starting a dev server on port 8000, executes the provided prompt, and returns printed output. Integrated with run_logger for orchestration tracking.
[EXPORTS]: run_claude_browser(), main()
[DEPENDS_ON]: adw_modules.state.ADWSState persistence, adw_modules.utils.setup_logger|check_env_vars|make_adw_id, adw_modules.dev_server.ensure_dev_server_single_attempt|stop_dev_server, adw_modules.run_logger.create_run_logger, subprocess.run, CLAUDE_CODE_PATH env
[USED_BY]: adws/adw_fp_audit_browser_implement_orchestrator.py validate_with_browser(); manual prompts requiring browser context
[PORT_MANAGEMENT]: Always clears port 8000 before starting dev server using platform-specific commands (taskkill on Windows, kill -9 on Unix)
[LOGGING]: Creates timestamped log in adws/adw_run_logs/YYYYMMDDHHMMSS_browser_validation_run.log

### adws/adw_fp_audit_browser_implement_orchestrator.py
[INTENT]: Full FP refactoring orchestrator that runs the audit, parses plan chunks, applies each chunk via Claude Code, validates in browser, commits or rolls back, and sends webhook notifications. Enhanced with run_logger and improved error reporting.
[EXPORTS]: ChunkData, OrchestratorState, extract_chunks_from_plan(), run_audit_phase(), implement_chunk(), infer_validation_context(), validate_with_browser(), commit_chunk(), rollback_chunk(), process_chunks(), main()
[DEPENDS_ON]: adw_fp_audit.run_fp_audit_and_plan, adw_modules.webhook.notify_success|notify_failure|notify_in_progress, adw_modules.agent.prompt_claude_code, adw_modules.data_types.AgentPromptRequest, adw_modules.run_logger.create_run_logger, adw_claude_browser (invoked via uv run), subprocess for git, regex parsing
[USED_BY]: CLI entry uv run adw_fp_audit_browser_implement_orchestrator.py; drives end-to-end FP workflow including validation and git actions
[PORT_MANAGEMENT]: Passes port=8000 to validation functions, logs detailed subprocess errors
[LOGGING]: Creates timestamped log in adws/adw_run_logs/YYYYMMDDHHMMSS_fp_orchestrator_run.log

### adws/adw_fp_implement.py
[INTENT]: Applies all refactor chunks from the most recent FP plan using Claude Code and commits the resulting changes.
[EXPORTS]: find_latest_plan(), implement_fp_fixes(), commit_changes(), main()
[DEPENDS_ON]: pathlib.Path, datetime, adw_modules.agent.prompt_claude_code, adw_modules.data_types.AgentPromptRequest, subprocess for git staging/commit
[USED_BY]: Manual execution uv run adw_fp_implement.py after an FP audit plan exists

---

## INFRASTRUCTURE MODULES

### adws/adw_modules/dev_server.py
[INTENT]: Deterministic dev server management with platform-aware port cleanup. Guarantees port 8000 is available before starting server.
[EXPORTS]: is_port_in_use(), kill_process_on_port(), _kill_port_windows(), _kill_port_unix(), start_dev_server(), ensure_dev_server(), stop_dev_server(), ensure_dev_server_single_attempt()
[DEPENDS_ON]: subprocess, time, logging, socket, psutil, platform
[USED_BY]: adws/adw_claude_browser.py main()
[ALGORITHM]: Two-phase kill (psutil → platform-specific fallback), verify port is free, start server, fail fast with clear errors
[PLATFORMS]: Windows (netstat + taskkill /F), Unix (lsof + kill -9)

### adws/adw_modules/run_logger.py
[INTENT]: Timestamped logging for orchestrator runs. Writes to both stdout and timestamped log files for debugging and webhook correlation.
[EXPORTS]: RunLogger class, create_run_logger()
[DEPENDS_ON]: sys, datetime, pathlib.Path
[USED_BY]: adws/adw_claude_browser.py, adws/adw_fp_audit_browser_implement_orchestrator.py
[LOG_LOCATION]: adws/adw_run_logs/YYYYMMDDHHMMSS_<run_type>_run.log
[FEATURES]: Dual-channel output (stdout + file), automatic timestamps, error capture with tracebacks, summary sections with key metrics

---

## PORT MANAGEMENT ARCHITECTURE

### Problem (Original)
```
psutil.net_connections() → Find PIDs on port 8000
  └─ psutil.Process(pid).kill()
      └─ Fails with "PID not found" (race condition)
          └─ Script exits with unclear error ❌
```

### Solution (Current)
```
Phase 1: psutil kill attempt
  ├─ Success? → Verify port is free → Done ✅
  └─ Failure? → Fallback to platform-specific

Phase 2: Platform-specific force kill
  ├─ Windows: netstat -ano → parse PIDs → taskkill /F /PID <pid>
  └─ Unix: lsof -ti :<port> → kill -9 <pid>

Phase 3: Verification
  ├─ Wait 2 seconds for OS to release port
  ├─ Check port again
  └─ Still blocked? → RuntimeError (fail fast)
      └─ Port free? → Start dev server ✅
```

### Key Benefits
1. **Deterministic**: Always clears port, no race conditions
2. **Platform-aware**: Uses native OS commands for guaranteed kill
3. **Observable**: Full logging at each step
4. **Fail-fast**: Clear errors when infrastructure fails
5. **Recoverable**: Manual intervention instructions in error messages

---

## LOGGING ARCHITECTURE

### Log File Structure
```
adws/adw_run_logs/
├── YYYYMMDDHHMMSS_fp_orchestrator_run.log
│   ├── Header (timestamp, run type)
│   ├── Phase 1: FP Audit
│   ├── Chunk extraction
│   ├── Phase 2: Chunk processing
│   │   ├── Chunk N implementation
│   │   ├── Chunk N validation
│   │   └─ Chunk N commit/rollback
│   ├── Summary (total, completed, skipped, failed)
│   └── Footer (end time, log path)
│
└── YYYYMMDDHHMMSS_browser_validation_run.log
    ├── Header
    ├── Pre-flight: Dev server check
    ├── Agent invocation
    ├── Validation result
    ├── Post-flight: Dev server cleanup
    └── Footer
```

### Log Entry Format
```
[HH:MM:SS] <message>
```

### Error Logging
```
============================================================
ERROR
============================================================
Context: <where error occurred>
Error Type: <exception class>
Error Message: <error.message>

Traceback:
<full traceback>
------------------------------------------------------------
```

---

## TROUBLESHOOTING

### Port 8000 Already in Use

**Symptoms:**
- Browser validation fails with dev server error
- Log shows "Port 8000 is in use"

**Solution:**
The orchestrator now automatically kills blocking processes. If manual intervention is needed:

```powershell
# Windows
netstat -ano | findstr :8000  # Find PID
taskkill /F /PID <pid>        # Kill process

# Unix
lsof -ti :8000 | xargs kill -9  # Find and kill
```

### Browser Validation Timeout

**Symptoms:**
- Validation takes >10 minutes
- Log shows "Browser took >10 minutes"

**Solution:**
1. Check if Claude CLI is hung (manual `claude --chrome` test)
2. Check if dev server started successfully
3. Review browser validation log for stuck operations

### Chunk Validation Failed

**Symptoms:**
- Chunk marked as SKIPPED
- Log shows "validation FAILED - rolling back"

**Solution:**
1. Check browser validation log: `adws/adw_run_logs/YYYYMMDDHHMMSS_browser_validation_run.log`
2. Review console errors captured in validation output
3. Manually test the affected page at `http://localhost:8000/<page_url>`
4. Check if refactored code introduced regressions

---

## REFERENCES

- **Port conflict resolution**: `.claude/plans/Documents/20260111120000-fp-orchestrator-port-conflict-resolution.md`
- **Run logging commit**: `66000dff` - feat(adw): add timestamped run logging for orchestrator
- **Port management commit**: `ce0cc118` - feat(adw): deterministic port 8000 management for browser validation

---

## COMMANDS

```powershell
# Run full FP orchestration (all chunks)
uv run adws/adw_fp_audit_browser_implement_orchestrator.py app --severity high

# Run specific chunks only
uv run adws/adw_fp_audit_browser_implement_orchestrator.py app --severity high --chunks 1,3,5

# Manual browser validation
uv run adws/adw_claude_browser.py "Navigate to http://localhost:8000/search and verify page loads"

# Check orchestrator logs
cat adws/adw_run_logs/YYYYMMDDHHMMSS_fp_orchestrator_run.log

# Check browser validation logs
cat adws/adw_run_logs/YYYYMMDDHHMMSS_browser_validation_run.log

# Kill all node processes (nuclear option)
taskkill /F /IM node.exe  # Windows
pkill -9 node             # Unix
```
