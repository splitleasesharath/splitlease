# Guest Proposals Page - Quick Reference

**GENERATED**: 2026-01-20
**PAGE_URL**: `/guest-proposals` or `/guest-proposals?proposal={proposalId}`
**ENTRY_POINT**: `app/src/guest-proposals.jsx`

---

## ### AUTHENTICATION ###

**IMPORTANT**: This page requires authenticated Guest users only.

### Access Control Matrix
| Condition | Action | Redirect Reason |
|-----------|--------|-----------------|
| Not logged in | Redirect to `/` (home) | `NOT_AUTHENTICATED` |
| Token invalid | Redirect to `/` (home) | `TOKEN_INVALID` |
| Logged in as Host | Redirect to `/` (home) | `NOT_GUEST` |
| Logged in as Guest | Show proposals page | N/A |

### Auth State Object
The hook maintains an `authState` object with the following structure:
```javascript
const [authState, setAuthState] = useState({
  isChecking: true,      // Currently validating auth
  isAuthenticated: false, // User has valid session
  isGuest: false,         // User type is 'Guest'
  shouldRedirect: false,  // Redirect triggered
  redirectReason: null    // 'NOT_AUTHENTICATED' | 'TOKEN_INVALID' | 'NOT_GUEST' | null
});
```

### Auth Check Flow (Two-Step Pattern)
```
1. Page loads -> authState.isChecking = true
2. Clean legacy URL patterns (cleanLegacyUserIdFromUrl)
3. Step 1: Lightweight auth check (checkAuthStatus)
   |- Not authenticated -> redirect to / (NOT_AUTHENTICATED)
   |- Authenticated -> continue to Step 2
4. Step 2: Validate token AND fetch user data (validateTokenAndFetchUser)
   |- Token invalid -> redirect to / (TOKEN_INVALID)
   |- Valid -> get userType from response
       |- Not Guest -> redirect to / (NOT_GUEST)
       |- Is Guest -> load proposals
```

**IMPORTANT**: This two-step pattern prevents race conditions where `getUserType()`
was called before user data was fetched and cached. The same pattern is used in
`FavoriteListingsPage`, `SearchPage`, and `ViewSplitLeasePage`.

### Key Auth Functions Used
```javascript
import { checkAuthStatus, validateTokenAndFetchUser } from 'lib/auth.js'
import { getSessionId } from 'lib/secureStorage.js'

// Step 1: Lightweight check if tokens/cookies exist
const isAuthenticated = await checkAuthStatus()

// Step 2: Validate token AND fetch user data (including userType)
const userData = await validateTokenAndFetchUser()
// userData = { userId, firstName, fullName, email, profilePhoto, userType }

// Check userType - handles both 'Guest' and 'A Guest (I would like to rent a space)'
const userType = userData.userType
const isGuest = userType === 'Guest' || userType?.includes('Guest')

// Get user ID from secure session storage
const userId = getSessionId()
```

### Session Storage Keys
| Key | Storage Key | Purpose |
|-----|-------------|---------|
| Auth Token | `__sl_at__` | Bearer token (encrypted) |
| Session ID | `__sl_sid__` | User ID / Bubble unique ID |
| User Type | `sl_user_type` | 'Host' or 'Guest' |

User ID comes from **session storage** (`getSessionId()`), NOT from URL.
Legacy URLs with user ID in path or query are cleaned automatically.

---

## ### ARCHITECTURE_OVERVIEW ###

```
guest-proposals.jsx (Entry Point)
    |
    +-- GuestProposalsPage.jsx (Hollow Component)
            |
            +-- useGuestProposalsPageLogic.js (Business Logic Hook)
            |       +-- Two-step auth (checkAuthStatus + validateTokenAndFetchUser)
            |       +-- User ID from session (NOT URL)
            |       +-- Proposal fetching via userProposalQueries
            |       +-- Status button config from os_proposal_status table
            |       +-- Modal state management
            |       +-- Navigation handlers
            |
            +-- UI Components
                +-- Header.jsx (Site navigation)
                +-- Footer.jsx (Site footer)
                +-- ProposalSelector.jsx (Dropdown)
                +-- ProposalCard.jsx (Main display)
                |       +-- Two-column layout
                |       +-- InlineProgressTracker (6 stages)
                |       +-- StatusBanner
                |       +-- Action buttons (dynamic from buttonConfig)
                |       +-- Pricing bar
                +-- VirtualMeetingsSection.jsx (Active VMs)
                +-- Modals
                    +-- GuestEditingProposalModal.jsx
                    +-- HostProfileModal.jsx
                    +-- VirtualMeetingManager.jsx
```

