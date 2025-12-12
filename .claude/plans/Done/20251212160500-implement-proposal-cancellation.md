# Implementation Plan: Proposal Cancellation Functionality

## Overview

This plan implements the proposal cancellation feature by connecting the GuestEditingProposalModal's "Yes, Cancel" button to the existing `executeCancelProposal` workflow function. When a user confirms cancellation in the CancelProposalModalInner component, the proposal's Status field will be updated to 'Proposal Cancelled by Guest' in Supabase.

## Success Criteria

- [ ] When "Yes, Cancel" button is clicked in CancelProposalModalInner, the proposal is updated in Supabase
- [ ] The proposal's Status is set to 'Proposal Cancelled by Guest'
- [ ] The proposal's Deleted field is set to true (soft delete)
- [ ] Optional cancellation reason is saved to 'reason for cancellation' field
- [ ] Error states are handled gracefully with user feedback
- [ ] Success/error feedback is shown to the user via the onAlert callback
- [ ] The page reloads to reflect the updated status after successful cancellation

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/modals/GuestEditingProposalModal.jsx` | Modal component containing cancel confirmation UI | Wire `handleConfirmCancel` to call the workflow |
| `app/src/logic/workflows/proposals/cancelProposalWorkflow.js` | Workflow containing `executeCancelProposal` function | None - already implemented correctly |
| `app/src/islands/pages/proposals/ProposalCard.jsx` | Parent component using the modal | None - already passes proposal and handlers |
| `app/src/lib/supabase.js` | Supabase client | None - already imported in workflow |

### Related Documentation

- [miniCLAUDE.md](../../Documentation/miniCLAUDE.md) - Contains four-layer logic architecture and workflow patterns
- [largeCLAUDE.md](../../Documentation/largeCLAUDE.md) - Full architecture reference

### Existing Patterns to Follow

1. **Four-Layer Logic Pattern**: The `executeCancelProposal` function in `logic/workflows/proposals/cancelProposalWorkflow.js` already follows the workflow pattern - it orchestrates the database update with proper logging and error handling.

2. **Supabase Update Pattern** (from `cancelProposalWorkflow.js:115-120`):
```javascript
const { data, error } = await supabase
  .from('proposal')
  .update(updateData)
  .eq('_id', proposalId)
  .select()
  .single();
