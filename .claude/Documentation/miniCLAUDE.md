# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Split Lease - Flexible Rental Marketplace

React 18 + Vite Islands Architecture | Supabase Edge Functions | Cloudflare Pages

ALWAYS USE THE CODEBASE EXPLORER SUBAGENT

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

> For the full directory tree, see: [DIRECTORY_STRUCTURE.md](./Architecture/DIRECTORY_STRUCTURE.md)

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
│                    SUPABASE EDGE FUNCTIONS (29 functions)                │
├─────────────────────────────────────────────────────────────────────────┤
│  POST /functions/v1/{function}                                           │
│  Body: { "action": "...", "payload": {...} }                            │
│                                                                          │
│  CORE FUNCTIONS                                                          │
│  auth-user/           → Supabase Auth (login/signup/reset/magic-link)   │
│  listing/             → Listing CRUD with atomic Bubble sync            │
│  proposal/            → Proposal CRUD with queue-based sync             │
│  messages/            → Real-time messaging threads                      │
│                                                                          │
│  AI-POWERED                                                              │
│  ai-gateway/          → OpenAI proxy with prompt templating             │
│  ai-signup-guest/     → AI-powered guest signup                         │
│  ai-parse-profile/    → Queue-based AI profile parsing                  │
│  house-manual/        → AI-powered house manual extraction              │
│                                                                          │
│  BUBBLE INTEGRATION                                                      │
│  bubble-proxy/        → Proxies Bubble API calls                        │
│  bubble_sync/         → Queue processor for Supabase→Bubble sync        │
│                                                                          │
│  BOOKING FEATURES                                                        │
│  date-change-request/ → Lease date changes with throttling              │
│  rental-application/  → Rental application processing                   │
│  guest-payment-records/ → Guest payment schedule generation             │
│  host-payment-records/  → Host payment schedule generation              │
│  virtual-meeting/     → Virtual meeting scheduling                       │
│  cohost-request/      → Co-host request management                      │
│  cohost-request-slack-callback/ → Slack interactive callbacks           │
│                                                                          │
│  WORKFLOW ORCHESTRATION                                                  │
│  workflow-enqueue/    → Workflow definition queueing                    │
│  workflow-orchestrator/ → Sequential step execution via pgmq            │
│  reminder-scheduler/  → Reminder system with webhooks                   │
│                                                                          │
│  NOTIFICATIONS                                                           │
│  send-email/          → SendGrid proxy with templates                   │
│  send-sms/            → Twilio proxy for SMS delivery                   │
│  slack/               → Slack notifications                              │
│                                                                          │
│  UTILITIES                                                               │
│  qr-generator/        → QR code generation (PNG binary)                 │
│  pricing/             → Pricing calculations (placeholder)              │
│  communications/      → Communication handling (placeholder)            │
│  query-leo/           → Debug utility for mockup queries                │
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
| [app/CLAUDE.md](../../app/CLAUDE.md) | Frontend: React, components, islands pattern |
| [supabase/CLAUDE.md](../../supabase/CLAUDE.md) | Backend: Edge Functions, shared utilities |
| [DATABASE_SCHEMA_OVERVIEW.md](../../DATABASE_SCHEMA_OVERVIEW.md) | Complete Supabase table schemas (93 tables) |

### .claude/Documentation/

#### Architecture (2 files)
| File | Description |
|------|-------------|
| [ARCHITECTURE_GUIDE_ESM_REACT_ISLAND.md](./Architecture/ARCHITECTURE_GUIDE_ESM_REACT_ISLAND.md) | ESM React Islands architecture guide |
| [DIRECTORY_STRUCTURE.md](./Architecture/DIRECTORY_STRUCTURE.md) | Complete project directory tree |

#### Auth (3 files)
| File | Description |
|------|-------------|
| [AUTH_USER_EDGE_FUNCTION.md](./Auth/AUTH_USER_EDGE_FUNCTION.md) | Auth Edge Function details |
| [LOGIN_FLOW.md](./Auth/LOGIN_FLOW.md) | Login flow, UI states, validation |
| [SIGNUP_FLOW.md](./Auth/SIGNUP_FLOW.md) | Guest/host signup flow |

