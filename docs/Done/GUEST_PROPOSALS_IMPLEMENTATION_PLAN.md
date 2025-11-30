# Guest Proposals Page - Implementation Plan

**Created**: 2025-11-29
**Status**: Planning
**Source**: `Input/guest-proposals/`
**Target Route**: `/guest-proposals` and `/guest-proposals/:userId`

---

## Executive Summary

This plan outlines the integration of the guest-proposals static page into the Split Lease multi-page application. The implementation follows the four-layer logic architecture and hollow component pattern established in the codebase.

---

## Phase 1: Infrastructure Setup

### 1.1 Create HTML Entry Point

**File**: `app/public/guest-proposals.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Proposals | Split Lease</title>
  <link rel="icon" type="image/svg+xml" href="/assets/images/favicon.svg" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/guest-proposals.jsx"></script>
</body>
</html>
```

### 1.2 Update Vite Configuration

**File**: `app/vite.config.js`

Add to `configureServer` middleware (around line 85):
```javascript
// Handle guest-proposals with clean URL structure
else if (url === '/guest-proposals' || url.startsWith('/guest-proposals/') || url.startsWith('/guest-proposals?')) {
  req.url = '/public/guest-proposals.html';
}
else if (url.startsWith('/guest-proposals.html')) {
  const queryStart = url.indexOf('?');
  const queryString = queryStart !== -1 ? url.substring(queryStart) : '';
  req.url = '/public/guest-proposals.html' + queryString;
}
```

Add to `configurePreviewServer` (around line 168):
```javascript
// Handle guest-proposals with clean URL structure
else if (url === '/guest-proposals' || url.startsWith('/guest-proposals/') || url.startsWith('/guest-proposals?')) {
  req.url = '/guest-proposals.html';
}
```

Add to `rollupOptions.input` (around line 402):
```javascript
'guest-proposals': resolve(__dirname, 'public/guest-proposals.html'),
```

Add to `closeBundle` plugin (around line 276):
```javascript
// Create guest-proposals internal file
const guestProposalsSource = path.join(distDir, 'guest-proposals.html');
const guestProposalsDest = path.join(internalDir, 'guest-proposals-view');
if (fs.existsSync(guestProposalsSource)) {
  fs.copyFileSync(guestProposalsSource, guestProposalsDest);
  console.log('Created _internal/guest-proposals-view for Cloudflare routing');
}
```

### 1.3 Update Cloudflare Redirects

**File**: `app/public/_redirects`

Add:
```
# Handle guest-proposals page
/guest-proposals  /_internal/guest-proposals-view  200
/guest-proposals/  /_internal/guest-proposals-view  200
/guest-proposals/*  /_internal/guest-proposals-view  200
```

### 1.4 Update Routes Configuration

**File**: `app/public/_routes.json`

Update exclude array:
```json
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": [
    "/view-split-lease/*",
    "/view-split-lease",
    "/guest-proposals/*",
    "/guest-proposals"
  ]
}
```

---

## Phase 2: Entry Point & Island Component

### 2.1 Create Entry Point

**File**: `app/src/guest-proposals.jsx`

Source: Adapt from `Input/guest-proposals/src/main.jsx`

```javascript
import { createRoot } from 'react-dom/client';
import GuestProposalsPage from './islands/pages/GuestProposalsPage.jsx';
import './styles/main.css';
import './styles/components/guest-proposals.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<GuestProposalsPage />);
```

### 2.2 Create Island Page Component (Hollow Component)

**File**: `app/src/islands/pages/GuestProposalsPage.jsx`

Source: Adapt from `Input/guest-proposals/src/islands/pages/ProposalsIsland.jsx`

The component should:
- Import and use `useGuestProposalsPageLogic` hook
- Contain ONLY JSX rendering
- Delegate all state and handlers to the hook

### 2.3 Create Page Logic Hook

**File**: `app/src/islands/pages/useGuestProposalsPageLogic.js`

Source: Extract logic from `Input/guest-proposals/src/islands/pages/ProposalsIsland.jsx`

