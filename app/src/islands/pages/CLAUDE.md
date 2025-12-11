# Pages - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: Page-level React components following Islands Architecture
**PARENT**: app/src/islands/

---

## QUICK_STATS

[TOTAL_PAGES]: 30
[PRIMARY_LANGUAGE]: JavaScript/JSX
[KEY_PATTERNS]: Hollow Component Pattern, Islands Architecture, Logic Hooks
[SUBDIRECTORIES]: 8

---

## ARCHITECTURE_OVERVIEW

### Islands Architecture
- Each page is an independent React root mounted to an HTML file
- Entry points in `app/src/*.jsx` create React roots and mount page components
- Progressive enhancement: static HTML + hydrated React islands

### Hollow Component Pattern
- Page components contain ONLY JSX rendering (no business logic)
- ALL business logic delegated to custom hooks (`use*PageLogic.js`)
- Hooks return pre-calculated state and pre-bound event handlers
- Benefits: testable logic, focused UI, reusable business logic

### Pattern Example
```jsx
// Page Component (Hollow - UI only)
export default function SearchPage() {
  const {
    listings,      // pre-processed data
    filters,       // derived state
    handleFilter   // pre-bound handler
  } = useSearchPageLogic();

  return <div>{/* Pure rendering */}</div>;
}

// Logic Hook (All business logic)
export function useSearchPageLogic() {
  // State management
  // Data fetching
  // Event handlers
  // Computed values
  return { listings, filters, handleFilter };
}
```

---

## PAGES

### AboutUsPage/
[INTENT]: Company mission, team profiles, value proposition
[ENTRY_POINT]: AboutUsPage/AboutUsPage.jsx
[HOOK]: None (static content page)
[ROUTE]: /about-us
[DATA_SOURCE]: Supabase table `zat_splitleaseteam`
[FEATURES]: Team member cards with click-through links, skeleton loading states

### CareersPage.jsx
[INTENT]: Job listings and company information
[ENTRY_POINT]: CareersPage.jsx
[HOOK]: None (static content)
[ROUTE]: /careers
[IMPORTS]: shared/Header, shared/Footer

### FAQPage.jsx
[INTENT]: Frequently asked questions with accordion UI
[ENTRY_POINT]: FAQPage.jsx
[HOOK]: None (static content)
[ROUTE]: /faq
[IMPORTS]: shared/Header, shared/Footer

### FavoriteListingsPage/
[INTENT]: User's saved/favorited listings with map view
[ENTRY_POINT]: FavoriteListingsPage/FavoriteListingsPage.jsx
[HOOK]: Inline state management (no separate hook file)
[ROUTE]: /favorite-listings
[AUTH]: Required (guest/host)
[FEATURES]: Two-column layout (listings + map), favorite management, schedule selector
[COMPONENTS]: EmptyState, FavoriteButton, ListingCard, MapView, SplitScheduleSelector
[API]: favoritesApi.js for CRUD operations

