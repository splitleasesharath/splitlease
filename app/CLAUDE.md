# Split Lease App Guide

## What It Is
NYC flexible rental marketplace. Hosts list spaces for specific days; guests rent repeatedly on selected days.

## Stack
React 18 + Vite | Supabase | Bubble.io (via Edge Functions) | CSS Modules

## Entry Points (Islands)
```
src/main.jsx              → HomePage
src/search.jsx            → SearchPage
src/view-split-lease.jsx  → ViewSplitLeasePage
src/guest-proposals.jsx   → GuestProposalsPage
src/self-listing.jsx      → SelfListingPage
```

## Key Directories
```
src/islands/shared/    → Header, Footer, ListingScheduleSelector, CreateProposalFlowV2
src/lib/               → constants, auth, supabase, secureStorage, priceCalculations
src/logic/             → Four-layer architecture (see below)
src/styles/            → CSS variables + component styles
```

## Four-Layer Logic (`src/logic/`)

| Layer | Purpose | Naming | Location |
|-------|---------|--------|----------|
| Calculators | Pure math | `calculate*`, `get*` | `calculators/` |
| Rules | Booleans | `can*`, `is*`, `has*` | `rules/` |
| Processors | Transform | `adapt*`, `process*` | `processors/` |
| Workflows | Orchestrate | `*Workflow` | `workflows/` |

## Day Indexing (CRITICAL)

| System | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|--------|-----|-----|-----|-----|-----|-----|-----|
| **JS (internal)** | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| **Bubble API** | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

```javascript
import { adaptDaysFromBubble } from 'src/logic/processors/external/adaptDaysFromBubble.js'
import { adaptDaysToBubble } from 'src/logic/processors/external/adaptDaysToBubble.js'
```

## Auth
```javascript
import { checkAuthStatus, loginUser, logoutUser } from 'src/lib/auth.js'

const isLoggedIn = await checkAuthStatus()
await loginUser(email, password)
await logoutUser()
```

**Protected pages**: `/guest-proposals`, `/account-profile`, `/host-dashboard`

## API Pattern
- All Bubble calls → Edge Functions (`bubble-proxy`, `bubble-auth-proxy`)
- Direct Supabase → Neighborhoods, boroughs, lookup tables

## Component Patterns

### Hollow Component
```javascript
function GuestProposalsPage() {
  const { proposals, handleCancel, ...rest } = useGuestProposalsPageLogic()
  return <div>{/* Pure rendering */}</div>
}
```

### Multi-Step Form
`SelfListingPage.tsx`: 7 sections with localStorage draft saving

### Modal Flow
`CreateProposalFlowV2.jsx`: Multi-step wizard with parent callback

## Proposal Status Flow
```
SUBMITTED → RENTAL_APP → HOST_REVIEW → APPROVED/REJECTED/COUNTEROFFER → PAYMENT → ACTIVATED
           ↳ CANCELLED/EXPIRED (terminal)
```

```javascript
import { canCancelProposal, canModifyProposal } from 'src/logic/rules/proposals/proposalRules.js'
```

## Pricing
```javascript
import { getNightlyRateByFrequency, calculateFourWeekRent } from 'src/logic/calculators/pricing/'

// Prices by night count: 'Price 2 nights selected', 'Price 3 nights selected', etc.
```

## CSS Variables (`src/styles/variables.css`)
```css
--color-primary: #31135d;
--color-success: #00C851;
--color-error: #EF4444;
```

## DO
- Use four-layer logic architecture
- Keep business logic in hooks (Hollow Component Pattern)
- Use Edge Functions for Bubble API
- Use 0-based day indexing internally
- Convert at boundaries with `adapt*` functions

## DON'T
- Add fallback mechanisms
- Call Bubble directly
- Mix day indexing systems
- Put logic in components
- Use Redux (keep it simple)
- Hardcode colors (use CSS variables)

## Common Imports
```javascript
import { DAYS, DAY_NAMES, SCHEDULE_PATTERNS } from 'src/lib/constants.js'
import { checkAuthStatus } from 'src/lib/auth.js'
import { supabase } from 'src/lib/supabase.js'
import { adaptDaysFromBubble } from 'src/logic/processors/external/adaptDaysFromBubble.js'
import { canCancelProposal } from 'src/logic/rules/proposals/proposalRules.js'
```

## Build
```bash
npm install && npm run dev   # http://localhost:5173
npm run build                # Production
```

## Env Vars
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_GOOGLE_MAPS_API_KEY
```
