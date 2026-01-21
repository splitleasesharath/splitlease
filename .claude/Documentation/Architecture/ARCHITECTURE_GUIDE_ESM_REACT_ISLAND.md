# SPLIT LEASE ARCHITECTURE GUIDE
## ESM + React Islands + Four-Layer Logic Core

---

## CORE PRINCIPLES

**Stack**: ESM-only, React 18 Islands, Vite 5, Cloudflare Pages, Supabase PostgreSQL + Edge Functions.

**Separation of Concerns**:
- **Islands** = Look, feel, polish (rendering, animations, user feedback)
- **Logic Core** = Calculations, rules, data processing (zero UI dependencies)
- **Lib** = Infrastructure (API clients, utilities, config)

**Module Rules**: Strict ESM. All imports require `.js`/`.jsx` extensions. No CommonJS.

**No Fallback**: Logic fails explicitly with descriptive errors—never silent defaults or fallback values.

---

## PROJECT STRUCTURE

```
src/
├── islands/                    # PURE UI (React components)
│   ├── shared/                 # Reusable UI primitives (50+ components)
│   │   ├── Button.jsx
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   ├── Toast.jsx
│   │   ├── GoogleMap.jsx
│   │   ├── ListingScheduleSelector.jsx
│   │   ├── SearchScheduleSelector.jsx
│   │   ├── CreateProposalFlowV2.jsx
│   │   └── ...
│   ├── pages/                  # Page-specific islands
│   │   ├── HomePage.jsx
│   │   ├── SearchPage.jsx
│   │   ├── ViewSplitLeasePage.jsx
│   │   ├── GuestProposalsPage.jsx
│   │   ├── useViewSplitLeasePageLogic.js    # Hollow pattern hook
│   │   ├── useGuestProposalsPageLogic.js
│   │   └── ...
│   └── modals/                 # Modal components (13 modals)
│       ├── CancelProposalModal.jsx
│       ├── ProposalDetailsModal.jsx
│       └── ...
│
├── logic/                      # BUSINESS DOMAIN (No React, no DOM)
│   ├── calculators/            # Pure math (pricing, dates, quantities)
│   │   ├── pricing/
│   │   │   ├── calculateFourWeekRent.js
│   │   │   ├── calculateGuestFacingPrice.js
│   │   │   ├── calculatePricingBreakdown.js
│   │   │   ├── calculateReservationTotal.js
│   │   │   └── getNightlyRateByFrequency.js
│   │   └── scheduling/
│   │       ├── calculateCheckInOutDays.js
│   │       ├── calculateNextAvailableCheckIn.js
│   │       └── calculateNightsFromDays.js
│   │
│   ├── rules/                  # Boolean predicates (permissions, visibility)
│   │   ├── auth/
│   │   │   ├── isSessionValid.js
│   │   │   └── isProtectedPage.js
│   │   ├── proposals/
│   │   │   ├── canAcceptProposal.js
│   │   │   ├── canCancelProposal.js
│   │   │   ├── canEditProposal.js
│   │   │   ├── determineProposalStage.js
│   │   │   └── virtualMeetingRules.js
│   │   ├── scheduling/
│   │   │   ├── isDateBlocked.js
│   │   │   ├── isDateInRange.js
│   │   │   └── isScheduleContiguous.js
│   │   ├── search/
│   │   │   ├── hasListingPhotos.js
│   │   │   ├── isValidPriceTier.js
│   │   │   └── isValidWeekPattern.js
│   │   └── users/
│   │       ├── hasProfilePhoto.js
│   │       ├── isGuest.js
│   │       ├── isHost.js
│   │       └── shouldShowFullName.js
│   │
│   ├── processors/             # Data transformers (API boundary adapters)
│   │   ├── external/           # CRITICAL: Bubble API day conversion
│   │   │   ├── adaptDayFromBubble.js
│   │   │   ├── adaptDayToBubble.js
│   │   │   ├── adaptDaysFromBubble.js
│   │   │   └── adaptDaysToBubble.js
│   │   ├── display/
│   │   │   └── formatHostName.js
│   │   ├── listing/
│   │   │   ├── extractListingCoordinates.js
│   │   │   └── parseJsonArrayField.js
│   │   ├── proposal/
│   │   │   └── processProposalData.js
│   │   └── user/
│   │       ├── processProfilePhotoUrl.js
│   │       ├── processUserDisplayName.js
│   │       ├── processUserInitials.js
│   │       └── processUserData.js
│   │
│   ├── workflows/              # Multi-step orchestration
│   │   ├── auth/
│   │   │   ├── checkAuthStatusWorkflow.js
│   │   │   └── validateTokenWorkflow.js
│   │   ├── booking/
│   │   │   ├── acceptProposalWorkflow.js
│   │   │   ├── cancelProposalWorkflow.js
│   │   │   └── loadProposalDetailsWorkflow.js
│   │   ├── proposals/
│   │   │   ├── cancelProposalWorkflow.js
│   │   │   ├── counterofferWorkflow.js
│   │   │   ├── navigationWorkflow.js
│   │   │   └── virtualMeetingWorkflow.js
│   │   └── scheduling/
│   │       ├── validateMoveInDateWorkflow.js
│   │       └── validateScheduleWorkflow.js
│   │
│   └── constants/              # Business constants
│       ├── proposalStages.js
│       └── proposalStatuses.js
│
├── lib/                        # Infrastructure (DB clients, generic utils)
│   ├── supabase.js             # Supabase client initialization
│   ├── auth.js                 # Authentication functions
│   ├── secureStorage.js        # Encrypted localStorage wrapper
│   ├── bubbleAPI.js            # Bubble API proxy client
│   ├── constants.js            # App-wide constants (439 lines)
│   ├── config.js               # Runtime configuration
│   ├── dataLookups.js          # Reference data fetching
│   ├── navigation.js           # Client-side navigation
│   ├── sanitize.js             # Input sanitization (XSS protection)
│   ├── urlParams.js            # URL parameter management
│   ├── mapUtils.js             # Google Maps helpers
│   ├── dayUtils.js             # Day manipulation utilities
│   ├── priceCalculations.js    # Pricing formulas
│   ├── listingDataFetcher.js   # Listing data fetching
│   ├── listingService.js       # Listing CRUD operations
│   ├── proposalDataFetcher.js  # Proposal data fetching
│   ├── availabilityValidation.js
│   ├── photoUpload.js          # Photo upload handling
│   ├── slackService.js         # Slack notifications
│   ├── aiService.js            # AI service client
│   └── hotjar.js               # Hotjar analytics
│
├── routes/                     # Route registry
│   └── routes.config.js        # Single source of truth for all routes
│
└── styles/
    ├── variables.css           # CSS custom properties
    ├── main.css                # Global base styles
    └── components/             # Component-specific styles

public/                         # Static HTML shells (27 entry points)
dist/                           # Build output (gitignored)
```

