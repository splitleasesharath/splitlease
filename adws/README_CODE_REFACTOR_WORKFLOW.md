# Code Refactoring Workflow

See: .claude/plans/Documents/20260114120000-code-refactor-visual-regression-pending.md for full documentation

## Quick Reference

### Audit Phase
```bash
uv run adws/adw_code_audit.py app/src/logic
```

### Implementation Phase
```bash
uv run adws/adw_code_implement_orchestrator.py .claude/plans/New/<plan-file>.md
```

## File Flow

1. adw_code_audit.py → Opus generates plan
2. adw_code_implement_orchestrator.py → Gemini implements + Playwright validates
3. Git commits on PASS, resets on FAIL
