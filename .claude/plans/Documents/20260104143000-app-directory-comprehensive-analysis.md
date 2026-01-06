# Comprehensive Analysis: app/ Directory Structure

**Generated**: 2026-01-04
**Scope**: Complete architectural analysis of the frontend application
**Purpose**: Update CLAUDE.md documentation with current codebase state

---

## Executive Summary

The `app/` directory contains a React 18 + Vite frontend application following an **Islands Architecture** pattern. The codebase demonstrates mature patterns including:

- **35 HTML entry points** serving independent React applications
- **Four-Layer Logic Architecture** for business logic separation
- **Hollow Component Pattern** for UI/logic decoupling
- **Route Registry Pattern** for single-source-of-truth routing
- **TypeScript/JavaScript hybrid** (primarily JSX with TSX in SelfListingPage)

---

## 1. Directory Structure Overview

```
app/
├── .env                          # Environment variables
├── .env.example                  # Template for environment setup
├── package.json                  # Dependencies (ESM module, Bun preferred)
├── vite.config.js               # Build configuration with routing middleware
├── tsconfig.json                # TypeScript config (non-strict)
├── bun.lock                     # Bun lockfile
│
├── public/                       # Static assets and HTML templates
│   ├── *.html (35 files)        # Entry point HTML files
│   ├── _redirects               # Cloudflare routing (auto-generated)
│   ├── _routes.json             # Cloudflare Functions control (auto-generated)
│   ├── _headers                 # HTTP headers for Cloudflare
│   ├── assets/                  # Static media (fonts, icons, images, videos)
│   ├── help-center-articles/    # Static help documentation
│   └── images/                  # Public images
│
├── src/                         # React application source
│   ├── *.jsx (29 files)         # Entry point mount files
│   ├── routes.config.js         # Route Registry (single source of truth)
│   ├── CLAUDE.md                # Source directory documentation
│   │
│   ├── config/                  # Configuration modules
│   │   └── proposalStatusConfig.js
│   │
│   ├── data/                    # Static data modules
│   │   ├── CLAUDE.md
│   │   └── helpCenterData.js
│   │
│   ├── islands/                 # React component library
│   │   ├── CLAUDE.md
│   │   ├── modals/              # 13+ modal components
│   │   ├── pages/               # 30+ page components + 8 subdirectories
│   │   ├── proposals/           # Proposal-specific components
│   │   └── shared/              # 19+ shared components + 15 subdirectories
│   │
│   ├── lib/                     # Utilities and API clients
│   │   ├── auth.js              # Authentication (42KB)
│   │   ├── supabase.js          # Supabase client
│   │   ├── listingService.js    # Listing CRUD operations (49KB)
│   │   ├── constants.js         # Application constants (14KB)
│   │   ├── secureStorage.js     # Encrypted localStorage
│   │   ├── constants/           # Proposal stages/statuses
│   │   ├── proposals/           # Proposal data utilities
│   │   └── scheduleSelector/    # Schedule calculation utilities
│   │
│   ├── logic/                   # Four-Layer Business Logic
│   │   ├── index.js             # Barrel exports
│   │   ├── calculators/         # Pure math functions
│   │   ├── rules/               # Boolean predicates
│   │   ├── processors/          # Data transformation
│   │   ├── workflows/           # Orchestration
│   │   └── constants/           # Logic-specific constants
│   │
│   ├── styles/                  # CSS stylesheets
│   │   ├── CLAUDE.md
│   │   ├── variables.css        # Design tokens
│   │   ├── main.css             # Global styles + imports
│   │   └── components/          # 31+ component CSS files
│   │
│   └── routes/                  # Generated route files
│
├── scripts/                     # Build scripts
│   └── generate-redirects.js   # Generates _redirects and _routes.json
│
├── functions/                   # Cloudflare Pages Functions (legacy)
│   └── api/
│       └── faq-inquiry.js
│
└── dist/                        # Production build output (generated)
```

---

## 2. Architecture Patterns

### 2.1 Islands Architecture

Each page is an independent React application mounted to a specific DOM element:

```
public/search.html       --> src/search.jsx          --> islands/pages/SearchPage.jsx
(HTML template)              (createRoot mount)          (React component)
```

**Characteristics**:
- Full page loads between pages (no client-side routing)
- Each "island" is isolated with its own state
- Benefits: smaller bundles, simpler mental model, SEO-friendly shells

