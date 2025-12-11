# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Split Lease - Flexible Rental Marketplace

React 18 + Vite Islands Architecture | Supabase Edge Functions | Cloudflare Pages

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

## Architecture Overview

### Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite (Islands Architecture, 27 HTML entry points) |
| Backend | Supabase (PostgreSQL + 5 Edge Functions) |
| Legacy Backend | Bubble.io (via Edge Function proxies) |
| Hosting | Cloudflare Pages |

### Project Structure
```
Split Lease/
├── app/                     # React frontend
│   ├── public/              # HTML entry points, assets, _redirects
│   ├── src/
│   │   ├── islands/         # React components (pages/, shared/, modals/)
│   │   ├── logic/           # Four-layer business logic
│   │   ├── lib/             # Utilities (auth, supabase, constants)
│   │   └── styles/          # CSS (variables.css, components/)
│   └── vite.config.js       # Build config with routing plugins
├── supabase/
│   └── functions/           # Edge Functions (Deno 2)
│       ├── bubble-proxy/    # Bubble API proxy
│       ├── auth-user/       # Authentication
│       ├── ai-gateway/      # OpenAI completions
│       ├── ai-signup-guest/ # AI signup flow
│       └── _shared/         # Shared utilities
└── .claude/
    ├── Documentation/       # Detailed docs by domain
    ├── commands/            # Custom slash commands
    └── plans/               # Implementation plans
```

### Route Registry System
**Single Source of Truth**: `app/src/routes.config.js`

- All routes defined in one file
- Auto-generates `_redirects` and `_routes.json` via `bun run generate-routes`
- Vite dev/preview servers read from registry
- Run `bun run generate-routes` after adding/modifying routes

### Four-Layer Logic (`app/src/logic/`)
| Layer | Purpose | Naming |
|-------|---------|--------|
| **Calculators** | Pure math functions | `calculate*`, `get*` |
| **Rules** | Boolean predicates | `can*`, `is*`, `has*`, `should*` |
| **Processors** | Data transformation | `adapt*`, `extract*`, `process*`, `format*` |
| **Workflows** | Orchestration | `*Workflow` |

### Edge Functions Pattern
All functions use action-based routing:
```typescript
POST /functions/v1/{function-name}
Body: { "action": "action_name", "payload": { ... } }
Response: { "success": true, "data": { ... } } | { "success": false, "error": "..." }
```

---

## Critical Patterns

### Day Indexing (CRITICAL)
| System | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|--------|-----|-----|-----|-----|-----|-----|-----|
| JavaScript (internal) | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| Bubble API (external) | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

**Always convert at API boundaries:**
```javascript
import { adaptDaysFromBubble } from 'src/logic/processors/external/adaptDaysFromBubble.js'
import { adaptDaysToBubble } from 'src/logic/processors/external/adaptDaysToBubble.js'

const jsDays = adaptDaysFromBubble({ bubbleDays: [2, 3, 4, 5, 6] }) // → [1, 2, 3, 4, 5]
const bubbleDays = adaptDaysToBubble({ jsDays: [1, 2, 3, 4, 5] }) // → [2, 3, 4, 5, 6]
```

### Unique ID Generation
```typescript
const { data: newId } = await supabaseAdmin.rpc('generate_bubble_id');
```

### Hollow Component Pattern
Pages delegate ALL logic to hooks:
```jsx
function ViewSplitLeasePage() {
  const { listing, selectedDays, handleDaySelection } = useViewSplitLeasePageLogic()
  return <div>{/* Pure rendering */}</div>
}
```

---

## Documentation Index

### Architecture & Code Guides
| File | Description |
|------|-------------|
| [app/CLAUDE.md](../app/CLAUDE.md) | Frontend: React, components, islands pattern |
| [supabase/CLAUDE.md](../supabase/CLAUDE.md) | Backend: Edge Functions, shared utilities |
| [DATABASE_SCHEMA_OVERVIEW.md](../DATABASE_SCHEMA_OVERVIEW.md) | Complete Supabase table schemas (93 tables) |

### .claude/Documentation/

