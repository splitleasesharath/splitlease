# Guest Proposals Page - Button Conditionals Implementation Plan

**Created**: 2025-11-27
**Purpose**: Map Bubble.io button conditionals to React/Supabase implementation

---

## Database Field Mapping

### Supabase Tables & Fields

| Bubble Concept | Supabase Table | Supabase Field | Type |
|----------------|----------------|----------------|------|
| Proposal Status | `proposal` | `Status` | text |
| Virtual Meeting | `virtualmeetingschedulesandlinks` | (linked via `proposal` field) | - |
| VM Requested By | `virtualmeetingschedulesandlinks` | `requested by` | text |
| VM Booked Date | `virtualmeetingschedulesandlinks` | `booked date` | timestamp |
| VM Confirmed | `virtualmeetingschedulesandlinks` | `confirmedBySplitLease` | boolean |
| VM Declined | `virtualmeetingschedulesandlinks` | `meeting declined` | boolean |
| Guest Docs Finalized | `proposal` | `guest documents review finalized?` | boolean |
| ID Docs Submitted | `user` | `ID documents submitted?` | boolean |
| Reminders by Guest | `proposal` | `remindersByGuest (number)` | integer |
| House Manual | `listing` | `House manual` | text |

---

## Status Configuration

Since Bubble uses a Status option set with `Guest Action 1`, `Guest Action 2`, and `Usual Order` properties, we need to define this mapping in code:

```javascript
// app/src/config/proposalStatusConfig.js

export const PROPOSAL_STATUS = {
  // Status text values from database
  PENDING: 'Pending',
  HOST_REVIEW: 'Host Review',
  PROPOSAL_SUBMITTED_AWAITING_APPLICATION: 'Proposal Submitted by guest - Awaiting Rental Application',
  PROPOSAL_SUBMITTED_BY_SL_AWAITING_APPLICATION: 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application',
  PROPOSAL_SUBMITTED_BY_SL_PENDING_CONFIRMATION: 'Proposal Submitted for guest by Split Lease - Pending Confirmation',
  HOST_COUNTEROFFER: 'Host Counteroffer Submitted / Awaiting Guest Review',
  PROPOSAL_ACCEPTED_DRAFTING: 'Proposal or Counteroffer Accepted / Drafting Lease Documents',
  LEASE_DOCUMENTS_SENT: 'Lease Documents Sent for Review',
  INITIAL_PAYMENT_LEASE_ACTIVATED: 'Initial Payment Submitted / Lease activated',
  CANCELLED_BY_GUEST: 'Proposal Cancelled by Guest',
  CANCELLED_BY_SPLITLEASE: 'Proposal Cancelled by Split Lease',
  REJECTED_BY_HOST: 'Proposal Rejected by Host',
};

// Status configuration with actions and ordering
export const STATUS_CONFIG = {
  [PROPOSAL_STATUS.PENDING]: {
    usualOrder: 1,
    guestAction1: 'View Proposal',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.HOST_REVIEW]: {
    usualOrder: 2,
    guestAction1: 'Remind Split Lease',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.PROPOSAL_SUBMITTED_AWAITING_APPLICATION]: {
    usualOrder: 3,
    guestAction1: 'Complete Application',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_AWAITING_APPLICATION]: {
    usualOrder: 3,
    guestAction1: 'Complete Application',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_PENDING_CONFIRMATION]: {
    usualOrder: 3,
    guestAction1: 'Confirm Proposal',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.HOST_COUNTEROFFER]: {
    usualOrder: 4,
    guestAction1: 'Review Counteroffer',
    guestAction2: 'Accept Modified Terms',
  },
  [PROPOSAL_STATUS.PROPOSAL_ACCEPTED_DRAFTING]: {
    usualOrder: 5,
    guestAction1: 'Remind Split Lease',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.LEASE_DOCUMENTS_SENT]: {
    usualOrder: 6,
    guestAction1: 'Review Documents',
    guestAction2: 'Submit ID Documents',
  },
  [PROPOSAL_STATUS.INITIAL_PAYMENT_LEASE_ACTIVATED]: {
    usualOrder: 7,
    guestAction1: 'Go to Leases',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.CANCELLED_BY_GUEST]: {
    usualOrder: 99,
    guestAction1: 'Delete Proposal',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.CANCELLED_BY_SPLITLEASE]: {
    usualOrder: 99,
    guestAction1: 'Delete Proposal',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.REJECTED_BY_HOST]: {
    usualOrder: 99,
    guestAction1: 'Delete Proposal',
    guestAction2: 'Invisible',
  },
};

// Helper function to get status config
export function getStatusConfig(statusText) {
  return STATUS_CONFIG[statusText] || {
    usualOrder: 0,
    guestAction1: 'Invisible',
    guestAction2: 'Invisible',
  };
}
```