---

## ### FILE_INVENTORY ###

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/guest-proposals.jsx` | Mounts GuestProposalsPage to #root, imports CSS |

### Page Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/GuestProposalsPage.jsx` | Main hollow component with LoadingState, ErrorState, EmptyState |
| `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | Core business logic hook |

### Sub-Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/proposals/ProposalCard.jsx` | Two-column card with host overlay, inline progress tracker |
| `app/src/islands/pages/proposals/ProposalSelector.jsx` | Dropdown for proposal selection |
| `app/src/islands/pages/proposals/VirtualMeetingsSection.jsx` | Active virtual meetings display with state-aware UI |
| `app/src/islands/pages/proposals/ProgressTracker.jsx` | Standalone progress tracker (not currently used - inline version in ProposalCard) |

### Modals
| File | Purpose |
|------|---------|
| `app/src/islands/modals/GuestEditingProposalModal.jsx` | Edit proposal terms + cancel |
| `app/src/islands/modals/HostProfileModal.jsx` | Host verification & listings |
| `app/src/islands/shared/VirtualMeetingManager/VirtualMeetingManager.jsx` | VM request/respond/details/cancel modal |

### Logic Layer - Constants
| File | Purpose |
|------|---------|
| `app/src/logic/constants/proposalStatuses.js` | 20+ status configs with actions, usualOrder |
| `app/src/logic/constants/proposalStages.js` | 6 progress stages (1-6) with helpers |

### Logic Layer - Rules (Pillar II)
| File | Purpose |
|------|---------|
| `app/src/logic/rules/proposals/virtualMeetingRules.js` | VM state machine (6 states) |

### Library Utilities
| File | Purpose |
|------|---------|
| `app/src/lib/proposals/userProposalQueries.js` | Session-based Supabase proposal queries with nested fetches |
| `app/src/lib/proposals/dataTransformers.js` | Data transformation utilities |
| `app/src/lib/proposals/statusButtonConfig.js` | os_proposal_status table cache + button config |
| `app/src/lib/proposals/urlParser.js` | Session-based user ID + URL proposal ID |

### Authentication Utilities
| File | Purpose |
|------|---------|
| `app/src/lib/auth.js` | checkAuthStatus, validateTokenAndFetchUser |
| `app/src/lib/secureStorage.js` | getSessionId (user ID from session) |

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/components/guest-proposals.css` | Complete page styling |

---

## ### URL_ROUTING ###

```
/guest-proposals                          # All proposals for logged-in Guest
/guest-proposals?proposal={id}            # Pre-select specific proposal
```

**Note**: User ID is NOT in URL. User is identified via authenticated session.

### Legacy URL Patterns (Auto-Cleaned)
These patterns are automatically cleaned and redirected:
```
/guest-proposals/{userId}         -> /guest-proposals
/guest-proposals?user={userId}    -> /guest-proposals
```

### URL Parser Functions
```javascript
import { getUserIdFromSession, getProposalIdFromQuery, parseProposalPageUrl, cleanLegacyUserIdFromUrl } from 'lib/proposals/urlParser.js'

// Get user from session (NOT URL)
const userId = getUserIdFromSession()

// Get proposal from query param
const proposalId = getProposalIdFromQuery()

// Full parse (cleans legacy URLs first)
const { userId, proposalId } = parseProposalPageUrl()
```

### URL Update (Without Reload)
```javascript
import { updateUrlWithProposal } from 'lib/proposals/urlParser.js'

