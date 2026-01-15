# FP Orchestrator V2 Requirements Specification

**Date**: 2026-01-13  
**Version**: 2.0  
**Status**: Requirements Definition  
**Target**: adw_fp_audit_browser_implement_orchestrator.py

---

## Executive Summary

This document specifies the requirements for FP Orchestrator V2, addressing critical issues identified in the 20260113101329 run that resulted in a 75% failure rate.

**Root Problem**: localhost vs production comparison fails for 70% of pages (auth-protected)

**V2 Solution**: localhost vs localhost baseline comparison with authentication support

**Key Changes from V1:**
1. **Port Management** - Restrict to 8000-8005 with kill+retry logic
2. **Git Tracking** - Include commit SHA in all logs and Slack notifications  
3. **Authentication** - Support host and guest authenticated states
4. **Baseline Comparison** - Compare localhost test vs localhost baseline (main branch)
5. **Chunk Aggregation** - Group by page, validate once per page
6. **Failure Reporting** - Detailed failure reasons in logs and Slack

**Expected Outcomes:**
- Auth failure rate: 70% → <5%
- Port conflicts: Eliminated (kill+retry)
- Validation efficiency: 50% faster (aggregation)
- Commit traceability: 100% (SHA in all logs/Slack)

---

## 1. Strict Port Management (CRITICAL)

### Problem Statement
Current orchestrator uses ports 8000-8099, but Chrome extension only permits 8000-8005.

### Requirements

**PORTS-001**: DevServerManager MUST only use ports 8000-8005 (6 ports total)

**PORTS-002**: When a port is in use:
1. Kill the process on that port using OS-appropriate command
2. Wait 2 seconds for cleanup  
3. Retry starting dev server on same port
4. If still blocked after 3 retries, move to next port
5. If all 6 ports exhausted after retries, fail with clear error

**PORTS-003**: Port allocation MUST be sequential (8000 → 8001 → 8002 → ... → 8005)

**PORTS-004**: Port cleanup MUST occur after each chunk, regardless of success/failure

### Implementation Pseudo-code



---

## Implementation Summary Reference

This V2 specification addresses the 75% failure rate identified in run 20260113101329.

### Core Changes

1. **Port Management**: Restrict to 8000-8005 with kill+retry
2. **Baseline Comparison**: localhost:8000 vs localhost:9000 (same auth state)
3. **Authentication**: Host and guest support via .env credentials
4. **Chunk Aggregation**: Group by page, validate once per group
5. **Failure Classification**: AUTH_FAILURE, NETWORK_ERROR, VISUAL_REGRESSION, CONSOLE_ERROR, UNKNOWN

### Key Modules

- **BaselineManager**: Git worktree + baseline server (port 9000)
- **AuthManager**: Credential loading + auth instructions
- **ChunkAggregator**: Group chunks by pages (max 10 per group)
- **DevServerManager** (updated): Ports 8000-8005 only, kill+retry logic

### Configuration (.env)

```bash
HOST_TEST_EMAIL=host@example.com
HOST_TEST_PASSWORD=<password>
GUEST_TEST_EMAIL=guest@example.com
GUEST_TEST_PASSWORD=<password>
GITHUB_REPO_URL=https://github.com/splitleasesharath/splitlease
```

### Implementation Order

**Phase 1** (2h): Port management + Baseline setup  
**Phase 2** (4h): Authentication + Git tracking  
**Phase 3** (3h): Aggregation + Failure reporting  
**Phase 4** (4h): Testing + Production run

### Success Metrics

- Auth failure rate: 70% → <5%
- Port conflicts: 0
- Validation efficiency: 50% faster
- Commit tracking: 100% (SHA in logs + Slack)

---

**STATUS**: Requirements complete, ready for implementation  
**NEXT**: Begin Phase 1 (port management + baseline comparison)

---

**END OF DOCUMENT**
