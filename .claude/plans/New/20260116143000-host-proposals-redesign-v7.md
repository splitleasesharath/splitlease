# Implementation Plan: Host Proposals Page Redesign (V7 Design)

## Overview
Redesign the host-proposals page from a grid-based card layout to a collapsible list-based design following the V7-inspired mockup. This involves creating new listing pill selectors, collapsible proposal cards with section grouping, enhanced guest info display, AI summaries, and status-based styling.

## Success Criteria
- [ ] Listing selector displays as horizontal pill/chip style with thumbnails and proposal counts
- [ ] Proposals display as collapsible cards in a vertical list (not grid)
- [ ] Cards grouped by section: "Action Needed" (purple), "In Progress", "Closed"
- [ ] Card headers show guest avatar, name, badges, meta info, status tag, and expand chevron
- [ ] Expanded cards show status banner, AI summary (for new), guest info, quick links, info grid, days row, pricing, progress tracker, and action buttons
- [ ] Status-based styling applied (purple for action needed, green for accepted, yellow for counter, red for declined)
- [ ] Responsive design: mobile-friendly with appropriate layout changes
- [ ] Existing logic hook (`useHostProposalsPageLogic.js`) continues working without modification
- [ ] Hollow component pattern preserved

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/HostProposalsPage/index.jsx` | Hollow page component | Major restructure - new layout with sections |
| `app/src/islands/pages/HostProposalsPage/ListingSelector.jsx` | Listing dropdown | **REPLACE** with new ListingPillSelector |
| `app/src/islands/pages/HostProposalsPage/ProposalGrid.jsx` | Grid container | **REPLACE** with new ProposalListSection |
| `app/src/islands/pages/HostProposalsPage/ProposalCard.jsx` | Proposal card | **REPLACE** with new CollapsibleProposalCard |
| `app/src/islands/pages/HostProposalsPage/DayIndicator.jsx` | Day visualization | Minor updates for new pill style |
| `app/src/islands/pages/HostProposalsPage/EmptyState.jsx` | No proposals state | Update styling to match new design |
| `app/src/islands/pages/HostProposalsPage/types.js` | Type definitions | Add new status helper functions |
| `app/src/islands/pages/HostProposalsPage/formatters.js` | Formatting utilities | Add new formatters |
| `app/src/styles/components/host-proposals.css` | Page styles | **MAJOR REWRITE** - new design system |
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | Logic hook | **NO CHANGES** - preserve existing logic |

### New Files to Create
| File | Purpose |
|------|---------|
| `ListingPillSelector.jsx` | Horizontal pill selector with thumbnails |
| `CollapsibleProposalCard.jsx` | Expandable card with header/body |
| `ProposalListSection.jsx` | Section container with header (Action Needed, etc.) |
| `ProposalCardHeader.jsx` | Collapsed state: avatar, name, badges, meta, status |
| `ProposalCardBody.jsx` | Expanded state: all detail sections |
| `StatusBanner.jsx` | Status banner with icon and message |
| `AISummaryCard.jsx` | AI-generated summary display |
| `GuestInfoCard.jsx` | Guest profile with avatar, bio, badges |
| `QuickLinksRow.jsx` | Full Profile, Message, Schedule Meeting links |
| `InfoGrid.jsx` | 5-column info grid (move-in, move-out, duration, schedule, nights) |
| `DayPillsRow.jsx` | Days visualization with pill styling |
| `PricingRow.jsx` | Pricing breakdown and total earnings |
| `ProgressTracker.jsx` | Progress steps for accepted proposals |
| `ActionButtonsRow.jsx` | Context-sensitive action buttons |

### Related Documentation
- Mockup: `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL22\Design\2026\Ongoing Projects\host-proposals\host-proposals-mockup-v1.html`
- CSS Variables: `app/src/styles/variables.css`
- Existing types: `app/src/islands/pages/HostProposalsPage/types.js`

### Existing Patterns to Follow
- **Hollow Component Pattern**: All logic stays in `useHostProposalsPageLogic.js`
- **Feather Icons**: Use react-feather for all icons
- **CSS Variables**: Use existing color/spacing variables from variables.css
- **Day Indexing**: 0-based (0=Sunday through 6=Saturday)

## Implementation Steps

### Step 1: Create New CSS Foundation
**Files:** `app/src/styles/components/host-proposals-v7.css` (new)
**Purpose:** Create new CSS file with V7 design styles. Keep existing CSS until migration complete.
**Details:**
- Define new CSS variables matching mockup (--purple-bg, --green-bg, etc.)
- Create listing pill selector styles
- Create collapsible card styles
- Create section header styles
- Create all internal component styles (status banner, guest info, info grid, etc.)
- Create responsive breakpoints (mobile: 768px)
**Validation:** Visual inspection of CSS completeness

### Step 2: Create ListingPillSelector Component
**Files:** `app/src/islands/pages/HostProposalsPage/ListingPillSelector.jsx`
**Purpose:** Replace dropdown selector with horizontal pill/chip selector
**Details:**
- Props: `listings`, `selectedListing`, `onListingChange`, `proposalCounts` (map of listingId to count)
- Each pill shows: circular thumbnail, listing name, proposal count badge
- Active pill gets purple background/border
- Flex-wrap for mobile responsiveness
- Use existing listing thumbnail from listing data or placeholder
**Validation:** Renders all listings as pills, click changes selection

### Step 3: Create Section Grouping Logic
**Files:** `app/src/islands/pages/HostProposalsPage/types.js`
**Purpose:** Add functions to categorize proposals into sections
**Details:**
- `groupProposalsBySection(proposals)` returns `{ actionNeeded: [], inProgress: [], closed: [] }`
- Action Needed: status in ['proposal_submitted', 'host_review'] OR guest counteroffer
- In Progress: status in ['accepted', 'host_counteroffer', 'lease_*']
- Closed: status in ['cancelled_*', 'rejected_by_host', 'payment_submitted']
- `getCardVariant(proposal)` returns 'action-needed' | 'accepted' | 'counteroffer' | 'declined' | 'default'
**Validation:** Unit test with sample proposals

### Step 4: Create CollapsibleProposalCard Component
**Files:** `app/src/islands/pages/HostProposalsPage/CollapsibleProposalCard.jsx`
**Purpose:** Main card component with expand/collapse behavior
**Details:**
- Props: `proposal`, `isExpanded`, `onToggle`, `onAction`, `currentUserId`
- State: controlled expansion via parent
- Render ProposalCardHeader + ProposalCardBody
- CSS class based on `getCardVariant(proposal)` for styling
- max-height animation for smooth expand/collapse
**Validation:** Click header toggles expansion with animation

### Step 5: Create ProposalCardHeader Component
**Files:** `app/src/islands/pages/HostProposalsPage/ProposalCardHeader.jsx`
**Purpose:** Collapsed view showing key proposal info
**Details:**
- Guest circular avatar (44px)
- Guest name with badges (New badge if recent, Verified if ID verified)
- Meta line: schedule + duration + total earnings
- Status tag with appropriate color
- Chevron icon that rotates when expanded
- All data extracted from proposal object
**Validation:** Displays correct guest info, badges, and status

### Step 6: Create ProposalCardBody Component
**Files:** `app/src/islands/pages/HostProposalsPage/ProposalCardBody.jsx`
**Purpose:** Expanded view with all proposal details
**Details:**
- Conditionally render based on status:
  - StatusBanner (always)
  - AISummaryCard (only for new proposals)
  - GuestInfoCard (always)
  - QuickLinksRow (always)
  - InfoGrid (always)
  - DayPillsRow (always, hidden on mobile)
  - PricingRow (always)
  - ProgressTracker (only for accepted proposals)
  - ActionButtonsRow (always)
**Validation:** All sections render correctly based on status

### Step 7: Create StatusBanner Component
**Files:** `app/src/islands/pages/HostProposalsPage/StatusBanner.jsx`
**Purpose:** Colored banner with status icon and message
**Details:**
- Props: `status`, `submittedDate`
- Map status to: background color, icon, message text
- Examples:
  - New Proposal: purple bg, inbox icon, "New Proposal - Submitted X ago"
  - Guest Counter: yellow bg, repeat icon, "Guest Counteroffer - Marcus proposed different terms"
  - Accepted: green bg, check icon, "Accepted - Waiting for guest to complete rental application"
**Validation:** Correct colors and messages for each status

### Step 8: Create AISummaryCard Component
**Files:** `app/src/islands/pages/HostProposalsPage/AISummaryCard.jsx`
**Purpose:** Display AI-generated guest summary for new proposals
**Details:**
- Props: `summary` (string from proposal.ai_summary or similar field)
- Gradient purple background
- CPU icon with "AI Summary" label
- Summary text
- Only render if summary exists and status is new
**Validation:** Renders with proper styling when summary exists

### Step 9: Create GuestInfoCard Component
**Files:** `app/src/islands/pages/HostProposalsPage/GuestInfoCard.jsx`
**Purpose:** Guest profile section with avatar, bio, and badges
**Details:**
- Props: `guest` (guest object from proposal)
- Large avatar (56px)
- Guest name
- Bio text (from guest.bio or about field)
- Verification badges: ID Verified, Work Verified, X Reviews, Member since YYYY
- Extract data from guest object with fallbacks
**Validation:** Displays guest info with proper badge states

### Step 10: Create QuickLinksRow Component
**Files:** `app/src/islands/pages/HostProposalsPage/QuickLinksRow.jsx`
**Purpose:** Action links row (Full Profile, Message, Schedule Meeting)
**Details:**
- Props: `onViewProfile`, `onMessage`, `onScheduleMeeting`
- Three link-style buttons with feather icons
- Full Profile (user icon), Message Guest (message-circle), Schedule Meeting (video)
- Purple text, hover shows purple background
**Validation:** All three links render and trigger callbacks

### Step 11: Create InfoGrid Component
**Files:** `app/src/islands/pages/HostProposalsPage/InfoGrid.jsx`
**Purpose:** 5-column info grid with proposal details
**Details:**
- Props: `moveIn`, `moveOut`, `duration`, `schedule`, `nightsPerWeek`
- 5 columns on desktop, 2 columns on mobile
- Each cell: label (small, uppercase) + value (larger, bold)
- Format dates as "Jan 15, 2026"
- Schedule as "Mon - Fri"
- Nights as "4/week"
**Validation:** Responsive grid with correct formatting

### Step 12: Create DayPillsRow Component
**Files:** `app/src/islands/pages/HostProposalsPage/DayPillsRow.jsx`
**Purpose:** Visual day-of-week pills showing selected schedule
**Details:**
- Props: `daysSelected` (array of 0-indexed days)
- 7 pills: S M T W T F S
- Selected days get dark purple background
- Unselected days get gray background
- Right side shows: "X days, Y nights" + "Mon check-in, Fri check-out"
- Hidden on mobile (display: none at 768px)
**Validation:** Correct days highlighted, correct text

### Step 13: Create PricingRow Component
**Files:** `app/src/islands/pages/HostProposalsPage/PricingRow.jsx`
**Purpose:** Pricing breakdown and total earnings display
**Details:**
- Props: `nightlyRate`, `nightsPerWeek`, `weeks`, `totalEarnings`
- Left: breakdown formula "$165/night x 4 x 12 wks"
- Right: "Your Earnings" label + large total "$7,920"
- Gray background
**Validation:** Correct calculation display

### Step 14: Create ProgressTracker Component (New Version)
**Files:** `app/src/islands/pages/HostProposalsPage/ProgressTrackerV7.jsx`
**Purpose:** Horizontal progress steps for accepted proposals
**Details:**
- Props: `currentStep` (number 0-5)
- Steps: Submitted, Reviewed, Accepted, Application, Lease, Active
- Completed steps: dark purple dot + line
- Current step: larger dot with shadow
- Future steps: gray dot + line
- Labels below each dot
**Validation:** Correct step highlighting based on status

### Step 15: Create ActionButtonsRow Component
**Files:** `app/src/islands/pages/HostProposalsPage/ActionButtonsRow.jsx`
**Purpose:** Context-sensitive action buttons
**Details:**
- Props: `status`, `onAccept`, `onModify`, `onDecline`, `onRemindGuest`, `onMessage`, `onScheduleMeeting`
- Map status to appropriate button set:
  - New: Accept (green), Modify (outline), Decline (danger)
  - Guest Counter: Accept Counter, Counter Again, Decline
  - Accepted: Remind Guest (primary), Schedule Meeting, Message
  - Host Counter: Edit Counter, Message, Withdraw
  - Declined: Remove only
**Validation:** Correct buttons render for each status

### Step 16: Create ProposalListSection Component
**Files:** `app/src/islands/pages/HostProposalsPage/ProposalListSection.jsx`
**Purpose:** Section container with header and proposal list
**Details:**
- Props: `title`, `icon`, `count`, `variant` ('action-needed' | 'default'), `proposals`, `expandedId`, `onToggle`, `onAction`, `currentUserId`
- Section header with icon, title, count badge
- Map proposals to CollapsibleProposalCard components
- Action Needed section gets purple styling
**Validation:** Section renders with correct styling and cards

### Step 17: Update Page Component (index.jsx)
**Files:** `app/src/islands/pages/HostProposalsPage/index.jsx`
**Purpose:** Integrate new components into hollow component
**Details:**
- Add state: `expandedProposalId` for controlling which card is expanded
- Import new components
- Add grouping logic call: `const grouped = groupProposalsBySection(proposals)`
- Replace ListingSelector with ListingPillSelector
- Replace ProposalGrid with three ProposalListSection components
- Wire up all callbacks to existing hook handlers
- Calculate proposalCounts map for ListingPillSelector
**Validation:** Page renders with new design, all interactions work

### Step 18: Update CSS Import
**Files:** `app/src/host-proposals.jsx` (entry point)
**Purpose:** Import new CSS file
**Details:**
- Replace import of `host-proposals.css` with `host-proposals-v7.css`
- Or import both during transition and remove old after verification
**Validation:** New styles applied

### Step 19: Responsive Testing and Fixes
**Files:** `app/src/styles/components/host-proposals-v7.css`
**Purpose:** Ensure mobile responsiveness
**Details:**
- Test at 768px and 640px breakpoints
- Pills should wrap and shrink
- Info grid: 5 cols -> 2 cols
- Days pills hidden on mobile
- Action buttons wrap to full width
- Guest info card stacks vertically
**Validation:** Visual inspection at all breakpoints

### Step 20: Cleanup and Migration
**Files:** Multiple
**Purpose:** Remove old components and CSS
**Details:**
- After validation, delete old ProposalCard.jsx
- Delete old ProposalGrid.jsx
- Delete old ListingSelector.jsx
- Rename host-proposals-v7.css to host-proposals.css
- Update imports
- Remove any dead code
**Validation:** No unused files, no broken imports

## Edge Cases & Error Handling

### Empty States
- No listings: Show "Create your first listing" CTA
- No proposals for listing: Use updated EmptyState component
- Empty section: Don't render section at all (use conditional rendering)

### Data Edge Cases
- Missing guest photo: Use ui-avatars.com fallback
- Missing AI summary: Don't render AISummaryCard
- Missing guest bio: Show "No bio available"
- Null/undefined fields: Use defensive coding with nullish coalescing

### Status Edge Cases
- Unknown status: Fall back to "Pending" with default styling
- Multiple counteroffers: Track which is latest via timestamp

## Testing Considerations

### Manual Testing
- Click all listing pills, verify selection changes
- Expand/collapse all cards, verify animation
- Click all action buttons, verify callbacks
- Test at mobile, tablet, desktop widths
- Verify section grouping is correct
- Verify status colors match design

### Data Scenarios to Verify
- Listing with 0 proposals
- Listing with 1 proposal in each status
- Listing with 10+ proposals
- Proposal with all fields populated
- Proposal with minimal fields

## Rollback Strategy
- Keep old components in place with _old suffix during development
- Use feature flag or environment variable to toggle between old/new
- If issues found in production, revert entry point import to old CSS

## Dependencies & Blockers
- react-feather package must be installed (verify in package.json)
- AI summary field must exist in proposal data structure (or skip AISummaryCard initially)
- Guest bio field must be fetched in useHostProposalsPageLogic (may need query update)

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Missing data fields | Medium | Medium | Add fallbacks, make components defensive |
| Logic hook changes required | Low | High | Plan carefully to avoid hook changes |
| CSS conflicts with existing styles | Medium | Low | Use new class prefixes (e.g., hp-v7-) |
| Mobile layout issues | Medium | Medium | Test early and often at mobile widths |
| Performance with many proposals | Low | Medium | Use React.memo for card components |

## File Summary

### Files to Create (14 new)
1. `app/src/styles/components/host-proposals-v7.css`
2. `app/src/islands/pages/HostProposalsPage/ListingPillSelector.jsx`
3. `app/src/islands/pages/HostProposalsPage/CollapsibleProposalCard.jsx`
4. `app/src/islands/pages/HostProposalsPage/ProposalCardHeader.jsx`
5. `app/src/islands/pages/HostProposalsPage/ProposalCardBody.jsx`
6. `app/src/islands/pages/HostProposalsPage/StatusBanner.jsx`
7. `app/src/islands/pages/HostProposalsPage/AISummaryCard.jsx`
8. `app/src/islands/pages/HostProposalsPage/GuestInfoCard.jsx`
9. `app/src/islands/pages/HostProposalsPage/QuickLinksRow.jsx`
10. `app/src/islands/pages/HostProposalsPage/InfoGrid.jsx`
11. `app/src/islands/pages/HostProposalsPage/DayPillsRow.jsx`
12. `app/src/islands/pages/HostProposalsPage/PricingRow.jsx`
13. `app/src/islands/pages/HostProposalsPage/ProgressTrackerV7.jsx`
14. `app/src/islands/pages/HostProposalsPage/ActionButtonsRow.jsx`
15. `app/src/islands/pages/HostProposalsPage/ProposalListSection.jsx`

### Files to Modify (4 existing)
1. `app/src/islands/pages/HostProposalsPage/index.jsx` - Major restructure
2. `app/src/islands/pages/HostProposalsPage/types.js` - Add grouping functions
3. `app/src/islands/pages/HostProposalsPage/formatters.js` - Add new formatters
4. `app/src/host-proposals.jsx` - Update CSS import

### Files to Delete After Migration (3 existing)
1. `app/src/islands/pages/HostProposalsPage/ListingSelector.jsx`
2. `app/src/islands/pages/HostProposalsPage/ProposalGrid.jsx`
3. `app/src/islands/pages/HostProposalsPage/ProposalCard.jsx`

### Files to Keep (no changes)
1. `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` - **PRESERVE AS-IS**
2. `app/src/islands/pages/HostProposalsPage/DayIndicator.jsx` - Keep for backward compatibility
3. `app/src/islands/pages/HostProposalsPage/EmptyState.jsx` - Minor styling updates only
4. `app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx` - Keep for now (may update later)
