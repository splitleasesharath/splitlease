# Islands - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: React component library using Islands Architecture pattern
**OPTIMIZATION**: Semantic Searchability + Digestibility

---

## QUICK_STATS

[TOTAL_FILES]: 186
[TOTAL_DIRECTORIES]: 4 primary (modals, pages, proposals, shared)
[PRIMARY_LANGUAGE]: JavaScript (JSX), TypeScript (TSX)
[KEY_PATTERNS]: Islands Architecture, Hollow Component Pattern, Modal Components, Multi-Step Forms

---

## ARCHITECTURE_OVERVIEW

[CONCEPT]: Islands Architecture - Independent React apps mounted to static HTML pages
[BENEFIT]: Progressive enhancement, smaller JavaScript bundles, faster initial page load
[MOUNT_PATTERN]: Each entry point (src/*.jsx) creates React root and mounts single island component
[HYDRATION]: React islands hydrate specific DOM nodes, rest of page remains static HTML

```
Static HTML Page (SEO-friendly)
    │
    ├── Static content (navbar, footer, SEO metadata)
    │
    └── <div id="root">
            │
            ▼
        React Island (interactive)
        └── Page Component (HomePage, SearchPage, etc.)
            └── Shared Components (Header, Footer, Modals)
```

---

## DIRECTORIES

### modals/
[INTENT]: Overlay dialog components for focused user interactions
[TOTAL_FILES]: 13 modal components
[PATTERN]: Controlled components (isOpen state managed by parent)
[STRUCTURE]: Header + Body + Footer sections with onClose/onConfirm callbacks
[KEY_FILES]: ProposalDetailsModal, MapModal, EditProposalModal, VirtualMeetingModal, CancelProposalModal, CompareTermsModal, HostProfileModal, GuestEditingProposalModal, NotificationSettingsModal, EditPhoneNumberModal, ProposalSuccessModal
[USAGE]: Imported by pages or shared components for overlay interactions

### pages/
[INTENT]: Page-level components mounted by entry point files
[TOTAL_FILES]: 23 page files + 8 subdirectories with nested components
[PATTERN]: Hollow Component Pattern (UI component delegates ALL logic to custom hook)
[SUBDIRS]: AboutUsPage/, FavoriteListingsPage/, HostOverviewPage/, HostProposalsPage/, ListingDashboardPage/, SelfListingPage/ (TypeScript), SelfListingPageV2/, ViewSplitLeasePageComponents/
[KEY_FILES]: HomePage, SearchPage, ViewSplitLeasePage, GuestProposalsPage, SelfListingPage, ListWithUsPage, FAQPage, HelpCenterPage, NotFoundPage, HostProposalsPage, ListingDashboardPage, AccountProfilePage, RentalApplicationPage
[HOOKS]: useSearchPageLogic.js, useViewSplitLeasePageLogic.js, useGuestProposalsPageLogic.js
[NOTE]: Each subdirectory may have its own CLAUDE.md for detailed documentation

### proposals/
[INTENT]: Proposal-specific presentational components for guest dashboard
[TOTAL_FILES]: 7 components (per subdirectory CLAUDE.md)
[PATTERN]: Stateless presentational components receiving processed data from parent
[KEY_FILES]: ProposalCard, ProposalSelector, ProgressTracker, EmptyState, ErrorState, LoadingState, VirtualMeetingsSection
[PARENT_PAGE]: GuestProposalsPage
[NOTE]: See proposals/CLAUDE.md for detailed component inventory

### shared/
[INTENT]: Reusable components and utilities shared across multiple pages
[TOTAL_FILES]: 19 top-level files + 15 subdirectories with nested components
[PATTERN]: Composition-based, reusable UI components and complex feature modules
[KEY_COMPONENTS]: Header, Footer, Button, GoogleMap, ListingScheduleSelector, CreateProposalFlowV2, DayButton, PriceDisplay, Toast, InformationalText, SearchScheduleSelector, AuthAwareSearchScheduleSelector, ContactHostMessaging, ExternalReviews, ErrorOverlay
[KEY_SUBDIRS]: LoggedInAvatar/, FavoriteButton/, ListingCard/, HostScheduleSelector/, VirtualMeetingManager/, CreateProposalFlowV2Components/, SubmitListingPhotos/, ImportListingModal/, ImportListingReviewsModal/, AIImportAssistantModal/, CreateDuplicateListingModal/, ScheduleCohost/, EditListingDetails/, AiSignupMarketReport/
[NOTE]: Each subdirectory contains a focused feature module with multiple related components

---

## COMPONENT_PATTERNS

### Hollow Component Pattern
[DESCRIPTION]: UI component is "hollow" - contains ONLY JSX rendering, no business logic
[IMPLEMENTATION]: Component delegates ALL state, effects, and handlers to custom hook
[HOOK_NAMING]: useXxxPageLogic (e.g., useSearchPageLogic, useViewSplitLeasePageLogic)
[BENEFIT]: Testable logic separation, reusable UI, clear separation of concerns
[EXAMPLE_FILES]: SearchPage.jsx + useSearchPageLogic.js, ViewSplitLeasePage.jsx + useViewSplitLeasePageLogic.js, GuestProposalsPage.jsx + useGuestProposalsPageLogic.js

```jsx
// Hollow Component (UI only)
export default function SearchPage() {
  const {
    listings,
    filters,
    isLoading,
    handleFilterChange,
    handleListingClick
  } = useSearchPageLogic();

  return <div>{/* Pure rendering - no business logic */}</div>;
}

