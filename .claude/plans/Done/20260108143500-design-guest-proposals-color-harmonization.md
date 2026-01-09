# Design Implementation Plan: Guest Proposals Page Color Harmonization

## 1. Overview

**Feature Name**: Guest Proposals Page Color Scheme Harmonization
**User's Vision**: Apply the harmonized purple-based color scheme from `proposals-color-scheme-v2.html` to the guest-proposals page, replacing semantic green/blue/amber colors with the unified purple design hierarchy used on the homepage.

**Scope**:
- [INCLUDED] Update `guest-proposals.css` button and UI color classes
- [INCLUDED] Update `ProposalCard.jsx` inline color definitions
- [INCLUDED] Update `VirtualMeetingsSection.jsx` button styling
- [INCLUDED] Update progress tracker colors in `ProposalCard.jsx`
- [INCLUDED] Update status badge colors
- [NOT INCLUDED] Database schema changes
- [NOT INCLUDED] Business logic changes
- [NOT INCLUDED] Component structure changes

## 2. Reference Analysis

### Design Reference: `proposals-color-scheme-v2.html`

**Core Design Principles** [FROM REFERENCE]:
1. Purple Hierarchy for Actions - Use purple shades to differentiate action importance, not semantic meaning
2. Style Over Color - Differentiate buttons by style (solid, outline, ghost) rather than color variety
3. Red for Destructive Only - Reserve red exclusively for destructive/irreversible actions
4. Consistent with Homepage - All colors match the index page palette

**Unified Color Palette** [FROM REFERENCE]:

| Color Name | Hex Value | Purpose |
|------------|-----------|---------|
| Primary Purple (Brand) | `#31135D` | Completed states, Progress tracker, Headers |
| Accent Purple | `#5B21B6` | Strong confirmations (Accept, Confirm Booking) |
| Secondary Purple | `#6D31C2` | Primary actions (Accept, Submit, Send) |
| Chat/CTA Purple | `#5B5FCF` | Navigation CTAs, Virtual Meeting, View actions |
| Attention Purple | `#8C68EE` | Attention needed, Pending review, Warnings |
| Destructive Red | `#dc2626` | Cancel, Decline, Delete - Destructive only |
| Disabled Gray | `#e5e7eb` / `#9ca3af` | Disabled buttons, Inactive states |

**Hover State Colors** [FROM REFERENCE]:
| Base Color | Hover Color |
|------------|-------------|
| `#6D31C2` (Secondary) | `#5B21B6` |
| `#5B21B6` (Accent) | `#4C1D95` |
| `#5B5FCF` (CTA) | `#4B48C8` |
| `#8C68EE` (Attention) | `#7C5AD9` |
| `#dc2626` (Destructive) | `#b91c1c` |

**Progress Tracker Colors** [FROM REFERENCE]:
| State | Color |
|-------|-------|
| Completed | `#31135D` |
| Current | `#6D31C2` |
| Pending | `#B6B7E9` |
| Future | `#DEDEDE` |
| Cancelled | `#dc2626` |

**Status Badge Colors** [FROM REFERENCE]:
| Status | Background | Text Color |
|--------|------------|------------|
| Pending | `#f3f4f6` | `#6b7280` |
| Active/In Progress | `#ede9fe` | `#6D31C2` |
| Confirmed | `#e0e7ff` | `#5B5FCF` |
| Attention Needed | `#f3e8ff` | `#8C68EE` |
| Cancelled/Declined | `#fee2e2` | `#dc2626` |
| Completed | `#31135D` | `white` |

### Migration Mapping [FROM REFERENCE]:

