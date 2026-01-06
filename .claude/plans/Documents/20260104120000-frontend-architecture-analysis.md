# Frontend Architecture Analysis

**Generated**: 2026-01-04
**Scope**: Component organization, hook patterns, state management, and hollow component pattern compliance
**Directory**: app/src/islands/

---

## Executive Summary

The Split Lease frontend follows an **Islands Architecture** with a **Hollow Component Pattern** for page components. The implementation is generally consistent, but there are notable variations in pattern adherence across different components.

---

## 1. Component Organization

### 1.1 Directory Structure

```
app/src/islands/
├── modals/           # 13 modal components (controlled, overlay dialogs)
├── pages/            # 30+ page components with subdirectories
│   ├── AboutUsPage/
│   ├── AccountProfilePage/
│   ├── FavoriteListingsPage/
│   ├── HostOverviewPage/
│   ├── HostProposalsPage/
│   ├── ListingDashboardPage/
│   ├── MessagingPage/
│   ├── SelfListingPage/        # TypeScript module
│   └── proposals/
├── proposals/        # Shared proposal-related presentational components
└── shared/           # 55+ reusable components and feature modules
```

### 1.2 Component Categories

| Category | Count | Pattern |
|----------|-------|---------|
| Page Components | 30+ | Islands Architecture (independent React roots) |
| Modal Components | 13 | Controlled components with isOpen/onClose |
| Shared Components | 55+ | Reusable UI primitives and feature modules |
| Logic Hooks | 12 | useXxxPageLogic pattern |

---

## 2. Hollow Component Pattern Analysis

### 2.1 Pattern Definition

The Hollow Component Pattern dictates:
- Page components contain **ONLY JSX rendering** (no business logic)
- **ALL business logic** delegated to custom hooks (`use*PageLogic.js`)
- Hooks return pre-calculated state and pre-bound event handlers

### 2.2 Compliance Assessment

#### EXCELLENT Compliance (Template Examples)

| Component | Hook | Notes |
|-----------|------|-------|
| `HostOverviewPage/HostOverviewPage.jsx` | `useHostOverviewPageLogic.js` | **Gold standard** - Well-documented, clear separation |
| `AccountProfilePage/AccountProfilePage.jsx` | `useAccountProfilePageLogic.js` | Clean separation with inline LoadingState/ErrorState components |
| `MessagingPage/MessagingPage.jsx` | `useMessagingPageLogic.js` | Excellent pattern adherence |
| `ListingDashboardPage/ListingDashboardPage.jsx` | `useListingDashboardPageLogic.js` | Well-structured |
| `HostProposalsPage/index.jsx` | `useHostProposalsPageLogic.js` | Clean implementation |

**Key Characteristics of Exemplary Components:**
- Documented architecture in file header comments
- Hook returns all state, handlers, and computed values
- Component performs only JSX conditional rendering
- Clear separation of concerns

#### PARTIAL Compliance (Has Hook but Some Embedded Logic)

| Component | Hook | Issue |
|-----------|------|-------|
| `ViewSplitLeasePage.jsx` | `useViewSplitLeasePageLogic.js` | Hook exists but page still contains ~150 lines of inline helper functions (`getInitialScheduleFromUrl`, `fetchInformationalTexts`) and embedded business logic |
| `SearchPage.jsx` | `useSearchPageLogic.js` | Hook exists but page contains inline utility functions and embedded presentation logic |

#### NO Compliance (Missing Hook - Embedded Business Logic)

| Component | Lines | Business Logic Present |
|-----------|-------|------------------------|
| `FavoriteListingsPage/FavoriteListingsPage.jsx` | 1,763 | **Critical** - Massive component with auth handling, data fetching, proposal submission, photo gallery, toast notifications all inline |
| `HomePage.jsx` | 723 | Marketing page with inline data fetching, state management, and multiple internal components |
| `SelfListingPage.jsx` | N/A | Uses TypeScript/Zustand store pattern (different architecture) |

---

## 3. Hook Patterns Analysis

### 3.1 Logic Hook Inventory