---

## FOUR-LAYER LOGIC CORE CONVENTIONS

### Layer 1: Calculators (Pure Math)
Functions return computed values. Zero side effects. All inputs via named parameters.

```javascript
// src/logic/calculators/pricing/calculateFourWeekRent.js

/**
 * Calculates the baseline rent for a standard 4-week period.
 * @rule Four weeks is the standard billing cycle for split lease.
 */
export function calculateFourWeekRent({ nightlyRate, frequency }) {
  // No Fallback: Strict type validation
  if (typeof nightlyRate !== 'number' || isNaN(nightlyRate)) {
    throw new Error(
      `calculateFourWeekRent: nightlyRate must be a number, got ${typeof nightlyRate}`
    )
  }

  if (frequency < 2 || frequency > 7) {
    throw new Error(
      `calculateFourWeekRent: frequency must be between 2-7 nights, got ${frequency}`
    )
  }

  // Pure calculation
  return nightlyRate * frequency * 4
}
```

### Layer 2: Rules (Boolean Predicates)
Functions return `true`/`false`. Names start with: `can`, `should`, `is`, `has`.

```javascript
// src/logic/rules/proposals/canCancelProposal.js

/**
 * Determine if a guest can cancel their proposal.
 * @rule Guest can cancel proposals in stages 1-4 (before completion).
 * @rule Terminal states cannot be re-cancelled.
 */
export function canCancelProposal({ proposalStatus, deleted = false }) {
  if (deleted) return false
  if (!proposalStatus || typeof proposalStatus !== 'string') return false

  const terminalStatuses = [
    'Cancelled by Guest',
    'Cancelled by Host',
    'Rejected',
    'Expired',
    'Completed'
  ]

  return !terminalStatuses.includes(proposalStatus.trim())
}
```