| Action Type | Old Color | New Color | New Hex |
|-------------|-----------|-----------|---------|
| Accept Proposal | Green `#1F8E16` | Secondary Purple | `#6D31C2` |
| Confirm Booking | Green `#22C55E` | Accent Purple | `#5B21B6` |
| View Proposal | Green `#22C55E` | Chat Purple | `#5B5FCF` |
| Schedule Meeting | Blue `#3B82F6` | Chat Purple | `#5B5FCF` |
| Join Meeting | Blue outline `#3B82F6` | Chat Purple outline | `#5B5FCF` |
| Respond Required | Amber `#F59E0B` | Attention Purple | `#8C68EE` |
| Review Counteroffer | Amber outline `#F59E0B` | Attention Purple outline | `#8C68EE` |
| Cancel / Decline | Red `#DB2E2E` | Red (adjusted) | `#dc2626` |
| Message Host | Purple outline | Secondary Purple outline | `#6D31C2` |

## 3. Existing Codebase Integration

### Files Affected

1. **`app/src/styles/components/guest-proposals.css`** (Primary CSS file - 1508 lines)
   - Contains all button color classes
   - Progress tracker styling
   - Status badge styling
   - Virtual meeting button states

2. **`app/src/islands/pages/proposals/ProposalCard.jsx`** (1410 lines)
   - `PROGRESS_COLORS` constant (lines 520-527)
   - `getStageColor()` function (lines 540-646)
   - Inline styles for status banners
   - Button className assignments

3. **`app/src/islands/pages/proposals/VirtualMeetingsSection.jsx`** (535 lines)
   - Button color classes
   - Badge color classes
   - State-specific button styling

4. **`app/src/styles/variables.css`**
   - [FROM CODEBASE] Already has purple color variables defined
   - Should be the source of truth for new CSS variables

### Existing Color Variables in `variables.css` [FROM CODEBASE]:
```css
--primary-purple: #31135D;
--secondary-purple: rgb(109, 49, 194); /* #6D31C2 */
--accent-purple: rgb(140, 104, 238); /* #8C68EE */
--chat-purple: rgb(75, 71, 206); /* #4B47CE - slightly different from spec */
```

**[SUGGESTED]** Add missing CSS variables to `variables.css`:
```css
/* Proposal Color Scheme Variables */
--color-accent-purple: #5B21B6;
--color-cta-purple: #5B5FCF;
--color-attention-purple: #8C68EE;

/* Hover States */
--color-accent-hover: #4C1D95;
--color-secondary-hover: #5B21B6;
--color-cta-hover: #4B48C8;
--color-attention-hover: #7C5AD9;

/* Destructive */
--color-destructive: #dc2626;
--color-destructive-hover: #b91c1c;

/* Progress Tracker */
--progress-completed: #31135D;
--progress-current: #6D31C2;
--progress-pending: #B6B7E9;
--progress-future: #DEDEDE;
--progress-cancelled: #dc2626;
```

## 4. Component Specifications

### 4.1 CSS Button Classes (`guest-proposals.css`)

#### 4.1.1 Primary Action Buttons (Previously Green)

**`.btn-primary-action`** [FROM REFERENCE]
- **Purpose**: Accept proposal, primary guest actions
- **Current State**:
  - Background: `#39873D` (green)
  - Hover: `#2D6B30`
- **New Specification**:
  - Background: `#6D31C2` (Secondary Purple)
  - Color: `white`
  - Hover Background: `#5B21B6`
  - Hover Shadow: `0 4px 12px rgba(109, 49, 194, 0.3)`

**`.btn-accept-counteroffer`** [FROM REFERENCE]
- **Purpose**: Accept host's counteroffer terms
- **Current State**: `#39873D` (green)
- **New Specification**:
  - Background: `#5B21B6` (Accent Purple - stronger confirmation)
  - Color: `white`
  - Hover Background: `#4C1D95`
  - Hover Shadow: `0 4px 12px rgba(91, 33, 182, 0.3)`

**`.btn-modify-proposal`** [FROM REFERENCE]
- **Purpose**: Modify existing proposal
- **Current State**: `#39873D` (green)
- **New Specification**:
  - Background: `#6D31C2` (Secondary Purple)
  - Color: `white`
  - Hover Background: `#5B21B6`

