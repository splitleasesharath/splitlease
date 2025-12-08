# Split Lease Application - Developer Guide

## Project Overview

Split Lease is a **flexible rental marketplace for NYC properties** enabling:
- **Split Scheduling**: Property owners list spaces available for specific days/weeks
- **Repeat Stays**: Guests rent the same room repeatedly on selected days (claimed "45% less than Airbnb")
- **Two User Types**: Hosts (property owners) and Guests (renters)
- **Proposal System**: Guests submit proposals to Hosts with custom terms
- **Virtual Meetings**: Video calls between hosts and guests before finalizing

### Core Domain Concepts

| Concept | Description |
|---------|-------------|
| **Listing** | A property with photos, amenities, location, and pricing by frequency |
| **Proposal** | A guest's booking request with selected days, move-in date, and pricing |
| **Counteroffer** | Host's modified terms in response to a proposal |
| **Virtual Meeting** | Scheduled video call between host and guest |
| **Schedule Pattern** | "Every week", "One week on/off", "Two weeks on/off", etc. |

---

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 with Vite (ESM)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Legacy Backend**: Bubble.io (via Edge Function proxies)
- **Styling**: CSS Modules + CSS Variables
- **Maps**: Google Maps React

### Islands Architecture
Each page is an independent React root (island pattern):
- `src/main.jsx` → `HomePage`
- `src/search.jsx` → `SearchPage`
- `src/view-split-lease.jsx` → `ViewSplitLeasePage`
- `src/self-listing.jsx` → `SelfListingPage`

### Four-Layer Logic Architecture
Located in `src/logic/`:

| Layer | Purpose | Naming Convention |
|-------|---------|-------------------|
| **Calculators** | Pure math functions | `calculate*`, `get*` |
| **Rules** | Boolean predicates (business logic) | `can*`, `is*`, `has*`, `should*` |
| **Processors** | Data transformation | `adapt*`, `extract*`, `process*`, `format*` |
| **Workflows** | Orchestration | `*Workflow` |

---

## Critical Paths & Files

### Entry Points
```
src/main.jsx              → HomePage (landing)
src/search.jsx            → SearchPage (browse listings)
src/view-split-lease.jsx  → ViewSplitLeasePage (listing details)
src/self-listing.jsx      → SelfListingPage (create/edit listing)
```

### Key Shared Components
```
src/islands/shared/Header.jsx                    → Site navigation, auth modals
src/islands/shared/Footer.jsx                    → Site footer
src/islands/shared/ListingScheduleSelector.jsx   → Day selection + pricing
src/islands/shared/GoogleMap.jsx                 → Map with listing markers
src/islands/shared/CreateProposalFlowV2.jsx      → Multi-step proposal wizard
```

### Core Libraries
```
src/lib/constants.js        → All configuration (URLs, days, prices, etc.)
src/lib/auth.js             → Authentication (login, logout, token management)
src/lib/supabase.js         → Supabase client initialization
src/lib/secureStorage.js    → Encrypted token storage
src/lib/priceCalculations.js → Pricing breakdown logic
```

### Logic Core
```
src/logic/calculators/pricing/    → getNightlyRateByFrequency, calculateFourWeekRent
src/logic/calculators/scheduling/ → calculateCheckInOutDays, calculateNightsFromDays
src/logic/rules/proposals/        → canCancelProposal, canModifyProposal, canAcceptCounteroffer
src/logic/rules/auth/             → isSessionValid, isProtectedPage
src/logic/processors/external/    → adaptDaysFromBubble, adaptDaysToBubble
src/logic/workflows/              → acceptProposalWorkflow, cancelProposalWorkflow
```

---

## Day Indexing Convention

### CRITICAL: Two Day Systems

| System | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|--------|--------|--------|---------|-----------|----------|--------|----------|
| **Internal (JS)** | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| **Bubble API** | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

### Conversion Functions
```javascript
// Bubble → Internal
import { adaptDaysFromBubble } from 'src/logic/processors/external/adaptDaysFromBubble.js'
const jsDays = adaptDaysFromBubble({ bubbleDays: [2, 3, 4, 5, 6] }) // → [1, 2, 3, 4, 5]

// Internal → Bubble
import { adaptDaysToBubble } from 'src/logic/processors/external/adaptDaysToBubble.js'
const bubbleDays = adaptDaysToBubble({ jsDays: [1, 2, 3, 4, 5] }) // → [2, 3, 4, 5, 6]
```

### Default Day Selection
Monday-Friday (weeknight pattern): `[1, 2, 3, 4, 5]` (0-based)

---

## Authentication Flow

### Storage Keys
- `splitlease_auth_token` → Encrypted auth token
- `splitlease_session_id` → Encrypted session/user ID
- `splitlease_user_type` → "Host" or "Guest"
- `loggedInAvatar_userType_visible` → UI visibility preference

### Auth Functions
```javascript
import { checkAuthStatus, loginUser, logoutUser, validateTokenAndFetchUser } from 'src/lib/auth.js'

// Check if logged in
const isLoggedIn = await checkAuthStatus()

// Login
const result = await loginUser(email, password)

// Validate token and get user data
const userData = await validateTokenAndFetchUser()

// Logout
await logoutUser()
```

