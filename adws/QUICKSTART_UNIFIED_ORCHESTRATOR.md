# Quick Start Guide - Unified FP Refactor Orchestrator

**Get started in 3 minutes!**

## Prerequisites Check

```bash
# 1. Verify npm scripts exist
cd app && cat package.json | grep -A 3 "dev:test"

# 2. Test kill-port script
node scripts/kill-port.js 8010

# 3. Test dev server restart
bun run dev:test:restart
# Press Ctrl+C to stop
```

If any of these fail, see [README_UNIFIED_FP_ORCHESTRATOR.md](./README_UNIFIED_FP_ORCHESTRATOR.md) for setup instructions.

---

## Quick Test (3 Commands)

```bash
# 1. Test a single component (dev server)
python test_orchestrator.py dev-server

# 2. Test visual regression on a public page
python test_orchestrator.py visual /listing

# 3. Run full orchestrator on 1 page group
python test_orchestrator.py full app/src/logic
```

---

## Production Run

```bash
# Process all page groups in app/src/logic
uv run adw_unified_fp_orchestrator.py app/src/logic

# Or limit to first 5 for safety
uv run adw_unified_fp_orchestrator.py app/src/logic --limit 5
```

---

## Component Testing

| Test What | Command |
|-----------|---------|
| Code audit | `python test_orchestrator.py audit app/src/logic` |
| Chunk parsing | `python test_orchestrator.py chunks .claude/plans/New/<plan>.md` |
| Implementation | `python test_orchestrator.py implement <plan>.md [chunk_num]` |
| Visual check | `python test_orchestrator.py visual /listing` |
| Dev server | `python test_orchestrator.py dev-server` |
| Full pipeline | `python test_orchestrator.py full app/src/logic` |

---

## What It Does

1. **AUDIT**: Claude Opus scans code, generates refactoring plan
2. **IMPLEMENT**: Gemini Flash applies changes page-by-page
3. **TEST**: Visual regression check (LIVE vs DEV)
4. **DECIDE**: Auto-commit on PASS, reset on FAIL

---

## Output

**On success**:
- Git commits with detailed messages
- Slack notification (if configured)
- Summary: N passed, M failed

**On failure**:
- Changes reset with `git reset --hard`
- Continues to next page group
- Slack notification with error details

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 8010 in use | `cd app && bun run dev:test:stop` |
| Dev server won't start | Check npm scripts in `app/package.json` |
| Visual check fails | Verify page auth mapping in `adw_modules/page_classifier.py` |
| Implementation fails | Check plan format with `python test_orchestrator.py chunks <plan>` |

---

## Full Documentation

See [README_UNIFIED_FP_ORCHESTRATOR.md](./README_UNIFIED_FP_ORCHESTRATOR.md) for:
- Complete setup instructions
- Detailed component documentation
- Authentication mapping
- Advanced usage examples
- Migration guide from old scripts

---

**Quick Help**: `python test_orchestrator.py --help`