**`.btn-remind`** [FROM REFERENCE]
- **Purpose**: Remind Split Lease
- **Current State**: `#39873D` (green)
- **New Specification**:
  - Background: `#6D31C2` (Secondary Purple)
  - Color: `white`
  - Hover Background: `#5B21B6`

**`.btn-interested`** [FROM REFERENCE]
- **Purpose**: Express interest in SL-suggested proposals
- **Current State**: `#39873D` (green)
- **New Specification**:
  - Background: `#6D31C2` (Secondary Purple)
  - Color: `white`
  - Hover Background: `#5B21B6`

**`.btn-go-to-leases`** [FROM REFERENCE]
- **Purpose**: Navigate to completed leases
- **Current State**: `#39873D` (green)
- **New Specification**:
  - Background: `#5B5FCF` (CTA Purple - navigation action)
  - Color: `white`
  - Hover Background: `#4B48C8`

#### 4.1.2 Virtual Meeting Buttons (Previously Blue/Green Mixed)

**`.btn-vm-request`** [FROM REFERENCE]
- **Purpose**: Request a virtual meeting (no VM exists)
- **Current State**: Uses `var(--color-primary, #6B4EFF)`
- **New Specification**:
  - Background: `#5B5FCF` (CTA Purple)
  - Color: `white`
  - Hover Background: `#4B48C8`

**`.btn-vm-respond`** [FROM REFERENCE]
- **Purpose**: Respond to VM request from other party
- **Current State**: `#3B82F6` (blue)
- **New Specification**:
  - Background: `#5B5FCF` (CTA Purple)
  - Color: `white`
  - Hover Background: `#4B48C8`

**`.btn-vm-requested`** [FROM REFERENCE]
- **Purpose**: VM requested, waiting for response (disabled)
- **Current State**: `#9CA3AF` (gray)
- **New Specification**: Keep as is - disabled state remains gray

**`.btn-vm-accepted`** [FROM REFERENCE]
- **Purpose**: VM accepted, awaiting SL confirmation
- **Current State**: `#10B981` (green)
- **New Specification**:
  - Background: `#B6B7E9` (Light Purple - pending state)
  - Color: `#31135D`
  - Cursor: `not-allowed`

**`.btn-vm-confirmed`** [FROM REFERENCE]
- **Purpose**: Meeting confirmed by SL
- **Current State**: `#059669` (darker green)
- **New Specification**:
  - Background: `#5B21B6` (Accent Purple - confirmed state)
  - Color: `white`
  - Hover Background: `#4C1D95`
  - Disabled Background: `#5B21B6`

**`.btn-vm-declined`** [FROM REFERENCE]
- **Purpose**: VM declined, can request alternative
- **Current State**: Red outline `#DB2E2E`
- **New Specification**: Keep red for declined state (destructive context)
  - Background: `transparent`
  - Color: `#dc2626`
  - Border: `1px solid #dc2626`
  - Hover Background: `#FEE2E2`

#### 4.1.3 Informational/See Details Buttons (Previously Blue)

**`.btn-see-details`** [FROM REFERENCE]
- **Purpose**: View additional information
- **Current State**:
  - Background: `#EBF5FF`
  - Color: `#1D4ED8`
  - Border: `1px solid #3B82F6`
- **New Specification**:
  - Background: `white`
  - Color: `#5B5FCF` (CTA Purple)
  - Border: `2px solid #5B5FCF`
  - Hover Background: `#5B5FCF`
  - Hover Color: `white`

**`.btn-verify-identity`** [FROM REFERENCE]
- **Purpose**: ID verification action required
- **Current State**: `#3B82F6` (blue)
- **New Specification**:
  - Background: `#5B5FCF` (CTA Purple)
  - Color: `white`
  - Hover Background: `#4B48C8`

#### 4.1.4 Warning/Attention Buttons (Previously Amber)