### Protected Pages
- `/account-profile`
- `/host-dashboard`

---

## API Architecture

### Supabase Edge Functions (Preferred)
All Bubble API calls are proxied through Edge Functions:
- `bubble-proxy` → General Bubble API calls
- `auth-user` → Authentication (native Supabase Auth for login/signup, Bubble for logout/validate)

### Why Edge Functions?
- API keys stored server-side in Supabase Secrets
- No sensitive keys in frontend code
- Centralized error handling

### Direct Supabase Queries
For data not in Bubble:
- Neighborhoods
- Boroughs
- Informational texts
- ZAT price configuration

---

## Component Patterns

### 1. Hollow Component Pattern
UI-only component that delegates ALL logic to a hook.

**Example**: `ViewSplitLeasePage.jsx`
```javascript
// Component contains ONLY JSX
export default function ViewSplitLeasePage() {
  const {
    listing,
    selectedDays,
    handleDaySelection,
    // ... all state and handlers from hook
  } = useViewSplitLeasePageLogic()

  return (
    <div>
      {/* Pure rendering, no business logic */}
    </div>
  )
}
```

### 2. Multi-Step Form Pattern
Section-by-section forms with localStorage draft saving.

**Example**: `SelfListingPage.tsx`
- 7 sections: Space Snapshot → Features → Lease Styles → Pricing → Rules → Photos → Review
- Draft saved to localStorage between sessions
- Section validation before proceeding

### 3. Modal Flow Pattern
Multi-step wizards inside modals with callback to parent.

**Example**: `CreateProposalFlowV2.jsx`
- Sections: Review → User Details → Move-in Date → Days Selection
- Parent provides `onSubmit` callback
- Modal manages internal navigation state

---

## Database Tables

### Supabase Tables
| Table | Purpose |
|-------|---------|
| `zat_geo_borough_toplevel` | NYC boroughs |
| `zat_geo_hood_mediumlevel` | Neighborhoods |
| `zat_features_listingtype` | Property types |
| `zat_features_amenity` | Amenities |
| `zfut_safetyfeatures` | Safety features |
| `zat_features_houserule` | House rules |
| `zat_features_parkingoptions` | Parking options |
| `zat_features_cancellationpolicy` | Cancellation policies |
| `zat_features_storageoptions` | Storage options |
| `informational_texts` | CMS content |
| `proposal` | Proposals (synced from Bubble) |
| `virtualmeetingschedulesandlinks` | Virtual meetings |

### Bubble Tables (via Edge Functions)
- `listing` → Property listings
- `user` → User accounts
- `proposal` → Proposals (source of truth)

---

## Styling Conventions

### CSS Variables (src/styles/variables.css)
```css
--color-primary: #31135d;      /* Deep purple */
--color-primary-hover: #1f0b38;
--color-secondary: #5B21B6;
--color-success: #00C851;
--color-warning: #FFA500;
--color-error: #EF4444;
```

### File Organization
- Global: `src/styles/main.css`, `variables.css`
- Components: `src/styles/components/*.css`
- Islands: Co-located with component (e.g., `Header.css` next to `Header.jsx`)

### Naming
- CSS classes: `kebab-case` (`.hero-section`, `.btn-primary`)
- CSS files: Match component name

---

## DO's

### Architecture
- Use the four-layer logic architecture (calculators, rules, processors, workflows)
- Keep business logic in hooks, not components (Hollow Component Pattern)
- Use Edge Functions for all Bubble API calls
- Store all configuration in `src/lib/constants.js`

### Day Handling
- Always use 0-based indexing internally
- Convert at system boundaries using `adaptDaysFromBubble` / `adaptDaysToBubble`
- Validate day arrays before processing

### Authentication
- Use `checkAuthStatus()` before accessing protected resources
- Clear auth data on logout AND on token validation failure
- Redirect to login for protected pages when not authenticated

### Error Handling
- Throw descriptive errors (no silent failures)
- Log errors with emoji prefixes for visibility (e.g., `console.error('❌ ...')`)
- Extract detailed error messages from Edge Function responses

### State Management
- Use local state (useState) for UI state
- Use URL parameters for shareable state (filters, listing IDs)
- Use localStorage for auth tokens and draft forms

### Styling
- Use CSS variables for colors and spacing
- Mobile-first responsive design
- Prefer CSS modules over inline styles

---

## DON'Ts

### Architecture
- Never add fallback mechanisms when encountering errors
- Never add compatibility layers or workarounds
- Never over-engineer for hypothetical future needs
- Never put business logic in UI components
- Never access tokens directly from components (use auth functions)

### API Calls
- Never call Bubble API directly from frontend
- Never expose API keys in frontend code
- Never hardcode URLs (use constants)

### Day Handling
- Never assume day indexing (always check documentation)
- Never mix 0-based and 1-based day numbers in the same function
- Never send 0-based days to Bubble API (always convert first)