### Layer 3: Processors (Data Gatekeepers)
Validate and transform raw data. Enforce No Fallback by throwing on missing required fields.

```javascript
// src/logic/processors/external/adaptDaysFromBubble.js

/**
 * Convert 1-based Bubble API day numbers to 0-based indices.
 * @rule External (Bubble): 1=Sunday, 2=Monday, ..., 7=Saturday.
 * @rule Internal: 0=Sunday, 1=Monday, ..., 6=Saturday.
 */
export function adaptDaysFromBubble({ bubbleDays }) {
  if (!Array.isArray(bubbleDays)) {
    throw new Error(
      `adaptDaysFromBubble: bubbleDays must be an array, got ${typeof bubbleDays}`
    )
  }

  const zeroBasedDays = []
  for (const day of bubbleDays) {
    if (typeof day !== 'number' || day < 1 || day > 7) {
      throw new Error(
        `adaptDaysFromBubble: Invalid Bubble day number ${day}, must be 1-7`
      )
    }
    zeroBasedDays.push(day - 1)
  }

  return zeroBasedDays
}
```

### Layer 4: Workflows (Orchestration)
Coordinate multiple operations. May call Supabase, compose other logic layers.

```javascript
// src/logic/workflows/booking/cancelProposalWorkflow.js

/**
 * Workflow: Cancel a proposal with complex decision tree.
 * @intent Orchestrate proposal cancellation following business rules.
 * @rule Implements complete cancellation decision tree (7 variations).
 */
export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal
}) {
  // Validation
  if (!supabase) throw new Error('cancelProposalWorkflow: supabase client is required')
  if (!proposal || !proposal.id) throw new Error('cancelProposalWorkflow: proposal with id is required')

  // Step 1: Check if cancellation is allowed
  const canCancel = canCancelProposal({
    proposalStatus: proposal.status,
    deleted: proposal.deleted
  })

  if (!canCancel) {
    return {
      success: false,
      message: 'This proposal cannot be cancelled (already in terminal state)',
      updated: false
    }
  }

  // Step 2: Extract decision factors and apply decision tree
  const usualOrder = proposal.usualOrder || 0
  const hasAccessedHouseManual = proposal.houseManualAccessed === true

  // ... decision logic ...

  // Step 3: Execute action
  if (shouldUpdateDatabase) {
    const { error } = await supabase
      .from('proposal')
      .update({
        'Proposal Status': 'Cancelled by Guest',
        'Modified Date': new Date().toISOString()
      })
      .eq('_id', proposal.id)

    return { success: !error, updated: true }
  }

  return { success: true, updated: false, requiresPhoneCall: true }
}
```

---

## ISLANDS PATTERN (UI ONLY)

Islands import logic—never define it inline. Components handle:
- Rendering JSX
- User interactions (onClick, onChange)
- Visual states (loading, hover, animation)
- Calling logic functions with current state

### Hollow Component Pattern
Page components delegate ALL logic to custom hooks:

