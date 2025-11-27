# Split Lease Codebase - Comprehensive Structure Report

**Generated**: 2025-11-26
**Repository**: https://github.com/splitleasesharath/splitlease
**Current Branch**: main
**Build Status**: Ready for deployment

---

## Executive Summary

Split Lease is a **flexible rental marketplace for NYC properties** with a modern, scalable architecture:

- **Frontend**: React 18 with Vite (Islands Architecture) - located in `app/`
- **Backend**: Supabase (PostgreSQL + Edge Functions in TypeScript/Deno) - located in `supabase/`
- **Deployment**: Cloudflare Pages
- **Legacy Integration**: Bubble.io API (being migrated to Edge Functions)
- **Documentation**: Comprehensive guides in `docs/` for migrations and implementations

The project uses a **four-layer logic architecture** (calculators, rules, processors, workflows) for clean separation of concerns and testability.

---

## Root Level Directory & File Structure

```
C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease/
├── .claude/                          # Claude Code configuration & custom commands
├── .git/                             # Git repository data
├── .gitattributes                    # Git attributes configuration
├── .gitignore                        # Git ignore rules
├── .node-version                     # Node.js version lock (18)
├── .pages.toml                       # Cloudflare Pages deployment config
├── .playwright-mcp/                  # Playwright MCP configuration
├── .temp-signup-login/               # Temporary testing directory
├── .vscode/                          # VSCode workspace settings
├── .wrangler/                        # Wrangler CLI cache
├── app/                              # MAIN APPLICATION (React + Vite)
├── build.sh                          # Build script for deployment
├── CLAUDE.md                         # Root project guide
├── Context/                          # Architecture reference guides
├── DATABASE_SCHEMA_OVERVIEW.md       # 93-table schema reference
├── docs/                             # Migration plans & implementation guides
├── HELP_CENTER_REDIRECT_TEST_REPORT.md
├── Misc/                             # Miscellaneous files
├── node_modules/                     # Root dependencies (minimal)
├── package.json                      # Root monorepo configuration
├── package-lock.json                 # Dependency lock file
├── PROJECT_STRUCTURE.md              # Detailed directory breakdown
├── README.md                         # Comprehensive project documentation
├── supabase/                         # BACKEND (Edge Functions + Database)
└── test-help-center.js               # Help center testing script
```

---

## 1. APP DIRECTORY - Frontend Application

**Purpose**: React 18 application with Vite bundler (Islands Architecture)

```
app/
├── .env                              # App-specific environment variables
├── .env.example                      # Environment variable template
├── .gitignore                        # App-level git ignore
├── .gitkeep-functions                # Placeholder marker
├── .wrangler/                        # Wrangler configuration cache
├── BUBBLE_WORKFLOW_SETUP.md          # Legacy Bubble integration guide
├── CLAUDE.md                         # App-specific developer guide
├── dist/                             # Production build output (generated)
├── functions/                        # Local edge functions (for dev)
├── node_modules/                     # App dependencies
├── package.json                      # App dependencies & scripts
├── package-lock.json                 # Dependency lock
├── public/                           # Static assets served at root
├── src/                              # Application source code
├── tsconfig.json                     # TypeScript configuration
├── tsconfig.node.json                # TypeScript config for Node tools
└── vite.config.js                    # Vite build configuration
```

### app/public - Static Assets

```
public/
├── _headers                          # Cloudflare header rules
├── _redirects                        # Cloudflare redirect rules
├── _routes.json                      # Route configuration for Functions
├── 404.html                          # Error page
├── account-profile.html              # Account profile page entry
├── assets/                           # CSS and images
├── careers.html                      # Careers page entry
├── faq.html                          # FAQ page entry
├── guest-proposals.html              # Guest proposals page entry
├── guest-success.html                # Guest success page entry
├── help-center.html                  # Help center page entry
├── help-center-category.html         # Help center category page entry
├── host-success.html                 # Host success page entry
├── images/                           # Image assets directory
├── index.html                        # Home page entry
├── index-dev.html                    # Dev-only index variant
├── list-with-us.html                 # List with us page entry
├── logged-in-avatar-demo.html        # Avatar demo page
├── policies.html                     # Policies page entry
├── search.html                       # Search page entry
├── search-test.html                  # Search test page variant
├── self-listing.html                 # Self-listing page entry
├── view-split-lease.html             # View listing page entry
└── why-split-lease.html              # Why split lease page entry
```

