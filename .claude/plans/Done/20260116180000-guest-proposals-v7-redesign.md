# Guest Proposals Page V7 Redesign

**Created**: 2026-01-16 18:00:00
**Status**: New
**Type**: Feature/Design Update

## Overview

Redesign the Guest Proposals page to use an expandable accordion card layout with two distinct sections: "Suggested for You" (SL-suggested proposals) and "Your Proposals" (guest-submitted proposals). The new design maintains all existing functionality while providing a cleaner, more modern UI experience.

## Current vs New Design

### Current Architecture
- **ProposalSelector**: Horizontal list of all proposals with thumbnails and status badges
- **ProposalCard**: Single detailed view of the selected proposal (1,485 lines)
- **One proposal visible at a time** with selection-based switching

### New Architecture (V7)
- **Two sections**: Suggested proposals and User proposals with visual separation
- **Expandable cards**: Each proposal is a collapsible card showing summary when collapsed
- **All proposals visible**: Overview of all proposals without needing to select
- **Click to expand**: Full details reveal on click (accordion style)
- **Feather icons**: Consistent iconography throughout

## Key Design Changes

### 1. Section Headers
```
┌─────────────────────────────────────────────────────────────┐
│ ⭐ SUGGESTED FOR YOU (purple text, star icon)               │
├─────────────────────────────────────────────────────────────┤
│ [SL Suggested Card 1 - collapsed]                           │
│ [SL Suggested Card 2 - collapsed]                           │
├─────────────────────────────────────────────────────────────┤
│ 📄 YOUR PROPOSALS (gray text, file-text icon)               │
├─────────────────────────────────────────────────────────────┤
│ [User Proposal 1 - collapsed]                               │
│ [User Proposal 2 - expanded]                                │
│ [User Proposal 3 - collapsed]                               │
└─────────────────────────────────────────────────────────────┘
```

### 2. Collapsed Card State (Header Only)
- Thumbnail (44x44px, rounded)
- Listing name + SL Badge (for suggested)
- Meta text (e.g., "Tue-Sat · 10 weeks")
- Status badge (right side)
- Expand/collapse chevron icon

### 3. Expanded Card State
- Status banner (contextual)
- **Match reason card** (only for SL-suggested - WHY this matches)
- Quick links row (View Listing, Map, Message Host)
- Info grid (4 columns: Move-in, Duration, Schedule, Nights)
- Days row with day pills
- Pricing row with breakdown and total
- Progress tracker (for user proposals)
- Action buttons

### 4. SL-Suggested Card Differences
- Light purple background (`--purple-bg: #f8f5ff`)
- Purple border (`--purple-border: #E9E0F7`)
- "SL Match" badge next to listing name
- Match reason card with tags (Schedule, Budget, Transit, etc.)
- Actions: Submit Proposal, Customize, Dismiss

### 5. Feather Icons Usage
| Location | Icon |
|----------|------|
| Section header (Suggested) | `star` |
| Section header (Your Proposals) | `file-text` |
| Status icons | `zap` (suggested), `check` (success), `alert-circle` (warning), `clock` (pending) |
| Quick links | `eye` (View), `map-pin` (Map), `message-circle` (Message) |
| Expand/collapse | `chevron-down` |
| Action buttons | `send`, `sliders`, `x`, `clipboard`, `calendar`, `edit-2`, `x-circle`, `check`, `repeat`, `trash-2` |

## Implementation Plan

### Phase 1: Create New Component Structure

#### Task 1.1: Create ExpandableProposalCard Component
**File**: `app/src/islands/pages/proposals/ExpandableProposalCard.jsx`

This will be a new component that handles both collapsed and expanded states:

```jsx
// Structure:
// - Collapsed header (always visible)
// - Expandable body (hidden when collapsed)
// - Props: proposal, isExpanded, onToggle, isSuggested
```

**Key features:**
- Accept `isSuggested` prop to render purple styling
- Accept `isExpanded` prop for controlled accordion behavior
- Reuse existing business logic from ProposalCard.jsx
- Extract shared display utilities