The hook should manage:
- User authentication state
- Proposal data fetching
- Selected proposal state
- Modal visibility states
- Dashboard config state
- All action handlers

---

## Phase 3: Components Migration

### 3.1 Proposal Components

| Source File | Target File |
|-------------|-------------|
| `Input/.../ProposalCard.jsx` | `app/src/islands/proposals/ProposalCard.jsx` |
| `Input/.../ProposalSelector.jsx` | `app/src/islands/proposals/ProposalSelector.jsx` |
| `Input/.../VirtualMeetingsSection.jsx` | `app/src/islands/proposals/VirtualMeetingsSection.jsx` |
| `Input/.../FloatingProposalSummary.jsx` | `app/src/islands/proposals/FloatingProposalSummary.jsx` |
| `Input/.../ProgressTracker.jsx` | `app/src/islands/proposals/ProgressTracker.jsx` |

### 3.2 Modal Components

| Source File | Target File |
|-------------|-------------|
| `Input/.../CompareTermsModal.jsx` | `app/src/islands/proposals/CompareTermsModal.jsx` |
| `Input/.../ModifyProposalModal.jsx` | `app/src/islands/proposals/ModifyProposalModal.jsx` |
| `Input/.../CancelProposalModal.jsx` | `app/src/islands/proposals/CancelProposalModal.jsx` |
| `Input/.../MapsModal.jsx` | `app/src/islands/proposals/MapsModal.jsx` |
| `Input/.../HostProfileModal.jsx` | `app/src/islands/proposals/HostProfileModal.jsx` |

### 3.3 State Components

| Source File | Target File |
|-------------|-------------|
| `Input/.../EmptyState.jsx` | `app/src/islands/proposals/EmptyState.jsx` |
| `Input/.../LoadingState.jsx` | `app/src/islands/proposals/LoadingState.jsx` |
| `Input/.../ErrorState.jsx` | `app/src/islands/proposals/ErrorState.jsx` |

### 3.4 Directory Structure

Create new directory:
```
app/src/islands/proposals/
├── CLAUDE.md
├── ProposalCard.jsx
├── ProposalSelector.jsx
├── VirtualMeetingsSection.jsx
├── FloatingProposalSummary.jsx
├── ProgressTracker.jsx
├── CompareTermsModal.jsx
├── ModifyProposalModal.jsx
├── CancelProposalModal.jsx
├── MapsModal.jsx
├── HostProfileModal.jsx
├── EmptyState.jsx
├── LoadingState.jsx
└── ErrorState.jsx
```

---

## Phase 4: Four-Layer Logic Architecture

### 4.1 Constants (New Files)

**File**: `app/src/logic/constants/proposalStatuses.js`

Source: `Input/.../lib/constants/proposalStatuses.js`

Contains:
- `PROPOSAL_STATUSES` object with all status configurations
- `getStatusConfig(statusKey)` function
- `getStageFromStatus(statusKey)` function
- `getActionsForStatus(statusKey)` function

**File**: `app/src/logic/constants/proposalStages.js`

Source: `Input/.../lib/constants/proposalStages.js`

Contains:
- `PROPOSAL_STAGES` array with stage definitions
- `getStageById(stageId)` function
- `getStageProgress(currentStage, completedStages)` function

### 4.2 Rules Layer (Existing + Updates)

**Update**: `app/src/logic/rules/proposals/proposalRules.js`

Add/verify rules:
- `canCancelProposal(proposal)` - Already exists, verify logic
- `canModifyProposal(proposal)` - Already exists, verify logic
- `canAcceptCounteroffer(proposal)` - Add if missing
- `hasCounteroffer(proposal)` - Add if missing
- `isProposalExpired(proposal)` - Add if missing

**Update**: `app/src/logic/rules/proposals/virtualMeetingRules.js`

Verify/add rules:
- `canRequestVirtualMeeting(proposal, vm)` - Exists
- `canRespondToVirtualMeeting(vm, userId)` - Exists
- `isVirtualMeetingConfirmed(vm)` - Exists
- `hasDeclinedVirtualMeeting(vm)` - Add if missing

