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

```
Split Lease/
├── app/                                    # React frontend application
│   ├── public/                             # Static assets & HTML entry points
│   │   ├── index.html                      # Homepage
│   │   ├── search.html                     # Search listings
│   │   ├── view-split-lease.html           # Listing detail (dynamic: /view-split-lease/:id)
│   │   ├── guest-proposals.html            # Guest proposal dashboard
│   │   ├── host-proposals.html             # Host proposal dashboard
│   │   ├── self-listing.html               # Host listing creation wizard
│   │   ├── listing-dashboard.html          # Host listing management
│   │   ├── account-profile.html            # User profile
│   │   ├── _redirects                      # Cloudflare routing (auto-generated)
│   │   ├── _headers                        # Cloudflare security headers
│   │   └── assets/                         # Images, fonts, Lottie animations
│   │
│   ├── src/
│   │   ├── routes.config.js                # ⭐ ROUTE REGISTRY - Single source of truth
│   │   ├── main.jsx                        # Entry: HomePage
│   │   ├── search.jsx                      # Entry: SearchPage
│   │   ├── view-split-lease.jsx            # Entry: ViewSplitLeasePage
│   │   ├── guest-proposals.jsx             # Entry: GuestProposalsPage
│   │   ├── self-listing.jsx                # Entry: SelfListingPage
│   │   ├── [17 more entry points...]
│   │   │
│   │   ├── islands/                        # React components (Islands Architecture)
│   │   │   ├── pages/                      # Page-level components
│   │   │   │   ├── HomePage.jsx
│   │   │   │   ├── SearchPage.jsx
│   │   │   │   ├── ViewSplitLeasePage.jsx
│   │   │   │   ├── GuestProposalsPage.jsx
│   │   │   │   ├── HostProposalsPage/      # Complex page with sub-components
│   │   │   │   │   ├── index.jsx
│   │   │   │   │   ├── useHostProposalsPageLogic.js
│   │   │   │   │   ├── ProposalCard.jsx
│   │   │   │   │   └── ProposalDetailsModal.jsx
│   │   │   │   ├── SelfListingPage/        # Multi-step wizard
│   │   │   │   │   ├── sections/           # Form sections (7 steps)
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── store/              # Form state management
│   │   │   │   │   └── utils/
│   │   │   │   ├── ListingDashboardPage/
│   │   │   │   │   ├── components/         # Section components
│   │   │   │   │   └── data/
│   │   │   │   └── FavoriteListingsPage/
│   │   │   │
│   │   │   ├── shared/                     # Reusable components
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Toast.jsx
│   │   │   │   ├── GoogleMap.jsx
│   │   │   │   ├── ListingCard/
│   │   │   │   ├── ListingScheduleSelector.jsx
│   │   │   │   ├── SearchScheduleSelector.jsx
│   │   │   │   ├── CreateProposalFlowV2.jsx        # Multi-step proposal wizard
│   │   │   │   ├── CreateProposalFlowV2Components/
│   │   │   │   │   ├── UserDetailsSection.jsx
│   │   │   │   │   ├── DaysSelectionSection.jsx
│   │   │   │   │   ├── MoveInSection.jsx
│   │   │   │   │   └── ReviewSection.jsx
│   │   │   │   ├── AiSignupMarketReport/           # AI-powered signup
│   │   │   │   ├── EditListingDetails/
│   │   │   │   ├── FavoriteButton/
│   │   │   │   ├── HostScheduleSelector/
│   │   │   │   ├── LoggedInAvatar/
│   │   │   │   └── VirtualMeetingManager/
│   │   │   │
│   │   │   └── modals/                     # Modal components
│   │   │       ├── CancelProposalModal.jsx
│   │   │       ├── EditProposalModal.jsx
│   │   │       ├── HostProfileModal.jsx
│   │   │       ├── MapModal.jsx
│   │   │       ├── ProposalDetailsModal.jsx
│   │   │       └── VirtualMeetingModal.jsx
│   │   │
│   │   ├── logic/                          # ⭐ FOUR-LAYER BUSINESS LOGIC
│   │   │   ├── calculators/                # Pure math functions
│   │   │   │   ├── pricing/
│   │   │   │   │   ├── calculateFourWeekRent.js
│   │   │   │   │   ├── calculatePricingBreakdown.js
│   │   │   │   │   ├── calculateReservationTotal.js
│   │   │   │   │   └── getNightlyRateByFrequency.js
│   │   │   │   └── scheduling/
│   │   │   │       ├── calculateCheckInOutDays.js
│   │   │   │       ├── calculateNightsFromDays.js
│   │   │   │       └── calculateNextAvailableCheckIn.js
│   │   │   │
│   │   │   ├── rules/                      # Boolean predicates
│   │   │   │   ├── auth/
│   │   │   │   │   ├── isProtectedPage.js
│   │   │   │   │   └── isSessionValid.js
│   │   │   │   ├── proposals/
│   │   │   │   │   ├── canCancelProposal.js
│   │   │   │   │   ├── canEditProposal.js
│   │   │   │   │   ├── canAcceptProposal.js
│   │   │   │   │   └── proposalRules.js
│   │   │   │   ├── scheduling/
│   │   │   │   │   ├── isScheduleContiguous.js
│   │   │   │   │   └── isDateBlocked.js
│   │   │   │   └── users/
│   │   │   │       ├── isHost.js
│   │   │   │       └── isGuest.js
│   │   │   │
│   │   │   ├── processors/                 # Data transformation
│   │   │   │   ├── external/               # ⭐ API BOUNDARY ADAPTERS
│   │   │   │   │   ├── adaptDaysFromBubble.js    # Bubble → JS (1-7 → 0-6)
│   │   │   │   │   └── adaptDaysToBubble.js      # JS → Bubble (0-6 → 1-7)
│   │   │   │   ├── listing/
│   │   │   │   │   └── extractListingCoordinates.js
│   │   │   │   ├── proposal/
│   │   │   │   │   └── processProposalData.js
│   │   │   │   └── user/
│   │   │   │       ├── processUserData.js
│   │   │   │       └── processUserDisplayName.js
│   │   │   │
│   │   │   └── workflows/                  # Orchestration
│   │   │       ├── auth/
│   │   │       │   ├── checkAuthStatusWorkflow.js
│   │   │       │   └── validateTokenWorkflow.js
│   │   │       ├── booking/
│   │   │       │   ├── acceptProposalWorkflow.js
│   │   │       │   └── cancelProposalWorkflow.js
│   │   │       ├── proposals/
│   │   │       │   ├── counterofferWorkflow.js
│   │   │       │   └── virtualMeetingWorkflow.js
│   │   │       └── scheduling/
│   │   │           └── validateScheduleWorkflow.js
│   │   │
│   │   ├── lib/                            # Utilities & Infrastructure
│   │   │   ├── auth.js                     # Authentication (34KB - comprehensive)
│   │   │   ├── supabase.js                 # Supabase client init
│   │   │   ├── supabaseUtils.js            # Query helpers, batch fetching
│   │   │   ├── constants.js                # App constants (days, prices, patterns)
│   │   │   ├── dataLookups.js              # Cached lookups (neighborhoods, amenities)
│   │   │   ├── navigation.js               # Route helpers (goToListing, getListingUrl)
│   │   │   ├── listingDataFetcher.js       # Complete listing enrichment
│   │   │   ├── listingService.js           # Listing CRUD operations
│   │   │   ├── priceCalculations.js        # Pricing formulas
│   │   │   ├── dayUtils.js                 # Day index conversion
│   │   │   ├── sanitize.js                 # XSS protection, input validation
│   │   │   ├── urlParams.js                # URL parameter management
│   │   │   ├── mapUtils.js                 # Google Maps helpers
│   │   │   ├── bubbleAPI.js                # Bubble API client (via Edge Functions)
│   │   │   ├── aiService.js                # AI completions client
│   │   │   ├── secureStorage.js            # Encrypted token storage
│   │   │   ├── photoUpload.js              # Photo upload handling
│   │   │   └── scheduleSelector/           # Schedule picker logic
│   │   │       ├── nightCalculations.js
│   │   │       ├── validators.js
│   │   │       └── priceCalculations.js
│   │   │
│   │   ├── styles/                         # CSS
│   │   │   ├── variables.css               # CSS custom properties (colors, spacing)
│   │   │   ├── main.css                    # Global base styles
│   │   │   └── components/                 # Component-specific styles
│   │   │       ├── header.css
│   │   │       ├── footer.css
│   │   │       ├── modal.css
│   │   │       ├── listings.css
│   │   │       └── search-page.css
│   │   │
│   │   └── config/
│   │       └── proposalStatusConfig.js     # Proposal status mappings
│   │
│   ├── functions/                          # Cloudflare Pages Functions
│   │   └── view-split-lease/[id].js        # Dynamic route handler
│   │
│   ├── vite.config.js                      # Build config with routing plugins
│   └── package.json                        # Dependencies (React, Supabase, Framer Motion)
│
├── supabase/                               # Backend
│   ├── config.toml                         # Supabase local config
│   └── functions/                          # Edge Functions (Deno 2)
│       ├── _shared/                        # Shared utilities
│       │   ├── cors.ts                     # CORS headers
│       │   ├── errors.ts                   # Custom error classes
│       │   ├── validation.ts               # Input validation
│       │   ├── bubbleSync.ts               # BubbleSyncService class
│       │   ├── openai.ts                   # OpenAI wrapper
│       │   ├── slack.ts                    # Slack integration
│       │   └── types.ts                    # TypeScript interfaces
│       │
│       ├── auth-user/                      # Authentication
│       │   ├── index.ts                    # Router
│       │   └── handlers/
│       │       ├── login.ts                # Supabase Auth login
│       │       ├── signup.ts               # Supabase Auth signup
│       │       ├── logout.ts               # Bubble logout (legacy)
│       │       ├── validate.ts             # Token validation
│       │       ├── resetPassword.ts
│       │       └── updatePassword.ts
│       │
│       ├── bubble-proxy/                   # Bubble API proxy
│       │   ├── index.ts                    # Router
│       │   └── handlers/
│       │       ├── favorites.ts            # Toggle favorites
│       │       ├── getFavorites.ts         # Get user favorites
│       │       ├── messaging.ts            # Send messages
│       │       ├── photos.ts               # Upload photos
│       │       ├── referral.ts             # Submit referrals
│       │       └── listingSync.ts          # Listing sync
│       │
│       ├── listing/                        # Listing operations
│       │   ├── index.ts
│       │   └── handlers/
│       │       ├── create.ts
│       │       ├── get.ts
│       │       └── submit.ts
│       │
│       ├── proposal/                       # Proposal operations
│       │   ├── index.ts
│       │   ├── actions/
│       │   │   ├── create.ts
│       │   │   ├── get.ts
│       │   │   ├── update.ts
│       │   │   └── suggest.ts
│       │   └── lib/
│       │       ├── calculations.ts
│       │       ├── dayConversion.ts
│       │       ├── validators.ts
│       │       └── status.ts
│       │
│       ├── ai-gateway/                     # AI completions
│       │   ├── index.ts
│       │   ├── handlers/
│       │   │   ├── complete.ts             # Non-streaming
│       │   │   └── stream.ts               # SSE streaming
│       │   └── prompts/
│       │       ├── _registry.ts
│       │       ├── listing-description.ts
│       │       └── proposal-summary.ts
│       │
│       ├── bubble_sync/                    # Bubble↔Supabase sync
│       │   ├── index.ts
│       │   ├── handlers/
│       │   └── lib/
│       │       ├── bubbleDataApi.ts
│       │       ├── fieldMapping.ts
│       │       └── tableMapping.ts
│       │
│       ├── slack/                          # Slack notifications
│       │   └── index.ts
│       │
│       └── ai-signup-guest/                # AI-powered signup
│           └── index.ts
│
├── .claude/                                # Claude Code configuration
│   ├── CLAUDE.md                           # This file
│   ├── commands/                           # Custom slash commands
│   ├── plans/                              # Implementation plans
│   │   ├── New/                            # Active plans
│   │   ├── Done/                           # Completed plans
│   │   └── Documents/                      # Analysis dumps
│   └── Documentation/                      # Detailed docs by domain
│       ├── Auth/                           # Login/signup flows
│       ├── Backend(EDGE - Functions)/      # Edge function docs
│       ├── Database/                       # Table schemas, FK fields
│       ├── Pages/                          # Page-specific docs
│       └── Routing/                        # ROUTING_GUIDE.md
│
└── DATABASE_SCHEMA_OVERVIEW.md             # Complete Supabase schemas (93 tables)
```

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
│                    SUPABASE EDGE FUNCTIONS                               │
├─────────────────────────────────────────────────────────────────────────┤
│  POST /functions/v1/{function}                                           │
│  Body: { "action": "...", "payload": {...} }                            │
│                                                                          │
│  auth-user/     → Supabase Auth (login/signup) + Bubble (logout/validate)│
│  bubble-proxy/  → Proxies Bubble API calls (favorites, messaging, photos)│
│  listing/       → Listing CRUD with Supabase                             │
│  proposal/      → Proposal operations with Bubble sync                   │
│  ai-gateway/    → OpenAI completions (streaming + non-streaming)         │
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

## Key Files Quick Reference

| What you need | Where to find it |
|---------------|------------------|
| Add/modify routes | `app/src/routes.config.js` |
| Vite build config | `app/vite.config.js` |
| App constants | `app/src/lib/constants.js` |
| Authentication | `app/src/lib/auth.js` |
| Supabase client | `app/src/lib/supabase.js` |
| Data lookups (neighborhoods, amenities) | `app/src/lib/dataLookups.js` |
| Navigation helpers | `app/src/lib/navigation.js` |
| Day index conversion | `app/src/logic/processors/external/adaptDays*.js` |
| Proposal business rules | `app/src/logic/rules/proposals/` |
| Pricing calculations | `app/src/logic/calculators/pricing/` |
| Edge Function shared code | `supabase/functions/_shared/` |
| Bubble sync service | `supabase/functions/_shared/bubbleSync.ts` |

---

**VERSION**: 6.0 | **UPDATED**: 2025-12-11
