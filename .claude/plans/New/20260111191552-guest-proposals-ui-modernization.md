# Implementation Plan: Guest Proposals Page UI Modernization

## Overview
Modernize the Guest Proposals page UI to match the approved V3 soft design mockup while preserving all existing functionality. This is a CSS-only change with minimal JSX restructuring to support the new list-detail layout pattern.

## Success Criteria
- [ ] Page container uses 1100px max-width
- [ ] Proposal selector converted from dropdown to clickable row list
- [ ] Detail section uses 16px rounded corners
- [ ] Status banner follows new design system
- [ ] Day pills are 40x40 with 10px radius
- [ ] Price display is 28px bold purple
- [ ] Progress tracker has subtle glow on current step
- [ ] Quick links row with pill-style buttons
- [ ] Info grid with 4-column layout
- [ ] Days row with summary info ("5 days, 4 nights Selected")
- [ ] All modals continue to work (HostProfileModal, GuestEditingProposalModal, CancelProposalModal, VirtualMeetingManager, FullscreenProposalMapModal)
- [ ] All button actions preserved
- [ ] All status banner logic preserved
- [ ] Progress tracker stage logic preserved
- [ ] Virtual meetings section functionality preserved

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/GuestProposalsPage.jsx` | Page component | Minor - page title styling |
| `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | Logic hook | NO CHANGES |
| `app/src/islands/pages/proposals/ProposalCard.jsx` | Main card component | JSX restructuring for new layout sections |
| `app/src/islands/pages/proposals/ProposalSelector.jsx` | Proposal list | JSX change from dropdown to list rows |
| `app/src/islands/pages/proposals/ProgressTracker.jsx` | Progress tracker | NO CHANGES (unused - inline version in ProposalCard) |
| `app/src/islands/pages/proposals/VirtualMeetingsSection.jsx` | VM section | CSS updates only |
| `app/src/styles/components/guest-proposals.css` | All styles | Major CSS overhaul |

### Approved Design Reference
- **File**: `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL22\Design\2026\Ongoing Projects\guest-proposal (color scheme )\guest-proposals-mockup-v3-soft.html`

### Design System Variables (from mockup)
```css
:root {
    --purple-dark: #31135D;
    --purple-primary: #6D31C2;
    --purple-light: #8C68EE;
    --purple-bg: #f8f5ff;
    --text: #1a1a1a;
    --text-secondary: #666;
    --text-muted: #999;
    --border: #e8e8e8;
    --border-light: #f0f0f0;
    --bg: #fafafa;
    --white: #fff;
}
```

### Existing Patterns to Follow
- Hollow Component Pattern: ProposalCard.jsx contains UI, useGuestProposalsPageLogic.js contains logic
- Day indexing: 0-6 (0=Sunday through 6=Saturday) - already handled in ProposalCard.jsx
- Status banner logic: Uses `shouldShowStatusBanner()`, `getStatusConfig()`, `getUsualOrder()`
- Progress tracker: Inline version in ProposalCard.jsx uses `getStageColor()` function

## Implementation Steps

### Step 1: Update CSS Variables and Base Styles
**Files:** `app/src/styles/components/guest-proposals.css`
**Purpose:** Add new design system variables and update base page styles

**Details:**
- Add new CSS custom properties matching the mockup:
  ```css
  :root {
    --gp-purple-dark: #31135D;
    --gp-purple-primary: #6D31C2;
    --gp-purple-light: #8C68EE;
    --gp-purple-bg: #f8f5ff;
    --gp-text: #1a1a1a;
    --gp-text-secondary: #666;
    --gp-text-muted: #999;
    --gp-border: #e8e8e8;
    --gp-border-light: #f0f0f0;
    --gp-bg: #fafafa;
  }
  ```
- Update `.proposals-page` to use `max-width: 1100px`
- Update `.main-content` background to `var(--gp-bg)`
- Update page title styling for `.page-title` class

**Validation:** Page container is 1100px max-width, background is #fafafa

---

### Step 2: Convert ProposalSelector to List Layout
**Files:** `app/src/islands/pages/proposals/ProposalSelector.jsx`, `app/src/styles/components/guest-proposals.css`
**Purpose:** Replace dropdown with clickable row list matching mockup

**Details:**
- JSX Changes to ProposalSelector.jsx:
  - Replace `<select>` with `<div className="proposal-list">`
  - Each proposal becomes a `.proposal-row` div
  - Add thumbnail image from proposal listing
  - Add proposal name, meta info (days + weeks), and status badge
  - Active proposal gets `.active` class
  - Status badge uses `.proposal-status` with color variants (`.attention`, `.success`)

