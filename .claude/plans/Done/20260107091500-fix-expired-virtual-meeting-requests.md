# Fix Expired Virtual Meeting Requests

## Problem Statement

When a guest requests a virtual meeting and the host never responds, all suggested dates eventually expire. The current implementation:

1. Shows "Virtual Meeting Requested" button on the proposal card (correct)
2. Filters out the proposal from `VirtualMeetingsSection` because no dates are in the future
3. Leaves the user with no visibility into what happened and no way to create a new request

**Affected Proposal**: `1765400393626x15305242899061854`
- Guest requested VM on Dec 12, 2025
- Suggested 3 time slots on Dec 15, 2025
- Host never responded
- All dates now expired (as of Jan 7, 2026)

## Solution

### 1. Add EXPIRED State to Virtual Meeting Rules

**File**: [app/src/logic/rules/proposals/virtualMeetingRules.js](../../../app/src/logic/rules/proposals/virtualMeetingRules.js)

Add new state and detection logic:

```javascript
export const VM_STATES = {
  NO_MEETING: 'no_meeting',
  REQUESTED_BY_ME: 'requested_by_me',
  REQUESTED_BY_OTHER: 'requested_by_other',
  BOOKED_AWAITING_CONFIRMATION: 'booked_awaiting_confirmation',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  EXPIRED: 'expired'  // NEW
};

// Add helper to check if all dates expired
export function areAllDatesExpired(virtualMeeting) {
  if (!virtualMeeting) return false;

  const bookedDate = virtualMeeting.bookedDate || virtualMeeting['booked date'];
  const suggestedDates = virtualMeeting.suggestedDates || virtualMeeting['suggested dates and times'] || [];

  // If there's a booked date, check if it's in the past
  if (bookedDate) {
    return new Date(bookedDate) < new Date();
  }

  // If no booked date, check if all suggested dates are in the past
  if (suggestedDates.length === 0) return false;

  return suggestedDates.every(dateStr => new Date(dateStr) < new Date());
}

// Update getVirtualMeetingState to detect expired
export function getVirtualMeetingState(virtualMeeting, currentUserId) {
  if (!virtualMeeting) {
    return VM_STATES.NO_MEETING;
  }

  if (virtualMeeting.meetingDeclined) {
    return VM_STATES.DECLINED;
  }

  // Check for expired BEFORE other states
  if (areAllDatesExpired(virtualMeeting)) {
    return VM_STATES.EXPIRED;
  }

  if (virtualMeeting.bookedDate && virtualMeeting.confirmedBySplitlease) {
    return VM_STATES.CONFIRMED;
  }

  if (virtualMeeting.bookedDate && !virtualMeeting.confirmedBySplitlease) {
    return VM_STATES.BOOKED_AWAITING_CONFIRMATION;
  }

  if (virtualMeeting.requestedBy === currentUserId) {
    return VM_STATES.REQUESTED_BY_ME;
  }

  return VM_STATES.REQUESTED_BY_OTHER;
}
```

### 2. Update VirtualMeetingsSection Filter

**File**: [app/src/islands/pages/proposals/VirtualMeetingsSection.jsx](../../../app/src/islands/pages/proposals/VirtualMeetingsSection.jsx)

Change `filterProposalsWithActiveVM` to include expired VMs:

```javascript
function filterProposalsWithActiveVM(proposals) {
  if (!proposals || !Array.isArray(proposals)) return [];

  const excludedStatuses = [
    'Proposal Cancelled by Guest',
    'Proposal Rejected by Host',
    'Proposal Cancelled by Split Lease'
  ];

  return proposals.filter(proposal => {
    const vm = proposal.virtualMeeting;

    if (!vm) return false;

    const status = proposal.Status?.trim();
    if (excludedStatuses.includes(status)) return false;

    // Still exclude declined meetings
    if (vm['meeting declined'] === true) return false;

    // REMOVED: The date filtering logic that excluded expired meetings
    // Now we show ALL VM requests that aren't declined or cancelled

    return true;
  });
}
```

### 3. Add UI for Expired State

**File**: [app/src/islands/pages/proposals/VirtualMeetingsSection.jsx](../../../app/src/islands/pages/proposals/VirtualMeetingsSection.jsx)

Update `getPrimaryButtonConfig` to handle expired state:

```javascript
case VM_STATES.EXPIRED:
  return {
    text: 'Request Expired',
    className: 'vm-section-primary-btn vm-section-primary-btn--expired',
    disabled: false,
    view: 'request',  // Opens request form to create new request
    onClick: () => {
      // Clear old VM and show request form
      setActiveView('request');
    }
  };
```

Update `getCardMessage` for expired state:

```javascript
case VM_STATES.EXPIRED:
  return isHost
    ? "The virtual meeting request has expired. The guest can submit new time slots."
    : "Your meeting request expired without a response. You can request new time slots.";
```

### 4. Handle Creating New VM After Expiry

When user clicks "Request New Times" on an expired VM, we need to either:
- **Option A**: Clear the old VM record and create fresh (cleaner)
- **Option B**: Update the existing VM with new suggested dates (preserves history)

**Recommendation**: Option B - update existing record with new dates, keeping the same VM ID.

**File**: Edge function or API handler that processes VM requests needs to handle the "refresh expired VM" case.

### 5. Add Expired Badge Style

**File**: [app/src/islands/pages/proposals/VirtualMeetingsSection.css](../../../app/src/islands/pages/proposals/VirtualMeetingsSection.css)

```css
.vm-section-primary-btn--expired {
  background-color: #f59e0b;  /* Amber/warning color */
  color: white;
}

.vm-section-primary-btn--expired:hover {
  background-color: #d97706;
}

.vm-status-badge--expired {
  background-color: #fef3c7;
  color: #92400e;
  border: 1px solid #f59e0b;
}
```

## Files to Modify

1. [app/src/logic/rules/proposals/virtualMeetingRules.js](../../../app/src/logic/rules/proposals/virtualMeetingRules.js) - Add EXPIRED state
2. [app/src/islands/pages/proposals/VirtualMeetingsSection.jsx](../../../app/src/islands/pages/proposals/VirtualMeetingsSection.jsx) - Update filter and UI
3. [app/src/islands/pages/proposals/VirtualMeetingsSection.css](../../../app/src/islands/pages/proposals/VirtualMeetingsSection.css) - Add expired styles

## Testing

1. Load guest proposals page as user `1751052526471x730004712227235700`
2. Select proposal `1765400393626x15305242899061854`
3. Verify:
   - VirtualMeetingsSection now shows this proposal
   - Shows "Request Expired" or similar expired state
   - User can click to create new VM request with fresh dates

## Impact

- Low risk - only affects display logic, not data
- Improves UX for edge case of abandoned VM requests
- No database schema changes required
