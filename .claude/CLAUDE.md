# Split Lease Platform - Complete Architecture Guide

**DOCUMENT_VERSION**: 2.0
**LAST_UPDATED**: 2025-12-11
**STATUS**: Active Development - Bubble.io to Supabase Edge Functions migration in progress
**BRANCH**: main (production deployments)

---

## Project Overview

**Split Lease** is a flexible rental marketplace for NYC properties enabling property owners to list spaces available for specific days/weeks and guests to rent rooms on selected days with a "45% less than Airbnb" value proposition.

### Core Concepts
- **Split Scheduling**: Property owners list spaces available for specific recurring patterns
- **Repeat Stays**: Guests rent rooms on selected contiguous days across multiple weeks
- **Proposal System**: Guests submit booking proposals with custom terms
- **Dynamic Pricing**: Multi-tier pricing based on number of nights selected (2-7 nights)
- **Authentication**: Two-part system with native Supabase Auth and legacy Bubble integration

### Application Scale
- **19+ Entry Points**: JSX files mounting React components to HTML pages
- **60+ React Components**: Shared components with isolated state management via hooks
- **93+ Database Tables**: Supabase PostgreSQL tables for all data
- **5 Edge Functions**: Deno-based serverless functions for Bubble proxy, auth, AI, integrations
- **No Fallback Principle**: 100% truthful data - returns real data or null/empty, never hardcoded demo data

---

## Tech Stack

| Layer | Technology | Details |
|-------|------------|---------|
| **Frontend** | React 18 + Vite | ESM, Islands Architecture, multi-page app |
| **Backend** | Supabase | PostgreSQL (93 tables) + Edge Functions (Deno 2) |
| **Legacy Backend** | Bubble.io | Still handles some operations, being migrated to Edge Functions |
| **Deployment** | Cloudflare Pages | Auto-builds from main branch, preview on feature branches |
| **Maps** | Google Maps Platform | Interactive maps with custom price markers |
| **Node Version** | 18 (production: 20) | See `.node-version` file |

---

## Quick Start

```bash
# From repository root
bun install               # Install dependencies (uses bun.lock)
bun run dev               # Start dev server on port 8000
bun run build             # Production build
bun run preview           # Preview production build

# From app/ directory
cd app
bun install
bun run dev               # http://localhost:8000
```