- CSS Changes:
  ```css
  .proposal-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 32px;
  }

  .proposal-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    background: var(--gp-white);
    border: 1px solid var(--gp-border);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .proposal-row:hover {
    border-color: var(--gp-purple-light);
    background: var(--gp-purple-bg);
  }

  .proposal-row.active {
    border-color: var(--gp-purple-primary);
    border-width: 2px;
    background: var(--gp-purple-bg);
  }
  ```

- Need to access additional data in ProposalSelector:
  - Currently receives `proposals` array with `{ id, label }` objects
  - Need to pass full proposal objects to access listing photos, status, days

**Validation:** Clicking a row selects it, active row has purple border, hover shows purple background

---

### Step 3: Update ProposalCard Detail Section Container
**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`, `app/src/styles/components/guest-proposals.css`
**Purpose:** Wrap card content in new `.detail-section` container with 16px radius

**Details:**
- Wrap existing `.proposal-card-v2` content in `.detail-section` container
- Update border-radius to 16px
- Add overflow: hidden to contain child elements

- CSS:
  ```css
  .detail-section {
    background: var(--gp-white);
    border: 1px solid var(--gp-border);
    border-radius: 16px;
    overflow: hidden;
  }
  ```

**Validation:** Detail section has rounded corners, no content overflow

---

### Step 4: Modernize Status Banner
**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`, `app/src/styles/components/guest-proposals.css`
**Purpose:** Update StatusBanner component styling to match mockup

**Details:**
- Keep existing StatusBanner logic (shouldShowStatusBanner, status configs)
- Update styling:
  - Move banner inside `.detail-section` as first child
  - Add status icon circle (24px)
  - Use flexbox with icon left, text center/right
  - Border-bottom instead of separate box

- CSS:
  ```css
  .status-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 24px;
    background: var(--gp-purple-bg);
    border-bottom: 1px solid var(--gp-border);
    font-size: 14px;
  }

  .status-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    background: var(--gp-purple-primary);
    color: white;
  }
  ```

**Validation:** Status banners display with icon circle, proper colors per status type

---

### Step 5: Add Detail Header Section
**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`, `app/src/styles/components/guest-proposals.css`
**Purpose:** Create new header section with listing image, title, and host info

**Details:**
- Extract listing image (80x60, 10px radius)
- Extract title and location
- Add host name badge on right side
- Restructure existing `.proposal-content-row` into `.detail-header`

- JSX Structure:
  ```jsx
  <div className="detail-header">
    <img src={photoUrl} className="detail-image" alt="" />
    <div className="detail-title-area">
      <div className="detail-title">{listingName}</div>
      <div className="detail-location">{location}</div>
    </div>
    <div className="detail-host">
      <div className="host-name">{hostName}</div>
      <div className="host-label">Host</div>
    </div>
  </div>
  ```

**Validation:** Header shows listing thumbnail, title/location, and host name aligned right

---

### Step 6: Add Quick Links Row
**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`, `app/src/styles/components/guest-proposals.css`
**Purpose:** Create pill-style quick action links

**Details:**
- Create `.links-row` section between header and info grid
- Convert existing buttons (View Listing, Map, Host Profile, Message) to pill links
- Keep existing click handlers

- CSS:
  ```css
  .links-row {
    display: flex;
    gap: 8px;
    padding: 16px 24px;
    border-bottom: 1px solid var(--gp-border-light);
    background: var(--gp-bg);
  }

  .link-item {
    font-size: 13px;
    font-weight: 500;
    color: var(--gp-purple-primary);
    text-decoration: none;
    padding: 6px 14px;
    border-radius: 20px;
    transition: all 0.15s;
    cursor: pointer;
    background: transparent;
    border: none;
  }

  .link-item:hover {
    background: var(--gp-purple-bg);
  }
  ```

**Validation:** Links render as pills, hover shows purple background

---

