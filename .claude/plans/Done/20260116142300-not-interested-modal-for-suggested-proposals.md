# Not Interested Modal for Suggested Proposals

**Created**: 2026-01-16 14:23:00
**Classification**: BUILD
**Status**: Ready for Implementation

---

## Summary

Implement functionality for the "Not Interested" button on suggested proposals. Currently the button exists but has no functionality. The implementation adds a modal dialog with optional freeform text input where users can explain why the suggestion is not suitable, then marks the proposal as deleted.

---

## Current State Analysis

### Existing Flow
1. **SuggestedProposalPopup.jsx** - Main popup displaying suggested proposals
2. **ActionButtons.jsx** - Contains "I'm Interested" and "Remove" buttons
3. **useSuggestedProposals.js** - Hook managing state and actions
4. **suggestedProposalService.js** - API service with `dismissProposal()` function
5. **Header.jsx** - Consumes the popup and handles `onRemove` via `handleProposalRemove`

### Current "Remove" Button Behavior
- The "Remove" button exists in `ActionButtons.jsx` (line 46-62)
- It calls `onRemove` prop which maps to `handleRemove` in `useSuggestedProposals.js`
- `handleRemove` immediately calls `dismissProposal()` which sets `Deleted: true` on the proposal
- **No modal confirmation or feedback collection** - this is what needs to be added

---

## Implementation Plan

### Phase 1: Create NotInterestedModal Component

**File**: `app/src/islands/shared/SuggestedProposals/components/NotInterestedModal.jsx`

Create a new modal component following the existing `CancelProposalModal.jsx` pattern:
- Modal overlay with backdrop click to close
- Header with title "Not Interested?"
- Body with:
  - Brief message: "Let us know why this suggestion doesn't work for you (optional)"
  - Freeform textarea input (optional - user can leave blank)
  - Character limit indicator (500 chars max)
- Footer with:
  - "Cancel" button (secondary style)
  - "Confirm" button (primary style, but muted/red-ish to indicate negative action)

### Phase 2: Add CSS Styles

**File**: `app/src/islands/shared/SuggestedProposals/components/NotInterestedModal.css`

Following the sp- prefix convention from existing CSS:
- Reuse existing CSS variables from `SuggestedProposalPopup.css`
- Style modal overlay, card, header, body, footer
- Style textarea with proper padding and border
- Mobile responsive layout

### Phase 3: Update Service Layer

**File**: `app/src/islands/shared/SuggestedProposals/suggestedProposalService.js`

Modify `dismissProposal()` function to:
- Accept optional `feedback` parameter
- Store feedback in a new field OR existing notes field on proposal
- Keep the `Deleted: true` update

```javascript
export async function dismissProposal(proposalId, feedback = null) {
  const updatePayload = {
    Deleted: true,
    'Modified Date': new Date().toISOString()
  };

  // Store feedback if provided
  if (feedback && feedback.trim()) {
    updatePayload['Not Interested Feedback'] = feedback.trim();
  }

  // ... rest of update logic
}
```

### Phase 4: Update Hook to Support Modal

**File**: `app/src/islands/shared/SuggestedProposals/useSuggestedProposals.js`

Add:
- `isNotInterestedModalOpen` state
- `openNotInterestedModal()` function
- `closeNotInterestedModal()` function
- `confirmNotInterested(feedback)` function that calls dismissProposal with feedback

Modify:
- `handleRemove` should now open the modal instead of directly dismissing

### Phase 5: Update ActionButtons Component

**File**: `app/src/islands/shared/SuggestedProposals/components/ActionButtons.jsx`

Change:
- "Remove" button text to "Not Interested" for clarity
- The button should call a new `onNotInterested` prop instead of `onRemove`

### Phase 6: Update SuggestedProposalPopup

**File**: `app/src/islands/shared/SuggestedProposals/SuggestedProposalPopup.jsx`

Add:
- Import and render `NotInterestedModal`
- Pass modal state and handlers from parent

### Phase 7: Update Header.jsx Integration

**File**: `app/src/islands/shared/Header.jsx`

Update `handleProposalRemove` to:
- Open the Not Interested modal
- Handle the confirmation with feedback

### Phase 8: Update Index Exports

**File**: `app/src/islands/shared/SuggestedProposals/index.js`

Add exports for new modal component if needed externally.

---

## Data Flow After Implementation

```
User clicks "Not Interested" button
        │
        ▼
NotInterestedModal opens
        │
        ├── User enters feedback (optional)
        │
        ▼
User clicks "Confirm"
        │
        ▼
confirmNotInterested(feedback) called
        │
        ▼
dismissProposal(proposalId, feedback) API call
        │
        ├── Updates proposal.Deleted = true
        ├── Updates proposal.'Not Interested Feedback' = feedback
        ├── Updates proposal.'Modified Date'
        │
        ▼
Local state updated (_dismissed = true)
        │
        ▼
Modal closes, proposal removed from list
```

---

## UI/UX Considerations

1. **Optional Feedback**: The textarea is optional - users can confirm without typing anything
2. **Clear Action**: Button changes from "Remove" to "Not Interested" for clarity
3. **Soft Confirmation**: Not as alarming as cancel/reject (no red trash icon), but still confirmation-focused
4. **Quick Dismissal**: User can click Cancel or backdrop to abort without consequences

---

## Database Considerations

The `proposal` table should already have flexible columns. If `Not Interested Feedback` field doesn't exist:
- Option A: Use existing text field like `notes` or `Guest Comments`
- Option B: Create migration to add new column (requires explicit user approval)

**Recommended**: Check existing schema first, use existing field if available, otherwise implement with existing general text field.

---

## Files to Modify

| File | Action |
|------|--------|
| `app/src/islands/shared/SuggestedProposals/components/NotInterestedModal.jsx` | **CREATE** |
| `app/src/islands/shared/SuggestedProposals/components/NotInterestedModal.css` | **CREATE** |
| `app/src/islands/shared/SuggestedProposals/suggestedProposalService.js` | MODIFY |
| `app/src/islands/shared/SuggestedProposals/useSuggestedProposals.js` | MODIFY |
| `app/src/islands/shared/SuggestedProposals/components/ActionButtons.jsx` | MODIFY |
| `app/src/islands/shared/SuggestedProposals/SuggestedProposalPopup.jsx` | MODIFY |
| `app/src/islands/shared/Header.jsx` | MODIFY |
| `app/src/islands/shared/SuggestedProposals/index.js` | MODIFY |

---

## Testing Checklist

- [ ] Not Interested button opens modal
- [ ] Modal displays correctly on desktop
- [ ] Modal displays correctly on mobile
- [ ] Can close modal via Cancel button
- [ ] Can close modal via backdrop click
- [ ] Can close modal via ESC key
- [ ] Can confirm without entering feedback
- [ ] Can confirm with feedback text
- [ ] Proposal is removed from list after confirmation
- [ ] Proposal is marked as deleted in database
- [ ] Feedback is stored if provided
- [ ] Counter updates after dismissal
- [ ] Auto-closes popup when last proposal dismissed

---

## Reference Files

- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\modals\CancelProposalModal.jsx` - Modal pattern reference
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\shared\SuggestedProposals\SuggestedProposalPopup.css` - CSS variables and patterns
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\shared\SuggestedProposals\useSuggestedProposals.js` - Hook patterns
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\shared\SuggestedProposals\suggestedProposalService.js` - API service
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\shared\SuggestedProposals\components\ActionButtons.jsx` - Current button component
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\shared\SuggestedProposals\SuggestedProposalPopup.jsx` - Main popup
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\shared\Header.jsx` - Integration point
