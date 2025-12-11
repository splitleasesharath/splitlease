# Hollow Component Pattern Violations Analysis

**Generated**: 2025-12-11
**Scope**: `app/src/islands/pages/` - Page components analysis

---

## Summary

| Status | Count | Pages |
|--------|-------|-------|
| **Compliant** | 6 | GuestProposalsPage, HostProposalsPage, ListingDashboardPage, HostOverviewPage, RentalApplicationPage, NotFoundPage, InternalTestPage |
| **Violations** | 17+ | See detailed list below |

---

## Pattern Definition

The **Hollow Component Pattern** requires:
- Page components contain **NO logic** (no useState, useEffect, useMemo, useCallback, useRef)
- **ALL logic** delegated to `useXxxPageLogic` hooks
- Components contain **only pure rendering**

---

## Compliant Pages (Following Hollow Component Pattern)

### 1. GuestProposalsPage.jsx
- **Hook**: `proposals/useGuestProposalsPageLogic.js`
- **Status**: FULLY COMPLIANT
- **Notes**: Zero hooks in component, all logic delegated

### 2. HostProposalsPage/index.jsx
- **Hook**: `HostProposalsPage/useHostProposalsPageLogic.js`
- **Status**: FULLY COMPLIANT
- **Notes**: Zero hooks in component, all logic delegated

### 3. ListingDashboardPage/ListingDashboardPage.jsx
- **Hook**: `ListingDashboardPage/useListingDashboardPageLogic.js`
- **Status**: FULLY COMPLIANT
- **Notes**: Zero hooks in component, all logic delegated

### 4. HostOverviewPage/HostOverviewPage.jsx
- **Hook**: `HostOverviewPage/useHostOverviewPageLogic.js`
- **Status**: FULLY COMPLIANT
- **Notes**: Zero hooks in component, all logic delegated

### 5. RentalApplicationPage.jsx
- **Hook**: `useRentalApplicationPageLogic.js`
- **Status**: FULLY COMPLIANT
- **Notes**: Zero hooks in component, all logic delegated

### 6. NotFoundPage.jsx
- **Hook**: None needed (static content)
- **Status**: COMPLIANT (appropriately static)
- **Notes**: Pure rendering with no dynamic state

### 7. InternalTestPage.jsx
- **Hook**: None needed (development utility)
- **Status**: COMPLIANT (appropriately static)
- **Notes**: Simple test page with no business logic

---

## Violating Pages (Hooks Used Directly in Component)

### 1. FAQPage.jsx
**Severity**: HIGH - Complex logic embedded in component

| Line | Violation Type | Details |
|------|---------------|---------|
| 8 | useState | `activeTab` state |
| 9 | useState | `faqs` state object |
| 10 | useState | `loading` state |
| 11 | useState | `error` state |
| 12 | useState | `openQuestionId` state |
| 13 | useState | `showInquiryModal` state |
| 14 | useState | `inquiryForm` state object |
| 15 | useState | `submitting` state |
| 16 | useState | `submitSuccess` state |
| 17 | useState | `submitError` state |
| 19 | useEffect | URL parsing and FAQ loading |
| 319 | useState | `activeAccordion` state |
| 322 | useEffect | Scroll after load |

**Business Logic in Component**:
- `loadFAQs()` function (lines 48-91) - API fetching
- `handleTabClick()` (line 93) - Tab switching
- `handleInquirySubmit()` (line 97) - Form submission
- URL parameter parsing logic (lines 21-43)

---

### 2. PoliciesPage.jsx
**Severity**: HIGH - Complex logic embedded in component

| Line | Violation Type | Details |
|------|---------------|---------|
| 35 | useState | `policies` state |
| 36 | useState | `currentPolicy` state |
| 37 | useState | `loading` state |
| 38 | useState | `error` state |
| 39 | useState | `showBackToTop` state |
| 42 | useEffect | Policy fetching |
| 90 | useEffect | URL parameter handling |
| 106 | useEffect | Scroll handler |
| 116 | useEffect | Hash change listener |

**Business Logic in Component**:
- Policy fetching from Supabase
- URL parameter and hash handling
- Scroll-to-top logic

---

### 3. HomePage.jsx
**Severity**: MEDIUM - Multiple hooks and logic

| Line | Violation Type | Details |
|------|---------------|---------|
| 167 | useEffect | Featured listings scroll |
| 525 | useState | `isAIResearchModalOpen` state |
| 526 | useState | `selectedDays` state |
| 527 | useState | `isLoggedIn` state |
| 530 | useState | `RecoveryComponent` state |
| 534 | useEffect | Popup recovery handler |
| 564 | useEffect | Auth status check |
| 573 | useEffect | Days selection persistence |

---

### 4. SearchPage.jsx
**Severity**: CRITICAL - Massive logic in component

| Line | Violation Type | Details |
|------|---------------|---------|
| 160 | useRef | `inputRef` |
| 363 | useState | `currentImageIndex` state |
| 364 | useRef | `priceInfoTriggerRef` |
| 638 | useRef | `sentinelRef` |
| 640 | useEffect | Intersection observer |
| 768-823 | useState | 23+ state variables |
| 826-1849 | useEffect | 15+ useEffect hooks |
| 1179 | useCallback | `fetchListings` |
| 1440 | useCallback | `fetchAllListings` |
| 1702 | useCallback | `handleLoadMore` |
| 1739 | useCallback | `handleFallbackLoadMore` |