### Step 7: Create Info Grid Section
**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`, `app/src/styles/components/guest-proposals.css`
**Purpose:** Display key proposal info in 4-column grid

**Details:**
- Create `.info-grid` with 4 equal columns
- Info items: Ideal Move-in, Duration, Schedule, Nights/week
- Each item has label (uppercase, muted) and value (bold)

- CSS:
  ```css
  .info-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: var(--gp-border-light);
    border-bottom: 1px solid var(--gp-border-light);
  }

  .info-item {
    padding: 20px 24px;
    background: var(--gp-white);
  }

  .info-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--gp-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  .info-value {
    font-size: 15px;
    font-weight: 600;
    color: var(--gp-text);
  }
  ```

**Validation:** 4 info items display in grid, labels uppercase, values bold

---

### Step 8: Modernize Days Row with Summary
**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`, `app/src/styles/components/guest-proposals.css`
**Purpose:** Update day pills to 40x40 and add days/nights summary

**Details:**
- Increase `.day-badge-v2` to 40x40 with 10px radius
- Add `.days-info` section on right with count and range
- Keep existing day selection logic and warning icon

- CSS:
  ```css
  .days-row {
    display: flex;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--gp-border-light);
    gap: 16px;
  }

  .day-pill {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    background: var(--gp-bg);
    color: var(--gp-text-muted);
    border: 1px solid var(--gp-border);
  }

  .day-pill.selected {
    background: var(--gp-purple-dark);
    border-color: var(--gp-purple-dark);
    color: white;
  }

  .days-info {
    margin-left: auto;
    text-align: right;
  }

  .days-count {
    font-size: 14px;
    font-weight: 600;
    color: var(--gp-text);
  }

  .days-range {
    font-size: 12px;
    color: var(--gp-text-secondary);
  }
  ```

- JSX: Add days summary calculation
  ```jsx
  const daysCount = daysSelected.length;
  const nightsCount = nightsPerWeek;
  // "5 days, 4 nights Selected"
  ```

**Validation:** Day pills are 40x40, selected days are purple, summary shows on right

---

### Step 9: Modernize Pricing Row
**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`, `app/src/styles/components/guest-proposals.css`
**Purpose:** Update pricing display with 28px bold purple total

**Details:**
- Restructure `.pricing-bar` to `.pricing-row`
- Left side: pricing breakdown as inline formula (e.g., "$165/night x 4 nights x 12 weeks")
- Right side: total with label and 28px bold purple amount

- CSS:
  ```css
  .pricing-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--gp-border-light);
    background: var(--gp-bg);
  }

  .pricing-breakdown {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--gp-text-secondary);
  }

  .pricing-total-label {
    font-size: 13px;
    color: var(--gp-text-secondary);
    margin-bottom: 2px;
  }

  .pricing-total {
    font-size: 28px;
    font-weight: 700;
    color: var(--gp-purple-primary);
  }
  ```

**Validation:** Total price is 28px bold purple, breakdown shows formula

---

### Step 10: Modernize Progress Tracker with Glow
**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`, `app/src/styles/components/guest-proposals.css`
**Purpose:** Add subtle glow to current step indicator

**Details:**
- Keep existing `InlineProgressTracker` component logic
- Update `.progress-node` for current step to have glow
- Current step dot slightly larger (12px vs 10px)

- CSS:
  ```css
  .progress-step.current .progress-dot {
    background: var(--gp-purple-primary);
    width: 12px;
    height: 12px;
    box-shadow: 0 0 0 4px rgba(109, 49, 194, 0.15);
  }
  ```

**Validation:** Current step has soft purple glow ring

---

