# Virtual Meeting Popup - Guest Proposals Page Integration Plan

> **Created**: 2025-12-02
> **Related Commit**: 9f1c460 (feat(virtual-meeting): add VirtualMeetingManager shared island component)
> **Target Page**: `guest-proposals.html` / `GuestProposalsPage.jsx`

---

## Executive Summary

This plan describes integrating the new `VirtualMeetingManager` component (4-view modal system) into the Guest Proposals page. The integration requires:
1. Adding state management for modal visibility and view selection
2. Mapping Bubble's 8 button conditionals to React state logic
3. Determining which popup view to display based on VM state
4. Wiring button click handlers to open the appropriate view

---

## Part 1: Button Conditional Matrix

### 1.1 Bubble Conditional Reference (8 Conditionals)

| # | Condition | Button Label | Style | Action |
|---|-----------|--------------|-------|--------|
| 1 | `virtualMeeting.requested_by !== currentUserId` AND `virtualMeeting !== null` | "Respond to Virtual Meeting Request" | Default | Open `respond` view |
| 2 | `virtualMeeting.requested_by === currentUserId` | "Virtual Meeting Requested" | Disabled | No action (waiting) |
| 3 | Button pressed | Inset shadow style | - | Visual feedback |
| 4 | `virtualMeeting.booked_date !== null` AND `confirmedBySplitLease === false` | "Virtual Meeting Accepted" | Disabled | No action (awaiting SL) |
| 5 | `virtualMeeting.booked_date !== null` AND `confirmedBySplitLease === true` | "Meeting confirmed" | Success | Open `details` view |
| 6 | `virtualMeeting.meeting_declined === true` | "Virtual Meeting Declined" | Red text, bold | Open `request` view (alternative) |
| 7 | `Status` is Rejected/Cancelled/Lease activated | **HIDDEN** | - | - |
| 8 | `Status` is SL-suggested awaiting rental app/pending confirmation | **HIDDEN** | - | - |

### 1.2 Status-Based Visibility Rules

**Button is HIDDEN when proposal status is any of:**
- `Proposal Rejected by Host`
- `Proposal Cancelled by Split Lease`
- `Initial Payment Submitted / Lease activated`
- `Proposal Submitted for guest by Split Lease - Awaiting Rental Application`
- `Proposal Submitted for guest by Split Lease - Pending Confirmation`

**Already implemented in:** `statusButtonConfig.js` → `shouldHideVirtualMeetingButton()`

---

## Part 2: VM State → Popup View Mapping

### 2.1 State Machine

```
                    ┌─────────────────────────────────────────────────────┐
                    │              Virtual Meeting States                  │
                    └─────────────────────────────────────────────────────┘

┌─────────────────────┐
│  NO_MEETING         │ ──→ Button: "Request Virtual Meeting"
│  (vm === null)      │     View: 'request'
└─────────────────────┘     Disabled: false

┌─────────────────────┐
│  REQUESTED_BY_GUEST │ ──→ Button: "Virtual Meeting Requested"
│  (vm.requested_by   │     View: N/A (no click action)
│   === currentUserId │     Disabled: true
│   && !booked_date)  │
└─────────────────────┘

┌─────────────────────┐
│  REQUESTED_BY_HOST  │ ──→ Button: "Respond to Virtual Meeting Request"
│  (vm.requested_by   │     View: 'respond'
│   !== currentUserId │     Disabled: false
│   && !booked_date)  │
└─────────────────────┘

┌─────────────────────┐
│  BOOKED_AWAITING_   │ ──→ Button: "Virtual Meeting Accepted"
│  CONFIRMATION       │     View: 'details' (shows pending state)
│  (booked_date &&    │     Disabled: true (or clickable for details?)
│   !confirmedBySL)   │
└─────────────────────┘

┌─────────────────────┐
│  CONFIRMED          │ ──→ Button: "Meeting confirmed"
│  (booked_date &&    │     View: 'details'
│   confirmedBySL)    │     Disabled: false
└─────────────────────┘

┌─────────────────────┐
│  DECLINED           │ ──→ Button: "Virtual Meeting Declined"
│  (meeting_declined) │     View: 'request' (as alternative suggestion)
│                     │     Disabled: false
│                     │     Style: Red (#DB2E2E), bold
└─────────────────────┘
```