**`.btn-review-terms`** [FROM REFERENCE]
- **Purpose**: Review host's counteroffer
- **Current State**:
  - Background: `#FEF3C7`
  - Color: `#92400E`
  - Border: `1px solid #F59E0B`
- **New Specification**:
  - Background: `white`
  - Color: `#8C68EE` (Attention Purple)
  - Border: `2px solid #8C68EE`
  - Hover Background: `#8C68EE`
  - Hover Color: `white`

#### 4.1.5 Destructive Buttons (Unchanged - Red)

**`.btn-cancel-proposal`** [FROM REFERENCE]
- **Current State**: `#EF4444`
- **New Specification**: Adjust slightly for consistency
  - Background: `#dc2626`
  - Color: `white`
  - Hover Background: `#b91c1c`

**`.btn-delete-proposal`** [FROM REFERENCE]
- **Current State**: `#EF4444`
- **New Specification**:
  - Background: `#dc2626`
  - Color: `white`
  - Hover Background: `#b91c1c`

**`.btn-reject-terms`** [FROM REFERENCE]
- **Current State**:
  - Background: `#FEE2E2`
  - Color: `#DC2626`
  - Border: `1px solid #DC2626`
- **New Specification**: Keep as outline red
  - Background: `white`
  - Color: `#dc2626`
  - Border: `2px solid #dc2626`
  - Hover Background: `#fef2f2`

**`.btn-reject-proposal`** [FROM REFERENCE]
- **Current State**: `#EF4444`
- **New Specification**:
  - Background: `#dc2626`
  - Color: `white`
  - Hover Background: `#b91c1c`

**`.btn-not-interested`** [FROM REFERENCE]
- **Purpose**: Reject SL-suggested proposal
- **Current State**:
  - Background: `#F3F4F6`
  - Color: `#DC2626`
  - Border: `1px solid #DC2626`
- **New Specification**: Keep as red outline (rejection)
  - Background: `white`
  - Color: `#dc2626`
  - Border: `2px solid #dc2626`
  - Hover Background: `#fee2e2`

#### 4.1.6 Secondary/Ghost Buttons

**`.btn-secondary-action`** [FROM REFERENCE]
- **Current State**:
  - Background: `#F3F4F6`
  - Color: `#374151`
  - Border: `1px solid #D4D4D4`
- **New Specification**:
  - Background: `white`
  - Color: `#6D31C2` (Secondary Purple)
  - Border: `2px solid #6D31C2`
  - Hover Background: `#fcfaff`

**`.btn-house-manual`** [FROM REFERENCE]
- **Purpose**: Non-clickable house manual button (late-stage)
- **Current State**: `#6D31C2` (already purple)
- **New Specification**: Keep as is (already matches)

### 4.2 Progress Tracker (`ProposalCard.jsx`)

**`PROGRESS_COLORS` Constant** (lines 520-527) [FROM REFERENCE]
```javascript
// Current values:
const PROGRESS_COLORS = {
  purple: '#6D31C2',    // Completed stage
  green: '#1F8E16',     // Current/Active stage (action needed)
  red: '#DB2E2E',       // Cancelled/Rejected
  lightPurple: '#B6B7E9', // Pending/Waiting state
  gray: '#DEDEDE',      // Inactive/Future stage
  labelGray: '#9CA3AF'  // Inactive label color
};

// New values [FROM REFERENCE]:
const PROGRESS_COLORS = {
  completed: '#31135D',   // Completed stage (Primary Purple)
  current: '#6D31C2',     // Current/Active stage (Secondary Purple)
  cancelled: '#dc2626',   // Cancelled/Rejected
  pending: '#B6B7E9',     // Pending/Waiting state
  future: '#DEDEDE',      // Inactive/Future stage
  labelGray: '#9CA3AF'    // Inactive label color
};
```

