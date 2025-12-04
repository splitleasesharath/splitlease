# Guest Proposals Page - Quick Reference

**GENERATED**: 2025-12-04
**PAGE_URL**: `/guest-proposals` or `/guest-proposals?proposal={proposalId}`
**ENTRY_POINT**: `app/src/guest-proposals.jsx`

---

## ### AUTHENTICATION ###

**IMPORTANT**: This page requires authenticated Guest users only.

### Access Control Matrix
| Condition | Action | Redirect Reason |
|-----------|--------|-----------------|
| Not logged in | Redirect to `/` (home) | `NOT_AUTHENTICATED` |
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
  redirectReason: null    // 'NOT_AUTHENTICATED' | 'NOT_GUEST' | null
});
```

### Auth Check Flow
```
1. Page loads → authState.isChecking = true
2. Clean legacy URL patterns (cleanLegacyUserIdFromUrl)
3. Check auth status (checkAuthStatus)
   ├─ Not authenticated → redirect to /
   └─ Authenticated → check user type (getUserType)
       ├─ Not Guest → redirect to /
       └─ Is Guest → load proposals
```

### Key Auth Functions Used
```javascript
import { checkAuthStatus, getUserType } from 'lib/auth.js'
import { getSessionId } from 'lib/secureStorage.js'

// Check if user is logged in
const isAuthenticated = await checkAuthStatus()

// Get user type ('Host' or 'Guest')
const userType = getUserType()

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
            |       +-- Auth check (checkAuthStatus + getUserType)
            |       +-- User ID from session (NOT URL)
            |       +-- Proposal fetching via userProposalQueries
            |       +-- Virtual meeting management
            |       +-- Modal state management
            |       +-- Navigation handlers
            |
            +-- UI Components
                +-- Header.jsx (Site navigation)
                +-- ProposalSelector.jsx (Dropdown)
                +-- VirtualMeetingsSection.jsx (Active VMs)
                +-- ProposalCard.jsx (Main display)
                |       +-- Two-column layout
                |       +-- ProgressTracker.jsx (6 stages)
                |       +-- Status banner
                |       +-- Action buttons (dynamic)
                |       +-- Pricing bar
                +-- Modals
                    +-- GuestEditingProposalModal.jsx
                    +-- HostProfileModal.jsx
                    +-- MapModal.jsx
```

---

## ### FILE_INVENTORY ###

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/guest-proposals.jsx` | Mounts GuestProposalsPage to #root |

### Page Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/GuestProposalsPage.jsx` | Main hollow component |
| `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | Core business logic hook |

### Sub-Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/proposals/ProposalCard.jsx` | Two-column card with host overlay |
| `app/src/islands/pages/proposals/ProposalSelector.jsx` | Dropdown for proposal selection |
| `app/src/islands/pages/proposals/VirtualMeetingsSection.jsx` | Active virtual meetings display |
| `app/src/islands/pages/proposals/ProgressTracker.jsx` | 6-stage horizontal tracker |

### Modals
| File | Purpose |
|------|---------|
| `app/src/islands/modals/GuestEditingProposalModal.jsx` | Edit proposal terms + cancel |
| `app/src/islands/modals/HostProfileModal.jsx` | Host verification & listings |
| `app/src/islands/modals/MapModal.jsx` | Listing location map |

### Logic Layer - Constants
| File | Purpose |
|------|---------|
| `app/src/logic/constants/proposalStatuses.js` | 20+ status configs with actions |
| `app/src/logic/constants/proposalStages.js` | 6 progress stages (1-6) |

### Logic Layer - Rules (Pillar II)
| File | Purpose |
|------|---------|
| `app/src/logic/rules/proposals/proposalRules.js` | canCancel, canModify, canAccept |
| `app/src/logic/rules/proposals/virtualMeetingRules.js` | VM state machine (5 states) |
| `app/src/logic/rules/proposals/useProposalButtonStates.js` | Button visibility hook |
| `app/src/logic/rules/proposals/canCancelProposal.js` | Cancel permission check |
| `app/src/logic/rules/proposals/canEditProposal.js` | Edit permission check |
| `app/src/logic/rules/proposals/determineProposalStage.js` | Stage determination |