| Hook | Location | Responsibilities |
|------|----------|------------------|
| `useHostOverviewPageLogic.js` | HostOverviewPage/ | Auth, listings CRUD, house manuals, virtual meetings, modals, toasts |
| `useAccountProfilePageLogic.js` | AccountProfilePage/ | Profile data, form state, verifications, modals |
| `useListingDashboardPageLogic.js` | ListingDashboardPage/ | Single listing management, tab navigation, inline editing |
| `useHostProposalsPageLogic.js` | HostProposalsPage/ | Proposals for all host listings, filtering, actions |
| `useMessagingPageLogic.js` | MessagingPage/ | Threads, messages, realtime typing indicators |
| `useGuestProposalsPageLogic.js` | proposals/ | Guest proposal dashboard, status tracking |
| `useViewSplitLeasePageLogic.js` | pages/ | Listing details, schedule selection, pricing |
| `useSearchPageLogic.js` | pages/ | Listings search, filtering, URL sync, map |
| `useRentalApplicationPageLogic.js` | pages/ | Multi-step form, validation, file uploads |
| `useEditListingDetailsLogic.js` | shared/EditListingDetails/ | Listing edit form state and validation |
| `useNotificationSettings.js` | shared/NotificationSettingsIsland/ | User notification preferences |
| `useScheduleSelectorLogicCore.js` | shared/ | Schedule selection state machine |

### 3.2 Hook Return Pattern Consistency

**Standard Pattern (Good):**
```javascript
return {
  // Core data
  user,
  listings,
  loading,
  error,

  // UI State
  showModal,
  toasts,

  // Action handlers
  handleCreate,
  handleEdit,
  handleDelete,
};
```

**All hooks follow this pattern** - returning pre-calculated state and pre-bound handlers.

---

## 4. State Management Patterns

### 4.1 Approaches Used

| Approach | Where Used | Purpose |
|----------|------------|---------|
| React useState/useEffect | All pages and components | Local component state |
| URL Parameters | SearchPage, ViewSplitLeasePage | Filter state persistence |
| localStorage | CreateProposalFlowV2 | Draft persistence |
| Supabase Auth | Global | Authentication state |
| Zustand Store | SelfListingPage (TypeScript) | Complex form state |

### 4.2 Context Usage

**Limited Context Usage:**
- `ToastProvider` in shared Toast component
- No global application-level context
- State isolation per island (by design)

### 4.3 State Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     State Flow Pattern                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   URL Params ──┐                                                │
│                ├──> Logic Hook ──> Pre-calculated State         │
│   Supabase ────┘        │                    │                  │
│                         │                    ▼                  │
│   User Input ──────────>│          Hollow Component (JSX)       │
│                         │                    │                  │
│                         │                    ▼                  │
│                         └───── Handlers ─────────────────────   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Components Violating Hollow Pattern

### 5.1 Critical Violations

#### `FavoriteListingsPage.jsx` (1,763 lines)

