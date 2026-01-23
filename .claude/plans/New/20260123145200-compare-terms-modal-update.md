# Implementation Plan: CompareTermsModal Update for Guest Proposals Page

## Overview

This plan details the comprehensive update of the `CompareTermsModal` component to match the Bubble specification requirements. The modal enables guests to compare their original proposal terms with the host's counteroffer and take action (accept, decline, or close). The primary integration point is the GuestProposalsPage via the ExpandableProposalCard component.

## Success Criteria

- [ ] Modal follows Bubble spec styling (55% width, non-dismissible overlay, 10px border-radius, prominent shadow)
- [ ] Modal cannot be dismissed via Escape key
- [ ] Two-column comparison layout displays: Move-in dates, Duration, Schedule (S M T W T F S day buttons), Nights count, House Rules
- [ ] Reservation details section shows all required pricing fields side-by-side
- [ ] Negotiation summary section displays when summaries exist
- [ ] Three action buttons: Cancel Proposal (red), Close (blue), Accept Host Terms (green)
- [ ] "Check the full document" link present
- [ ] All workflows functional: Close, Cancel Proposal, Accept Host Terms
- [ ] Modal integrated into GuestProposalsPage via ExpandableProposalCard
- [ ] Hollow Component pattern maintained (logic in hook)