**Notes**: Has `useSearchPageLogic.js` hook file but the page component still contains massive amounts of state and logic. This appears to be a partial refactor.

---

### 5. SearchPageTest.jsx
**Severity**: CRITICAL - Same issues as SearchPage

Similar pattern of violations with 25+ useState calls and 10+ useEffect hooks.

---

### 6. ViewSplitLeasePage.jsx
**Severity**: CRITICAL - Massive logic in component

| Line | Violation Type | Details |
|------|---------------|---------|
| 593-614 | useState | 22+ state variables |
| 625 | useMemo | `minMoveInDate` calculation |
| 637 | useCallback | `calculateSmartMoveInDate` |
| 666-936 | useEffect | 8+ useEffect hooks |
| 880 | useMemo | `scheduleSelectorListing` |
| 936 | useMemo | `mapListings` |
| 974 | useCallback | `handlePriceChange` |

**Notes**: Has `useViewSplitLeasePageLogic.js` hook file but the page component still contains substantial logic. Partial refactor.

---

### 7. PreviewSplitLeasePage.jsx
**Severity**: HIGH - Similar to ViewSplitLeasePage

| Line | Violation Type | Details |
|------|---------------|---------|
| 538-583 | useState | 15+ state variables |
| 555 | useMemo | `minMoveInDate` calculation |
| 589-759 | useEffect | 5+ useEffect hooks |
| 683 | useMemo | `scheduleSelectorListing` |
| 733 | useMemo | `mapListings` |
| 759 | useCallback | `handlePriceChange` |

---

### 8. FavoriteListingsPage/FavoriteListingsPage.jsx
**Severity**: CRITICAL - No logic hook exists

| Line | Violation Type | Details |
|------|---------------|---------|
| 58-59 | useState/useRef | PropertyCard component |
| 422-452 | useState | 15+ state variables |
| 455 | useCallback | `transformListing` |
| 521-785 | useEffect | 5+ useEffect hooks |

**Notes**: No `useFavoriteListingsPageLogic.js` hook exists. All logic is in component.

---

### 9. HelpCenterPage.jsx
**Severity**: MEDIUM - Logic embedded in component

| Line | Violation Type | Details |
|------|---------------|---------|
| 19-28 | useState | 10 state variables |
| 30 | useEffect | Search/inquiry handling |

---

### 10. HelpCenterCategoryPage.jsx
**Severity**: MEDIUM - Logic embedded in component

| Line | Violation Type | Details |
|------|---------------|---------|
| 20-22 | useState | `category`, `articles`, `loading` state |
| 24 | useEffect | Category and article fetching |

---

### 11. CareersPage.jsx
**Severity**: MEDIUM - External script logic

| Line | Violation Type | Details |
|------|---------------|---------|
| 7-8 | useState | `typeformModalActive`, `gameModalActive` |
| 9 | useRef | `typeformContainerRef` |
| 12 | useEffect | Typeform script loading |
| 19 | useEffect | Modal escape handler |
| 26 | useEffect | Game modal escape handler |
| 73 | useEffect | Document title |

---

### 12. ResetPasswordPage.jsx
**Severity**: MEDIUM - Auth flow logic

| Line | Violation Type | Details |
|------|---------------|---------|
| 55-62 | useState | 8 state variables |
| 64 | useEffect | Supabase auth state subscription |

---

### 13. WhySplitLeasePage.jsx
**Severity**: HIGH - Complex logic embedded

| Line | Violation Type | Details |
|------|---------------|---------|
| 12-24 | useState | 8+ state variables |
| 17-18 | useRef/useState | `selectedDaysRef`, `selectedDays` |
| 38 | useEffect | Boroughs fetching |
| 73 | useCallback | `fetchFeaturedListings` |
| 184-189 | useEffect | 2 effect hooks |

---

### 14. GuestSuccessPage.jsx
**Severity**: LOW - Animation logic

| Line | Violation Type | Details |
|------|---------------|---------|
| 42-43 | useState/useRef | `isVisible`, `cardRef` |
| 45 | useEffect | Intersection observer for animation |
| 153 | useEffect | Scroll-triggered visibility |

---

### 15. HostSuccessPage.jsx
**Severity**: LOW - Animation logic

| Line | Violation Type | Details |
|------|---------------|---------|
| 40-41 | useState/useRef | `isVisible`, `cardRef` |
| 43 | useEffect | Intersection observer |
| 130 | useEffect | Scroll-triggered visibility |

---

### 16. AboutUsPage/AboutUsPage.jsx
**Severity**: MEDIUM - Data fetching logic

| Line | Violation Type | Details |
|------|---------------|---------|
| 24 | useState | TeamMember component: `imageError` |
| 66-68 | useState | `teamMembers`, `isLoading`, `error` |
| 70 | useEffect | Team members fetching |

