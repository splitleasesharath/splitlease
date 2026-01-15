# ADW Orchestrator Improvements - Action Plan

Created: 2026-01-13 15:00:00
Priority: HIGH (blocks FP refactoring progress)
Estimated: 12-16 hours development + 28 hours execution

## Summary

Fix 75% failure rate by implementing localhost-to-localhost baseline comparison.
Target: 25% → 85% success rate.

## Detailed Tasks (See full todo list for tracking)

### Phase 1: Baseline Comparison (6 hours)
1. Design BaselineManager module (git worktree, temp dir)
2. Update DevServerManager for parallel instances  
3. Implement baseline_validation.py module

### Phase 2: Smart Detection (3 hours)
4. Create page_registry.py (auth vs public pages)
5. Integrate strategy selection into orchestrator

### Phase 3: Retry Optimization (1 hour)
6. Add should_retry_error() logic
7. Skip retrying auth errors

### Phase 4: Checkpointing (2 hours)
8. Implement checkpoint.py for state persistence
9. Add --resume flag to orchestrator

### Phase 5: Testing & Docs (4 hours)
10. Test with 5 auth-protected chunks
11. Update CLAUDE.MD and AGENTS.MD

### Phase 6: Full Run (28 hours async)
12. Execute orchestrator on all 336 chunks

## Success Metrics
- Success rate: 25% → 85%
- Time per chunk: 7min → 5min
- Retry rate: 53% → <20%
- ERROR verdicts: 44/60 → <10/60

## References
- Analysis: 20260113140000-orchestrator-run-analysis.md
- Tag: adw-orchestrator-analysis-v1.0
- Commit: 43b6fe43