### Authentication
- Never store sensitive tokens in plain localStorage
- Never skip token validation on protected pages
- Never assume auth state without checking

### State
- Never use Redux or complex state management (keep it simple)
- Never prop-drill more than 2 levels (use composition)
- Never mutate state directly

### Styling
- Never use `!important` without strong justification
- Never use inline styles for repeatable patterns
- Never hardcode color values (use CSS variables)

---

## Proposal Status Flow

```
PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP
    ↓
RENTAL_APP_SUBMITTED_AWAITING_HOST_REVIEW
    ↓
┌─────────────────────────────────────────┐
│ HOST DECISION                           │
│ ├─ REJECTED_BY_HOST (terminal)          │
│ ├─ COUNTEROFFER_SUBMITTED_AWAITING_...  │
│ └─ PROPOSAL_APPROVED_BY_HOST            │
└─────────────────────────────────────────┘
    ↓
AWAITING_DOCUMENTS_AND_INITIAL_PAYMENT
    ↓
INITIAL_PAYMENT_SUBMITTED_LEASE_ACTIVATED (terminal)

Side exits:
├─ CANCELLED_BY_GUEST (terminal)
├─ CANCELLED_BY_SPLITLEASE (terminal)
└─ EXPIRED (terminal)
```

### Proposal Rules
```javascript
import { canCancelProposal, canModifyProposal, canAcceptCounteroffer } from 'src/logic/rules/proposals/proposalRules.js'

canCancelProposal(proposal)    // Can guest cancel?
canModifyProposal(proposal)    // Can guest edit terms?
canAcceptCounteroffer(proposal) // Has host made counteroffer?
```

---

## Pricing System

### Price Fields by Night Count
```javascript
{
  'Price 2 nights selected': 150,
  'Price 3 nights selected': 140,
  'Price 4 nights selected': 130,
  'Price 5 nights selected': 120,
  'Price 6 nights selected': 110,
  'Price 7 nights selected': 100
}
```

### Price Tiers (for search filtering)
- Under $200: `{ min: 0, max: 199.99 }`
- $200 - $350: `{ min: 200, max: 350 }`
- $350 - $500: `{ min: 350.01, max: 500 }`
- $500+: `{ min: 500.01, max: 999999 }`

### Calculation Functions
```javascript
import { getNightlyRateByFrequency, calculateFourWeekRent, calculatePricingBreakdown } from 'src/logic/calculators/pricing/'

const nightlyRate = getNightlyRateByFrequency(listing, nightsSelected)
const monthlyRent = calculateFourWeekRent(nightlyRate, nightsSelected)
const breakdown = calculatePricingBreakdown(listing, selectedDays, reservationSpan)
```

---

## Map Configuration

### Borough Centers
```javascript
import { getBoroughMapConfig } from 'src/lib/constants.js'

const config = getBoroughMapConfig('manhattan')
// { center: { lat: 40.7580, lng: -73.9855 }, zoom: 13, name: 'Manhattan' }
```

### Supported Boroughs
- manhattan, brooklyn, queens, bronx, staten-island, hudson (NJ)

---

## Testing Checklist

When modifying proposal-related code:
- [ ] Does it handle null/undefined proposals?
- [ ] Does it check status before allowing actions?
- [ ] Does it use the correct day indexing?
- [ ] Does it handle both `status` and `Status` field names?

When modifying auth-related code:
- [ ] Does it clear auth data on failure?
- [ ] Does it use Edge Functions (not direct API calls)?
- [ ] Does it handle network errors gracefully?

When modifying UI components:
- [ ] Is business logic in the hook, not the component?
- [ ] Are callbacks properly passed to child components?
- [ ] Is loading/error state handled?

---

## Key References
| What | Where |
|------|-------|
| Development beliefs | `../Context/DEVELOPMENT_BELIEFS.md` |

---

## Quick Reference

### Common Imports
```javascript
// Constants
import { DAYS, DAY_NAMES, SCHEDULE_PATTERNS, PRICE_TIERS } from 'src/lib/constants.js'

// Auth
import { checkAuthStatus, loginUser, logoutUser } from 'src/lib/auth.js'

// Supabase
import { supabase } from 'src/lib/supabase.js'

// Day conversion
import { adaptDaysFromBubble } from 'src/logic/processors/external/adaptDaysFromBubble.js'
import { adaptDaysToBubble } from 'src/logic/processors/external/adaptDaysToBubble.js'

// Proposal rules
import { canCancelProposal, canModifyProposal } from 'src/logic/rules/proposals/proposalRules.js'
```

### File Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase | `HomePage.jsx` |
| Hooks | camelCase with `use` prefix | `useViewSplitLeasePageLogic.js` |
| Utilities | camelCase | `priceCalculations.js` |
| Constants | UPPER_SNAKE_CASE | `BUBBLE_API_URL` |
| CSS Classes | kebab-case | `.hero-section` |
| CSS Files | Match component | `Header.css` |

---

## Build & Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Environment Variables
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_GOOGLE_MAPS_API_KEY=<google-maps-api-key>
```

Note: Bubble API keys are stored server-side in Supabase Secrets, NOT in environment variables.
