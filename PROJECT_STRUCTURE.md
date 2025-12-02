# Split Lease - Project Structure

> **Last Updated**: 2025-11-26
> **Branch**: main
> **Stack**: Vite + React Islands + Supabase + Cloudflare Pages

---

## Project Overview

**Split Lease** is a modern multi-page web application (MPA) for flexible shared accommodations with weekly scheduling. Built with the **Islands Architecture** pattern for optimal performance.

### Core Principles
- **No Fallback Mechanisms**: 100% truthful data - returns real data or null/empty, never hardcoded demo data
- **Islands Architecture**: Static HTML with selective React hydration
- **0-Based Day Indexing**: Internally uses 0-based (0=Sunday), converts to 1-based only for external APIs

---

## Root Directory Structure

```
Split Lease/
├── .claude/                    # Claude AI configuration
├── .github/                    # GitHub workflows
├── .playwright-mcp/            # Playwright testing config
├── .vscode/                    # VS Code workspace settings
├── .wrangler/                  # Cloudflare Wrangler cache
├── app/                        # MAIN APPLICATION (Vite project)
├── Context/                    # Reference/context files
├── docs/                       # Documentation (12 markdown files)
├── supabase/                   # Supabase config & Edge Functions
├── Misc/                       # Miscellaneous files
├── .env                        # Root environment config
├── .gitignore                  # Git ignore rules
├── .node-version               # Node.js version (20)
├── .pages.toml                 # Cloudflare Pages config
├── package.json                # Root monorepo package
├── README.md                   # Main documentation
└── build.sh                    # Build script
```

---

## App Directory (Main Application)

```
app/
├── src/                        # SOURCE CODE
│   ├── islands/                # React interactive components
│   ├── lib/                    # Core libraries & utilities
│   ├── logic/                  # Business logic modules
│   ├── styles/                 # Global CSS files
│   └── *.jsx                   # Page entry points
├── public/                     # Static HTML pages & assets
├── functions/                  # Cloudflare Workers Functions
├── dist/                       # Build output (git-ignored)
├── package.json                # App dependencies
├── vite.config.js              # Vite build configuration
└── tsconfig.json               # TypeScript configuration
```

---

## Source Code Structure (`app/src/`)

### Islands (`islands/`)

React components that hydrate into static HTML pages.

```
islands/
├── modals/                     # Modal dialogs
│   ├── CancelProposalModal.jsx
│   ├── CompareTermsModal.jsx
│   ├── EditProposalModal.jsx
│   ├── HostProfileModal.jsx
│   ├── MapModal.jsx
│   ├── NotificationSettingsModal.jsx
│   ├── ProposalDetailsModal.jsx
│   └── VirtualMeetingModal.jsx
│
├── pages/                      # Full-page React islands
│   ├── HomePage.jsx            # Landing page
│   ├── SearchPage.jsx          # Listing search & filter
│   ├── ViewSplitLeasePage.jsx  # Individual listing view
│   ├── GuestProposalsPage.jsx  # Guest proposals dashboard
│   ├── GuestSuccessPage.jsx    # Booking confirmation
│   ├── HostSuccessPage.jsx     # Host confirmation
│   ├── ListWithUsPage.jsx      # Host onboarding
│   ├── FAQPage.jsx             # FAQ
│   ├── PoliciesPage.jsx        # Terms/policies
│   ├── CareersPage.jsx         # Careers
│   ├── NotFoundPage.jsx        # 404
│   └── SelfListingPage/        # Self-listing creation (complex)
│       ├── SelfListingPage.tsx
│       ├── components/
│       ├── sections/           # Multi-step form sections
│       │   ├── Section1SpaceSnapshot.tsx
│       │   ├── Section2Features.tsx
│       │   ├── Section3LeaseStyles.tsx
│       │   ├── Section4Pricing.tsx
│       │   ├── Section5Rules.tsx
│       │   ├── Section6Photos.tsx
│       │   └── Section7Review.tsx
│       ├── types/
│       └── utils/
│
├── proposals/                  # Proposal-related components
│   ├── ProposalCard.jsx
│   ├── ProposalSelector.jsx
│   ├── ProgressTracker.jsx
│   ├── VirtualMeetingsSection.jsx
│   ├── LoadingState.jsx
│   ├── ErrorState.jsx
│   └── EmptyState.jsx
│
└── shared/                     # Shared components (30+)
    ├── Header.jsx
    ├── Footer.jsx
    ├── Button.jsx
    ├── Modal.jsx
    ├── Toast.jsx
    ├── GoogleMap.jsx
    ├── SearchScheduleSelector.jsx
    ├── ListingScheduleSelector.jsx
    ├── PriceDisplay.jsx
    ├── SignUpLoginModal.jsx
    ├── CreateProposalFlowV2.jsx
    ├── CreateProposalFlowV2Components/
    ├── ContactHostMessaging.jsx
    ├── ExternalReviews.jsx
    ├── LoggedInAvatar/
    ├── SubmitListingPhotos/
    ├── ImportListingModal/
    └── AiSignupMarketReport/
```

