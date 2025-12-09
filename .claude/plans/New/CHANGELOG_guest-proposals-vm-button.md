# Conversation Changelog - Guest Proposals VM Button

**Date**: 2025-12-02
**Status**: Paused - Awaiting Clarification

---

## Context

**Task**: Add functionality to the "Request Virtual Meeting" button in the guest-proposals page pricing bar.

**Target Button**: `<button class="btn-action-bar btn-vm-request">Request Virtual Meeting</button>`

---

## What Was Done

### 1. Primed on Codebase

Read and understood the following files:

| File | Purpose |
|------|---------|
| `GuestProposalsPage.jsx` | Main page component (Hollow Pattern) |
| `ProposalCard.jsx` | Contains pricing bar with 4 button sections |
| `useGuestProposalsPageLogic.js` | Hook providing `buttonConfig` |
| `statusButtonConfig.js` | Fetches `os_proposal_status` for dynamic labels |
| `proposalStatuses.js` | Status definitions and helpers |

### 2. Read Context File

`Deprecated\docs\Button Conditionals - Guest Proposals Page.md` - Documents all 4 pricing bar buttons:

1. **REQUEST VIRTUAL MEETING** (8 Conditionals)
2. **GUEST ACTION 1** (10 Conditionals)
3. **GUEST ACTION 2** (5 Conditionals)
4. **CANCEL PROPOSAL** (6 Conditionals)

### 3. Attempted Implementation (ROLLED BACK)

Made changes to `ProposalCard.jsx`:
- Added import for `VirtualMeetingModal`
- Added `showVirtualMeetingModal` state
- Added onClick handler to VM button for "Request Virtual Meeting" label
- Rendered `VirtualMeetingModal` with `view="request"`

**Commit**: `eae0dd5` - `feat(guest-proposals): add Virtual Meeting modal for Request button`

### 4. Rolled Back

User expected a **different popup** that already exists in the codebase.

Command used: `git reset --hard HEAD~1`

---

## Existing VM Infrastructure Found

| File | Location | Purpose |
|------|----------|---------|
| `VirtualMeetingModal.jsx` | `app/src/islands/modals/` | 5-state modal (request, respond, details, cancel, alternative) |
| `virtualMeetingWorkflow.js` | `app/src/logic/workflows/proposals/` | `requestVirtualMeeting()`, `respondToVirtualMeeting()`, `declineVirtualMeeting()` |
| `virtualMeetingRules.js` | `app/src/logic/rules/proposals/` | `getVMButtonText()`, `canRequestNewMeeting()`, `getVMStateInfo()` |

### VirtualMeetingModal Props

```jsx
<VirtualMeetingModal
  proposal={proposal}
  virtualMeeting={virtualMeeting}
  currentUser={{ _id: currentUserId }}
  view="request" // 'request', 'respond', 'details', 'cancel', 'alternative'
  onClose={() => setShowVirtualMeetingModal(false)}
  onSuccess={() => { /* refresh data */ }}
/>
```

---

## Current State

- **Branch**: `main` (ahead of origin by 3 commits)
- **Last commit**: `50348e4` - `docs(database): add 2-tier context documentation system`
- **ProposalCard.jsx**: Unchanged from original

---

## Open Question

User expected an **existing popup** for VM requests. Needs clarification:

1. Is it a **Bubble.io reusable element** to migrate? (workflow docs mention `crkfZ5: Populate & Display respond-request-cancel-vm reusable element`)
2. A **different React component** in the codebase?
3. A **simpler date/time picker** pattern (not a full modal)?

---

## Key Files for Next Session

```
app/src/islands/pages/proposals/ProposalCard.jsx        # VM button at lines 835-859
app/src/islands/modals/VirtualMeetingModal.jsx          # Existing modal component
app/src/logic/workflows/proposals/virtualMeetingWorkflow.js
app/src/logic/rules/proposals/virtualMeetingRules.js
Deprecated/docs/Button Conditionals - Guest Proposals Page.md
```

---

## Next Steps

1. Clarify which popup the user expects
2. If it's `VirtualMeetingModal.jsx`, re-implement the wiring
3. If it's a Bubble element, may need to migrate or create new component
