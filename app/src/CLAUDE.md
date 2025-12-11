# app/src - React Application Source - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: Frontend React application source directory
**OPTIMIZATION**: Semantic Searchability + Digestibility
**PARENT**: app/

---

## QUICK_STATS

[TOTAL_ENTRY_POINTS]: 29
[TOTAL_DIRECTORIES]: 7
[PRIMARY_LANGUAGE]: JavaScript/JSX
[ARCHITECTURE]: Islands Architecture (React 18)
[BUILD_TOOL]: Vite
[KEY_PATTERNS]: Hollow Components, Four-Layer Logic, Day Conversion, Secure Storage

---

## ARCHITECTURE_OVERVIEW

[PATTERN]: Islands Architecture - Each JSX entry point creates independent React root
[FLOW]: HTML file → JSX entry point → Page component → Business logic hook
[STATE_MANAGEMENT]: Local state (useState), URL parameters, localStorage
[API_STRATEGY]: Supabase Edge Functions (proxies to Bubble API)
[ROUTING]: Route registry in routes.config.js

---

## DIRECTORY_STRUCTURE

### config/
[INTENT]: Configuration files
[KEY_FILE]: proposalStatusConfig.js
[EXPORTS]: Status configurations for proposal workflows

### data/
[INTENT]: Static content and data modules
[FILES]: 1
[EXPORTS]: helpCenterData

### islands/
[INTENT]: React component library following Islands Architecture
[SUBDIRS]: modals/, pages/, proposals/, shared/
[PATTERN]: Hollow Component Pattern for pages
[EXPORTS]: All UI components, page components, modals
[HAS_DOCUMENTATION]: Each major subdirectory contains CLAUDE.md

### lib/
[INTENT]: Shared utilities, API clients, infrastructure
[SUBDIRS]: constants/, proposals/, scheduleSelector/
[FILE_COUNT]: 24 core utility modules
[KEY_EXPORTS]: auth, supabase, bubbleAPI, constants, dataLookups, secureStorage
[PURPOSE]: Cross-cutting concerns, API clients, shared helpers

### logic/
[INTENT]: Four-layer business logic architecture
[SUBDIRS]: calculators/, constants/, processors/, rules/, workflows/
[FILE_COUNT]: 57 logic modules
[CALCULATOR_COUNT]: 9
[RULE_COUNT]: 22
[PROCESSOR_COUNT]: 14
[WORKFLOW_COUNT]: 12
[PATTERN]: Pure functions, single responsibility, testable

### routes/
[INTENT]: Generated route files from routes.config.js
[GENERATED]: Auto-generated, do not edit manually
[SOURCE]: routes.config.js

### styles/
[INTENT]: Global and page-specific CSS
[SUBDIRS]: components/
[FILE_COUNT]: 10 top-level CSS files
[KEY_FILE]: variables.css (CSS custom properties)
[PATTERN]: CSS variables for theming, component-level CSS

---

## ENTRY_POINT_FILES

[PATTERN]: Each *.jsx file mounts a React page component to HTML via createRoot
[TOTAL]: 29 entry points

### Core Pages
[FILE]: main.jsx
[MOUNTS]: HomePage
[ROUTE]: /
[PROTECTED]: false

[FILE]: search.jsx
[MOUNTS]: SearchPage
[ROUTE]: /search
[PROTECTED]: false

[FILE]: view-split-lease.jsx
[MOUNTS]: ViewSplitLeasePage
[ROUTE]: /view-split-lease/:id
[PROTECTED]: false

### Listing Management
[FILE]: self-listing.jsx
[MOUNTS]: SelfListingPage
[ROUTE]: /self-listing
[PROTECTED]: true

[FILE]: self-listing-v2.jsx
[MOUNTS]: SelfListingPageV2
[ROUTE]: /self-listing-v2
[PROTECTED]: false

[FILE]: listing-dashboard.jsx
[MOUNTS]: ListingDashboardPage
[ROUTE]: /listing-dashboard
[PROTECTED]: true

[FILE]: preview-split-lease.jsx
[MOUNTS]: PreviewSplitLeasePage
[ROUTE]: /preview-split-lease/:id
[PROTECTED]: true