updateUrlWithProposal(proposalId)  // Updates to /guest-proposals?proposal={id}
```

---

## ### PROPOSAL_STATUS_SYSTEM ###

### Status Configuration (`proposalStatuses.js`)
Each status defines:
- `key`: Database value (exact string from Bubble)
- `color`: UI theme (red/yellow/blue/green/gray/purple)
- `label`: Display text
- `stage`: Progress stage (1-6) or null
- `usualOrder`: Bubble ordering (0-7 active, 99 terminal)
- `actions`: Available action identifiers
- `isSuggestedBySL`: Boolean for Split Lease suggested proposals

### Key Statuses
| Status Key | Stage | Color | usualOrder |
|------------|-------|-------|------------|
| `Pending` | 1 | blue | 1 |
| `Host Review` | 3 | blue | 2 |
| `Proposal Submitted by guest - Awaiting Rental Application` | 1 | blue | 3 |
| `Proposal Submitted for guest by Split Lease - Awaiting Rental Application` | 1 | purple | 3 |
| `Proposal Submitted for guest by Split Lease - Pending Confirmation` | 1 | purple | 3 |
| `Rental Application Submitted` | 2 | blue | 3 |
| `Host Counteroffer Submitted / Awaiting Guest Review` | 3 | yellow | 4 |
| `Proposal or Counteroffer Accepted / Drafting Lease Documents` | 4 | green | 5 |
| `Reviewing Documents` | 4 | blue | 5 |
| `Lease Documents Sent for Review` | 4 | blue | 6 |
| `Lease Documents Sent for Signatures` | 5 | green | 6 |
| `Lease Documents Signed / Awaiting Initial payment` | 6 | green | 6 |
| `Initial Payment Submitted / Lease activated` | 6 | green | 7 |
| `Proposal Cancelled by Guest` | null | red | 99 |
| `Proposal Cancelled by Split Lease` | null | red | 99 |
| `Proposal Rejected by Host` | null | red | 99 |
| `Expired` | null | gray | 99 |

### Status Helper Functions
```javascript
import {
  getStatusConfig,
  getStageFromStatus,
  getUsualOrder,
  shouldShowStatusBanner,
  getActionsForStatus,
  isActiveStatus,
  isTerminalStatus,
  isCompletedStatus,
  isSuggestedProposal
} from 'logic/constants/proposalStatuses.js'
```

---

## ### DYNAMIC_BUTTON_SYSTEM ###

### os_proposal_status Table Integration
Button labels and visibility are now driven by the `os_proposal_status` Supabase table:

```javascript
import {
  fetchStatusConfigurations,
  getButtonConfigForProposal,
  isStatusConfigCacheReady,
  getGuestAction1Label,
  getGuestAction2Label,
  shouldHideVirtualMeetingButton
} from 'lib/proposals/statusButtonConfig.js'

// Fetch and cache on page load
await fetchStatusConfigurations()