// Custom Hook (logic only)
export function useSearchPageLogic() {
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState({});
  // ... all state, effects, handlers
  return { listings, filters, handleFilterChange, ... };
}
```

### Modal Component Pattern
[DESCRIPTION]: Overlay dialog with standardized structure and interaction model
[STRUCTURE]: Header (title + close button) + Body (content) + Footer (action buttons)
[CONTROL]: Parent component controls isOpen state, passes callbacks for user actions
[CALLBACKS]: onClose (cancel/dismiss), onConfirm (primary action), other action-specific callbacks
[BACKDROP]: Click outside or ESC key triggers onClose
[EXAMPLE_FILES]: ProposalDetailsModal, MapModal, VirtualMeetingModal, CancelProposalModal

```jsx
<ProposalDetailsModal
  isOpen={showModal}
  proposal={selectedProposal}
  onClose={() => setShowModal(false)}
  onAccept={(proposal) => handleAccept(proposal)}
  onCancel={(proposalId) => handleCancel(proposalId)}
/>
```

### Multi-Step Form Pattern
[DESCRIPTION]: Wizard-style form broken into sections with navigation and draft persistence
[IMPLEMENTATION]: Section components handle one aspect of form, parent coordinates navigation
[SECTIONS]: Each section receives value/onChange, calls onNext/onBack for navigation
[VALIDATION]: Section validates before allowing onNext
[PERSISTENCE]: Form state auto-saved to localStorage between sessions
[EXAMPLE_FILES]: SelfListingPage (7 sections: Space Snapshot → Features → Lease Styles → Pricing → Rules → Photos → Review)

```jsx
<Section1SpaceSnapshot
  value={formData.section1}
  onChange={(data) => updateSection('section1', data)}
  onNext={() => goToSection(2)}