### 2.2 View Selection Logic (Pseudocode)

```javascript
function determineVMView(virtualMeeting, currentUserId) {
  // Hidden states - don't show modal
  if (shouldHideVirtualMeetingButton(proposalStatus)) {
    return null;
  }

  // No VM exists - request new meeting
  if (!virtualMeeting) {
    return 'request';
  }

  // VM was declined - suggest alternative times
  if (virtualMeeting['meeting declined'] === true) {
    return 'request'; // isSuggesting = true in VirtualMeetingManager
  }

  // Meeting confirmed by Split Lease - show details
  if (virtualMeeting['booked date'] && virtualMeeting['confirmedBySplitLease'] === true) {
    return 'details';
  }

  // Meeting accepted but not confirmed - show details (pending state)
  if (virtualMeeting['booked date'] && !virtualMeeting['confirmedBySplitLease']) {
    return 'details';
  }

  // Current user requested - button disabled, no view
  if (virtualMeeting['requested by'] === currentUserId) {
    return null; // Button disabled
  }

  // Other party requested - respond view
  if (virtualMeeting['requested by'] && virtualMeeting['requested by'] !== currentUserId) {
    return 'respond';
  }

  // Fallback - request view
  return 'request';
}
```

---

## Part 3: Implementation Steps

### 3.1 File Modifications Required

| File | Change Type | Description |
|------|-------------|-------------|
| `ProposalCard.jsx` | Modify | Add VM modal state, import VirtualMeetingManager, wire click handler |
| `useGuestProposalsPageLogic.js` | Modify | Add currentUser to return (already has `user`) |
| `lib/proposals/statusButtonConfig.js` | No change | Already has `shouldHideVirtualMeetingButton()` |
| `logic/rules/proposals/virtualMeetingRules.js` | Use existing | Contains `getVMStateInfo()`, `getVirtualMeetingState()` |

### 3.2 Step-by-Step Implementation

#### Step 1: Add VirtualMeetingManager Import to ProposalCard

```jsx
// In ProposalCard.jsx, add import:
import { VirtualMeetingManager } from '../../shared/VirtualMeetingManager';
```

#### Step 2: Add Modal State in ProposalCard

```jsx
// Add state for VM modal
const [showVMModal, setShowVMModal] = useState(false);
const [vmInitialView, setVmInitialView] = useState('');
```

#### Step 3: Create View Selection Helper Function

```jsx
/**
 * Determine the initial view for VirtualMeetingManager based on VM state
 * Implements the 8 Bubble conditionals
 */
function getVMInitialView(virtualMeeting, currentUserId) {
  // 1. No VM exists - request new meeting
  if (!virtualMeeting) {
    return { view: 'request', disabled: false, label: 'Request Virtual Meeting' };
  }

  // 6. VM declined - can request alternative
  if (virtualMeeting['meeting declined'] === true) {
    return {
      view: 'request',
      disabled: false,
      label: 'Virtual Meeting Declined',
      style: { color: '#DB2E2E', fontWeight: 'bold' }
    };
  }

  // 5. Meeting confirmed by Split Lease
  if (virtualMeeting['booked date'] && virtualMeeting['confirmedBySplitLease'] === true) {
    return { view: 'details', disabled: false, label: 'Meeting confirmed' };
  }

  // 4. Meeting accepted but awaiting SL confirmation
  if (virtualMeeting['booked date'] && !virtualMeeting['confirmedBySplitLease']) {
    return { view: 'details', disabled: true, label: 'Virtual Meeting Accepted' };
  }

  // 2. Current user requested - waiting for response
  if (virtualMeeting['requested by'] === currentUserId) {
    return { view: null, disabled: true, label: 'Virtual Meeting Requested' };
  }

  // 1. Other party requested - respond
  if (virtualMeeting['requested by'] && virtualMeeting['requested by'] !== currentUserId) {
    return { view: 'respond', disabled: false, label: 'Respond to Virtual Meeting Request' };
  }

  // Default
  return { view: 'request', disabled: false, label: 'Request Virtual Meeting' };
}
```