---

## Button 1: Request Virtual Meeting

### Visibility Rules

```javascript
function isVirtualMeetingButtonVisible(proposal, currentUserId) {
  const status = proposal.Status;

  // HIDDEN when status is terminal or early-stage SL submission
  const hiddenStatuses = [
    PROPOSAL_STATUS.REJECTED_BY_HOST,
    PROPOSAL_STATUS.CANCELLED_BY_SPLITLEASE,
    PROPOSAL_STATUS.INITIAL_PAYMENT_LEASE_ACTIVATED,
    PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_AWAITING_APPLICATION,
    PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_PENDING_CONFIRMATION,
  ];

  if (hiddenStatuses.includes(status)) {
    return false;
  }

  return true;
}
```

### Label & Styling Rules

```javascript
function getVirtualMeetingButtonState(proposal, virtualMeeting, currentUserId) {
  const vm = virtualMeeting;

  // Priority order matters - check from most specific to least

  // 1. Meeting declined - can request again
  if (vm?.['meeting declined'] === true) {
    return {
      label: 'Virtual Meeting Declined',
      style: 'declined',
      fontColor: '#DB2E2E',
      bold: true,
      tooltip: 'click to request another one',
      disabled: false,
    };
  }

  // 2. Meeting confirmed by Split Lease
  if (vm?.['booked date'] && vm?.['confirmedBySplitLease'] === true) {
    return {
      label: 'Meeting confirmed',
      style: 'confirmed',
      disabled: true,
    };
  }

  // 3. Meeting accepted but not yet confirmed
  if (vm?.['booked date'] && vm?.['confirmedBySplitLease'] !== true) {
    return {
      label: 'Virtual Meeting Accepted',
      style: 'accepted',
      disabled: true,
    };
  }

  // 4. Current user requested - waiting for response
  if (vm?.['requested by'] === currentUserId) {
    return {
      label: 'Virtual Meeting Requested',
      style: 'pending',
      disabled: true,
    };
  }

  // 5. Other party requested - can respond
  if (vm?.['requested by'] && vm?.['requested by'] !== currentUserId) {
    return {
      label: 'Respond to Virtual Meeting Request',
      style: 'action-required',
      disabled: false,
    };
  }

  // 6. Default - can request
  return {
    label: 'Request Virtual Meeting',
    style: 'default',
    disabled: false,
  };
}
```

---

## Button 2: Guest Action 1

### Visibility Rules

```javascript
function isGuestAction1Visible(proposal, currentUserId) {
  const status = proposal.Status;
  const config = getStatusConfig(status);

  // Base visibility: status exists and action is not 'Invisible'
  if (!status || config.guestAction1 === 'Invisible') {
    return false;
  }

  // Special case: Remind Split Lease - hide after 3 reminders
  if (config.guestAction1 === 'Remind Split Lease') {
    const reminderCount = proposal['remindersByGuest (number)'] || 0;
    if (reminderCount > 3) {
      return false;
    }
  }

  // Special case: Lease Documents Sent - show only if docs finalized
  if (status === PROPOSAL_STATUS.LEASE_DOCUMENTS_SENT) {
    if (proposal['guest documents review finalized?'] !== true) {
      return false; // Hide until docs are finalized
    }
  }

  // Special case: Go to Leases - always visible when status matches
  if (config.guestAction1 === 'Go to Leases') {
    return true;
  }

  return true;
}
```

### Label & Styling Rules

```javascript
function getGuestAction1ButtonState(proposal) {
  const status = proposal.Status;
  const config = getStatusConfig(status);

  // Special override: Rejected by Host shows Delete with red background
  if (status === PROPOSAL_STATUS.REJECTED_BY_HOST) {
    return {
      label: 'Delete Proposal',
      backgroundColor: '#EF4444',
      style: 'danger',
    };
  }

  // Default: use config label
  return {
    label: config.guestAction1,
    style: 'primary',
  };
}
```

---

## Button 3: Guest Action 2

### Visibility Rules

```javascript
function isGuestAction2Visible(proposal, guest) {
  const status = proposal.Status;
  const config = getStatusConfig(status);

  // Base visibility: action is not 'Invisible'
  if (config.guestAction2 === 'Invisible') {
    return false;
  }

  // Special case: Lease Documents Sent - show only if ID docs submitted
  if (status === PROPOSAL_STATUS.LEASE_DOCUMENTS_SENT) {
    if (guest?.['ID documents submitted?'] !== true) {
      return false;
    }
  }

  return true;
}
```

### Label Rules

```javascript
function getGuestAction2ButtonState(proposal) {
  const status = proposal.Status;
  const config = getStatusConfig(status);

  return {
    label: config.guestAction2,
    style: 'secondary',
  };
}
```

---

## Button 4: Cancel Proposal

### Visibility Rules