### 2.2 Hollow Component Pattern

Page components contain **zero business logic** - they delegate everything to custom hooks:

```javascript
// GuestProposalsPage.jsx (UI only - 183 lines)
export default function GuestProposalsPage() {
  const {
    proposals,
    selectedProposal,
    handleProposalSelect,
    // ... all state and handlers from hook
  } = useGuestProposalsPageLogic();

  return (
    <>
      <Header />
      {/* Pure JSX rendering - no logic */}
      <Footer />
    </>
  );
}

// useGuestProposalsPageLogic.js (All logic)
export function useGuestProposalsPageLogic() {
  const [proposals, setProposals] = useState([]);
  // ... all state management, effects, handlers
  return { proposals, selectedProposal, handleProposalSelect };
}
```

**Identified Logic Hooks**:
| Hook | Location | Used By |
|------|----------|---------|
| `useGuestProposalsPageLogic` | `pages/proposals/` | GuestProposalsPage |
| `useSearchPageLogic` | `pages/` | SearchPage, SearchPageTest |
| `useViewSplitLeasePageLogic` | `pages/` | ViewSplitLeasePage |
| `useRentalApplicationPageLogic` | `pages/` | RentalApplicationPage |
| `useAccountProfilePageLogic` | `pages/AccountProfilePage/` | AccountProfilePage |
| `useHostOverviewPageLogic` | `pages/HostOverviewPage/` | HostOverviewPage |
| `useHostProposalsPageLogic` | `pages/HostProposalsPage/` | HostProposalsPage |
| `useMessagingPageLogic` | `pages/MessagingPage/` | MessagingPage |
| `useEditListingDetailsLogic` | `shared/EditListingDetails/` | EditListingDetails |
| `useScheduleSelector` | `shared/` | Schedule selectors |
| `useToast` | `shared/Toast.jsx` | Toast notifications |
| `useLoggedInAvatarData` | `shared/LoggedInAvatar/` | LoggedInAvatar |
| `useNotificationSettings` | `shared/NotificationSettingsIsland/` | Notifications |
| `useListingStore` | `pages/SelfListingPage/store/` | SelfListingPage (Zustand) |
| `useRentalApplicationStore` | `pages/RentalApplicationPage/store/` | RentalApplicationPage |
| `useProposalButtonStates` | `logic/rules/proposals/` | Proposal components |
| `useRentalApplicationWizardLogic` | `pages/AccountProfilePage/.../` | RentalApplicationWizard |

### 2.3 Route Registry Pattern

`src/routes.config.js` is the **single source of truth** for all routing:

```javascript
export const routes = [
  {
    path: '/search',
    file: 'search.html',
    aliases: ['/search.html'],
    protected: false,
    cloudflareInternal: true,
    internalName: 'search-view',
    hasDynamicSegment: false
  },
  // ... 30+ route definitions
];
```

**Route Properties**:
- `path`: Clean URL pattern (supports `:param` syntax)
- `file`: HTML file to serve
- `protected`: Requires authentication
- `cloudflareInternal`: Uses `_internal/` directory (avoids 308 redirects)
- `hasDynamicSegment`: Has URL parameters (`:id`, `:userId`)
- `aliases`: Additional URL patterns

**Consumers**:
- Vite dev/preview servers (routing middleware)
- `scripts/generate-redirects.js` (generates `_redirects` and `_routes.json`)
- Vite build (input configuration)

---

## 3. Four-Layer Logic Architecture

Located in `src/logic/`, this separates business logic into four testable layers:

### 3.1 Calculators (`logic/calculators/`)
**Purpose**: Pure mathematical calculations
**Naming Convention**: `calculate*`, `get*`
**Dependencies**: None (pure functions)

```
calculators/
├── index.js
├── pricing/
│   ├── calculateFourWeekRent.js
│   ├── calculateGuestFacingPrice.js
│   ├── calculatePricingBreakdown.js
│   ├── calculateReservationTotal.js
│   └── getNightlyRateByFrequency.js
└── scheduling/
    ├── calculateCheckInOutDays.js
    ├── calculateNextAvailableCheckIn.js
    ├── calculateNightsFromDays.js
    └── shiftMoveInDateIfPast.js
```