// Get complete button config for a proposal
const buttonConfig = getButtonConfigForProposal(proposal)
// Returns:
{
  guestAction1: { visible, label, action, style },
  guestAction2: { visible, label, action, style },
  cancelButton: { visible, label, action, style, disabled },
  vmButton: { visible, label, action, style, disabled },
  sortOrder,
  isTerminal,
  isCounteroffer,
  isSLSuggested
}
```

### Button Visibility Rules
- **VM Button**: Hidden for rejected, cancelled by SL, activated, or SL-suggested proposals
- **Guest Action 1**: Based on os_proposal_status.guest_action_1, hidden if reminders >= 3 or docs finalized
- **Guest Action 2**: Based on os_proposal_status.guest_action_2, hidden if ID docs already submitted
- **Cancel Button**: Shows "Delete" for terminal, "Reject Modified Terms" for counteroffer, "See House Manual" for late-stage with manual, "Reject Proposal" for SL-suggested

### Guest Action Button Types
| Label | Action | Button Class |
|-------|--------|--------------|
| Interested | confirm_interest | btn-interested |
| Submit Rental App | submit_rental_app | btn-primary-action |
| Modify Proposal | modify_proposal | btn-modify-proposal |
| Accept Host Terms | accept_counteroffer | btn-accept-counteroffer |
| Remind Split Lease | remind_sl | btn-remind |
| Review Documents | review_documents | btn-primary-action |
| Resend Lease Docs | resend_lease_docs | btn-primary-action |
| Submit Initial Payment | submit_payment | btn-primary-action |
| Go to Leases | go_to_leases | btn-go-to-leases |
| Delete Proposal | delete_proposal | btn-delete-proposal |
| Not Interested | reject_suggestion | btn-not-interested |
| Review Host Terms | review_counteroffer | btn-review-terms |
| See Details | see_details | btn-see-details |
| Verify Your Identity | verify_identity | btn-verify-identity |

---

## ### PROGRESS_STAGES ###

6-stage workflow (`proposalStages.js`):

| Stage | Name | ShortName | Description |
|-------|------|-----------|-------------|
| 1 | Proposal Submitted | Submitted | Awaiting rental application |
| 2 | Rental App Submitted | Application | Under host review |
| 3 | Host Review | Review | Host reviewing/counteroffer |
| 4 | Review Documents | Documents | Lease drafting/review |
| 5 | Lease Documents | Lease | Sign lease agreement |
| 6 | Initial Payment | Payment | Submit payment, activate lease |

### Stage Functions
```javascript
import {
  getStageById,
  getStageByName,
  getStageProgress,
  isStageCompleted,
  isCurrentStage,
  isStagePending,
  getPreviousStage,
  getNextStage,
  formatStageDisplay,
  getAllStagesFormatted
} from 'logic/constants/proposalStages.js'
```

### Inline Progress Tracker Colors
Per-stage color logic in ProposalCard.jsx:
```javascript
const PROGRESS_COLORS = {
  purple: '#6D31C2',    // Completed stage
  green: '#1F8E16',     // Current/Active stage (action needed)
  red: '#DB2E2E',       // Cancelled/Rejected (ALL stages turn red)
  lightPurple: '#B6B7E9', // Pending/Waiting state
  gray: '#DEDEDE',      // Inactive/Future stage
  labelGray: '#9CA3AF'  // Inactive label color
}
```

---

## ### VIRTUAL_MEETING_STATES ###

6-state machine (`virtualMeetingRules.js`):

| State | Description | Button Text | Button Style |
|-------|-------------|-------------|--------------|
| `NO_MEETING` | No VM exists | "Request Virtual Meeting" | primary |
| `REQUESTED_BY_GUEST` | Guest requested, waiting | "Meeting Requested" | disabled |
| `REQUESTED_BY_HOST` | Host requested | "Respond to Virtual Meeting" | secondary |
| `BOOKED_AWAITING_CONFIRMATION` | Booked, not confirmed | "View Meeting Details" | secondary |
| `CONFIRMED` | Confirmed by Split Lease | "Join Virtual Meeting" | success |
| `DECLINED` | VM declined | "Request Alternative Meeting" | warning |

### VM Rule Functions
```javascript
import {
  VM_STATES,
  getVirtualMeetingState,
  canRequestNewMeeting,
  canRespondToMeeting,
  isVMButtonDisabled,
  canJoinMeeting,
  canViewMeetingDetails,
  canCancelVMRequest,
  getVMButtonText,
  getVMButtonStyle,
  getVMStateInfo
} from 'logic/rules/proposals/virtualMeetingRules.js'

// Get comprehensive state info
const vmInfo = getVMStateInfo(virtualMeeting, currentUserId)
// Returns: { state, showButton, buttonText, buttonStyle, buttonDisabled, canRequest, canRespond, canJoin, canViewDetails, canCancel }
```

### VM Button Configuration in ProposalCard
8 Bubble conditionals mapped to React state:
1. Other party requested -> "Respond to Virtual Meeting Request" (view: respond)
2. Current user requested -> "Virtual Meeting Requested" (disabled)
3. Button pressed -> visual feedback (handled by CSS)
4. Booked but not confirmed -> "Virtual Meeting Accepted" (disabled)
5. Booked and confirmed -> "Meeting confirmed" (view: details)
6. Meeting declined -> "Virtual Meeting Declined" (view: request, red style)
7-8. Hidden for rejected/cancelled/activated/SL-suggested statuses

---

## ### DATA_FLOW ###

### Complete Data Flow (Session-Based)
```
1. Auth Check (Two-Step Pattern)
   |- checkAuthStatus() -> validateTokenAndFetchUser() -> get userType from response