```javascript
function isCancelProposalVisible(proposal) {
  const status = proposal.Status;
  const config = getStatusConfig(status);

  // Hidden for SL-submitted proposals awaiting confirmation
  const hiddenStatuses = [
    PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_AWAITING_APPLICATION,
    PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_PENDING_CONFIRMATION,
  ];

  if (hiddenStatuses.includes(status)) {
    return false;
  }

  // Visible when usualOrder > 5 (lease phase)
  if (config.usualOrder > 5) {
    return true;
  }

  // Visible for active proposals (non-terminal)
  const terminalStatuses = [
    PROPOSAL_STATUS.CANCELLED_BY_GUEST,
    PROPOSAL_STATUS.CANCELLED_BY_SPLITLEASE,
    PROPOSAL_STATUS.REJECTED_BY_HOST,
    PROPOSAL_STATUS.INITIAL_PAYMENT_LEASE_ACTIVATED,
  ];

  return !terminalStatuses.includes(status);
}
```

### Label & Styling Rules

```javascript
function getCancelProposalButtonState(proposal, listing) {
  const status = proposal.Status;
  const config = getStatusConfig(status);

  // Terminal statuses: Delete Proposal
  if ([
    PROPOSAL_STATUS.CANCELLED_BY_GUEST,
    PROPOSAL_STATUS.CANCELLED_BY_SPLITLEASE,
    PROPOSAL_STATUS.REJECTED_BY_HOST,
  ].includes(status)) {
    return {
      label: 'Delete Proposal',
      style: 'danger',
    };
  }

  // Rejected by host (before cancellation)
  if (status === PROPOSAL_STATUS.REJECTED_BY_HOST) {
    return {
      label: 'Proposal Rejected',
      style: 'disabled',
      disabled: true,
    };
  }

  // Counteroffer stage: Reject Modified Terms
  if (status === PROPOSAL_STATUS.HOST_COUNTEROFFER) {
    return {
      label: 'Reject Modified Terms',
      style: 'danger',
    };
  }

  // Lease phase (usualOrder > 5) with house manual: See House Manual
  if (config.usualOrder > 5 && listing?.['House manual']) {
    return {
      label: 'See House Manual',
      backgroundColor: '#6D31C2',
      style: 'info',
    };
  }

  // Default: Cancel Proposal
  return {
    label: 'Cancel Proposal',
    style: 'secondary',
  };
}
```

---

## Complete Hook Implementation

