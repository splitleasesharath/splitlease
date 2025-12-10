# Implementation Plan: Enrich Virtual Meetings Section

## Overview

Enhance the `VirtualMeetingsSection` component to be a fully interactive element that opens the `VirtualMeetingManager` popup with the correct view based on the VM state, matching Bubble's conditional logic.

## Current State Analysis

### Existing Implementation (`VirtualMeetingsSection.jsx`)
- **Location**: `app/src/islands/pages/proposals/VirtualMeetingsSection.jsx`
- **Current Behavior**:
  - Filters proposals with active VMs
  - Displays host name, listing name, suggested dates
  - Only shows "Cancel Virtual Meeting" button
  - Opens VirtualMeetingManager with `initialView='cancel'`

### Missing Functionality
Based on the Bubble documentation and `virtualMeetingRules.js`:
1. Dynamic button based on VM state (not just cancel)
2. Context-aware message text
3. State-appropriate actions (respond, view details, join)
4. Visual indicators for confirmed vs pending states

---

## VM State → UI Mapping

Using `VM_STATES` from `virtualMeetingRules.js`:

| VM State | Button Text | Button Action | Modal View | Additional UI |
|----------|-------------|---------------|------------|---------------|
| `REQUESTED_BY_GUEST` | "Meeting Requested" | Disabled OR Cancel | `'cancel'` | Show "Awaiting host response" message |
| `REQUESTED_BY_HOST` | "Respond to Virtual Meeting" | Click opens modal | `'respond'` | Show suggested dates prominently |
| `BOOKED_AWAITING_CONFIRMATION` | "View Meeting Details" | Click opens modal | `'details'` | Show booked date, "Pending confirmation" badge |
| `CONFIRMED` | "Join Virtual Meeting" | Click opens modal | `'details'` | Show confirmed badge, meeting link hint |

Note: `NO_MEETING` and `DECLINED` states are filtered out by `filterProposalsWithActiveVM()`.

---

## Implementation Steps

### Step 1: Import VM Rules

Import the business rules from the logic layer:

```javascript
import {
  getVirtualMeetingState,
  getVMStateInfo,
  VM_STATES
} from '../../../logic/rules/proposals/virtualMeetingRules.js';
```

### Step 2: Enhance VirtualMeetingCard Component

Modify the `VirtualMeetingCard` to:

1. **Calculate VM state** using `getVMStateInfo(vm, currentUserId)`
2. **Determine initialView** based on state:
   - `REQUESTED_BY_HOST` → `'respond'`
   - `BOOKED_AWAITING_CONFIRMATION` → `'details'`
   - `CONFIRMED` → `'details'`
   - `REQUESTED_BY_GUEST` → `'cancel'` (or show disabled state)
3. **Render dynamic button** with correct text and style
4. **Show contextual message** based on state

### Step 3: Update Card Content Based on State

**For REQUESTED_BY_HOST:**
- Message: "A virtual meeting with {hostName} has been suggested for the times:"
- Show date pills for suggested dates
- Primary button: "Respond to Virtual Meeting" → opens `'respond'` view
- Secondary button: "Decline" (optional)

**For BOOKED_AWAITING_CONFIRMATION:**
- Message: "Your virtual meeting is scheduled. Waiting for Split Lease confirmation."
- Show single booked date pill with "Pending" badge
- Primary button: "View Meeting Details" → opens `'details'` view
- Cancel button available

**For CONFIRMED:**
- Message: "Your virtual meeting is confirmed!"
- Show booked date with "Confirmed" badge
- Primary button: "Join Virtual Meeting" → opens `'details'` view
- Show meeting link icon/hint
- Cancel button available

**For REQUESTED_BY_GUEST:**
- Message: "You've requested a virtual meeting. Waiting for host response."
- Show suggested dates you proposed
- Disabled primary button: "Meeting Requested"
- Cancel button: "Cancel Request" → opens `'cancel'` view

### Step 4: Add Visual State Indicators

New CSS classes for state badges:
- `.vm-section-badge-pending` - Yellow/orange for awaiting confirmation
- `.vm-section-badge-confirmed` - Green for confirmed
- `.vm-section-badge-waiting` - Gray for awaiting response

### Step 5: Multi-Button Action Bar

Update action bar to support multiple buttons:
- Primary action button (state-dependent)
- Cancel/decline secondary button (when applicable)

---

## Code Changes

### File: `VirtualMeetingsSection.jsx`

#### New Imports
```javascript
import {
  getVirtualMeetingState,
  getVMStateInfo,
  VM_STATES
} from '../../../logic/rules/proposals/virtualMeetingRules.js';
```