### Logic Layer - Processors (Pillar III)
| File | Purpose |
|------|---------|
| `app/src/logic/processors/proposals/processProposalData.js` | Raw -> clean data transform |

### Logic Layer - Workflows (Pillar IV)
| File | Purpose |
|------|---------|
| `app/src/logic/workflows/proposals/cancelProposalWorkflow.js` | 7 cancel variations |
| `app/src/logic/workflows/proposals/navigationWorkflow.js` | Page navigation handlers |
| `app/src/logic/workflows/proposals/counterofferWorkflow.js` | Accept/decline counteroffer |
| `app/src/logic/workflows/proposals/virtualMeetingWorkflow.js` | VM request/response flow |

### Library Utilities
| File | Purpose |
|------|---------|
| `app/src/lib/proposals/userProposalQueries.js` | Session-based Supabase proposal queries |
| `app/src/lib/proposals/dataTransformers.js` | Data transformation utilities |
| `app/src/lib/proposals/statusButtonConfig.js` | Status -> button mapping |
| `app/src/lib/proposals/urlParser.js` | Session-based user ID + URL proposal ID |

### Authentication Utilities
| File | Purpose |
|------|---------|
| `app/src/lib/auth.js` | checkAuthStatus, getUserType |
| `app/src/lib/secureStorage.js` | getSessionId (user ID from session) |

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/components/guest-proposals.css` | Complete page styling (1475 lines) |

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
/guest-proposals/{userId}         → /guest-proposals
/guest-proposals?user={userId}    → /guest-proposals
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
- `key`: Database value
- `color`: UI theme (red/yellow/blue/green/gray)
- `label`: Display text
- `stage`: Progress stage (1-6) or null
- `usualOrder`: Bubble ordering (1-7 active, 99 terminal)
- `actions`: Available action identifiers

### Key Statuses
| Status Key | Stage | Color | Actions |
|------------|-------|-------|---------|
| `Pending` | 1 | blue | cancel, request_vm, send_message |
| `Proposal Submitted by guest - Awaiting Rental Application` | 1 | blue | submit_rental_app, cancel, vm |
| `Proposal Submitted for guest by Split Lease - Awaiting Rental Application` | 1 | purple | submit_rental_app, cancel, vm |
| `Rental Application Submitted` | 2 | blue | vm, cancel, message |
| `Host Review` | 3 | blue | vm, cancel, message |
| `Host Counteroffer Submitted / Awaiting Guest Review` | 3 | yellow | review, accept, decline, vm |
| `Proposal or Counteroffer Accepted / Drafting Lease Documents` | 4 | green | vm, message |
| `Reviewing Documents` | 4 | blue | review_documents, vm |
| `Lease Documents Sent for Review` | 4 | blue | review_documents, vm |
| `Lease Documents Sent for Signatures` | 5 | green | sign_documents, vm |
| `Lease Documents Signed / Awaiting Initial payment` | 6 | green | submit_payment, vm |
| `Initial Payment Submitted / Lease activated` | 6 | green | view_lease, house_manual |
| `Proposal Cancelled by Guest` | null | red | view_listing, explore |
| `Proposal Rejected by Host` | null | red | view_listing, explore |
| `Expired` | null | gray | view_listing, explore |

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

---

## ### VIRTUAL_MEETING_STATES ###

5-state machine (`virtualMeetingRules.js`):

| State | Description | Button Text | Button Style |
|-------|-------------|-------------|--------------|
| `no_meeting` | No VM exists | "Request Virtual Meeting" | primary |
| `requested_by_guest` | Guest requested, waiting | "Meeting Requested" | disabled |
| `requested_by_host` | Host requested | "Respond to Virtual Meeting" | secondary |
| `booked_awaiting_confirmation` | Booked, not confirmed | "View Meeting Details" | secondary |
| `confirmed` | Confirmed by Split Lease | "Join Virtual Meeting" | success |
| `declined` | VM declined | "Request Alternative Meeting" | warning |

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

---

## ### PROPOSAL_RULES ###

### Permission Checks (`proposalRules.js`)
```javascript
import {
  canCancelProposal,          // Can guest cancel?
  canModifyProposal,          // Can guest edit terms?
  hasReviewableCounteroffer,  // Has counteroffer to review?
  canAcceptCounteroffer,      // Can accept CO?
  canDeclineCounteroffer,     // Can decline CO?
  canSubmitRentalApplication, // Can submit rental app?
  canReviewDocuments,         // Can review docs?
  canRequestVirtualMeeting,   // Can request VM?
  canSendMessage,             // Can send message?
  isProposalActive,           // Is proposal active?
  isProposalCancelled,        // Is cancelled?
  isProposalRejected,         // Is rejected?
  isLeaseActivated,           // Is lease activated?
  requiresSpecialCancellationConfirmation, // Usual Order > 5 + house manual
  getCancelButtonText,        // Get cancel button text
  getCancellationReasonOptions // Get reason options
} from 'logic/rules/proposals/proposalRules.js'
```

---

## ### BUTTON_STATES_HOOK ###

`useProposalButtonStates` computes 4 button groups:

```javascript
import { useProposalButtonStates } from 'logic/rules/proposals/useProposalButtonStates.js'

