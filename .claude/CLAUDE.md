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

## Project Map

### Complete Directory Structure

> For the full directory tree, see: [Documentation/Architecture/DIRECTORY_STRUCTURE.md](./Documentation/Architecture/DIRECTORY_STRUCTURE.md)

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `react` 18.2 | UI library |
| `@supabase/supabase-js` | Database client |
| `@react-google-maps/api` | Google Maps integration |
| `framer-motion` | Animations |
| `lucide-react` | Icons |
| `date-fns` / `date-fns-tz` | Date handling |
| `react-hook-form` + `zod` | Form validation |
| `lottie-react` | Lottie animations |

### Architectural Decisions

| Pattern | Description |
|---------|-------------|
| **Islands Architecture** | Each page is an independent React root, not a SPA |
| **Hollow Components** | Page components contain NO logic, delegate to `useXxxPageLogic` hooks |
| **Four-Layer Logic** | Business logic in `logic/` separated into calculators→rules→processors→workflows |
| **Route Registry** | Single file (`routes.config.js`) defines all routes, generates Cloudflare configs |
| **Edge Function Proxy** | All Bubble API calls go through Edge Functions (API keys server-side) |
| **Action-Based Routing** | Edge Functions use `{ action, payload }` pattern, not REST |

---

## Architecture Overview

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (app/)                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Entry Points (*.jsx)                                                    │
│       ↓                                                                  │
│  Page Components (islands/pages/)                                        │
│       ↓ (Hollow Component Pattern)                                       │
│  Page Logic Hooks (useXxxPageLogic)                                      │
│       ↓                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    LOGIC LAYER (logic/)                          │    │
│  │  Calculators → Rules → Processors → Workflows                    │    │
│  │  (pure math)   (bool)   (transform)   (orchestrate)              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│       ↓                                                                  │
│  Library Utilities (lib/)                                                │
│  - auth.js, supabase.js, bubbleAPI.js                                   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS (11 functions)                │
├─────────────────────────────────────────────────────────────────────────┤
│  POST /functions/v1/{function}                                           │
│  Body: { "action": "...", "payload": {...} }                            │
│                                                                          │
│  auth-user/        → Supabase Auth (login/signup/reset)                 │
│  bubble-proxy/     → Proxies Bubble API calls                           │
│  listing/          → Listing CRUD with Supabase                         │
│  proposal/         → Proposal operations with Bubble sync               │
│  ai-gateway/       → OpenAI completions (streaming + non-streaming)     │
│  ai-signup-guest/  → AI-powered guest signup                            │
│  ai-parse-profile/ → AI profile parsing                                 │
│  bubble_sync/      → Bubble↔Supabase bidirectional sync                 │
│  communications/   → Communication handling                              │
│  pricing/          → Pricing calculations                                │
│  slack/            → Slack notifications                                 │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              ↓                                 ↓
┌──────────────────────────┐    ┌──────────────────────────┐
│   SUPABASE (PostgreSQL)  │    │   BUBBLE.IO (Legacy)     │
│   93 tables              │    │   Source of truth for:   │
│   - listing              │    │   - proposals            │
│   - user                 │    │   - workflows            │
│   - proposal (replica)   │    │                          │
│   - zat_* (lookups)      │    │                          │
└──────────────────────────┘    └──────────────────────────┘
```

### Route Registry System
**Single Source of Truth**: `app/src/routes.config.js`

- All routes defined in one file
- Auto-generates `_redirects` and `_routes.json` via `bun run generate-routes`
- Vite dev/preview servers read from registry
- Run `bun run generate-routes` after adding/modifying routes

### Four-Layer Logic (`app/src/logic/`)
| Layer | Purpose | Naming | Example |
|-------|---------|--------|---------|
| **Calculators** | Pure math | `calculate*`, `get*` | `calculateFourWeekRent.js` |
| **Rules** | Boolean predicates | `can*`, `is*`, `has*`, `should*` | `canCancelProposal.js` |
| **Processors** | Data transformation | `adapt*`, `extract*`, `process*` | `adaptDaysFromBubble.js` |
| **Workflows** | Orchestration | `*Workflow` | `cancelProposalWorkflow.js` |

### Edge Functions Pattern
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

#### Architecture
| File | Description |
|------|-------------|
| [Architecture/DIRECTORY_STRUCTURE.md](./Documentation/Architecture/DIRECTORY_STRUCTURE.md) | Complete project directory tree |

#### Auth
| File | Description |
|------|-------------|
| [Auth/LOGIN_FLOW.md](./Documentation/Auth/LOGIN_FLOW.md) | Login flow, UI states, validation |
| [Auth/SIGNUP_FLOW.md](./Documentation/Auth/SIGNUP_FLOW.md) | Guest/host signup flow |
| [Auth/AUTH_USER_EDGE_FUNCTION.md](./Documentation/Auth/AUTH_USER_EDGE_FUNCTION.md) | Auth Edge Function details |

#### Backend (EDGE Functions)
| File | Description |
|------|-------------|
| [Backend(EDGE - Functions)/README.md](./Documentation/Backend(EDGE%20-%20Functions)/README.md) | Edge functions overview |
| [Backend(EDGE - Functions)/QUICK_REFERENCE.md](./Documentation/Backend(EDGE%20-%20Functions)/QUICK_REFERENCE.md) | Quick reference |
| [Backend(EDGE - Functions)/SEQUENCE_DIAGRAMS.md](./Documentation/Backend(EDGE%20-%20Functions)/SEQUENCE_DIAGRAMS.md) | Sequence diagrams |
| [Backend(EDGE - Functions)/AUTH_USER.md](./Documentation/Backend(EDGE%20-%20Functions)/AUTH_USER.md) | Auth user function |
| [Backend(EDGE - Functions)/BUBBLE_PROXY.md](./Documentation/Backend(EDGE%20-%20Functions)/BUBBLE_PROXY.md) | Bubble proxy function |
| [Backend(EDGE - Functions)/BUBBLE_SYNC.md](./Documentation/Backend(EDGE%20-%20Functions)/BUBBLE_SYNC.md) | Bubble sync function |
| [Backend(EDGE - Functions)/AI_GATEWAY.md](./Documentation/Backend(EDGE%20-%20Functions)/AI_GATEWAY.md) | AI gateway function |
| [Backend(EDGE - Functions)/AI_SIGNUP_GUEST.md](./Documentation/Backend(EDGE%20-%20Functions)/AI_SIGNUP_GUEST.md) | AI signup guest function |
| [Backend(EDGE - Functions)/LISTING.md](./Documentation/Backend(EDGE%20-%20Functions)/LISTING.md) | Listing function |
| [Backend(EDGE - Functions)/PROPOSAL.md](./Documentation/Backend(EDGE%20-%20Functions)/PROPOSAL.md) | Proposal function |
| [Backend(EDGE - Functions)/SLACK.md](./Documentation/Backend(EDGE%20-%20Functions)/SLACK.md) | Slack function |
| [Backend(EDGE - Functions)/SHARED_UTILITIES.md](./Documentation/Backend(EDGE%20-%20Functions)/SHARED_UTILITIES.md) | Shared utilities |

#### Database
| File | Description |
|------|-------------|
| [Database/REFERENCE_TABLES_FK_FIELDS.md](./Documentation/Database/REFERENCE_TABLES_FK_FIELDS.md) | Reference tables and FK fields |
| [Database/DATABASE_TABLES_DETAILED.md](./Documentation/Database/DATABASE_TABLES_DETAILED.md) | Detailed table documentation |
| [Database/DATABASE_OPTION_SETS_QUICK_REFERENCE.md](./Documentation/Database/DATABASE_OPTION_SETS_QUICK_REFERENCE.md) | Option sets quick reference |
| [Database/OPTION_SETS_DETAILED.md](./Documentation/Database/OPTION_SETS_DETAILED.md) | Option sets documentation |

#### External Integrations
| File | Description |
|------|-------------|
| [External/GOOGLE_MAPS_API_IMPLEMENTATION.md](./Documentation/External/GOOGLE_MAPS_API_IMPLEMENTATION.md) | Google Maps integration guide |
| [External/HOTJAR_IMPLEMENTATION.md](./Documentation/External/HOTJAR_IMPLEMENTATION.md) | Hotjar analytics implementation |

#### Routing
| File | Description |
|------|-------------|
| [Routing/ROUTING_GUIDE.md](./Documentation/Routing/ROUTING_GUIDE.md) | **MUST READ** for adding/modifying routes |

#### Pages (28 documented)
| File | Description |
|------|-------------|
| [Pages/HOME_QUICK_REFERENCE.md](./Documentation/Pages/HOME_QUICK_REFERENCE.md) | Homepage |
| [Pages/SEARCH_QUICK_REFERENCE.md](./Documentation/Pages/SEARCH_QUICK_REFERENCE.md) | Search page |
| [Pages/VIEW_SPLIT_LEASE_QUICK_REFERENCE.md](./Documentation/Pages/VIEW_SPLIT_LEASE_QUICK_REFERENCE.md) | Listing detail page |
| [Pages/GUEST_PROPOSALS_QUICK_REFERENCE.md](./Documentation/Pages/GUEST_PROPOSALS_QUICK_REFERENCE.md) | Guest proposals page |
| [Pages/SELF_LISTING_QUICK_REFERENCE.md](./Documentation/Pages/SELF_LISTING_QUICK_REFERENCE.md) | Self listing wizard |
| [Pages/LISTING_DASHBOARD_QUICK_REFERENCE.md](./Documentation/Pages/LISTING_DASHBOARD_QUICK_REFERENCE.md) | Listing dashboard |
| [Pages/LISTING_DASHBOARD_PAGE_CONTEXT.md](./Documentation/Pages/LISTING_DASHBOARD_PAGE_CONTEXT.md) | Listing dashboard context |
| [Pages/HOST_OVERVIEW_QUICK_REFERENCE.md](./Documentation/Pages/HOST_OVERVIEW_QUICK_REFERENCE.md) | Host overview |
| [Pages/FAVORITE_LISTINGS_QUICK_REFERENCE.md](./Documentation/Pages/FAVORITE_LISTINGS_QUICK_REFERENCE.md) | Favorite listings |
| [Pages/RENTAL_APPLICATION_QUICK_REFERENCE.md](./Documentation/Pages/RENTAL_APPLICATION_QUICK_REFERENCE.md) | Rental application |
| [Pages/ACCOUNT_PROFILE_QUICK_REFERENCE.md](./Documentation/Pages/ACCOUNT_PROFILE_QUICK_REFERENCE.md) | Account profile |
| ...and 17 more page references |

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

## Key Files Quick Reference

| What you need | Where to find it |
|---------------|------------------|
| Add/modify routes | `app/src/routes.config.js` |
| Vite build config | `app/vite.config.js` |
| App constants | `app/src/lib/constants.js` |
| App configuration | `app/src/lib/config.js` |
| Authentication | `app/src/lib/auth.js` |
| Supabase client | `app/src/lib/supabase.js` |
| Supabase utilities | `app/src/lib/supabaseUtils.js` |
| Data lookups (neighborhoods, amenities) | `app/src/lib/dataLookups.js` |
| Navigation helpers | `app/src/lib/navigation.js` |
| Day index conversion | `app/src/logic/processors/external/adaptDays*.js` |
| Proposal business rules | `app/src/logic/rules/proposals/` |
| Pricing calculations | `app/src/logic/calculators/pricing/` |
| Proposal data fetching | `app/src/lib/proposalDataFetcher.js` |
| Proposal utilities | `app/src/lib/proposals/` |
| Edge Function shared code | `supabase/functions/_shared/` |
| Bubble sync service | `supabase/functions/_shared/bubbleSync.ts` |
| Slack service | `app/src/lib/slackService.js` |
| Hotjar analytics | `app/src/lib/hotjar.js` |

---

## Statistics

| Category | Count |
|----------|-------|
| HTML Entry Points | 31 |
| JSX Entry Points | 29 |
| Page Components | 25+ |
| Shared Components | 50+ |
| Modal Components | 13 |
| Logic Layer Files | 55+ |
| Library Utilities | 32 |
| Edge Functions | 11 |
| Shared Edge Utilities | 10 |
| CSS Files | 40+ |
| Documentation Files | 100+ |

---

**VERSION**: 7.0 | **UPDATED**: 2025-12-11
