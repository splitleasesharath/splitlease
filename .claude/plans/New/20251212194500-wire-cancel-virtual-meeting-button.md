# Implementation Plan: Wire Cancel Virtual Meeting Button on Guest-Proposal Page

## Overview
Wire the 'Cancel Virtual Meeting' button on the guest-proposal page to display the VirtualMeetingManager modal in cancel/confirmation mode when clicked. This ensures guests can cancel scheduled virtual meetings directly from the VirtualMeetingsSection component.

## Success Criteria
- [ ] Clicking "Cancel Virtual Meeting" button opens VirtualMeetingManager modal in 'cancel' view
- [ ] Cancel confirmation UI is displayed with meeting details
- [ ] Cancellation action properly deletes the virtual meeting and updates the proposal
- [ ] Page reloads after successful cancellation to reflect updated state

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/proposals/VirtualMeetingsSection.jsx` | Virtual meetings display on guest-proposals | Already has cancel button wired (lines 408-415) |
| `app/src/islands/shared/VirtualMeetingManager/VirtualMeetingManager.jsx` | Multi-view modal orchestrator | Already supports 'cancel' view (lines 243-250) |
| `app/src/islands/shared/VirtualMeetingManager/CancelVirtualMeetings.jsx` | Cancel confirmation UI component | No changes needed - already implemented |
| `app/src/islands/modals/VirtualMeetingModal.jsx` | Alternative simpler modal (not used by VirtualMeetingsSection) | No changes needed |
| `app/src/islands/pages/proposals/ProposalCard.jsx` | Main proposal card - has VM button | Already has VM modal wiring |
| `app/src/styles/components/guest-proposals.css` | Styles for guest proposals page | Verify `.vm-section-cancel-btn` styling |

### Related Documentation
- [VirtualMeetingManager CLAUDE.md](app/src/islands/shared/VirtualMeetingManager/CLAUDE.md) - Documents the 4-view modal workflow including 'cancel' view

### Existing Patterns to Follow
- **Modal View Pattern**: VirtualMeetingManager uses `initialView` prop to determine which view to show ('request', 'respond', 'details', 'cancel')
- **Handler Pattern**: `onOpenVMModal(proposal, view)` function in VirtualMeetingsSection accepts view as second parameter
- **State Machine**: Empty string hides modal, 'cancel' shows CancelVirtualMeetings component

## Analysis Summary

### Current State
The "Cancel Virtual Meeting" button is **already implemented and functional** in the React codebase:

1. **VirtualMeetingsSection.jsx** (lines 408-415):
```jsx
{/* Cancel button - always show unless VM is confirmed or user is waiting for response */}
{vmState !== VM_STATES.CONFIRMED && (
  <button
    className="vm-section-cancel-btn"
    onClick={() => onOpenVMModal(proposal, 'cancel')}
  >
    {vmState === VM_STATES.REQUESTED_BY_GUEST ? 'Cancel Request' : 'Cancel Virtual Meeting'}
  </button>
)}
```

2. **Handler in VirtualMeetingsSection.jsx** (lines 441-445):
```jsx
const handleOpenVMModal = (proposal, view) => {
  setSelectedProposal(proposal);
  setVmInitialView(view);
  setShowVMModal(true);
};
```

3. **VirtualMeetingManager.jsx** shows CancelVirtualMeetings when `view === 'cancel'` (lines 243-250):
```jsx
{/* Cancel Virtual Meeting View */}
{view === 'cancel' && virtualMeeting && (
  <CancelVirtualMeetings
    meeting={virtualMeeting}
    participantName={getParticipantName()}
    listingName={getListingName()}
    onCancel={handleCancelMeeting}
    onClose={onClose}
  />
)}
```

### Button Visibility Logic
The "Cancel Virtual Meeting" button appears when:
- VM state is NOT `VM_STATES.CONFIRMED` (confirmed meetings can't be cancelled by guest)
- When state is `VM_STATES.REQUESTED_BY_GUEST`, button text changes to "Cancel Request"

### Selector Clarification
The selector `.clickable-element.bubble-element.Button.cutzaQ2` is a **Bubble-specific class name** that does not exist in the React codebase. This appears to reference the legacy Bubble implementation. In React, the equivalent button uses the class `vm-section-cancel-btn`.

## Implementation Steps

### Step 1: Verify Current Implementation Works
**Files:** `app/src/islands/pages/proposals/VirtualMeetingsSection.jsx`
**Purpose:** Confirm the cancel button is rendering and clickable
**Details:**
- Inspect the VirtualMeetingsSection component in browser DevTools
- Verify the button with class `vm-section-cancel-btn` is present when viewing proposals with active virtual meetings
- Test clicking the button to confirm modal opens in cancel view
**Validation:** Button click opens VirtualMeetingManager modal showing cancel confirmation UI

### Step 2: Verify Cancel Flow End-to-End
**Files:** `app/src/islands/shared/VirtualMeetingManager/VirtualMeetingManager.jsx`, `app/src/islands/shared/VirtualMeetingManager/CancelVirtualMeetings.jsx`
**Purpose:** Confirm the full cancellation workflow functions correctly
**Details:**
- CancelVirtualMeetings component should display:
  - Trash icon and "Cancel Virtual Meeting?" title
  - Warning text "This action cannot be undone"
  - Meeting info card with participant name, listing name, booked date, and meeting link
  - "No" button (calls `onClose`)
  - "Cancel Meeting" button (calls `onCancel` -> `handleCancelMeeting`)
- `handleCancelMeeting` in VirtualMeetingManager.jsx should:
  - Call `virtualMeetingService.cancelMeeting(vmId, proposalId)`
  - Show success message
  - Trigger `onSuccess` callback (page reload)
**Validation:** Clicking "Cancel Meeting" successfully deletes the VM and refreshes the page

### Step 3: Check Edge Cases
**Files:** `app/src/islands/pages/proposals/VirtualMeetingsSection.jsx`
**Purpose:** Verify button visibility conditions are correct
**Details:**
- Button should NOT appear when `vmState === VM_STATES.CONFIRMED`
- Button text should be "Cancel Request" when `vmState === VM_STATES.REQUESTED_BY_GUEST`
- Button text should be "Cancel Virtual Meeting" for all other states
**Validation:** Button visibility and text changes appropriately based on VM state

### Step 4: Style Verification (If Needed)
**Files:** `app/src/styles/components/guest-proposals.css`
**Purpose:** Confirm button styling matches design expectations
**Details:**
- Current styling (lines 1202-1220):
  ```css
  .vm-section-cancel-btn {
    background-color: rgb(147, 146, 147);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-primary-contrast, #FFFFFF);
    text-align: center;
    line-height: 1;
    padding: 0 15px;
    border-radius: 20px;
    border: none;
    height: 32px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  ```
- Verify this matches the gray background mentioned in the task (`gray background, text "Cancel Virtual Meeting"`)
**Validation:** Button appears with gray background and white text

## Edge Cases & Error Handling
- **No virtual meeting**: Cancel button only shows when `virtualMeeting` exists and `view === 'cancel'` condition includes `virtualMeeting && ...`
- **Network error during cancellation**: CancelVirtualMeetings component has error handling with `setError(err.message)` and displays error message
- **Loading state**: Button is disabled while `isLoading` is true to prevent double-clicks

## Testing Considerations
- Test with a proposal that has an active (non-confirmed) virtual meeting
- Verify button appears and has correct text based on VM state
- Click button and verify modal opens in cancel view
- Verify meeting details are displayed correctly in the confirmation dialog
- Test "No" button closes modal without action
- Test "Cancel Meeting" button:
  - Shows loading state
  - Successfully cancels meeting
  - Page reloads with updated state
- Test error scenario (simulate network failure)

## Rollback Strategy
- No database schema changes required
- Rollback is straightforward git revert if needed
- Existing functionality is stable; this is verification/debugging task

## Dependencies & Blockers
- None - all required components and services already exist

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Button not visible due to incorrect VM state | Low | Medium | Debug VM state calculation in VirtualMeetingsSection |
| Cancel API fails | Low | Medium | Error handling already implemented in CancelVirtualMeetings |
| Modal not opening | Low | Medium | Debug state management in VirtualMeetingsSection |

## Conclusion

**The "Cancel Virtual Meeting" button is already fully implemented in the React codebase.** The functionality exists and should be working. If there is an issue:

1. **Most Likely Cause**: The VM state might be `CONFIRMED` which hides the cancel button, OR there might be no proposals with active virtual meetings to test with.

2. **Debug Steps**:
   - Add console.log in VirtualMeetingsSection to check `vmState` value
   - Verify `proposalsWithActiveVM` array is populated
   - Check browser DevTools for any JS errors

3. **If Button Not Rendering**:
   - The button only renders when `vmState !== VM_STATES.CONFIRMED`
   - Check if `filterProposalsWithActiveVM` is correctly filtering proposals

## Files Referenced Summary
| File Path | Lines of Interest |
|-----------|-------------------|
| `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\proposals\VirtualMeetingsSection.jsx` | 408-415 (cancel button), 441-445 (handler), 425-458 (modal rendering) |
| `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\VirtualMeetingManager.jsx` | 243-250 (cancel view), 146-170 (handleCancelMeeting) |
| `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\CancelVirtualMeetings.jsx` | Entire file (117 lines) |
| `C:\Users\Split Lease\Documents\Split Lease\app\src\styles\components\guest-proposals.css` | 1202-1220 (.vm-section-cancel-btn) |
| `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\proposals\ProposalCard.jsx` | 642-644 (VM modal state), 779-797 (VM handlers) |
| `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\GuestProposalsPage.jsx` | 167-171 (VirtualMeetingsSection usage) |
