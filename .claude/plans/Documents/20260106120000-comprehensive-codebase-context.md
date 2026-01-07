# Split Lease Codebase - Comprehensive Context Document

**Generated**: 2026-01-07 (Updated)
**Purpose**: Complete LLM-ready context for deep research and analysis
**Scope**: `app/` (Frontend) + `supabase/` (Backend)
**Total Files**: 534+ frontend files, 19 Edge Functions, 17 shared utilities (incl. 4 FP modules)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Recent Changes (January 2026)](#recent-changes-january-2026)
3. [Frontend Architecture (app/)](#frontend-architecture-app)
4. [Backend Architecture (supabase/)](#backend-architecture-supabase)
5. [Data Flow & Integration](#data-flow--integration)
6. [Critical Conventions](#critical-conventions)
7. [Development Workflow](#development-workflow)

---

## System Overview

### Tech Stack Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (app/)                              │
│         React 18 + Vite | Islands Architecture                 │
│              Deployed on Cloudflare Pages                       │
├─────────────────────────────────────────────────────────────────┤
│  • 27 HTML pages (independent React roots)                      │
│  • 34 JSX entry points                                          │
│  • 30+ page components (Hollow Components pattern)             │
│  • 39 shared UI components + 15 feature modules                │
│  • 57 business logic modules (4-layer architecture)            │
│  • 32 utility/library modules                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    HTTP Requests (Edge Functions)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND (supabase/functions/)                       │
│          Supabase Edge Functions (Deno/TypeScript)              │
├─────────────────────────────────────────────────────────────────┤
│  • 19 Edge Functions (action-based request pattern)            │
│  • 13 shared utility modules                                   │
│  • Dual-sync architecture (atomic + queue-based)               │
│  • AI Gateway with dynamic prompt registry                     │
│  • Native Realtime messaging (no Bubble dependency)            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                         Data Layer
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  Supabase PostgreSQL ←──→ Bubble.io (legacy, source of truth)  │
│  • Queue-based sync (async updates via sync_queue)             │
│  • Atomic sync (immediate creates via Data API)                │
│  • Native tables (messages - no Bubble dependency)             │
│  • Junction migration (JSONB → normalized tables)              │
└─────────────────────────────────────────────────────────────────┘
```

### Platform Overview

**Split Lease** is a flexible rental marketplace for NYC properties enabling:
- **Split Scheduling**: Multiple guests book different days of the same property
- **Repeat Stays**: Recurring weekly/monthly rentals
- **Proposal-Based Booking**: Guest submits proposal → Host reviews → Negotiate → Accept

---

## Recent Changes (January 2026)

### Major Architectural Improvements

#### 1. Functional Programming Refactoring (11 Edge Functions)

**Completed**: January 2-7, 2026
**Impact**: All 11 major Edge Functions refactored to functional programming orchestration pattern

**Edge Functions Refactored**:
1. `auth-user` - Authentication operations
2. `proposal` - Proposal CRUD with queue sync
3. `listing` - Listing CRUD with atomic sync
4. `messages` - Real-time messaging
5. `ai-gateway` - OpenAI proxy with prompts
6. `bubble_sync` - Queue processor
7. `cohost-request` - Co-host management
8. `rental-application` - Application processing
9. `send-email` - SendGrid integration
10. `send-sms` - Twilio integration
11. `virtual-meeting` - Meeting orchestration

**Pattern Changes**:
- **Before**: ~50+ mutable `let` declarations per function, switch statement routing, mixed side effects
- **After**: Immutable context objects, handler map routing, side effects isolated to boundaries
- **New FP Utilities** (in `supabase/functions/_shared/fp/`):
  - `result.ts` - Result type for functional error handling (`ok`, `err`, `map`, `chain`, `fromPromise`)
  - `pipeline.ts` - Function composition (`pipe`, `pipeAsync`, `compose`, `tap`)
  - `errorLog.ts` - Immutable error logging (replaces ErrorCollector class)
  - `orchestration.ts` - Shared request/response utilities (`parseRequest`, `validateAction`, `routeToHandler`)

**Benefits**:
- Easier to test (pure functions)
- Reduced bug surface area (immutable data)
- Clearer error handling (Result type)
- Standardized routing pattern

**Reference**: Plan file `.claude/plans/Done/20260107163045-cleanup-edge-function-fp-refactor.md`

---

#### 2. Linting Configuration Added

**Completed**: January 7, 2026

**Frontend ESLint** ([app/eslint.config.js](../app/eslint.config.js)):
- React 18.2 settings configured
- `react-hooks` plugin enabled
  - `rules-of-hooks`: error
  - `exhaustive-deps`: warn
- `no-unused-vars`: warn (with `_` prefix ignore pattern)
- `no-undef`: error

**Edge Functions Deno Lint** ([supabase/functions/deno.json](../supabase/functions/deno.json)):
- Recommended rules enabled
- Includes: `ban-untagged-todo`, `no-unused-vars`
- Excludes: `no-explicit-any` (pragmatic for Edge Functions)
- Formatting: 2-space indent, 100 char line width, single quotes

**Linting Commands**:
```bash
# Frontend (from app/)
bun run lint         # Check for issues
bun run lint:fix     # Auto-fix where possible
bun run lint:check   # CI mode (fails on warnings)

# Edge Functions (from project root, requires Deno)
deno lint supabase/functions/        # Check TypeScript
deno fmt --check supabase/functions/ # Check formatting
```

**Reference**: Plan file `.claude/plans/Done/20260107140000-add-eslint-configuration.md`

---

#### 3. Cancellation Reasons Reference Table

**Completed**: January 6, 2026
**Migration**: `20260106_create_cancellation_reasons_table.sql`

Added `cancellation_reasons` reference table with predefined reasons for both guest and host cancellations:

**Guest Reasons**:
- Schedule change
- Found alternative housing
- Financial reasons
- Personal emergency
- Property concerns
- Other

**Host Reasons**:
- Property unavailable
- Booking conflict
- Guest concerns
- Personal reasons
- Maintenance issues
- Other

**Usage**: CancellationModal component now uses database-driven dropdown instead of hardcoded options

**Reference**: Plan file `.claude/plans/Done/20260106143000-cancellation-reasons-reference-table.md`

---

#### 4. Amenities Icon Fix

**Completed**: January 5, 2026

**Change**: Switched from hardcoded SVG icons to database `icon_url` column

**Before**:
- Hardcoded SVG paths in frontend code
- Difficult to add/modify amenities
- Inconsistent icon rendering

**After**:
- `amenity.icon_url` references Supabase Storage bucket
- Admin can update icons without code deployment
- Consistent rendering across all contexts

**Files Modified**:
- Amenity selector components
- Listing detail displays

---

#### 5. Other Recent Additions

**LinkedIn OAuth Signup** (December 2025):
- Added LinkedIn as OAuth provider
- Auth verification page for OAuth callbacks
- Magic login link functionality

**Notification Settings Island** (December 2025):
- Shared island component for managing notification preferences
- Email and SMS opt-in/opt-out

**Unified Cancellation Modal** (December 2025):
- Single modal component for both guest and host cancellation flows
- Dynamic reason selection based on user role

---

## Frontend Architecture (app/)

### Directory Structure (534+ Files)

```
app/
├── public/                          # Static assets & HTML templates
│   ├── *.html                      # 27 independent page templates
│   ├── images/                     # Logos, icons, graphics
│   ├── videos/                     # Marketing videos
│   ├── _redirects                  # Cloudflare routing rules (auto-generated)
│   └── _routes.json                # Cloudflare route config (auto-generated)
│
├── src/                            # React source code
│   ├── *.jsx                       # 34 entry point files
│   │   ├── main.jsx               # Homepage entry
│   │   ├── search.jsx             # Search page entry
│   │   ├── view-split-lease.jsx   # Listing detail entry
│   │   ├── host-overview.jsx      # Host dashboard entry
│   │   ├── guest-proposals.jsx    # Guest dashboard entry
│   │   ├── self-listing.jsx       # Create listing entry (legacy)
│   │   ├── self-listing-v2.jsx    # Create listing entry (new)
│   │   ├── listing-dashboard.jsx  # Manage listing entry
│   │   ├── account-profile.jsx    # User profile entry
│   │   └── ... (25 more)
│   │
│   ├── islands/                    # Component library (186 files)
│   │   ├── pages/                 # Page components (30+ components)
│   │   │   ├── HomePage.jsx
│   │   │   ├── SearchPage/
│   │   │   │   ├── SearchPage.jsx
│   │   │   │   ├── useSearchPageLogic.js
│   │   │   │   ├── components/
│   │   │   │   │   ├── FilterPanel.jsx
│   │   │   │   │   ├── ListingGrid.jsx
│   │   │   │   │   └── MapView.jsx
│   │   │   │   └── styles.css
│   │   │   ├── ViewSplitLeasePage/
│   │   │   │   ├── ViewSplitLeasePage.jsx
│   │   │   │   ├── useViewSplitLeasePageLogic.js
│   │   │   │   └── components/
│   │   │   ├── HostOverviewPage/
│   │   │   ├── GuestProposalsPage/
│   │   │   ├── SelfListingPage/      # TypeScript multi-step wizard
│   │   │   ├── ListingDashboardPage/
│   │   │   ├── AccountProfilePage/
│   │   │   └── ... (24 more)
│   │   │
│   │   ├── shared/                 # Reusable components (39 core + 15 modules)
│   │   │   ├── Button.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── DayButton.jsx
│   │   │   ├── Toast.jsx
│   │   │   ├── ErrorOverlay.jsx
│   │   │   ├── InformationalText.jsx
│   │   │   ├── GoogleMap.jsx
│   │   │   ├── LoggedInAvatar/     # User avatar dropdown
│   │   │   ├── ListingCard/        # Listing card with favorites
│   │   │   ├── FavoriteButton/     # Favorite toggle
│   │   │   ├── CreateProposalFlowV2/  # Booking wizard
│   │   │   ├── SearchScheduleSelector/  # Day filter UI
│   │   │   ├── HostScheduleSelector/    # Host day selection
│   │   │   ├── EditListingDetails/      # Edit listing form
│   │   │   ├── VirtualMeetingManager/   # Meeting scheduling
│   │   │   ├── ContactHostMessaging/    # Host contact form
│   │   │   ├── ImportListingModal/      # External listing import
│   │   │   ├── AIImportAssistantModal/  # AI-powered import
│   │   │   └── ... (10 more modules)
│   │   │
│   │   ├── modals/                 # Modal dialogs (13 files)
│   │   │   ├── ProposalModal.jsx
│   │   │   ├── CounterOfferModal.jsx
│   │   │   ├── CancellationModal.jsx
│   │   │   ├── VirtualMeetingModal.jsx
│   │   │   └── ... (9 more)
│   │   │
│   │   └── proposals/              # Proposal-specific components (7 files)
│   │       ├── ProposalCard.jsx
│   │       ├── ProposalTimeline.jsx
│   │       ├── ProposalActions.jsx
│   │       └── ... (4 more)
│   │
│   ├── lib/                        # Utility/library modules (32 files)
│   │   ├── supabase.js            # Supabase client initialization
│   │   ├── bubbleAPI.js           # [DEPRECATED] Bubble proxy client
│   │   ├── auth.js                # Authentication utilities
│   │   ├── secureStorage.js       # AES-encrypted localStorage
│   │   ├── constants.js           # Global constants
│   │   ├── config.js              # App configuration
│   │   ├── dayUtils.js            # Day manipulation (0-indexed)
│   │   ├── urlParams.js           # URL parameter helpers
│   │   ├── navigation.js          # Navigation utilities
│   │   ├── mapUtils.js            # Google Maps utilities
│   │   ├── photoUpload.js         # Photo upload to Supabase Storage
│   │   ├── priceCalculations.js  # Frontend price display
│   │   ├── sanitize.js            # XSS prevention
│   │   ├── slackService.js        # Slack notifications
│   │   ├── aiService.js           # AI service client
│   │   ├── hotjar.js              # Hotjar analytics
│   │   ├── dataLookups.js         # Reference data (neighborhoods, amenities)
│   │   ├── listingService.js      # Listing CRUD client
│   │   ├── listingDataFetcher.js  # Fetch listing data
│   │   ├── proposalDataFetcher.js # Fetch proposal data
│   │   ├── availabilityValidation.js  # Availability rules
│   │   ├── informationalTextsFetcher.js  # Help text loader
│   │   ├── supabaseUtils.js       # Supabase helpers
│   │   ├── workflowClient.js      # Workflow API client
│   │   ├── emailTemplateRenderer.js  # Email template renderer
│   │   │
│   │   ├── constants/             # Constant definitions
│   │   │   ├── proposalStages.js
│   │   │   └── proposalStatuses.js
│   │   │
│   │   ├── proposals/             # Proposal utilities
│   │   │   ├── dataTransformers.js
│   │   │   ├── statusButtonConfig.js
│   │   │   ├── userProposalQueries.js
│   │   │   └── urlParser.js
│   │   │
│   │   └── scheduleSelector/      # Schedule selector utilities
│   │       ├── dayHelpers.js
│   │       ├── nightCalculations.js
│   │       ├── priceCalculations.js
│   │       └── validators.js
│   │
│   ├── logic/                      # Business logic (57 modules, 4 layers)
│   │   ├── calculators/           # Layer 1: Pure math (9 files)
│   │   │   ├── pricing/
│   │   │   │   ├── calculateFourWeekRent.js
│   │   │   │   ├── calculateGuestFacingPrice.js
│   │   │   │   ├── calculatePricingBreakdown.js
│   │   │   │   ├── calculateReservationTotal.js
│   │   │   │   └── getNightlyRateByFrequency.js
│   │   │   └── scheduling/
│   │   │       ├── calculateCheckInOutDays.js
│   │   │       ├── calculateNextAvailableCheckIn.js
│   │   │       ├── calculateNightsFromDays.js
│   │   │       └── shiftMoveInDateIfPast.js
│   │   │
│   │   ├── rules/                 # Layer 2: Boolean predicates (22 files)
│   │   │   ├── auth/
│   │   │   │   ├── isSessionValid.js
│   │   │   │   └── isProtectedPage.js
│   │   │   ├── pricing/
│   │   │   │   └── isValidDayCountForPricing.js
│   │   │   ├── proposals/
│   │   │   │   ├── canAcceptProposal.js
│   │   │   │   ├── canCancelProposal.js
│   │   │   │   ├── canEditProposal.js
│   │   │   │   ├── determineProposalStage.js
│   │   │   │   ├── proposalRules.js
│   │   │   │   ├── useProposalButtonStates.js
│   │   │   │   └── virtualMeetingRules.js
│   │   │   ├── scheduling/
│   │   │   │   ├── isDateBlocked.js
│   │   │   │   ├── isDateInRange.js
│   │   │   │   └── isScheduleContiguous.js
│   │   │   ├── search/
│   │   │   │   ├── hasListingPhotos.js
│   │   │   │   ├── isValidPriceTier.js
│   │   │   │   ├── isValidSortOption.js
│   │   │   │   └── isValidWeekPattern.js
│   │   │   └── users/
│   │   │       ├── hasProfilePhoto.js
│   │   │       ├── isGuest.js
│   │   │       ├── isHost.js
│   │   │       └── shouldShowFullName.js
│   │   │
│   │   ├── processors/            # Layer 3: Data transformation (14 files)
│   │   │   ├── external/          # **CRITICAL DAY CONVERSION**
│   │   │   │   ├── adaptDayFromBubble.js   # 1-based → 0-based
│   │   │   │   ├── adaptDayToBubble.js     # 0-based → 1-based
│   │   │   │   ├── adaptDaysFromBubble.js  # Array conversion
│   │   │   │   └── adaptDaysToBubble.js    # Array conversion
│   │   │   ├── display/
│   │   │   │   └── formatHostName.js
│   │   │   ├── listing/
│   │   │   │   ├── extractListingCoordinates.js
│   │   │   │   └── parseJsonArrayField.js
│   │   │   ├── proposal/
│   │   │   │   └── processProposalData.js
│   │   │   └── user/
│   │   │       ├── processProfilePhotoUrl.js
│   │   │       ├── processUserDisplayName.js
│   │   │       ├── processUserInitials.js
│   │   │       └── processUserData.js
│   │   │
│   │   └── workflows/             # Layer 4: Orchestration (12 files)
│   │       ├── auth/
│   │       │   ├── checkAuthStatusWorkflow.js
│   │       │   └── validateTokenWorkflow.js
│   │       ├── booking/
│   │       │   ├── acceptProposalWorkflow.js
│   │       │   ├── cancelProposalWorkflow.js
│   │       │   └── loadProposalDetailsWorkflow.js
│   │       ├── proposals/
│   │       │   ├── cancelProposalWorkflow.js
│   │       │   ├── counterofferWorkflow.js
│   │       │   ├── navigationWorkflow.js
│   │       │   └── virtualMeetingWorkflow.js
│   │       └── scheduling/
│   │           ├── validateMoveInDateWorkflow.js
│   │           └── validateScheduleWorkflow.js
│   │
│   ├── styles/                     # Global CSS (10+ files)
│   │   ├── main.css
│   │   ├── tailwind.css
│   │   ├── reset.css
│   │   └── ... (7 more)
│   │
│   ├── config/                     # Configuration
│   │   └── routes.config.js       # **SINGLE SOURCE OF TRUTH for routes**
│   │
│   ├── data/                       # Static content
│   │   └── amenities.js
│   │
│   └── routes/                     # Auto-generated route files
│       └── _generated.js
│
├── scripts/                        # Build automation
│   ├── generate-routes.js         # Route generator (routes.config → _redirects)
│   └── copy_dot_env.sh
│
├── dist/                           # Production build output (auto-generated)
│
├── vite.config.js                 # Vite configuration (289 lines)
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Dependencies
├── .env                           # Environment variables
└── .env.example                   # Environment template
```

---

### Architecture Patterns

#### 1. Islands Architecture

**Concept**: Each HTML page is an independent React root (NOT a Single Page Application).

**Implementation**:
```
public/search.html                  (HTML template)
    ↓
<div id="root"></div>              (Mount point)
    ↓
src/search.jsx                      (Entry point)
    ↓
ReactDOM.createRoot(document.getElementById('root')).render(
  <SearchPage />
);
    ↓
islands/pages/SearchPage/SearchPage.jsx  (Page component)
```

**Characteristics**:
- 27 independent HTML pages
- Full page reload when navigating
- Each page loads only its required JavaScript
- Progressive enhancement (HTML works without JS)
- No shared client-side state between pages

**Benefits**:
- Smaller JavaScript bundles per page
- Faster initial page load
- Better SEO (static HTML first)
- Simpler mental model (no complex routing)
- Easier code splitting

---

#### 2. Hollow Components Pattern

**Concept**: Page components contain ZERO business logic - all logic lives in custom hooks.

**Structure**:
```jsx
// Page Component (UI ONLY - NO LOGIC)
export default function SearchPage() {
  const logic = useSearchPageLogic();

  return (
    <div>
      <FilterPanel
        filters={logic.filters}
        onFilterChange={logic.handleFilterChange}
      />
      <ListingGrid
        listings={logic.listings}
        isLoading={logic.isLoading}
      />
    </div>
  );
}

// Logic Hook (ALL BUSINESS LOGIC)
export function useSearchPageLogic() {
  const [filters, setFilters] = useState({});
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchListings(filters);
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return { filters, listings, isLoading, handleFilterChange };
}
```

**Benefits**:
- Business logic testable without rendering
- UI components reusable with different logic
- Clear separation of concerns
- Easier to read and maintain
- Smaller component files

**Applied Everywhere**:
- All 30+ page components follow this pattern
- Custom hook named `use[PageName]Logic`
- Component focuses purely on rendering

---

#### 3. Four-Layer Logic Architecture

**Concept**: Business logic strictly separated into 4 layers with clear dependencies.

**Layer Hierarchy**:
```
Layer 4: Workflows (orchestration)
   ↓ calls
Layer 3: Processors (data transformation)
   ↓ calls
Layer 2: Rules (boolean predicates)
   ↓ calls
Layer 1: Calculators (pure math)
```

**Layer Definitions**:

| Layer | Naming Convention | Characteristics | Examples |
|-------|------------------|-----------------|----------|
| **1. Calculators** | `calculate*`, `get*` | Pure functions, no side effects, math only | `calculateNightsFromDays`, `getNightlyRateByFrequency` |
| **2. Rules** | `is*`, `can*`, `has*`, `should*` | Boolean predicates, can call calculators | `isScheduleContiguous`, `canAcceptProposal` |
| **3. Processors** | `adapt*`, `process*`, `format*` | Data transformation, can call calculators | `adaptDaysFromBubble`, `processUserData` |
| **4. Workflows** | `*Workflow` | Orchestrates all layers, side effects allowed | `validateScheduleWorkflow`, `acceptProposalWorkflow` |

**Example Flow**:
```javascript
// UI calls workflow
const result = await validateScheduleWorkflow({
  selectedDays: [1, 2, 3, 4, 5]
});

// Workflow orchestrates layers
export async function validateScheduleWorkflow({ selectedDays }) {
  // Layer 3: Process external data
  const jsDays = adaptDaysFromBubble({ bubbleDays: selectedDays });

  // Layer 1: Calculate nights
  const nights = calculateNightsFromDays({ days: jsDays });

  // Layer 2: Validate schedule
  const isValid = isScheduleContiguous({ days: jsDays });

  // Layer 2: Check pricing validity
  const isPriceable = isValidDayCountForPricing({ dayCount: jsDays.length });

  return { isValid, isPriceable, nights };
}
```

**Benefits**:
- Clear dependency flow (no circular dependencies)
- Easy to test each layer independently
- Reusable logic across pages
- Predictable behavior

---

#### 4. Route Registry Pattern

**Concept**: Single source of truth in `routes.config.js` auto-generates all routing files.

**Flow**:
```
routes.config.js (SINGLE SOURCE OF TRUTH)
    ↓
bun run generate-routes
    ↓
├── Vite inputs (for dev server)
├── _redirects (Cloudflare Pages routing)
└── _routes.json (Cloudflare Workers routing)
```

**Route Definition**:
```javascript
// routes.config.js
export const routes = [
  {
    path: '/search',
    file: 'search.html',
    protected: false,           // No auth required
    cloudflareInternal: false,  // Public route
    hasDynamicSegment: false
  },
  {
    path: '/host-overview',
    file: 'host-overview.html',
    protected: true,            // Auth required
    cloudflareInternal: false,
    hasDynamicSegment: false
  }
];
```

**Generated Files**:

**_redirects** (Cloudflare Pages):
```
/search  /search.html  200
/host-overview  /host-overview.html  200
```

**_routes.json** (Cloudflare Workers):
```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/images/*", "/videos/*"]
}
```

**Benefits**:
- Change route once → updates everywhere
- No manual editing of routing files
- Validation prevents mistakes
- Consistent across dev/production

---

### Key Dependencies & Integrations

#### React Ecosystem
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-hook-form": "^7.66.1",
  "react-datepicker": "^8.9.0"
}
```

#### Backend & APIs
- **Supabase** (`@supabase/supabase-js`) - PostgreSQL, Edge Functions, Storage, Auth
- **Bubble.io** - Legacy backend (proxied through Supabase Edge Functions)

#### Third-Party Services
- **Google Maps API** (`@vis.gl/react-google-maps`) - Location visualization
- **OpenAI API** - AI features (market reports, content generation)
- **Slack Webhooks** - Internal notifications
- **Hotjar** - User behavior tracking

#### Utility Libraries
- **date-fns** + **date-fns-tz** - Date manipulation with timezone support
- **framer-motion** - Animations
- **lucide-react** - Icon library (552+ icons)
- **styled-components** - CSS-in-JS
- **zod** - Schema validation and type inference
- **qrcode.react** - QR code generation
- **lottie-react** - Lottie animation player

---

### Major Subsystems

#### 1. Authentication System

**Files**:
- `lib/auth.js` - Core auth utilities (275 lines)
- `lib/secureStorage.js` - AES-encrypted localStorage (98 lines)
- `logic/workflows/auth/checkAuthStatusWorkflow.js` - Auth state validation
- `logic/workflows/auth/validateTokenWorkflow.js` - Token validation
- `islands/shared/LoggedInAvatar/` - Auth-aware UI component

**Flow**:
```
1. User submits login form
   ↓
2. auth.js → loginUser(email, password)
   ↓
3. Calls Supabase Edge Function: auth-user (action: "login")
   ↓
4. Edge Function validates with Bubble.io
   ↓
5. Returns: { success, data: { token, user, userType } }
   ↓
6. secureStorage.js → setSecureItem('splitlease_auth_token', token)
   ↓
7. Store user type (Host/Guest) in localStorage
   ↓
8. Redirect to appropriate dashboard
```

**Key Functions**:
- `loginUser(email, password)` - Login with credentials
- `logoutUser()` - Clear session and redirect
- `checkAuthStatus()` - Validate current session
- `validateTokenAndFetchUser()` - Refresh user data
- `hasValidTokens()` - Check token existence
- `isProtectedPage(pathname)` - Route guard
- `requireAuth()` - Auth middleware for pages

**Security**:
- Tokens encrypted with AES-256 before localStorage
- Automatic token refresh on page load
- Protected routes redirect to login
- CSRF protection via Supabase

---

#### 2. Listing Management System

**Files**:
- `islands/pages/SelfListingPage/` - Multi-step listing creation (TypeScript)
- `islands/pages/SelfListingPageV2/` - Updated version
- `islands/pages/ListingDashboardPage/` - Single listing management
- `islands/pages/PreviewSplitLeasePage/` - Host preview mode
- `lib/listingService.js` - CRUD operations
- `lib/listingDataFetcher.js` - Fetch listing data
- `logic/calculators/pricing/` - Pricing calculations
- `logic/processors/listing/` - Data extraction

**SelfListingPage Wizard (7 Steps)**:
1. **Space Snapshot** - Bedrooms, bathrooms, square footage, neighborhood
2. **Features** - Furniture, appliances, storage, workspace
3. **Lease Styles** - Lease type, move-in flexibility, minimum stay
4. **Pricing** - Base rates by frequency (weekly, monthly, 4-week)
5. **Rules** - House rules, smoking policy, pet policy, guest rules
6. **Photos** - Upload and order photos (drag-and-drop)
7. **Review** - Final review before submission

**ListingDashboardPage Tabs**:
- **Preview** - View as guest would see
- **Manage** - Edit listing details (in-place editing)
- **Proposals** - Incoming proposals for this listing
- **Meetings** - Scheduled virtual meetings
- **Leases** - Active leases for this listing

**CRUD Operations**:
- `createListing(data)` - Create new listing (calls `listing` Edge Function)
- `updateListing(id, changedFields)` - **CRITICAL**: Only send changed fields
- `deleteListing(id)` - Soft delete listing
- `fetchListing(id)` - Get single listing
- `fetchUserListings(userId)` - Get all listings for user

---

#### 3. Proposal/Booking System

**Files**:
- `islands/pages/GuestProposalsPage/` - Guest dashboard
- `islands/pages/HostProposalsPage/` - Host dashboard
- `islands/shared/CreateProposalFlowV2/` - Booking wizard
- `lib/proposalDataFetcher.js` - Fetch proposal data
- `logic/rules/proposals/` - Proposal validation
- `logic/workflows/proposals/` - Proposal orchestration
- `islands/modals/ProposalModal.jsx` - Proposal details
- `islands/modals/CounterOfferModal.jsx` - Counteroffer UI
- `islands/modals/CancellationModal.jsx` - Cancellation flow

**Proposal States** (from `lib/constants/proposalStatuses.js`):
```javascript
export const PROPOSAL_STATUSES = {
  SUBMITTED: 'Submitted',           // New proposal from guest
  UNDER_REVIEW: 'Under Review',     // Host reviewing
  COUNTERED: 'Countered',           // Host sent counteroffer
  ACCEPTED: 'Accepted',             // Both parties agreed
  REJECTED: 'Rejected',             // Either party rejected
  CANCELLED: 'Cancelled',           // Either party cancelled
  EXPIRED: 'Expired'                // Proposal expired
};
```

**Proposal Stages** (from `lib/constants/proposalStages.js`):
```javascript
export const PROPOSAL_STAGES = {
  SELECTION: 'Selection',           // Day/time selection
  VERIFICATION: 'Verification',     // Identity verification
  APPROVAL: 'Approval',             // Host approval
  ACTIVE: 'Active',                 // Lease is active
  COMPLETED: 'Completed'            // Lease completed
};
```

**Booking Flow (Guest)**:
```
1. Browse listings → View listing details
   ↓
2. Select days on calendar (0-indexed: 0=Sun, 6=Sat)
   ↓
3. CreateProposalFlowV2:
   - Step 1: Select days & move-in date
   - Step 2: View pricing breakdown
   - Step 3: Add message to host
   - Step 4: Confirm and submit
   ↓
4. Calls proposal Edge Function (action: "create")
   ↓
5. Proposal created in Supabase → Enqueued for Bubble sync
   ↓
6. Redirect to Guest Proposals page
```

**Host Actions**:
- **Review** - View proposal details
- **Accept** - Accept proposal (locks calendar)
- **Counter** - Send counteroffer (different price/dates)
- **Reject** - Reject proposal
- **Message** - Send message to guest

**Guest Actions**:
- **Accept Counter** - Accept host's counteroffer
- **Reject Counter** - Reject host's counteroffer
- **Cancel** - Cancel proposal (before acceptance)
- **Message** - Send message to host

---

#### 4. Search & Discovery System

**Files**:
- `islands/pages/SearchPage/` - Search and browse
- `islands/pages/ViewSplitLeasePage/` - Listing detail
- `islands/shared/ListingCard/` - Reusable card component
- `islands/shared/GoogleMap/` - Map display
- `islands/shared/SearchScheduleSelector/` - Day filtering UI
- `lib/dataLookups.js` - Reference data (neighborhoods, amenities)
- `logic/rules/search/` - Search validation

**Search Filters**:

| Filter Category | Options |
|----------------|---------|
| **Location** | Borough (Manhattan, Brooklyn, Queens, Bronx, Staten Island), Neighborhood (100+ options), ZIP code |
| **Price Tier** | Budget (<$1500), Mid-range ($1500-$2500), Premium (>$2500) |
| **Days/Week** | Specific days (checkboxes for Sun-Sat), Flexible (any combination) |
| **Bedrooms** | Studio, 1, 2, 3, 4+ |
| **Bathrooms** | 1, 2, 3+ |
| **Amenities** | WiFi, Laundry, Parking, Gym, Doorman, Elevator, Pet-Friendly, Balcony/Patio, Storage |

**Search Flow**:
```
1. User selects filters
   ↓
2. SearchPage calls lib/listingDataFetcher.fetchListings(filters)
   ↓
3. Constructs Supabase query with filters:
   - Location: borough, neighborhood, zip
   - Price: price_weekly >= min && price_weekly <= max
   - Days: available_days JSONB contains selectedDays
   - Amenities: amenities JSONB contains filter
   ↓
4. Returns listings with:
   - Basic info (title, price, photos)
   - Location (address, neighborhood)
   - Availability (available_days array)
   - Photos (photo_urls array)
   ↓
5. Render ListingCard for each result
```

**ListingCard Features**:
- Primary photo with fallback
- Favorite button (requires auth)
- Price display (weekly/monthly)
- Location (neighborhood, borough)
- Key details (bedrooms, bathrooms)
- Availability summary (e.g., "Mon-Fri")
- Click → Navigate to view-split-lease

---

#### 5. Virtual Meeting System

**Files**:
- `islands/shared/VirtualMeetingManager/` - Complete meeting UI
- `logic/rules/proposals/virtualMeetingRules.js` - Validation
- `logic/workflows/proposals/virtualMeetingWorkflow.js` - Orchestration
- `islands/modals/VirtualMeetingModal.jsx` - Meeting details modal

**Features**:
- **Book Meeting** - Guest requests meeting with host
- **Propose Times** - Host proposes available time slots
- **Accept Time** - Guest accepts proposed time
- **Reject Time** - Guest rejects and requests different time
- **Cancel Meeting** - Either party cancels
- **View Scheduled** - View all scheduled meetings

**Meeting States**:
- `requested` - Guest requested meeting
- `time_proposed` - Host proposed time slot(s)
- `confirmed` - Both parties confirmed time
- `cancelled` - Meeting cancelled
- `completed` - Meeting completed

**Flow**:
```
1. Guest clicks "Request Virtual Meeting" on proposal
   ↓
2. VirtualMeetingManager opens
   ↓
3. Guest selects preferred times (3 options)
   ↓
4. Calls virtual-meeting Edge Function (action: "create")
   ↓
5. Host receives notification
   ↓
6. Host proposes time slot
   ↓
7. Guest accepts → Meeting confirmed
   ↓
8. Both parties receive confirmation with meeting link
```

---

#### 6. Rental Application System

**Files**:
- `islands/pages/RentalApplicationPage/` - Multi-step application
- `islands/pages/RentalApplicationPage/store/` - Zustand state management
- `islands/pages/AccountProfilePage/components/RentalApplicationWizardModal/` - Modal wizard
- `logic/workflows/` - Application validation

**Application Sections**:

1. **Personal Information**
   - Full name, email, phone
   - Date of birth, SSN
   - Current address

2. **Occupants**
   - Number of occupants
   - Relationship to applicant
   - Age, name for each occupant

3. **Employment**
   - Employer name, position, duration
   - Income verification (annual salary)
   - Previous employment (if < 2 years)

4. **Verification**
   - Identity verification (ID upload)
   - Background check consent
   - Credit check consent

5. **Documents**
   - Lease agreement (if current renter)
   - Government-issued ID
   - Proof of income (pay stubs, tax returns)
   - References (2-3 personal/professional)

**State Management** (Zustand):
```javascript
// store/applicationStore.js
export const useApplicationStore = create((set) => ({
  currentStep: 1,
  formData: {
    personalInfo: {},
    occupants: [],
    employment: {},
    verification: {},
    documents: []
  },
  setCurrentStep: (step) => set({ currentStep: step }),
  updateFormData: (section, data) => set((state) => ({
    formData: { ...state.formData, [section]: data }
  })),
  resetForm: () => set({ currentStep: 1, formData: {} })
}));
```

---

### File Naming Conventions

| File Type | Convention | Examples |
|-----------|-----------|----------|
| **Page Components** | PascalCase + "Page" suffix | `SearchPage.jsx`, `HostOverviewPage.jsx` |
| **Shared Components** | PascalCase | `Button.jsx`, `Header.jsx`, `ListingCard.jsx` |
| **Logic Hooks** | camelCase + "use" prefix + "Logic" suffix | `useSearchPageLogic.js`, `useProposalButtonStates.js` |
| **Calculators** | camelCase + "calculate" or "get" prefix | `calculateNightsFromDays.js`, `getNightlyRateByFrequency.js` |
| **Rules** | camelCase + "is", "can", "has", "should" prefix | `isScheduleContiguous.js`, `canAcceptProposal.js` |
| **Processors** | camelCase + "adapt", "process", "format" prefix | `adaptDaysFromBubble.js`, `processUserData.js` |
| **Workflows** | camelCase + "Workflow" suffix | `validateScheduleWorkflow.js`, `acceptProposalWorkflow.js` |
| **Utilities** | camelCase descriptive | `auth.js`, `dayUtils.js`, `navigation.js` |
| **Entry Points** | kebab-case matching HTML | `search.jsx`, `host-overview.jsx` |

---

## Backend Architecture (supabase/)

### Directory Structure

```
supabase/
├── functions/                      # Edge Functions (Deno/TypeScript)
│   ├── auth-user/                 # Authentication router
│   │   └── index.ts              # 7 actions: login, signup, logout, validate, reset, update, magic
│   ├── listing/                   # Listing CRUD (atomic sync)
│   │   └── index.ts              # Create→Fetch→Sync pattern
│   ├── proposal/                  # Proposal CRUD (queue-based sync)
│   │   └── index.ts              # Create in Supabase → Enqueue for Bubble
│   ├── messages/                  # Real-time messaging (native Supabase)
│   │   └── index.ts              # NO Bubble dependency
│   ├── bubble_sync/               # Queue processor
│   │   └── index.ts              # 8 actions: process_queue, sync_single, retry, status, cleanup
│   ├── ai-gateway/                # OpenAI proxy with prompt registry
│   │   ├── index.ts              # Dynamic prompt loading + interpolation
│   │   └── prompts/              # Prompt templates with {{variables}}
│   ├── ai-parse-profile/          # Profile parsing
│   ├── ai-signup-guest/           # Guest enrichment
│   ├── cohost-request/            # Cohost workflow
│   ├── cohost-request-slack-callback/  # Slack integration
│   ├── virtual-meeting/           # Meeting orchestration
│   ├── rental-application/        # Application submission
│   ├── communications/            # Communication router
│   ├── send-email/                # SendGrid integration
│   ├── send-sms/                  # Twilio integration
│   ├── slack/                     # [DEPRECATED] Use _shared/slack.ts
│   ├── workflow-enqueue/          # pgmq job enqueueing
│   ├── workflow-orchestrator/     # pgmq job processing
│   ├── pricing/                   # Pricing calculations
│   │
│   └── _shared/                   # Shared utilities (13 modules)
│       ├── types.ts              # Core TypeScript interfaces
│       ├── cors.ts               # CORS headers
│       ├── errors.ts             # Error classes (NO FALLBACK - real errors)
│       ├── validation.ts         # Input validation
│       ├── bubbleSync.ts         # Atomic sync service (Create→Fetch→Sync)
│       ├── openai.ts             # OpenAI wrapper
│       ├── aiTypes.ts            # AI type definitions
│       ├── queueSync.ts          # Queue-based sync helper
│       ├── junctionHelpers.ts    # Junction table operations (dual-write)
│       ├── messagingHelpers.ts   # Native messaging utilities
│       ├── geoLookup.ts          # Geo utilities (borough/hood by ZIP)
│       ├── jsonUtils.ts          # JSONB parsing
│       └── slack.ts              # Slack integration (error collector)
│
├── migrations/                    # Database migrations (17 files)
│   ├── 20231201000000_initial_schema.sql
│   ├── 20231215000000_add_sync_queue.sql
│   ├── 20240110000000_add_junctions.sql
│   └── ... (14 more)
│
├── config.toml                    # Supabase local dev configuration
└── seed.sql                       # Seed data for development
```

---

### Edge Functions Inventory (19 Total)

#### **Core Platform Functions (4)**

##### 1. auth-user (Authentication Router)
- **Path**: `functions/auth-user/index.ts`
- **Purpose**: Central authentication handler for all auth operations
- **Actions**:
  1. `login` - Email/password login → Bubble validation → Return token
  2. `signup` - Create new user → Bubble account creation → Return token
  3. `logout` - Invalidate session → Clear tokens
  4. `validate` - Validate existing token → Return user data
  5. `reset_password` - Send password reset email
  6. `update_password` - Update password with reset token
  7. `generate_magic_link` - Generate passwordless login link
- **Request Example**:
  ```json
  {
    "action": "login",
    "payload": {
      "email": "user@example.com",
      "password": "securePassword123"
    }
  }
  ```
- **Response Example**:
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIs...",
      "user": {
        "id": "user_123",
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "user_type": "Guest"
      }
    }
  }
  ```
- **Integration**: Calls Bubble.io API for validation, syncs to Supabase

---

##### 2. listing (Listing CRUD with Atomic Sync)
- **Path**: `functions/listing/index.ts`
- **Purpose**: Manage listings with ATOMIC CREATE-AND-SYNC pattern
- **Actions**:
  1. `create` - Create in Bubble → Fetch via Data API → Sync to Supabase (ATOMIC)
  2. `update` - Update in Supabase → Enqueue for Bubble sync
  3. `delete` - Soft delete in Supabase → Enqueue for Bubble sync
  4. `fetch` - Get single listing by ID
  5. `fetch_user_listings` - Get all listings for user
- **Atomic Create Pattern**:
  ```typescript
  // Step 1: Create in Bubble (via workflow)
  const bubbleResponse = await triggerBubbleWorkflow('create-listing', payload);

  // Step 2: Fetch created object from Bubble Data API
  const bubbleObject = await fetchBubbleDataAPI(`listing/${bubbleResponse.listing_id}`);

  // Step 3: Sync to Supabase
  const supabaseListing = await syncToSupabase('listing', bubbleObject);

  // If ANY step fails → ENTIRE operation fails (no partial state)
  return { success: true, data: supabaseListing };
  ```
- **CRITICAL**: Only send changed fields on update to prevent FK violations
- **Integration**: Bubble as source of truth, Supabase as replica

---

##### 3. proposal (Proposal CRUD with Queue-Based Sync)
- **Path**: `functions/proposal/index.ts`
- **Purpose**: Manage proposals with QUEUE-BASED ASYNC SYNC
- **Actions**:
  1. `create` - Create in Supabase → Return immediately → Enqueue for Bubble
  2. `update` - Update in Supabase → Enqueue for Bubble
  3. `accept` - Accept proposal → Update status → Enqueue
  4. `reject` - Reject proposal → Update status → Enqueue
  5. `cancel` - Cancel proposal → Update status → Enqueue
  6. `counter` - Send counteroffer → Create new proposal version → Enqueue
  7. `fetch` - Get single proposal
  8. `fetch_user_proposals` - Get all proposals for user
- **Queue-Based Sync Pattern**:
  ```typescript
  // Step 1: Create in Supabase
  const proposal = await supabase
    .from('proposal')
    .insert(payload)
    .select()
    .single();

  // Step 2: Enqueue for Bubble sync (non-blocking)
  await enqueueBubbleSync({
    table: 'proposal',
    record_id: proposal.id,
    operation: 'create',
    priority: 'high'
  });

  // Step 3: Return immediately (don't wait for Bubble sync)
  return { success: true, data: proposal };
  ```
- **Background Processing**: `bubble_sync` function processes queue on cron schedule
- **Benefits**: Fast response times, automatic retries, non-blocking

---

##### 4. messages (Real-Time Messaging)
- **Path**: `functions/messages/index.ts`
- **Purpose**: Native Supabase messaging (NO Bubble dependency)
- **Actions**:
  1. `create_thread` - Create conversation thread
  2. `send_message` - Send message in thread
  3. `fetch_threads` - Get all threads for user
  4. `fetch_messages` - Get messages in thread
  5. `mark_read` - Mark messages as read
- **Realtime Pattern**:
  ```typescript
  // Insert message
  const message = await supabase
    .from('message')
    .insert({
      thread_id,
      sender_id,
      content,
      sent_at: new Date()
    })
    .select()
    .single();

  // Database trigger broadcasts via Realtime
  // Frontend automatically receives via subscription:
  // supabase
  //   .channel('messages')
  //   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message' }, ...)
  ```
- **Benefits**: Zero latency (no Bubble sync), real-time updates, simpler architecture

---

#### **Infrastructure Functions (1)**

##### 5. bubble_sync (Queue Processor)
- **Path**: `functions/bubble_sync/index.ts`
- **Purpose**: Process sync_queue table, sync Supabase → Bubble
- **Actions**:
  1. `process_queue` - Process all pending queue items (cron job)
  2. `process_queue_data_api` - Process queue using Data API (faster)
  3. `sync_single` - Manually trigger sync for single record
  4. `retry_failed` - Retry all failed sync operations
  5. `get_status` - Get sync status for record
  6. `cleanup` - Clean up old completed/failed records
  7. `build_request` - Build Bubble API request from queue item
  8. `sync_signup_atomic` - Special atomic sync for user signup
- **Queue Processing Flow**:
  ```typescript
  // 1. Fetch pending items from sync_queue
  const queueItems = await supabase
    .from('sync_queue')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(100);

  // 2. For each item, sync to Bubble
  for (const item of queueItems) {
    try {
      // Filter Bubble-incompatible fields
      const cleanedData = filterBubbleIncompatibleFields(item.data);

      // Trigger Bubble workflow
      await triggerBubbleWorkflow(item.workflow_name, cleanedData);

      // Mark as completed
      await supabase
        .from('sync_queue')
        .update({ status: 'completed', completed_at: new Date() })
        .eq('id', item.id);
    } catch (error) {
      // Mark as failed, increment retry count
      await supabase
        .from('sync_queue')
        .update({
          status: 'failed',
          error_message: error.message,
          retry_count: item.retry_count + 1
        })
        .eq('id', item.id);
    }
  }
  ```
- **Cron Schedule**: Runs every 5 minutes via Supabase cron
- **Retry Logic**: Max 3 retries with exponential backoff

---

#### **AI Operations Functions (3)**

##### 6. ai-gateway (OpenAI Proxy with Prompt Registry)
- **Path**: `functions/ai-gateway/index.ts`
- **Purpose**: Central AI gateway with dynamic prompt templates
- **Actions**:
  1. `complete` - Non-streaming completion
  2. `stream` - Streaming completion (SSE)
- **Prompt Registry**: Centralized prompt templates with variable interpolation
- **Pattern**:
  ```typescript
  // 1. Load prompt config
  const promptConfig = await loadPromptConfig('market-analysis');

  // 2. Run data loaders
  const data = await runDataLoaders(promptConfig.dataLoaders, payload);

  // 3. Interpolate variables
  const finalPrompt = interpolatePrompt(promptConfig.template, data);
  // Template: "Analyze the {{neighborhood}} market for {{property_type}}"
  // Result: "Analyze the Williamsburg market for 2-bedroom apartment"

  // 4. Call OpenAI
  const completion = await openai.chat.completions.create({
    model: promptConfig.model,
    messages: [{ role: 'system', content: finalPrompt }]
  });

  return { success: true, data: completion.choices[0].message.content };
  ```
- **Prompt Examples**:
  - `market-analysis` - Generate neighborhood market report
  - `listing-description` - Generate listing description from details
  - `profile-enrichment` - Enrich guest profile from signup data
  - `message-suggestions` - Suggest responses to host/guest messages

---

##### 7. ai-parse-profile
- **Path**: `functions/ai-parse-profile/index.ts`
- **Purpose**: Parse unstructured profile data into structured fields
- **Use Case**: Import profiles from external sources (CSV, text, etc.)

---

##### 8. ai-signup-guest
- **Path**: `functions/ai-signup-guest/index.ts`
- **Purpose**: Enrich guest profiles during signup with AI-generated insights
- **Use Case**: Generate profile suggestions based on signup data

---

#### **Specialized Domain Functions (5)**

##### 9. cohost-request
- **Path**: `functions/cohost-request/index.ts`
- **Purpose**: Cohost management workflow
- **Handlers**:
  1. `create_request` - Host requests cohost
  2. `approve_request` - Approve cohost request
  3. `deny_request` - Deny cohost request

---

##### 10. cohost-request-slack-callback
- **Path**: `functions/cohost-request-slack-callback/index.ts`
- **Purpose**: Handle Slack interactive callbacks for cohost approvals
- **Flow**: Host requests cohost → Slack notification → Admin clicks approve/deny → Callback updates DB

---

##### 11. virtual-meeting
- **Path**: `functions/virtual-meeting/index.ts`
- **Purpose**: Virtual meeting orchestration
- **Handlers**:
  1. `create` - Guest requests meeting
  2. `propose_time` - Host proposes time slot
  3. `accept_time` - Guest accepts time
  4. `reject_time` - Guest rejects time
  5. `cancel` - Either party cancels
  6. `fetch_meetings` - Get all meetings for user

---

##### 12. rental-application
- **Path**: `functions/rental-application/index.ts`
- **Purpose**: Rental application submission and processing
- **Handlers**:
  1. `submit` - Submit application
  2. `fetch` - Get application by ID
  3. `fetch_user_applications` - Get all applications for user

---

##### 13. communications
- **Path**: `functions/communications/index.ts`
- **Purpose**: Communication router (email, SMS, Slack)
- **Delegates to**: `send-email`, `send-sms`, `slack`

---

#### **Notification Functions (3)**

##### 14. send-email
- **Path**: `functions/send-email/index.ts`
- **Purpose**: SendGrid email integration
- **Features**: Template support, attachment handling, tracking

---

##### 15. send-sms
- **Path**: `functions/send-sms/index.ts`
- **Purpose**: Twilio SMS integration
- **Rate Limits**: 30 SMS/hour per user

---

##### 16. slack
- **Path**: `functions/slack/index.ts`
- **Status**: [DEPRECATED] Use `_shared/slack.ts` instead
- **Reason**: Consolidated into shared utility for fire-and-forget pattern

---

#### **Workflow Orchestration Functions (2)**

##### 17. workflow-enqueue
- **Path**: `functions/workflow-enqueue/index.ts`
- **Purpose**: Enqueue jobs to pgmq (PostgreSQL Message Queue)
- **Use Case**: Background jobs (email campaigns, data processing, etc.)

---

##### 18. workflow-orchestrator
- **Path**: `functions/workflow-orchestrator/index.ts`
- **Purpose**: Process pgmq jobs
- **Pattern**: Poll queue → Execute job → Update status

---

##### 19. pricing
- **Path**: `functions/pricing/index.ts`
- **Purpose**: Server-side pricing calculations
- **Use Case**: Validate client-side pricing, prevent price manipulation

---

### Shared Utilities (_shared/) - 17 Modules

#### Functional Programming Utilities (fp/) - 4 Modules

##### 1. result.ts (Result Type for Functional Error Handling)
```typescript
// Result type - replaces try/catch with explicit error handling
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

// Constructors
export const ok = <T>(value: T): Result<T, never> => ({
  ok: true,
  value
});

export const err = <E>(error: E): Result<never, E> => ({
  ok: false,
  error
});

// Combinators
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

export function chain<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}

// Promise integration
export async function fromPromise<T>(
  promise: Promise<T>
): Promise<Result<T, Error>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    return err(error as Error);
  }
}
```

**Usage in Edge Functions**:
```typescript
// Before (imperative with try/catch)
try {
  const user = await getUser(id);
  const validated = validateUser(user);
  return { success: true, data: validated };
} catch (error) {
  return { success: false, error: error.message };
}

// After (functional with Result)
const userResult = await fromPromise(getUser(id));
const validatedResult = chain(userResult, validateUser);

return validatedResult.ok
  ? { success: true, data: validatedResult.value }
  : { success: false, error: validatedResult.error.message };
```

---

##### 2. pipeline.ts (Function Composition Utilities)
```typescript
// Synchronous pipeline
export function pipe<A, B>(
  value: A,
  fn1: (a: A) => B
): B;
export function pipe<A, B, C>(
  value: A,
  fn1: (a: A) => B,
  fn2: (b: B) => C
): C;
// ... (overloads for up to 10 functions)

// Async pipeline
export function pipeAsync<A, B>(
  value: A,
  fn1: (a: A) => Promise<B>
): Promise<B>;
export function pipeAsync<A, B, C>(
  value: A,
  fn1: (a: A) => Promise<B>,
  fn2: (b: B) => Promise<C>
): Promise<C>;
// ... (overloads for up to 10 functions)

// Function composition (right-to-left)
export function compose<A, B, C>(
  fn2: (b: B) => C,
  fn1: (a: A) => B
): (a: A) => C {
  return (a: A) => fn2(fn1(a));
}

// Tap (side effects without changing value)
export function tap<T>(fn: (value: T) => void): (value: T) => T {
  return (value: T) => {
    fn(value);
    return value;
  };
}
```

**Usage in Edge Functions**:
```typescript
// Before
const parsed = parseRequest(req);
const validated = validateAction(parsed.action);
const result = await handleAction(validated);
return formatResponse(result);

// After
return pipeAsync(
  req,
  parseRequest,
  validateAction,
  handleAction,
  formatResponse
);
```

---

##### 3. errorLog.ts (Immutable Error Logging)
```typescript
// Replaces the old mutable ErrorCollector class
export interface ErrorEntry {
  readonly timestamp: string;
  readonly message: string;
  readonly context?: Record<string, unknown>;
  readonly stack?: string;
}

export type ErrorLog = readonly ErrorEntry[];

// Add error to log (returns new log, doesn't mutate)
export function logError(
  log: ErrorLog,
  message: string,
  context?: Record<string, unknown>
): ErrorLog {
  const entry: ErrorEntry = {
    timestamp: new Date().toISOString(),
    message,
    context,
    stack: new Error().stack
  };
  return [...log, entry];
}

// Create initial empty log
export const emptyLog: ErrorLog = [];

// Format log for Slack reporting
export function formatErrorLog(log: ErrorLog): string {
  return log.map(entry => {
    const contextStr = entry.context
      ? `\nContext: ${JSON.stringify(entry.context, null, 2)}`
      : '';
    return `[${entry.timestamp}] ${entry.message}${contextStr}`;
  }).join('\n\n');
}
```

**Usage in Edge Functions**:
```typescript
// Before (mutable ErrorCollector)
const errors = new ErrorCollector();
errors.add('Validation failed', { field: 'email' });
errors.add('Auth failed', { userId });
await errors.reportToSlack();

// After (immutable ErrorLog)
let errorLog = emptyLog;
errorLog = logError(errorLog, 'Validation failed', { field: 'email' });
errorLog = logError(errorLog, 'Auth failed', { userId });
await reportToSlack(formatErrorLog(errorLog));
```

---

##### 4. orchestration.ts (Shared Request/Response Utilities)
```typescript
// Parse Edge Function request
export function parseRequest<T>(
  req: Request
): Result<{ action: string; payload: T }, ValidationError> {
  try {
    const json = await req.json();
    if (!json.action || typeof json.action !== 'string') {
      return err(new ValidationError('Missing or invalid action field'));
    }
    return ok({ action: json.action, payload: json.payload });
  } catch (error) {
    return err(new ValidationError('Invalid JSON'));
  }
}

// Validate action against allowed list
export function validateAction(
  allowed: readonly string[],
  action: string
): Result<string, ValidationError> {
  return allowed.includes(action)
    ? ok(action)
    : err(new ValidationError(`Unknown action: ${action}. Allowed: ${allowed.join(', ')}`));
}

// Route to handler using map
export function routeToHandler<P, R>(
  handlers: Readonly<Record<string, (payload: P) => Promise<R>>>,
  action: string,
  payload: P
): Promise<Result<R, Error>> {
  const handler = handlers[action];
  if (!handler) {
    return Promise.resolve(err(new Error(`No handler for action: ${action}`)));
  }
  return fromPromise(handler(payload));
}

// Format success response
export function successResponse<T>(data: T): EdgeFunctionResponse<T> {
  return { success: true, data };
}

// Format error response
export function errorResponse(error: Error): EdgeFunctionResponse<never> {
  return { success: false, error: error.message };
}
```

**Usage in Edge Functions**:
```typescript
// Standard orchestration pattern
Deno.serve(async (req: Request) => {
  const allowedActions = ['create', 'update', 'delete'] as const;

  const handlers = {
    create: handleCreate,
    update: handleUpdate,
    delete: handleDelete
  };

  // Parse → Validate → Route → Execute → Respond
  const requestResult = await parseRequest(req);
  if (!requestResult.ok) {
    return new Response(JSON.stringify(errorResponse(requestResult.error)));
  }

  const { action, payload } = requestResult.value;
  const actionResult = validateAction(allowedActions, action);
  if (!actionResult.ok) {
    return new Response(JSON.stringify(errorResponse(actionResult.error)));
  }

  const handlerResult = await routeToHandler(handlers, action, payload);
  const response = handlerResult.ok
    ? successResponse(handlerResult.value)
    : errorResponse(handlerResult.error);

  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
```

---

#### Core Utilities

##### 5. types.ts (Core TypeScript Interfaces)
```typescript
// Edge Function request/response
export interface EdgeFunctionRequest<T = any> {
  action: string;
  payload: T;
}

export interface EdgeFunctionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Bubble sync configuration
export interface BubbleSyncConfig {
  workflowName: string;
  dataApiEndpoint: string;
  fieldMapping: Record<string, string>;
}

// Authentication
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    user_type: 'Host' | 'Guest';
  };
}
```

---

##### 6. cors.ts (CORS Headers)
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};
```

---

##### 7. errors.ts (Error Classes - NO FALLBACK)
```typescript
// Bubble API errors (NO generic fallback - real error shown)
export class BubbleApiError extends Error {
  constructor(message: string, public bubbleResponse?: any) {
    super(message);
    this.name = 'BubbleApiError';
  }
}

// Supabase sync errors
export class SupabaseSyncError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'SupabaseSyncError';
  }
}

// Validation errors
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Authentication errors
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// OpenAI errors
export class OpenAIError extends Error {
  constructor(message: string, public openaiResponse?: any) {
    super(message);
    this.name = 'OpenAIError';
  }
}
```

**Philosophy**: NO FALLBACK MECHANISMS - Errors fail fast with full details, no generic "Something went wrong" messages.

---

##### 8. validation.ts (Input Validation)
```typescript
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?1?\d{10,14}$/;
  return phoneRegex.test(phone);
}

export function validateRequired(value: any, fieldName: string): void {
  if (!value) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
}

export function validateAction(action: string, allowedActions: string[]): void {
  if (!allowedActions.includes(action)) {
    throw new ValidationError(`Invalid action: ${action}. Allowed: ${allowedActions.join(', ')}`);
  }
}
```

---

##### 9. bubbleSync.ts (Atomic Sync Service)
```typescript
// Atomic Create-and-Sync Pattern
export class BubbleSyncService {
  // Step 1: Trigger Bubble workflow
  async triggerWorkflow(workflowName: string, data: any): Promise<any> {
    const response = await fetch(`${BUBBLE_API_URL}/workflows/${workflowName}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${BUBBLE_API_KEY}` },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new BubbleApiError(`Workflow failed: ${workflowName}`);
    }

    return response.json();
  }

  // Step 2: Fetch created object from Bubble Data API
  async fetchBubbleObject(table: string, id: string): Promise<any> {
    const response = await fetch(`${BUBBLE_API_URL}/api/1.1/obj/${table}/${id}`, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_KEY}` }
    });

    if (!response.ok) {
      throw new BubbleApiError(`Failed to fetch ${table}/${id}`);
    }

    return response.json();
  }

  // Step 3: Sync to Supabase
  async syncToSupabase(table: string, bubbleObject: any): Promise<any> {
    const { data, error } = await supabase
      .from(table)
      .upsert({
        bubble_id: bubbleObject._id,
        ...transformBubbleToSupabase(bubbleObject)
      })
      .select()
      .single();

    if (error) {
      throw new SupabaseSyncError(`Failed to sync ${table}`, error);
    }

    return data;
  }

  // All-in-one: Create in Bubble → Fetch → Sync (ATOMIC)
  async createAndSync(table: string, workflowName: string, data: any): Promise<any> {
    // If ANY step fails, entire operation fails
    const bubbleResponse = await this.triggerWorkflow(workflowName, data);
    const bubbleObject = await this.fetchBubbleObject(table, bubbleResponse.id);
    const supabaseObject = await this.syncToSupabase(table, bubbleObject);

    return supabaseObject;
  }
}
```

---

##### 10. openai.ts (OpenAI Wrapper)
```typescript
export function getApiKey(): string {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY not configured');
  return key;
}

export async function complete(prompt: string, model = 'gpt-4'): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function* stream(prompt: string, model = 'gpt-4'): AsyncGenerator<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true
    })
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim());

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.choices[0].delta.content) {
          yield data.choices[0].delta.content;
        }
      }
    }
  }
}
```

---

##### 11. aiTypes.ts (AI Type Definitions)
```typescript
export interface PromptConfig {
  name: string;
  model: string;
  template: string;
  dataLoaders?: DataLoader[];
  variables: string[];
}

export interface DataLoader {
  name: string;
  source: 'supabase' | 'bubble' | 'external';
  query: string;
  transform?: (data: any) => any;
}

export interface AIGatewayRequest {
  promptName: string;
  variables: Record<string, any>;
  stream?: boolean;
}

export interface CompletionResult {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

---

##### 12. queueSync.ts (Queue-Based Sync Helper)
```typescript
// Enqueue record for Bubble sync
export async function enqueueBubbleSync(params: {
  table: string;
  record_id: string;
  operation: 'create' | 'update' | 'delete';
  priority?: 'high' | 'normal' | 'low';
  data?: any;
}): Promise<void> {
  const { table, record_id, operation, priority = 'normal', data } = params;

  // Get workflow name from sync_config table
  const { data: config } = await supabase
    .from('sync_config')
    .select('workflow_name')
    .eq('table_name', table)
    .eq('operation', operation)
    .single();

  if (!config) {
    throw new Error(`No sync config found for ${table}.${operation}`);
  }

  // Insert into sync_queue
  await supabase
    .from('sync_queue')
    .insert({
      table_name: table,
      record_id,
      operation,
      workflow_name: config.workflow_name,
      priority,
      status: 'pending',
      data: data || {}
    });
}

// Filter fields that Bubble doesn't accept
export function filterBubbleIncompatibleFields(data: any): any {
  const incompatibleFields = [
    'bubble_id',
    'created_at',
    'updated_at',
    'sync_status',
    'bubble_sync_error',
    'pending',           // CRITICAL - causes 400 errors
    '_internal',
    'sync_at',
    'last_synced'
  ];

  const cleaned = { ...data };
  incompatibleFields.forEach(field => delete cleaned[field]);

  return cleaned;
}

// Trigger queue processing (fire-and-forget)
export async function triggerQueueProcessing(): Promise<void> {
  // Non-blocking call to bubble_sync function
  fetch(`${SUPABASE_URL}/functions/v1/bubble_sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'process_queue' })
  }).catch(() => {
    // Fire-and-forget - don't block on errors
  });
}
```

---

##### 13. junctionHelpers.ts (Junction Table Operations)
```typescript
// Dual-write pattern during JSONB → junction migration
export async function addUserProposal(userId: string, proposalId: string): Promise<void> {
  // Write to junction table
  await supabase
    .from('junctions.user_proposal')
    .insert({ user_id: userId, proposal_id: proposalId });

  // ALSO update JSONB array (for backward compatibility during migration)
  await supabase.rpc('add_user_to_proposal_jsonb', {
    p_proposal_id: proposalId,
    p_user_id: userId
  });
}

export async function removeListingAmenity(listingId: string, amenity: string): Promise<void> {
  // Remove from junction table
  await supabase
    .from('junctions.listing_amenity')
    .delete()
    .eq('listing_id', listingId)
    .eq('amenity', amenity);

  // ALSO update JSONB array
  await supabase.rpc('remove_amenity_from_listing_jsonb', {
    p_listing_id: listingId,
    p_amenity: amenity
  });
}
```

---

##### 14. messagingHelpers.ts (Native Messaging Utilities)
```typescript
// Generate Bubble-compatible ID (for legacy compatibility)
export function generateBubbleId(): string {
  return `${Date.now()}x${Math.random().toString(36).substr(2, 9)}`;
}

// Get user's Bubble ID
export async function getUserBubbleId(userId: string): Promise<string> {
  const { data } = await supabase
    .from('user')
    .select('bubble_id')
    .eq('id', userId)
    .single();

  return data?.bubble_id || generateBubbleId();
}

// Create message thread (native Supabase)
export async function createThread(params: {
  listing_id: string;
  host_id: string;
  guest_id: string;
}): Promise<any> {
  const { data, error } = await supabase
    .from('message_thread')
    .insert({
      listing_id: params.listing_id,
      host_id: params.host_id,
      guest_id: params.guest_id,
      created_at: new Date()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Send message (native Supabase with Realtime broadcast)
export async function sendMessage(params: {
  thread_id: string;
  sender_id: string;
  content: string;
}): Promise<any> {
  const { data, error } = await supabase
    .from('message')
    .insert({
      thread_id: params.thread_id,
      sender_id: params.sender_id,
      content: params.content,
      sent_at: new Date(),
      read: false
    })
    .select()
    .single();

  if (error) throw error;

  // Database trigger automatically broadcasts via Realtime
  return data;
}
```

---

##### 15. geoLookup.ts (Geo Utilities)
```typescript
// Hardcoded NYC ZIP → Borough/Neighborhood mappings
export function getBoroughByZipCode(zip: string): string | null {
  const zipToBoroughMap: Record<string, string> = {
    '10001': 'Manhattan',
    '10002': 'Manhattan',
    // ... (300+ ZIP codes)
    '11201': 'Brooklyn',
    '11385': 'Queens',
    // ...
  };

  return zipToBoroughMap[zip] || null;
}

export function getHoodByZipCode(zip: string): string | null {
  const zipToHoodMap: Record<string, string> = {
    '10001': 'Chelsea',
    '10002': 'Lower East Side',
    '11201': 'Brooklyn Heights',
    '11385': 'Ridgewood',
    // ... (300+ mappings)
  };

  return zipToHoodMap[zip] || null;
}

export function lookupGeoByZipCode(zip: string): { borough: string | null; neighborhood: string | null } {
  return {
    borough: getBoroughByZipCode(zip),
    neighborhood: getHoodByZipCode(zip)
  };
}
```

---

##### 16. jsonUtils.ts (JSONB Parsing)
```typescript
// Parse JSONB array field (handles string or array)
export function parseJsonArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Parse JSONB object field
export function parseJsonObject(value: any): Record<string, any> {
  if (typeof value === 'object' && value !== null) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return {};
}

// Stringify value for JSONB storage
export function stringifyJsonValue(value: any): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}
```

---

##### 17. slack.ts (Slack Integration with Functional API)
```typescript
// Error collector for consolidated Slack reporting
class ErrorCollector {
  private errors: Array<{ context: string; error: Error }> = [];
  private sent = false;

  collect(context: string, error: Error): void {
    this.errors.push({ context, error });
  }

  async sendToSlack(webhookUrl: string): Promise<void> {
    if (this.sent || this.errors.length === 0) return;

    const blocks = this.errors.map(({ context, error }) => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${context}*\n\`\`\`${error.message}\n${error.stack}\`\`\``
      }
    }));

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks })
    });

    this.sent = true;
  }
}

// Fire-and-forget Slack notification
export async function sendToSlack(webhookUrl: string, message: string): Promise<void> {
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message })
  }).catch(() => {
    // Fire-and-forget - don't block on errors
  });
}

// Create error collector for request
export function createErrorCollector(): ErrorCollector {
  return new ErrorCollector();
}

// Usage:
// const errorCollector = createErrorCollector();
// try { ... } catch (e) { errorCollector.collect('Database query', e); }
// try { ... } catch (e) { errorCollector.collect('Bubble sync', e); }
// errorCollector.sendToSlack(SLACK_WEBHOOK_URL);  // ONE message with all errors
```

**Pattern**: Collect all errors during request execution → Send ONE consolidated Slack message at the end. Fire-and-forget (ZERO latency impact).

---

### Key Architectural Patterns

#### Pattern 1: Action-Based Request Pattern

**ALL Edge Functions** follow this pattern:

```typescript
// Request
interface EdgeFunctionRequest {
  action: string;
  payload: any;
}

// Handler
Deno.serve(async (req) => {
  const { action, payload } = await req.json();

  switch (action) {
    case 'create':
      return handleCreate(payload);
    case 'update':
      return handleUpdate(payload);
    case 'delete':
      return handleDelete(payload);
    default:
      throw new ValidationError(`Unknown action: ${action}`);
  }
});
```

**Benefits**:
- Single endpoint per domain
- Easy to add new actions
- Consistent error handling
- Simpler routing

---

#### Pattern 2: Dual-Sync Architecture

**Two sync modes** depending on criticality:

##### Atomic Sync (Immediate, All-or-Nothing)
- **Use for**: Creates (listings, users)
- **Pattern**: Create in Bubble → Fetch from Bubble → Sync to Supabase
- **Guarantee**: Either ENTIRE operation succeeds or ENTIRE operation fails
- **Latency**: Higher (~2-3 seconds)
- **Example**: `listing` Edge Function

##### Queue-Based Sync (Async, Non-Blocking)
- **Use for**: Updates (proposals, profile changes)
- **Pattern**: Update in Supabase → Return immediately → Enqueue for Bubble
- **Guarantee**: Eventually consistent (background processing)
- **Latency**: Lower (~200ms)
- **Example**: `proposal` Edge Function

---

#### Pattern 3: Native Supabase (No Bubble)

**For new features**, bypass Bubble entirely:

```typescript
// messages Edge Function - pure Supabase
export async function sendMessage(threadId: string, senderId: string, content: string) {
  // 1. Insert into Supabase
  const { data } = await supabase
    .from('message')
    .insert({ thread_id: threadId, sender_id: senderId, content })
    .select()
    .single();

  // 2. Database trigger broadcasts via Realtime (no Bubble sync)
  // Frontend receives instantly via subscription

  return data;
}
```

**Benefits**:
- Zero latency (no Bubble sync)
- Real-time updates (Realtime subscriptions)
- Simpler architecture
- Easier to test

---

#### Pattern 4: AI with Dynamic Prompts

**Central prompt registry** with variable interpolation:

```typescript
// prompts/market-analysis.json
{
  "name": "market-analysis",
  "model": "gpt-4",
  "template": "Analyze the {{neighborhood}} market in {{borough}} for {{property_type}}. Consider:\n- Median rent: {{median_rent}}\n- Vacancy rate: {{vacancy_rate}}\n- Demographics: {{demographics}}",
  "dataLoaders": [
    {
      "name": "median_rent",
      "source": "supabase",
      "query": "SELECT AVG(price_monthly) FROM listing WHERE neighborhood = $1",
      "params": ["{{neighborhood}}"]
    },
    {
      "name": "vacancy_rate",
      "source": "external",
      "url": "https://api.census.gov/data/acs/acs5?get=B25004_008E&for=zip:{{zip_code}}"
    }
  ],
  "variables": ["neighborhood", "borough", "property_type", "zip_code"]
}

// ai-gateway/index.ts
const promptConfig = await loadPromptConfig(promptName);
const data = await runDataLoaders(promptConfig.dataLoaders, variables);
const finalPrompt = interpolatePrompt(promptConfig.template, data);
const completion = await openai.complete(finalPrompt);
```

**Benefits**:
- Centralized prompt management
- Reusable data loaders
- Version control for prompts
- A/B testing prompts

---

#### Pattern 5: Error Consolidation (Fire-and-Forget)

**Collect errors throughout request** → Send ONE Slack message at end:

```typescript
import { createErrorCollector } from './_shared/slack.ts';

Deno.serve(async (req) => {
  const errorCollector = createErrorCollector();

  try {
    // Operation 1
    await databaseQuery();
  } catch (e) {
    errorCollector.collect('Database query failed', e);
  }

  try {
    // Operation 2
    await bubbleSync();
  } catch (e) {
    errorCollector.collect('Bubble sync failed', e);
  }

  // Send consolidated report (fire-and-forget - ZERO latency)
  errorCollector.sendToSlack(SLACK_WEBHOOK_URL);

  return response;
});
```

**Benefits**:
- ONE Slack message per request (not 10+)
- Complete error context
- Zero latency (fire-and-forget)
- Easier debugging

---

### Database Schema (Key Tables)

#### Core Tables

##### listing
- **Purpose**: Rental listings
- **Sync**: Atomic (create), queue-based (update)
- **Critical**: 12 FK constraints (ONLY send changed fields on update)
- **Columns**:
  - `id` (UUID, PK)
  - `bubble_id` (TEXT, unique)
  - `title`, `description`
  - `address`, `city`, `state`, `zip_code`
  - `neighborhood`, `borough`
  - `bedrooms`, `bathrooms`, `square_feet`
  - `price_weekly`, `price_monthly`, `price_four_week`
  - `available_days` (JSONB array: [0,1,2,3,4,5,6])
  - `amenities` (JSONB array)
  - `photos` (JSONB array of URLs)
  - `host_id` (FK → user)
  - `created_at`, `updated_at`

##### proposal
- **Purpose**: Booking proposals
- **Sync**: Queue-based (all operations)
- **Columns**:
  - `id` (UUID, PK)
  - `bubble_id` (TEXT, unique)
  - `listing_id` (FK → listing)
  - `guest_id` (FK → user)
  - `host_id` (FK → user)
  - `status` (submitted, under_review, countered, accepted, rejected, cancelled)
  - `stage` (selection, verification, approval, active, completed)
  - `selected_days` (JSONB array: [0,1,2,3,4,5,6])
  - `move_in_date` (DATE)
  - `move_out_date` (DATE)
  - `total_price` (NUMERIC)
  - `guest_message` (TEXT)
  - `created_at`, `updated_at`

##### user
- **Purpose**: User profiles
- **Sync**: Atomic (signup), queue-based (update)
- **Columns**:
  - `id` (UUID, PK)
  - `bubble_id` (TEXT, unique)
  - `email` (TEXT, unique)
  - `first_name`, `last_name`
  - `user_type` (Host, Guest)
  - `phone`, `profile_photo_url`
  - `created_at`, `updated_at`

##### message_thread
- **Purpose**: Conversation threads (native Supabase)
- **Sync**: None (no Bubble dependency)
- **Columns**:
  - `id` (UUID, PK)
  - `listing_id` (FK → listing)
  - `host_id` (FK → user)
  - `guest_id` (FK → user)
  - `created_at`, `updated_at`

##### message
- **Purpose**: Individual messages (native Supabase)
- **Sync**: None (Realtime broadcast only)
- **Columns**:
  - `id` (UUID, PK)
  - `thread_id` (FK → message_thread)
  - `sender_id` (FK → user)
  - `content` (TEXT)
  - `sent_at` (TIMESTAMP)
  - `read` (BOOLEAN)

---

#### Infrastructure Tables

##### sync_queue
- **Purpose**: Queue for Supabase → Bubble sync
- **Processed by**: `bubble_sync` Edge Function (cron: every 5 min)
- **Columns**:
  - `id` (UUID, PK)
  - `table_name` (TEXT)
  - `record_id` (UUID)
  - `operation` (create, update, delete)
  - `workflow_name` (TEXT)
  - `priority` (high, normal, low)
  - `status` (pending, processing, completed, failed, skipped)
  - `data` (JSONB)
  - `retry_count` (INTEGER, default: 0, max: 3)
  - `error_message` (TEXT)
  - `created_at`, `completed_at`

##### sync_config
- **Purpose**: Mapping of table operations to Bubble workflows
- **Columns**:
  - `table_name` (TEXT)
  - `operation` (create, update, delete)
  - `workflow_name` (TEXT)
  - `enabled` (BOOLEAN)

---

#### Junction Tables (junctions schema)

**Purpose**: Normalize JSONB arrays during migration (dual-write pattern)

##### junctions.user_proposal
- **Columns**: `user_id` (FK), `proposal_id` (FK), `role` (guest, host)

##### junctions.listing_amenity
- **Columns**: `listing_id` (FK), `amenity` (TEXT)

##### junctions.listing_unit
- **Columns**: `listing_id` (FK), `unit_number` (TEXT)

##### junctions.listing_preference
- **Columns**: `listing_id` (FK), `preference` (TEXT)

---

### Bubble-Incompatible Fields (CRITICAL)

**ALWAYS filter before syncing to Bubble**:

```typescript
const BUBBLE_INCOMPATIBLE_FIELDS = [
  'bubble_id',          // Bubble's own ID
  'created_at',         // Bubble generates
  'updated_at',         // Bubble generates
  'sync_status',        // Internal sync tracking
  'bubble_sync_error',  // Internal error tracking
  'pending',            // **CRITICAL** - causes 400 errors
  '_internal',          // Internal metadata
  'sync_at',            // Sync timestamp
  'last_synced'         // Last sync timestamp
];
```

**Filtering function**:
```typescript
function filterBubbleIncompatibleFields(data: any): any {
  const cleaned = { ...data };
  BUBBLE_INCOMPATIBLE_FIELDS.forEach(field => delete cleaned[field]);
  return cleaned;
}
```

---

### Configuration (config.toml)

```toml
[api]
enabled = true
port = 54321
schemas = ["public", "junctions"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
major_version = 17

[studio]
enabled = true
port = 54323

[functions]
enabled = true
port = 54324

[auth]
enabled = true
site_url = "http://localhost:8000"
additional_redirect_urls = ["http://localhost:8000/**"]
jwt_expiry = 3600
enable_signup = true

[email]
enable_confirmations = false

[rate_limits]
email_per_hour = 2
sms_per_hour = 30
```

---

## Data Flow & Integration

### End-to-End Flow: Guest Books Listing

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React)                                                │
├─────────────────────────────────────────────────────────────────┤
│ 1. Guest browses search.html                                    │
│    - Filters by location, days, price                           │
│    - SearchPage calls lib/listingDataFetcher                    │
│    - Fetches from Supabase: SELECT * FROM listing WHERE ...     │
│                                                                 │
│ 2. Guest clicks listing → view-split-lease.html                 │
│    - ViewSplitLeasePage fetches listing details                 │
│    - Shows photos, amenities, pricing, availability             │
│                                                                 │
│ 3. Guest clicks "Book Now" → CreateProposalFlowV2 opens         │
│    - Step 1: Select days [1,2,3,4,5] (Mon-Fri)                  │
│    - Step 2: Select move-in date (2026-02-01)                   │
│    - Step 3: View pricing breakdown ($2,500/week)               │
│    - Step 4: Add message to host                                │
│    - Step 5: Confirm and submit                                 │
│                                                                 │
│ 4. Frontend calls lib/proposalService.createProposal()          │
│    - Sends: { listing_id, guest_id, selected_days, move_in }    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP POST
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (Supabase Edge Functions)                               │
├─────────────────────────────────────────────────────────────────┤
│ 5. proposal Edge Function receives request                      │
│    - Action: "create"                                           │
│    - Validates: guest_id, listing_id, selected_days             │
│                                                                 │
│ 6. Creates proposal in Supabase (queue-based sync)              │
│    - INSERT INTO proposal (...)                                 │
│    - Status: "submitted", Stage: "selection"                    │
│    - Returns proposal immediately (200ms latency)               │
│                                                                 │
│ 7. Enqueues for Bubble sync (non-blocking)                      │
│    - INSERT INTO sync_queue (table: proposal, op: create)       │
│    - Priority: "high"                                           │
│    - Fire-and-forget trigger: bubble_sync function              │
│                                                                 │
│ 8. (5 minutes later) bubble_sync cron job runs                  │
│    - Fetches pending items from sync_queue                      │
│    - Filters Bubble-incompatible fields                         │
│    - Triggers Bubble workflow: "create-proposal"                │
│    - Updates sync_queue status: "completed"                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Returns proposal
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React)                                                │
├─────────────────────────────────────────────────────────────────┤
│ 9. CreateProposalFlowV2 receives success response               │
│    - Shows success message                                      │
│    - Redirects to guest-proposals.html                          │
│                                                                 │
│ 10. GuestProposalsPage loads                                    │
│     - Fetches proposals: lib/proposalDataFetcher                │
│     - Shows proposal status: "Submitted"                        │
│     - Host notification sent (email/SMS)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

### Day Indexing Conversion Flow

**CRITICAL**: Frontend uses 0-based (JavaScript), Bubble uses 1-based.

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (JavaScript - 0-based)                                 │
├─────────────────────────────────────────────────────────────────┤
│ User selects days: Mon-Fri                                      │
│ Internal representation: [1, 2, 3, 4, 5]                        │
│ (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ SUPABASE (PostgreSQL - 0-based JSONB)                           │
├─────────────────────────────────────────────────────────────────┤
│ Stored in database: available_days = [1, 2, 3, 4, 5]            │
│ NO CONVERSION NEEDED (PostgreSQL uses 0-based internally)       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ EDGE FUNCTION (Before Bubble Sync)                              │
├─────────────────────────────────────────────────────────────────┤
│ import { adaptDaysToBubble } from './_shared/adaptDaysToBubble' │
│                                                                 │
│ const bubbleDays = adaptDaysToBubble({ jsDays: [1,2,3,4,5] })   │
│ Result: [2, 3, 4, 5, 6]  // +1 conversion                       │
│                                                                 │
│ Send to Bubble: { available_days: [2, 3, 4, 5, 6] }             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ BUBBLE.IO (1-based)                                             │
├─────────────────────────────────────────────────────────────────┤
│ Receives: [2, 3, 4, 5, 6]                                       │
│ Interprets: Mon-Fri                                             │
│ (1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat)              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ EDGE FUNCTION (Reading from Bubble Data API)                    │
├─────────────────────────────────────────────────────────────────┤
│ import { adaptDaysFromBubble } from './_shared/adaptDaysFromBubble'│
│                                                                 │
│ const jsDays = adaptDaysFromBubble({ bubbleDays: [2,3,4,5,6] }) │
│ Result: [1, 2, 3, 4, 5]  // -1 conversion                       │
│                                                                 │
│ Sync to Supabase: { available_days: [1, 2, 3, 4, 5] }           │
└─────────────────────────────────────────────────────────────────┘
```

**Key Files**:
- Frontend → Supabase: No conversion (both 0-based)
- Supabase → Bubble: `logic/processors/external/adaptDaysToBubble.js`
- Bubble → Supabase: `logic/processors/external/adaptDaysFromBubble.js`

---

## Critical Conventions

### 1. Day Indexing (0-based Everywhere Except Bubble)

| System | Format | Example (Mon-Fri) |
|--------|--------|-------------------|
| **Frontend (JavaScript)** | 0-based | `[1, 2, 3, 4, 5]` |
| **Supabase (PostgreSQL)** | 0-based | `[1, 2, 3, 4, 5]` |
| **Bubble.io** | 1-based | `[2, 3, 4, 5, 6]` |

**Conversion required** at Bubble API boundary:
- **To Bubble**: Use `adaptDaysToBubble({ jsDays })`
- **From Bubble**: Use `adaptDaysFromBubble({ bubbleDays })`

---

### 2. Database Update Pattern (CRITICAL)

**ONLY send changed fields** to prevent FK constraint violations:

```javascript
// ❌ BAD - Causes 409 errors when FK fields are null/invalid
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

**Why**: `listing` table has 12 FK constraints. Sending unchanged FK fields (even null) triggers validation, causing 409 errors.

**PostgREST Error Codes**:
- 409 + code `23503` = FK violation
- 409 + code `23505` = Unique violation

---

### 3. Secure Storage Pattern

**Always encrypt sensitive data** before localStorage:

```javascript
import { setSecureItem, getSecureItem, removeSecureItem } from 'lib/secureStorage.js';

// Store (encrypted with AES-256)
setSecureItem('splitlease_auth_token', token);

// Retrieve (decrypted automatically)
const token = getSecureItem('splitlease_auth_token');

// Delete
removeSecureItem('splitlease_auth_token');
```

**Security**:
- AES-256 encryption
- Unique key per user
- Auto-expiration
- XSS protection

---

### 4. Error Handling (NO FALLBACK)

**Philosophy**: Real errors or nothing. NO generic "Something went wrong" messages.

```typescript
// ❌ BAD - Hides real error
try {
  await bubbleSync();
} catch (e) {
  return { error: 'Something went wrong' };  // NEVER DO THIS
}

// ✅ GOOD - Shows real error with full context
try {
  await bubbleSync();
} catch (e) {
  throw new BubbleApiError(`Bubble sync failed: ${e.message}`, e.response);
}
```

**Benefits**:
- Easier debugging (full error context)
- Users see actionable errors
- No hidden bugs
- Faster issue resolution

---

### 5. Informational Text Trigger Pattern

**When adding `?` icon** for help text:

```jsx
// ✅ GOOD - Both text and icon clickable
<div onClick={openInfoModal} className="cursor-pointer">
  <span>Move-In Flexibility</span>
  <span className="info-icon">?</span>
</div>

// ❌ BAD - Only icon clickable
<div>
  <span>Move-In Flexibility</span>
  <span onClick={openInfoModal} className="info-icon cursor-pointer">?</span>
</div>
```

**Reason**: Better UX - entire label acts as trigger, not just small icon.

---

## Development Workflow

### Frontend Commands

```bash
# Development
cd app
bun run dev              # Start dev server at http://localhost:8000

# Build
bun run build            # Production build (runs generate-routes first)
bun run preview          # Preview production build locally

# Route Management
bun run generate-routes  # Regenerate _redirects and _routes.json from routes.config.js

# Deployment
/deploy                  # Claude slash command (builds + deploys to Cloudflare)
npx wrangler pages deploy dist --project-name splitlease  # Manual deploy
```

---

### Backend Commands

```bash
# Supabase Local Development
supabase start           # Start local Supabase (Postgres, Auth, Storage, etc.)
supabase stop            # Stop local Supabase
supabase db reset        # Reset local database to migrations

# Database Migrations
supabase migration new <name>  # Create new migration
supabase db push         # Apply migrations to local DB

# Edge Functions
supabase functions serve           # Serve ALL functions locally (hot reload)
supabase functions serve <name>    # Serve single function
supabase functions deploy          # Deploy all functions (production)
supabase functions deploy <name>   # Deploy single function
supabase functions logs <name>     # View function logs

# Testing Edge Functions Locally
curl -X POST http://localhost:54321/functions/v1/listing \
  -H "Content-Type: application/json" \
  -d '{"action":"fetch","payload":{"id":"listing_123"}}'
```

---

### Git Workflow

```bash
# After each change, commit (do NOT push unless asked)
git add .
git commit -m "feat: add virtual meeting UI"

# When ready to deploy
git push origin main
```

**Conventions**:
- Commit after each meaningful change
- Do NOT push to GitHub unless explicitly asked
- Use conventional commit messages (feat:, fix:, chore:, docs:)

---

### Environment Variables

**Frontend (.env)**:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
VITE_HOTJAR_ID=123456
```

**Backend (Supabase Secrets)**:
```bash
# Set via Supabase dashboard or CLI
supabase secrets set BUBBLE_API_BASE_URL=https://your-app.bubbleapps.io/version-test/api/1.1/wf
supabase secrets set BUBBLE_API_KEY=abc123...
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set SENDGRID_API_KEY=SG....
supabase secrets set TWILIO_ACCOUNT_SID=AC...
supabase secrets set SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

---

## Summary Statistics

| Category | Count | Details |
|----------|-------|---------|
| **Frontend Files** | 534+ | 34 entry points, 30+ pages, 39 shared components, 57 logic modules, 32 utils |
| **Backend Functions** | 19 | 4 core, 1 infrastructure, 3 AI, 5 specialized, 3 notifications, 2 workflow |
| **Shared Utilities** | 17 | 4 FP modules (result, pipeline, errorLog, orchestration) + 13 core utilities |
| **FP Refactored Functions** | 11 | All major Edge Functions refactored to functional orchestration pattern |
| **Linting Configurations** | 2 | ESLint (frontend React), Deno lint (Edge Functions) |
| **Database Tables** | 16+ | listing, proposal, user, message, sync_queue, cancellation_reasons, junctions, etc. |
| **HTML Pages** | 27 | Independent pages with full routing |
| **Routes** | 30+ | Managed via routes.config.js (single source of truth) |
| **Business Logic Layers** | 4 | Calculators (9), Rules (22), Processors (14), Workflows (12) |
| **Day Indexing** | 0-based | JavaScript standard (0=Sun, 6=Sat), converted to 1-based for Bubble |
| **Sync Modes** | 2 | Atomic (immediate), Queue-based (async) |
| **FK Constraints** | 12 | On `listing` table (CRITICAL: only send changed fields) |

---

## File Locations Quick Reference

| What | Where |
|------|-------|
| Route Registry | `app/src/routes.config.js` |
| Vite Config | `app/vite.config.js` |
| Authentication | `app/src/lib/auth.js` |
| Supabase Client | `app/src/lib/supabase.js` |
| Day Utils | `app/src/lib/dayUtils.js` |
| Day Converters | `app/src/logic/processors/external/adaptDays*.js` |
| Business Rules | `app/src/logic/rules/` |
| Pricing Calculations | `app/src/logic/calculators/pricing/` |
| Page Components | `app/src/islands/pages/` |
| Shared Components | `app/src/islands/shared/` |
| Edge Functions | `supabase/functions/` |
| Shared Edge Utilities | `supabase/functions/_shared/` |
| FP Utilities | `supabase/functions/_shared/fp/` |
| ESLint Config | `app/eslint.config.js` |
| Deno Lint Config | `supabase/functions/deno.json` |
| Database Migrations | `supabase/migrations/` |
| Supabase Config | `supabase/config.toml` |

---

## Architectural Principles

1. **Islands Architecture** - Independent React roots, not SPA
2. **Hollow Components** - UI has ZERO logic, all in hooks
3. **Four-Layer Logic** - Calculators → Rules → Processors → Workflows
4. **Route Registry** - Single source of truth for all routes
5. **Action-Based APIs** - All Edge Functions use `{ action, payload }`
6. **Functional Orchestration** - Edge Functions use FP pattern (Result type, immutable context, pure functions)
7. **Dual-Sync** - Atomic (creates) + Queue-based (updates)
8. **Native Supabase** - New features bypass Bubble entirely
9. **NO FALLBACK** - Real errors or nothing, no generic messages
10. **Day Indexing** - 0-based everywhere except Bubble (1-based)
11. **Changed Fields Only** - Prevent FK violations on updates
12. **Fire-and-Forget Async** - Notifications don't block responses
13. **Error Consolidation** - ONE Slack message per request
14. **Informational Triggers** - Both text and `?` clickable

---

## Technical Debt

| Item | Priority | Description | Action Required |
|------|----------|-------------|-----------------|
| **Automated Testing Infrastructure** | High | Zero automated test coverage across frontend (27 pages), Edge Functions (7 active), and business logic (calculators, rules, processors). No type checking, build validation, or E2E tests in CI/CD. Creates significant regression risk during refactoring and feature development. | See comprehensive plan: [.claude/plans/Documents/20260107075520-automated-testing-infrastructure-tech-debt.md](./20260107075520-automated-testing-infrastructure-tech-debt.md)<br><br>**Phase 1 (Quick Wins - 2-4 hrs):**<br>• Add `type-check` script using `tsc --noEmit`<br>• Add `validate` script combining lint + type-check + build<br>• Create route validation script (`scripts/validate-routes.js`)<br>• Formalize Deno linting: `deno lint supabase/functions/`<br><br>**Phase 2 (Unit Tests - 16-24 hrs):**<br>• Set up Bun test runner<br>• Test day indexing logic (`lib/dayUtils.js`) - CRITICAL<br>• Test pricing calculators (`logic/calculators/pricing/`)<br>• Test scheduling calculators (`logic/calculators/scheduling/`)<br>• Test business rules (`logic/rules/`)<br>• Test Edge Function actions and adapters<br><br>**Phase 3 (E2E Tests - 12-20 hrs):**<br>• Set up Playwright (already installed)<br>• Test search & listing detail flow<br>• Test proposal submission flow<br>• Test authentication flow<br>• Test host listing management<br><br>**Phase 4 (Advanced - 8-12 hrs):**<br>• Bundle size monitoring (rollup-plugin-visualizer)<br>• Security audits (`bun audit`)<br>• Dead code detection (knip)<br>• Accessibility testing (@axe-core/playwright)<br><br>**Estimated Total:** 38-60 hours over 6 weeks |
| **Supabase Magic Link Email Template** | Medium | Magic link emails still use default Supabase domain (`qcfifybkaddcoimjroca.supabase.co`) instead of branded `split.lease` domain. Custom `/auth/verify` page is implemented and ready. | Update Supabase Dashboard → Authentication → Email Templates → Magic Link to use: `{{ .SiteURL }}/auth/verify?token_hash={{ .TokenHash }}&type=magiclink&redirect_to={{ .RedirectTo }}` |

---

**This document provides complete context for LLM-based research and analysis of the Split Lease codebase.**