```

3. **Alert Callback Pattern** (from `GuestEditingProposalModal.jsx:865-869`):
```javascript
onAlert?.({
  text: 'Message here',
  alertType: 'success', // or 'information' or 'error'
  showOnLive: true
});
```

## Implementation Steps

### Step 1: Import the cancel workflow in GuestEditingProposalModal

**Files:** `app/src/islands/modals/GuestEditingProposalModal.jsx`

**Purpose:** Import the existing `executeCancelProposal` function from the workflows layer

**Details:**
- Add import statement at the top of the file (near line 16, after existing imports)
- Import path: `'../../logic/workflows/proposals/cancelProposalWorkflow.js'`

**Validation:**
- Check that the file compiles without import errors
- Verify the import path is correct by confirming the file exists

### Step 2: Update handleConfirmCancel to call the workflow

**Files:** `app/src/islands/modals/GuestEditingProposalModal.jsx`

**Purpose:** Modify the `handleConfirmCancel` callback to actually execute the database update

**Details:**

The current implementation (lines 894-902):
```javascript
const handleConfirmCancel = useCallback((reason) => {
  onProposalCancel?.(reason)
  onAlert?.({
    text: 'Proposal cancelled',
    alertType: 'information',
    showOnLive: true
  })
  handleClose()
}, [onProposalCancel, onAlert, handleClose])
```

Update to:
```javascript
const handleConfirmCancel = useCallback(async (reason) => {
  // Get proposal ID from the proposal object
  const proposalId = proposal?._id;

  if (!proposalId) {
    onAlert?.({
      text: 'Unable to cancel: proposal ID not found',
      alertType: 'error',
      showOnLive: true
    });
    return;
  }

  try {
    // Execute the cancellation in Supabase
    await executeCancelProposal(proposalId, reason || undefined);

    // Notify parent component
    onProposalCancel?.(reason);

    // Show success message
    onAlert?.({
      text: 'Proposal cancelled successfully',
      alertType: 'success',
      showOnLive: true
    });

    // Close the modal
    handleClose();
  } catch (error) {
    console.error('[GuestEditingProposalModal] Error cancelling proposal:', error);
    onAlert?.({
      text: `Failed to cancel proposal: ${error.message}`,
      alertType: 'error',
      showOnLive: true
    });
  }
}, [proposal, onProposalCancel, onAlert, handleClose])
```

**Key changes:**
1. Made the function `async` to handle the Promise from `executeCancelProposal`
2. Added proposal ID validation before attempting cancellation
3. Added try/catch for error handling
4. Changed success message to 'Proposal cancelled successfully'
5. Changed alertType from 'information' to 'success' for successful cancellation
6. Added `proposal` to the dependency array

**Validation:**
- The modal should close after successful cancellation
- An error message should appear if the proposal ID is missing
- An error message should appear if the Supabase update fails
- The success message should appear after successful cancellation

### Step 3: Add loading state during cancellation (optional enhancement)

**Files:** `app/src/islands/modals/GuestEditingProposalModal.jsx`

**Purpose:** Provide visual feedback while the cancellation is processing

**Details:**
- Add a state variable `const [isCancelling, setIsCancelling] = useState(false)` near line 713
- Set `setIsCancelling(true)` before the try block in `handleConfirmCancel`
- Set `setIsCancelling(false)` in both success and catch blocks
- Pass `isCancelling` to `CancelProposalModalInner` component
- Disable the "Yes, Cancel" button when `isCancelling` is true

Note: This step is optional but provides a better UX by preventing double-clicks and showing the user that something is happening.

**Validation:**
- The "Yes, Cancel" button should be disabled while cancellation is in progress
- The button should re-enable if cancellation fails

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| Proposal ID is null/undefined | Show error alert, do not proceed |
| Supabase update fails | Catch error, show error alert with message, keep modal open |
| Network error | Caught by try/catch, error message shown |
| Proposal already cancelled | The existing workflow handles this - database will succeed but no functional change |
| User clicks cancel multiple times | Optional: Disable button during processing |

## Testing Considerations

### Manual Testing Scenarios

1. **Happy Path**:
   - Open GuestEditingProposalModal with a valid proposal
   - Click "Cancel Proposal" button
   - Click "Yes, Cancel" in confirmation modal
   - Verify success message appears
   - Verify page reloads and proposal status is 'Proposal Cancelled by Guest'

2. **With Reason**:
   - Same as above but enter a cancellation reason
   - Verify the reason is saved in the 'reason for cancellation' field in Supabase

3. **Error Handling**:
   - Temporarily modify code to pass invalid proposal ID
   - Verify error message appears
   - Verify modal stays open for retry

4. **Verify Database**:
   - After cancellation, check Supabase proposal table:
     - `Status` = 'Proposal Cancelled by Guest'
     - `Deleted` = true
     - `Modified Date` is updated
     - `reason for cancellation` contains the reason (if provided)

## Rollback Strategy

If issues arise after deployment:
1. Revert the changes to `GuestEditingProposalModal.jsx`
2. The existing workflow function (`executeCancelProposal`) can remain unchanged as it was already in the codebase
3. Git command: `git checkout HEAD~1 -- app/src/islands/modals/GuestEditingProposalModal.jsx`

## Dependencies & Blockers

| Dependency | Status |
|------------|--------|
| `executeCancelProposal` workflow function | Already implemented in codebase |
| Supabase client | Already configured |
| `proposal` table exists in Supabase | Confirmed exists |
| Required fields exist (`Status`, `Deleted`, `Modified Date`, `reason for cancellation`) | Confirmed in existing workflow |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Supabase RLS blocks update | Low | High | Verify anon key has UPDATE permission on proposal table |
| Proposal ID mismatch | Low | Medium | Validate proposal ID exists before attempting update |
| User cancels during network request | Low | Low | Page reload in parent component handles this |
| Double-click causes duplicate updates | Low | Low | Optional: Add loading state to disable button |

---

## Files Referenced Summary

| File Path | Action |
|-----------|--------|
| `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\modals\GuestEditingProposalModal.jsx` | Modify - add import and update handleConfirmCancel |
| `C:\Users\Split Lease\Documents\Split Lease\app\src\logic\workflows\proposals\cancelProposalWorkflow.js` | Reference only - contains executeCancelProposal function |
| `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\proposals\ProposalCard.jsx` | Reference only - parent component |
| `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\supabase.js` | Reference only - Supabase client |

---

**Plan Version**: 1.0
**Created**: 2025-12-12
**Status**: Ready for execution