```javascript
// app/src/features/guest-proposals/hooks/useProposalButtonStates.js

import { useMemo } from 'react';
import { getStatusConfig, PROPOSAL_STATUS } from '@/config/proposalStatusConfig';

export function useProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {

  return useMemo(() => {
    if (!proposal) {
      return {
        virtualMeeting: { visible: false },
        guestAction1: { visible: false },
        guestAction2: { visible: false },
        cancelProposal: { visible: false },
      };
    }

    const status = proposal.Status;
    const config = getStatusConfig(status);
    const vm = virtualMeeting;

    // ========== BUTTON 1: Virtual Meeting ==========
    const vmHiddenStatuses = [
      PROPOSAL_STATUS.REJECTED_BY_HOST,
      PROPOSAL_STATUS.CANCELLED_BY_SPLITLEASE,
      PROPOSAL_STATUS.INITIAL_PAYMENT_LEASE_ACTIVATED,
      PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_AWAITING_APPLICATION,
      PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_PENDING_CONFIRMATION,
    ];

    let vmButton = { visible: !vmHiddenStatuses.includes(status) };

    if (vmButton.visible) {
      if (vm?.['meeting declined']) {
        vmButton = {
          ...vmButton,
          label: 'Virtual Meeting Declined',
          fontColor: '#DB2E2E',
          bold: true,
          tooltip: 'click to request another one',
          disabled: false,
        };
      } else if (vm?.['booked date'] && vm?.['confirmedBySplitLease']) {
        vmButton = { ...vmButton, label: 'Meeting confirmed', disabled: true };
      } else if (vm?.['booked date']) {
        vmButton = { ...vmButton, label: 'Virtual Meeting Accepted', disabled: true };
      } else if (vm?.['requested by'] === currentUserId) {
        vmButton = { ...vmButton, label: 'Virtual Meeting Requested', disabled: true };
      } else if (vm?.['requested by']) {
        vmButton = { ...vmButton, label: 'Respond to Virtual Meeting Request', disabled: false };
      } else {
        vmButton = { ...vmButton, label: 'Request Virtual Meeting', disabled: false };
      }
    }

    // ========== BUTTON 2: Guest Action 1 ==========
    let ga1Button = { visible: !!status && config.guestAction1 !== 'Invisible' };

    if (ga1Button.visible) {
      // Reminder limit check
      if (config.guestAction1 === 'Remind Split Lease' && (proposal['remindersByGuest (number)'] || 0) > 3) {
        ga1Button.visible = false;
      }
      // Lease docs finalized check
      if (status === PROPOSAL_STATUS.LEASE_DOCUMENTS_SENT && !proposal['guest documents review finalized?']) {
        ga1Button.visible = false;
      }
    }

    if (ga1Button.visible) {
      if (status === PROPOSAL_STATUS.REJECTED_BY_HOST) {
        ga1Button = { ...ga1Button, label: 'Delete Proposal', backgroundColor: '#EF4444' };
      } else {
        ga1Button = { ...ga1Button, label: config.guestAction1 };
      }
    }

    // ========== BUTTON 3: Guest Action 2 ==========
    let ga2Button = { visible: config.guestAction2 !== 'Invisible' };

    if (ga2Button.visible) {
      // ID docs submitted check
      if (status === PROPOSAL_STATUS.LEASE_DOCUMENTS_SENT && !guest?.['ID documents submitted?']) {
        ga2Button.visible = false;
      }
    }

    if (ga2Button.visible) {
      ga2Button = { ...ga2Button, label: config.guestAction2 };
    }

    // ========== BUTTON 4: Cancel Proposal ==========
    const cancelHiddenStatuses = [
      PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_AWAITING_APPLICATION,
      PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_PENDING_CONFIRMATION,
    ];

    let cancelButton = { visible: !cancelHiddenStatuses.includes(status) };

    if (cancelButton.visible) {
      const terminalStatuses = [
        PROPOSAL_STATUS.CANCELLED_BY_GUEST,
        PROPOSAL_STATUS.CANCELLED_BY_SPLITLEASE,
        PROPOSAL_STATUS.REJECTED_BY_HOST,
      ];

      if (terminalStatuses.includes(status)) {
        cancelButton = { ...cancelButton, label: 'Delete Proposal' };
      } else if (status === PROPOSAL_STATUS.HOST_COUNTEROFFER) {
        cancelButton = { ...cancelButton, label: 'Reject Modified Terms' };
      } else if (config.usualOrder > 5 && listing?.['House manual']) {
        cancelButton = { ...cancelButton, label: 'See House Manual', backgroundColor: '#6D31C2' };
      } else if (config.usualOrder > 5) {
        cancelButton.visible = true; // Still show but as cancel
        cancelButton.label = 'Cancel Proposal';
      } else {
        cancelButton = { ...cancelButton, label: 'Cancel Proposal' };
      }
    }

    return {
      virtualMeeting: vmButton,
      guestAction1: ga1Button,
      guestAction2: ga2Button,
      cancelProposal: cancelButton,
    };

  }, [proposal, virtualMeeting, guest, listing, currentUserId]);
}
```

---

## Summary Matrix

| Status | VM Button | Action 1 | Action 2 | Cancel |
|--------|-----------|----------|----------|--------|
| Pending | Request VM | View Proposal | Hidden | Cancel |
| Host Review | Request VM | Remind SL* | Hidden | Cancel |
| Submitted - Awaiting App | Request VM | Complete App | Hidden | Cancel |
| SL Submitted - Awaiting | Hidden | Complete App | Hidden | Hidden |
| SL Submitted - Pending | Hidden | Confirm | Hidden | Hidden |
| Host Counteroffer | Request VM | Review | Accept Terms | Reject Terms |
| Accepted/Drafting | Request VM | Remind SL* | Hidden | Cancel |
| Lease Docs Sent | Request VM | Review Docs** | Submit ID*** | House Manual/Cancel |
| Payment/Activated | Hidden | Go to Leases | Hidden | House Manual |
| Cancelled by Guest | Hidden | Delete | Hidden | Delete |
| Cancelled by SL | Hidden | Delete | Hidden | Delete |
| Rejected by Host | Hidden | Delete (red) | Hidden | Delete |

*Hidden after 3 reminders
**Visible only if `guest documents review finalized?` = true
***Visible only if `ID documents submitted?` = true

---

## Files to Create/Modify

1. **NEW**: `app/src/config/proposalStatusConfig.js` - Status constants and configuration
2. **NEW**: `app/src/features/guest-proposals/hooks/useProposalButtonStates.js` - Button state logic hook
3. **MODIFY**: Guest proposals page component to use the hook

---

## Data Requirements

Each proposal card needs:
```javascript
{
  proposal: {
    Status: string,
    'guest documents review finalized?': boolean,
    'remindersByGuest (number)': number,
  },
  virtualMeeting: {
    'requested by': string,
    'booked date': timestamp,
    'confirmedBySplitLease': boolean,
    'meeting declined': boolean,
  },
  guest: {
    'ID documents submitted?': boolean,
  },
  listing: {
    'House manual': string,
  },
  currentUserId: string,
}
```