### Libraries (`lib/`)

Core utilities and data fetching modules.

```
lib/
├── auth.js                     # Authentication workflow
├── supabase.js                 # Supabase client initialization
├── supabaseUtils.js            # Database query helpers
├── constants.js                # Global constants
├── constants/
│   ├── proposalStages.js
│   └── proposalStatuses.js
├── config.js                   # Configuration management
├── bubbleAPI.js                # Bubble.io integration proxy
├── dataLookups.js              # Static data lookups
├── dayUtils.js                 # Day/date utilities
├── priceCalculations.js        # Pricing calculations
├── availabilityValidation.js   # Schedule validation
├── urlParams.js                # URL parameter management
├── mapUtils.js                 # Google Maps helpers
├── sanitize.js                 # Input sanitization
├── secureStorage.js            # Secure data storage
├── nycZipCodes.ts              # NYC/NJ ZIP code reference
├── listingDataFetcher.js       # Listing data fetching
├── proposalDataFetcher.js      # Proposal data fetching
├── informationalTextsFetcher.js
├── hotjar.js                   # Analytics integration
└── scheduleSelector/           # Schedule selection logic
    ├── dayHelpers.js
    ├── nightCalculations.js
    ├── priceCalculations.js
    └── validators.js
```

### Business Logic (`logic/`)

Organized by domain with clear separation of concerns.

```
logic/
├── calculators/                # Pure calculation functions
│   ├── pricing/
│   │   ├── calculateFourWeekRent.js
│   │   ├── calculateGuestFacingPrice.js
│   │   ├── calculatePricingBreakdown.js
│   │   ├── calculateReservationTotal.js
│   │   └── getNightlyRateByFrequency.js
│   └── scheduling/
│       ├── calculateCheckInOutDays.js
│       ├── calculateNextAvailableCheckIn.js
│       └── calculateNightsFromDays.js
│
├── processors/                 # Data transformation
│   ├── display/
│   │   └── formatHostName.js
│   ├── external/               # External API adaptation
│   │   ├── adaptDayFromBubble.js
│   │   ├── adaptDaysFromBubble.js
│   │   ├── adaptDayToBubble.js
│   │   └── adaptDaysToBubble.js
│   ├── listing/
│   │   ├── extractListingCoordinates.js
│   │   └── parseJsonArrayField.js
│   ├── proposal/
│   │   └── processProposalData.js
│   └── user/
│       ├── processProfilePhotoUrl.js
│       ├── processUserData.js
│       ├── processUserDisplayName.js
│       └── processUserInitials.js
│
├── rules/                      # Business rule validations
│   ├── auth/
│   │   ├── isProtectedPage.js
│   │   └── isSessionValid.js
│   ├── pricing/
│   │   └── isValidDayCountForPricing.js
│   ├── proposals/
│   │   ├── canAcceptProposal.js
│   │   ├── canCancelProposal.js
│   │   ├── canEditProposal.js
│   │   ├── determineProposalStage.js
│   │   ├── proposalRules.js
│   │   └── virtualMeetingRules.js
│   ├── scheduling/
│   │   ├── isDateBlocked.js
│   │   ├── isDateInRange.js
│   │   └── isScheduleContiguous.js
│   ├── search/
│   │   ├── isValidPriceTier.js
│   │   ├── isValidSortOption.js
│   │   └── isValidWeekPattern.js
│   └── users/
│       ├── hasProfilePhoto.js
│       ├── isGuest.js
│       ├── isHost.js
│       └── shouldShowFullName.js
│
└── workflows/                  # High-level orchestrated processes
    ├── auth/
    │   ├── checkAuthStatusWorkflow.js
    │   └── validateTokenWorkflow.js
    ├── booking/
    │   ├── acceptProposalWorkflow.js
    │   ├── cancelProposalWorkflow.js
    │   └── loadProposalDetailsWorkflow.js
    ├── proposals/
    │   ├── cancelProposalWorkflow.js
    │   ├── counterofferWorkflow.js
    │   ├── navigationWorkflow.js
    │   └── virtualMeetingWorkflow.js
    └── scheduling/
        ├── validateMoveInDateWorkflow.js
        └── validateScheduleWorkflow.js
```