**New File**: `app/src/logic/rules/proposals/useProposalButtonStates.js`

Hook that determines which buttons to show based on proposal state.

### 4.3 Processors Layer

**Update**: `app/src/logic/processors/proposals/processProposalData.js`

Add transformations:
- `processProposalForDisplay(rawProposal)` - Full transformation
- `extractCounterOfferChanges(proposal)` - Detect changes
- `resolveHouseRulesForProposal(proposal)` - Resolve rule IDs to names

**New File**: `app/src/logic/processors/proposals/processVirtualMeetingData.js`

Add transformations:
- `processVirtualMeetingForDisplay(rawVm)` - Clean VM data
- `getVirtualMeetingState(vm, proposal, currentUserId)` - State machine

### 4.4 Workflows Layer

**Update**: `app/src/logic/workflows/proposals/cancelProposalWorkflow.js`

Verify workflow handles all 7 Bubble.io cancellation conditions.

**Update**: `app/src/logic/workflows/proposals/virtualMeetingWorkflow.js`

Add/verify:
- `requestVirtualMeetingWorkflow(proposalId, guestId)` - Exists
- `requestAlternativeVirtualMeetingWorkflow(vmId, proposalId, guestId)` - Add
- `respondToVirtualMeetingWorkflow(vmId, bookedDate)` - Exists
- `declineVirtualMeetingWorkflow(vmId)` - Add if missing

**Update**: `app/src/logic/workflows/proposals/counterofferWorkflow.js`

Add/verify:
- `acceptCounterOfferWorkflow(proposal)` - Accept host's terms
- `declineCounterOfferWorkflow(proposal)` - Decline counteroffer

**Update**: `app/src/logic/workflows/proposals/navigationWorkflow.js`

Add/verify:
- `navigateToSearch()` - Exists
- `navigateToMessaging(hostId, proposalId)` - Add if missing
- `navigateToListing(proposal)` - Exists
- `navigateToRentalApplication(proposalId)` - Add
- `navigateToDocumentReview(proposalId)` - Add
- `navigateToInitialPayment(proposalId)` - Add

---

## Phase 5: Data Layer (Supabase Queries)

### 5.1 User Proposal Queries

**File**: `app/src/lib/supabase/userProposalQueries.js`

Source: `Input/.../lib/supabase/userProposalQueries.js`

Functions to implement:
- `fetchUserById(userId)` - Get user with Proposals List
- `fetchProposalsByIds(proposalIds)` - Get proposals with enrichments
- `fetchUserProposals(userId)` - Combined fetch

### 5.2 House Rules Queries

**File**: `app/src/lib/supabase/houseRulesQueries.js`

Source: `Input/.../lib/supabase/houseRulesQueries.js`

Functions:
- `fetchHouseRulesByIds(ruleIds)` - Get rules from `zat_features_houserule`
- `resolveProposalHouseRules(proposal)` - Resolve priority (counteroffer > original > listing)

### 5.3 Virtual Meeting Queries

**File**: `app/src/lib/supabase/virtualMeetingQueries.js`

Source: `Input/.../lib/supabase/virtualMeetingQueries.js`

Functions:
- `fetchVirtualMeetingsByProposalIds(proposalIds)` - Get VMs for proposals
- `createVirtualMeeting(vmData)` - Insert new VM
- `updateVirtualMeeting(vmId, updates)` - Update VM

### 5.4 Data Transformers

**File**: `app/src/lib/supabase/dataTransformers.js`

Source: `Input/.../lib/supabase/dataTransformers.js`

Functions:
- `transformProposalFromSupabase(rawProposal)` - Normalize field names
- `transformListingFromSupabase(rawListing)` - Normalize listing
- `transformUserFromSupabase(rawUser)` - Normalize user
- `formatPrice(amount)` - Format as currency
- `formatDate(date)` - Format as MMM DD, YYYY

---

## Phase 6: Styles

### 6.1 Main Styles

**File**: `app/src/styles/components/guest-proposals.css`

Source: Merge from:
- `Input/.../styles/main.css`
- `Input/.../styles/modals.css`