const buttonStates = useProposalButtonStates({
  proposal,
  virtualMeeting,
  guest,
  listing,
  currentUserId
})

// Returns:
{
  virtualMeeting: { visible, label, disabled, fontColor, bold, tooltip },
  guestAction1: { visible, label, backgroundColor },
  guestAction2: { visible, label },
  cancelProposal: { visible, label, backgroundColor }
}
```

### Button Visibility Rules
- **VM Button**: Hidden for rejected, cancelled by SL, activated, or SL-suggested proposals
- **Guest Action 1**: Based on status config, hidden if reminders > 3 or docs not finalized
- **Guest Action 2**: Based on status config, hidden if ID docs not submitted
- **Cancel Proposal**: Shows "Delete" for terminal, "Reject Terms" for counteroffer, "See House Manual" for late-stage with manual

---

## ### DATA_FLOW ###

### Complete Data Flow (Session-Based)
```
1. Auth Check
   └─ checkAuthStatus() → getUserType() → validate Guest

2. Get User ID from Session
   └─ getUserIdFromSession() → getSessionId() from secure storage

3. Fetch User with Proposals List
   └─ fetchUserWithProposalList(userId)
       └─ SELECT _id, "Name - First", "Proposals List" FROM user

4. Extract Proposal IDs
   └─ extractProposalIds(user) → parse "Proposals List" JSONB

5. Fetch Proposals by IDs
   └─ fetchProposalsByIds(proposalIds)
       ├─ Fetch proposals from 'proposal' table
       ├─ Fetch listings from 'listing' table
       ├─ Fetch hosts from 'user' table (via Host / Landlord)
       ├─ Fetch guests from 'user' table
       ├─ Fetch boroughs from 'zat_geo_borough_toplevel'
       ├─ Fetch neighborhoods from 'zat_geo_hood_mediumlevel'
       ├─ Fetch house rules from 'zat_features_houserule'
       ├─ Fetch featured photos from 'listing_photo'
       └─ Fetch virtual meetings from 'virtualmeetingschedulesandlinks'

6. Enrich & Return
   └─ Manual joins to create enriched proposal objects
```

### 1. Fetch Proposals (Session-Based)
```javascript
// In useGuestProposalsPageLogic.js
import { fetchUserProposalsFromUrl } from 'lib/proposals/userProposalQueries.js'