```jsx
// src/islands/pages/ViewSplitLeasePage.jsx
import { useViewSplitLeasePageLogic } from './useViewSplitLeasePageLogic.js';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';

export default function ViewSplitLeasePage() {
  const logic = useViewSplitLeasePageLogic();

  // Pure rendering - NO business logic here
  return (
    <>
      <Header />
      <main>
        {logic.isLoading ? <LoadingSpinner /> : <ListingDetails {...logic} />}
      </main>
      <Footer />
    </>
  );
}
```

```javascript
// src/islands/pages/useViewSplitLeasePageLogic.js
import { useState, useEffect } from 'react';
import { canCancelProposal } from '../../logic/rules/proposals/canCancelProposal.js';
import { calculatePricingBreakdown } from '../../logic/calculators/pricing/calculatePricingBreakdown.js';
import { adaptDaysFromBubble } from '../../logic/processors/external/adaptDaysFromBubble.js';

export function useViewSplitLeasePageLogic() {
  const [listing, setListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ALL state, effects, handlers here
  // Logic lives in /logic — hooks just orchestrate

  const handleDaySelection = (selectedDays) => {
    const pricing = calculatePricingBreakdown({
      listing,
      selectedDays,
      reservationWeeks: 13
    });
    // ...
  };

  return {
    listing,
    isLoading,
    handleDaySelection,
    // ... exported API
  };
}
```

---

## DAY INDEXING SYSTEM (CRITICAL)

**This is the most common source of bugs. Always convert at API boundaries.**

| System | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|--------|-----|-----|-----|-----|-----|-----|-----|
| JavaScript (internal) | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| Bubble API (external) | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

**Conversion Functions** (in `logic/processors/external/`):

```javascript
import { adaptDaysFromBubble } from 'logic/processors/external/adaptDaysFromBubble.js';
import { adaptDaysToBubble } from 'logic/processors/external/adaptDaysToBubble.js';

// Receiving from Bubble API
const bubbleResponse = [2, 3, 4, 5, 6];  // Mon-Fri in Bubble format
const jsDays = adaptDaysFromBubble({ bubbleDays: bubbleResponse });
// → [1, 2, 3, 4, 5]  // Mon-Fri in JS format

// Sending to Bubble API
const userSelection = [1, 2, 3, 4, 5];  // Mon-Fri in JS format
const bubbleDays = adaptDaysToBubble({ jsDays: userSelection });
// → [2, 3, 4, 5, 6]  // Mon-Fri in Bubble format
```

**Rules**:
- Store days as 0-based (JS) in all state
- Convert to 1-based ONLY when calling Bubble API
- Convert from 1-based ONLY when receiving Bubble data
- NEVER mix formats in the same function

---

## ROUTING SYSTEM

### Route Registry Pattern
Single source of truth: `src/routes.config.js`

```javascript
export const routes = [
  {
    path: '/',
    file: 'index.html',
    protected: false,
    cloudflareInternal: false
  },
  {
    path: '/search',
    file: 'search.html',
    protected: false,
    cloudflareInternal: true,
    internalName: 'search-view'
  },
  {
    path: '/view-split-lease',
    file: 'view-split-lease.html',
    protected: false,
    cloudflareInternal: true,
    internalName: 'listing-view',
    hasDynamicSegment: true,
    dynamicPattern: '/view-split-lease/:id'
  },
  // ... 24 more routes
];
```

**Generated Files**:
- `public/_redirects` - Cloudflare Pages routing
- `public/_routes.json` - Functions control

**Commands**:
```bash
bun run generate-routes  # Regenerate after route changes
```

---

## EDGE FUNCTIONS (SUPABASE)

All backend logic runs on Supabase Edge Functions (Deno 2).

### Function Inventory (29 functions)