#### Backend - EDGE Functions (26 files)
| File | Description |
|------|-------------|
| [README.md](./Backend(EDGE%20-%20Functions)/README.md) | Edge functions overview (29 functions) |
| [QUICK_REFERENCE.md](./Backend(EDGE%20-%20Functions)/QUICK_REFERENCE.md) | Quick reference |
| [SEQUENCE_DIAGRAMS.md](./Backend(EDGE%20-%20Functions)/SEQUENCE_DIAGRAMS.md) | Sequence diagrams |
| [AI_GATEWAY.md](./Backend(EDGE%20-%20Functions)/AI_GATEWAY.md) | AI gateway function |
| [AI_SIGNUP_GUEST.md](./Backend(EDGE%20-%20Functions)/AI_SIGNUP_GUEST.md) | AI signup guest function |
| [AUTH_USER.md](./Backend(EDGE%20-%20Functions)/AUTH_USER.md) | Auth user function |
| [BUBBLE_PROXY.md](./Backend(EDGE%20-%20Functions)/BUBBLE_PROXY.md) | Bubble proxy function |
| [BUBBLE_SYNC.md](./Backend(EDGE%20-%20Functions)/BUBBLE_SYNC.md) | Bubble sync function |
| [COHOST_REQUEST.md](./Backend(EDGE%20-%20Functions)/COHOST_REQUEST.md) | Co-host request management |
| [COHOST_REQUEST_SLACK_CALLBACK.md](./Backend(EDGE%20-%20Functions)/COHOST_REQUEST_SLACK_CALLBACK.md) | Slack interactive callbacks |
| [DATE_CHANGE_REQUEST.md](./Backend(EDGE%20-%20Functions)/DATE_CHANGE_REQUEST.md) | Date change with throttling |
| [GUEST_PAYMENT_RECORDS.md](./Backend(EDGE%20-%20Functions)/GUEST_PAYMENT_RECORDS.md) | Guest payment schedules |
| [HOST_PAYMENT_RECORDS.md](./Backend(EDGE%20-%20Functions)/HOST_PAYMENT_RECORDS.md) | Host payment schedules |
| [HOUSE_MANUAL.md](./Backend(EDGE%20-%20Functions)/HOUSE_MANUAL.md) | AI-powered house manual |
| [LISTING.md](./Backend(EDGE%20-%20Functions)/LISTING.md) | Listing function |
| [MESSAGES.md](./Backend(EDGE%20-%20Functions)/MESSAGES.md) | Real-time messaging |
| [PROPOSAL.md](./Backend(EDGE%20-%20Functions)/PROPOSAL.md) | Proposal function |
| [QR_GENERATOR.md](./Backend(EDGE%20-%20Functions)/QR_GENERATOR.md) | QR code generation |
| [REMINDER_SCHEDULER.md](./Backend(EDGE%20-%20Functions)/REMINDER_SCHEDULER.md) | Reminder system |
| [RENTAL_APPLICATION.md](./Backend(EDGE%20-%20Functions)/RENTAL_APPLICATION.md) | Rental application |
| [SEND_EMAIL.md](./Backend(EDGE%20-%20Functions)/SEND_EMAIL.md) | SendGrid email delivery |
| [SEND_SMS.md](./Backend(EDGE%20-%20Functions)/SEND_SMS.md) | Twilio SMS delivery |
| [SHARED_UTILITIES.md](./Backend(EDGE%20-%20Functions)/SHARED_UTILITIES.md) | Shared utilities |
| [SLACK.md](./Backend(EDGE%20-%20Functions)/SLACK.md) | Slack function |
| [VIRTUAL_MEETING.md](./Backend(EDGE%20-%20Functions)/VIRTUAL_MEETING.md) | Virtual meeting scheduling |
| [WORKFLOW_SYSTEM.md](./Backend(EDGE%20-%20Functions)/WORKFLOW_SYSTEM.md) | Workflow orchestration |

#### Database (4 files)
| File | Description |
|------|-------------|
| [DATABASE_OPTION_SETS_QUICK_REFERENCE.md](./Database/DATABASE_OPTION_SETS_QUICK_REFERENCE.md) | Option sets quick reference |
| [DATABASE_TABLES_DETAILED.md](./Database/DATABASE_TABLES_DETAILED.md) | Detailed table documentation |
| [OPTION_SETS_DETAILED.md](./Database/OPTION_SETS_DETAILED.md) | Option sets documentation |
| [REFERENCE_TABLES_FK_FIELDS.md](./Database/REFERENCE_TABLES_FK_FIELDS.md) | Reference tables and FK fields |