### 3.2 Rules (`logic/rules/`)
**Purpose**: Boolean predicates enforcing business rules
**Naming Convention**: `can*`, `is*`, `has*`, `should*`
**Dependencies**: May call calculators

```
rules/
├── index.js
├── auth/
│   ├── isProtectedPage.js
│   └── isSessionValid.js
├── pricing/
│   └── isValidDayCountForPricing.js
├── proposals/
│   ├── canAcceptProposal.js
│   ├── canCancelProposal.js
│   ├── canEditProposal.js
│   ├── determineProposalStage.js
│   ├── proposalRules.js          # 15+ rule functions
│   ├── useProposalButtonStates.js
│   └── virtualMeetingRules.js    # VM_STATES, 10+ rule functions
├── scheduling/
│   ├── isDateBlocked.js
│   ├── isDateInRange.js
│   └── isScheduleContiguous.js
├── search/
│   ├── hasListingPhotos.js
│   ├── isValidPriceTier.js
│   ├── isValidSortOption.js
│   └── isValidWeekPattern.js
└── users/
    ├── hasProfilePhoto.js
    ├── isGuest.js
    ├── isHost.js
    └── shouldShowFullName.js
```

### 3.3 Processors (`logic/processors/`)
**Purpose**: Data transformation ("Truth" layer - NO FALLBACK)
**Naming Convention**: `adapt*`, `extract*`, `process*`, `format*`
**Dependencies**: May call calculators

```
processors/
├── index.js
├── display/
│   └── formatHostName.js
├── external/
│   └── (empty - day conversion removed after 0-indexed migration)
├── listing/
│   ├── extractListingCoordinates.js
│   └── parseJsonArrayField.js
├── proposal/
│   └── processProposalData.js
├── proposals/
│   └── processProposalData.js    # Extended: formatPrice, formatDate, etc.
└── user/
    ├── processProfilePhotoUrl.js
    ├── processUserData.js
    ├── processUserDisplayName.js
    └── processUserInitials.js
```

### 3.4 Workflows (`logic/workflows/`)
**Purpose**: Orchestration of multiple operations
**Naming Convention**: `*Workflow` or specific action names
**Dependencies**: Calls calculators, rules, processors

