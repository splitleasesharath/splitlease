# Source Directory - React Application

**GENERATED**: 2025-11-26
**PARENT**: app/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Main source code for React Islands frontend application
[ARCHITECTURE]: React 18 + Vite Islands Architecture
[PATTERN]: Entry points mount React components to HTML pages

---

## ### SUBDIRECTORIES ###

### data/
[INTENT]: Static content data (help center articles)
[FILES]: 1 data module
[KEY_EXPORTS]: helpCenterData

### islands/
[INTENT]: React component library following Islands Architecture
[SUBDIRS]: modals/, pages/, proposals/, shared/
[FILES]: 60+ components
[PATTERN]: Hollow Component Pattern for pages

### lib/
[INTENT]: Utility modules, API clients, shared infrastructure
[SUBDIRS]: constants/, scheduleSelector/
[FILES]: 20+ utility modules
[KEY_EXPORTS]: auth, supabase, bubbleAPI, dataLookups

### logic/
[INTENT]: Four-layer business logic architecture
[SUBDIRS]: calculators/, rules/, processors/, workflows/
[FILES]: 51 logic modules
[PATTERN]: Calculators → Rules → Processors → Workflows

### routes/
[INTENT]: Route definitions (if any)

### styles/
[INTENT]: Global and component CSS
[SUBDIRS]: components/
[FILES]: 12+ CSS files
[KEY_FILE]: variables.css (CSS custom properties)

---

## ### ENTRY_POINT_FILES ###

[PATTERN]: Each *.jsx file mounts a page component to an HTML file

### 404.jsx → NotFoundPage
### account-profile.jsx → AccountProfilePage
### careers.jsx → CareersPage
### faq.jsx → FAQPage
### guest-proposals.jsx → GuestProposalsPage
### guest-success.jsx → GuestSuccessPage
### help-center.jsx → HelpCenterPage
### help-center-category.jsx → HelpCenterCategoryPage
### host-success.jsx → HostSuccessPage
### list-with-us.jsx → ListWithUsPage
### listing-schedule-selector.jsx → ListingScheduleSelector (standalone)
### logged-in-avatar-demo.jsx → LoggedInAvatar demo
### main.jsx → HomePage (landing page)
### policies.jsx → PoliciesPage
### search.jsx → SearchPage
### search-test.jsx → SearchPageTest
### self-listing.jsx → SelfListingPage
### view-split-lease.jsx → ViewSplitLeasePage
### why-split-lease.jsx → WhySplitLeasePage

---

## ### ENTRY_POINT_PATTERN ###

```jsx
// src/search.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import SearchPage from './islands/pages/SearchPage';

const root = createRoot(document.getElementById('root'));
root.render(<SearchPage />);
```

---

## ### IMPORT_ALIASES ###

[FROM_ROOT]: import { ... } from 'logic/calculators/pricing/...'
[FROM_ROOT]: import { ... } from 'lib/auth'
[FROM_ROOT]: import { ... } from 'islands/shared/Button'

---

## ### KEY_PATTERNS ###

### Hollow Component
[DESCRIPTION]: Page component delegates logic to useXxxPageLogic hook
[BENEFIT]: Testable logic, focused UI

### Four-Layer Logic
[DESCRIPTION]: Business logic separated into calculators, rules, processors, workflows
[BENEFIT]: Reusable, testable, maintainable

### Day Indexing
[CRITICAL]: Convert days at API boundaries
[JS_FORMAT]: 0-6 (Sunday-Saturday)
[BUBBLE_FORMAT]: 1-7 (Sunday-Saturday)

---

**SUBDIRECTORY_COUNT**: 6
**ENTRY_POINT_COUNT**: 19
**TOTAL_FILES**: 100+