#### Core Functions
| Function | Purpose |
|----------|---------|
| `auth-user` | Supabase Auth (login, signup, reset, validate, magic-link, oauth) |
| `listing` | Listing CRUD with atomic Bubble sync |
| `proposal` | Proposal CRUD with queue-based sync |
| `messages` | Real-time messaging threads |

#### AI-Powered
| Function | Purpose |
|----------|---------|
| `ai-gateway` | OpenAI proxy with prompt templating |
| `ai-signup-guest` | AI-powered guest signup flow |
| `ai-parse-profile` | Queue-based AI profile parsing |
| `house-manual` | AI-powered house manual extraction |

#### Bubble Integration
| Function | Purpose |
|----------|---------|
| `bubble-proxy` | Bubble API proxy (favorites, messaging, photos) |
| `bubble_sync` | Queue processor for Supabase→Bubble sync |

#### Booking Features
| Function | Purpose |
|----------|---------|
| `date-change-request` | Lease date changes with throttling |
| `rental-application` | Rental application processing |
| `guest-payment-records` | Guest payment schedule generation |
| `host-payment-records` | Host payment schedule generation |
| `virtual-meeting` | Virtual meeting scheduling |
| `cohost-request` | Co-host request management |
| `cohost-request-slack-callback` | Slack interactive callbacks |

#### Workflow Orchestration
| Function | Purpose |
|----------|---------|
| `workflow-enqueue` | Workflow definition queueing |
| `workflow-orchestrator` | Sequential step execution via pgmq |
| `reminder-scheduler` | Reminder system with webhooks |

#### Notifications
| Function | Purpose |
|----------|---------|
| `send-email` | SendGrid proxy with templates |
| `send-sms` | Twilio proxy for SMS delivery |
| `slack` | Slack notifications |

#### Utilities
| Function | Purpose |
|----------|---------|
| `qr-generator` | QR code generation (PNG binary) |
| `pricing` | Pricing calculations (placeholder) |
| `communications` | Communication handling (placeholder) |
| `query-leo` | Debug utility for mockup queries |

### API Pattern

```typescript
// POST /functions/v1/{function-name}
// Body: { "action": "action_name", "payload": { ... } }
// Response: { "success": true, "data": { ... } }
```

### Shared Utilities (`_shared/`)

```
supabase/functions/_shared/
├── cors.ts           # CORS headers
├── errors.ts         # Custom error classes
├── validation.ts     # Input validation
├── types.ts          # TypeScript interfaces
├── aiTypes.ts        # AI-specific types
├── bubbleSync.ts     # BubbleSyncService class
├── queueSync.ts      # Queue sync utilities
├── jsonUtils.ts      # JSON helpers
├── openai.ts         # OpenAI wrapper
└── slack.ts          # Slack integration
```

---

## SEMANTIC NAMING GUIDE

Function names reveal intent for LLM semantic search:

| Layer | Prefix | Example |
|-------|--------|---------|
| Calculator | `compute`, `calculate`, `get` | `calculateFourWeekRent`, `getNightlyRateByFrequency` |
| Rule | `can`, `should`, `is`, `has` | `canCancelProposal`, `isScheduleContiguous`, `hasProfilePhoto` |
| Processor | `adapt`, `extract`, `process`, `format` | `adaptDaysFromBubble`, `processUserData`, `formatHostName` |
| Workflow | `*Workflow` | `cancelProposalWorkflow`, `validateMoveInDateWorkflow` |

**File naming**: Domain entity + type → `proposalRules.js`, `calculateFourWeekRent.js`, `adaptDaysFromBubble.js`

---

## ESM IMPORT RULES

```javascript
// ✅ CORRECT
import { calculateFourWeekRent } from '../logic/calculators/pricing/calculateFourWeekRent.js';
import { canCancelProposal } from '../logic/rules/proposals/canCancelProposal.js';
import Button from '../shared/Button.jsx';

// ❌ FORBIDDEN
import { utils } from '../lib/utils';        // Missing extension
const rules = require('./rules');            // No CommonJS
```