**Key Changes to `getStageColor()` function**:
- Replace `PROGRESS_COLORS.purple` with `PROGRESS_COLORS.completed` for completed stages
- Replace `PROGRESS_COLORS.green` with `PROGRESS_COLORS.current` for current/action-needed stages
- Replace `PROGRESS_COLORS.red` with `PROGRESS_COLORS.cancelled` for terminal states

### 4.3 Virtual Meetings Section (`VirtualMeetingsSection.jsx`)

#### State Badges [FROM REFERENCE]

**`.vm-section-badge-waiting`**
- **Current**: `background: #E5E7EB; color: #4B5563`
- **New**: Keep as is (neutral state)

**`.vm-section-badge-pending`**
- **Current**: `background: #FEF3C7; color: #92400E` (amber)
- **New Specification**:
  - Background: `#f3e8ff` (light purple)
  - Color: `#8C68EE` (Attention Purple)

**`.vm-section-badge-confirmed`**
- **Current**: `background: #D1FAE5; color: #065F46` (green)
- **New Specification**:
  - Background: `#ede9fe` (light purple)
  - Color: `#5B21B6` (Accent Purple)

**`.vm-section-badge-expired`**
- **Current**: `background: #FEF3C7; color: #92400E; border: 1px solid #F59E0B` (amber)
- **New Specification**:
  - Background: `#f3e8ff` (light purple)
  - Color: `#8C68EE` (Attention Purple)
  - Border: `1px solid #8C68EE`

#### Primary Buttons [FROM REFERENCE]

**`.vm-section-primary-btn--respond`**
- **Current**: `background: #3B82F6` (blue)
- **New**: `background: #5B5FCF` (CTA Purple)
- **Hover**: `background: #4B48C8`

**`.vm-section-primary-btn--details`**
- **Current**: Uses CSS variable
- **New**: `background: #6D31C2` (Secondary Purple)
- **Hover**: `background: #5B21B6`

**`.vm-section-primary-btn--join`**
- **Current**: `background: #059669` (green)
- **New**: `background: #5B21B6` (Accent Purple - confirmed action)
- **Hover**: `background: #4C1D95`

**`.vm-section-primary-btn--expired`**
- **Current**: `background: #F59E0B` (amber)
- **New**: `background: #8C68EE` (Attention Purple)
- **Hover**: `background: #7C5AD9`

#### Date Pill Styling [FROM REFERENCE]

**`.vm-section-date-pill--booked`**
- **Current**: `background: #D1FAE5; color: #065F46` (green)
- **New Specification**:
  - Background: `#ede9fe` (light purple)
  - Color: `#5B21B6` (Accent Purple)

### 4.4 Status Banner Colors (`ProposalCard.jsx`)

Status banners are defined inline in `STATUS_BANNERS` object. Some use semantic colors that should be updated:

**Rental Application Submitted** (line 285-290) [FROM REFERENCE]
- **Current**: `bgColor: '#EBF5FF', borderColor: '#3B82F6', textColor: '#1D4ED8'` (blue)
- **New**:
  - `bgColor: '#e0e7ff'` (light indigo/purple)
  - `borderColor: '#5B5FCF'` (CTA Purple)
  - `textColor: '#5B5FCF'`

**Reviewing Documents** (line 305-309) [FROM REFERENCE]
- **Current**: Blue tones
- **New**: Same as Rental Application Submitted

**[SUGGESTED]** Keep green success banners for accepted/completed states (lines 295-340) as they indicate positive outcomes. The reference design keeps these as green for differentiation.

## 5. Layout & Composition

No structural changes required. All changes are color-only modifications to existing elements.

## 6. Interactions & Animations

### Hover States
All buttons should have smooth transitions:
```css
transition: all 0.2s ease;
```

### Hover Shadow [FROM REFERENCE]
Primary action buttons should gain a colored shadow on hover:
```css
.btn-primary-action:hover {
  box-shadow: 0 4px 12px rgba(109, 49, 194, 0.3);
}

.btn-cta:hover {
  box-shadow: 0 4px 12px rgba(91, 95, 207, 0.3);
}

.btn-attention:hover {
  box-shadow: 0 4px 12px rgba(140, 104, 238, 0.3);
}
```