---

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/modals/CompareTermsModal.jsx` | Main modal component | Complete rewrite to match Bubble spec |
| `app/src/islands/modals/CompareTermsModal.css` | Modal styles | Create new file with spec-compliant styles |
| `app/src/islands/pages/proposals/ExpandableProposalCard.jsx` | Card component in GuestProposalsPage | Add "Review Host Terms" button and CompareTermsModal integration |
| `app/src/islands/pages/proposals/displayUtils.js` | Helper utilities | May need new helper for schedule display |
| `app/src/logic/workflows/proposals/counterofferWorkflow.js` | Accept/decline logic | Already exists, will be used |
| `app/src/lib/proposals/dataTransformers.js` | Data formatting utilities | Already has formatPrice, formatDate |
| `app/src/logic/constants/proposalStatuses.js` | Status definitions | Reference for status updates |
| `app/src/lib/dayUtils.js` | Day utilities | Reference for day display |

### Related Documentation

- Bubble migration spec (user-provided) - Primary requirements source
- `app/src/islands/modals/CancelProposalModal.jsx` - Modal pattern reference
- `app/src/islands/pages/proposals/ExpandableProposalCard.jsx` - Integration point reference

### Existing Patterns to Follow

1. **Portal-based Modals**: Use `createPortal` for rendering (see `CancelProposalModal.jsx`)
2. **Inline Styles for Modal Isolation**: Ensure styles work when rendered via portal
3. **Hollow Component Pattern**: Logic in hooks, UI in components
4. **Day Indexing**: 0-6 (Sunday=0 through Saturday=6)
5. **Price Formatting**: Use `formatPrice` from `dataTransformers.js`

---

## Implementation Steps

### Step 1: Create useCompareTermsModalLogic Hook

**Files:** `app/src/islands/modals/useCompareTermsModalLogic.js` (new file)

**Purpose:** Extract all business logic from the modal into a dedicated hook following the Hollow Component pattern.

**Details:**
- Create hook that accepts `proposal`, `onClose`, `onAcceptCounteroffer`, `onCancelProposal` props
- Implement `handleAcceptCounteroffer` using existing `acceptCounteroffer` from `counterofferWorkflow.js`
- Implement `handleCancelProposal` that opens CancelProposalModal or calls cancel workflow
- Implement `handleClose` that just calls `onClose`
- Derive comparison data using `getTermsComparison` from `counterofferWorkflow.js`
- Parse and format all display data (days, prices, dates)
- Return: `{ loading, originalTerms, counterofferTerms, negotiationSummaries, handlers }`

**Validation:** Hook exports correctly and can be imported in modal component.

---

### Step 2: Create CompareTermsModal.css Stylesheet

**Files:** `app/src/islands/modals/CompareTermsModal.css` (new file)

**Purpose:** Implement Bubble spec styling for the modal.

**Details:**
- Modal container: 55% viewport width, max 90% height, white background (#FFFFFF), 10px border radius
- Shadow: 0 50px 80px rgba(0, 0, 0, 0.25)
- Grayout overlay: #747474 with no blur, non-dismissible
- Header styling: "Compare Terms" title, fa-times close icon
- Two-column layout for terms comparison
- Day button pills: S M T W T F S with selected state highlighting (use existing day-button pattern)
- Reservation details table styling with alternating rows
- Action button styling: Cancel (red #DC2626), Close (blue #3B82F6), Accept (green #16A34A)
- Mobile responsive breakpoints

**Validation:** Styles apply correctly when imported into modal component.

---

### Step 3: Rewrite CompareTermsModal Component

**Files:** `app/src/islands/modals/CompareTermsModal.jsx`

**Purpose:** Complete rewrite following Bubble spec structure.

**Details:**

```
Structure:
+------------------------------------------+
|  Compare Terms                       [X]  |  <- Header
+------------------------------------------+
| [icon] Last negotiation summary text      |  <- Negotiation Summary (conditional)
+------------------------------------------+
|  Your Terms       |   Host Terms          |  <- Column Headers
+------------------------------------------+
|  Move-in: Date Range | Move-in: Single   |
|  Duration: X weeks   | Duration: Y weeks  |
|  Schedule: [Day Pills] | Schedule: [Day Pills] |
|  X days, Y nights    | X days, Y nights  |
|  House Rules: ...    | House Rules: ...   |
+------------------------------------------+
|  RESERVATION DETAILS (Your Terms | Host) |  <- Side-by-side details
|  Check-In: X         | X                  |
|  Check-Out: X        | X                  |
|  Price/Night: $X     | $X                 |
|  Nights Reserved: X  | X                  |
|  Weeks Used: X       | X                  |
|  Duration: X         | X                  |
|  Total Price: $X     | $X                 |
|  Price/4 wks: $X     | $X                 |
|  Nights/4 wks: X     | X                  |
|  Maintenance Fee/4wks| $X                 |
|  Damage Deposit: $X  | $X                 |
|  Initial Payment: $X | $X                 |
+------------------------------------------+
| [Cancel Proposal] [Close] [Accept Host Terms] |
| "Check the full document" link            |
+------------------------------------------+
```

**Key Implementation Notes:**
- Use `createPortal(modalContent, document.body)` for rendering
- Disable Escape key: Add `useEffect` with `keydown` listener that prevents Escape dismissal
- Overlay click should NOT dismiss (remove onClick from overlay)
- Import and use `useCompareTermsModalLogic` hook
- Day pills: Render all 7 days (S M T W T F S), highlight selected ones
- Calculate derived fields:
  - Nights Reserved = nights_per_week * reservation_weeks
  - Price/4 wks = nightly_price * nights_per_week * 4
  - Nights/4 wks = nights_per_week * 4
  - Initial Payment = total_price + cleaning_fee + damage_deposit (or specific formula)

**Validation:** Modal renders with all required sections when `proposal['counter offer happened']` is true.

---

### Step 4: Create DayPillsDisplay Sub-component

**Files:** `app/src/islands/modals/CompareTermsModal.jsx` (inline component)

**Purpose:** Reusable day pills display showing S M T W T F S with selected highlighting.

**Details:**
- Accept `daysSelected` prop (array of day indices 0-6)
- Render 7 pills in order: S M T W T F S
- Highlight selected days with distinct background color
- Read-only (not clickable) - purely for display
- Follow accessibility patterns from existing `DayButton.jsx`

**Validation:** Days display correctly for both original and counteroffer terms.

---

### Step 5: Integrate CompareTermsModal into ExpandableProposalCard

**Files:** `app/src/islands/pages/proposals/ExpandableProposalCard.jsx`

**Purpose:** Add "Review Host Terms" button and modal state management.

**Details:**
- Add `showCompareTermsModal` state (boolean)
- Add condition check: `const hasCounteroffer = proposal?.['counter offer happened'];`
- In the actions row, add "Review Host Terms" button when `hasCounteroffer` is true
- Button styling: distinctive (e.g., yellow/amber to indicate attention needed)
- Import `CompareTermsModal` component
- Render modal at end of component with:
  ```jsx
  {showCompareTermsModal && hasCounteroffer && (
    <CompareTermsModal
      proposal={proposal}
      onClose={() => setShowCompareTermsModal(false)}
      onAcceptCounteroffer={handleAcceptCounteroffer}
      onCancelProposal={() => setShowCancelModal(true)}
    />
  )}
  ```
- Add `handleAcceptCounteroffer` callback that:
  1. Calls accept workflow
  2. Shows success toast
  3. Reloads page or updates state

**Validation:** "Review Host Terms" button appears only for proposals with counteroffers, modal opens on click.

---

### Step 6: Implement Cancel Proposal Integration

**Files:** `app/src/islands/modals/CompareTermsModal.jsx`, `app/src/islands/modals/useCompareTermsModalLogic.js`

**Purpose:** Wire up the "Cancel Proposal" button to the existing CancelProposalModal.

**Details:**
- In `CompareTermsModal`, add state: `const [showCancelModal, setShowCancelModal] = useState(false)`
- "Cancel Proposal" button onClick sets `showCancelModal(true)`
- Render `CancelProposalModal` inside `CompareTermsModal`:
  ```jsx
  <CancelProposalModal
    isOpen={showCancelModal}
    proposal={proposal}
    userType="guest"
    buttonText="Cancel Proposal"
    onClose={() => setShowCancelModal(false)}
    onConfirm={handleCancelConfirm}
  />
  ```
- `handleCancelConfirm` calls `declineCounteroffer` from workflow, then closes both modals and reloads

**Validation:** Cancel flow opens nested modal, cancellation updates proposal status correctly.

---

### Step 7: Implement Accept Host Terms Workflow

**Files:** `app/src/islands/modals/useCompareTermsModalLogic.js`

**Purpose:** Complete the 7-step acceptance workflow from Bubble spec.

**Details:**
- The workflow already exists in `CompareTermsModal.jsx` (lines 20-82)
- Refactor into hook for better testability
- Steps:
  1. Show loading state
  2. Count existing leases for numbering
  3. Calculate numberOfZeros for lease ID format
  4. Calculate 4-week compensation from ORIGINAL terms
  5. Update proposal status to "Drafting Lease Documents"
  6. Calculate 4-week rent from COUNTEROFFER terms
  7. Log lease creation parameters (TODO: Implement CORE-create-lease API)
  8. Show success alert with 48-hour message
  9. Call `onAcceptCounteroffer` callback
  10. Close modal

**Validation:** Accepting counteroffer updates proposal status and shows success message.

---

### Step 8: Add Negotiation Summary Section

**Files:** `app/src/islands/modals/CompareTermsModal.jsx`

**Purpose:** Display last negotiation summary when available.

**Details:**
- Check if `proposal.negotiationSummaries` exists and has entries
- If yes, display section with icon + most recent summary text
- Style: Background color to distinguish, icon on left, text on right
- Use existing `NegotiationSummarySection` pattern from `ExpandableProposalCard.jsx` if suitable

**Validation:** Negotiation summary displays when present, hidden when not.

---

### Step 9: Add "Check the full document" Link

**Files:** `app/src/islands/modals/CompareTermsModal.jsx`

**Purpose:** Add link to view full lease document or related popup.

**Details:**
- Add link text below action buttons: "Check the full document"
- Link styling: Underlined, muted color
- OnClick behavior: Navigate to document review page or show document popup
- If no document available yet, link could be disabled or hidden
- URL pattern: `/lease-documents/${proposal._id}` or similar

**Validation:** Link is visible and navigates to appropriate destination.

---

### Step 10: Test Integration and Edge Cases

**Files:** All modified files

**Purpose:** Verify complete integration and edge cases.

**Details:**
- Test with proposal that has counteroffer
- Test with proposal that does NOT have counteroffer (modal should not be triggerable)
- Verify Escape key does not dismiss modal
- Verify overlay click does not dismiss modal
- Verify Close button works
- Verify Cancel Proposal flow
- Verify Accept Host Terms flow
- Test mobile responsiveness
- Test with missing data fields (graceful handling)

**Validation:** All user flows work as expected with no console errors.

---

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| Missing `hc_*` fields | Use original values as fallback per `getTermsComparison` |
| Missing negotiation summaries | Hide summary section |
| Missing house rules | Show "None specified" |
| Missing listing data | Show "Property" as placeholder |
| Network error during accept | Show error toast, keep modal open |
| Network error during cancel | Show error toast, keep cancel modal open |
| User has no counteroffer | "Review Host Terms" button hidden |

---

## Testing Considerations

1. **Unit Tests:**
   - `useCompareTermsModalLogic` hook logic
   - `getTermsComparison` function (already in counterofferWorkflow.js)
   - Day pills rendering with various day selections

2. **Integration Tests:**
   - Modal opens from ExpandableProposalCard
   - Accept workflow completes and updates UI
   - Cancel workflow completes and updates UI

3. **Visual Tests:**
   - Modal matches Bubble spec dimensions and styling
   - Day pills display correctly
   - Mobile responsive layout

4. **Accessibility Tests:**
   - Modal traps focus
   - Screen reader announces modal content
   - Buttons have proper labels

---

## Rollback Strategy

If issues arise after deployment:
1. Revert changes to `ExpandableProposalCard.jsx` to remove integration
2. Revert `CompareTermsModal.jsx` to previous version
3. The modal is self-contained, so rollback does not affect other features

---

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| `counterofferWorkflow.js` | Exists | Has `acceptCounteroffer`, `declineCounteroffer`, `getTermsComparison` |
| `CancelProposalModal.jsx` | Exists | Will be nested inside CompareTermsModal |
| `dataTransformers.js` | Exists | Has `formatPrice`, `formatDate` |
| `proposalStatuses.js` | Exists | Has status constants |
| CORE-create-lease API | TODO | Needs Edge Function implementation for full workflow |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Styling mismatch with Bubble | Medium | Low | Use exact Bubble spec values, iterate on QA |
| Accept workflow incomplete (no lease creation) | High | Medium | Document limitation, log parameters for manual processing |
| Missing data fields in production | Medium | Low | Graceful fallbacks implemented |
| Mobile usability issues | Low | Medium | Test on multiple device sizes |

---

## Data Field Mapping

### Guest Original Fields

| Bubble Field | Supabase Column | Location in `proposal` object |
|--------------|-----------------|------------------------------|
| Move in range start | `Move in range start` | `proposal['Move in range start']` |
| Move in range end | `Move in range end` | `proposal['Move in range end']` |
| Reservation Span (Weeks) | `Reservation Span (Weeks)` | `proposal['Reservation Span (Weeks)']` |
| Days Selected | `Days Selected` | `proposal['Days Selected']` (JSON array) |
| nights per week (num) | `nights per week (num)` | `proposal['nights per week (num)']` |
| check in day | `check in day` | `proposal['check in day']` |
| check out day | `check out day` | `proposal['check out day']` |
| Total Price for Reservation (guest) | `Total Price for Reservation (guest)` | `proposal['Total Price for Reservation (guest)']` |
| cleaning fee | `cleaning fee` | `proposal['cleaning fee']` |
| damage deposit | `damage deposit` | `proposal['damage deposit']` |
| proposal nightly price | `proposal nightly price` | `proposal['proposal nightly price']` |

### Host Counter Fields (hc prefix)

| Bubble Field | Supabase Column | Location in `proposal` object |
|--------------|-----------------|------------------------------|
| hc move in date | `hc move in date` | `proposal['hc move in date']` |
| hc reservation span (weeks) | `hc reservation span (weeks)` | `proposal['hc reservation span (weeks)']` |
| hc days selected | `hc days selected` | `proposal['hc days selected']` (JSON array) |
| hc nights per week | `hc nights per week` | `proposal['hc nights per week']` |
| hc nightly price | `hc nightly price` | `proposal['hc nightly price']` |
| hc total price | `hc total price` | `proposal['hc total price']` |
| hc cleaning fee | `hc cleaning fee` | `proposal['hc cleaning fee']` |
| hc damage deposit | `hc damage deposit` | `proposal['hc damage deposit']` |
| hc check in day | `hc check in day` | `proposal['hc check in day']` |
| hc check out day | `hc check out day` | `proposal['hc check out day']` |

### Listing Fields

| Bubble Field | Supabase Column | Access Path |
|--------------|-----------------|-------------|
| Check in time | `NEW Date Check-in Time` | `proposal.listing?.['NEW Date Check-in Time']` or `listing['Check in time']` |
| Check Out time | `NEW Date Check-out Time` | `proposal.listing?.['NEW Date Check-out Time']` or `listing['Check Out time']` |

---

## Files Reference Summary

### Files to Create
- `app/src/islands/modals/CompareTermsModal.css`
- `app/src/islands/modals/useCompareTermsModalLogic.js`

### Files to Modify
- `app/src/islands/modals/CompareTermsModal.jsx` (complete rewrite)
- `app/src/islands/pages/proposals/ExpandableProposalCard.jsx` (add integration)

### Files to Reference (no changes)
- `app/src/lib/proposals/dataTransformers.js`
- `app/src/logic/workflows/proposals/counterofferWorkflow.js`
- `app/src/logic/constants/proposalStatuses.js`
- `app/src/lib/dayUtils.js`
- `app/src/islands/modals/CancelProposalModal.jsx`
- `app/src/islands/pages/proposals/displayUtils.js`
- `app/src/lib/proposals/userProposalQueries.js`

---

**Plan Version:** 1.0
**Created:** 2026-01-23
**Author:** Claude (Implementation Planning Architect)