### Host Pages
[FILE]: host-overview.jsx
[MOUNTS]: HostOverviewPage
[ROUTE]: /host-overview
[PROTECTED]: true

[FILE]: host-proposals.jsx
[MOUNTS]: HostProposalsPage
[ROUTE]: /host-proposals/:userId
[PROTECTED]: true

[FILE]: host-success.jsx
[MOUNTS]: HostSuccessPage
[ROUTE]: /host-success
[PROTECTED]: false

### Guest Pages
[FILE]: guest-proposals.jsx
[MOUNTS]: GuestProposalsPage
[ROUTE]: /guest-proposals/:userId
[PROTECTED]: true

[FILE]: guest-success.jsx
[MOUNTS]: GuestSuccessPage
[ROUTE]: /guest-success
[PROTECTED]: false

[FILE]: rental-application.jsx
[MOUNTS]: RentalApplicationPage
[ROUTE]: /rental-application
[PROTECTED]: true

[FILE]: favorite-listings.jsx
[MOUNTS]: FavoriteListingsPage
[ROUTE]: /favorite-listings
[PROTECTED]: true

### Account
[FILE]: account-profile.jsx
[MOUNTS]: AccountProfilePage
[ROUTE]: /account-profile/:userId
[PROTECTED]: true

[FILE]: reset-password.jsx
[MOUNTS]: ResetPasswordPage
[ROUTE]: /reset-password
[PROTECTED]: false

### Info Pages
[FILE]: list-with-us.jsx
[MOUNTS]: ListWithUsPage
[ROUTE]: /list-with-us
[PROTECTED]: false

[FILE]: why-split-lease.jsx
[MOUNTS]: WhySplitLeasePage
[ROUTE]: /why-split-lease
[PROTECTED]: false

[FILE]: about-us.jsx
[MOUNTS]: AboutUsPage
[ROUTE]: /about-us
[PROTECTED]: false

[FILE]: careers.jsx
[MOUNTS]: CareersPage
[ROUTE]: /careers
[PROTECTED]: false

[FILE]: faq.jsx
[MOUNTS]: FAQPage
[ROUTE]: /faq
[PROTECTED]: false

[FILE]: policies.jsx
[MOUNTS]: PoliciesPage
[ROUTE]: /policies
[PROTECTED]: false

### Help Center
[FILE]: help-center.jsx
[MOUNTS]: HelpCenterPage
[ROUTE]: /help-center
[PROTECTED]: false

[FILE]: help-center-category.jsx
[MOUNTS]: HelpCenterCategoryPage
[ROUTE]: /help-center/:category
[PROTECTED]: false

### Utility Pages
[FILE]: 404.jsx
[MOUNTS]: NotFoundPage
[ROUTE]: /404
[PROTECTED]: false

[FILE]: search-test.jsx
[MOUNTS]: SearchPageTest
[ROUTE]: /search-test
[PROTECTED]: false

[FILE]: listing-schedule-selector.jsx
[MOUNTS]: ListingScheduleSelector (standalone)
[ROUTE]: /listing-schedule-selector
[PROTECTED]: false

[FILE]: logged-in-avatar-demo.jsx
[MOUNTS]: LoggedInAvatar demo
[ROUTE]: /logged-in-avatar-demo
[PROTECTED]: false

[FILE]: _internal-test.jsx
[MOUNTS]: InternalTestPage
[ROUTE]: /_internal-test
[PROTECTED]: false

---

## ENTRY_POINT_PATTERN

```javascript
// Standard pattern for all entry points
import React from 'react';
import { createRoot } from 'react-dom/client';
import PageComponent from './islands/pages/PageComponent';

const root = createRoot(document.getElementById('root'));
root.render(<PageComponent />);
```

[CRITICAL]: Each entry point creates ONE React root per HTML page
[MOUNT_POINT]: div#root in HTML file
[HYDRATION]: None - full client-side rendering

---

## FOUR_LAYER_LOGIC_ARCHITECTURE

### logic/calculators/
[PURPOSE]: Pure mathematical calculations
[NAMING]: calculate*, get*
[RETURN]: Numbers, computed values
[DEPENDENCIES]: None (pure functions)
[SUBDIRS]: pricing/, scheduling/