2. Get User ID from Session
   |- getUserIdFromSession() -> getSessionId() from secure storage

3. Fetch Status Configurations (parallel)
   |- fetchStatusConfigurations() -> caches os_proposal_status table

4. Fetch User with Proposals List
   |- fetchUserWithProposalList(userId)
       |- SELECT _id, "Name - First", "Proposals List" FROM user

5. Extract Proposal IDs
   |- extractProposalIds(user) -> parse "Proposals List" JSONB

6. Fetch Proposals by IDs
   |- fetchProposalsByIds(proposalIds)
       |- Fetch proposals from 'proposal' table
       |- Filter out Deleted=true and "Proposal Cancelled by Guest"
       |- Fetch listings from 'listing' table
       |- Extract/fetch featured photos
       |- Fetch boroughs from 'zat_geo_borough_toplevel'
       |- Fetch neighborhoods from 'zat_geo_hood_mediumlevel'
       |- Fetch house rules from 'zat_features_houserule'
       |- Fetch hosts from 'user' table (via "Host / Landlord")
       |- Fetch guests from 'user' table
       |- Fetch virtual meetings from 'virtualmeetingschedulesandlinks'

7. Enrich & Return
   |- Manual joins to create enriched proposal objects with nested data
```

### Main Query Function
```javascript
// userProposalQueries.js - fetchUserProposalsFromUrl()
export async function fetchUserProposalsFromUrl() {
  // Step 1: Get user ID from session (NOT URL)
  const userId = getUserIdFromSession();
  if (!userId) {
    throw new Error('NOT_AUTHENTICATED');
  }

  // Steps 2-7: Fetch and enrich data...
  return { user, proposals, selectedProposal };
}
```

### Data Transformations
```javascript
import { transformProposalData, getProposalDisplayText } from 'lib/proposals/dataTransformers.js'

