# Page Components

**GENERATED**: 2025-11-26
**ARCHITECTURE**: React Islands
**PARENT**: app/src/islands/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Page-level React components mounted by entry point JSX files
[PATTERN]: Hollow Component Pattern - UI delegates logic to custom hooks
[ARCHITECTURE]: React Islands - each page is a standalone React app

---

## ### SUBDIRECTORIES ###

### SelfListingPage/
[INTENT]: Multi-section listing creation form (TypeScript module)
[FILES]: 15+ files across components, sections, store, types, utils

### ViewSplitLeasePageComponents/
[INTENT]: Sub-components for listing detail page
[NOTE]: Check for actual files

---

## ### FILE_INVENTORY ###

### CareersPage.jsx
[INTENT]: Careers page displaying job listings and company info
[IMPORTS]: shared/Header, shared/Footer

### FAQPage.jsx
[INTENT]: FAQ page with accordion-style Q&A sections
[IMPORTS]: shared/Header, shared/Footer

### GuestProposalsPage.jsx
[INTENT]: Guest proposals dashboard (Hollow Component Pattern)
[IMPORTS]: ./useGuestProposalsPageLogic, shared/Header, modals/ProposalDetailsModal

### GuestSuccessPage.jsx
[INTENT]: Booking confirmation page for guests

### HelpCenterCategoryPage.jsx
[INTENT]: Help center category view with filtered articles
[IMPORTS]: data/helpCenterData, lib/urlParams

### HelpCenterPage.jsx
[INTENT]: Help center main page with category navigation
[IMPORTS]: data/helpCenterData, shared/Header

### HomePage.jsx
[INTENT]: Landing page with hero, value props, featured listings
[IMPORTS]: shared/Header, shared/Footer, shared/ListingCard

### HostSuccessPage.jsx
[INTENT]: Listing creation confirmation page for hosts

### ListWithUsPage.jsx
[INTENT]: Host signup/onboarding page
[IMPORTS]: shared/Header, shared/SignUpLoginModal

### NotFoundPage.jsx
[INTENT]: 404 error page with navigation options
[IMPORTS]: shared/Header, shared/Footer

### PoliciesPage.jsx
[INTENT]: Terms, privacy, and legal policies page

### SearchPage.jsx
[INTENT]: Search/browse listings page (Hollow Component Pattern)
[IMPORTS]: ./useSearchPageLogic, shared/Header, shared/ListingCard, shared/GoogleMap

### SearchPageTest.jsx
[INTENT]: Search page test variant for development

### ViewSplitLeasePage.jsx
[INTENT]: Listing detail page (Hollow Component Pattern)
[IMPORTS]: ./useViewSplitLeasePageLogic, shared/CreateProposalFlowV2, shared/GoogleMap

### ViewSplitLeasePage-old.jsx
[INTENT]: Legacy listing detail page (deprecated)

### WhySplitLeasePage.jsx
[INTENT]: Marketing page explaining Split Lease benefits

---

## ### HOOK_FILES ###

### useGuestProposalsPageLogic.js
[INTENT]: Business logic hook for GuestProposalsPage
[IMPORTS]: lib/proposalDataFetcher, lib/auth, logic/workflows/proposals/

### useSearchPageLogic.js
[INTENT]: Business logic hook for SearchPage
[IMPORTS]: lib/supabase, lib/urlParams, logic/rules/search/

### useViewSplitLeasePageLogic.js
[INTENT]: Business logic hook for ViewSplitLeasePage
[IMPORTS]: lib/listingDataFetcher, lib/auth, logic/calculators/pricing/

---

## ### HOLLOW_COMPONENT_PATTERN ###

```jsx
// Page component is "hollow" - just UI
function SearchPage() {
  const logic = useSearchPageLogic();
  return <div>{/* UI using logic.* */}</div>;
}

// All business logic in hook
function useSearchPageLogic() {
  // State, effects, handlers
  return { listings, filters, setFilter, ... };
}
```

---

**FILE_COUNT**: 17 pages + 3 hooks
**SUBDIRECTORY_COUNT**: 2