#### Step 4: Update VM Button Click Handler

```jsx
// In ProposalCard.jsx, replace VM button with:
const handleVMButtonClick = () => {
  const vmConfig = getVMInitialView(virtualMeeting, currentUserId);
  if (vmConfig.view && !vmConfig.disabled) {
    setVmInitialView(vmConfig.view);
    setShowVMModal(true);
  }
};
```

#### Step 5: Add Modal to ProposalCard JSX

```jsx
{/* Virtual Meeting Manager Modal */}
{showVMModal && (
  <VirtualMeetingManager
    proposal={proposal}
    initialView={vmInitialView}
    currentUser={{ _id: currentUserId, typeUserSignup: 'guest' }}
    onClose={() => {
      setShowVMModal(false);
      setVmInitialView('');
    }}
    onSuccess={() => {
      // Trigger page refresh to get updated VM data
      window.location.reload();
    }}
  />
)}
```

#### Step 6: Ensure currentUser is Available

The `currentUserId` is already available in ProposalCard as `proposal.Guest`. However, for the `VirtualMeetingManager` component, we need a user object. Add this to the component:

```jsx
// Construct current user object for VirtualMeetingManager
const currentUser = {
  _id: proposal.Guest,
  typeUserSignup: 'guest'
};
```

---

## Part 4: Button Rendering Logic

### 4.1 Complete Button Conditional Implementation

```jsx
// Replace existing VM button rendering in ProposalCard.jsx pricing-bar section

// Get VM configuration based on current state
const vmConfig = getVMInitialView(virtualMeeting, currentUserId);

// Check if VM button should be visible (status-based hiding)
const vmButtonVisible = buttonConfig?.vmButton?.visible ?? !shouldHideVirtualMeetingButton(status);

// Render VM button
{vmButtonVisible && (
  <button
    className={`btn-action-bar ${
      vmConfig.label.includes('Declined') ? 'btn-vm-declined' :
      vmConfig.label.includes('confirmed') ? 'btn-vm-confirmed' :
      vmConfig.label.includes('Accepted') ? 'btn-vm-accepted' :
      vmConfig.label.includes('Requested') ? 'btn-vm-requested' :
      vmConfig.label.includes('Respond') ? 'btn-vm-respond' :
      'btn-vm-request'
    }`}
    disabled={vmConfig.disabled}
    style={vmConfig.style || undefined}
    onClick={handleVMButtonClick}
  >
    {vmConfig.label}
  </button>
)}
```

### 4.2 CSS Classes for VM Button States

Add to `guest-proposals.css`:

```css
/* Virtual Meeting Button States */
.btn-vm-request {
  background-color: var(--color-primary);
  color: white;
}

.btn-vm-respond {
  background-color: #3B82F6; /* Blue - action needed */
  color: white;
}

.btn-vm-requested {
  background-color: #9CA3AF; /* Gray - waiting */
  color: white;
  cursor: not-allowed;
}

.btn-vm-accepted {
  background-color: #10B981; /* Green - positive state */
  color: white;
  cursor: not-allowed;
}

.btn-vm-confirmed {
  background-color: #059669; /* Darker green - confirmed */
  color: white;
}

.btn-vm-declined {
  background-color: transparent;
  color: #DB2E2E;
  font-weight: bold;
  border: 1px solid #DB2E2E;
}

.btn-vm-declined:hover {
  background-color: #FEE2E2;
}
```

---

## Part 5: Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW                                         │
└──────────────────────────────────────────────────────────────────────────┘