const cleanProposal = transformProposalData(rawProposal)
const displayText = getProposalDisplayText(cleanProposal) // "Host - Listing"
```

---

## ### PROPOSALCARD_STRUCTURE ###

Two-column layout with integrated progress tracker:

```
+-------------------------------------------------------------+
| [Status Banner - Dynamic based on status]                   |
+---------------------------------+---------------------------+
| LEFT COLUMN                     | RIGHT COLUMN              |
| - Listing title                 | - Listing photo           |
| - Location (hood, borough)      | - Host avatar overlay     |
| - [View Listing] [View Map]     | - Host name badge         |
| - Check-in/out day range        | - [Host Profile]          |
| - Duration (weeks)              | - [Send a Message]        |
| - Day badges (S M T W T F S)    |                           |
| - Warning icon if unavailable   |                           |
| - Check-in/out times            |                           |
| - Move-in/Move-out dates        |                           |
| - House Rules (collapsible)     |                           |
+---------------------------------+---------------------------+
| PRICING BAR                                                 |
| Original (strikethrough if counteroffer) | Total | Fee | Deposit | Nightly |
| ACTION BUTTONS (Dynamic from buttonConfig)                  |
| [VM Button] [Guest Action 1] [Guest Action 2] [Cancel]      |
+-------------------------------------------------------------+
| INLINE PROGRESS TRACKER (6 stages)                          |
| o---o---o---o---o---o                                       |
| Labels with dynamic colors based on status                  |
+-------------------------------------------------------------+
```

---

## ### DAY_BADGES ###

### Day Indexing (CRITICAL)
| Format | Sunday | Monday | Tuesday | ... | Saturday |
|--------|--------|--------|---------|-----|----------|
| **Bubble** (stored) | 1 | 2 | 3 | ... | 7 |
| **JavaScript** (display) | 0 | 1 | 2 | ... | 6 |
| **Text format** | "Sunday" | "Monday" | "Tuesday" | ... | "Saturday" |

### Conversion in ProposalCard.jsx
```javascript
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']  // 0-indexed
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getAllDaysWithSelection(daysSelected) {
  const days = daysSelected || [];

  // Determine if text format or numeric indices
  const isTextFormat = days.length > 0 && typeof days[0] === 'string';

  if (isTextFormat) {
    // Text format: ["Monday", "Tuesday", etc.]
    const selectedSet = new Set(days);
    return DAY_LETTERS.map((letter, index) => ({
      index,
      letter,
      selected: selectedSet.has(DAY_NAMES[index])
    }));
  } else {
    // Numeric format: Bubble 1-indexed [2, 3, 4, 5, 6] for Mon-Fri
    const selectedSet = new Set(days);
    return DAY_LETTERS.map((letter, index) => ({
      index,
      letter,
      selected: selectedSet.has(index + 1)  // Convert to Bubble 1-indexed
    }));
  }
}
```

### CSS Classes
| Class | Style |
|-------|-------|
| `.day-badge-v2` | Gray (#B2B2B2), 32x32px, rounded |
| `.day-badge-v2.selected` | Purple (#4B47CE), white text |

---

## ### CSS_BUTTON_CLASSES ###

### Virtual Meeting Buttons
| Class | State | Style |
|-------|-------|-------|
| `.btn-vm-request` | No VM | Purple (primary) |
| `.btn-vm-respond` | Host requested | Blue |
| `.btn-vm-requested` | Guest requested | Gray (disabled) |
| `.btn-vm-accepted` | Booked, awaiting | Green (disabled) |
| `.btn-vm-confirmed` | Confirmed | Dark green (#059669) |
| `.btn-vm-declined` | Declined | Red outline |

### Action Buttons
| Class | Purpose | Style |
|-------|---------|-------|
| `.btn-primary-action` | Main CTA | Green (#39873D) |
| `.btn-secondary-action` | Secondary | Gray border |
| `.btn-modify-proposal` | Edit proposal | Green |
| `.btn-cancel-proposal` | Cancel | Red (#EF4444) |
| `.btn-delete-proposal` | Delete | Red |
| `.btn-accept-counteroffer` | Accept CO | Green |
| `.btn-review-terms` | Review CO | Yellow/Orange |
| `.btn-reject-terms` | Reject CO | Red outline |
| `.btn-go-to-leases` | View lease | Green |
| `.btn-house-manual` | House manual | Purple (#6D31C2) |
| `.btn-interested` | SL suggested | Green |
| `.btn-not-interested` | SL suggested | Gray/red outline |
| `.btn-remind` | Remind SL | Green |
| `.btn-verify-identity` | Verify ID | Blue |
| `.btn-see-details` | Info | Blue outline |
| `.btn-reject-proposal` | Reject SL proposal | Red |

---

## ### VIRTUAL_MEETINGS_SECTION ###

Displays proposals with active virtual meetings below the main proposal card:

```jsx
<VirtualMeetingsSection
  proposals={proposals}
  currentUserId={user?._id}
/>
```

### VM Filter Conditions (from Bubble)
- virtual meeting isn't empty
- Status <> Proposal Cancelled by Guest
- Status <> Proposal Rejected by Host
- Status <> Proposal Cancelled by Split Lease
- booked date > current OR suggested dates any item > current
- meeting declined is no

### VM Card Structure (State-Aware):
- Host profile icon (48x48px rounded)
- Title with host name + listing name
- State badge (Awaiting Response/Pending Confirmation/Confirmed)
- Message row with calendar icon
- Suggested timeslots OR booked date pill
- Action bar (dynamic based on VM state):
  - Respond/Requested/Details/Join primary button
  - Cancel button (hidden when confirmed)

### CSS Classes
| Class | Purpose |
|-------|---------|
| `.vm-section-wrapper` | Container |
| `.vm-section-card` | Individual card |
| `.vm-section-badge-waiting` | Gray badge |
| `.vm-section-badge-pending` | Yellow badge |
| `.vm-section-badge-confirmed` | Green badge |
| `.vm-section-date-pill` | Time slot pill |
| `.vm-section-date-pill--booked` | Confirmed date pill |
| `.vm-section-primary-btn--respond` | Blue respond button |
| `.vm-section-primary-btn--details` | Purple details button |
| `.vm-section-primary-btn--join` | Green join button |

---

## ### GUESTEDITINGPROPOSALMODAL ###

3-view state machine:
- `'general'` - View proposal details
- `'editing'` - Edit schedule/financial terms
- `'cancel'` - Cancel confirmation

### Features:
- DayNightSelector - Day/Night toggle grid
- Move-in date picker with calendar
- Flexible move-in range textarea
- Reservation span dropdown
- ReservationPriceBreakdown - Price details display
- House rules (collapsible)
- CancelProposalModalInner - Cancel with reason input

### Props
```jsx
<GuestEditingProposalModal
  proposal={proposal}
  listing={listing}
  user={{ type: 'guest' }}
  initialView="general"
  isVisible={true}
  onClose={handleClose}
  pricePerNight={150}
  totalPriceForReservation={2400}
  priceRentPer4Weeks={1680}