#### Auth
| File | Description |
|------|-------------|
| [Auth/LOGIN_FLOW.md](./Documentation/Auth/LOGIN_FLOW.md) | Login flow, UI states, validation |
| [Auth/SIGNUP_FLOW.md](./Documentation/Auth/SIGNUP_FLOW.md) | Guest/host signup flow |

#### Backend (EDGE Functions)
| File | Description |
|------|-------------|
| [Backend(EDGE - Functions)/README.md](./Documentation/Backend(EDGE%20-%20Functions)/README.md) | Edge functions overview |
| [Backend(EDGE - Functions)/QUICK_REFERENCE.md](./Documentation/Backend(EDGE%20-%20Functions)/QUICK_REFERENCE.md) | Quick reference |
| [Backend(EDGE - Functions)/ARCHITECTURE_ANALYSIS.md](./Documentation/Backend(EDGE%20-%20Functions)/ARCHITECTURE_ANALYSIS.md) | Architecture analysis |
| [Backend(EDGE - Functions)/BUBBLE_SYNC_SERVICE.md](./Documentation/Backend(EDGE%20-%20Functions)/BUBBLE_SYNC_SERVICE.md) | BubbleSyncService class |

#### Database
| File | Description |
|------|-------------|
| [Database/REFERENCE_TABLES_FK_FIELDS.md](./Documentation/Database/REFERENCE_TABLES_FK_FIELDS.md) | Reference tables and FK fields |
| [Database/DATABASE_TABLES_DETAILED.md](./Documentation/Database/DATABASE_TABLES_DETAILED.md) | Detailed table documentation |
| [Database/OPTION_SETS_DETAILED.md](./Documentation/Database/OPTION_SETS_DETAILED.md) | Option sets documentation |

#### Routing
| File | Description |
|------|-------------|
| [Routing/ROUTING_GUIDE.md](./Documentation/Routing/ROUTING_GUIDE.md) | **MUST READ** for adding/modifying routes |

#### Pages
| File | Description |
|------|-------------|
| [Pages/GUEST_PROPOSALS_QUICK_REFERENCE.md](./Documentation/Pages/GUEST_PROPOSALS_QUICK_REFERENCE.md) | Guest proposals page |
| [Pages/LISTING_DASHBOARD_PAGE_CONTEXT.md](./Documentation/Pages/LISTING_DASHBOARD_PAGE_CONTEXT.md) | Listing dashboard context |

---

## Rules

### DO
- Use Edge Functions for all Bubble API calls (never expose API keys in frontend)
- Store secrets in Supabase Dashboard > Project Settings > Secrets
- Run `bun run generate-routes` after route changes
- Commit after each meaningful change
- Convert day indices at system boundaries
- Use the four-layer logic architecture

### DON'T
- Expose API keys in frontend code
- Call Bubble API directly from frontend
- `git push --force` or push to main without review
- Modify database tables without explicit instruction
- Add fallback mechanisms or compatibility layers when things fail
- Over-engineer for hypothetical future needs

---

## Environment Variables

### app/.env
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_GOOGLE_MAPS_API_KEY=<google-maps-api-key>
```

### Supabase Secrets (Dashboard)
```
BUBBLE_API_BASE_URL, BUBBLE_API_KEY, OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY,
SLACK_WEBHOOK_ACQUISITION, SLACK_WEBHOOK_GENERAL
```

---

## Key Files Reference

| Purpose | Path |
|---------|------|
| Route Registry | `app/src/routes.config.js` |
| Vite Config | `app/vite.config.js` |
| Constants | `app/src/lib/constants.js` |
| Auth Utilities | `app/src/lib/auth.js` |
| Supabase Client | `app/src/lib/supabase.js` |
| Data Lookups | `app/src/lib/dataLookups.js` |
| Navigation | `app/src/lib/navigation.js` |
| Day Adapters | `app/src/logic/processors/external/adaptDays*.js` |
| Edge Function Shared | `supabase/functions/_shared/` |

---

**VERSION**: 5.0 | **UPDATED**: 2025-12-11
