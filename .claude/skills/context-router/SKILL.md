---
name: context-router
description: Routes tasks to authoritative documentation before making changes. Use when planning implementations, debugging issues, or before any code modification to ensure correct context is loaded and regressions are prevented.
---

# Context Router

## Purpose

Before modifying code, this skill ensures Claude loads the **correct authoritative documentation** for the affected domain. This prevents:
- Regression errors (re-introducing already-fixed bugs)
- Context drift (ignoring domain-specific guardrails)
- Non-deterministic outputs (inconsistent behavior across sessions)

## Routing Protocol

When Claude receives a task that will modify code:

### Step 1: Identify Affected Domains

Analyze the task to determine which domains are affected:
- **Page-specific**: Which page(s) will be modified?
- **Backend**: Which Edge Function(s) are involved?
- **Database**: Are there schema/query changes?
- **Auth**: Does this touch authentication flows?
- **Routing**: Are routes being added/modified?

### Step 2: Load Authoritative Context

For each affected domain, load the corresponding documentation from [DOMAIN_INDEX.md](DOMAIN_INDEX.md):

```
Task: "Fix proposal submission on Listing Dashboard"
├─ Page domain     → Load: Pages/LISTING_DASHBOARD_PAGE_CONTEXT.md
├─ Backend domain  → Load: Backend(EDGE - Functions)/PROPOSAL.md
└─ Database domain → Load: Database/DATABASE_TABLES_DETAILED.md (proposal table)
```

### Step 3: Check Regression Guard (Git Tags)

Before implementing, query git tags for known critical fixes:

```bash
git tag -l "guard/*" --format="%(refname:short): %(contents:subject)"
```

For detailed context on a specific guard:
```bash
git show guard/<name> --stat
```

This ensures:
- Has this exact issue been fixed before? (check if guard tag exists)
- What patterns MUST be followed? (read the tag message)
- What was the original fix? (view the tagged commit)

### Step 4: Proceed with Context

Only after loading the correct documentation should Claude proceed with the task. Include a brief note of which docs were consulted:

```
📚 Context loaded:
- LISTING_DASHBOARD_PAGE_CONTEXT.md
- PROPOSAL.md
- REGRESSION_GUARD.md (FK constraint pattern)
```

## Context Selection Rules

| Task Complexity | Base Context | Domain Docs |
|-----------------|--------------|-------------|
| Single file, simple | miniCLAUDE.md | Relevant page/function doc |
| Multi-file, moderate | miniCLAUDE.md | All affected domain docs |
| Cross-cutting, complex | largeCLAUDE.md | All affected domain docs |
| Database changes | largeCLAUDE.md | DATABASE_*.md + affected docs |

## Integration with Orchestration Pipeline

This skill should be applied **during Phase 2 (Planning)**:

```
Phase 1: CLASSIFY → task-classifier
Phase 2: PLAN → [context-router activates here] → planner loads correct docs
Phase 3: EXECUTE → plan-executor
Phase 4: REVIEW → input-reviewer
```

The planner should reference this skill's domain index to include proper documentation in the plan.

## References

- [DOMAIN_INDEX.md](DOMAIN_INDEX.md) - Complete domain-to-documentation mapping
- [REGRESSION_GUARD.md](REGRESSION_GUARD.md) - How to use and create guard tags
- [../../Documentation/](../../Documentation/) - All documentation files
- Git tags: `git tag -l "guard/*"` - Live regression guard from git history