**Import order**: External packages → logic → islands/shared → islands/pages → lib → same directory

---

## CRITICAL CONSTRAINTS

1. **No business logic in islands** — If it's not rendering, it belongs in `/logic`
2. **No React in logic** — Logic modules are framework-agnostic
3. **No implicit defaults** — Throw errors for missing data, don't substitute
4. **Named parameters only** — `{ nightlyRate, frequency }` not `(nightlyRate, frequency)`
5. **One responsibility per function** — Short, testable, searchable
6. **Convert days at boundaries** — Use adaptDays* functions at API boundaries
7. **Edge Functions for Bubble** — Never call Bubble API directly from frontend

---

## ENTRY POINTS (27 PAGES)

Each HTML file has a corresponding JSX entry point:

| Route | Entry | Component |
|-------|-------|-----------|
| `/` | `main.jsx` | `HomePage` |
| `/search` | `search.jsx` | `SearchPage` |
| `/view-split-lease/:id` | `view-split-lease.jsx` | `ViewSplitLeasePage` |
| `/guest-proposals/:userId` | `guest-proposals.jsx` | `GuestProposalsPage` |
| `/host-proposals/:userId` | `host-proposals.jsx` | `HostProposalsPage` |
| `/self-listing` | `self-listing.jsx` | `SelfListingPage` |
| `/listing-dashboard` | `listing-dashboard.jsx` | `ListingDashboardPage` |
| `/host-overview` | `host-overview.jsx` | `HostOverviewPage` |
| `/account-profile/:userId` | `account-profile.jsx` | `AccountProfilePage` |
| `/favorite-listings` | `favorite-listings.jsx` | `FavoriteListingsPage` |
| `/rental-application` | `rental-application.jsx` | `RentalApplicationPage` |
| `/reset-password` | `reset-password.jsx` | `ResetPasswordPage` |
| `/faq` | `faq.jsx` | `FAQPage` |
| `/help-center` | `help-center.jsx` | `HelpCenterPage` |
| `/policies` | `policies.jsx` | `PoliciesPage` |
| `/about-us` | `about-us.jsx` | `AboutUsPage` |
| `/careers` | `careers.jsx` | `CareersPage` |
| `/list-with-us` | `list-with-us.jsx` | `ListWithUsPage` |
| `/why-split-lease` | `why-split-lease.jsx` | `WhySplitLeasePage` |
| `/guest-success` | `guest-success.jsx` | `GuestSuccessPage` |
| `/host-success` | `host-success.jsx` | `HostSuccessPage` |
| `/404` | `404.jsx` | `NotFoundPage` |

---

## STATISTICS

| Category | Count |
|----------|-------|
| HTML Entry Points | 27 |
| JSX Entry Points | 29 |
| Page Components | 25+ |
| Shared Components | 50+ |
| Modal Components | 13 |
| Calculators | 9 |
| Rules | 22 |
| Processors | 14 |
| Workflows | 12 |
| Edge Functions | 29 |
| Database Tables | 93 |
| CSS Files | 40+ |

---

## MIGRATION CHECKLIST

When extracting logic from existing components:

- [ ] Identify calculations → move to `logic/calculators/{domain}/`
- [ ] Identify conditionals (if/ternary for visibility/permissions) → move to `logic/rules/{domain}/`
- [ ] Identify data transforms → move to `logic/processors/{domain}/`
- [ ] Identify multi-step operations → move to `logic/workflows/{domain}/`
- [ ] Update imports in island to use new logic paths
- [ ] Verify No Fallback: all required data validated before use
- [ ] Add JSDoc with `@intent`, `@rule`, `@example` tags
- [ ] Export from layer's index.js

---

**VERSION**: 3.0
**UPDATED**: 2026-01-20
**ARCHITECTURE**: ESM + React 18 Islands + Four-Layer Logic Core