1. Page Load
   └─→ useGuestProposalsPageLogic()
       └─→ fetchUserProposalsFromUrl()
           └─→ fetchProposalsByIds()
               └─→ Fetch from 'virtualmeetingschedulesandlinks' table
                   └─→ Attach VM to each proposal as proposal.virtualMeeting

2. ProposalCard Renders
   └─→ Extract: proposal.virtualMeeting
   └─→ Extract: proposal.Guest (currentUserId)
   └─→ getVMInitialView(virtualMeeting, currentUserId)
       └─→ Returns: { view, disabled, label, style }
   └─→ Render VM button with computed state

3. User Clicks VM Button
   └─→ handleVMButtonClick()
       └─→ setVmInitialView(view)
       └─→ setShowVMModal(true)

4. VirtualMeetingManager Opens
   └─→ Props: { proposal, initialView, currentUser, onClose, onSuccess }
   └─→ Renders appropriate view based on initialView

5. User Completes Action (confirm/request/decline/cancel)
   └─→ virtualMeetingService API call
       └─→ Supabase Edge Function → Bubble workflow
   └─→ onSuccess callback
       └─→ window.location.reload()
           └─→ Fresh data with updated VM state
```

---

## Part 6: Testing Checklist

### 6.1 State Transition Tests

| Initial State | User Action | Expected Result |
|---------------|-------------|-----------------|
| No VM exists | Click "Request Virtual Meeting" | Opens `request` view |
| VM requested by guest | Button shows "Virtual Meeting Requested" | Button disabled |
| VM requested by host | Click "Respond to Virtual Meeting Request" | Opens `respond` view |
| VM booked, not confirmed | Button shows "Virtual Meeting Accepted" | Button disabled OR opens `details` |
| VM booked, confirmed | Click "Meeting confirmed" | Opens `details` view with meeting link |
| VM declined | Click "Virtual Meeting Declined" | Opens `request` view (alternative mode) |

### 6.2 Visibility Tests

| Proposal Status | VM Button Expected |
|-----------------|-------------------|
| `Proposal Rejected by Host` | Hidden |
| `Proposal Cancelled by Split Lease` | Hidden |
| `Initial Payment Submitted / Lease activated` | Hidden |
| `Proposal Submitted for guest by Split Lease - Awaiting Rental Application` | Hidden |
| `Proposal Submitted for guest by Split Lease - Pending Confirmation` | Hidden |
| All other active statuses | Visible |

### 6.3 Integration Tests

- [ ] VM data is correctly fetched from `virtualmeetingschedulesandlinks`
- [ ] Button label matches VM state
- [ ] Modal opens with correct initial view
- [ ] Confirm action updates VM record
- [ ] Decline action updates VM record
- [ ] Cancel action removes VM record
- [ ] Page refreshes after successful action

---

## Part 7: Important Files Reference

| File | Purpose | Key Exports/Functions |
|------|---------|----------------------|
| `app/src/islands/pages/proposals/ProposalCard.jsx` | Main component to modify | `ProposalCard` |
| `app/src/islands/shared/VirtualMeetingManager/` | New popup component | `VirtualMeetingManager` |
| `app/src/lib/proposals/statusButtonConfig.js` | Status-based visibility | `shouldHideVirtualMeetingButton()` |
| `app/src/logic/rules/proposals/virtualMeetingRules.js` | VM state rules | `getVMStateInfo()`, `VM_STATES` |
| `app/src/lib/proposals/userProposalQueries.js` | Data fetching | Fetches `virtualmeetingschedulesandlinks` |
| `app/src/styles/components/guest-proposals.css` | Button styles | VM button CSS classes |

---

## Part 8: Database Schema Reference

### virtualmeetingschedulesandlinks Table

| Column | Type | Description |
|--------|------|-------------|
| `_id` | UUID | Primary key |
| `proposal` | UUID | FK to proposal._id |
| `booked date` | Timestamp | Confirmed meeting datetime |
| `confirmedBySplitLease` | Boolean | Whether SL confirmed the meeting |
| `meeting link` | Text | Google Meet/Zoom link |
| `meeting declined` | Boolean | Whether meeting was declined |
| `requested by` | UUID | FK to user._id (who requested) |
| `suggested dates and times` | JSONB | Array of proposed times |
| `guest name` | Text | Guest display name |
| `host name` | Text | Host display name |

---

## Appendix: Complete ProposalCard VM Section Code

```jsx
// ============================================================================
// VIRTUAL MEETING MODAL STATE
// ============================================================================

