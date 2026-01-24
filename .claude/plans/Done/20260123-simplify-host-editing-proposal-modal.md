# Plan: Simplify HostEditingProposal Modal

**Created**: 2026-01-23
**Status**: New
**Classification**: CLEANUP
**Complexity**: Medium-High

---

## Overview

Simplify the `HostEditingProposal` shared island component to match the cleaner, more focused design patterns found in `GuestEditingProposalModal`. The goal is to reduce architectural complexity while maintaining all existing functionality.

---

## Current State Analysis

### Host Modal (Complex - Target for Simplification)
- **Location**: [HostEditingProposal.jsx](../../../app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx)
- **Lines**: 752 lines + 5 sub-component files
- **State Variables**: 7 fragmented states managing overlapping concerns
- **Architecture**: Modular with external dependencies
- **Data Extraction**: ~200+ lines of defensive multi-format parsing

### Guest Modal (Reference - Clean Pattern)
- **Location**: [GuestEditingProposalModal.jsx](../../../app/src/islands/modals/GuestEditingProposalModal.jsx)
- **Lines**: 1,258 lines (self-contained)
- **State Variables**: 5 focused states with clear responsibilities
- **Architecture**: Single-file with embedded sub-components
- **Data Extraction**: ~50 lines of direct parsing

---

## Key Differences Identified

| Aspect | Guest (Simple) | Host (Complex) |
|--------|----------------|----------------|
| View State | 4-state machine: `pristine → editing → general → cancel` | Mixed: `view` + `isEditSectionExpanded` |
| State Count | 5 focused states | 7 fragmented states |
| Sub-components | Embedded (DayNightSelector, ReservationPriceBreakdown) | External files (5 imports) |
| Data Parsing | Direct with simple fallbacks | Multi-format with 3+ field name variations |
| UI Pattern | Full view transitions | Collapsible within same view |
| Feature Set | ~10 tightly integrated | ~15 loosely organized |

---

## Simplification Strategy

### Phase 1: Consolidate View State Machine

**Current Host State:**
```javascript
const [view, setView] = useState('general')          // 'general' | 'editing'
const [isEditSectionExpanded, setIsEditSectionExpanded] = useState(false)
const [isFirstOpen, setIsFirstOpen] = useState(true)
const [proceedButtonLocked, setProceedButtonLocked] = useState(false)
```

**Simplified (Guest Pattern):**
```javascript
const [view, setView] = useState('pristine') // 'pristine' | 'editing' | 'general'
// Remove isEditSectionExpanded - use view transitions instead
// Keep isFirstOpen (needed for initialization)
// Keep proceedButtonLocked (async handler safety)
```

**Changes:**
1. Add `pristine` view state for initial readonly display
2. Remove `isEditSectionExpanded` - editing is now a full view, not collapsible
3. Reduce from 4 related states to 3