/>
```

### Feature Module Pattern
[DESCRIPTION]: Subdirectory containing multiple related components for a single feature
[STRUCTURE]: Main component + sub-components + styles + types (if TypeScript)
[ENCAPSULATION]: All related UI logic, components, and utilities in one directory
[EXPORT]: Main component exported via index file or directly
[EXAMPLE_FILES]: VirtualMeetingManager/, LoggedInAvatar/, HostScheduleSelector/, CreateProposalFlowV2Components/

---

## IMPORT_CONVENTIONS

[PAGES]: import HomePage from 'islands/pages/HomePage'
[SHARED]: import { Button } from 'islands/shared/Button'
[MODALS]: import { ProposalDetailsModal } from 'islands/modals/ProposalDetailsModal'
[PROPOSALS]: import { ProposalCard } from 'islands/proposals/ProposalCard'
[FEATURE_MODULES]: import { LoggedInAvatar } from 'islands/shared/LoggedInAvatar/LoggedInAvatar'

---

## KEY_COMPONENT_DETAILS

### Header.jsx
[PURPOSE]: Site-wide navigation bar with authentication state awareness
[FEATURES]: Logo, nav links, auth buttons (login/signup when logged out, avatar when logged in)
[MODALS]: Contains SignUpLoginModal for inline authentication
[AUTH_STATE]: Reads from auth.js, displays user type (Host/Guest)

### Footer.jsx
[PURPOSE]: Site-wide footer with links and company information
[SECTIONS]: Navigation links, social media, legal/policy links, copyright

### CreateProposalFlowV2.jsx
[PURPOSE]: Multi-step wizard for guests to submit booking proposals
[SECTIONS]: Review listing → User details → Move-in date → Days selection
[PARENT]: ViewSplitLeasePage (listing detail page)
[CALLBACK]: onSubmit(proposalData) when wizard completes
[DEPENDENCIES]: CreateProposalFlowV2Components/ for section components

### ListingScheduleSelector.jsx
[PURPOSE]: Day selection UI with pricing display for listing creation/editing
[FEATURES]: Clickable day buttons, nightly rate calculation by frequency, visual feedback
[PATTERN]: Controlled component (selectedDays + onDaysChange)
[USED_BY]: SelfListingPage, ListingDashboardPage

### GoogleMap.jsx
[PURPOSE]: Google Maps integration for displaying listings on map
[FEATURES]: Markers for listings, info windows on click, borough-based centering
[API]: Google Maps JavaScript API
[USED_BY]: SearchPage, ViewSplitLeasePage

### LoggedInAvatar/ (Feature Module)
[PURPOSE]: User avatar dropdown with account menu
[FEATURES]: Profile photo, user type badge, dropdown menu (Dashboard, Account, Logout)
[AUTH_AWARE]: Shows different menu items for Host vs Guest
[USED_BY]: Header component

### VirtualMeetingManager/ (Feature Module)
[PURPOSE]: Complete virtual meeting scheduling and management system
[COMPONENTS]: BookVirtualMeeting, BookTimeSlot, RespondToVMRequest, CancelVirtualMeetings, DetailsOfProposalAndVM
[FEATURES]: Book meeting, propose times, accept/reject slots, cancel meetings, view meeting details
[USED_BY]: GuestProposalsPage, HostProposalsPage

### HostScheduleSelector/ (Feature Module)
[PURPOSE]: Day selection and pricing UI specifically for host listing management
[COMPONENTS]: HostScheduleSelector, SimpleHostScheduleSelector
[FEATURES]: Multi-day selection, nightly pricing by frequency, schedule pattern presets
[USED_BY]: SelfListingPage, ListingDashboardPage

---

## PAGE_COMPONENT_CATEGORIES

### Landing & Marketing
[FILES]: HomePage, ListWithUsPage, WhySplitLeasePage, AboutUsPage, CareersPage
[PURPOSE]: Public-facing pages for user acquisition and information

### Search & Discovery
[FILES]: SearchPage, ViewSplitLeasePage, FavoriteListingsPage
[PURPOSE]: Browse listings, view details, manage favorites

### Proposals & Bookings
[FILES]: GuestProposalsPage, HostProposalsPage, RentalApplicationPage
[PURPOSE]: Manage booking proposals from guest and host perspectives

### Listing Management
[FILES]: SelfListingPage, SelfListingPageV2, ListingDashboardPage, PreviewSplitLeasePage
[PURPOSE]: Create, edit, and manage property listings (host-only)

### User Account
[FILES]: AccountProfilePage, HostOverviewPage
[PURPOSE]: User profile management and dashboard

### Help & Support
[FILES]: FAQPage, HelpCenterPage, HelpCenterCategoryPage, PoliciesPage
[PURPOSE]: Documentation, policies, and user assistance

### Utility Pages
[FILES]: NotFoundPage, GuestSuccessPage, HostSuccessPage, InternalTestPage
[PURPOSE]: Error handling, success confirmations, testing

---

## TYPESCRIPT_COMPONENTS

[FILES]: SelfListingPage/ (complete TypeScript module with 15+ files)
[STRUCTURE]: sections/, components/, store/, types/, utils/
[STORE]: Zustand-based state management (useListingStore)
[TYPES]: listing.types.ts for type definitions
[SERVICES]: neighborhoodService.ts, amenitiesService.ts, safetyService.ts
[SECTIONS]: 7 section components for multi-step listing creation form

---

## STYLING_CONVENTIONS

[PATTERN]: Co-located CSS files with components (Component.jsx + Component.css)
[NAMING]: kebab-case for CSS classes (.proposal-card, .btn-primary)
[VARIABLES]: Use CSS custom properties from src/styles/variables.css
[RESPONSIVE]: Mobile-first approach using media queries
[SCOPING]: CSS Modules pattern where applicable to prevent conflicts

---

## RELATED_DOCUMENTATION

[PAGES_DETAIL]: islands/pages/CLAUDE.md (page component inventory)
[PROPOSALS_DETAIL]: islands/proposals/CLAUDE.md (proposal component inventory)
[MODALS_DETAIL]: (not yet created - would contain modal component inventory)
[SHARED_DETAIL]: (not yet created - would contain shared component inventory)
[PARENT_CONTEXT]: app/src/CLAUDE.md (source directory overview)
[APP_GUIDE]: app/CLAUDE.md (complete frontend architecture guide)

---

**VERSION**: 2.0
**UPDATED**: 2025-12-11
