# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Split Lease** is a flexible rental marketplace for NYC properties built with:
- **Frontend**: React 18 + Vite (Islands Architecture) in `app/`
- **Backend**: Supabase (PostgreSQL + Edge Functions) in `supabase/`
- **Legacy Backend**: Bubble.io (proxied through Edge Functions)
- **Deployment**: Cloudflare Pages

## Development Commands

```bash
# From repository root (preferred)
bun run dev          # Start dev server on port 8000
bun run build        # Production build
bun run preview      # Preview production build

# From app/ directory
cd app
bun install          # Install dependencies
bun run dev          # Start dev server
bun run build        # Build for production

# Supabase Edge Functions
supabase functions serve                    # Local development
supabase functions deploy <function-name>   # Deploy single function
supabase functions deploy                   # Deploy all functions
```

## Key Architecture Decisions

### Islands Architecture
Each page is an independent React root mounted to an HTML file:
- Entry points: `app/src/*.jsx` files
- Pages: `app/src/islands/pages/`
- Shared components: `app/src/islands/shared/`

### Four-Layer Logic System (`app/src/logic/`)
| Layer | Purpose | Naming |
|-------|---------|--------|
| **Calculators** | Pure math functions | `calculate*`, `get*` |
| **Rules** | Boolean predicates | `can*`, `is*`, `has*`, `should*` |
| **Processors** | Data transformation | `adapt*`, `extract*`, `format*` |
| **Workflows** | Orchestration | `*Workflow` |

### Day Indexing Convention (CRITICAL)
| System | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|--------|--------|--------|---------|-----------|----------|--------|----------|
| **Internal (JS)** | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| **Bubble API** | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

**Always convert at boundaries:**
```javascript
import { adaptDaysFromBubble } from 'src/logic/processors/external/adaptDaysFromBubble.js'
import { adaptDaysToBubble } from 'src/logic/processors/external/adaptDaysToBubble.js'
```

## Core Principles

### No Fallback Mechanisms
- Return real data or `null`/empty arrays
- Never use hardcoded demo data or compatibility layers
- Let errors surface to reveal real problems

### Match Solution to Scale
- Build for current requirements, not hypothetical futures
- Simple, direct solutions over clever abstractions

### MCP Tool Usage
**Always invoke MCP tools (Playwright, Supabase, etc.) through the `mcp-tool-specialist` subagent.**

### Supabase Database
- Do NOT modify database/tables without explicit instruction
- When Edge Functions are updated, remind about manual deployments

## Key File Locations

| Purpose | Location |
|---------|----------|
| App architecture guide | `app/CLAUDE.md` |
| Edge Functions guide | `supabase/CLAUDE.md` |
| App constants | `app/src/lib/constants.js` |
| Authentication | `app/src/lib/auth.js` |
| Supabase client | `app/src/lib/supabase.js` |
| Vite config | `app/vite.config.js` |
| Route registry | `app/src/routes.config.js` |

## Edge Functions (`supabase/functions/`)

| Function | Purpose |
|----------|---------|
| `bubble-proxy` | General Bubble API proxy (listings, messaging, photos, favorites) |
| `auth-user` | Authentication (Supabase Auth for login/signup, Bubble for validate) |
| `ai-gateway` | OpenAI completions (streaming + non-streaming) |
| `ai-signup-guest` | AI-powered guest signup flow |
| `slack` | Slack integration for FAQ inquiries |

## Git Workflow

- **Main branch**: `main` (production)
- **Commit after each change** (do NOT push unless asked)
- **Commit style**: Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Analysis documents go to `.claude/plans/New/` with `YYYYMMDDHHMMSS` prefix
- Implemented plans move to `.claude/plans/Done/`

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/deploy` | Build, deploy to Cloudflare Pages, push to GitHub |
| `/preview` | Build and preview locally |
| `/supabase` | Supabase-related operations |

## Environment Variables

```bash
# Required (in app/.env)
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_GOOGLE_MAPS_API_KEY=<google-maps-api-key>
```

**Note**: Bubble API keys are stored server-side in Supabase Secrets, NOT in frontend environment variables.

## Component Patterns

### Hollow Component Pattern
Pages delegate all logic to hooks:
```javascript
export default function ViewSplitLeasePage() {
  const { listing, selectedDays, handleDaySelection } = useViewSplitLeasePageLogic()
  return <div>{/* Pure rendering */}</div>
}
```

### CSS Styling
- Variables: `app/src/styles/variables.css`
- Classes: `kebab-case` (`.hero-section`, `.btn-primary`)
- Colors: Always use CSS variables (`--color-primary`, `--color-secondary`)

## Testing Considerations

When modifying code, verify:
- [ ] Proposal code handles null/undefined and checks status
- [ ] Day indexing is correct (0-based internal, convert for API)
- [ ] Auth code clears data on failure and uses Edge Functions
- [ ] UI business logic is in hooks, not components