#### logic/calculators/pricing/
[FILE]: calculateFourWeekRent.js
[FILE]: calculateGuestFacingPrice.js
[FILE]: calculatePricingBreakdown.js
[FILE]: calculateReservationTotal.js
[FILE]: getNightlyRateByFrequency.js

#### logic/calculators/scheduling/
[FILE]: calculateCheckInOutDays.js
[FILE]: calculateNextAvailableCheckIn.js
[FILE]: calculateNightsFromDays.js

### logic/rules/
[PURPOSE]: Boolean predicates for business logic
[NAMING]: can*, is*, has*, should*
[RETURN]: Boolean
[DEPENDENCIES]: May call calculators
[SUBDIRS]: auth/, pricing/, proposals/, scheduling/, search/, users/

#### logic/rules/auth/
[FILE]: isSessionValid.js
[FILE]: isProtectedPage.js

#### logic/rules/proposals/
[FILE]: canAcceptProposal.js
[FILE]: canCancelProposal.js
[FILE]: canEditProposal.js
[FILE]: determineProposalStage.js
[FILE]: proposalRules.js
[FILE]: virtualMeetingRules.js
[FILE]: useProposalButtonStates.js

#### logic/rules/pricing/
[FILE]: isValidDayCountForPricing.js

#### logic/rules/scheduling/
[FILE]: isDateBlocked.js
[FILE]: isDateInRange.js
[FILE]: isScheduleContiguous.js

#### logic/rules/search/
[FILE]: hasListingPhotos.js
[FILE]: isValidPriceTier.js
[FILE]: isValidSortOption.js
[FILE]: isValidWeekPattern.js

#### logic/rules/users/
[FILE]: hasProfilePhoto.js
[FILE]: isGuest.js
[FILE]: isHost.js
[FILE]: shouldShowFullName.js

### logic/processors/
[PURPOSE]: Data transformation and formatting
[NAMING]: adapt*, extract*, process*, format*
[RETURN]: Transformed data
[DEPENDENCIES]: May call calculators
[SUBDIRS]: display/, external/, listing/, proposal/, proposals/, user/

#### logic/processors/external/
[CRITICAL]: Day conversion at API boundaries
[FILE]: adaptDayFromBubble.js - Convert single day Bubble(1-7) → JS(0-6)
[FILE]: adaptDayToBubble.js - Convert single day JS(0-6) → Bubble(1-7)
[FILE]: adaptDaysFromBubble.js - Convert day array Bubble → JS
[FILE]: adaptDaysToBubble.js - Convert day array JS → Bubble

#### logic/processors/display/
[FILE]: formatHostName.js

#### logic/processors/listing/
[FILE]: extractListingCoordinates.js
[FILE]: parseJsonArrayField.js

#### logic/processors/proposal/
[FILE]: processProposalData.js

#### logic/processors/proposals/
[FILE]: processProposalData.js

#### logic/processors/user/
[FILE]: processProfilePhotoUrl.js
[FILE]: processUserDisplayName.js
[FILE]: processUserInitials.js
[FILE]: processUserData.js

### logic/workflows/
[PURPOSE]: Orchestration of multiple operations
[NAMING]: *Workflow
[RETURN]: Complex results, side effects
[DEPENDENCIES]: Calls calculators, rules, processors
[SUBDIRS]: auth/, booking/, proposals/, scheduling/

#### logic/workflows/auth/
[FILE]: checkAuthStatusWorkflow.js
[FILE]: validateTokenWorkflow.js

#### logic/workflows/booking/
[FILE]: acceptProposalWorkflow.js
[FILE]: cancelProposalWorkflow.js
[FILE]: loadProposalDetailsWorkflow.js

#### logic/workflows/proposals/
[FILE]: cancelProposalWorkflow.js
[FILE]: counterofferWorkflow.js
[FILE]: navigationWorkflow.js
[FILE]: virtualMeetingWorkflow.js

#### logic/workflows/scheduling/
[FILE]: validateMoveInDateWorkflow.js
[FILE]: validateScheduleWorkflow.js

### logic/constants/
[FILE]: proposalStages.js
[FILE]: proposalStatuses.js