Ensure:
- Use existing CSS variables from `app/src/styles/variables.css`
- Follow naming conventions (`kebab-case`)
- Mobile-first responsive design

### 6.2 Style Integration

Update `app/src/styles/main.css` to import:
```css
@import './components/guest-proposals.css';
```

---

## Phase 7: Integration Tasks

### 7.1 Update Index Exports

**File**: `app/src/logic/index.js`

Add exports for new files.

**File**: `app/src/logic/workflows/index.js`

Add exports for new workflows.

**File**: `app/src/logic/rules/index.js`

Add exports for new rules.

### 7.2 Authentication Integration

The page is protected. Integration requirements:
1. Check auth status on mount using `checkAuthStatus()`
2. Redirect to login if not authenticated
3. Use `validateTokenAndFetchUser()` to get current user
4. Pass user ID to data fetching functions

### 7.3 Header/Footer Integration

Use existing shared components:
```javascript
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
```

### 7.4 Google Maps Integration

For MapsModal, use existing Google Maps setup:
- API key from `VITE_GOOGLE_MAPS_API_KEY`
- Existing map utilities from `lib/constants.js`

---

## Implementation Order

### Day 1: Infrastructure
- [ ] Create `guest-proposals.html`
- [ ] Update `vite.config.js` (dev server + build)
- [ ] Update `_redirects`
- [ ] Update `_routes.json`
- [ ] Verify dev server routing works

### Day 2: Entry Point & Core Structure
- [ ] Create `guest-proposals.jsx` entry point
- [ ] Create `GuestProposalsPage.jsx` (hollow component)
- [ ] Create `useGuestProposalsPageLogic.js` hook
- [ ] Create `islands/proposals/` directory
- [ ] Create `CLAUDE.md` for directory

### Day 3: Data Layer
- [ ] Implement `userProposalQueries.js`
- [ ] Implement `houseRulesQueries.js`
- [ ] Implement `virtualMeetingQueries.js`
- [ ] Implement `dataTransformers.js`
- [ ] Test all queries with real data

### Day 4: Constants & Rules
- [ ] Create `proposalStatuses.js`
- [ ] Create `proposalStages.js`
- [ ] Update `proposalRules.js`
- [ ] Update `virtualMeetingRules.js`
- [ ] Create `useProposalButtonStates.js`

### Day 5: Processors & Workflows
- [ ] Update `processProposalData.js`
- [ ] Create `processVirtualMeetingData.js`
- [ ] Update `cancelProposalWorkflow.js`
- [ ] Update `virtualMeetingWorkflow.js`
- [ ] Update `counterofferWorkflow.js`
- [ ] Update `navigationWorkflow.js`

### Day 6: Core Components
- [ ] Implement `ProposalCard.jsx`
- [ ] Implement `ProposalSelector.jsx`
- [ ] Implement `ProgressTracker.jsx`
- [ ] Implement state components (Empty, Loading, Error)
- [ ] Style core components

### Day 7: Modal Components
- [ ] Implement `CompareTermsModal.jsx`
- [ ] Implement `ModifyProposalModal.jsx`
- [ ] Implement `CancelProposalModal.jsx`
- [ ] Style modal components

### Day 8: Additional Components
- [ ] Implement `MapsModal.jsx` (Google Maps integration)
- [ ] Implement `HostProfileModal.jsx`
- [ ] Implement `VirtualMeetingsSection.jsx`
- [ ] Implement `FloatingProposalSummary.jsx`

### Day 9: Integration & Polish
- [ ] Wire up authentication
- [ ] Add Header/Footer
- [ ] Test all workflows end-to-end
- [ ] Fix styling issues
- [ ] Responsive testing

### Day 10: Testing & Documentation
- [ ] Run through test checklist
- [ ] Fix discovered issues
- [ ] Update CLAUDE.md files
- [ ] Production build test
- [ ] Deploy test

---

## File Mapping Summary