/>
```

---

## ### VIRTUALMEETINGMANAGER ###

Integrated modal for all VM actions:

```jsx
<VirtualMeetingManager
  proposal={proposal}
  initialView={vmInitialView}  // 'request' | 'respond' | 'details' | 'cancel'
  currentUser={currentUser}
  onClose={handleVMModalClose}
  onSuccess={handleVMSuccess}
/>
```

Views:
- `request`: Request new VM or suggest alternative times
- `respond`: Respond to host's suggested times
- `details`: View booked/confirmed meeting details
- `cancel`: Cancel VM request

---

## ### KEY_IMPORTS ###

```javascript
// Authentication (two-step pattern)
import { checkAuthStatus, validateTokenAndFetchUser } from 'lib/auth.js'
import { getSessionId } from 'lib/secureStorage.js'

// Page hook
import { useGuestProposalsPageLogic } from './proposals/useGuestProposalsPageLogic'

// Components
import ProposalCard from './proposals/ProposalCard'
import ProposalSelector from './proposals/ProposalSelector'
import VirtualMeetingsSection from './proposals/VirtualMeetingsSection'

// Modals
import GuestEditingProposalModal from '../modals/GuestEditingProposalModal'
import HostProfileModal from '../modals/HostProfileModal'
import VirtualMeetingManager from '../shared/VirtualMeetingManager/VirtualMeetingManager'

// Status config
import { getStatusConfig, PROPOSAL_STATUSES } from 'logic/constants/proposalStatuses.js'
import { PROPOSAL_STAGES, getStageById } from 'logic/constants/proposalStages.js'

// Rules
import { getVMStateInfo, VM_STATES } from 'logic/rules/proposals/virtualMeetingRules.js'

// Status button config (database-driven)
import { fetchStatusConfigurations, getButtonConfigForProposal, shouldHideVirtualMeetingButton } from 'lib/proposals/statusButtonConfig.js'

// Queries (session-based)
import { fetchUserProposalsFromUrl } from 'lib/proposals/userProposalQueries.js'