**Files to modify:**
- [HostEditingProposal.jsx:60-62](../../../app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx#L60-L62)
- [HostEditingProposal.jsx:214-215](../../../app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx#L214-L215)

---

### Phase 2: Simplify UI Flow (Guest Pattern)

**Current Host Flow:**
```
┌─────────────────────────────────────────┐
│ Header (Review Proposal Terms)          │
├─────────────────────────────────────────┤
│ [▼ Edit Proposal Terms] ← Collapsible   │
│   (expands inline when clicked)         │
│   ┌─────────────────────────────────┐   │
│   │ Form fields appear HERE         │   │
│   └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ ReservationPriceBreakdown (always vis)  │
├─────────────────────────────────────────┤
│ [Reject] [Accept/Submit]                │
└─────────────────────────────────────────┘
```

**Simplified Flow (Guest Pattern):**
```
┌─────────────────────────────────────────┐
│ PRISTINE VIEW (initial)                 │
├─────────────────────────────────────────┤
│ Header: "Review Proposal" + Close btn   │
│ Readonly detail rows (summary view)     │
│ [Reject] [Edit Proposal]                │
└─────────────────────────────────────────┘
            ↓ Click "Edit Proposal"
┌─────────────────────────────────────────┐
│ EDITING VIEW                            │
├─────────────────────────────────────────┤
│ Header: "Edit Proposal" + Back btn      │
│ Schedule Selector                       │
│ Move-in Date input                      │
│ Reservation Span dropdown               │
│ House Rules selector                    │
│ [Cancel Edits] [Update Proposal]        │
└─────────────────────────────────────────┘
            ↓ Click "Update Proposal"
┌─────────────────────────────────────────┐
│ GENERAL VIEW (review changes)           │
├─────────────────────────────────────────┤
│ Header: "Review Changes" + Close btn    │
│ ReservationPriceBreakdown (with diffs)  │
│ [Reject] [Submit Edits / Accept As-Is]  │
└─────────────────────────────────────────┘
```

**Changes:**
1. Remove collapsible "Edit Proposal Terms" section
2. Add `pristine` view with readonly summary (like guest modal lines 1063-1127)
3. Full view transitions between states (no inline expand/collapse)
4. Header changes based on view state (icon + back button pattern)

**Files to modify:**
- [HostEditingProposal.jsx:541-559](../../../app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx#L541-L559) (remove collapsible)
- [HostEditingProposal.jsx:503-535](../../../app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx#L503-L535) (update header)
- [HostEditingProposal.jsx:561-656](../../../app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx#L561-L656) (conditional on `view === 'editing'`)

---

### Phase 3: Extract Data Parsing to Utility

**Current (embedded in component):**
- `getProposalDate()` - lines 66-70 (5 lines)
- `getProposalValue()` - lines 72-76 (5 lines)
- `extractHouseRules()` - lines 86-125 (40 lines)
- `extractNightsSelected()` - lines 133-146 (14 lines)
- `extractCheckInDay()` - lines 151-153 (3 lines)
- `extractCheckOutDay()` - lines 158-160 (3 lines)
- `extractReservationSpanWeeks()` - lines 165-167 (3 lines)

**Total: ~73 lines of extraction logic**

**New Utility File:**
Create `app/src/islands/shared/HostEditingProposal/parseProposalData.js`

```javascript
/**
 * Parse proposal data with multi-format field name support
 * Handles both Bubble camelCase and database snake_case formats
 */

export function parseProposalData(proposal, availableHouseRules = []) {
  return {
    moveInDate: getProposalDate(proposal, 'moveInRangeStart'),
    checkInDay: extractCheckInDay(proposal),
    checkOutDay: extractCheckOutDay(proposal),
    reservationSpanWeeks: extractReservationSpanWeeks(proposal),
    nightsSelected: extractNightsSelected(proposal),
    houseRules: extractHouseRules(proposal, availableHouseRules)
  }
}

// Move all extraction functions here...
```

**Benefits:**
- Component becomes focused on UI logic
- Extraction logic is testable independently
- Single import replaces 7 embedded functions

**Files to create:**
- `app/src/islands/shared/HostEditingProposal/parseProposalData.js`

**Files to modify:**
- [HostEditingProposal.jsx](../../../app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx) - remove embedded functions, add import

---

### Phase 4: Simplify Change Detection

**Current `hasChanges()` function:** 50 lines (272-322) with extensive debug logging

**Simplified:**
```javascript
const hasChanges = useCallback(() => {
  const original = parseProposalData(proposal, availableHouseRules)

  return (
    formatDate(original.moveInDate) !== formatDate(editedMoveInDate) ||
    original.reservationSpanWeeks !== editedWeeks ||
    original.checkInDay !== editedCheckInDay ||
    original.checkOutDay !== editedCheckOutDay ||
    !arraysEqual(original.houseRules.map(r => r.id), editedHouseRules.map(r => r.id))
  )
}, [proposal, availableHouseRules, editedMoveInDate, editedWeeks, editedCheckInDay, editedCheckOutDay, editedHouseRules])
```

**Changes:**
1. Use centralized `parseProposalData()` for original values
2. Remove inline debug logging (use DevTools if needed)
3. Reduce from 50 lines to ~15 lines

---

### Phase 5: Remove Reject-Only Mode Special Case

**Current:** Lines 477-496 render ONLY CancelProposalModal when `initialShowReject && showRejectModal`

**Problem:** This creates a special rendering path that bypasses the normal component structure.

**Simplified:** Always show the modal over the container (standard overlay pattern).

```javascript
// Remove this conditional early return:
if (isRejectOnlyMode) {
  return <CancelProposalModal ... />
}

// Instead, just render the modal conditionally at the end (already exists):
<CancelProposalModal
  isOpen={showRejectModal}
  ...
/>
```

**Changes:**
1. Remove `isRejectOnlyMode` variable and conditional return
2. Let `initialShowReject` control `showRejectModal` initial state
3. Modal renders as overlay (standard pattern)

---

### Phase 6: Consolidate Popup State

**Current:**
```javascript
const [showConfirmPopup, setShowConfirmPopup] = useState(false)
const [showRejectModal, setShowRejectModal] = useState(initialShowReject)
```

**Keep as-is:** These are necessary for different modal overlays. No change needed.

---

## Implementation Order

1. **Phase 3** - Extract data parsing first (enables other phases)
2. **Phase 1** - Consolidate view state machine
3. **Phase 2** - Simplify UI flow with new view states
4. **Phase 4** - Simplify change detection using new utility
5. **Phase 5** - Remove reject-only special case

---

## Expected Outcomes

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Main component lines | 752 | ~500 | 33% |
| State variables | 7 | 4 | 43% |
| Embedded extraction functions | 7 | 0 | 100% |
| Conditional rendering paths | 3 | 2 | 33% |

---

## Files Changed Summary

| File | Action |
|------|--------|
| `HostEditingProposal.jsx` | Major refactor |
| `parseProposalData.js` | Create new |
| `HostEditingProposal.css` | Minor updates for new view states |
| `FormInputs.jsx` | No change |
| `ScheduleSelector.jsx` | No change |
| `ReservationPriceBreakdown.jsx` | No change |
| `types.js` | No change |

---

## Testing Considerations

1. **View state transitions**: Test pristine → editing → general → close
2. **Data parsing**: Test with proposals from both Bubble (camelCase) and Supabase (snake_case)
3. **Change detection**: Verify `hasChanges()` correctly identifies modifications
4. **Reject flow**: Test rejection from both pristine and general views
5. **Accept as-is**: Test when no changes made
6. **Counteroffer**: Test when changes are made

---

## References

- **Guest Modal (Reference)**: [GuestEditingProposalModal.jsx](../../../app/src/islands/modals/GuestEditingProposalModal.jsx)
- **Host Modal (Target)**: [HostEditingProposal.jsx](../../../app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx)
- **Design System**: Split Lease Design System v1.0

---

## Acceptance Criteria

- [ ] Component uses 3-state view machine (pristine, editing, general)
- [ ] Data parsing extracted to `parseProposalData.js`
- [ ] No collapsible edit section - full view transitions only
- [ ] `hasChanges()` reduced to ~15 lines
- [ ] Reject-only mode special case removed
- [ ] All existing functionality preserved
- [ ] Tests pass for all scenarios listed above