| Input Path | Target Path |
|------------|-------------|
| `src/main.jsx` | `app/src/guest-proposals.jsx` |
| `src/islands/pages/ProposalsIsland.jsx` | `app/src/islands/pages/GuestProposalsPage.jsx` + `useGuestProposalsPageLogic.js` |
| `src/components/proposals/*` | `app/src/islands/proposals/*` |
| `src/lib/supabase/userProposalQueries.js` | `app/src/lib/supabase/userProposalQueries.js` |
| `src/lib/supabase/houseRulesQueries.js` | `app/src/lib/supabase/houseRulesQueries.js` |
| `src/lib/supabase/virtualMeetingQueries.js` | `app/src/lib/supabase/virtualMeetingQueries.js` |
| `src/lib/supabase/dataTransformers.js` | `app/src/lib/supabase/dataTransformers.js` |
| `src/lib/constants/proposalStatuses.js` | `app/src/logic/constants/proposalStatuses.js` |
| `src/lib/constants/proposalStages.js` | `app/src/logic/constants/proposalStages.js` |
| `src/lib/workflows/cancelProposal.js` | `app/src/logic/workflows/proposals/cancelProposalWorkflow.js` (update) |
| `src/lib/workflows/virtualMeetings.js` | `app/src/logic/workflows/proposals/virtualMeetingWorkflow.js` (update) |
| `src/lib/workflows/counterofferActions.js` | `app/src/logic/workflows/proposals/counterofferWorkflow.js` (update) |
| `src/lib/workflows/navigation.js` | `app/src/logic/workflows/proposals/navigationWorkflow.js` (update) |
| `src/lib/utils/urlParser.js` | `app/src/lib/utils/urlParser.js` |
| `src/styles/main.css` | `app/src/styles/components/guest-proposals.css` |
| `src/styles/modals.css` | Merge into `guest-proposals.css` |

---

## Critical Considerations

### 1. Day Indexing
- Input uses day names: `["Monday", "Tuesday", ...]`
- Internal uses 0-based: `[1, 2, 3, 4, 5]` (Mon-Fri)
- Bubble uses 1-based: `[2, 3, 4, 5, 6]` (Mon-Fri)
- Use `adaptDaysFromBubble` / `adaptDaysToBubble` at boundaries

### 2. Field Name Variations
- Database: `Status`, `Created Date`, `Modified Date`
- Transformed: `status`, `createdDate`, `modifiedDate`
- Always transform at data layer, use camelCase in components

### 3. Counteroffer Fields
- Original: `Total Price for Reservation (guest)`, `nights per week (num)`, etc.
- Counteroffer: `hc total price`, `hc nights per week`, etc.
- Check `counter offer happened` flag before using `hc_*` fields

### 4. Virtual Meeting FK Issue
- `virtual_meetings` table has FK to `proposals` (plural)
- Actual table is `proposal` (singular)
- FKs may not enforce - rely on text-based refs

### 5. Host Lookup Indirection
- `listing["Host / Landlord"]` is `account_host._id` NOT `user._id`
- Must join: `user["Account - Host / Landlord"] = listing["Host / Landlord"]`

### 6. Protected Page
- Route requires authentication
- Redirect to login on auth failure
- Use user ID from auth to fetch their proposals

---

## Dependencies

### npm Packages (Existing)
- `@supabase/supabase-js` - Database client
- `react` / `react-dom` - UI framework

### External APIs
- Google Maps - For MapsModal (existing API key)
- Supabase - Database and Edge Functions

### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key

---

## Success Criteria

1. **Route Works**: `/guest-proposals` loads the page
2. **Auth Works**: Non-logged-in users redirected to login
3. **Data Loads**: User's proposals display correctly
4. **Interactions Work**: All buttons trigger correct workflows
5. **Modals Work**: All modals open, display data, and actions work
6. **Responsive**: Page works on mobile and desktop
7. **Build Passes**: `npm run build` succeeds
8. **Deploy Works**: Cloudflare Pages deployment succeeds

---

## Notes

- This plan follows the existing architecture patterns in the codebase
- All business logic goes in the four-layer logic system
- Components use the hollow component pattern
- Data transformation happens at the query layer
- CSS uses existing variables and conventions