**Environment Variables Required** (`.env` file):
```bash
VITE_SUPABASE_URL=https://qcfifybkaddcoimjroca.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

---

## Islands Architecture

Each page is an independent React application mounted to its own HTML file:

```
public/index.html           → src/main.jsx           → HomePage
public/search.html          → src/search.jsx         → SearchPage
public/view-split-lease.html→ src/view-split-lease.jsx → ViewSplitLeasePage
(19+ HTML files total)      → (19+ entry points)     → (19+ page components)
```

**Benefits**: Code splitting per page, selective hydration, independent state management

---

## Four-Layer Logic Architecture (`app/src/logic/`)

Business logic separated into testable, reusable layers:

| Layer | Purpose | Naming Convention |
|-------|---------|-------------------|
| **Calculators** | Pure math functions | `calculate*`, `get*` |
| **Rules** | Boolean predicates | `can*`, `is*`, `has*`, `should*` |
| **Processors** | Data transformation | `adapt*`, `extract*`, `format*` |
| **Workflows** | Orchestration | `*Workflow` |

---

## Day Indexing Convention (CRITICAL)

**CRITICAL CONCEPT**: Two different day indexing systems. Always convert at boundaries.

| System | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|--------|--------|--------|---------|-----------|----------|--------|----------|
| **Internal (JS)** | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| **Bubble API** | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

**Always convert at boundaries:**
```javascript
import { adaptDaysFromBubble } from 'src/logic/processors/external/adaptDaysFromBubble.js'
import { adaptDaysToBubble } from 'src/logic/processors/external/adaptDaysToBubble.js'
```

## Core Principles

### No Fallback Mechanisms
- Return real data or `null`/empty arrays
- Never use hardcoded demo data or compatibility layers
- Let errors surface to reveal real problems

### Match Solution to Scale
- Build for current requirements, not hypothetical futures
- Simple, direct solutions over clever abstractions

### MCP Tool Usage
**Always invoke MCP tools (Playwright, Supabase, etc.) through the `mcp-tool-specialist` subagent.**

### Supabase Database
- Do NOT modify database/tables without explicit instruction
- When Edge Functions are updated, remind about manual deployments

## Key File Locations

| Purpose | Location |
|---------|----------|
| App architecture guide | `app/CLAUDE.md` |
| Edge Functions guide | `supabase/CLAUDE.md` |
| App constants | `app/src/lib/constants.js` |
| Authentication | `app/src/lib/auth.js` |
| Supabase client | `app/src/lib/supabase.js` |
| Vite config | `app/vite.config.js` |
| Route registry | `app/src/routes.config.js` |

## Edge Functions (`supabase/functions/`)

| Function | Purpose |
|----------|---------|
| `bubble-proxy` | General Bubble API proxy (listings, messaging, photos, favorites) |
| `auth-user` | Authentication (Supabase Auth for login/signup, Bubble for validate) |
| `ai-gateway` | OpenAI completions (streaming + non-streaming) |
| `ai-signup-guest` | AI-powered guest signup flow |
| `slack` | Slack integration for FAQ inquiries |

## Git Workflow

- **Main branch**: `main` (production)
- **Commit after each change** (do NOT push unless asked)
- **Commit style**: Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Analysis documents go to `.claude/plans/New/` with `YYYYMMDDHHMMSS` prefix
- Implemented plans move to `.claude/plans/Done/`

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/deploy` | Build, deploy to Cloudflare Pages, push to GitHub |
| `/preview` | Build and preview locally |
| `/supabase` | Supabase-related operations |

## Environment Variables

```bash
# Required (in app/.env)
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_GOOGLE_MAPS_API_KEY=<google-maps-api-key>
```

**Note**: Bubble API keys are stored server-side in Supabase Secrets, NOT in frontend environment variables.

## Component Patterns

### Hollow Component Pattern
Pages delegate all logic to hooks:
```javascript
export default function ViewSplitLeasePage() {
  const { listing, selectedDays, handleDaySelection } = useViewSplitLeasePageLogic()
  return <div>{/* Pure rendering */}</div>
}
```

### CSS Styling
- Variables: `app/src/styles/variables.css`
- Classes: `kebab-case` (`.hero-section`, `.btn-primary`)
- Colors: Always use CSS variables (`--color-primary`, `--color-secondary`)

## Testing Considerations

When modifying code, verify:
- [ ] Proposal code handles null/undefined and checks status
- [ ] Day indexing is correct (0-based internal, convert for API)
- [ ] Auth code clears data on failure and uses Edge Functions
- [ ] UI business logic is in hooks, not components

---

## Entry Points (19+ Pages)