#### New Helper: Determine Modal View
```javascript
function getModalViewForState(vmState) {
  switch (vmState) {
    case VM_STATES.REQUESTED_BY_HOST:
      return 'respond';
    case VM_STATES.BOOKED_AWAITING_CONFIRMATION:
    case VM_STATES.CONFIRMED:
      return 'details';
    case VM_STATES.REQUESTED_BY_GUEST:
    case VM_STATES.NO_MEETING:
    case VM_STATES.DECLINED:
    default:
      return 'cancel';
  }
}
```

#### New Helper: Get Card Message
```javascript
function getCardMessage(vmState, hostName, currentUserId, vm) {
  switch (vmState) {
    case VM_STATES.REQUESTED_BY_HOST:
      return `${hostName} has suggested times for a virtual meeting:`;
    case VM_STATES.REQUESTED_BY_GUEST:
      return `You've requested a virtual meeting. Waiting for ${hostName}'s response.`;
    case VM_STATES.BOOKED_AWAITING_CONFIRMATION:
      return `Your meeting is scheduled. Waiting for Split Lease confirmation.`;
    case VM_STATES.CONFIRMED:
      return `Your virtual meeting is confirmed!`;
    default:
      return `A virtual meeting with ${hostName} has been suggested:`;
  }
}
```

#### Enhanced VirtualMeetingCard
- Add `vmStateInfo` calculation
- Render state-aware content
- Dynamic action buttons
- Status badges

### File: `guest-proposals.css`

Add new styles:
```css
/* State badges */
.vm-section-badge { ... }
.vm-section-badge-pending { ... }
.vm-section-badge-confirmed { ... }
.vm-section-badge-waiting { ... }

/* Primary action button (enhanced) */
.vm-section-primary-btn { ... }
.vm-section-primary-btn--respond { ... }
.vm-section-primary-btn--details { ... }
.vm-section-primary-btn--join { ... }
.vm-section-primary-btn--disabled { ... }

/* Booked date display */
.vm-section-booked-date { ... }

/* Multi-button action bar */
.vm-section-action-bar--multi { ... }
```

---

## Conditional Logic (From Bubble Doc)

The section visibility matches Bubble's logic:
- **Visible when**: `Current User's Proposals List:filtered:count is not 0`
- **Filter conditions** (already implemented in `filterProposalsWithActiveVM`):
  - `virtual meeting isn't empty`
  - `Status <> Proposal Cancelled by Guest`
  - `Status <> Proposal Rejected by Host`
  - `Status <> Proposal Cancelled by Split Lease`
  - `booked date > current OR suggested dates last item > current`
  - `meeting declined is no`

Per-card conditional (new to implement):
- Show booked date **when**: `vm.bookedDate exists`
- Show suggested dates **when**: `vm.bookedDate is empty AND vm.suggestedDates exists`
- Show "Respond" button **when**: `vm.requestedBy !== currentUserId AND !vm.bookedDate`
- Show "Join/Details" button **when**: `vm.bookedDate exists`
- Disable primary button **when**: `vm.requestedBy === currentUserId AND !vm.bookedDate`

---

## Testing Checklist

- [ ] VM in `REQUESTED_BY_HOST` state shows "Respond" button, opens respond view
- [ ] VM in `REQUESTED_BY_GUEST` state shows disabled "Meeting Requested" + cancel option
- [ ] VM in `BOOKED_AWAITING_CONFIRMATION` state shows "View Details" with pending badge
- [ ] VM in `CONFIRMED` state shows "Join Meeting" with confirmed badge
- [ ] All modal views work correctly when opened
- [ ] Cancel functionality still works
- [ ] Mobile responsive design maintained
- [ ] Date formatting consistent across states

---

## Files Modified

| File | Change Type |
|------|-------------|
| `app/src/islands/pages/proposals/VirtualMeetingsSection.jsx` | Major enhancement |
| `app/src/styles/components/guest-proposals.css` | Add new styles |

---

## Dependencies

- `virtualMeetingRules.js` - Existing (no changes needed)
- `VirtualMeetingManager.jsx` - Existing (no changes needed)
- `virtualMeetingService.js` - Existing (no changes needed)

---

## Risk Assessment

**Low Risk:**
- Uses existing, tested business rules from `virtualMeetingRules.js`
- VirtualMeetingManager already supports all required views
- No changes to backend/API layer

**Considerations:**
- Ensure `vm` object field names match both Bubble and Supabase naming conventions
- Handle edge cases where vm fields may be undefined

---

## Rollback Plan

If issues arise, revert to previous commit. The current implementation is functional (cancel-only), so rollback is safe.