// User ID comes from session, NOT passed as parameter
const { user, proposals, selectedProposal } = await fetchUserProposalsFromUrl()
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

  // Step 2-6: Fetch and enrich data...
  return { user, proposals, selectedProposal };
}
```

### 2. Transform Data
```javascript
import {
  processProposalData,
  processListingData,
  processHostData,
  processVirtualMeetingData,
  getProposalDisplayText,
  getEffectiveTerms,
  formatPrice,
  formatDate,
  formatDateTime
} from 'logic/processors/proposals/processProposalData.js'

const cleanProposal = processProposalData(rawProposal)
const terms = getEffectiveTerms(cleanProposal)  // Uses counteroffer if exists
const displayText = getProposalDisplayText(cleanProposal) // "Host - Listing"
```

### 3. Display in UI
```jsx
<ProposalCard
  proposal={selectedProposal}
  listing={proposal.listing}
  host={proposal.host}
  virtualMeeting={proposal.virtualMeeting}
  currentUserId={userId}
  onViewListing={handleViewListing}
  onMessage={handleMessage}
  onHostProfile={handleHostProfile}
  onMapClick={handleMapClick}
  onEditProposal={handleEditProposal}
  onCancelProposal={handleCancelProposal}
  onVirtualMeetingAction={handleVMAction}
/>
```

---

## ### PROPOSALCARD_STRUCTURE ###

Two-column layout:

```
+-------------------------------------------------------------+
| [Status Banner - Dynamic based on status]                   |
+---------------------------------+---------------------------+
| LEFT COLUMN                     | RIGHT COLUMN              |
| - Listing title (purple link)   | - Listing photo           |
| - Location                      | - Host avatar overlay     |
| - [View Listing] [Map] buttons  | - Host name badge         |
| - Schedule pattern text         | - [Host Profile] [Message]|
| - Day badges (M T W T F S S)    |                           |
| - Check-in/out times            |                           |
| - Move-in date                  |                           |
| - House Rules (collapsible)     |                           |
+---------------------------------+---------------------------+
| PRICING BAR                                                 |
| Nightly: $xxx | 4-week: $x,xxx | Fee: $xx | Deposit: $xxx   |
+-------------------------------------------------------------+
| ACTION BUTTONS (Dynamic based on status + VM state)         |
| [VM Button] [Guest Action 1] [Guest Action 2] [Cancel]      |
+-------------------------------------------------------------+
| PROGRESS TRACKER (6 stages)                                 |
| o---o---o---o---o---o                                       |
| 1   2   3   4   5   6                                       |
+-------------------------------------------------------------+
```

---

## ### DAY_BADGES ###

### Day Indexing (CRITICAL)
| Format | Sunday | Monday | Tuesday | ... | Saturday |
|--------|--------|--------|---------|-----|----------|
| **Bubble** (stored) | 1 | 2 | 3 | ... | 7 |
| **JavaScript** (display) | 0 | 1 | 2 | ... | 6 |

### Conversion in ProposalCard.jsx
```javascript
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']  // 0-indexed