| Route | Entry Point | Component | Purpose |
|-------|-------------|-----------|---------|
| `/` | `src/main.jsx` | `HomePage` | Landing page |
| `/search` | `src/search.jsx` | `SearchPage` | Browse listings with 6-dimension filters |
| `/view-split-lease/:id` | `src/view-split-lease.jsx` | `ViewSplitLeasePage` | Listing detail + booking |
| `/guest-proposals` | `src/guest-proposals.jsx` | `GuestProposalsPage` | Guest proposal dashboard (protected) |
| `/guest-success` | `src/guest-success.jsx` | `GuestSuccessPage` | Post-signup success |
| `/account-profile` | `src/account-profile.jsx` | `AccountProfilePage` | User profile (protected) |
| `/favorite-listings` | `src/favorite-listings.jsx` | `FavoriteListingsPage` | Saved listings (protected) |
| `/rental-application` | `src/rental-application.jsx` | `RentalApplicationPage` | Rental application form |
| `/self-listing` | `src/self-listing.jsx` | `SelfListingPage` | Host listing wizard (protected) |
| `/self-listing-v2` | `src/self-listing-v2.jsx` | `SelfListingPageV2` | V2 listing creation (protected) |
| `/listing-dashboard` | `src/listing-dashboard.jsx` | `ListingDashboardPage` | Host management (protected) |
| `/host-overview` | `src/host-overview.jsx` | `HostOverviewPage` | Host dashboard (protected) |
| `/host-proposals` | `src/host-proposals.jsx` | `HostProposalsPage` | Host proposal management (protected) |
| `/host-success` | `src/host-success.jsx` | `HostSuccessPage` | Post-host-signup success |
| `/faq` | `src/faq.jsx` | `FAQPage` | Frequently asked questions |
| `/policies` | `src/policies.jsx` | `PoliciesPage` | Terms & Privacy |
| `/list-with-us` | `src/list-with-us.jsx` | `ListWithUsPage` | Host onboarding |
| `/why-split-lease` | `src/why-split-lease.jsx` | `WhySplitLeasePage` | Product explainer |
| `/about-us` | `src/about-us.jsx` | `AboutUsPage` | Company info |
| `/careers` | `src/careers.jsx` | `CareersPage` | Job listings |
| `/help-center` | `src/help-center.jsx` | `HelpCenterPage` | Help articles |

---

## Core Library Modules (`app/src/lib/`)

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `constants.js` | Configuration (439 lines) | DAYS, SCHEDULE_PATTERNS, PRICE_TIERS, BOROUGH_MAP_CONFIG |
| `auth.js` | Authentication utilities | `checkAuthStatus()`, `loginUser()`, `logoutUser()` |
| `supabase.js` | Supabase client | `supabase` instance |
| `secureStorage.js` | Encrypted localStorage | `set()`, `get()`, `clear()` |
| `dataLookups.js` | Cached lookup data | `initializeLookups()`, `getNeighborhoodName()`, `getAmenity()` |
| `supabaseUtils.js` | Query helpers | `parseJsonArray()`, `fetchPhotoUrls()`, `fetchHostData()` |
| `priceCalculations.js` | Pricing logic | `calculatePricingBreakdown()`, `getNightlyRateByFrequency()` |
| `dayUtils.js` | Day conversion | `adaptDaysFromBubble()`, `adaptDaysToBubble()` |
| `listingDataFetcher.js` | Listing enrichment | `fetchListingComplete()` |
| `sanitize.js` | Input validation | `isValidEmail()`, `isValidPhone()`, `sanitizeText()` |
| `urlParams.js` | URL management | `serializeFiltersToUrl()`, `parseUrlFilters()` |
| `mapUtils.js` | Google Maps helpers | `getBoroughMapConfig()` |
| `bubbleAPI.js` | Direct Bubble calls (legacy) | Direct API methods |

---

## Shared Components (`app/src/islands/shared/`)

| Component | Purpose |
|-----------|---------|
| `Header.jsx` | Navigation + auth modals |
| `Footer.jsx` | Site footer |
| `Modal.jsx` | Reusable modal wrapper |
| `Button.jsx` | Button variants |
| `Toast.jsx` | Notifications |
| `GoogleMap.jsx` | Interactive map with markers |
| `SearchScheduleSelector.jsx` | Day picker for search (multi-select) |
| `ListingScheduleSelector.jsx` | Day picker for listing (with constraints) |
| `useScheduleSelector.js` | Schedule selection hook with validation |
| `CreateProposalFlowV2.jsx` | Multi-step proposal wizard (4 steps) |
| `ContactHostMessaging.jsx` | Send message to host |
| `AiSignupMarketReport/` | AI market research modal |
| `PriceDisplay.jsx` | Price formatting |
| `InformationalText.jsx` | Info callouts |
| `ErrorOverlay.jsx` | Error display |
| `DayButton.jsx` | Individual day UI |
| `ListingCard/` | Search result card |