### app/src - Source Code Structure

#### Entry Points (Root Level)
```
src/
├── 404.jsx                           # 404 error page
├── account-profile.jsx               # User account profile page
├── careers.jsx                       # Careers page
├── faq.jsx                           # FAQ page
├── guest-proposals.jsx               # Guest proposals management page
├── guest-success.jsx                 # Guest booking confirmation
├── help-center.jsx                   # Help center main page
├── help-center-category.jsx          # Help center category view
├── host-success.jsx                  # Host listing confirmation
├── listing-schedule-selector.jsx     # Schedule selector component
├── list-with-us.jsx                  # List with us (host signup)
├── logged-in-avatar-demo.jsx         # Avatar component demo
├── main.jsx                          # Landing/home page
├── policies.jsx                      # Terms & policies page
├── search.jsx                        # Search/browse listings page
├── search-test.jsx                   # Search testing variant
├── self-listing.jsx                  # Host create/edit listing
├── view-split-lease.jsx              # Listing detail page
└── why-split-lease.html              # Marketing page
```

#### data/ - Data & Lookups
```
src/data/
└── helpCenterData.js                 # Help center content and navigation
```

#### islands/ - React Components (Island Pattern)

```
src/islands/
├── modals/                           # Modal components
├── pages/                            # Page-level components
├── proposals/                        # Proposal-related components
└── shared/                           # Shared components used across pages
```

