# Implementation Plan: Activate Listing Button Disabled State

## Overview
Add a locked/disabled state to the "Activate Listing" button on the Self Listing V2 page to prevent duplicate submissions from rapid re-clicks. The button should become disabled immediately on click and remain locked until the activation completes or fails.

## Success Criteria
- [ ] Button becomes disabled immediately when clicked (before auth check begins)
- [ ] Button shows "Activating..." text while processing
- [ ] Button remains disabled throughout the entire submission flow
- [ ] Button re-enables if activation fails (allowing retry)
- [ ] Button stays disabled after successful submission (success modal appears)
- [ ] No duplicate listing creations possible from rage-clicking

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\SelfListingPageV2\SelfListingPageV2.tsx` | Main page component with form logic | Modify handleSubmit and button rendering |

### Existing Implementation
The component already has:
- `isSubmitting` state (line 161): `const [isSubmitting, setIsSubmitting] = useState(false);`
- Button with disabled prop (lines 2027-2033):
  ```jsx
  <button
    className="btn-next btn-success"
    onClick={handleSubmit}
    disabled={isSubmitting}
  >
    {isSubmitting ? 'Creating...' : 'Activate Listing'}
  </button>
  ```
- `handleSubmit` function (lines 962-1004) that sets `isSubmitting(true)` at line 984

### Current Gap
The `setIsSubmitting(true)` is called at line 984, AFTER the auth check completes (lines 962-981). This creates a window where the button is still clickable during:
1. Initial token validation (`validateTokenAndFetchUser`)
2. Fallback auth check (`checkAuthStatus`)

During this window (potentially several hundred milliseconds), rapid clicks could queue multiple submissions.

### Existing Patterns to Follow
- Use existing `isSubmitting` state (no new state needed)
- Follow the existing button text pattern: `{isSubmitting ? 'Text...' : 'Text'}`
- Use `finally` block for state reset (already exists)

## Implementation Steps

### Step 1: Move setIsSubmitting(true) to the Beginning of handleSubmit
**Files:** `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\SelfListingPageV2\SelfListingPageV2.tsx`
**Purpose:** Disable the button immediately when clicked, before any async operations begin
**Details:**
- Move `setIsSubmitting(true)` from line 984 to line 963 (immediately after function declaration)
- Add `setIsSubmitting(false)` in the early return at line 980 when auth modal is shown
- This ensures the button is disabled during the entire auth check + submission process

**Code Change (handleSubmit function - lines 962-1004):**
```typescript
// Submit handler
const handleSubmit = async () => {
  // IMMEDIATELY disable the button to prevent double-clicks
  setIsSubmitting(true);

  // Try to get user data from Edge Function first
  // CRITICAL: Use clearOnFailure: false to preserve session if Edge Function fails
  const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

  // If Edge Function failed (userData is null), fall back to checking Supabase session directly
  // This handles the case where Edge Function returns 500 but user has valid Supabase session
  let loggedIn = !!userData;
  if (!loggedIn) {
    loggedIn = await checkAuthStatus();
    console.log('[SelfListingPageV2] Edge Function failed, checking Supabase session:', loggedIn);
  }
  setIsLoggedIn(loggedIn);

  if (!loggedIn) {
    console.log('[SelfListingPageV2] User not logged in, showing auth modal');
    setIsSubmitting(false); // RE-ENABLE button so user can try again after login
    setShowAuthModal(true);
    setPendingSubmit(true);
    return;
  }

  console.log('[SelfListingPageV2] User is logged in, proceeding with submission');
  // isSubmitting already true, no need to set again

  try {
    // Map form data to listingService format
    const listingData = mapFormDataToListingService(formData);
    const result = await createListing(listingData);

    console.log('[SelfListingPageV2] Listing created:', result);
    setCreatedListingId(result._id);
    setSubmitSuccess(true);
    // Save last preferences before clearing draft so they persist for next listing
    localStorage.setItem(LAST_HOST_TYPE_KEY, formData.hostType);
    localStorage.setItem(LAST_MARKET_STRATEGY_KEY, formData.marketStrategy);
    localStorage.removeItem(STORAGE_KEY);
    // NOTE: Do NOT reset isSubmitting on success - button stays disabled as success modal appears
  } catch (error) {
    console.error('[SelfListingPageV2] Submit error:', error);
    alert('Failed to create listing. Please try again.');
    setIsSubmitting(false); // Re-enable button on error for retry
  }
  // Remove the finally block since we handle success/error separately
};
```

**Validation:**
- Click "Activate Listing" while logged out - button should disable briefly, then re-enable when auth modal appears
- Click "Activate Listing" while logged in - button should stay disabled until success modal appears
- If API call fails - button should re-enable to allow retry

### Step 2: Update Button Text for Better UX
**Files:** `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\SelfListingPageV2\SelfListingPageV2.tsx`
**Purpose:** Change button text from "Creating..." to "Activating..." to match the action name
**Details:**
- Line 2032: Change `'Creating...'` to `'Activating...'`
- This provides consistent terminology with the button label

**Code Change (line 2032):**
```typescript
{isSubmitting ? 'Activating...' : 'Activate Listing'}
```

**Validation:** Confirm button text changes to "Activating..." when clicked

## Edge Cases & Error Handling
- **User clicks rapidly before button disables:** The `setIsSubmitting(true)` is now the FIRST line, so even if multiple click events fire, only the first will proceed (React batches state updates and subsequent calls will see `isSubmitting === true`)
- **Auth modal shown then closed:** Button re-enables when auth modal shows (`setIsSubmitting(false)` added before showing modal)
- **Network error during submission:** Button re-enables in catch block for retry
- **Success:** Button remains disabled as success modal appears (prevents accidental re-submission)

## Testing Considerations
- Test rapid clicking on the "Activate Listing" button - should only create one listing
- Test clicking while logged out - button should briefly disable, then re-enable when auth modal appears
- Test clicking while logged in - button should stay disabled until success or error
- Test network failure scenario - button should re-enable for retry
- Verify "Back" button is also disabled during submission (already implemented at line 2034)

## Rollback Strategy
- Revert the handleSubmit function to its original implementation
- Revert button text from "Activating..." to "Creating..."

## Dependencies & Blockers
- None - this is a self-contained UI change

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Button stays permanently disabled | Low | Medium | Ensure finally/catch blocks always re-enable or show success modal |
| Double submission still possible | Very Low | High | React state updates are synchronous within event handler |
| User confusion about "Activating..." | Low | Low | Text is clear and matches button label |

## Summary of Files to Modify
| File | Lines | Change Type |
|------|-------|-------------|
| `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx` | 962-1004 | Modify `handleSubmit` function |
| `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx` | 2032 | Update button text |

## Detailed Line-by-Line Changes

### Change 1: handleSubmit function restructure
**Location:** Lines 962-1004
**Old Code:**
```typescript
const handleSubmit = async () => {
  const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
  // ...auth check logic...
  if (!loggedIn) {
    setShowAuthModal(true);
    setPendingSubmit(true);
    return;
  }
  setIsSubmitting(true);  // <-- Too late!
  try {
    // ...submission logic...
  } catch (error) {
    // ...error handling...
  } finally {
    setIsSubmitting(false);
  }
};
```

**New Code:**
```typescript
const handleSubmit = async () => {
  setIsSubmitting(true);  // <-- FIRST THING: disable button
  const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
  // ...auth check logic...
  if (!loggedIn) {
    setIsSubmitting(false);  // <-- Re-enable for retry after login
    setShowAuthModal(true);
    setPendingSubmit(true);
    return;
  }
  // isSubmitting already true, proceed...
  try {
    // ...submission logic...
    // Success: keep button disabled (modal appears)
  } catch (error) {
    // ...error handling...
    setIsSubmitting(false);  // Re-enable for retry
  }
  // No finally block - state handled explicitly in success/error paths
};
```

### Change 2: Button text update
**Location:** Line 2032
**Old:** `{isSubmitting ? 'Creating...' : 'Activate Listing'}`
**New:** `{isSubmitting ? 'Activating...' : 'Activate Listing'}`