---

## Database Tables (93+)

**Core Tables**:
- `listing` (60+ fields: name, description, bedrooms, bathrooms, amenities, pricing, availability)
- `listing_photo` (photos, thumbnails, sort order, main photo flag)
- `account_host`, `account_guest`, `user` (account data)
- `mainreview` (reviews and ratings)
- `proposal` (guest proposals, synced from Bubble)
- `virtualmeetingschedulesandlinks` (video calls)

**Lookup Tables** (ZAT prefix):
- `zat_geo_borough_toplevel` (6 boroughs)
- `zat_geo_hood_mediumlevel` (293+ neighborhoods)
- `zat_features_listingtype` (property types)
- `zat_features_amenity` (amenities with icons)
- `zfut_safetyfeatures` (safety features)
- `zat_features_houserule` (house rules)
- `zat_features_parkingoptions` (parking options)
- `zat_features_cancellationpolicy` (cancellation policies)
- `zat_features_storageoptions` (storage options)
- `zat_priceconfiguration` (global pricing config)
- `informational_texts` (CMS content)

---

## Routing System

**Route Registry**: `app/src/routes.config.js` is the single source of truth for all routes.

Used by:
- Vite dev server middleware (rewrites URLs)
- Vite preview server
- Cloudflare `_routes.json` generation
- Cloudflare `_internal/` directory creation

**Key Concepts**:
- `path`: Clean URL pattern
- `file`: HTML file to serve
- `protected`: Requires authentication
- `cloudflareInternal`: Use `_internal/` for URL normalization
- `hasDynamicSegment`: Route has `:id` or `:userId`
- `aliases`: Alternative URL patterns

**Example Dynamic Route**:
```javascript
{
  path: '/view-split-lease',
  file: 'view-split-lease.html',
  protected: false,
  cloudflareInternal: true,
  internalName: 'listing-view',
  hasDynamicSegment: true,
  dynamicPattern: '/view-split-lease/:id'
}
```

---

## Deployment Architecture

**Platform**: Cloudflare Pages with auto-builds from GitHub main branch

**Configuration** (`.pages.toml`):
```toml
[build]
command = "bun run build"
cwd = "app"
publish = "dist"

[build.environment]
NODE_VERSION = "20"
```

**Build Flow**:
1. Push to main branch on GitHub
2. Cloudflare detects commit
3. Runs: `bun install && bun run build`
4. Vite builds to `app/dist/`
5. Custom Vite plugins organize output
6. Cloudflare deploys to CDN
7. Live at: https://app.split.lease

**Build Output**:
- HTML files in root
- `assets/` with hashed bundles
- `images/`, `help-center-articles/` directories
- Cloudflare config files: `_redirects`, `_headers`, `_routes.json`
- `functions/` for Cloudflare Pages Functions
- `_internal/` for routing edge cases

---

## Common Development Tasks

### Add a New Filter to Search

1. Add options to `src/lib/constants.js`
2. Add UI to `src/islands/pages/SearchPage.jsx`
3. Apply filter in query logic
4. Add to URL sync in `src/lib/urlParams.js`

### Add a New Page

1. Create HTML: `app/public/my-page.html`
2. Create entry point: `app/src/my-page.jsx`
3. Create component: `app/src/islands/pages/MyPage.jsx`
4. Add to Route Registry: `app/src/routes.config.js`
5. Add styles: `app/src/styles/my-page.css`
6. Add to navigation: `app/src/islands/shared/Header.jsx`

### Modify Schedule Selector

Logic is centralized:
- `src/islands/shared/ListingScheduleSelector.jsx` - UI
- `src/islands/shared/useScheduleSelector.js` - Hook with all logic
- `src/lib/availabilityValidation.js` - Constraint validation

---

## Common Imports