### logic/index.js
[EXPORTS]: Barrel exports for all logic layers

---

## LIB_UTILITIES

### Core API Clients

#### lib/supabase.js
[INTENT]: Supabase client initialization
[EXPORTS]: supabase (client instance)
[USES]: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

#### lib/bubbleAPI.js
[INTENT]: Bubble API proxy client
[EXPORTS]: API functions for Bubble operations
[CRITICAL]: All Bubble calls go through Supabase Edge Functions

#### lib/auth.js
[INTENT]: Authentication functions
[EXPORTS]: loginUser, logoutUser, checkAuthStatus, validateTokenAndFetchUser
[STORAGE]: Uses secureStorage for token encryption

#### lib/secureStorage.js
[INTENT]: Encrypted localStorage wrapper
[EXPORTS]: setSecureItem, getSecureItem, removeSecureItem
[USES]: AES encryption for sensitive data

### Data Access

#### lib/dataLookups.js
[INTENT]: Fetch reference data from Supabase
[EXPORTS]: fetchBoroughs, fetchNeighborhoods, fetchAmenities, etc.
[SOURCE]: Supabase tables (zat_* tables)

#### lib/proposalDataFetcher.js
[INTENT]: Fetch proposal data with related entities
[EXPORTS]: fetchProposalData functions
[JOINS]: Listings, users, virtual meetings

#### lib/listingDataFetcher.js
[INTENT]: Fetch listing data
[EXPORTS]: Listing query functions

#### lib/listingService.js
[INTENT]: Listing business operations
[EXPORTS]: CRUD operations for listings

### Utilities

#### lib/constants.js
[INTENT]: All application constants
[EXPORTS]: DAYS, DAY_NAMES, SCHEDULE_PATTERNS, PRICE_TIERS, URLs, etc.
[CRITICAL]: Single source of truth for configuration

#### lib/dayUtils.js
[INTENT]: Day manipulation utilities
[EXPORTS]: Day formatting, parsing functions

#### lib/mapUtils.js
[INTENT]: Google Maps utilities
[EXPORTS]: Map configuration, marker helpers

#### lib/priceCalculations.js
[INTENT]: Legacy pricing calculations
[NOTE]: Being migrated to logic/calculators/pricing/

#### lib/sanitize.js
[INTENT]: Input sanitization
[EXPORTS]: sanitizeInput, sanitizeHtml

#### lib/urlParams.js
[INTENT]: URL parameter parsing
[EXPORTS]: getUrlParam, setUrlParams

#### lib/navigation.js
[INTENT]: Client-side navigation helpers
[EXPORTS]: navigateTo, redirectTo

#### lib/photoUpload.js
[INTENT]: Photo upload to storage
[EXPORTS]: uploadPhoto, deletePhoto

#### lib/slackService.js
[INTENT]: Slack notification integration
[EXPORTS]: sendSlackNotification

#### lib/aiService.js
[INTENT]: AI service integration
[EXPORTS]: AI-powered features

#### lib/hotjar.js
[INTENT]: Hotjar analytics initialization
[EXPORTS]: initHotjar

#### lib/config.js
[INTENT]: Runtime configuration
[EXPORTS]: Config getters

#### lib/availabilityValidation.js
[INTENT]: Validate listing availability
[EXPORTS]: Availability check functions

#### lib/informationalTextsFetcher.js
[INTENT]: Fetch CMS content from Supabase
[EXPORTS]: fetchInformationalTexts

#### lib/supabaseUtils.js
[INTENT]: Supabase helper utilities
[EXPORTS]: Query builders, formatters

### lib/constants/
[FILE]: proposalStages.js
[FILE]: proposalStatuses.js

### lib/proposals/
[FILE]: dataTransformers.js
[FILE]: statusButtonConfig.js

### lib/scheduleSelector/
[FILE]: dayHelpers.js
[FILE]: nightCalculations.js
[FILE]: priceCalculations.js
[FILE]: validators.js

---

## ROUTING_SYSTEM

### routes.config.js
[INTENT]: Single source of truth for all routes
[EXPORTS]: routes array, route helper functions
[USED_BY]: Vite config, Cloudflare config generators
[PATTERN]: Each route defines path, file, protected, cloudflareInternal
[TOTAL_ROUTES]: 30+ routes