```
workflows/
├── index.js
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

### 3.5 Logic Constants (`logic/constants/`)
```
constants/
├── proposalStages.js     # Stage definitions + helper functions
└── proposalStatuses.js   # Status configs + helper functions
```

---

## 4. Key Files Reference

### 4.1 Configuration Files
| File | Purpose |
|------|---------|
| `routes.config.js` | Route registry (single source of truth) |
| `vite.config.js` | Build config with routing middleware |
| `config/proposalStatusConfig.js` | Proposal status UI configuration |

### 4.2 Core Libraries (`lib/`)
| File | Size | Purpose |
|------|------|---------|
| `auth.js` | 42KB | Authentication utilities, session management |
| `listingService.js` | 49KB | Listing CRUD operations |
| `listingDataFetcher.js` | 19KB | Listing data queries |
| `dataLookups.js` | 19KB | Reference data lookups |
| `constants.js` | 14KB | Application constants, day mappings |
| `proposalDataFetcher.js` | 8KB | Proposal data queries |
| `supabase.js` | 0.4KB | Supabase client initialization |
| `secureStorage.js` | 8.5KB | Encrypted localStorage wrapper |
| `navigation.js` | 8.5KB | Client-side navigation helpers |
| `dayUtils.js` | 1.5KB | Day manipulation utilities |

### 4.3 Major Page Components
| Component | Size | Has Hook | Features |
|-----------|------|----------|----------|
| `ViewSplitLeasePage.jsx` | 140KB | Yes | Listing detail, booking |
| `SearchPage.jsx` | 122KB | Yes | Search, filters, map |
| `PreviewSplitLeasePage.jsx` | 71KB | Inline | Host preview mode |
| `SearchPageTest.jsx` | 64KB | Shared | Test variant |
| `RentalApplicationPage.jsx` | 50KB | Yes | Multi-step form |
| `ProposalCard.jsx` | 51KB | - | Proposal display |
| `GuestEditingProposalModal.jsx` | 48KB | - | Edit proposal modal |
| `WhySplitLeasePage.jsx` | 36KB | No | Marketing page |
| `EditListingDetails.jsx` | 47KB | Yes | Listing editor |
| `SignUpLoginModal.jsx` | 42KB | - | Auth modal |

---

## 5. Naming Conventions

### 5.1 File Naming
| Type | Convention | Examples |
|------|------------|----------|
| Entry points | `kebab-case.jsx` | `view-split-lease.jsx`, `guest-proposals.jsx` |
| Page components | `PascalCase.jsx` | `ViewSplitLeasePage.jsx`, `SearchPage.jsx` |
| Logic hooks | `use*Logic.js` | `useSearchPageLogic.js`, `useAccountProfilePageLogic.js` |
| Calculators | `calculate*.js` or `get*.js` | `calculateFourWeekRent.js`, `getNightlyRateByFrequency.js` |
| Rules | `is*.js`, `can*.js`, `has*.js`, `should*.js` | `isHost.js`, `canEditProposal.js` |
| Processors | `process*.js`, `format*.js`, `extract*.js` | `processUserData.js`, `formatHostName.js` |
| Workflows | `*Workflow.js` | `validateScheduleWorkflow.js`, `cancelProposalWorkflow.js` |
| CSS files | `kebab-case.css` | `guest-proposals.css`, `listing-dashboard.css` |
| TypeScript | `*.ts` or `*.tsx` | `listing.types.ts`, `SelfListingPage.tsx` |

### 5.2 Function Naming
| Layer | Prefix | Examples |
|-------|--------|----------|
| Calculators | `calculate`, `get` | `calculateFourWeekRent()`, `getNightlyRateByFrequency()` |
| Rules | `is`, `can`, `has`, `should` | `isHost()`, `canEditProposal()`, `hasListingPhotos()` |
| Processors | `process`, `format`, `extract`, `adapt` | `processUserData()`, `formatHostName()` |
| Workflows | Descriptive + `Workflow` | `validateScheduleWorkflow()`, `loadProposalDetailsWorkflow()` |

### 5.3 CSS Naming
- **Class names**: `kebab-case` (e.g., `.listing-card`, `.proposal-header`)
- **BEM-like**: `.component__element--modifier` (e.g., `.listing-card__title--featured`)
- **State classes**: `.active`, `.selected`, `.disabled`, `.error`
- **Variables**: `--category-name` (e.g., `--primary-purple`, `--spacing-lg`)

---

## 6. Recent Changes (Since Dec 15, 2025)

### New Features
1. **Account Profile Preview Mode** - Toggle between editor and public view
2. **Rental Application Wizard Modal** - Multi-step wizard in AccountProfilePage
3. **Referral System** - Footer referral form replaced with modal-based system
4. **ReferralModal** - Dedicated component with CSS file

### File Changes (Recent Commits)
- `AccountProfilePage/` - Major updates (preview mode, wizard, referral banner)
- `Footer.jsx` - Referral modal integration
- `ContactHostMessaging.jsx` - Icon update (Feather MessageSquare)
- Multiple CSS refinements across components

---

## 7. TypeScript Usage

The codebase is primarily JavaScript/JSX with **selective TypeScript adoption**:

### TypeScript Modules
1. **SelfListingPage/** - Complete TypeScript implementation
   - `SelfListingPage.tsx`
   - `sections/*.tsx` (7 section components)
   - `store/*.ts` (Zustand store)
   - `types/listing.types.ts`
   - `utils/*.ts` (service files)
   - `components/*.tsx`

2. **SelfListingPageV2/** - TypeScript (in development)

3. **RentalApplicationPage/**
   - `store/useRentalApplicationStore.ts`

4. **Reference Data**
   - `lib/nycZipCodes.ts`

### TypeScript Configuration
- **Target**: ES2020
- **Module**: ESNext
- **JSX**: react-jsx
- **Strict**: `false` (non-strict mode)
- **allowJs**: `true`
- **noEmit**: `true` (Vite handles compilation)

---

## 8. Page Component Categories

### Public Pages (No Auth)
- HomePage, SearchPage, ViewSplitLeasePage, ListWithUsPage, WhySplitLeasePage
- FAQPage, HelpCenterPage, HelpCenterCategoryPage, PoliciesPage, CareersPage
- AboutUsPage, NotFoundPage, GuestSuccessPage, HostSuccessPage, ResetPasswordPage

### Guest-Only Pages
- GuestProposalsPage, RentalApplicationPage

### Host-Only Pages
- HostOverviewPage, HostProposalsPage, ListingDashboardPage, PreviewSplitLeasePage
- SelfListingPage, SelfListingPageV2

### Guest or Host Pages
- AccountProfilePage, FavoriteListingsPage, MessagingPage

---

## 9. State Management Patterns

### Local State (useState)
Most components use React's built-in `useState` for local state management.

### Zustand Stores
Used in complex multi-step forms:
- `SelfListingPage/store/useListingStore.ts`
- `RentalApplicationPage/store/useRentalApplicationStore.ts`

### URL State
URL parameters for shareable state:
- Search filters (`/search?borough=manhattan&price=2`)
- Proposal selection (`/guest-proposals?proposal=123`)
- Listing ID (`/view-split-lease/abc123`)

### LocalStorage
- Draft form persistence
- Secure token storage (via `secureStorage.js`)

---

## 10. CSS Architecture

### Design Token System (`variables.css`)
```css
/* Colors */
--primary-purple: #31135D;
--secondary-purple: #6D31C2;
--accent-blue: #4A90E2;
--success-green: #22C55E;

