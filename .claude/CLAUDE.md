# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Split Lease

React 18 + Vite Islands Architecture | Supabase Edge Functions | Cloudflare Pages

A flexible rental marketplace for NYC properties enabling split scheduling, repeat stays, and proposal-based booking.

---

## Commands

```bash
# Development (from project root)
bun run dev              # Start dev server at http://localhost:8000
bun run build            # Production build (runs generate-routes first)
bun run preview          # Preview production build locally
bun run generate-routes  # Regenerate _redirects and _routes.json

# From app/ directory (alternative)
cd app && bun run dev    # Same as above

# Supabase Edge Functions
supabase functions serve           # Serve ALL functions locally (with hot reload)
supabase functions serve <name>    # Serve single function
supabase functions deploy          # Deploy all functions (production)
supabase functions deploy <name>   # Deploy single function
supabase functions logs <name>     # View function logs

# Supabase Local Development
supabase start           # Start local Supabase (Postgres, Auth, etc.)
supabase stop            # Stop local Supabase
supabase db reset        # Reset local database to migrations
supabase migration new <name>  # Create new migration

# Cloudflare Deployment
/deploy                  # Claude slash command for deployment
npx wrangler pages deploy dist --project-name splitlease  # Manual deploy

# Linting
# Frontend (from app/ directory)
bun run lint              # Check for issues
bun run lint:fix          # Auto-fix where possible
bun run lint:check        # CI mode (fails on warnings)

# Edge Functions (from project root, requires Deno)
deno lint supabase/functions/        # Check TypeScript functions
deno fmt --check supabase/functions/ # Check formatting
```

---

## Architecture

