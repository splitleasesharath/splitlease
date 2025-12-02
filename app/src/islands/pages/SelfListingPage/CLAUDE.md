# SelfListingPage Module

**GENERATED**: 2025-11-26
**ARCHITECTURE**: React Islands (TypeScript)
**PARENT**: app/src/islands/pages/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Multi-section listing creation form for hosts
[PATTERN]: Wizard-style form with 7 sections and draft saving
[LANGUAGE]: TypeScript

---

## ### SUBDIRECTORIES ###

### components/
[INTENT]: Reusable UI components specific to listing form
[FILES]: 1 component (NightlyPriceSlider)

### sections/
[INTENT]: Form sections for each step of listing creation
[FILES]: 7 section components (Section1-Section7)

### store/
[INTENT]: Zustand state management for form data
[PATTERN]: Centralized store with localStorage persistence

### styles/
[INTENT]: CSS styles for listing page
[FILES]: 1 CSS file

### types/
[INTENT]: TypeScript type definitions
[FILES]: 1 types file (listing.types.ts)

### utils/
[INTENT]: Service modules for fetching lookup data
[FILES]: 2 service modules (amenities, neighborhoods)

---

## ### FILE_INVENTORY ###

### index.ts
[INTENT]: Barrel export for SelfListingPage module
[EXPORTS]: SelfListingPage, useSelfListingStore

### SelfListingPage.tsx
[INTENT]: Main page component orchestrating sections and navigation
[IMPORTS]: All sections, store, shared components
[PATTERN]: Controlled wizard with progress tracking

---

## ### SECTION_FLOW ###

```
Section 1: Space Snapshot → Property basics
Section 2: Features → Amenities selection
Section 3: Lease Styles → Scheduling options
Section 4: Pricing → Rate configuration
Section 5: Rules → House rules
Section 6: Photos → Image upload
Section 7: Review → Final review and submit
```

---

## ### DATA_FLOW ###

```
User Input
    │
    ▼
Section Component
    │
    ▼
useSelfListingStore (Zustand)
    │
    ▼
localStorage (auto-save)
    │
    ▼
Submit → Edge Function → Bubble API
```

---

## ### USAGE_PATTERN ###

[ENTRY_POINT]: src/self-listing.jsx
[HTML_PAGE]: public/self-listing.html
[ROUTE]: /self-listing

---

**SUBDIRECTORY_COUNT**: 6
**TOTAL_FILES**: 15+