### Styles (`styles/`)

Global CSS and component-scoped styles.

```
styles/
├── careers.css
├── components/
│   ├── benefits.css
│   ├── create-listing-modal.css
│   ├── floating-badge.css
│   ├── footer.css
│   ├── guest-proposals.css
│   ├── guest-success.css
│   ├── header.css
│   ├── hero.css
│   ├── host-success.css
│   ├── import-listing-modal.css
│   ├── listings.css
│   ├── local-section.css
│   ├── mobile.css
│   ├── modal.css
│   ├── not-found.css
│   ├── policies.css
│   ├── schedule.css
│   └── search-page-old.css
└── [additional CSS files]
```

### Page Entry Points (`src/*.jsx`)

Vite entry points that hydrate static HTML pages.

```
src/
├── main.jsx                    # Homepage
├── search.jsx                  # Search page
├── view-split-lease.jsx        # Listing view
├── guest-proposals.jsx         # Proposals dashboard
├── account-profile.jsx         # User profile
├── self-listing.jsx            # Self-listing creation
├── list-with-us.jsx            # Host onboarding
├── careers.jsx                 # Careers page
├── faq.jsx                     # FAQ page
├── policies.jsx                # Policies page
├── why-split-lease.jsx         # Marketing page
└── 404.jsx                     # 404 error page
```

---

## Public Directory (`app/public/`)

Static HTML pages and assets.

```
public/
├── index.html                  # Homepage
├── search.html                 # Search page
├── view-split-lease.html       # Listing view
├── guest-proposals.html        # Proposals page
├── account-profile.html        # Profile page
├── self-listing.html           # Self-listing page
├── list-with-us.html           # Host onboarding
├── guest-success.html          # Booking confirmation
├── host-success.html           # Host confirmation
├── careers.html                # Careers page
├── faq.html                    # FAQ page
├── policies.html               # Policies/terms
├── why-split-lease.html        # Marketing page
├── 404.html                    # Error page
├── _headers                    # Cloudflare HTTP headers
├── _redirects                  # URL rewrites
├── _routes.json                # Route configuration
└── assets/                     # Built CSS/JS bundles
```

---

## Cloudflare Functions (`app/functions/`)

Serverless API handlers.

```
functions/
├── api/
│   └── faq-inquiry.js          # POST /api/faq-inquiry
└── guest-proposals/
    └── [id].js                 # GET /guest-proposals/:id
```

---

## Supabase Directory

```
supabase/
├── config.toml                 # Supabase project configuration
├── SECRETS_SETUP.md            # Secret management guide
│
└── functions/                  # Edge Functions (Deno/TypeScript)
    │
    ├── _shared/                # Shared utilities
    │   ├── aiTypes.ts
    │   ├── bubbleSync.ts
    │   ├── cors.ts
    │   ├── errors.ts
    │   ├── openai.ts
    │   ├── types.ts
    │   └── validation.ts
    │
    ├── ai-gateway/             # AI Gateway integration
    │   ├── index.ts
    │   ├── handlers/
    │   │   ├── complete.ts
    │   │   └── stream.ts
    │   └── prompts/
    │       ├── _registry.ts
    │       └── _template.ts
    │
    ├── ai-signup-guest/        # AI-powered guest signup
    │   └── index.ts
    │
    ├── bubble-auth-proxy/      # Authentication proxy
    │   ├── index.ts
    │   └── handlers/
    │       ├── login.ts
    │       ├── logout.ts
    │       ├── signup.ts
    │       └── validate.ts
    │
    └── bubble-proxy/           # Data workflow proxy
        ├── index.ts
        └── handlers/
            ├── listing.ts
            ├── messaging.ts
            ├── photos.ts
            ├── referral.ts
            └── signup.ts
```

