# Doc-Maintainer Skill Plan

**Created**: 2026-01-04
**Status**: Awaiting Approval
**Type**: New Skill

---

## Overview

A manual-trigger skill for auditing, validating, and updating Split Lease documentation with auto-fix capabilities for simple issues.

## Scope

| In Scope | Out of Scope |
|----------|--------------|
| `.claude/CLAUDE.md` | `.claude/plans/Documents/` (changelogs/analyses) |
| `.claude/Documentation/**/*.md` | `app/CLAUDE.md`, `supabase/CLAUDE.md` |
| `.claude/skills/context-router/DOMAIN_INDEX.md` | |

## Commands

| Command | Description |
|---------|-------------|
| `/doc-maintainer audit` | Full health check with auto-fix for simple issues |
| `/doc-maintainer validate <path>` | Check specific doc against codebase |
| `/doc-maintainer sync-index` | Regenerate DOMAIN_INDEX.md from actual files |
| `/doc-maintainer check-refs` | Focused reference validation only |
| `/doc-maintainer update <domain>` | Interactive domain update mode |

## Validation Checks

### 1. File Reference Validation
- Extract paths matching: `app/src/*`, `supabase/functions/*`, `public/*`
- Verify each path exists using Glob
- Status: ✅ Valid | ❌ Missing | ⚠️ Moved

### 2. Function/Class Reference Validation
- Extract references: `useXxxPageLogic`, `calculateXxx`, `processXxx`, `isXxx`, `canXxx`
- Search codebase for definitions using Grep
- Status: ✅ Found | ❌ Not found | ⚠️ Renamed

### 3. DOMAIN_INDEX Sync
- Compare Documentation/ files vs DOMAIN_INDEX entries
- Status: 📄 Not indexed | 🗑️ Orphaned | ✅ Synced

## Auto-Fix Rules

| Issue Type | Action |
|------------|--------|
| File moved (same name, different path) | ✅ Auto-update reference |
| File renamed (fuzzy match >90%) | ⚠️ Suggest fix, require approval |
| File deleted | ❌ Flag for manual review |
| Function renamed | ⚠️ Suggest fix if found similar |
| Function deleted | ❌ Flag for manual review |
| Doc not in DOMAIN_INDEX | ✅ Auto-add entry |

## Version Management

After any changes via skill:
1. Read current version from CLAUDE.md (e.g., "11.0")
2. Increment patch: 11.0 → 11.1
3. Update `VERSION` and `UPDATED` fields
4. Commit: `docs: Update documentation v11.1`

## Skill File Structure

```
.claude/skills/doc-maintainer/
├── SKILL.md                      # Main skill definition
├── scripts/
│   ├── audit.py                  # Full audit + auto-fix runner
│   ├── validate_refs.py          # Extract & verify references
│   ├── sync_index.py             # DOMAIN_INDEX regeneration
│   └── version_bump.py           # CLAUDE.md version management
└── references/
    ├── ref_patterns.md           # Regex patterns for extraction
    └── domain_template.md        # Template for DOMAIN_INDEX entries
```

## Workflow: `/doc-maintainer audit`

```
Step 1: SCAN
  └─→ Read all .md files in Documentation/
  └─→ Extract file refs (paths like app/src/*, supabase/*)
  └─→ Extract function refs (useXxx, calculateXxx, processXxx)

Step 2: VALIDATE
  └─→ Check each file ref against codebase (Glob)
  └─→ Check each function ref against codebase (Grep)
  └─→ Compare DOMAIN_INDEX entries vs actual files

Step 3: AUTO-FIX
  └─→ For moved files: update paths automatically
  └─→ For missing DOMAIN_INDEX entries: add them
  └─→ For complex issues: flag for manual review

Step 4: REPORT
  └─→ Generate health report (summary + details)
  └─→ List auto-fixes applied
  └─→ List issues requiring manual attention

Step 5: VERSION
  └─→ If changes made: bump CLAUDE.md version
  └─→ Update VERSION and UPDATED fields
  └─→ Commit changes
```

## Output Format: Audit Report

```markdown
# Documentation Health Report
Generated: YYYY-MM-DDTHH:MM:SS

## Summary
- Total docs scanned: X
- File references checked: X
- Function references checked: X
- Issues found: X
- Auto-fixed: X

## Auto-Fixes Applied
| Doc | Issue | Fix |
|-----|-------|-----|
| ... | ... | ... |

## ❌ Issues Requiring Manual Review
| Doc | Issue | Recommendation |
|-----|-------|----------------|
| ... | ... | ... |

## ⚠️ DOMAIN_INDEX Updates
| Action | Entry |
|--------|-------|
| Added | ... |
| Removed | ... |
```

## Reference Extraction Patterns

### File Paths
```regex
`(app|supabase|public)/[^`]+`
```

### Function References
```regex
\b(use[A-Z][a-zA-Z]+|calculate[A-Z][a-zA-Z]+|process[A-Z][a-zA-Z]+|is[A-Z][a-zA-Z]+|can[A-Z][a-zA-Z]+|should[A-Z][a-zA-Z]+|get[A-Z][a-zA-Z]+|format[A-Z][a-zA-Z]+|adapt[A-Z][a-zA-Z]+)\b
```

## Dependencies

- `skill-creator` skill for initialization
- `context-router` skill's DOMAIN_INDEX.md
- Glob, Grep, Read, Edit tools
- Git for version commits

## Acceptance Criteria

1. [ ] `/doc-maintainer audit` scans all Documentation/ files
2. [ ] File references are validated against codebase
3. [ ] Function references are validated against codebase
4. [ ] Simple issues (moved files) are auto-fixed
5. [ ] Complex issues are flagged for manual review
6. [ ] DOMAIN_INDEX is kept in sync with actual files
7. [ ] CLAUDE.md version auto-increments on changes
8. [ ] Changes are committed with proper message format

## Related Files

- `.claude/CLAUDE.md` (main documentation, version controlled)
- `.claude/Documentation/**/*.md` (55 domain-specific docs)
- `.claude/skills/context-router/DOMAIN_INDEX.md` (doc routing)
- `.claude/skills/skill-creator/SKILL.md` (for creating this skill)
