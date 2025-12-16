# Implementation Plan: Pre-select Host Type for Existing Listing Editing

## Overview
Implement pre-selection logic on the Self Listing V2 page to automatically select the last option ("agent") in the "Who are you?" question (Section 1/Step 1) when a user with an existing listing accesses the page for editing via URL parameter.

## Success Criteria
- [ ] When user navigates to `/self-listing-v2?id=<listingId>`, the page loads the existing listing data
- [ ] The "Who are you?" (hostType) field in Step 1 is pre-selected to the last option ("agent")
- [ ] If no `id` parameter is present, default behavior remains unchanged (first option "resident" selected)
- [ ] Form state is properly initialized with existing listing data where applicable
- [ ] User can still change the pre-selected option if desired

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx` | Main page component with form state and rendering | Add URL param detection, loading logic, and pre-selection |
| `app/src/lib/listingService.js` | Service for listing CRUD operations | Reference only - use existing `getListingById()` |

### Related Documentation
- [miniCLAUDE.md](.claude/Documentation/miniCLAUDE.md) - Project architecture patterns
- [Pages CLAUDE.md](app/src/islands/pages/CLAUDE.md) - Page component patterns

### Existing Patterns to Follow
- **URL Parameter Handling**: Already exists in `SelfListingPageV2.tsx` lines 353-416 for `draft` and `session` params
- **Form State Initialization**: Uses `useState<FormData>(DEFAULT_FORM_DATA)` pattern
- **Service Calls**: Uses `listingService.js` functions like `getListingById()`
- **Async Loading in useEffect**: Follows pattern established in `loadDraftFromUrl()` function

## Implementation Steps

### Step 1: Add State for Edit Mode Detection
**Files:** `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx`
**Purpose:** Track whether the page is in "edit mode" for an existing listing
**Details:**
- Add new state variable: `const [isEditMode, setIsEditMode] = useState(false);`
- Add state for the listing ID being edited: `const [editingListingId, setEditingListingId] = useState<string | null>(null);`
- Place after existing state declarations (around line 181)

**Validation:** State variables properly declared without TypeScript errors

### Step 2: Extend URL Parameter Handling to Detect Edit Mode
**Files:** `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx`
**Purpose:** Check for `id` URL parameter indicating an existing listing
**Details:**
- In the existing `useEffect` that handles URL parameters (lines 353-416), add logic to check for `?id=` parameter
- Add early in the `loadDraftFromUrl` async function:
```typescript
const listingId = urlParams.get('id');

if (listingId) {
  console.log('[SelfListingPageV2] Edit mode detected, loading listing:', listingId);
  setIsEditMode(true);
  setEditingListingId(listingId);

  try {
    // Import and use getListingById from listingService
    const existingListing = await getListingById(listingId);

    if (existingListing) {
      // Pre-select the last host type option ("agent") for editing
      // Keep other form data from existing listing or defaults
      setFormData(prev => ({
        ...prev,
        hostType: 'agent', // Last option in HOST_TYPES
        // Additional mapping of existing listing data can be added here
      }));

      console.log('[SelfListingPageV2] Listing loaded, hostType pre-set to "agent"');
    } else {
      console.warn('[SelfListingPageV2] Listing not found:', listingId);
    }
  } catch (error) {
    console.error('[SelfListingPageV2] Failed to load listing for editing:', error);
  }

  return; // Exit early, don't process draft/session params
}
```
- Ensure this check happens BEFORE the existing `draftId` and `sessionId` checks

**Validation:**
- Navigate to `/self-listing-v2?id=<valid-listing-id>` - should log edit mode messages
- Navigate to `/self-listing-v2` - should not trigger edit mode

### Step 3: Add Import for getListingById
**Files:** `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx`
**Purpose:** Import the listing service function
**Details:**
- Add to existing imports (around line 23):
```typescript
import { createListing, saveDraft, getListingById } from '../../../lib/listingService.js';
```
- Note: `createListing` and `saveDraft` are already imported, just add `getListingById`

**Validation:** No import errors, function available for use

### Step 4: Ensure Pre-selection Persists Through Step Navigation
**Files:** `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx`
**Purpose:** Ensure the pre-selected "agent" option stays selected
**Details:**
- The existing form state management via `updateFormData()` should preserve the hostType value
- Verify that `renderStep1()` correctly displays the selected state based on `formData.hostType`
- The current implementation already handles this through the `className={formData.hostType === type.id ? 'selected' : ''}` logic (line 1032)
- No changes needed - just validation

**Validation:** Navigate through steps and back - hostType should remain "agent"

### Step 5: Handle localStorage Draft Conflict (Optional Enhancement)
**Files:** `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx`
**Purpose:** Clear any conflicting localStorage draft when in edit mode
**Details:**
- After loading existing listing in edit mode, consider clearing localStorage draft to avoid confusion:
```typescript
if (existingListing) {
  // Clear localStorage draft to prevent conflicts
  localStorage.removeItem(STORAGE_KEY);

  setFormData(prev => ({
    ...prev,
    hostType: 'agent',
  }));
}
```
- This prevents the localStorage restoration (lines 304-322) from overwriting the edit mode data

**Validation:** Edit mode loads correctly even if localStorage has draft data

## Edge Cases & Error Handling
- **Invalid listing ID**: Log warning and allow user to proceed with defaults
- **Network error loading listing**: Log error, show toast notification, proceed with defaults
- **User not authorized to edit listing**: Consider adding ownership check (future enhancement - out of scope for this task)
- **Listing not found (404)**: Log warning and proceed with defaults

## Testing Considerations
- Test with valid existing listing ID - hostType should be "agent"
- Test without ID parameter - hostType should be default "resident"
- Test with invalid/non-existent listing ID - graceful degradation to defaults
- Test navigation through all steps in edit mode - hostType persists
- Test localStorage draft behavior doesn't interfere with edit mode

## Rollback Strategy
- Remove the `id` URL parameter handling code block from the useEffect
- Remove the `isEditMode` and `editingListingId` state variables
- Remove the `getListingById` import addition
- No database changes required

## Dependencies & Blockers
- None - uses existing `getListingById` function from listingService.js
- No backend changes required

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| getListingById fails | Low | Low | Graceful fallback to defaults with error logging |
| localStorage conflicts | Medium | Low | Clear localStorage when in edit mode |
| TypeScript type errors | Low | Low | Use existing FormData type |

---

## Files Referenced in This Plan

### Primary Implementation File
- **`app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx`**
  - Line 97: `DEFAULT_FORM_DATA` with `hostType: 'resident'`
  - Lines 134-139: `HOST_TYPES` array definition
  - Line 153: Form state initialization
  - Lines 304-322: localStorage draft loading
  - Lines 353-416: URL parameter handling for draft/session
  - Lines 1023-1047: `renderStep1()` function rendering "Who are you?" question

### Supporting Files (Reference Only)
- **`app/src/lib/listingService.js`**
  - Lines 915-940: `getListingById()` function
  - Lines 1205-1298: `mapDatabaseToFormData()` for reference on data mapping

### Entry Point
- **`app/src/self-listing-v2.jsx`** - Entry point that mounts SelfListingPageV2

### Route Configuration
- **`app/src/routes.config.js`** - Line 220: `/self-listing-v2` route definition
