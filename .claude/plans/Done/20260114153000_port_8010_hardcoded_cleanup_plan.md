# Port 8010 Hardcoded Enforcement - Comprehensive Cleanup Plan

**Date**: 2026-01-14
**Timestamp**: 20260114153000
**Task**: Enforce port 8010 as hardcoded default across entire ADW system
**Constraint**: No increments, no tom foolery - absolute simplicity

## 1. Executive Summary

### What is being cleaned up
The ADW (AI Developer Workflow) system currently uses complex, dynamic port management with:
- Variable port numbers (8000, 8010, and potential increments)
- Dynamic port detection via socket connections
- Platform-specific process killing (psutil, netstat, lsof, taskkill)
- Retry mechanisms and backoff logic
- Two overlapping modules: dev_server.py (391 lines) and dev_server_manager.py (300 lines)

### Why
- Port management complexity is unnecessary - we have bun run dev:test:restart that handles everything
- The existing npm scripts already hardcode port 8010 with --strictPort
- psutil dependency adds installation complexity
- Code duplication between dev_server.py and dev_server_manager.py

### Scope and Boundaries
- IN SCOPE: All Python files in adws/ that reference dev server functionality
- OUT OF SCOPE: The npm scripts themselves (already correctly configured)

### Expected Outcomes
1. Port 8010 hardcoded everywhere (no variables, no config)
2. Single function: restart_dev_server_on_port_8010() that calls bun run dev:test:restart
3. Remove psutil dependency from Python scripts
4. Remove all platform-specific logic (netstat, lsof, taskkill)
5. Remove all retry mechanisms from dev server management
6. Orchestrators use simplified server startup

## 2. Current State Analysis

### 2.1 Inventory of Affected Files

| File | Lines | Role |
|------|-------|------|
| adws/adw_modules/config.py | 79 | Configuration |
| adws/adw_modules/dev_server.py | 391 | Port management |
| adws/adw_modules/dev_server_manager.py | 300 | DevServerManager class |
| adws/adw_fp_audit_browser_implement_orchestrator.py | 931 | Main orchestrator |
| adws/adw_fp_browser_implement_mini.py | 449 | Mini orchestrator |
| adws/adw_claude_browser.py | 240 | Browser automation |

### 2.2 Current Port References

config.py (Lines 14, 20):
- DEV_SERVER_DEFAULT_PORT = 8000
- DEV_SERVER_COMMAND with port 8000

adw_claude_browser.py (Line 164):
- port = 8000

### 2.3 npm Scripts (Already Correct)

app/package.json:
- dev:test: vite --port 8010 --strictPort
- dev:test:stop: node scripts/kill-port.js 8010
- dev:test:restart: bun run dev:test:stop && bun run dev:test

## 3. Target State Definition

### 3.1 Desired End State

1. Single port: 8010 - Hardcoded everywhere
2. Single command: bun run dev:test:restart
3. Single function: restart_dev_server_on_port_8010()
4. No psutil: Remove dependency entirely
5. No platform detection: npm script handles this

### 3.2 Success Criteria

1. grep 8000 adws/ returns 0 results
2. grep DEV_SERVER_DEFAULT_PORT adws/ returns 0 results
3. grep psutil adws/ returns 0 results
4. dev_server.py is under 90 lines
5. dev_server_manager.py is deleted or under 50 lines

## 4. File-by-File Action Plan

### File: adws/adw_modules/config.py
Remove DEV_SERVER_* constants (lines 10-26)

### File: adws/adw_modules/dev_server.py
Complete rewrite to ~80 lines using npm scripts

### File: adws/adw_modules/dev_server_manager.py
DELETE or reduce to thin wrapper

### File: adws/adw_claude_browser.py
Update imports and remove port = 8000

### File: adws/adw_fp_audit_browser_implement_orchestrator.py
Update imports if dev_server_manager.py deleted

### File: adws/adw_fp_browser_implement_mini.py
Same as full orchestrator

## 5. Execution Order

Phase 1: Update npm Scripts (Already Done)
Phase 2: Rewrite adw_modules/dev_server.py
Phase 3: Delete adw_modules/dev_server_manager.py
Phase 4: Update adw_modules/config.py
Phase 5: Update consumer files
Phase 6: Verification

## 6. Verification Checklist

- [ ] grep -r 8000 adws/ returns 0 results
- [ ] grep -r DEV_SERVER_DEFAULT_PORT adws/ returns 0 results
- [ ] grep -r psutil adws/*.py returns 0 results
- [ ] bun run dev:test:restart works
- [ ] Mini orchestrator runs successfully

## 7. Reference - All File Paths

Files to Modify:
- c:/Users/Split Lease/Documents/Split Lease - Dev/adws/adw_modules/config.py
- c:/Users/Split Lease/Documents/Split Lease - Dev/adws/adw_modules/dev_server.py
- c:/Users/Split Lease/Documents/Split Lease - Dev/adws/adw_fp_audit_browser_implement_orchestrator.py
- c:/Users/Split Lease/Documents/Split Lease - Dev/adws/adw_fp_browser_implement_mini.py
- c:/Users/Split Lease/Documents/Split Lease - Dev/adws/adw_claude_browser.py

Files to Delete:
- c:/Users/Split Lease/Documents/Split Lease - Dev/adws/adw_modules/dev_server_manager.py

Files Already Correct:
- c:/Users/Split Lease/Documents/Split Lease - Dev/app/package.json
- c:/Users/Split Lease/Documents/Split Lease - Dev/app/scripts/kill-port.js
- c:/Users/Split Lease/Documents/Split Lease - Dev/adws/adw_claude_browser_stateless.py
- c:/Users/Split Lease/Documents/Split Lease - Dev/adws/adw_modules/chunk_validation.py

## Summary

This cleanup removes ~400 lines of complex port management code and replaces it with ~80 lines that delegate to npm scripts. Port 8010 is hardcoded for predictability and simplicity.