/* Typography */
--font-inter: 'Inter', sans-serif;
--text-base: 15px;
--font-weight-medium: 500;

/* Spacing */
--spacing-xs: 4px;
--spacing-lg: 1rem;
--gap-md: 1rem;

/* Shadows */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
```

### File Organization
- **Global**: `styles/main.css` (imports all component CSS)
- **Variables**: `styles/variables.css`
- **Components**: `styles/components/*.css` (31 files)
- **Co-located**: Some components have adjacent CSS files

---

## 11. Build and Development

### Commands
```bash
bun run dev              # Start dev server (port 8000)
bun run build            # Production build
bun run preview          # Preview production build
bun run generate-routes  # Regenerate _redirects and _routes.json
```

### Build Process
1. **Prebuild**: `generate-routes` creates Cloudflare routing files
2. **Vite Build**: Compiles JSX/TSX, bundles assets
3. **Post-build**:
   - Move HTML to dist root
   - Copy assets, images, help-center-articles
   - Create `_internal/` files for Cloudflare routing
   - Copy `_redirects`, `_headers`, `_routes.json`

### Development Server
- Port: 8000
- Routing middleware uses Route Registry
- API proxy to localhost:8788 (wrangler for Cloudflare Functions)

---

## 12. Recommendations for Documentation Update

### Updates Needed in CLAUDE.md

1. **Hook Count**: Update to 17+ identified hooks (was 7)
2. **Page Count**: Verify current count (35 HTML files, 30+ page components)
3. **TypeScript Modules**: Document SelfListingPage TypeScript structure
4. **Recent Features**: Add ReferralModal, Rental Application Wizard
5. **Zustand Stores**: Document two identified Zustand stores
6. **Logic Layer Exports**: Update with new workflow functions
7. **File Sizes**: Update large file sizes for context

### New Patterns to Document

1. **Feature Module Pattern** - Directories with components + hooks + styles
2. **Wizard Modal Pattern** - Multi-step modals (RentalApplicationWizard)
3. **Preview Mode Pattern** - Toggle between editor/public views

---

## Referenced Files

### Configuration
- `C:\Users\Split Lease\Documents\Split Lease\app\vite.config.js`
- `C:\Users\Split Lease\Documents\Split Lease\app\src\routes.config.js`
- `C:\Users\Split Lease\Documents\Split Lease\app\package.json`

### Logic Layer
- `C:\Users\Split Lease\Documents\Split Lease\app\src\logic\index.js`
- `C:\Users\Split Lease\Documents\Split Lease\app\src\logic\calculators\index.js`
- `C:\Users\Split Lease\Documents\Split Lease\app\src\logic\rules\index.js`
- `C:\Users\Split Lease\Documents\Split Lease\app\src\logic\processors\index.js`
- `C:\Users\Split Lease\Documents\Split Lease\app\src\logic\workflows\index.js`

### Key Components
- `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\GuestProposalsPage.jsx`
- `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\useGuestProposalsPageLogic.js`
- `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\AccountProfilePage\AccountProfilePage.jsx`

### Libraries
- `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\auth.js`
- `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\listingService.js`
- `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\constants.js`

---

**Analysis Completed**: 2026-01-04
**Files Analyzed**: 150+ source files
**Directories Explored**: 50+ directories
