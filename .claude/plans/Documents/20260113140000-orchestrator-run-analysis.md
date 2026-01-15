# FP Orchestrator Run Analysis - 20260113101329

**Date**: 2026-01-13
**Run ID**: 20260113101329
**Target**: app/public (336 chunks identified)
**Severity Filter**: high
**Status**: INCOMPLETE (interrupted after 28 chunks, 3.3 hours)

---

## Executive Summary

The orchestrator run reveals **critical systemic issues** that prevent effective validation:

- **75% failure rate**: Only 7/28 chunks completed successfully
- **Authentication blocker**: Auth-protected pages account for majority of failures
- **Inefficient**: ~7 minutes per chunk (would take 39.5 hours for all 336 chunks)
- **High retry rate**: 32/60 validation attempts required retries
- **Infrastructure errors**: 44 ERROR verdicts (vs 10 PASS verdicts)

**Root cause**: Validation strategy assumes unauthenticated localhost vs production comparison works, but authentication-protected pages fail consistently.