function getAllDaysWithSelection(daysSelected) {
  const selectedSet = new Set(daysSelected || [])
  return DAY_LETTERS.map((letter, index) => ({
    index,
    letter,
    selected: selectedSet.has(index + 1)  // Bubble day (1-indexed)
  }))
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

---

## ### WORKFLOWS ###

### Cancel Proposal
7 variations from Bubble.io:
```javascript
import {
  determineCancellationCondition,
  executeCancelProposal,
  cancelProposalFromCompareTerms
} from 'logic/workflows/proposals/cancelProposalWorkflow.js'

// Check if cancellation is allowed
const condition = determineCancellationCondition(proposal)
// Returns: { condition, workflow, allowCancel, requiresConfirmation, confirmationMessage }
// Conditions: 'standard', 'high_order_with_manual', 'already_cancelled', 'not_cancellable'

// Execute cancellation
const result = await executeCancelProposal(proposalId, reason)
```

### Navigation
```javascript
import {
  navigateToListing,
  navigateToMessaging,
  navigateToRentalApplication,
  navigateToDocumentReview,
  navigateToLeaseDocuments,
  navigateToHouseManual,
  navigateToSearch,
  openExternalLink,
  updateUrlWithProposal,
  getProposalIdFromUrl
} from 'logic/workflows/proposals/navigationWorkflow.js'
```

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
- Reservation span dropdown (2 weeks to 12 months + custom)
- ReservationPriceBreakdown - Price details display
- House rules (collapsible)
- CancelProposalModalInner - Cancel with reason input

### Reservation Span Options
```javascript
const RESERVATION_SPAN_OPTIONS = [
  { id: '2-weeks', display: '2 weeks', weeks: 2 },
  { id: '4-weeks', display: '4 weeks', weeks: 4 },
  { id: '1-month', display: '1 month', months: 1 },
  { id: '2-months', display: '2 months', months: 2 },
  { id: '3-months', display: '3 months', months: 3 },
  { id: '6-months', display: '6 months', months: 6 },
  { id: '12-months', display: '12 months', months: 12 },
  { id: 'other', display: 'Other (wks)', type: 'other' }
]
```

### Props
```jsx
<GuestEditingProposalModal
  proposal={proposal}
  listing={listing}
  user={user}
  initialView="general"
  isVisible={true}
  isInternalUsage={false}
  pageWidth={1200}
  onClose={handleClose}
  onProposalUpdate={handleUpdate}
  onProposalCancel={handleCancel}
  onAlert={handleAlert}
  pricePerNight={150}
  totalPriceForReservation={2400}
  priceRentPer4Weeks={1680}
/>
```

---

## ### VIRTUAL_MEETINGS_SECTION ###

Displays proposals with active virtual meetings at top of page:

```jsx
<VirtualMeetingsSection
  proposalsWithVM={proposalsWithVM}
  currentUserId={userId}
  onSelectProposal={handleSelectProposal}
  onVMAction={handleVMAction}
/>
```

### VM Card Structure:
- Host profile icon (48x48px rounded)
- Title with listing name
- State badge (Waiting/Pending/Confirmed)
- Message row with icon
- Suggested timeslots or booked date pills
- Action bar (Cancel/Respond/Details/Join buttons)

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

## ### HOSTPROFILEMODAL ###

Shows host verification badges and featured listing:

```jsx
<HostProfileModal
  host={host}
  listing={listing}
  onClose={handleClose}
/>
```

### Verification Items Displayed:
- LinkedIn (verified/unverified)
- Phone Number (verified/unverified)
- Email (verified/unverified)
- Identity (verified/unverified)

### Includes:
- Host photo or initial placeholder
- Verification list with icons
- Featured listing card
- ExternalReviews component
- Purple close button

---

## ### KEY_IMPORTS ###

```javascript
// Authentication
import { checkAuthStatus, getUserType } from 'lib/auth.js'
import { getSessionId } from 'lib/secureStorage.js'

// Page hook
import { useGuestProposalsPageLogic } from './proposals/useGuestProposalsPageLogic'

// Components
import ProposalCard from './proposals/ProposalCard'
import ProposalSelector from './proposals/ProposalSelector'
import VirtualMeetingsSection from './proposals/VirtualMeetingsSection'
import ProgressTracker from './proposals/ProgressTracker'

// Modals
import GuestEditingProposalModal from '../modals/GuestEditingProposalModal'
import HostProfileModal from '../modals/HostProfileModal'

// Status config
import { getStatusConfig, PROPOSAL_STATUSES } from 'logic/constants/proposalStatuses.js'
import { PROPOSAL_STAGES, getStageById } from 'logic/constants/proposalStages.js'

// Rules
import { canCancelProposal, canModifyProposal } from 'logic/rules/proposals/proposalRules.js'
import { getVMStateInfo, VM_STATES } from 'logic/rules/proposals/virtualMeetingRules.js'
import { useProposalButtonStates } from 'logic/rules/proposals/useProposalButtonStates.js'

// Processors
import { processProposalData, getEffectiveTerms } from 'logic/processors/proposals/processProposalData.js'

// Workflows
import { executeCancelProposal, determineCancellationCondition } from 'logic/workflows/proposals/cancelProposalWorkflow.js'
import { navigateToListing, navigateToMessaging } from 'logic/workflows/proposals/navigationWorkflow.js'

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
  buttonConfig,        // Dynamic button configuration

  // UI state
  isLoading,  // Combined: authState.isChecking || dataLoading
  error,      // Error message or null

  // Handlers
  handleProposalSelect, // (proposalId) => void
  handleRetry           // () => void
} = useGuestProposalsPageLogic()
```

---

## ### RESPONSIVE_BREAKPOINTS ###

| Breakpoint | Changes |
|------------|---------|
| `< 900px` | Card columns stack vertically, listing photo 280px height |
| `< 768px` | Full-width dropdown, pricing bar stacks, action buttons vertical, progress connector 40px |
| `< 480px` | Day badges 36px, progress labels hidden, listing actions stack |
| `< 380px` | Compact date display in modal |
| `< 350px` | Extra compact labels in price breakdown |

---

## ### DATA_DEPENDENCIES ###

### Supabase Tables
- `proposal` - Main proposal data
- `user` / `users` - Guest and host data
- `listing` - Property details
- `virtualmeetingschedulesandlinks` - VM records

### Key Proposal Fields
| Field | Purpose |
|-------|---------|
| `_id` | Unique identifier |
| `Status` | Current status string |
| `Days Selected` | Array of Bubble days [1-7] |
| `Nights Selected (Nights list)` | Array of night indices |
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

---

## ### CONDITIONAL_PATTERNS ###

### Pattern: Early Return (First Match Wins)
```javascript
const getVmButtonState = () => {
  if (vmDeclined) return { label: 'Declined' }     // Check 1
  if (vmConfirmed) return { label: 'Confirmed' }   // Check 2
  if (vmBooked) return { label: 'Accepted' }       // Check 3
  return { label: 'Request' }                      // Default
}
```

### Pattern: Bottom Wins (Last Match Wins)
```javascript
const getButtonState = () => {
  let state = { label: 'Default' }
  if (condition1) state = { label: 'Override 1' }
  if (condition2) state = { label: 'Override 2' }  // Wins if both true
  return state
}
```

### JSX Conditional Rendering
```jsx
{/* Independent conditions */}
{!isTerminal && <VMButton />}
{status?.includes('Drafting') && <RemindButton />}

{/* Mutually exclusive - ternary chain */}
{isTerminal ? <DeleteButton /> : hasCounteroffer ? <RejectTermsButton /> : <CancelButton />}
```

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| Redirected to home | Check auth status (must be logged in as Guest) |
| No proposals showing | Verify session has user ID, check Supabase RLS |
| Buttons not appearing | Check status config via `getStatusConfig()` |
| VM button wrong state | Verify `virtualMeeting` object populated |
| Progress not updating | Check `stage` value in status config |
| Modal not opening | Verify modal state handlers in parent |
| Styling broken | Check CSS import in guest-proposals.jsx |
| Day badges all gray | Check `Days Selected` array format |
| Counteroffer not showing | Verify `counter offer happened` is true |
| Wrong price displayed | Check `getEffectiveTerms()` for counteroffer |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Logic CLAUDE.md | `app/src/logic/CLAUDE.md` |
| Database Schema | `DATABASE_SCHEMA_OVERVIEW.md` |
| Database Tables Detailed | `Documentation/DATABASE_TABLES_DETAILED.md` |
| Option Sets | `Documentation/OPTION_SETS_DETAILED.md` |
| Routing Guide | `Documentation/ROUTING_GUIDE.md` |

---

**VERSION**: 3.0
**LAST_UPDATED**: 2025-12-04
**STATUS**: Session-based authentication (user ID from session, not URL)
**MAJOR_CHANGE**: Removed user ID from URL path/query - now uses authenticated session