#### Task 1.2: Create SectionHeader Component
**File**: `app/src/islands/pages/proposals/SectionHeader.jsx`

Simple component for section headers with icon and text.

#### Task 1.3: Create MatchReasonCard Component
**File**: `app/src/islands/pages/proposals/MatchReasonCard.jsx`

Displays "Why this matches" for SL-suggested proposals:
- Icon with purple background
- Title and reason text
- Match tags (Schedule, Budget, Transit, Pet OK, etc.)

### Phase 2: Update CSS Styles

#### Task 2.1: Add V7 Card Styles
**File**: `app/src/styles/components/guest-proposals.css`

Add new CSS classes for:
- `.proposal-card` (expandable card wrapper)
- `.proposal-card.sl-suggested` (purple variant)
- `.proposal-card.expanded` (expanded state)
- `.card-header` (collapsed view)
- `.card-body` (expandable content)
- `.section-header` / `.section-header.suggested`
- `.match-reason-card` / `.match-tag`
- `.sl-badge` (SL Match badge)
- `.expand-icon` (chevron animation)

#### Task 2.2: Add Feather Icons Integration
Integrate feather-icons library or use SVG icons inline. Options:
1. Add `feather-icons` as dependency
2. Create inline SVG icon components
3. Use existing icon approach if available

### Phase 3: Update Page Component

#### Task 3.1: Update useGuestProposalsPageLogic Hook
**File**: `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js`

Add:
- `expandedProposalId` state for tracking which card is expanded
- `handleToggleExpand(proposalId)` handler
- Separate `suggestedProposals` and `userProposals` derived arrays
- Update proposal filtering/sorting logic

#### Task 3.2: Update GuestProposalsPage Component
**File**: `app/src/islands/pages/GuestProposalsPage.jsx`

Replace current layout with:
```jsx
<SectionHeader type="suggested" />
<div className="proposal-list">
  {suggestedProposals.map(p => (
    <ExpandableProposalCard
      key={p._id}
      proposal={p}
      isSuggested={true}
      isExpanded={expandedProposalId === p._id}
      onToggle={() => handleToggleExpand(p._id)}
    />
  ))}
</div>

<div className="list-divider" />

<SectionHeader type="user" />
<div className="proposal-list">
  {userProposals.map(p => (
    <ExpandableProposalCard
      key={p._id}
      proposal={p}
      isSuggested={false}
      isExpanded={expandedProposalId === p._id}
      onToggle={() => handleToggleExpand(p._id)}
    />
  ))}
</div>
```

### Phase 4: Migrate Functionality

#### Task 4.1: Extract Reusable Logic from ProposalCard
Create utility functions for:
- Day selection display
- Pricing calculation display
- Status banner logic
- Progress tracker logic

These can be extracted into:
- `app/src/lib/proposals/displayUtils.js`

#### Task 4.2: Wire Up All Existing Actions
Ensure all existing functionality works:
- [ ] View Listing link
- [ ] Map modal
- [ ] Message Host navigation
- [ ] Host Profile modal
- [ ] House Rules toggle
- [ ] Edit proposal modal
- [ ] Cancel proposal modal
- [ ] Delete proposal action
- [ ] Confirm proposal (SL-suggested)
- [ ] Not Interested modal (SL-suggested)
- [ ] Virtual Meeting manager
- [ ] Submit Rental Application CTA
- [ ] Go to Leases link

### Phase 5: Testing & Polish

#### Task 5.1: Test All Proposal States
- Pending
- Awaiting Rental Application
- Rental Application Submitted
- Host Review
- Counteroffer
- Accepted
- Drafting Documents
- Lease Documents stages
- Cancelled (by guest, by host, by SL)
- Expired
- SL-Suggested (Pending Confirmation)
- SL-Suggested (Awaiting Rental Application)

#### Task 5.2: Responsive Testing
- Desktop (1100px+)
- Tablet (768px - 1100px)
- Mobile (< 768px)

