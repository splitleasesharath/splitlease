# SelfListingPage Store

**GENERATED**: 2025-11-26
**ARCHITECTURE**: React Islands (TypeScript)
**PARENT**: app/src/islands/pages/SelfListingPage/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Zustand state management for listing creation form
[PATTERN]: Centralized store with actions for form state

---

## ### STORE_SHAPE ###

```typescript
{
  // Form data
  listingDraft: ListingDraft,
  currentSection: number,

  // Actions
  setField: (field, value) => void,
  nextSection: () => void,
  prevSection: () => void,
  saveDraft: () => void,
  loadDraft: () => void,
  submitListing: () => Promise<void>
}
```

---

## ### PERSISTENCE ###

[STORAGE]: localStorage
[KEY]: 'sl-listing-draft'
[AUTO_SAVE]: On field change with debounce

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { useSelfListingStore } from './store'
[CONSUMED_BY]: All section components

---

**FILE_COUNT**: 0 (store may be in parent or index)
**NOTE**: Check if store files exist or are in index.ts