### Step 11: Update Action Buttons Row
**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`, `app/src/styles/components/guest-proposals.css`
**Purpose:** Modernize button styling to match mockup

**Details:**
- Keep existing button logic (buttonConfig, vmConfig)
- Update button styling:
  - Primary: solid purple (#6D31C2)
  - Outline: purple border
  - Ghost: gray border
  - Danger: red outline

- CSS:
  ```css
  .actions-row {
    display: flex;
    gap: 12px;
    padding: 24px;
  }

  .btn {
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-primary {
    background: var(--gp-purple-primary);
    color: white;
    border: none;
  }

  .btn-outline {
    background: transparent;
    color: var(--gp-purple-primary);
    border: 2px solid var(--gp-purple-primary);
  }

  .btn-ghost {
    background: transparent;
    color: var(--gp-text-secondary);
    border: 1px solid var(--gp-border);
  }

  .btn-danger {
    background: transparent;
    color: #dc2626;
    border: 1px solid #dc2626;
  }
  ```

**Validation:** Buttons render with new styling, all click handlers work

---

### Step 12: Update Empty State
**Files:** `app/src/islands/pages/GuestProposalsPage.jsx`, `app/src/styles/components/guest-proposals.css`
**Purpose:** Modernize empty state styling

**Details:**
- Keep existing EmptyState component
- Update styling to match mockup

- CSS:
  ```css
  .empty-state {
    text-align: center;
    padding: 60px 24px;
    background: var(--gp-white);
    border: 1px solid var(--gp-border);
    border-radius: 16px;
  }

  .empty-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--gp-text);
    margin-bottom: 8px;
  }

  .empty-text {
    font-size: 14px;
    color: var(--gp-text-secondary);
    margin-bottom: 24px;
  }
  ```

**Validation:** Empty state has rounded corners, proper typography

---

### Step 13: Update Virtual Meetings Section
**Files:** `app/src/styles/components/guest-proposals.css`
**Purpose:** Harmonize VM section with new design system

**Details:**
- CSS-only changes to `.vm-section-*` classes
- Update border-radius to 12-16px
- Use new color variables
- Keep all existing logic in VirtualMeetingsSection.jsx

**Validation:** VM section matches new design aesthetic

---

### Step 14: Add Responsive Styles
**Files:** `app/src/styles/components/guest-proposals.css`
**Purpose:** Ensure design works on mobile/tablet

**Details:**
- Info grid: 4 columns -> 2 columns on tablet
- Hide progress labels on mobile
- Stack action buttons on mobile
- Full-width proposal rows on mobile

- CSS:
  ```css
  @media (max-width: 768px) {
    .info-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .progress-label {
      display: none;
    }

    .actions-row {
      flex-wrap: wrap;
    }

    .btn {
      flex: 1;
      min-width: 140px;
    }
  }
  ```

**Validation:** Page is usable on mobile, no horizontal scrolling

---

### Step 15: Final Cleanup and Testing
**Files:** All modified files
**Purpose:** Remove deprecated styles, test all functionality

**Details:**
- Remove unused CSS classes
- Test all modals open and close correctly
- Test proposal selection
- Test all button actions
- Test status banner for different statuses
- Test progress tracker for different stages
- Verify no console errors

**Validation:** All functionality preserved, no visual regressions

---

## Edge Cases & Error Handling
- **No proposals**: Empty state displays correctly
- **Single proposal**: List shows one row, still selectable
- **Long listing names**: Text truncates with ellipsis
- **Missing photos**: Fallback background color shows
- **Counteroffer status**: Original price strikethrough displays
- **Cancelled proposals**: Status banner shows cancel reason
- **Virtual meeting states**: All 8 VM button states display correctly

## Testing Considerations
- Test with proposals in different statuses (Pending, Accepted, Counteroffer, Cancelled)
- Test with proposals with/without virtual meetings
- Test all modal interactions
- Test responsive behavior at 768px and 480px breakpoints
- Test with long listing names and locations
- Test keyboard navigation for proposal selection
- Test with proposals that have warnings (some nights unavailable)

## Rollback Strategy
- All changes are in CSS and JSX structure only
- No database changes
- No logic changes to useGuestProposalsPageLogic.js
- Can revert by restoring original CSS file
- Git commit before each major step enables granular rollback

## Dependencies & Blockers
- None - all required data is already available in components
- No new API calls needed
- No new dependencies required

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking modal functionality | Low | High | Keep all modal imports and handlers unchanged |
| Missing status configurations | Low | Medium | Status configs are in separate logic file, not touched |
| Progress tracker regression | Low | Medium | Keep getStageColor() logic unchanged |
| Responsive layout issues | Medium | Low | Test at each breakpoint |
| Button handler disconnection | Low | High | Keep all onClick handlers unchanged |

---

## Summary of Files Modified

| File | Type of Change |
|------|----------------|
| `app/src/styles/components/guest-proposals.css` | Major CSS overhaul |
| `app/src/islands/pages/proposals/ProposalSelector.jsx` | JSX restructure (dropdown to list) |
| `app/src/islands/pages/proposals/ProposalCard.jsx` | JSX restructure (new section layout) |
| `app/src/islands/pages/GuestProposalsPage.jsx` | Minor (pass full proposals to selector) |

## Files NOT Modified (Preserved As-Is)
- `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` - All logic preserved
- `app/src/islands/pages/proposals/ProgressTracker.jsx` - Unused, keep for compatibility
- `app/src/islands/pages/proposals/VirtualMeetingsSection.jsx` - Logic preserved, CSS only
- All modal components - Imported and used unchanged
- All logic files in `logic/constants/`, `logic/rules/`, `lib/proposals/`
