# SelfListingPage Store Context

**TYPE**: LEAF NODE
**PARENT**: app/src/islands/pages/SelfListingPage/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Zustand state management for listing creation form
[PATTERN]: Centralized store with actions for form state
[PERSISTENCE]: localStorage with auto-save

---

## ### STORE_CONTRACT ###

### useSelfListingStore
[PATH]: ./index.ts (or parent)
[INTENT]: Zustand store for multi-section listing form state
[STATE_SHAPE]:
```typescript
{
  // Form data
  listingDraft: ListingDraft,
  currentSection: number,

  // Validation
  sectionErrors: Record<number, string[]>,

  // Actions
  setField: (field: string, value: any) => void,
  nextSection: () => void,
  prevSection: () => void,
  saveDraft: () => void,
  loadDraft: () => void,
  clearDraft: () => void,
  submitListing: () => Promise<void>
}
```

---

## ### PERSISTENCE ###

| Key | Value |
|-----|-------|
| STORAGE | localStorage |
| KEY | 'sl-listing-draft' |
| AUTO_SAVE | On field change with debounce |
| LOAD | On component mount |

---

## ### ACTIONS ###

| Action | Description |
|--------|-------------|
| setField | Update single field in draft |
| nextSection | Validate current section, advance if valid |
| prevSection | Go back one section |
| saveDraft | Persist to localStorage |
| loadDraft | Restore from localStorage |
| clearDraft | Remove from localStorage |
| submitListing | Submit to API, clear draft on success |

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Always use store actions - never mutate state directly
[RULE_2]: Draft loads automatically on mount
[RULE_3]: Clear draft after successful submission

---

## ### DEPENDENCIES ###

[LOCAL]: None
[EXTERNAL]: zustand

---

**FILE_COUNT**: 1
**EXPORTS_COUNT**: 1