#### Task 5.3: Animation Polish
- Card expand/collapse animation (max-height transition)
- Chevron rotation animation
- Hover states

## Files to Modify

### New Files
| File | Purpose |
|------|---------|
| `app/src/islands/pages/proposals/ExpandableProposalCard.jsx` | New expandable card component |
| `app/src/islands/pages/proposals/SectionHeader.jsx` | Section header with icon |
| `app/src/islands/pages/proposals/MatchReasonCard.jsx` | SL match reason display |
| `app/src/lib/proposals/displayUtils.js` | Extracted display utilities |

### Modified Files
| File | Changes |
|------|---------|
| `app/src/islands/pages/GuestProposalsPage.jsx` | New layout structure |
| `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | Expanded state, proposal separation |
| `app/src/styles/components/guest-proposals.css` | V7 styles |

### Potentially Deprecated
| File | Status |
|------|--------|
| `app/src/islands/pages/proposals/ProposalSelector.jsx` | May be removed or repurposed |
| `app/src/islands/pages/proposals/ProposalCard.jsx` | Functionality migrated to ExpandableProposalCard |

## Data Requirements

### Match Reason Data for SL-Suggested
The match reason text and tags need to come from somewhere. Options:
1. **AI-generated at suggestion time**: Stored in proposal record
2. **Derived from guest preferences**: Computed from profile match
3. **Static/template based**: Simple logic based on matched criteria

**Recommendation**: Check if `proposal` already has match data fields. If not, derive from:
- Schedule match: Compare `Days Selected` with guest preferences
- Budget match: Compare `proposal nightly price` with guest budget
- Location match: Check transit/neighborhood preferences

### Proposal Categorization
**SL-Suggested statuses**:
- `Proposal Submitted for guest by Split Lease - Pending Confirmation`
- `Proposal Submitted for guest by Split Lease - Awaiting Rental Application`

All other statuses = User Proposals

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Keep ProposalCard.jsx as reference, test all actions |
| Performance with many proposals | Use CSS transitions (not JS animation), minimize re-renders |
| Complex state management | Use controlled accordion (only one expanded at a time) |
| Mobile responsiveness | Follow mockup responsive breakpoints |

## Acceptance Criteria

1. [ ] Two distinct sections visible on page load (Suggested / Your Proposals)
2. [ ] All cards collapsed by default
3. [ ] Clicking card header expands/collapses the card body
4. [ ] Only one card can be expanded at a time (accordion)
5. [ ] SL-suggested cards have purple styling and match reason
6. [ ] All existing proposal actions work correctly
7. [ ] Progress tracker displays correctly for user proposals
8. [ ] Responsive design works on mobile/tablet
9. [ ] Status badges show correct state
10. [ ] Feather icons display throughout

## Referenced Files

- [GuestProposalsPage.jsx](../../app/src/islands/pages/GuestProposalsPage.jsx) - Main page component
- [ProposalCard.jsx](../../app/src/islands/pages/proposals/ProposalCard.jsx) - Current detail card (1485 lines)
- [ProposalSelector.jsx](../../app/src/islands/pages/proposals/ProposalSelector.jsx) - Current proposal list
- [useGuestProposalsPageLogic.js](../../app/src/islands/pages/proposals/useGuestProposalsPageLogic.js) - Page logic hook
- [guest-proposals.css](../../app/src/styles/components/guest-proposals.css) - Current styles (2316 lines)
- [proposalStatuses.js](../../app/src/logic/constants/proposalStatuses.js) - Status configurations
- [statusButtonConfig.js](../../app/src/lib/proposals/statusButtonConfig.js) - Button configurations
- [NotInterestedModal.jsx](../../app/src/islands/shared/SuggestedProposals/components/NotInterestedModal.jsx) - Existing dismiss modal

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Components | Medium |
| Phase 2: CSS | Medium |
| Phase 3: Page Update | Low |
| Phase 4: Migration | High (testing all actions) |
| Phase 5: Polish | Medium |

**Total**: ~4-6 hours of implementation work
