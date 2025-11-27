# Islands - React Component Architecture

**GENERATED**: 2025-11-26
**ARCHITECTURE**: React Islands
**PARENT**: app/src/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: React component library following Islands Architecture
[PATTERN]: Independent React apps mounted to HTML pages
[BENEFIT]: Progressive enhancement, smaller bundles, faster initial load

---

## ### SUBDIRECTORIES ###

### modals/
[INTENT]: Overlay dialog components for focused interactions
[FILES]: 8 modal components
[EXAMPLES]: ProposalDetailsModal, MapModal, EditProposalModal

### pages/
[INTENT]: Page-level components mounted by entry points
[FILES]: 17 page components + 3 logic hooks
[PATTERN]: Hollow Component Pattern (UI + hook separation)
[SUBDIRS]: SelfListingPage/ (TypeScript module)

### proposals/
[INTENT]: Proposal-specific presentational components
[FILES]: 7 components
[EXAMPLES]: ProposalCard, ProgressTracker, EmptyState

### shared/
[INTENT]: Reusable components shared across pages
[FILES]: 30+ components and hooks
[SUBDIRS]: 8 component modules
[EXAMPLES]: Header, Footer, Button, ListingScheduleSelector

---

## ### ISLANDS_ARCHITECTURE ###

```
HTML Page (static)
    │
    ├── Static content (SEO-friendly)
    │
    └── <div id="root">
            │
            ▼
        React Island (dynamic)
        └── Page Component
            └── Shared Components
```

---

## ### COMPONENT_PATTERNS ###

### Hollow Component
[DESCRIPTION]: UI component delegates all logic to custom hook
[EXAMPLE]: SearchPage.jsx + useSearchPageLogic.js
[BENEFIT]: Testable logic, reusable UI

### Modal Component
[DESCRIPTION]: Overlay with header, body, footer structure
[PATTERN]: Controlled by parent isOpen state
[CALLBACKS]: onClose, onConfirm passed as props

### Form Section
[DESCRIPTION]: Wizard step handling one form aspect
[PATTERN]: Receives value/onChange, calls onNext/onBack
[EXAMPLE]: SelfListingPage/sections/

---

## ### IMPORT_CONVENTIONS ###

[PAGES]: import { HomePage } from 'islands/pages/HomePage'
[SHARED]: import { Button } from 'islands/shared/Button'
[MODALS]: import { MapModal } from 'islands/modals/MapModal'

---

**SUBDIRECTORY_COUNT**: 4
**TOTAL_FILES**: 60+