const [showVMModal, setShowVMModal] = useState(false);
const [vmInitialView, setVmInitialView] = useState('');

// Construct current user for VirtualMeetingManager
const currentUser = {
  _id: proposal.Guest,
  typeUserSignup: 'guest'
};

// Determine VM button state based on 8 Bubble conditionals
const vmConfig = useMemo(() => {
  // Check status-based hiding first
  if (shouldHideVirtualMeetingButton(status)) {
    return { visible: false };
  }

  // No VM exists
  if (!virtualMeeting) {
    return {
      visible: true,
      view: 'request',
      disabled: false,
      label: 'Request Virtual Meeting',
      className: 'btn-vm-request'
    };
  }

  // VM declined
  if (virtualMeeting['meeting declined'] === true) {
    return {
      visible: true,
      view: 'request',
      disabled: false,
      label: 'Virtual Meeting Declined',
      className: 'btn-vm-declined',
      style: { color: '#DB2E2E', fontWeight: 'bold' }
    };
  }

  // Meeting confirmed
  if (virtualMeeting['booked date'] && virtualMeeting['confirmedBySplitLease'] === true) {
    return {
      visible: true,
      view: 'details',
      disabled: false,
      label: 'Meeting confirmed',
      className: 'btn-vm-confirmed'
    };
  }

  // Meeting accepted, awaiting confirmation
  if (virtualMeeting['booked date'] && !virtualMeeting['confirmedBySplitLease']) {
    return {
      visible: true,
      view: 'details',
      disabled: true,
      label: 'Virtual Meeting Accepted',
      className: 'btn-vm-accepted'
    };
  }

  // Current user requested - waiting
  if (virtualMeeting['requested by'] === currentUserId) {
    return {
      visible: true,
      view: null,
      disabled: true,
      label: 'Virtual Meeting Requested',
      className: 'btn-vm-requested'
    };
  }

  // Other party requested - respond
  if (virtualMeeting['requested by'] && virtualMeeting['requested by'] !== currentUserId) {
    return {
      visible: true,
      view: 'respond',
      disabled: false,
      label: 'Respond to Virtual Meeting Request',
      className: 'btn-vm-respond'
    };
  }

  // Default fallback
  return {
    visible: true,
    view: 'request',
    disabled: false,
    label: 'Request Virtual Meeting',
    className: 'btn-vm-request'
  };
}, [virtualMeeting, currentUserId, status]);

// Handler for VM button click
const handleVMButtonClick = () => {
  if (vmConfig.view && !vmConfig.disabled) {
    setVmInitialView(vmConfig.view);
    setShowVMModal(true);
  }
};

// Handler for modal close
const handleVMModalClose = () => {
  setShowVMModal(false);
  setVmInitialView('');
};

// Handler for successful VM action
const handleVMSuccess = () => {
  // Reload page to get fresh VM data
  window.location.reload();
};
```

**JSX Button Rendering:**
```jsx
{/* Virtual Meeting Button */}
{vmConfig.visible && (
  <button
    className={`btn-action-bar ${vmConfig.className}`}
    disabled={vmConfig.disabled}
    style={vmConfig.style || undefined}
    onClick={handleVMButtonClick}
  >
    {vmConfig.label}
  </button>
)}
```

**JSX Modal Rendering:**
```jsx
{/* Virtual Meeting Manager Modal */}
{showVMModal && (
  <VirtualMeetingManager
    proposal={proposal}
    initialView={vmInitialView}
    currentUser={currentUser}
    onClose={handleVMModalClose}
    onSuccess={handleVMSuccess}
  />
)}
```

---

**End of Implementation Plan**