**islands/pages/** - Page Components
```
pages/
├── CareersPage.jsx                   # Careers page component
├── FAQPage.jsx                       # FAQ page component
├── GuestProposalsPage.jsx            # Guest proposals main component
├── GuestSuccessPage.jsx              # Success page after booking
├── HelpCenterCategoryPage.jsx        # Help center category view
├── HelpCenterPage.jsx                # Help center main page
├── HomePage.jsx                      # Landing page
├── HostSuccessPage.jsx               # Host success page
├── ListWithUsPage.jsx                # Host signup flow
├── NotFoundPage.jsx                  # 404 page
├── PoliciesPage.jsx                  # Terms & policies
├── SearchPage.jsx                    # Search/browse listings
├── SearchPageTest.jsx                # Search test variant
├── SelfListingPage.jsx               # Host listing creation
├── SelfListingPage/                  # Organized subdirectory
│   ├── components/                   # Section components
│   ├── sections/                     # Form sections
│   ├── store/                        # Form state management
│   ├── styles/                       # Styling
│   └── types/                        # TypeScript types
│   └── utils/                        # Utilities
├── useGuestProposalsPageLogic.js     # Page logic hook
├── useSearchPageLogic.js              # Search page logic hook
├── useViewSplitLeasePageLogic.js     # Listing detail logic hook
├── ViewSplitLeasePage.jsx            # Listing detail component
├── ViewSplitLeasePage-old.jsx        # Legacy version
└── WhySplitLeasePage.jsx             # Marketing page
```

**islands/shared/** - Reusable Components
```
shared/
├── AiSignupMarketReport/             # AI market research component
├── Button.jsx                        # Reusable button component
├── ContactHostMessaging.jsx          # Host messaging interface
├── CreateDuplicateListingModal/      # Duplicate listing modal
├── CreateProposalFlowV2.jsx          # Multi-step proposal wizard
├── CreateProposalFlowV2Components/   # Wizard step components
├── DayButton.jsx                     # Day selector button
├── ErrorOverlay.jsx                  # Error display overlay
├── ExternalReviews.jsx               # External review display
├── Footer.jsx                        # Site footer
├── GoogleMap.jsx                     # Google Maps integration
├── Header.jsx                        # Site header/navigation
├── ImportListingModal/               # Import listing modal
├── InformationalText.jsx             # CMS content display
├── ListingCard.jsx                   # Listing preview card
├── ListingScheduleSelector.jsx       # Day/pricing selector for listings
├── ListingScheduleSelectorV2.jsx     # Updated selector version
├── LoggedInAvatar.jsx                # User avatar dropdown
├── LoggedInHeaderAvatar2.jsx         # Alternative avatar component
├── PriceDisplay.jsx                  # Price formatting component
├── SearchScheduleSelector.jsx        # Search filter schedule selector
├── SignUpLoginModal.jsx              # Authentication modal
├── SubmitListingPhotos/              # Photo upload component
├── Toast.jsx                         # Notification toast component
├── useScheduleSelector.js            # Schedule selector logic hook
└── useScheduleSelectorLogicCore.js   # Core scheduling logic
```

#### lib/ - Utility Libraries & Constants

```
src/lib/
├── auth.js                           # Authentication functions
├── availabilityValidation.js         # Availability checking logic
├── bubbleAPI.js                      # Bubble API client (legacy)
├── config.js                         # Configuration (partially)
├── constants.js                      # All app constants
├── constants/                        # Enumeration constants
│   ├── proposalStages.js             # Proposal stage definitions
│   └── proposalStatuses.js           # Proposal status values
├── dataLookups.js                    # Data lookup functions
├── dayUtils.js                       # Day/week utilities
├── hotjar.js                         # Hotjar analytics integration
├── informationalTextsFetcher.js      # CMS content fetcher
├── listingDataFetcher.js             # Listing data retrieval
├── mapUtils.js                       # Google Maps utilities
├── nycZipCodes.ts                    # NYC zip code data
├── priceCalculations.js              # Pricing utilities
├── proposalDataFetcher.js            # Proposal data retrieval
├── sanitize.js                       # HTML/input sanitization
├── scheduleSelector/                 # Schedule selector utilities
│   ├── dayHelpers.js                 # Day calculation helpers
│   ├── nightCalculations.js          # Night count calculations
│   ├── priceCalculations.js          # Pricing within selector
│   └── validators.js                 # Schedule validation
├── SECURE_AUTH_README.md             # Auth security documentation
├── secureStorage.js                  # Encrypted storage for tokens
├── supabase.js                       # Supabase client initialization
├── supabaseUtils.js                  # Supabase query helpers
└── urlParams.js                      # URL parameter parsing
```

#### logic/ - Four-Layer Logic Architecture

**Purpose**: Organized business logic separated into four distinct layers for clean architecture

```
src/logic/
├── calculators/                      # LAYER 1: Pure calculations
│   ├── index.js                      # Exports all calculators
│   ├── pricing/                      # Price-related calculations
│   │   ├── calculateFourWeekRent.js          # Monthly rent calculation
│   │   ├── calculateGuestFacingPrice.js      # Guest-visible pricing
│   │   ├── calculatePricingBreakdown.js      # Itemized pricing
│   │   ├── calculateReservationTotal.js      # Total cost for reservation
│   │   └── getNightlyRateByFrequency.js      # Nightly rate by day count
│   └── scheduling/                   # Schedule-related calculations
│       ├── calculateCheckInOutDays.js        # Check-in/out date logic
│       ├── calculateNextAvailableCheckIn.js  # Next available date
│       └── calculateNightsFromDays.js        # Count nights from days
│
├── rules/                            # LAYER 2: Boolean predicates (business rules)
│   ├── index.js                      # Exports all rules
│   ├── auth/                         # Authentication rules
│   │   ├── isProtectedPage.js               # Is page auth-required?
│   │   └── isSessionValid.js                # Is session still valid?
│   ├── pricing/                      # Pricing rules
│   │   └── isValidDayCountForPricing.js     # Pricing data exists?
│   ├── proposals/                    # Proposal-related rules
│   │   ├── canAcceptProposal.js             # Can guest accept?
│   │   ├── canCancelProposal.js             # Can guest cancel?
│   │   ├── canEditProposal.js               # Can guest modify?
│   │   ├── determineProposalStage.js        # What stage is proposal?
│   │   ├── proposalRules.js                 # Consolidated rules
│   │   └── virtualMeetingRules.js           # Meeting availability
│   ├── scheduling/                   # Schedule-related rules
│   │   ├── isDateBlocked.js                 # Is date unavailable?
│   │   ├── isDateInRange.js                 # Is date in range?
│   │   └── isScheduleContiguous.js          # Is schedule continuous?
│   ├── search/                       # Search filter rules
│   │   ├── isValidPriceTier.js              # Valid price range?
│   │   ├── isValidSortOption.js             # Valid sort option?
│   │   └── isValidWeekPattern.js            # Valid week pattern?
│   └── users/                        # User-related rules
│       ├── hasProfilePhoto.js               # User has photo?
│       ├── isGuest.js                       # Is guest account?
│       ├── isHost.js                        # Is host account?
│       └── shouldShowFullName.js            # Display full name?
│
├── processors/                       # LAYER 3: Data transformation
│   ├── index.js                      # Exports all processors
│   ├── display/                      # Display formatting
│   │   └── formatHostName.js                # Format host name display
│   ├── external/                     # External system adaptation
│   │   ├── adaptDayFromBubble.js            # Single day from Bubble
│   │   ├── adaptDaysFromBubble.js           # Multiple days from Bubble
│   │   ├── adaptDaysToBubble.js             # Multiple days to Bubble
│   │   └── adaptDayToBubble.js              # Single day to Bubble
│   ├── listing/                      # Listing data processing
│   │   ├── extractListingCoordinates.js     # Get lat/lng
│   │   └── parseJsonArrayField.js           # Parse JSON arrays
│   ├── proposal/                     # Single proposal processing
│   │   └── processProposalData.js           # Transform proposal data
│   ├── proposals/                    # Multiple proposals processing
│   │   └── processProposalData.js           # Transform proposals list
│   └── user/                         # User data processing
│       ├── processProfilePhotoUrl.js        # Photo URL handling
│       ├── processUserData.js               # Full user transformation
│       ├── processUserDisplayName.js        # Display name formatting
│       └── processUserInitials.js           # User initials extraction
│
├── workflows/                        # LAYER 4: Orchestration & coordination
│   ├── index.js                      # Exports all workflows
│   ├── auth/                         # Authentication workflows
│   │   ├── checkAuthStatusWorkflow.js       # Verify login status
│   │   └── validateTokenWorkflow.js         # Token validation flow
│   ├── booking/                      # Booking workflows
│   │   ├── acceptProposalWorkflow.js        # Accept proposal logic
│   │   ├── cancelProposalWorkflow.js        # Cancel proposal logic
│   │   └── loadProposalDetailsWorkflow.js   # Load full proposal data
│   ├── proposals/                    # Proposal management workflows
│   │   ├── cancelProposalWorkflow.js        # Cancel proposal
│   │   ├── counterofferWorkflow.js          # Create counteroffer
│   │   ├── navigationWorkflow.js            # Proposal page navigation
│   │   └── virtualMeetingWorkflow.js        # Schedule virtual meeting
│   └── scheduling/                   # Schedule workflows
│       ├── validateMoveInDateWorkflow.js    # Validate move-in date
│       └── validateScheduleWorkflow.js      # Validate day selection
│
└── index.js                          # Exports all logic layers
```

#### routes/ - Page Routing
```
src/routes/
(Directory currently empty - routing handled by HTML pages in public/)
```

---

## 2. SUPABASE DIRECTORY - Backend Infrastructure

**Purpose**: Edge Functions (Deno), database configuration, and migration management

```
supabase/
├── .gitignore                        # Ignore rules for Supabase
├── .temp/                            # Temporary files (git-ignored)
├── config.toml                       # Supabase project configuration
├── functions/                        # Deno Edge Functions
│   ├── _shared/                      # Shared utilities & types
│   ├── ai-gateway/                   # AI integration service
│   ├── ai-signup-guest/              # AI guest signup
│   ├── bubble-auth-proxy/            # Auth proxy for Bubble
│   ├── bubble-proxy/                 # General API proxy for Bubble
│   └── (function structure detailed below)
├── SECRETS_SETUP.md                  # API key configuration guide
└── migrations/                       # Database migrations (not shown in listing)
```

### supabase/functions - Edge Functions Structure

**Purpose**: Deno TypeScript functions serving as API layer between frontend and Bubble.io/Supabase

```
functions/
├── _shared/                          # Shared code across all functions
│   ├── aiTypes.ts                    # AI-specific TypeScript types
│   ├── bubbleSync.ts                 # Bubble.io API interaction utilities
│   ├── cors.ts                       # CORS handling middleware
│   ├── errors.ts                     # Error types and handlers
│   ├── openai.ts                     # OpenAI API integration
│   ├── types.ts                      # Core TypeScript types
│   └── validation.ts                 # Input validation utilities
│
├── ai-gateway/                       # AI Service Gateway
│   ├── deno.json                     # Deno configuration
│   ├── handlers/
│   │   ├── complete.ts               # Completion handler (non-streaming)
│   │   └── stream.ts                 # Streaming response handler
│   ├── index.ts                      # Main entry point
│   └── prompts/
│       ├── _registry.ts              # Prompt registry/routing
│       └── _template.ts              # Prompt template system
│
├── ai-signup-guest/                  # AI-Powered Guest Signup
│   └── index.ts                      # Guest signup logic
│
├── bubble-auth-proxy/                # Authentication Proxy
│   ├── deno.json                     # Deno configuration
│   ├── index.ts                      # Main proxy logic
│   ├── handlers/
│   │   ├── login.ts                  # Login endpoint
│   │   ├── logout.ts                 # Logout endpoint
│   │   ├── signup.ts                 # Signup endpoint
│   │   └── validate.ts               # Token validation endpoint
│   └── .npmrc                        # NPM configuration
│
├── bubble-proxy/                     # General API Proxy
│   ├── deno.json                     # Deno configuration
│   ├── index.ts                      # Main proxy router
│   ├── handlers/
│   │   ├── listing.ts                # Listing API calls
│   │   ├── messaging.ts              # Messaging API calls
│   │   ├── photos.ts                 # Photo upload API
│   │   ├── referral.ts               # Referral system API
│   │   └── signup.ts                 # Signup API calls
│   └── .npmrc                        # NPM configuration
│
└── (Additional functions may exist)
```

---

## 3. DOCS DIRECTORY - Documentation & Plans

**Purpose**: Migration guides, implementation plans, and execution documentation

```
docs/
├── AI_GATEWAY_IMPLEMENTATION_PLAN.md         # Original AI gateway spec
├── AI_GATEWAY_IMPLEMENTATION_PLAN_V2.md      # Updated AI gateway design
├── AI_SIGNUP_SUPABASE_MIGRATION.md           # AI signup migration guide
├── AUTH_FLOW_COMPLETE.md                    # Complete auth flow documentation
├── AUTH_FLOW_DIAGRAM.md                     # Visual auth flow diagrams
├── AUTH_QUICK_REFERENCE.md                  # Quick auth reference guide
├── BUBBLE_WORKFLOW_API_ENUMERATION.md       # Bubble API inventory
├── DEPLOY_EDGE_FUNCTION.md                  # Edge function deployment guide
├── Done/                                     # Completed implementation docs
├── GUEST_PROPOSALS_MIGRATION_PLAN.md        # Guest proposals migration
├── MIGRATION_CLEANUP_CHECKLIST.md           # Cleanup tasks after migration
├── MIGRATION_PLAN_BUBBLE_TO_EDGE.md         # Main migration plan
├── MIGRATION_STATUS.md                      # Current migration progress
├── PHASE1_PURGE_EXECUTION.md                # Phase 1 cleanup execution
├── PHOTO_UPLOAD_MIGRATION_NOTE.md           # Photo upload changes
├── SEARCH_PAGE_CONSOLE_LOGS.md              # Search debugging logs
├── SIGNUP_FIX_TESTING.md                    # Signup testing results
└── CODEBASE_COMPREHENSIVE_STRUCTURE.md      # THIS FILE
```

---

## 4. .CLAUDE DIRECTORY - Claude Code Configuration

**Purpose**: Claude Code settings, custom commands, and execution logs

```
.claude/
├── commands/                         # Custom slash commands
│   ├── deploy.md                     # Deploy to Cloudflare Pages
│   ├── preview.md                    # Start dev server
│   ├── prime.md                      # Project initialization
│   ├── splitlease.md                 # Project-specific commands
│   └── Dump/                         # Additional commands
│       ├── bug.md                    # Bug report template
│       ├── chore.md                  # Chore task template
│       ├── classify_adw.md           # ADW classification
│       ├── classify_issue.md         # Issue classification
│       ├── cleanup_worktrees.md      # Git worktree cleanup
│       ├── code_convention.md        # Code style guide
│       ├── commit.md                 # Commit message helper
│       ├── conditional_docs.md       # Docs generation
│       ├── document.md               # Documentation template
│       ├── e2e/                      # End-to-end tests
│       │   ├── test_advanced_filtering.md
│       │   ├── test_ai_market_research.md
│       │   ├── test_basic_search.md
│       │   ├── test_contact_host.md
│       │   └── test_schedule_selector.md
│       ├── enforce_no_fallback.md    # No fallback enforcement
│       ├── feature.md                # Feature implementation template
│       ├── generate_branch_name.md   # Branch naming
│       ├── health_check.md           # Health check command
│       ├── implement.md              # Implementation helper
│       ├── install.md                # Installation guide
│       ├── install_worktree.md       # Worktree setup
│       ├── in_loop_review.md         # Code review loop
│       ├── no_fallback_check.md      # No fallback detection
│       ├── patch.md                  # Patch creation
│       ├── prepare_app.md            # App preparation
│       ├── pull_request.md           # PR creation
│       ├── README_NO_FALLBACK.md     # No fallback principles
│       ├── and more...
└── settings.json                     # Claude Code permissions & restrictions
```

---

## 5. CONTEXT DIRECTORY - Architecture Reference

**Purpose**: Architecture design documentation and principles

```
Context/
└── Refactoring Architecture for Logic Core.md
    # Detailed guide on logic layer refactoring and best practices
```

---

## 6. Configuration Files at Root Level

| File | Purpose |
|------|---------|
| `.pages.toml` | Cloudflare Pages deployment configuration |
| `.node-version` | Node.js version lock (18) |
| `.gitignore` | Git ignore patterns |
| `.gitattributes` | Git attribute configurations |
| `build.sh` | Build script for deployment |
| `package.json` | Root monorepo configuration |
| `package-lock.json` | Dependency lock file |
| `CLAUDE.md` | Root project guide (primary reference) |
| `README.md` | Comprehensive project documentation |
| `DATABASE_SCHEMA_OVERVIEW.md` | 93-table database schema reference |
| `PROJECT_STRUCTURE.md` | Detailed directory breakdown |

---

## 7. Key Technology Stack

### Frontend
- **React 18** - UI framework (Islands Architecture)
- **Vite** - Build tool (ESM)
- **CSS Modules + CSS Variables** - Styling
- **Google Maps React** - Map integration
- **Playwright** - E2E testing

### Backend
- **Supabase** - PostgreSQL database + Edge Functions
- **Deno** - Runtime for Edge Functions
- **TypeScript** - Type safety in functions
- **Bubble.io** - Legacy API (being migrated)

### Deployment
- **Cloudflare Pages** - Hosting (configured in `.pages.toml`)
- **Cloudflare Workers** - Serverless compute

---

## 8. Four-Layer Logic Architecture Deep Dive

The project enforces clean architecture through four distinct logic layers:

### Layer 1: Calculators
**Purpose**: Pure mathematical functions with no side effects
**Naming**: `calculate*`, `get*`
**Examples**:
- `calculateFourWeekRent()` - Monthly rent from nightly rate
- `getNightlyRateByFrequency()` - Price based on days selected
- `calculateNightsFromDays()` - Count nights in day array

### Layer 2: Rules
**Purpose**: Boolean predicates expressing business rules
**Naming**: `can*`, `is*`, `has*`, `should*`
**Examples**:
- `canCancelProposal(proposal)` - Can guest cancel at this stage?
- `isSessionValid()` - Is auth token still valid?
- `hasProfilePhoto(user)` - User has uploaded photo?

### Layer 3: Processors
**Purpose**: Data transformation and adaptation
**Naming**: `adapt*`, `extract*`, `process*`, `format*`
**Examples**:
- `adaptDaysFromBubble()` - Convert Bubble 1-7 to JS 0-6
- `processUserData()` - Transform raw API data to app format
- `formatHostName()` - Display name formatting

### Layer 4: Workflows
**Purpose**: Orchestration combining lower layers
**Naming**: `*Workflow`
**Examples**:
- `acceptProposalWorkflow()` - Multi-step proposal acceptance
- `validateTokenWorkflow()` - Auth token verification
- `loadProposalDetailsWorkflow()` - Fetch and transform proposal

**Imports Pattern**:
```javascript
// Workflows import from layers below
import { canCancelProposal } from '../rules/proposals/proposalRules.js'
import { processProposalData } from '../processors/proposal/processProposalData.js'
import { cancelProposalWorkflow } from '../workflows/proposals/cancelProposalWorkflow.js'
```

---

## 9. Critical Day Indexing Convention

**CRITICAL**: Two different day numbering systems exist and must be converted at boundaries:

| System | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|--------|-----|-----|-----|-----|-----|-----|-----|
| JavaScript (Internal) | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| Bubble API (External) | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

**Conversion Functions**:
- `adaptDaysFromBubble([2,3,4,5,6])` → `[1,2,3,4,5]` (Monday-Friday)
- `adaptDaysToBubble([1,2,3,4,5])` → `[2,3,4,5,6]`

**Default Pattern**: Monday-Friday weeknights = `[1,2,3,4,5]` (0-based)

---

## 10. Database Overview

### Supabase Tables (Lookup & Configuration)
- `zat_geo_borough_toplevel` - NYC boroughs
- `zat_geo_hood_mediumlevel` - Neighborhoods
- `zat_features_amenity` - Amenities catalog
- `zat_features_houserule` - House rules
- `informational_texts` - CMS content
- `virtualmeetingschedulesandlinks` - Video call scheduling

### Bubble Tables (Source of Truth)
- `user` - User accounts
- `listing` - Property listings
- `proposal` - Booking proposals

**Total**: 93 tables in schema (see `DATABASE_SCHEMA_OVERVIEW.md`)

---

## 11. Authentication Architecture

### Storage Keys
- `splitlease_auth_token` - Encrypted JWT token
- `splitlease_session_id` - Encrypted session/user ID
- `splitlease_user_type` - "Host" or "Guest"

### Protected Pages
- `/guest-proposals` - Guest proposal management
- `/account-profile` - User account settings
- `/host-dashboard` - Host dashboard (if implemented)

### Auth Functions (src/lib/auth.js)
```javascript
checkAuthStatus()              // Check if logged in
loginUser(email, password)     // Login flow
logoutUser()                   // Logout & clear data
validateTokenAndFetchUser()    // Validate & get user data
```

---

## 12. Edge Functions Deployment

### Available Functions
1. **bubble-auth-proxy** - Authentication (login, signup, logout, validate)
2. **bubble-proxy** - General Bubble API calls
3. **ai-gateway** - AI service integration
4. **ai-signup-guest** - AI-powered guest signup

### Deployment Command
```bash
supabase functions deploy bubble-proxy
supabase functions deploy   # Deploy all
```

### Required Secrets (Supabase Dashboard)
- `BUBBLE_API_BASE_URL` - https://app.split.lease/version-test/api/1.1
- `BUBBLE_API_KEY` - (stored securely)
- `BUBBLE_AUTH_BASE_URL` - https://upgradefromstr.bubbleapps.io/api/1.1
- `SUPABASE_SERVICE_ROLE_KEY` - (from Supabase)

---

## 13. Component Patterns

### 1. Hollow Component Pattern
UI-only component delegating all logic to a hook:
```
GuestProposalsPage.jsx → useGuestProposalsPageLogic.js
SearchPage.jsx → useSearchPageLogic.js
ViewSplitLeasePage.jsx → useViewSplitLeasePageLogic.js
```

### 2. Multi-Step Form Pattern
Section-by-section forms with localStorage draft saving:
```
SelfListingPage/ → 7 sections from Space Snapshot to Review
```

### 3. Modal Flow Pattern
Multi-step wizards inside modals with callbacks:
```
CreateProposalFlowV2.jsx → Multi-section wizard
SignUpLoginModal.jsx → Auth modal flows
```

---

## 14. File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| React Components | PascalCase | `HomePage.jsx` |
| Hooks | `use` + PascalCase | `useGuestProposalsPageLogic.js` |
| Utilities | camelCase | `priceCalculations.js` |
| Constants | UPPER_SNAKE_CASE | `BUBBLE_API_URL` |
| CSS Classes | kebab-case | `.hero-section` |
| CSS Files | Match component | `Header.css` |
| Logic Calculators | `calculate*` / `get*` | `calculateFourWeekRent.js` |
| Logic Rules | `can*` / `is*` / `has*` | `canCancelProposal.js` |
| Logic Processors | `adapt*` / `process*` / `format*` | `adaptDaysFromBubble.js` |
| Logic Workflows | `*Workflow` | `acceptProposalWorkflow.js` |

---

## 15. Build & Deployment

### Development
```bash
npm run dev        # Start dev server (port 5173)
npm run build      # Production build
npm run preview    # Preview production locally
```

### Production (Cloudflare Pages)
```bash
/deploy           # Claude command: build + deploy + push
./build.sh        # Manual build script
```

### Build Configuration
- **Input**: `app/` directory
- **Output**: `app/dist/`
- **Node Version**: 18 (from `.node-version`)
- **Build Command**: `npm run build`

---

## 16. Environment Variables

### Root .env (CLI Tools)
```
GITHUB_PAT=<token>
CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=true
E2B_API_KEY=<key>
```

### App .env (app/.env)
```
VITE_SUPABASE_URL=<url>
VITE_SUPABASE_ANON_KEY=<key>
VITE_GOOGLE_MAPS_API_KEY=<key>
```

**Note**: Bubble API keys are in Supabase Secrets, NOT in .env files

---

## 17. Git Workflow

### Branches
- `main` - Production
- `development` - Staging
- `sl18` - Current feature branch (if in use)

### Commit Convention
- Commit after each meaningful change
- Use descriptive commit messages
- Do NOT push unless explicitly asked

### Remote
```
origin: https://github.com/splitleasesharath/splitlease.git
```

---

## 18. Core Principles (From CLAUDE.md)

### DO's
- Use the four-layer logic architecture consistently
- Keep business logic in hooks (Hollow Component Pattern)
- Use Edge Functions for all Bubble API calls
- Store configuration in `src/lib/constants.js`
- Always convert days at system boundaries
- Check auth status before protected resources
- Throw descriptive errors (no silent failures)

### DON'Ts
- Never add fallback mechanisms or workarounds
- Never add compatibility layers
- Never expose API keys in frontend code
- Never call Bubble API directly from frontend
- Never mix day numbering systems
- Never skip token validation on protected pages
- Never hardcode color values (use CSS variables)
- Never use force push to main/master

---

## 19. Key Files Summary

### Must-Read Documents
1. `CLAUDE.md` - Root project guide (comprehensive reference)
2. `app/CLAUDE.md` - App-specific developer guide
3. `DATABASE_SCHEMA_OVERVIEW.md` - Schema reference
4. `README.md` - Project overview

### Configuration
1. `.pages.toml` - Cloudflare deployment
2. `app/vite.config.js` - Vite build settings
3. `supabase/config.toml` - Supabase project config
4. `.claude/settings.json` - Claude Code permissions

### Implementation Guides
1. `docs/MIGRATION_PLAN_BUBBLE_TO_EDGE.md` - Migration strategy
2. `docs/DEPLOY_EDGE_FUNCTION.md` - Function deployment
3. `docs/AUTH_FLOW_COMPLETE.md` - Auth architecture
4. `supabase/SECRETS_SETUP.md` - API key configuration

---

## 20. Common Tasks Quick Reference

### Start Development
```bash
cd app
npm install
npm run dev
# Opens http://localhost:5173
```

### Deploy to Production
```bash
/deploy
# or
./build.sh
npm run build
```

### Check Database Schema
```
docs/DATABASE_SCHEMA_OVERVIEW.md
```

### View Edge Function Logs
```bash
supabase functions logs <function-name>
```

### Deploy Edge Function
```bash
supabase functions deploy <function-name>
```

### Check Build Status
```
Cloudflare Pages Dashboard
```

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total Configuration Files | 9 |
| Entry Point Pages | 19 |
| Shared Components | 18+ |
| SelfListingPage Subsections | 5+ |
| Logic Calculators | 8 |
| Logic Rules | 20+ |
| Logic Processors | 12+ |
| Logic Workflows | 12+ |
| Edge Functions | 4+ main |
| Supabase Lookup Tables | 10+ |
| Total Database Tables | 93 |
| Documentation Files | 18+ |
| Custom Commands | 40+ |

---

**Document Version**: 1.0
**Last Updated**: 2025-11-26
**Status**: Complete and Ready for Reference
