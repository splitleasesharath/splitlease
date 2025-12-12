# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Split Lease - Orchestrator Guide

React 18 + Vite Islands Architecture | Supabase Edge Functions | Cloudflare Pages

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
│     Output: BUILD | DEBUG | CLEANUP classification + reformatted task       │
│                                                                             │
│  Phase 2: PLAN → Based on classification:                                   │
│     ├─ BUILD   → implementation-planner (opus)                              │
│     ├─ DEBUG   → debug-analyst (opus)                                       │
│     └─ CLEANUP → cleanup-planner (opus)                                     │
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
| `task-classifier` | Classify as BUILD/DEBUG/CLEAN | haiku | [agents/task-classifier.md](./agents/task-classifier.md) |
| `implementation-planner` | Plan new features/changes | opus | [agents/implementation-planner.md](./agents/implementation-planner.md) |
| `debug-analyst` | Investigate bugs/issues | opus | [agents/debug-analyst.md](./agents/debug-analyst.md) |
| `cleanup-planner` | Plan refactoring/cleanup | opus | [agents/cleanup-planner.md](./agents/cleanup-planner.md) |
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

## Commands

```bash
# Development
bun run dev              # Start dev server at http://localhost:8000
bun run build            # Production build (runs generate-routes first)
bun run preview          # Preview production build locally
bun run generate-routes  # Regenerate _redirects and _routes.json

# Supabase Edge Functions
supabase functions serve           # Serve functions locally
supabase functions deploy          # Deploy all functions
supabase functions deploy <name>   # Deploy single function

# Deployment
/deploy                  # Claude slash command for deployment
```

---

## Architecture Quick Reference

### Core Patterns
| Pattern | Description |
|---------|-------------|
| **Islands Architecture** | Each page is an independent React root, not a SPA |
| **Hollow Components** | Page components contain NO logic, delegate to `useXxxPageLogic` hooks |
| **Four-Layer Logic** | `calculators` → `rules` → `processors` → `workflows` |
| **Edge Function Proxy** | All Bubble API calls go through Edge Functions |
| **Action-Based Routing** | Edge Functions use `{ action, payload }` pattern |

### Day Indexing (CRITICAL)
| System | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|--------|-----|-----|-----|-----|-----|-----|-----|
| JavaScript | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| Bubble API | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

**Always convert at API boundaries** using `adaptDaysFromBubble` / `adaptDaysToBubble`.

---

## Documentation Hierarchy

### Primary Context Files
| File | Use For |
|------|---------|
| [miniCLAUDE.md](./Documentation/miniCLAUDE.md) | Quick reference, simple tasks |
| [largeCLAUDE.md](./Documentation/largeCLAUDE.md) | Full context, complex tasks |

### Domain-Specific Documentation
| Domain | Location |
|--------|----------|
| Architecture | [Documentation/Architecture/](./Documentation/Architecture/) |
| Auth Flows | [Documentation/Auth/](./Documentation/Auth/) |
| Edge Functions | [Documentation/Backend(EDGE - Functions)/](./Documentation/Backend(EDGE%20-%20Functions)/) |
| Database | [Documentation/Database/](./Documentation/Database/) |
| External APIs | [Documentation/External/](./Documentation/External/) |
| Pages | [Documentation/Pages/](./Documentation/Pages/) |
| Routing | [Documentation/Routing/](./Documentation/Routing/) |

### Code-Level Guides
| Guide | Location |
|-------|----------|
| Frontend | [app/CLAUDE.md](../app/CLAUDE.md) |
| Backend | [supabase/CLAUDE.md](../supabase/CLAUDE.md) |
| Database Schema | [DATABASE_SCHEMA_OVERVIEW.md](../DATABASE_SCHEMA_OVERVIEW.md) |

---

## Key Files Quick Reference

| What you need | Where to find it |
|---------------|------------------|
| Routes | `app/src/routes.config.js` |
| Authentication | `app/src/lib/auth.js` |
| Supabase client | `app/src/lib/supabase.js` |
| Day conversion | `app/src/logic/processors/external/adaptDays*.js` |
| Business rules | `app/src/logic/rules/` |
| Pricing calculations | `app/src/logic/calculators/pricing/` |
| Edge Functions | `supabase/functions/` |
| Shared Edge utilities | `supabase/functions/_shared/` |

---

## Rules

### DO (MANDATORY)
- **ALWAYS invoke subagents via Task tool for non-trivial tasks** — This is non-negotiable
- **ALWAYS use `task-classifier` as the first step** for BUILD/DEBUG/CLEANUP tasks
- **ALWAYS complete ALL 4 phases** once the pipeline starts — no early exit
- **NEVER inject external subagents mid-pipeline** — the 4-phase sequence is sealed
- **ALWAYS use `mcp-tool-specialist`** for any MCP tool invocation (only before or after pipeline)
- Use Edge Functions for all Bubble API calls
- Run `bun run generate-routes` after route changes
- Commit after each meaningful change
- Convert day indices at system boundaries
- Use the four-layer logic architecture

### DON'T (PROHIBITED)
- **NEVER implement non-trivial code changes directly** — Use the subagent pipeline
- **NEVER invoke MCP tools directly** — Route through `mcp-tool-specialist`
- **NEVER skip the classification step** for tasks that modify code
- Expose API keys in frontend code
- Call Bubble API directly from frontend
- `git push --force` or push to main without review
- Modify database tables without explicit instruction
- Add fallback mechanisms when things fail
- Over-engineer for hypothetical future needs

---

## Plans Directory Structure

```
.claude/plans/
├── New/        # Active plans awaiting execution
├── Done/       # Completed plans (moved after execution)
└── Documents/  # Analysis documents (prefix: YYYYMMDDHHMMSS)
```

---

**VERSION**: 9.5 | **UPDATED**: 2025-12-12