**Location:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`

**Issues:**
1. **No logic hook** - All business logic embedded in component
2. **~40 state variables** defined inline
3. **Data fetching** directly in component via useEffect
4. **Proposal submission logic** (150+ lines) inline
5. **Photo gallery state** inline
6. **Multiple helper functions** defined in component
7. **Inline sub-components**: PropertyCard (370 lines), ListingsGrid, LoadingState, ErrorState

**Recommendation:** Extract `useFavoriteListingsPageLogic.js` hook and split inline sub-components.

---

#### `ViewSplitLeasePage.jsx` (Large file)

**Location:** `app/src/islands/pages/ViewSplitLeasePage.jsx`

**Issues:**
1. Hook exists (`useViewSplitLeasePageLogic.js`) but **not used**
2. ~150 lines of inline helper functions at top of file
3. `fetchInformationalTexts` async function defined inline
4. URL parameter parsing functions inline

**Recommendation:** Integrate with existing hook, move helper functions to lib/ or logic/.

---

#### `SearchPage.jsx` (Large file)

**Location:** `app/src/islands/pages/SearchPage.jsx`

**Issues:**
1. Hook exists (`useSearchPageLogic.js`) but **partially used**
2. Inline helper functions for informational texts
3. Multiple internal components defined inline

**Recommendation:** Complete migration to hook, extract inline components to files.

---

#### `HomePage.jsx` (723 lines)

**Location:** `app/src/islands/pages/HomePage.jsx`

**Issues:**
1. **No logic hook** - Static marketing page but has dynamic elements
2. Multiple internal components (Hero, ValuePropositions, ScheduleSection, etc.) defined inline
3. `FeaturedSpacesSection` has its own data fetching (~90 lines)
4. Supabase queries embedded in components

**Recommendation:** For marketing pages, inline components are acceptable. Consider extracting `FeaturedSpacesSection` to shared components.

---

### 5.2 Shared Components with Embedded Logic

| Component | Lines | Issue |
|-----------|-------|-------|
| `CreateProposalFlowV2.jsx` | 500+ | Multi-step wizard with complex state - acceptable for feature module |
| `HostEditingProposal.jsx` | 200+ | Form logic embedded - no extraction hook |
| `AiSignupMarketReport.jsx` | 400+ | Feature module - acceptable for self-contained islands |

---

## 6. Inconsistent Patterns

### 6.1 Hook Existence vs Usage

| Page | Hook Exists | Hook Used |
|------|-------------|-----------|
| ViewSplitLeasePage | Yes | **No** - logic inline |
| SearchPage | Yes | **Partial** - some logic inline |
| FavoriteListingsPage | **No** | N/A |
| HomePage | **No** | N/A |

### 6.2 Inline Sub-Component Patterns

**Pattern A (Preferred):** Separate files in page subdirectory
- `HostOverviewPage/components/HostOverviewCards.jsx`
- `AccountProfilePage/components/cards/BasicInfoCard.jsx`

**Pattern B (Discouraged):** Inline function components
- `FavoriteListingsPage`: PropertyCard, ListingsGrid defined inline
- `HomePage`: Hero, ValuePropositions, etc. defined inline

---

## 7. Functional Design Improvements

### 7.1 Immediate Refactoring Candidates

1. **FavoriteListingsPage** - Extract to hook (HIGH PRIORITY)
   - Create `useFavoriteListingsPageLogic.js`
   - Extract PropertyCard to `components/PropertyCard.jsx`
   - Move proposal submission to workflow

2. **ViewSplitLeasePage** - Complete hook integration (MEDIUM)
   - Use existing `useViewSplitLeasePageLogic.js`
   - Move URL parsing helpers to `lib/urlParams.js`

3. **SearchPage** - Complete hook integration (MEDIUM)
   - Ensure all logic in `useSearchPageLogic.js`
   - Extract inline utilities

### 7.2 Architectural Recommendations

1. **Enforce Hook Pattern for All Dynamic Pages**
   - Every page with state should have a corresponding `use*PageLogic.js`
   - Static marketing pages (FAQ, Careers, etc.) are exempt

2. **Standardize Sub-Component Extraction**
   - Components over 100 lines should be in separate files
   - Use page subdirectory pattern: `PageName/components/`

3. **Move Reusable Logic to logic/ Directory**
   - URL parsing functions to `lib/urlParams.js`
   - Proposal submission to `logic/workflows/proposals/`
   - Price calculations to `logic/calculators/pricing/`

4. **Document Pattern Expectations**
   - Add ESLint rules to detect useState in page components
   - Require hook usage for pages over threshold

---

## 8. Key File References

### Exemplary Implementations (Study These)

| File | Purpose |
|------|---------|
| `app/src/islands/pages/HostOverviewPage/HostOverviewPage.jsx` | Gold standard hollow component |
| `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js` | Complete logic hook example |
| `app/src/islands/pages/MessagingPage/MessagingPage.jsx` | Clean minimal page component |
| `app/src/islands/pages/AccountProfilePage/AccountProfilePage.jsx` | Well-organized with sub-components |

### Refactoring Targets (Fix These)

| File | Issue |
|------|-------|
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | 1,763 lines, no hook |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Hook exists but not used |
| `app/src/islands/pages/SearchPage.jsx` | Hook exists but partially used |
| `app/src/islands/pages/HomePage.jsx` | Marketing page with embedded data fetching |

---

## 9. Metrics Summary

| Metric | Count |
|--------|-------|
| Total Page Components | 30+ |
| Pages with Logic Hooks | 12 |
| Pages Correctly Using Hooks | 8 |
| Pages with Hooks but Not Using | 2 |
| Pages Missing Hooks (Should Have) | 2 |
| Static/Marketing Pages (Exempt) | 18+ |
| Shared Components | 55+ |
| Shared Components with Hooks | 4 |

---

## 10. Conclusion

The frontend architecture is well-designed with clear patterns documented. The **Hollow Component Pattern** is exemplary in components like `HostOverviewPage` and `MessagingPage`. However, some key pages (`FavoriteListingsPage`, `ViewSplitLeasePage`) deviate significantly.

**Priority Actions:**
1. Refactor `FavoriteListingsPage` to extract hook (1,763 lines is critical)
2. Connect `ViewSplitLeasePage` to its existing hook
3. Complete `SearchPage` hook migration
4. Document and enforce pattern requirements

---

**Document Version**: 1.0
**Author**: Claude Code Architecture Analysis