## 7. Assets Required

No new assets required. All changes use existing fonts and icons.

## 8. Implementation Sequence

### Phase 1: Add CSS Variables
1. Add new color variables to `app/src/styles/variables.css` for the harmonized palette

### Phase 2: Update `guest-proposals.css` Button Classes
2. Update `.btn-primary-action` (green to purple)
3. Update `.btn-accept-counteroffer` (green to accent purple)
4. Update `.btn-modify-proposal` (green to purple)
5. Update `.btn-remind` (green to purple)
6. Update `.btn-interested` (green to purple)
7. Update `.btn-go-to-leases` (green to CTA purple)
8. Update `.btn-vm-request` (to CTA purple)
9. Update `.btn-vm-respond` (blue to CTA purple)
10. Update `.btn-vm-accepted` (green to light purple pending)
11. Update `.btn-vm-confirmed` (green to accent purple)
12. Update `.btn-see-details` (blue to CTA purple outline)
13. Update `.btn-verify-identity` (blue to CTA purple)
14. Update `.btn-review-terms` (amber to attention purple outline)
15. Normalize destructive button red hex values to `#dc2626`
16. Update `.btn-secondary-action` (to purple outline)

### Phase 3: Update Virtual Meetings Section CSS
17. Update `.vm-section-badge-pending` (amber to attention purple)
18. Update `.vm-section-badge-confirmed` (green to accent purple)
19. Update `.vm-section-badge-expired` (amber to attention purple)
20. Update `.vm-section-primary-btn--respond` (blue to CTA purple)
21. Update `.vm-section-primary-btn--join` (green to accent purple)
22. Update `.vm-section-primary-btn--expired` (amber to attention purple)
23. Update `.vm-section-date-pill--booked` (green to accent purple)

### Phase 4: Update Progress Tracker (`ProposalCard.jsx`)
24. Rename `PROGRESS_COLORS` keys for clarity (`purple` -> `completed`, `green` -> `current`)
25. Update color values to match harmonized palette
26. Update `getStageColor()` function to use new key names
27. Update connector color logic if needed

### Phase 5: Update Status Banner Colors (`ProposalCard.jsx`)
28. Update blue informational banners to CTA purple tones
29. Verify green success banners are appropriate or update

### Phase 6: Testing
30. Visual regression testing of all proposal states
31. Test hover states and transitions
32. Test responsive behavior on mobile
33. Verify progress tracker displays correctly for all stages

## 9. Assumptions & Clarifications Needed

### Assumptions Made
- [ASSUMPTION] Green success banners for accepted/completed states may remain green OR should switch to purple tones. The reference design shows both options. **Clarification needed**: Should ALL green be replaced, or keep green for success states?
- [ASSUMPTION] The `--chat-purple` variable in `variables.css` (`#4B47CE`) is close but not exact to the spec (`#5B5FCF`). The plan uses the spec value. **Clarification needed**: Should we update the CSS variable or use the spec value directly?
- [ASSUMPTION] Disabled button states remain gray (`#e5e7eb` / `#9ca3af`) per the reference design.

### Clarifications Needed
1. **Success State Colors**: Should the green success banners (Proposal Accepted, Lease Documents Sent, etc.) remain green or be converted to purple?
2. **CSS Variable Naming**: Should new variables follow existing naming convention (`--secondary-purple`) or use the semantic naming from the reference (`--color-secondary`)?
3. **VM Accepted State**: The reference shows this as disabled - should it use `#B6B7E9` (pending purple) or remain gray?

---

**Plan Version**: 1.0
**Created**: 2026-01-08
**Design Reference**: `proposals-color-scheme-v2.html`
**Target Files**: 4 files (1 CSS, 3 JSX components)
**Estimated Changes**: ~80 CSS property updates, ~10 JavaScript constant updates