### Tech Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (app/)                          │
│  React 18 + Vite | Islands Architecture | Cloudflare Pages     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  public/*.html    ──→  src/*.jsx (entry)  ──→  islands/pages/  │
│  (27 HTML files)       (mount React)           (page components)│
│                                                                 │
│  src/logic/  ────────────────────────────────────────────────  │
│  ├── calculators/   (pure math: calculate*, get*)              │
│  ├── rules/         (boolean predicates: is*, can*, should*)   │
│  ├── processors/    (data transform: adapt*, format*, process*)│
│  └── workflows/     (orchestration: *Workflow)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (supabase/functions/)                  │
│           Supabase Edge Functions (Deno/TypeScript)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  auth-user/      Login, signup, password reset (Supabase Auth) │
│  bubble-proxy/   Proxy to Bubble.io API (legacy backend)       │
│  proposal/       Proposal CRUD with queue-based Bubble sync    │
│  listing/        Listing CRUD with atomic Bubble sync          │
│  ai-gateway/     OpenAI proxy with prompt templating           │
│  bubble_sync/    Queue processor for Supabase→Bubble sync      │
│  messages/       Real-time messaging threads                    │
│                                                                 │
│  _shared/        CORS, errors, validation, Slack, sync utils   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  Supabase PostgreSQL  ←──→  Bubble.io (legacy, source of truth)│
│  (replica + native)        (migrating away)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Core Patterns

| Pattern | Description |
|---------|-------------|
| **Islands Architecture** | Each page is an independent React root, not a SPA. Full page loads between pages. |
| **Hollow Components** | Page components contain NO logic, delegate everything to `useXxxPageLogic` hooks |
| **Four-Layer Logic** | Business logic separated into `calculators` → `rules` → `processors` → `workflows` |
| **Route Registry** | Single source of truth in `app/src/routes.config.js` - generates Vite inputs, Cloudflare _redirects |
| **Action-Based Edge Functions** | All Edge Functions use `{ action, payload }` request pattern |
| **Queue-Based Sync** | Supabase→Bubble sync via `sync_queue` table, processed by cron job |

### Day Indexing

All day indices use JavaScript's 0-based standard (matching `Date.getDay()`):

| Day | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|-----|-----|-----|-----|-----|-----|-----|-----|
| Index | 0 | 1 | 2 | 3 | 4 | 5 | 6 |

The database stores days natively in this format. No conversion needed.

---

## Key Files

| What you need | Where to find it |
|---------------|------------------|
| Route Registry | `app/src/routes.config.js` |
| Vite Config | `app/vite.config.js` |
| ESLint Config | `app/eslint.config.js` |
| Deno Lint Config | `supabase/functions/deno.json` |
| Authentication | `app/src/lib/auth.js` |
| Supabase client | `app/src/lib/supabase.js` |
| Day utilities | `app/src/lib/dayUtils.js` |
| Business rules | `app/src/logic/rules/` |
| Pricing calculations | `app/src/logic/calculators/pricing/` |
| Edge Functions | `supabase/functions/` |
| Shared Edge utilities | `supabase/functions/_shared/` |
| Page components | `app/src/islands/pages/` |
| Shared components | `app/src/islands/shared/` |

---

## Documentation Hierarchy

| File | Use For |
|------|---------|
| [miniCLAUDE.md](./Documentation/miniCLAUDE.md) | Quick reference, simple tasks |
| [largeCLAUDE.md](./Documentation/largeCLAUDE.md) | Full context, complex tasks |
| [app/CLAUDE.md](../app/CLAUDE.md) | Frontend architecture details |
| [supabase/CLAUDE.md](../supabase/CLAUDE.md) | Edge Functions reference |

---

## Rules

### DO
- Use Edge Functions for all API calls (never call external APIs from frontend)
- Run `bun run generate-routes` after any route changes in `routes.config.js`
- Commit after each meaningful change (do not push unless asked)
- Use 0-indexed days (0=Sunday through 6=Saturday) everywhere
- Use the four-layer logic architecture for business logic
- Use `mcp-tool-specialist` subagent for all MCP tool invocations
- **Send only changed fields when updating database records** (prevents FK constraint violations)
- **Log full error details** on database errors: `code`, `message`, `details`, `hint`
- Test edit flows with listings that have null FK values (legacy data)
- **Informational text triggers**: When adding a `?` icon to open informational text modals, make the accompanying text label clickable too (not just the `?`). Wrap both the text and `?` in a single clickable container.
- **ALWAYS invoke `/fp-rater` skill after creating or updating code files** - Output the FP rating table at the bottom of your response (table only, no explanations)

### DON'T
- Expose API keys in frontend code
- Use `git push --force` or push to main without review
- Modify database tables without explicit instruction
- Add fallback mechanisms when things fail - surface the real error
- Over-engineer for hypothetical future needs
- Manually edit `_redirects` or `_routes.json` (auto-generated)
- **Send entire formData to updateListing** - always filter to changed fields only

### Database Update Pattern (CRITICAL)

The `listing` table has 12 FK constraints. Sending unchanged FK fields (even null) triggers validation:

```javascript
// ❌ BAD - Causes 409 errors when FK fields have null/invalid values
await updateListing(id, formData);

// ✅ GOOD - Only sends fields that changed
const changedFields = {};
for (const [key, value] of Object.entries(formData)) {
  if (value !== originalData[key]) {
    changedFields[key] = value;
  }
}
await updateListing(id, changedFields);
```

**PostgREST Error Codes**: 409 + code `23503` = FK violation, `23505` = unique violation

See: `.claude/plans/Documents/20251217091827-edit-listing-409-regression-report.md`

---

## Plans Directory

```
.claude/plans/
├── New/        # Active plans awaiting execution
├── Done/       # Completed plans (moved after implementation)
└── Documents/  # Analysis documents (prefix: YYYYMMDDHHMMSS)
```

> **⚠️ CONTEXT LOADING RULE**: Do NOT automatically scan, glob, or load files from `.claude/plans/` at the start of a conversation. This folder contains many historical files that may be outdated and will overload initial context. Only access specific plan files when:
> - The user explicitly references a plan by name/path
> - You need to write a NEW plan to `.claude/plans/New/`
> - The user asks you to execute a specific plan
> - The user explicitly asks to review the plans folder

---

## Task Orchestration Workflow (MANDATORY)

> **⚠️ ENFORCEMENT RULE**: For ANY non-trivial task, you MUST invoke the appropriate subagent using the Task tool. Direct implementation without subagent orchestration is PROHIBITED. This is not optional guidance—it is a hard requirement.

For ANY non-trivial task, follow this orchestration pipeline:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TASK ORCHESTRATION PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 1: CLASSIFY → task-classifier (haiku)                                │
│     Input: Raw user request                                                 │
│     Output: BUILD | DEBUG | CLEANUP | DESIGN classification + reformatted   │
│                                                                             │
│  Phase 2: PLAN → Based on classification:                                   │
│     ├─ BUILD   → implementation-planner (opus)                              │
│     ├─ DEBUG   → debug-analyst (opus)                                       │
│     ├─ CLEANUP → cleanup-planner (opus)                                     │
│     └─ DESIGN  → design-planner (opus)                                      │
│     Input: Classified task + miniCLAUDE.md (or largeCLAUDE.md for complex)  │
│     Output: Plan file in .claude/plans/New/                                 │
│                                                                             │
│  Phase 3: EXECUTE → plan-executor (opus)                                    │
│     Input: Plan path + referenced files from plan                           │
│     Output: Implemented changes + changelog                                 │
│                                                                             │
│  Phase 4: REVIEW → input-reviewer (opus)                                    │
│     Input: Changelog + plan file + original query                           │
│     Output: Verdict (PASS | NEEDS ATTENTION | FAIL)                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **⚠️ LOCKED PIPELINE RULE**: Once `task-classifier` is invoked, ALL 4 phases MUST execute in sequence. You are **PROHIBITED** from invoking ANY other subagent (such as `mcp-tool-specialist`, `context-lookup`, `codebase-explorer`, etc.) until the pipeline completes Phase 4. The pipeline is a sealed unit — no external agents may be injected mid-sequence.

### Phase Transition Rules (STRICT)

> **⛔ PHASE 1 → PHASE 2 CONSTRAINT**: Once `task-classifier` returns a classification, you MUST invoke **ONLY** the designated planner for that classification. No other subagent may be invoked.

| Classification Result | ONLY Permitted Next Subagent |
|----------------------|------------------------------|
| `BUILD` | `implementation-planner` — nothing else |
| `DEBUG` | `debug-analyst` — nothing else |
| `CLEANUP` | `cleanup-planner` — nothing else |
| `DESIGN` | `design-planner` — nothing else |

**Prohibited actions after receiving classification:**
- ❌ Invoking `mcp-tool-specialist` for "additional context"
- ❌ Invoking `context-lookup` to "gather more information"
- ❌ Invoking `codebase-explorer` to "understand the codebase better"
- ❌ Invoking any other subagent for any reason
- ❌ Performing direct tool calls (Grep, Glob, Read) instead of proceeding to the planner

**The classification output IS the input for the planner.** Proceed immediately to Phase 2 with the designated planner.

### Context Selection Guide

| Task Complexity | Context File to Use |
|-----------------|---------------------|
| Single file change, simple feature | [miniCLAUDE.md](./Documentation/miniCLAUDE.md) |
| Multi-file changes, complex features | [largeCLAUDE.md](./Documentation/largeCLAUDE.md) |
| Database/Edge Function changes | largeCLAUDE.md + relevant docs |

### Agent Reference

| Agent | Purpose | Model | Location |
|-------|---------|-------|----------|
| `task-classifier` | Classify as BUILD/DEBUG/CLEANUP/DESIGN | haiku | [agents/task-classifier.md](./agents/task-classifier.md) |
| `implementation-planner` | Plan new features/changes | opus | [agents/implementation-planner.md](./agents/implementation-planner.md) |
| `debug-analyst` | Investigate bugs/issues | opus | [agents/debug-analyst.md](./agents/debug-analyst.md) |
| `cleanup-planner` | Plan refactoring/cleanup | opus | [agents/cleanup-planner.md](./agents/cleanup-planner.md) |
| `design-planner` | Plan UI/UX implementations | opus | [agents/design-planner.md](./agents/design-planner.md) |
| `plan-executor` | Execute plans from .claude/plans/ | opus | [agents/plan-executor.md](./agents/plan-executor.md) |
| `input-reviewer` | Review/judge implementations | opus | [agents/input-reviewer.md](./agents/input-reviewer.md) |
| `context-lookup` | Read-only codebase analysis | haiku | [agents/context-lookup.md](./agents/context-lookup.md) |

### Simple Questions

For simple questions (not requiring code changes), answer directly without the orchestration pipeline.

### Lookup Tasks (BYPASS ORCHESTRATION)

For **lookup, exploration, or research tasks** that do NOT modify code, **skip the orchestration pipeline entirely** and invoke the appropriate subagent directly:

| Task Type | Direct Subagent | Examples |
|-----------|-----------------|----------|
| Codebase lookup/analysis | `context-lookup` | "Where is X implemented?", "How does Y work?", "What depends on Z?" |
| Codebase exploration | `codebase-explorer` or `Explore` | "Give me an overview of directory X", "What's the project structure?" |
| Documentation lookup | `claude-code-guide` | "How do I use Claude Code feature X?", "What MCP tools are available?" |

**No classification, planning, or review needed** — just invoke the lookup subagent and return the result.

> **Preferred agent for most lookups**: Use `context-lookup` (haiku model) for fast, read-only information retrieval. It is optimized for answering questions about existing code without modification.

### Mandatory Subagent Invocation Rules (For Code-Modifying Tasks)

**You MUST use the Task tool to invoke the appropriate subagent for the following task types:**

| Task Type | Required Subagent Chain (ALL 4 PHASES) | When to Use |
|-----------|----------------------------------------|-------------|
| New feature, enhancement, code change | `task-classifier` → `implementation-planner` → `plan-executor` → `input-reviewer` | Any BUILD task |
| Bug investigation, error analysis | `task-classifier` → `debug-analyst` → `plan-executor` → `input-reviewer` | Any DEBUG task |
| Refactoring, cleanup, consolidation | `task-classifier` → `cleanup-planner` → `plan-executor` → `input-reviewer` | Any CLEANUP task |
| UI/UX implementation from visual references | `task-classifier` → `design-planner` → `plan-executor` → `input-reviewer` | Any DESIGN task |

> **⛔ LOCKED PIPELINE**: Once `task-classifier` begins, you MUST complete all 4 phases. You are **PROHIBITED** from invoking any other subagent (e.g., `mcp-tool-specialist`, `context-lookup`, `codebase-explorer`) until the pipeline completes.

### Subagents Outside the Pipeline

These subagents may ONLY be invoked **before** starting the pipeline or **after** the pipeline completes Phase 4:

| Subagent | When to Use |
|----------|-------------|
| `mcp-tool-specialist` | Any MCP operation (Supabase, Playwright, etc.) — NEVER mid-pipeline |
| `context-lookup` | Read-only codebase analysis — NEVER mid-pipeline |
| `codebase-explorer` / `Explore` | Codebase exploration — NEVER mid-pipeline |

**Violation of these rules is unacceptable.** If uncertain whether a task is "trivial" or "non-trivial," default to using the orchestration pipeline.

---

**VERSION**: 11.3 | **UPDATED**: 2026-01-07