#### External Integrations (2 files)
| File | Description |
|------|-------------|
| [GOOGLE_MAPS_API_IMPLEMENTATION.md](./External/GOOGLE_MAPS_API_IMPLEMENTATION.md) | Google Maps integration guide |
| [HOTJAR_IMPLEMENTATION.md](./External/HOTJAR_IMPLEMENTATION.md) | Hotjar analytics implementation |

#### Routing (1 file)
| File | Description |
|------|-------------|
| [ROUTING_GUIDE.md](./Routing/ROUTING_GUIDE.md) | **MUST READ** for adding/modifying routes |

#### Pages (23 files)
| File | Description |
|------|-------------|
| [404_QUICK_REFERENCE.md](./Pages/404_QUICK_REFERENCE.md) | 404 error page |
| [ABOUT_US_QUICK_REFERENCE.md](./Pages/ABOUT_US_QUICK_REFERENCE.md) | About us page |
| [ACCOUNT_PROFILE_QUICK_REFERENCE.md](./Pages/ACCOUNT_PROFILE_QUICK_REFERENCE.md) | Account profile page |
| [CAREERS_QUICK_REFERENCE.md](./Pages/CAREERS_QUICK_REFERENCE.md) | Careers page |
| [FAQ_QUICK_REFERENCE.md](./Pages/FAQ_QUICK_REFERENCE.md) | FAQ page |
| [FAVORITE_LISTINGS_QUICK_REFERENCE.md](./Pages/FAVORITE_LISTINGS_QUICK_REFERENCE.md) | Favorite listings page |
| [GUEST_PROPOSALS_QUICK_REFERENCE.md](./Pages/GUEST_PROPOSALS_QUICK_REFERENCE.md) | Guest proposals page |
| [GUEST_SUCCESS_QUICK_REFERENCE.md](./Pages/GUEST_SUCCESS_QUICK_REFERENCE.md) | Guest success page |
| [HELP_CENTER_QUICK_REFERENCE.md](./Pages/HELP_CENTER_QUICK_REFERENCE.md) | Help center page |
| [HOME_QUICK_REFERENCE.md](./Pages/HOME_QUICK_REFERENCE.md) | Homepage |
| [HOST_OVERVIEW_QUICK_REFERENCE.md](./Pages/HOST_OVERVIEW_QUICK_REFERENCE.md) | Host overview page |
| [HOST_SUCCESS_QUICK_REFERENCE.md](./Pages/HOST_SUCCESS_QUICK_REFERENCE.md) | Host success page |
| [INDEX_DEV_QUICK_REFERENCE.md](./Pages/INDEX_DEV_QUICK_REFERENCE.md) | Development index page |
| [LISTING_DASHBOARD_PAGE_CONTEXT.md](./Pages/LISTING_DASHBOARD_PAGE_CONTEXT.md) | Listing dashboard context |
| [LISTING_DASHBOARD_QUICK_REFERENCE.md](./Pages/LISTING_DASHBOARD_QUICK_REFERENCE.md) | Listing dashboard page |
| [LIST_WITH_US_QUICK_REFERENCE.md](./Pages/LIST_WITH_US_QUICK_REFERENCE.md) | List with us page |
| [POLICIES_QUICK_REFERENCE.md](./Pages/POLICIES_QUICK_REFERENCE.md) | Policies page |
| [RENTAL_APPLICATION_QUICK_REFERENCE.md](./Pages/RENTAL_APPLICATION_QUICK_REFERENCE.md) | Rental application page |
| [SEARCH_QUICK_REFERENCE.md](./Pages/SEARCH_QUICK_REFERENCE.md) | Search page |
| [SEARCH_TEST_QUICK_REFERENCE.md](./Pages/SEARCH_TEST_QUICK_REFERENCE.md) | Search test page |
| [SELF_LISTING_QUICK_REFERENCE.md](./Pages/SELF_LISTING_QUICK_REFERENCE.md) | Self listing wizard |
| [VIEW_SPLIT_LEASE_QUICK_REFERENCE.md](./Pages/VIEW_SPLIT_LEASE_QUICK_REFERENCE.md) | Listing detail page |
| [WHY_SPLIT_LEASE_QUICK_REFERENCE.md](./Pages/WHY_SPLIT_LEASE_QUICK_REFERENCE.md) | Why Split Lease page |

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
| Edge Functions | 29 |
| Shared Edge Utilities | 10 |
| CSS Files | 40+ |
| Documentation Files | 63 |

---

**VERSION**: 8.0 | **UPDATED**: 2026-01-20