---

## Documentation (`docs/`)

```
docs/
├── AI_GATEWAY_IMPLEMENTATION_PLAN.md
├── AI_GATEWAY_IMPLEMENTATION_PLAN_V2.md
├── AI_SIGNUP_SUPABASE_MIGRATION.md
├── BUBBLE_WORKFLOW_API_ENUMERATION.md
├── DEPLOY_EDGE_FUNCTION.md
├── GUEST_PROPOSALS_MIGRATION_PLAN.md
├── MIGRATION_CLEANUP_CHECKLIST.md
├── MIGRATION_PLAN_BUBBLE_TO_EDGE.md
├── MIGRATION_STATUS.md
├── PHASE1_PURGE_EXECUTION.md
├── PHOTO_UPLOAD_MIGRATION_NOTE.md
└── SIGNUP_FIX_TESTING.md
```

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI Framework |
| Vite | 5.0.0 | Build Tool |
| React Hook Form | 7.66.1 | Form Management |
| Zod | 4.1.12 | Schema Validation |
| styled-components | 6.1.19 | CSS-in-JS |
| Framer Motion | 12.23.24 | Animation |
| Lucide React | 0.553.0 | Icons |
| date-fns | 4.1.0 | Date Utilities |
| @react-google-maps/api | 2.20.7 | Maps Integration |

### Backend
| Technology | Purpose |
|------------|---------|
| Supabase | Database (PostgreSQL) + Auth |
| Cloudflare Pages | Hosting & CDN |
| Cloudflare Workers | Serverless Functions |
| Supabase Edge Functions | Server-side Logic (Deno) |
| Bubble.io | Legacy Workflows (via proxy) |
| OpenAI API | AI Features |

---

## Architecture Patterns

### Islands Architecture Flow

```
User Request
    ↓
Cloudflare CDN
    ↓
Static HTML Page (/public/)
    ↓
Browser Loads HTML + JS Bundle
    ↓
React Hydration (Islands)
    ↓
Interactive Components Live
    ↓
API Calls → Supabase/Edge Functions
```

### Business Logic Architecture

```
calculators/    → Pure functions, no side effects
processors/     → Transform data between formats
rules/          → Boolean validation functions
workflows/      → Compose multiple rules/processors
```

---

## Key File Paths Reference

### Entry Points
- **Homepage**: `app/src/main.jsx` → `app/public/index.html`
- **Search**: `app/src/search.jsx` → `app/public/search.html`
- **Listing View**: `app/src/view-split-lease.jsx` → `app/public/view-split-lease.html`
- **Proposals**: `app/src/guest-proposals.jsx` → `app/public/guest-proposals.html`

### Core Logic
- **Authentication**: `app/src/lib/auth.js`
- **Pricing**: `app/src/logic/calculators/pricing/`
- **Scheduling**: `app/src/logic/calculators/scheduling/`
- **Database**: `app/src/lib/supabaseUtils.js`

### Components
- **Pages**: `app/src/islands/pages/`
- **Modals**: `app/src/islands/modals/`
- **Shared**: `app/src/islands/shared/`

### Edge Functions
- **Auth Proxy**: `supabase/functions/bubble-auth-proxy/`
- **Data Proxy**: `supabase/functions/bubble-proxy/`
- **AI Gateway**: `supabase/functions/ai-gateway/`

---

## Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=...

# Slack Webhooks
SLACK_WEBHOOK_ACQUISITION=...
SLACK_WEBHOOK_GENERAL=...
```

### Supabase Secrets (Edge Functions)
```
BUBBLE_API_KEY
BUBBLE_API_BASE_URL
BUBBLE_AUTH_BASE_URL
```

---

## Build & Deploy

### Development
```bash
cd app && npm run dev    # Starts on port 8000
```

### Production Build
```bash
cd app && npm run build  # Output to dist/
```

### Deployment
- **Trigger**: Git push to `main`
- **Platform**: Cloudflare Pages
- **Build**: `npm run build` in `app/` directory
- **Output**: `dist/` directory

---

## Statistics

| Metric | Count |
|--------|-------|
| HTML Pages | 12+ |
| React Islands | 30+ |
| Utility Modules | 20+ |
| Business Logic Modules | 40+ |
| Edge Functions | 8+ |
| CSS Files | 20+ |