[DYNAMIC_ROUTES]: Support :param syntax for URL parameters
[PROTECTED_ROUTES]: Require authentication check
[CLOUDFLARE_INTERNAL]: Use _internal/ directory to avoid 308 redirects

### Route Helpers
[FUNCTION]: matchRoute(url, route) - Check URL against route pattern
[FUNCTION]: findRouteForUrl(url) - Find matching route for URL
[FUNCTION]: buildRollupInputs(publicDir) - Generate Vite build inputs
[FUNCTION]: getInternalRoutes() - Get routes needing _internal/ handling

---

## STYLING_SYSTEM

### styles/variables.css
[INTENT]: CSS custom properties for theming
[EXPORTS]: --color-*, --spacing-*, --font-* variables
[USED_BY]: All CSS files

### Global Styles
[FILE]: main.css - Global resets, base styles
[FILE]: reset-password.css - Reset password page
[FILE]: careers.css - Careers page
[FILE]: faq.css - FAQ page
[FILE]: help-center.css - Help center pages
[FILE]: list-with-us.css - List with us page
[FILE]: why-split-lease.css - Why Split Lease page
[FILE]: listing-schedule-selector.css - Schedule selector component
[FILE]: create-proposal-flow-v2.css - Proposal flow modal

### styles/components/
[INTENT]: Component-specific CSS
[PATTERN]: Matches component name from islands/

---

## CRITICAL_PATTERNS

### Day Indexing Convention
[INTERNAL]: JavaScript 0-6 (Sunday=0, Monday=1, ..., Saturday=6)
[BUBBLE_API]: Bubble 1-7 (Sunday=1, Monday=2, ..., Saturday=7)
[CONVERSION]: ALWAYS use adaptDaysFromBubble/adaptDaysToBubble at boundaries
[LOCATION]: logic/processors/external/

```javascript
import { adaptDaysFromBubble } from 'logic/processors/external/adaptDaysFromBubble.js';
import { adaptDaysToBubble } from 'logic/processors/external/adaptDaysToBubble.js';

// Receiving from Bubble API
const jsDays = adaptDaysFromBubble({ bubbleDays: [2, 3, 4, 5, 6] }); // → [1, 2, 3, 4, 5]

// Sending to Bubble API
const bubbleDays = adaptDaysToBubble({ jsDays: [1, 2, 3, 4, 5] }); // → [2, 3, 4, 5, 6]
```

### Hollow Component Pattern
[DESCRIPTION]: UI component delegates ALL logic to custom hook
[COMPONENT]: Contains only JSX rendering
[HOOK]: Contains all state, effects, handlers
[BENEFIT]: Testable logic, focused rendering, reusable logic

```javascript
// islands/pages/ViewSplitLeasePage.jsx
export default function ViewSplitLeasePage() {
  const logic = useViewSplitLeasePageLogic();
  return <div>{/* Pure JSX using logic.* */}</div>;
}

// islands/pages/useViewSplitLeasePageLogic.js
export function useViewSplitLeasePageLogic() {
  // ALL state, effects, handlers here
  return { /* exported API */ };
}
```

### Secure Storage Pattern
[DESCRIPTION]: Encrypt sensitive data in localStorage
[USED_FOR]: Auth tokens, session IDs
[ENCRYPTION]: AES encryption

```javascript
import { setSecureItem, getSecureItem, removeSecureItem } from 'lib/secureStorage.js';

// Store encrypted
setSecureItem('splitlease_auth_token', token);

// Retrieve and decrypt
const token = getSecureItem('splitlease_auth_token');

// Remove
removeSecureItem('splitlease_auth_token');
```

### API Proxy Pattern
[DESCRIPTION]: All Bubble API calls go through Supabase Edge Functions
[REASON]: Keep API keys server-side
[NEVER]: Call Bubble API directly from frontend

```javascript
import { bubbleAPI } from 'lib/bubbleAPI.js';

// Proxied through Edge Function
const listing = await bubbleAPI.getListing(listingId);
```

---

## IMPORT_ALIASES