### GuestProposalsPage.jsx
[INTENT]: Guest dashboard for viewing and managing proposals
[ENTRY_POINT]: GuestProposalsPage.jsx
[HOOK]: proposals/useGuestProposalsPageLogic.js
[ROUTE]: /guest-proposals
[AUTH]: Required (guest only)
[PATTERN]: Hollow Component Pattern
[FEATURES]: Proposal listing, status tracking, progress visualization
[IMPORTS]: shared/Header, modals/ProposalDetailsModal, proposals/*

### GuestSuccessPage.jsx
[INTENT]: Booking confirmation page after proposal submission
[ENTRY_POINT]: GuestSuccessPage.jsx
[HOOK]: None (confirmation page)
[ROUTE]: /guest-success
[IMPORTS]: shared/Header, shared/Footer

### HelpCenterPage.jsx
[INTENT]: Help center main page with category navigation
[ENTRY_POINT]: HelpCenterPage.jsx
[HOOK]: None (static navigation)
[ROUTE]: /help-center
[DATA_SOURCE]: data/helpCenterData.js
[IMPORTS]: shared/Header, shared/Footer

### HelpCenterCategoryPage.jsx
[INTENT]: Help center category view with filtered articles
[ENTRY_POINT]: HelpCenterCategoryPage.jsx
[HOOK]: None (URL param filtering)
[ROUTE]: /help-center-category?category={id}
[DATA_SOURCE]: data/helpCenterData.js
[IMPORTS]: lib/urlParams

### HomePage.jsx
[INTENT]: Landing page with hero, value props, featured listings
[ENTRY_POINT]: HomePage.jsx
[HOOK]: None (marketing page)
[ROUTE]: / (root)
[IMPORTS]: shared/Header, shared/Footer, shared/ListingCard

### HostOverviewPage/
[INTENT]: Host dashboard - central hub for managing listings, house manuals, meetings
[ENTRY_POINT]: HostOverviewPage/HostOverviewPage.jsx
[HOOK]: HostOverviewPage/useHostOverviewPageLogic.js
[ROUTE]: /host-overview
[AUTH]: Required (host only)
[PATTERN]: Hollow Component Pattern
[FEATURES]: Listings management, claim listings, house manuals, virtual meetings
[COMPONENTS]: HostOverviewCards, HostOverviewModals, HostOverviewToast, HostOverviewButton
[SECTIONS]: Listings to claim, your listings, house manuals, virtual meetings

### HostProposalsPage/
[INTENT]: Host dashboard for viewing proposals across all their listings
[ENTRY_POINT]: HostProposalsPage/index.jsx
[HOOK]: HostProposalsPage/useHostProposalsPageLogic.js
[ROUTE]: /host-proposals
[AUTH]: Required (host only)
[PATTERN]: Hollow Component Pattern
[FEATURES]: Multi-listing proposal view, filtering by listing, proposal actions
[COMPONENTS]: DayIndicator, EmptyState, ListingSelector, ProposalCard, ProposalDetailsModal, ProposalGrid
[FORMATTERS]: formatters.js for date/status display
[TYPES]: types.js for TypeScript interfaces

### HostSuccessPage.jsx
[INTENT]: Listing creation confirmation page
[ENTRY_POINT]: HostSuccessPage.jsx
[HOOK]: None (confirmation page)
[ROUTE]: /host-success
[IMPORTS]: shared/Header, shared/Footer

### InternalTestPage.jsx
[INTENT]: Internal testing page with 25 test buttons
[ENTRY_POINT]: InternalTestPage.jsx
[HOOK]: None (development tool)
[ROUTE]: /_internal-test
[PURPOSE]: Development/QA testing environment

### ListingDashboardPage/
[INTENT]: Host-facing single listing management dashboard
[ENTRY_POINT]: ListingDashboardPage/ListingDashboardPage.jsx
[HOOK]: ListingDashboardPage/useListingDashboardPageLogic.js
[ROUTE]: /listing-dashboard?id={LISTING_ID}
[AUTH]: Required (host - must own listing)
[PATTERN]: Hollow Component Pattern
[FEATURES]: Tab navigation (Preview/Manage/Proposals/Meetings/Leases), inline editing, AI assistant
[COMPONENTS]: NavigationHeader, ActionCard, ActionCardGrid, AlertBanner, SecondaryActions, PropertyInfoSection, DetailsSection, AmenitiesSection, DescriptionSection, PricingSection, PricingEditSection, RulesSection, AvailabilitySection, PhotosSection, CancellationPolicySection
[MODALS]: ScheduleCohost, ImportListingReviewsModal, AIImportAssistantModal
[DOCUMENTATION]: ListingDashboardPage/CLAUDE.md (detailed component docs)

### ListWithUsPage.jsx
[INTENT]: Host signup and onboarding page
[ENTRY_POINT]: ListWithUsPage.jsx
[HOOK]: None (static marketing)
[ROUTE]: /list-with-us
[IMPORTS]: shared/Header, shared/SignUpLoginModal

### NotFoundPage.jsx
[INTENT]: 404 error page with navigation options
[ENTRY_POINT]: NotFoundPage.jsx
[HOOK]: None (error page)
[ROUTE]: /404
[IMPORTS]: shared/Header, shared/Footer

### PoliciesPage.jsx
[INTENT]: Terms of service, privacy policy, legal documents
[ENTRY_POINT]: PoliciesPage.jsx
[HOOK]: None (static legal content)
[ROUTE]: /policies
[IMPORTS]: shared/Header, shared/Footer

### PreviewSplitLeasePage.jsx
[INTENT]: Host preview mode for listings (view without booking widget)
[ENTRY_POINT]: PreviewSplitLeasePage.jsx
[HOOK]: Inline state (similar to ViewSplitLeasePage but host-focused)
[ROUTE]: /preview-split-lease/{LISTING_ID}
[AUTH]: Required (host - should verify ownership)
[FEATURES]: Edit buttons per section, display-only booking widget, inline editing
[COMPONENTS]: EditSectionButton, SectionHeader, EditListingDetails
[PURPOSE]: Host can preview their listing as it appears to guests with edit capabilities

### RentalApplicationPage.jsx
[INTENT]: Multi-step rental application form for guests
[ENTRY_POINT]: RentalApplicationPage.jsx
[HOOK]: useRentalApplicationPageLogic.js
[ROUTE]: /rental-application
[AUTH]: Required (guest)
[PATTERN]: Hollow Component Pattern
[FEATURES]: Multi-section form, occupant management, document upload, verification integrations
[SECTIONS]: Personal info, occupants, employment, verification, documents
[VALIDATION]: Field-level validation with real-time feedback

### ResetPasswordPage.jsx
[INTENT]: Password reset flow after clicking email link
[ENTRY_POINT]: ResetPasswordPage.jsx
[HOOK]: Inline state management
[ROUTE]: /reset-password
[AUTH]: Public (token-based from email)
[FLOW]: Supabase PASSWORD_RECOVERY event → user enters new password → Edge Function update
[SECURITY]: Accepts returnTo URL parameter (validated as relative path only)

### SearchPage.jsx
[INTENT]: Search and browse listings page
[ENTRY_POINT]: SearchPage.jsx
[HOOK]: useSearchPageLogic.js
[ROUTE]: /search
[PATTERN]: Hollow Component Pattern
[FEATURES]: Two-column layout (listings + map), filtering, schedule selector
[IMPORTS]: shared/Header, shared/ListingCard, shared/GoogleMap

### SearchPageTest.jsx
[INTENT]: Test variant of SearchPage for development
[ENTRY_POINT]: SearchPageTest.jsx
[HOOK]: useSearchPageLogic.js (shared with SearchPage)
[ROUTE]: /search-test
[PURPOSE]: Development/QA environment for testing search features

### SelfListingPage/
[INTENT]: Multi-section listing creation form (TypeScript module)
[ENTRY_POINT]: SelfListingPage.jsx (wrapper) → SelfListingPage/SelfListingPage.tsx
[HOOK]: Logic embedded in sections
[ROUTE]: /self-listing
[AUTH]: Required (host)
[PATTERN]: Multi-step form with localStorage draft saving
[SECTIONS]: Space Snapshot → Features → Lease Styles → Pricing → Rules → Photos → Review
[FILES]: 15+ TypeScript files across components/, sections/, store/, types/, utils/
[DOCUMENTATION]: SelfListingPage/CLAUDE.md (detailed module docs)
[STATE]: Zustand store for form state management

### SelfListingPageV2/
[INTENT]: Next-generation listing creation form (experimental)
[ENTRY_POINT]: SelfListingPageV2.jsx (wrapper) → SelfListingPageV2/index.ts
[HOOK]: TBD (in development)
[ROUTE]: /self-listing-v2
[AUTH]: Required (host)
[STATUS]: In development
[FILES]: TypeScript implementation with styles/

### ViewSplitLeasePage.jsx
[INTENT]: Listing detail page with proposal creation flow
[ENTRY_POINT]: ViewSplitLeasePage.jsx
[HOOK]: useViewSplitLeasePageLogic.js
[ROUTE]: /view-split-lease/{LISTING_ID}
[PATTERN]: Hollow Component Pattern
[FEATURES]: Full listing details, schedule selector, pricing breakdown, proposal wizard
[IMPORTS]: shared/CreateProposalFlowV2, shared/GoogleMap
[PRICING]: Real-time pricing calculations based on selected days

### ViewSplitLeasePage-old.jsx
[INTENT]: Legacy listing detail page (deprecated)
[ENTRY_POINT]: ViewSplitLeasePage-old.jsx
[STATUS]: Deprecated (use ViewSplitLeasePage.jsx)
[PURPOSE]: Historical reference only

### WhySplitLeasePage.jsx
[INTENT]: Marketing page explaining Split Lease benefits
[ENTRY_POINT]: WhySplitLeasePage.jsx
[HOOK]: None (marketing content)
[ROUTE]: /why-split-lease
[IMPORTS]: shared/Header, shared/Footer

---

## SUBDIRECTORIES_DETAIL

### proposals/
[PURPOSE]: Shared proposal-related presentational components
[FILES]: ProposalCard.jsx, ProgressTracker.jsx, ProposalSelector.jsx, VirtualMeetingsSection.jsx, useGuestProposalsPageLogic.js
[USAGE]: Used by GuestProposalsPage and potentially HostProposalsPage
[NOTE]: Contains both components and logic hook (consider refactoring logic hook to parent)

### ViewSplitLeasePageComponents/
[PURPOSE]: Sub-components for ViewSplitLeasePage
[STATUS]: Check for actual files (may be empty or deprecated)

---

## LOGIC_HOOKS

### useGuestProposalsPageLogic.js
[LOCATION]: proposals/useGuestProposalsPageLogic.js
[USED_BY]: GuestProposalsPage.jsx
[RESPONSIBILITIES]: Fetch user proposals, status tracking, URL synchronization, auth checks
[AUTH]: Guest-only (redirects if not authenticated or not guest)
[DATA_FETCHERS]: lib/proposals/userProposalQueries.js
[PROCESSORS]: lib/proposals/dataTransformers.js
[CONSTANTS]: logic/constants/proposalStatuses.js, logic/constants/proposalStages.js

### useHostOverviewPageLogic.js
[LOCATION]: HostOverviewPage/useHostOverviewPageLogic.js
[USED_BY]: HostOverviewPage.jsx
[RESPONSIBILITIES]: Fetch host listings/manuals/meetings, delete operations, modal state, toast notifications
[AUTH]: Host-only
[FEATURES]: CRUD for listings, house manuals; virtual meeting management

### useHostProposalsPageLogic.js
[LOCATION]: HostProposalsPage/useHostProposalsPageLogic.js
[USED_BY]: HostProposalsPage/index.jsx
[RESPONSIBILITIES]: Fetch proposals for all host's listings, listing selector, proposal actions
[AUTH]: Host-only
[FEATURES]: Accept/reject/modify proposals, send messages, schedule meetings

### useListingDashboardPageLogic.js
[LOCATION]: ListingDashboardPage/useListingDashboardPageLogic.js
[USED_BY]: ListingDashboardPage.jsx
[RESPONSIBILITIES]: Single listing management, tab navigation, inline editing, proposal counts
[AUTH]: Host-only (must own listing)
[FEATURES]: Description editing, cancellation policy updates, photo management, blocked dates

### useRentalApplicationPageLogic.js
[LOCATION]: useRentalApplicationPageLogic.js
[USED_BY]: RentalApplicationPage.jsx
[RESPONSIBILITIES]: Form state, validation, file uploads, occupant management, submission
[AUTH]: Guest-only
[FEATURES]: Multi-step form, real-time validation, document uploads, verification APIs

### useSearchPageLogic.js
[LOCATION]: useSearchPageLogic.js
[USED_BY]: SearchPage.jsx, SearchPageTest.jsx
[RESPONSIBILITIES]: Fetch listings, filter state, URL parameter sync, map interactions
[DATA_FETCHERS]: lib/supabase queries
[URL_SYNC]: lib/urlParams
[RULES]: logic/rules/search/

### useViewSplitLeasePageLogic.js
[LOCATION]: useViewSplitLeasePageLogic.js
[USED_BY]: ViewSplitLeasePage.jsx
[RESPONSIBILITIES]: Fetch listing details, schedule selection, pricing calculations, auth checks
[DATA_FETCHERS]: lib/listingDataFetcher
[CALCULATORS]: logic/calculators/pricing/, logic/calculators/scheduling/
[AUTH]: Optional (some features require authentication)

---

## HOLLOW_COMPONENT_PATTERN_BENEFITS

### Testability
- Business logic isolated in hooks can be unit tested without rendering UI
- UI components can be snapshot tested with mocked hook responses

### Reusability
- Logic hooks can be shared between multiple components
- UI components can be used with different logic implementations

### Maintainability
- Clear separation of concerns: UI vs. business logic
- Easy to locate and modify business rules (always in hooks)
- Component files stay small and focused

### Developer Experience
- Hook signatures document all page capabilities
- Pre-calculated state reduces component complexity
- Type definitions in one place (hook return type)

---

## ENTRY_POINT_MAPPING

| HTML/Entry File | Page Component | Route |
|-----------------|----------------|-------|
| main.jsx | HomePage.jsx | / |
| search.jsx | SearchPage.jsx | /search |
| view-split-lease.jsx | ViewSplitLeasePage.jsx | /view-split-lease/{id} |
| self-listing.jsx | SelfListingPage.jsx | /self-listing |
| self-listing-v2.jsx | SelfListingPageV2.jsx | /self-listing-v2 |
| guest-proposals.jsx | GuestProposalsPage.jsx | /guest-proposals |
| host-overview.jsx | HostOverviewPage.jsx | /host-overview |
| host-proposals.jsx | HostProposalsPage.jsx | /host-proposals |
| listing-dashboard.jsx | ListingDashboardPage.jsx | /listing-dashboard |
| favorite-listings.jsx | FavoriteListingsPage.jsx | /favorite-listings |
| rental-application.jsx | RentalApplicationPage.jsx | /rental-application |
| preview-split-lease.jsx | PreviewSplitLeasePage.jsx | /preview-split-lease/{id} |
| about-us.jsx | AboutUsPage.jsx | /about-us |
| careers.jsx | CareersPage.jsx | /careers |
| faq.jsx | FAQPage.jsx | /faq |
| help-center.jsx | HelpCenterPage.jsx | /help-center |
| help-center-category.jsx | HelpCenterCategoryPage.jsx | /help-center-category |
| list-with-us.jsx | ListWithUsPage.jsx | /list-with-us |
| why-split-lease.jsx | WhySplitLeasePage.jsx | /why-split-lease |
| policies.jsx | PoliciesPage.jsx | /policies |
| guest-success.jsx | GuestSuccessPage.jsx | /guest-success |
| host-success.jsx | HostSuccessPage.jsx | /host-success |
| reset-password.jsx | ResetPasswordPage.jsx | /reset-password |
| 404.jsx | NotFoundPage.jsx | /404 |
| _internal-test.jsx | InternalTestPage.jsx | /_internal-test |

---

## AUTH_REQUIREMENTS_SUMMARY

### Public Pages (No Auth Required)
- HomePage, SearchPage, ViewSplitLeasePage (limited features), ListWithUsPage, WhySplitLeasePage, FAQPage, HelpCenterPage, HelpCenterCategoryPage, PoliciesPage, CareersPage, AboutUsPage, NotFoundPage

### Guest-Only Pages
- GuestProposalsPage, RentalApplicationPage, GuestSuccessPage

### Host-Only Pages
- HostOverviewPage, HostProposalsPage, ListingDashboardPage, PreviewSplitLeasePage, SelfListingPage, SelfListingPageV2, HostSuccessPage

### Guest or Host Pages
- FavoriteListingsPage, ResetPasswordPage

---

## DATA_SOURCES

### Supabase Direct Queries
- FavoriteListingsPage: `user`, `listing`, `listing_photo`
- AboutUsPage: `zat_splitleaseteam`
- All lookup tables: `zat_*` (neighborhoods, boroughs, amenities, etc.)

### Bubble API (via Edge Functions)
- Proposals: bubble-proxy edge function
- User data: auth-user edge function
- Listing data: bubble-proxy edge function

### Static Data Files
- HelpCenterPage, HelpCenterCategoryPage: `data/helpCenterData.js`
- Constants: `lib/constants.js`

---

## COMMON_PATTERNS

### Loading States
```jsx
if (isLoading) {
  return <LoadingState />;
}
```

### Error States
```jsx
if (error) {
  return <ErrorState message={error} onRetry={handleRetry} />;
}
```

### Empty States
```jsx
{items.length === 0 && (
  <EmptyState
    message="No items found"
    ctaText="Create One"
    ctaLink="/create"
  />
)}
```

### Modal Management
```jsx
const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);

const handleOpen = (item) => {
  setSelectedItem(item);
  setIsModalOpen(true);
};
```

### URL Parameter Sync
```jsx
// Read from URL
const params = new URLSearchParams(window.location.search);
const value = params.get('key');

// Write to URL
params.set('key', newValue);
window.history.replaceState({}, '', `?${params.toString()}`);
```

---

## STYLING_CONVENTIONS

### File Location
- Component-specific: Co-located with component (e.g., `AboutUsPage.css`)
- Shared styles: `app/src/styles/components/`
- Global variables: `app/src/styles/variables.css`

### CSS Naming
- Class names: `kebab-case`
- BEM convention for component variants: `.listing-card__header`, `.listing-card--featured`
- Responsive breakpoints: 768px (tablet), 1024px (desktop)

---

## IMPORTANT_FILES_REFERENCED

### Shared Components
- `shared/Header.jsx` - Site navigation, auth modals
- `shared/Footer.jsx` - Site footer
- `shared/ListingCard.jsx` - Reusable listing card
- `shared/GoogleMap.jsx` - Map with listing markers
- `shared/CreateProposalFlowV2.jsx` - Proposal wizard
- `shared/ListingScheduleSelector.jsx` - Day selection UI

### Libraries
- `lib/auth.js` - Authentication utilities
- `lib/supabase.js` - Supabase client
- `lib/constants.js` - Application constants
- `lib/urlParams.js` - URL parameter helpers
- `lib/priceCalculations.js` - Pricing logic
- `lib/listingDataFetcher.js` - Listing data fetching
- `lib/dataLookups.js` - Reference data lookups

### Logic Layers
- `logic/calculators/` - Pure math functions
- `logic/rules/` - Boolean predicates
- `logic/processors/` - Data transformation
- `logic/workflows/` - Orchestration

---

**FILE_COUNT**: 30+ page components
**HOOK_COUNT**: 7 logic hooks
**SUBDIRECTORY_COUNT**: 8
**LAST_UPDATED**: 2025-12-11
