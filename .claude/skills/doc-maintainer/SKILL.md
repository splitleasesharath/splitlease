---
name: doc-maintainer
description: |
  Audit, validate, and update Split Lease documentation with auto-fix capabilities.
  Use when: (1) Checking documentation health and finding broken references,
  (2) Validating file paths or function references in docs against the codebase,
  (3) Syncing DOMAIN_INDEX.md with actual documentation files,
  (4) Updating documentation after code changes,
  (5) Managing CLAUDE.md versioning after documentation updates.
  Triggers: "audit docs", "check documentation", "validate docs", "sync domain index",
  "update documentation", "doc health check", "broken doc references".
---

# Doc-Maintainer

Maintain documentation accuracy by validating references against the codebase and auto-fixing simple issues.

## Scope

| In Scope | Out of Scope |
|----------|--------------|
| `.claude/CLAUDE.md` | `.claude/plans/Documents/` |
| `.claude/Documentation/**/*.md` | `app/CLAUDE.md`, `supabase/CLAUDE.md` |
| `.claude/skills/context-router/DOMAIN_INDEX.md` | |

## Commands

### `/doc-maintainer audit`

Full health check with auto-fix for simple issues.

**Workflow:**
1. Scan all `.md` files in `Documentation/`
2. Extract file references (paths like `app/src/*`, `supabase/*`)
3. Extract function references (`useXxx`, `calculateXxx`, `isXxx`, etc.)
4. Validate each reference against codebase
5. Auto-fix simple issues (moved files, missing index entries)
6. Generate health report
7. If changes made: bump CLAUDE.md version and commit

### `/doc-maintainer validate <path>`

Check specific doc against codebase.

```
/doc-maintainer validate Documentation/Pages/SEARCH_QUICK_REFERENCE.md
```

### `/doc-maintainer sync-index`

Regenerate DOMAIN_INDEX.md from actual documentation files.

**Actions:**
- Add entries for docs not currently indexed
- Flag orphaned entries (indexed but file missing)
- Preserve existing entry descriptions

### `/doc-maintainer check-refs`

Focused reference validation only (no auto-fix).

Returns report of all broken references without making changes.

### `/doc-maintainer update <domain>`

Interactive update mode for a specific domain.

**Domains:** `pages`, `backend`, `database`, `auth`, `architecture`, `external`

## Reference Extraction

### File Path Patterns

Extract paths matching:
```
`app/src/*`
`supabase/functions/*`
`public/*`
`.claude/*`
```

See [references/ref_patterns.md](references/ref_patterns.md) for regex patterns.

### Function Reference Patterns

Extract function names matching four-layer architecture:
- `useXxxPageLogic`, `useXxx` (hooks)
- `calculateXxx`, `getXxx` (calculators)
- `isXxx`, `canXxx`, `shouldXxx` (rules)
- `processXxx`, `formatXxx`, `adaptXxx` (processors)

## Auto-Fix Rules

| Issue | Action |
|-------|--------|
| File moved (same name, different path) | Auto-update reference |
| File renamed (fuzzy match >90%) | Suggest fix, require approval |
| File deleted | Flag for manual review |
| Function renamed (similar found) | Suggest fix, require approval |
| Function deleted | Flag for manual review |
| Doc not in DOMAIN_INDEX | Auto-add entry |
| Orphaned DOMAIN_INDEX entry | Flag for removal |

## Version Management

After any changes via this skill:

1. Read current version from CLAUDE.md (e.g., `VERSION: 11.0`)
2. Increment patch: `11.0` → `11.1`
3. Update `VERSION` and `UPDATED` fields
4. Commit: `docs: Update documentation v11.1`

## Output: Health Report

```markdown
# Documentation Health Report
Generated: YYYY-MM-DDTHH:MM:SS

## Summary
- Docs scanned: X
- File refs checked: X
- Function refs checked: X
- Issues found: X
- Auto-fixed: X

## Auto-Fixes Applied
| Doc | Issue | Fix |
|-----|-------|-----|

## Issues Requiring Manual Review
| Doc | Issue | Recommendation |
|-----|-------|----------------|

## DOMAIN_INDEX Updates
| Action | Entry |
|--------|-------|
```

## Validation Workflow

```
1. SCAN
   Read all .md files in Documentation/
   Extract references using patterns from ref_patterns.md

2. VALIDATE
   For each file ref: Glob to check existence
   For each function ref: Grep to find definition
   Compare DOMAIN_INDEX vs actual files

3. CATEGORIZE
   - Can auto-fix: moved files, missing index entries
   - Needs approval: renamed items (fuzzy match)
   - Manual review: deleted items

4. APPLY FIXES
   Update doc files with corrected paths
   Add missing DOMAIN_INDEX entries
   Present approval prompts for fuzzy matches

5. REPORT
   Generate health report
   List all actions taken
   List remaining issues

6. VERSION (if changes made)
   Bump CLAUDE.md version
   Commit all changes
```

## Key Paths

| Purpose | Path |
|---------|------|
| Main documentation | `.claude/CLAUDE.md` |
| Domain docs | `.claude/Documentation/` |
| Domain index | `.claude/skills/context-router/DOMAIN_INDEX.md` |
| Reference patterns | `references/ref_patterns.md` |
| Domain templates | `references/domain_template.md` |