---

### 17. ListWithUsPage.jsx
**Severity**: LOW - Modal state

| Line | Violation Type | Details |
|------|---------------|---------|
| 9-11 | useState | `showCreateListingModal`, `showImportListingModal`, `isImporting` |

---

## Sub-Component Violations (Not Page-Level, but Notable)

These are reusable components within pages that also have hooks (expected for shared components):

### FavoriteListingsPage/components/
- **SplitScheduleSelector.jsx**: Lines 18-23 (useState/useEffect)
- **MapView.jsx**: Lines 15-64 (useRef/useState/useEffect)
- **ListingCard.jsx**: Lines 22-23 (useState)
- **FavoriteButton.jsx**: Line 15 (useState)

### ListingDashboardPage/components/
- **AvailabilitySection.jsx**: Lines 54-225 (extensive state/memos)
- **PricingEditSection.jsx**: Lines 50-196 (15+ useState)
- **PhotosSection.jsx**: Lines 79-80 (useState)
- **SecondaryActions.jsx**: Lines 53-77 (useState/useRef/useEffect)
- **NavigationHeader.jsx**: Line 1 (useState)

### HostProposalsPage/
- **ProposalDetailsModal.jsx**: Lines 35-37 (useState)

### proposals/
- **ProposalCard.jsx**: Lines 600-660 (useState/useMemo)
- **VirtualMeetingsSection.jsx**: Lines 426-431 (useState/useMemo)

### HostOverviewPage/components/
- **HostOverviewToast.jsx**: Lines 19-22 (useState/useEffect)
- **HostOverviewModals.jsx**: Lines 18-30 (useEffect)

---

## Recommendations

### Priority 1: Critical (Heavy Logic Violations)
1. **SearchPage.jsx** - Extract all useState/useEffect to `useSearchPageLogic.js` (hook exists, needs completion)
2. **ViewSplitLeasePage.jsx** - Extract all useState/useEffect to `useViewSplitLeasePageLogic.js` (hook exists, needs completion)
3. **FavoriteListingsPage.jsx** - Create new `useFavoriteListingsPageLogic.js` hook

### Priority 2: High
4. **FAQPage.jsx** - Create `useFAQPageLogic.js` hook
5. **PoliciesPage.jsx** - Create `usePoliciesPageLogic.js` hook
6. **WhySplitLeasePage.jsx** - Create `useWhySplitLeasePageLogic.js` hook
7. **PreviewSplitLeasePage.jsx** - Create `usePreviewSplitLeasePageLogic.js` hook

### Priority 3: Medium
8. **HomePage.jsx** - Create `useHomePageLogic.js` hook
9. **HelpCenterPage.jsx** - Create `useHelpCenterPageLogic.js` hook
10. **HelpCenterCategoryPage.jsx** - Create `useHelpCenterCategoryPageLogic.js` hook
11. **CareersPage.jsx** - Create `useCareersPageLogic.js` hook
12. **ResetPasswordPage.jsx** - Create `useResetPasswordPageLogic.js` hook
13. **AboutUsPage.jsx** - Create `useAboutUsPageLogic.js` hook

### Priority 4: Low
14. **ListWithUsPage.jsx** - Consider extracting modal state
15. **GuestSuccessPage.jsx** - Animation logic could stay (UI concern)
16. **HostSuccessPage.jsx** - Animation logic could stay (UI concern)

---

## Existing Hooks Status

| Hook File | Page | Status |
|-----------|------|--------|
| `useSearchPageLogic.js` | SearchPage | Exists but incomplete (page still has hooks) |
| `useViewSplitLeasePageLogic.js` | ViewSplitLeasePage | Exists but incomplete (page still has hooks) |
| `useGuestProposalsPageLogic.js` | GuestProposalsPage | Complete |
| `useHostProposalsPageLogic.js` | HostProposalsPage | Complete |
| `useListingDashboardPageLogic.js` | ListingDashboardPage | Complete |
| `useHostOverviewPageLogic.js` | HostOverviewPage | Complete |
| `useRentalApplicationPageLogic.js` | RentalApplicationPage | Complete |
| `useFavoriteListingsPageLogic.js` | FavoriteListingsPage | **MISSING** |
| `useFAQPageLogic.js` | FAQPage | **MISSING** |
| `usePoliciesPageLogic.js` | PoliciesPage | **MISSING** |
| `useHomePageLogic.js` | HomePage | **MISSING** |
| `useWhySplitLeasePageLogic.js` | WhySplitLeasePage | **MISSING** |
| `useHelpCenterPageLogic.js` | HelpCenterPage | **MISSING** |
| `useResetPasswordPageLogic.js` | ResetPasswordPage | **MISSING** |

---

## Metrics Summary

- **Total Page Components**: 23 main pages
- **Fully Compliant**: 6 pages (26%)
- **Minor Violations**: 3 pages (13%)
- **Major Violations**: 14 pages (61%)
- **Missing Logic Hooks**: 9 hooks needed
- **Incomplete Logic Hooks**: 2 hooks need completion

---

**Document Version**: 1.0
**Author**: Claude Code Analysis