// URL utilities (session-based)
import {
  getUserIdFromSession,
  getProposalIdFromQuery,
  parseProposalPageUrl,
  updateUrlWithProposal,
  cleanLegacyUserIdFromUrl
} from 'lib/proposals/urlParser.js'
```

### Hook Return Value
```javascript
const {
  // Auth state
  authState,  // { isChecking, isAuthenticated, isGuest, shouldRedirect, redirectReason }

  // Raw data
  user,             // User object from session
  proposals,        // Array of enriched proposals
  selectedProposal, // Currently selected proposal

  // Transformed/derived data
  transformedProposal, // Processed proposal data
  statusConfig,        // Status configuration object
  currentStage,        // Current progress stage (1-6)
  formattedStages,     // Formatted stages for progress tracker
  proposalOptions,     // Dropdown options [{ id, label }]
  buttonConfig,        // Dynamic button configuration from os_proposal_status

  // UI state
  isLoading,  // Combined: authState.isChecking || dataLoading
  error,      // Error message or null

  // Handlers
  handleProposalSelect, // (proposalId) => void
  handleRetry           // () => void
} = useGuestProposalsPageLogic()
```

---

## ### STATUS_BANNER_CONFIGS ###

Banner configurations in ProposalCard.jsx:

| Status | Background | Border | Text Color | Type |
|--------|------------|--------|------------|------|
| Proposal Submitted - Awaiting Rental App | #FBECEC | #CC0000 | #CC0000 | warning |
| SL Suggested proposals | #F3E8FF | #4B0082 | #4B0082 | suggested |
| Rental Application Submitted | #EBF5FF | #3B82F6 | #1D4ED8 | info |
| Host Counteroffer | #FEF3C7 | #F59E0B | #92400E | warning |
| Accepted/Drafting | #E1FFE1 | #1E561A | #1BA54E | success |
| Cancelled by SL | #FBECEC | #D34337 | #CC0000 | cancelled |
| Cancelled by Guest | #F3F4F6 | #9CA3AF | #6B7280 | cancelled |
| Rejected by Host | #FBECEC | #D34337 | #CC0000 | rejected |
| Expired | #F3F4F6 | #9CA3AF | #6B7280 | expired |

---

## ### DATA_DEPENDENCIES ###

### Supabase Tables
- `proposal` - Main proposal data
- `user` - Guest and host data (separate fetches)
- `listing` - Property details
- `virtualmeetingschedulesandlinks` - VM records
- `os_proposal_status` - Button labels and sort order
- `zat_geo_borough_toplevel` - Borough names
- `zat_geo_hood_mediumlevel` - Neighborhood names
- `zat_features_houserule` - House rule names
- `listing_photo` - Featured photos (legacy format)

### Key Proposal Fields
| Field | Purpose |
|-------|---------|
| `_id` | Unique identifier |
| `Status` | Current status string |
| `Deleted` | Soft delete flag |
| `Days Selected` | Array of Bubble days [1-7] or day names |
| `Reservation Span (Weeks)` | Number of weeks |
| `Move in range start` / `end` | Move-in date range |
| `Total Price for Reservation (guest)` | Total price |
| `proposal nightly price` | Nightly rate |
| `cleaning fee` | Maintenance fee |
| `damage deposit` | Refundable deposit |
| `counter offer happened` | Boolean for counteroffer |
| `hc *` fields | Host-changed counteroffer values |
| `Guest` | Guest user ID |
| `Listing` | Listing ID |
| `virtual meeting` | VM record ID |
| `House Rules` | JSON array of house rule IDs |
| `rental application` | Rental app reference |
| `remindersByGuest (number)` | Count of reminders sent |
| `guest documents review finalized?` | Boolean for docs review |

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| Redirected to home (timing) | Auth uses two-step: `checkAuthStatus()` then `validateTokenAndFetchUser()` |
| Redirected to home | Check auth status (must be logged in as Guest) |
| No proposals showing | Verify session has user ID, check Supabase RLS |
| Buttons not appearing | Check buttonConfig from os_proposal_status table |
| VM button wrong state | Verify `virtualMeeting` object populated, check vmConfig useMemo |
| Progress not updating | Check `usualOrder` value in status config |
| Modal not opening | Verify modal state handlers in parent |
| Styling broken | Check CSS import in guest-proposals.jsx |
| Day badges all gray | Check `Days Selected` array format (text vs numeric) |
| Counteroffer not showing | Verify `counter offer happened` is true |
| Wrong price displayed | Check counteroffer fields for `hc *` values |
| House rules not showing | Check `houseRules` array on proposal (resolved names) |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Logic CLAUDE.md | `app/src/logic/CLAUDE.md` |
| Database Schema | `DATABASE_SCHEMA_OVERVIEW.md` |
| Routing Guide | `.claude/Documentation/Routing/ROUTING_GUIDE.md` |

---

**VERSION**: 4.0
**LAST_UPDATED**: 2026-01-20
**STATUS**: Session-based authentication with two-step auth pattern and database-driven button config
**MAJOR_CHANGES**:
- Added VirtualMeetingManager component (replaces separate VM modals)
- Added database-driven button system via os_proposal_status table
- Updated VM button logic with 8 Bubble conditionals
- Added inline progress tracker with per-stage color logic
- Updated data flow to include featured photo extraction and house rules resolution
- Added support for both text and numeric day formats