[ALIAS]: logic/* → C:\Users\Split Lease\Documents\Split Lease\app\src\logic/*
[ALIAS]: lib/* → C:\Users\Split Lease\Documents\Split Lease\app\src\lib/*
[ALIAS]: islands/* → C:\Users\Split Lease\Documents\Split Lease\app\src\islands/*
[ALIAS]: styles/* → C:\Users\Split Lease\Documents\Split Lease\app\src\styles/*

```javascript
// Use absolute imports from src/
import { calculateFourWeekRent } from 'logic/calculators/pricing/calculateFourWeekRent.js';
import { checkAuthStatus } from 'lib/auth.js';
import Button from 'islands/shared/Button.jsx';
```

---

## KEY_DATA_FLOWS

### Authentication Flow
[ENTRY]: User submits login form
[STEP_1]: lib/auth.js → loginUser()
[STEP_2]: Supabase Edge Function auth-user
[STEP_3]: Bubble API validates credentials
[STEP_4]: Token stored via lib/secureStorage.js
[STEP_5]: User type stored (Host/Guest)
[EXIT]: Redirect to dashboard

### Proposal Creation Flow
[ENTRY]: Guest clicks "Book" on listing
[STEP_1]: islands/shared/CreateProposalFlowV2.jsx modal opens
[STEP_2]: User selects days (uses day conversion)
[STEP_3]: logic/calculators/pricing calculates prices
[STEP_4]: logic/rules/proposals validates proposal
[STEP_5]: logic/workflows/proposals orchestrates submission
[STEP_6]: Supabase Edge Function → Bubble API
[EXIT]: Redirect to guest-proposals page

### Listing Search Flow
[ENTRY]: User visits /search
[STEP_1]: islands/pages/SearchPage.jsx renders
[STEP_2]: User sets filters (days, price, location)
[STEP_3]: lib/dataLookups.js fetches listings from Supabase
[STEP_4]: logic/rules/search validates filters
[STEP_5]: islands/shared/GoogleMap.jsx displays results
[EXIT]: User clicks listing → /view-split-lease/:id

---

## SUBDIRECTORY_DOCUMENTATION

[islands/CLAUDE.md]: Component library documentation
[logic/CLAUDE.md]: Four-layer logic documentation
[lib/CLAUDE.md]: Utilities and API clients documentation
[styles/CLAUDE.md]: Styling conventions and CSS documentation

---

## USAGE_NOTES

### When Adding New Page
1. Create HTML file in app/public/
2. Create JSX entry point in app/src/
3. Create page component in app/src/islands/pages/
4. Create logic hook in app/src/islands/pages/use*PageLogic.js
5. Add route to routes.config.js
6. Run: bun run generate-routes

### When Adding Business Logic
1. Determine layer: calculator, rule, processor, or workflow
2. Create file in appropriate logic/* subdirectory
3. Follow naming convention for layer
4. Write pure function with single responsibility
5. Export from layer's index.js

### When Adding API Call
1. Add function to lib/bubbleAPI.js or lib/supabase.js
2. Use Edge Function proxy for Bubble API
3. Add error handling
4. Use secure storage for tokens

### When Converting Days
1. Identify system boundary (Bubble API ↔ Internal)
2. Use adaptDaysFromBubble when receiving from Bubble
3. Use adaptDaysToBubble when sending to Bubble
4. NEVER mix 0-based and 1-based in same function

---

## CRITICAL_FILES

### Must Read Before Changes
[FILE]: routes.config.js - Route definitions
[FILE]: lib/constants.js - All configuration
[FILE]: lib/auth.js - Authentication system
[FILE]: logic/processors/external/adaptDays*.js - Day conversion

### Don't Modify
[DIR]: routes/ - Auto-generated
[FILE]: Any file in logic/ without understanding four-layer pattern

---

## METRICS

[ENTRY_POINTS]: 29
[LOGIC_FILES]: 57
[LIB_FILES]: 24
[TOTAL_FILES]: 150+
[CALCULATORS]: 9
[RULES]: 22
[PROCESSORS]: 14
[WORKFLOWS]: 12
[CSS_FILES]: 10+ global
[ROUTES]: 30+

---

**VERSION**: 5.0
**LAST_UPDATED**: 2025-12-11
**MAINTAINER**: Claude Code