```javascript
// Constants
import { DAYS, DAY_NAMES, SCHEDULE_PATTERNS, PRICE_TIERS } from 'src/lib/constants.js';

// Auth
import { checkAuthStatus, loginUser, logoutUser } from 'src/lib/auth.js';

// Supabase
import { supabase } from 'src/lib/supabase.js';

// Day conversion (CRITICAL)
import { adaptDaysFromBubble, adaptDaysToBubble } from 'src/logic/processors/external/';

// Data lookups
import { initializeLookups, getNeighborhoodName, getAmenity } from 'src/lib/dataLookups.js';

// Pricing
import { calculatePricingBreakdown } from 'src/logic/calculators/pricing/';

// Validation
import { isValidEmail, isValidPhone } from 'src/lib/sanitize.js';

// Proposal rules
import { canCancelProposal, canModifyProposal } from 'src/logic/rules/proposals/';
```

---

## CSS Color Variables

```css
--color-primary: #31135d;           /* Deep purple */
--color-primary-hover: #1f0b38;
--color-secondary: #5B21B6;
--color-success: #00C851;
--color-warning: #FFA500;
--color-error: #EF4444;
--color-border: #E5E7EB;
--color-text: #1F2937;
--color-text-light: #6B7280;
--color-background: #FFFFFF;
```

---

## Code Example: Complete Listing Fetch

```javascript
import { listingDataFetcher } from 'src/lib/listingDataFetcher.js';
import { initializeLookups } from 'src/lib/dataLookups.js';

// Initialize lookups once on app startup
await initializeLookups();

// Fetch complete listing with enrichment
const listing = await listingDataFetcher.fetchListingComplete(listingId);

// Listing now includes:
// - Raw listing data
// - Photos with metadata
// - Host information enriched with profile photo
// - Reviews
// - Resolved lookup data (neighborhood name, amenities with icons, etc.)
```

---

## Code Example: Price Calculation

```javascript
import { calculatePricingBreakdown } from 'src/logic/calculators/pricing/';

const pricing = calculatePricingBreakdown(
  listing,           // Listing object
  [1, 2, 3, 4, 5],  // Selected days (0-based)
  13                // Reservation span in days
);

// Returns breakdown with: nightlyRate, weeklyTotal, fourWeekRent,
// reservationWeeks, reservationTotal, cleaningFee, damageDeposit, grandTotal
```

---

## Code Example: Day Conversion

```javascript
import { adaptDaysToBubble, adaptDaysFromBubble } from 'src/logic/processors/external/';

// JavaScript (0-based) → Bubble API (1-based)
const bubbleDays = adaptDaysToBubble({ jsDays: [1, 2, 3, 4, 5] });
// Returns: [2, 3, 4, 5, 6]

// Bubble API (1-based) → JavaScript (0-based)
const jsDays = adaptDaysFromBubble({ bubbleDays: [2, 3, 4, 5, 6] });
// Returns: [1, 2, 3, 4, 5]
```

---

## Important Reminders

1. **No Fallback Mechanisms**: Return real data or null, never demo data
2. **Always Convert Days**: Use helper functions at API boundaries
3. **Edge Functions Deploy Manually**: Don't forget `supabase functions deploy`
4. **Use Encryption for Tokens**: Use `secureStorage.js`, not plain localStorage
5. **MCP Tools via Subagent**: Always invoke Playwright, Supabase MCPs through mcp-tool-specialist
6. **Commit After Changes**: Commit to main but don't push unless asked

---

## Quick Reference URLs

- **Production**: https://app.split.lease
- **GitHub**: https://github.com/splitleasesharath/splitlease
- **Cloudflare Dashboard**: https://dash.cloudflare.com/
- **Supabase Dashboard**: https://supabase.com/
- **Google Cloud Console**: https://console.cloud.google.com

---

**Document Status**: Comprehensive Architecture Guide for Claude Code Instances
**Last Maintenance**: 2025-12-11
**Audience**: Future Claude Code instances and developers
