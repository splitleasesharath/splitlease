# Implementation Plan: Date Change Request Component Integration

## Overview

Integrate an external date-change-request component from the GitHub repository (splitleasesharath/date-change-request) into Split Lease as a shared island component. The component enables calendar-based date change requests (add/remove/swap dates) for active leases, with support for throttling, price negotiation, and request management workflows.

## Success Criteria

- [ ] DateChangeRequestManager component renders calendar with lease dates
- [ ] Users can submit add/remove/swap date change requests
- [ ] Throttling logic limits request frequency per user
- [ ] Price negotiation slider adjusts proposed rates
- [ ] Host can accept/decline requests via RequestManagement view
- [ ] Edge Function handles CRUD operations for datechangerequest table
- [ ] Bubble sync via sync_queue for legacy backend
- [ ] Integration points work in GuestProposalsPage and HostProposalsPage

---

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/shared/VirtualMeetingManager/` | **Architectural template** - Multi-view modal pattern | Reference for structure |
| `app/src/islands/pages/GuestProposalsPage.jsx` | Guest dashboard | Add DateChangeRequestManager integration |
| `app/src/islands/pages/HostProposalsPage/index.jsx` | Host dashboard | Add DateChangeRequestManager integration |
| `supabase/functions/virtual-meeting/index.ts` | **Edge Function template** - FP architecture | Reference for Edge Function structure |
| `supabase/functions/_shared/` | Shared utilities | Use existing CORS, errors, validation |

### Related Documentation

- [DATABASE_TABLES_DETAILED.md](./.claude/Documentation/Database/DATABASE_TABLES_DETAILED.md) - `datechangerequest` table schema
- [DATABASE_OPTION_SETS_QUICK_REFERENCE.md](./.claude/Documentation/Database/DATABASE_OPTION_SETS_QUICK_REFERENCE.md) - `os_date_change_request_status` option set
- [supabase/CLAUDE.md](../supabase/CLAUDE.md) - Edge Functions reference and patterns
- [VirtualMeetingManager/CLAUDE.md](../app/src/islands/shared/VirtualMeetingManager/CLAUDE.md) - Component architecture reference

### Existing Patterns to Follow

1. **VirtualMeetingManager Pattern**: Multi-view modal orchestrator with state machine
2. **Edge Function FP Pattern**: Action-based routing with Result types, immutable error logs
3. **Hollow Component Pattern**: UI delegates to service layer
4. **Queue-Based Sync**: Use `sync_queue` for Bubble synchronization

---

## Database Schema Reference

### `datechangerequest` Table (Existing)

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `_id` | text | NO | PK |
| `Lease` | text | YES | `bookings_leases._id` |
| `Requested by` | text | YES | `user._id` |
| `Request receiver` | text | YES | `user._id` |
| `Stay Associated 1` | text | YES | `bookings_stays._id` |
| `Stay Associated 2` | text | YES | `bookings_stays._id` (for swaps) |
| `status` | text | YES | `os_date_change_request_status` |
| `Created By` | text | YES | `user._id` |
| `Created Date` | timestamptz | YES | - |
| `Modified Date` | timestamptz | YES | - |

### Additional Fields Needed (verify in Supabase)

Based on source component types:
- `typeOfRequest` - 'adding' | 'removing' | 'swapping'
- `dateAdded` - Date for add requests
- `dateRemoved` - Date for remove requests
- `messageFromRequester` - Optional message
- `priceRateOfNight` - Proposed nightly rate
- `comparedToRegularRate` - Price comparison (percentage)
- `expirationDate` - Request expiration
- `visibleToGuest` - Boolean visibility
- `visibleToHost` - Boolean visibility
- `answerDate` - When answered
- `answerToRequest` - Response message

### `os_date_change_request_status` Option Set

| Name | Display |
|------|---------|
| `pending` | Pending |
| `approved` | Approved |
| `denied` | Denied |

**Extended statuses needed** (based on source types):
- `waiting_for_answer` - Initial state after submission
- `accepted` - Host approved
- `rejected` - Host declined
- `soon_to_expire` - Approaching expiration
- `expired` - Past expiration
- `cancelled` - Requester cancelled

---

## Implementation Steps

### Phase 1: Frontend Component Structure

#### Step 1.1: Create Component Directory

**Files:**
- `app/src/islands/shared/DateChangeRequestManager/`

**Purpose:** Establish directory structure mirroring VirtualMeetingManager

**Details:**
```
DateChangeRequestManager/
├── DateChangeRequestManager.jsx     # Main orchestrator
├── DateChangeRequestCalendar.jsx    # Calendar with lease dates
├── RequestTypeSelector.jsx          # Add/Remove/Swap buttons
├── RequestDetails.jsx               # Form for date/price/message
├── RequestManagement.jsx            # Host accept/decline view
├── ThrottlingWarning.jsx            # Rate limit warnings
├── SuccessMessage.jsx               # Post-submission feedback
├── dateChangeRequestService.js      # API service layer
├── dateUtils.js                     # Date utilities (extend VirtualMeetingManager's)
├── DateChangeRequestManager.css     # Styles
├── index.js                         # Barrel exports
└── CLAUDE.md                        # LLM documentation
```

**Validation:** Directory exists with empty placeholder files

---

#### Step 1.2: Create Main Orchestrator Component

**Files:** `app/src/islands/shared/DateChangeRequestManager/DateChangeRequestManager.jsx`

**Purpose:** Multi-view modal orchestrator following VirtualMeetingManager pattern

**Details:**
```javascript
/**
 * Date Change Request Manager - Main Component
 * Manages 4 different views for date change request workflows:
 * 1. Create Request - Select dates and request type
 * 2. Request Details - Set price/message before submitting
 * 3. Request Management - Accept/decline interface (receiver only)
 * 4. Success Message - Post-submission feedback
 */

// Props:
// - lease: Object with lease data and booked dates
// - currentUser: User object with _id and user type
// - initialView: 'create' | 'manage' | ''
// - onClose: Callback when modal closes
// - onSuccess: Optional callback after successful operation

// State machine views:
// '' (hidden) → 'create' → 'details' → 'success' → onClose()
//                          ↓
//             'manage' → 'success' → onClose()

// Key handlers:
// - handleSubmitRequest(requestData)
// - handleAcceptRequest(requestId)
// - handleDeclineRequest(requestId, reason)
// - handleCancelRequest(requestId)
```

**Validation:** Component renders with backdrop, handles view transitions

---

#### Step 1.3: Create Calendar Component

**Files:** `app/src/islands/shared/DateChangeRequestManager/DateChangeRequestCalendar.jsx`

**Purpose:** Calendar UI showing lease dates with color coding for selection

**Details:**
- Extend BookTimeSlot.jsx pattern for calendar grid
- Color coding:
  - Green: Currently booked dates
  - Blue: Selected for add
  - Red: Selected for remove
  - Orange: Swap source/target
- Props:
  - `bookedDates`: Array of dates from lease
  - `requestType`: 'adding' | 'removing' | 'swapping'
  - `selectedDates`: Currently selected dates
  - `onDateSelect`: Selection handler
  - `disabledDates`: Dates that cannot be modified

**Validation:** Calendar renders, dates are clickable, color coding works

---

#### Step 1.4: Create Request Type Selector

**Files:** `app/src/islands/shared/DateChangeRequestManager/RequestTypeSelector.jsx`

**Purpose:** Toggle buttons for selecting request type

**Details:**
```jsx
// Three mutually exclusive options:
// - Adding: Add dates to lease
// - Removing: Remove dates from lease
// - Swapping: Exchange one date for another

// Props:
// - selectedType: 'adding' | 'removing' | 'swapping' | null
// - onTypeSelect: Handler for type change
// - disabled: Boolean to prevent changes

// Visual:
// [Add Date] [Remove Date] [Swap Dates]
//    ^active
```

**Validation:** Type selection updates parent state correctly

---

#### Step 1.5: Create Request Details Form

**Files:** `app/src/islands/shared/DateChangeRequestManager/RequestDetails.jsx`

**Purpose:** Form for setting price negotiation and message

**Details:**
- Price slider: Adjust proposed nightly rate (percentage of regular rate)
- Message textarea: Optional message to receiver
- Display summary:
  - Request type
  - Date(s) affected
  - Proposed rate vs regular rate
  - Total price difference
- Submit button with validation

**Validation:** Form validates, calculates price correctly, submits data

---

#### Step 1.6: Create Request Management View

**Files:** `app/src/islands/shared/DateChangeRequestManager/RequestManagement.jsx`

**Purpose:** Host/receiver interface to accept or decline requests

**Details:**
- Display incoming request details:
  - Requester info (name, photo)
  - Request type and dates
  - Proposed price vs regular
  - Message from requester
- Action buttons:
  - Accept (with optional message)
  - Decline (with required reason)
- Countdown to expiration

**Validation:** Accept/decline actions work, updates propagate

---

#### Step 1.7: Create Throttling Warning Component

**Files:** `app/src/islands/shared/DateChangeRequestManager/ThrottlingWarning.jsx`

**Purpose:** Display rate limiting warnings

**Details:**
- Check user's recent request count
- Display warning if approaching limit
- Block submission if at limit
- Show cooldown timer

**Validation:** Warning displays correctly based on throttle state

---

#### Step 1.8: Create Service Layer

**Files:** `app/src/islands/shared/DateChangeRequestManager/dateChangeRequestService.js`

**Purpose:** API service layer for Edge Function calls

**Details:**
```javascript
import { supabase } from '../../../lib/supabase.js';

export async function createDateChangeRequest(leaseId, requestData) {
  return await supabase.functions.invoke('date-change-request', {
    body: {
      action: 'create',
      payload: { leaseId, ...requestData }
    }
  });
}

export async function getDateChangeRequests(leaseId) {
  // Get all requests for a lease
}

export async function acceptRequest(requestId, message) {
  // Accept a request
}

export async function declineRequest(requestId, reason) {
  // Decline a request
}

export async function cancelRequest(requestId) {
  // Cancel own request
}

export async function getThrottleStatus(userId) {
  // Check if user is throttled
}
```

**Validation:** Service methods call Edge Function correctly

---

### Phase 2: Supabase Edge Function

#### Step 2.1: Create Edge Function Directory

**Files:** `supabase/functions/date-change-request/`

**Purpose:** Create Edge Function structure

**Details:**
```
supabase/functions/date-change-request/
├── index.ts                 # Main router (FP pattern)
├── handlers/
│   ├── create.ts           # Create date change request
│   ├── get.ts              # Get requests for lease
│   ├── accept.ts           # Accept request
│   ├── decline.ts          # Decline request
│   ├── cancel.ts           # Cancel own request
│   └── getThrottleStatus.ts # Check throttle state
├── lib/
│   ├── validation.ts       # Request validation
│   ├── calculations.ts     # Price calculations
│   └── types.ts            # TypeScript types
└── deno.json               # Import map
```

**Validation:** Function structure matches proposal/virtual-meeting pattern

---

#### Step 2.2: Create Main Router

**Files:** `supabase/functions/date-change-request/index.ts`

**Purpose:** Action-based router following FP pattern

**Details:**
```typescript
const ALLOWED_ACTIONS = [
  "create", "get", "accept", "decline", "cancel", "get_throttle_status"
] as const;

// All actions require authentication except 'get' (for now)
const PUBLIC_ACTIONS: ReadonlySet<string> = new Set(["get"]);

const handlers: Readonly<Record<Action, Function>> = {
  create: handleCreate,
  get: handleGet,
  accept: handleAccept,
  decline: handleDecline,
  cancel: handleCancel,
  get_throttle_status: handleGetThrottleStatus,
};
```

**Validation:** Router handles all actions, returns proper responses

---

#### Step 2.3: Create Handler

**Files:** `supabase/functions/date-change-request/handlers/create.ts`

**Purpose:** Create new date change request with Bubble sync

**Details:**
```typescript
export async function handleCreate(
  payload: CreatePayload,
  user: AuthenticatedUser,
  supabase: SupabaseClient
) {
  // 1. Validate payload
  validateRequiredFields(payload, ['leaseId', 'typeOfRequest', ...]);

  // 2. Check throttle status
  const throttleStatus = await checkThrottle(user.id, supabase);
  if (throttleStatus.isThrottled) {
    throw new ValidationError('Too many requests. Try again later.');
  }

  // 3. Generate Bubble-compatible ID
  const { data: newId } = await supabase.rpc('generate_bubble_id');

  // 4. Calculate expiration (48 hours from now)
  const expirationDate = new Date();
  expirationDate.setHours(expirationDate.getHours() + 48);

  // 5. Insert into Supabase
  const { data, error } = await supabase
    .from('datechangerequest')
    .insert({
      _id: newId,
      Lease: payload.leaseId,
      'Requested by': user.id,
      'Request receiver': payload.receiverId,
      status: 'waiting_for_answer',
      typeOfRequest: payload.typeOfRequest,
      dateAdded: payload.dateAdded,
      dateRemoved: payload.dateRemoved,
      messageFromRequester: payload.message,
      priceRateOfNight: payload.priceRate,
      expirationDate: expirationDate.toISOString(),
      visibleToGuest: true,
      visibleToHost: true,
      'Created By': user.id,
      'Created Date': new Date().toISOString(),
    })
    .select()
    .single();

  // 6. Enqueue Bubble sync
  await enqueueBubbleSync(supabase, {
    correlationId: `datechangerequest:${newId}`,
    items: [{
      sequence: 1,
      table: 'datechangerequest',
      recordId: newId,
      operation: 'INSERT',
      payload: data,
    }],
  });

  return data;
}
```

**Validation:** Request creates in Supabase, sync_queue entry created

---

#### Step 2.4: Get Requests Handler

**Files:** `supabase/functions/date-change-request/handlers/get.ts`

**Purpose:** Retrieve date change requests for a lease

**Details:**
```typescript
export async function handleGet(
  payload: { leaseId: string },
  supabase: SupabaseClient
) {
  // Get all requests for lease, join with user data
  const { data, error } = await supabase
    .from('datechangerequest')
    .select(`
      *,
      requester:user!Requested by(
        _id,
        "Name - First",
        "Profile Photo"
      ),
      receiver:user!Request receiver(
        _id,
        "Name - First"
      )
    `)
    .eq('Lease', payload.leaseId)
    .order('Created Date', { ascending: false });

  return data;
}
```

**Validation:** Returns requests with user details

---

#### Step 2.5: Accept Handler

**Files:** `supabase/functions/date-change-request/handlers/accept.ts`

**Purpose:** Accept a date change request, update lease dates

**Details:**
```typescript
export async function handleAccept(
  payload: { requestId: string, message?: string },
  user: AuthenticatedUser,
  supabase: SupabaseClient
) {
  // 1. Get the request
  const request = await getRequest(payload.requestId, supabase);

  // 2. Verify user is the receiver
  if (request['Request receiver'] !== user.id) {
    throw new AuthenticationError('Not authorized');
  }

  // 3. Update request status
  await supabase
    .from('datechangerequest')
    .update({
      status: 'accepted',
      answerDate: new Date().toISOString(),
      answerToRequest: payload.message,
      'Modified Date': new Date().toISOString(),
    })
    .eq('_id', payload.requestId);

  // 4. Update lease booked dates based on request type
  await updateLeaseBookedDates(request, supabase);

  // 5. Enqueue Bubble sync
  await enqueueBubbleSync(...);

  return { success: true };
}
```

**Validation:** Status updates, lease dates modified correctly

---

#### Step 2.6: Throttle Status Handler

**Files:** `supabase/functions/date-change-request/handlers/getThrottleStatus.ts`

**Purpose:** Check if user has hit request limits

**Details:**
```typescript
const THROTTLE_LIMIT = 5; // Max requests per 24 hours
const THROTTLE_WINDOW_HOURS = 24;

export async function handleGetThrottleStatus(
  payload: { userId: string },
  supabase: SupabaseClient
) {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - THROTTLE_WINDOW_HOURS);

  const { count } = await supabase
    .from('datechangerequest')
    .select('*', { count: 'exact', head: true })
    .eq('Requested by', payload.userId)
    .gte('Created Date', windowStart.toISOString());

  return {
    requestCount: count,
    limit: THROTTLE_LIMIT,
    isThrottled: count >= THROTTLE_LIMIT,
    windowResetTime: windowStart.toISOString(),
  };
}
```

**Validation:** Returns correct throttle state

---

#### Step 2.7: Update config.toml

**Files:** `supabase/config.toml`

**Purpose:** Register new Edge Function

**Details:**
Add entry under `[functions]`:
```toml
[functions.date-change-request]
verify_jwt = false
```

**Validation:** Function is recognized by Supabase CLI

---

### Phase 3: Integration Points

#### Step 3.1: Add to GuestProposalsPage

**Files:** `app/src/islands/pages/GuestProposalsPage.jsx`

**Purpose:** Enable date change requests from guest dashboard

**Details:**
- Import DateChangeRequestManager
- Add state for modal visibility and selected lease
- Add "Request Date Change" button on active lease cards
- Pass lease data to DateChangeRequestManager
- Handle success callback (refresh data)

**Validation:** Button appears on lease cards, modal opens with correct data

---

#### Step 3.2: Add to HostProposalsPage

**Files:** `app/src/islands/pages/HostProposalsPage/index.jsx`

**Purpose:** Enable date change request management for hosts

**Details:**
- Import DateChangeRequestManager
- Add pending requests notification badge
- Add "Manage Date Change Requests" in proposal modal or lease view
- Show incoming requests with accept/decline actions

**Validation:** Host sees pending requests, can respond

---

#### Step 3.3: Update useGuestProposalsPageLogic

**Files:** `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js`

**Purpose:** Add date change request state and handlers

**Details:**
```javascript
// New state
const [showDateChangeRequest, setShowDateChangeRequest] = useState(false);
const [selectedLeaseForDCR, setSelectedLeaseForDCR] = useState(null);

// New handlers
const handleOpenDateChangeRequest = (lease) => {
  setSelectedLeaseForDCR(lease);
  setShowDateChangeRequest(true);
};

const handleDateChangeRequestSuccess = () => {
  setShowDateChangeRequest(false);
  setSelectedLeaseForDCR(null);
  // Refresh proposal data
  fetchProposals();
};

// Export new values
return {
  ...existingExports,
  showDateChangeRequest,
  selectedLeaseForDCR,
  handleOpenDateChangeRequest,
  handleCloseDateChangeRequest: () => setShowDateChangeRequest(false),
  handleDateChangeRequestSuccess,
};
```

**Validation:** Hook manages state correctly

---

### Phase 4: Styles and Polish

#### Step 4.1: Create CSS Styles

**Files:** `app/src/islands/shared/DateChangeRequestManager/DateChangeRequestManager.css`

**Purpose:** Component styles following VirtualMeetingManager pattern

**Details:**
- Use `dcr-` prefix namespace to avoid conflicts
- Match existing app styling (variables.css)
- Responsive design (mobile-first)
- Calendar styling with color-coded dates
- Price slider styling
- Modal overlay and container

**Validation:** Components styled consistently with app

---

#### Step 4.2: Create LLM Documentation

**Files:** `app/src/islands/shared/DateChangeRequestManager/CLAUDE.md`

**Purpose:** LLM-optimized reference documentation

**Details:**
Follow VirtualMeetingManager/CLAUDE.md format:
- Quick stats
- File inventory
- View state machine diagram
- API call patterns
- Critical rules
- Field name variants
- Usage examples

**Validation:** Documentation complete and accurate

---

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| User not authenticated | Show login modal before allowing request |
| Lease has no booked dates | Disable "Remove" and "Swap" options |
| Request already pending for date | Show warning, prevent duplicate |
| User at throttle limit | Show ThrottlingWarning, disable submit |
| Request expired | Update status to 'expired', hide from active list |
| Concurrent accept/decline | Use optimistic locking, surface conflict error |
| Lease status not active | Disable date change requests entirely |
| Network failure | Show error toast, allow retry |

---

## Testing Considerations

### Unit Tests
- RequestTypeSelector: Type selection toggles correctly
- ThrottlingWarning: Displays correct state based on props
- dateChangeRequestService: API calls formatted correctly

### Integration Tests
- Create request: End-to-end from UI to Supabase
- Accept request: Verify lease dates updated
- Throttle enforcement: Verify limit blocks submissions

### E2E Tests
- Guest submits date change request
- Host receives notification
- Host accepts/declines request
- Requester sees updated status

### Key Scenarios
1. Guest adds a single date to lease
2. Guest removes a date from lease
3. Guest swaps one date for another
4. Host accepts with custom message
5. Host declines with reason
6. Requester cancels pending request
7. Request expires after 48 hours

---

## Rollback Strategy

1. **Frontend-only rollback**: Remove DateChangeRequestManager imports from GuestProposalsPage and HostProposalsPage
2. **Full rollback**:
   - Revert all frontend changes
   - Disable Edge Function in config.toml
   - Note: Database changes (if any) require separate migration

---

## Dependencies & Blockers

### Prerequisites
- [x] `datechangerequest` table exists in Supabase
- [ ] Verify all required columns exist (may need migration)
- [ ] `os_date_change_request_status` has all required status values

### Potential Blockers
- If `datechangerequest` table missing columns, need migration first
- If status option set incomplete, need to add values

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Missing DB columns | Medium | High | Query table schema before implementation |
| Bubble sync complexity | Low | Medium | Follow existing queueSync pattern exactly |
| UI complexity | Medium | Medium | Start with MVP, iterate based on feedback |
| Throttle bypass | Low | Low | Server-side enforcement in Edge Function |
| Performance (large leases) | Low | Medium | Paginate calendar view if >100 dates |

---

## Phase Summary

| Phase | Files Created | Estimated Effort |
|-------|---------------|------------------|
| Phase 1: Frontend | 10 files | 4-6 hours |
| Phase 2: Edge Function | 8 files | 3-4 hours |
| Phase 3: Integration | 3 file modifications | 2-3 hours |
| Phase 4: Polish | 2 files | 1-2 hours |
| **Total** | **23 files** | **10-15 hours** |

---

## File References Summary

### Files to Create

| Path | Purpose |
|------|---------|
| `app/src/islands/shared/DateChangeRequestManager/DateChangeRequestManager.jsx` | Main orchestrator |
| `app/src/islands/shared/DateChangeRequestManager/DateChangeRequestCalendar.jsx` | Calendar component |
| `app/src/islands/shared/DateChangeRequestManager/RequestTypeSelector.jsx` | Type toggle buttons |
| `app/src/islands/shared/DateChangeRequestManager/RequestDetails.jsx` | Price/message form |
| `app/src/islands/shared/DateChangeRequestManager/RequestManagement.jsx` | Accept/decline view |
| `app/src/islands/shared/DateChangeRequestManager/ThrottlingWarning.jsx` | Rate limit warning |
| `app/src/islands/shared/DateChangeRequestManager/SuccessMessage.jsx` | Success feedback |
| `app/src/islands/shared/DateChangeRequestManager/dateChangeRequestService.js` | API service |
| `app/src/islands/shared/DateChangeRequestManager/dateUtils.js` | Date utilities |
| `app/src/islands/shared/DateChangeRequestManager/DateChangeRequestManager.css` | Styles |
| `app/src/islands/shared/DateChangeRequestManager/index.js` | Barrel exports |
| `app/src/islands/shared/DateChangeRequestManager/CLAUDE.md` | Documentation |
| `supabase/functions/date-change-request/index.ts` | Edge Function router |
| `supabase/functions/date-change-request/handlers/create.ts` | Create handler |
| `supabase/functions/date-change-request/handlers/get.ts` | Get handler |
| `supabase/functions/date-change-request/handlers/accept.ts` | Accept handler |
| `supabase/functions/date-change-request/handlers/decline.ts` | Decline handler |
| `supabase/functions/date-change-request/handlers/cancel.ts` | Cancel handler |
| `supabase/functions/date-change-request/handlers/getThrottleStatus.ts` | Throttle handler |
| `supabase/functions/date-change-request/lib/validation.ts` | Validation utils |
| `supabase/functions/date-change-request/lib/calculations.ts` | Price calculations |
| `supabase/functions/date-change-request/lib/types.ts` | TypeScript types |
| `supabase/functions/date-change-request/deno.json` | Import map |

### Files to Modify

| Path | Changes |
|------|---------|
| `app/src/islands/pages/GuestProposalsPage.jsx` | Add DCR integration |
| `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | Add DCR state/handlers |
| `app/src/islands/pages/HostProposalsPage/index.jsx` | Add DCR integration |
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | Add DCR state/handlers |
| `supabase/config.toml` | Register new Edge Function |

### Reference Files (Read-Only)

| Path | Purpose |
|------|---------|
| `app/src/islands/shared/VirtualMeetingManager/VirtualMeetingManager.jsx` | Orchestrator pattern |
| `app/src/islands/shared/VirtualMeetingManager/virtualMeetingService.js` | Service layer pattern |
| `app/src/islands/shared/VirtualMeetingManager/BookTimeSlot.jsx` | Calendar pattern |
| `app/src/islands/shared/VirtualMeetingManager/dateUtils.js` | Date utility pattern |
| `supabase/functions/virtual-meeting/index.ts` | Edge Function pattern |
| `supabase/functions/proposal/index.ts` | FP architecture pattern |
| `supabase/functions/_shared/queueSync.ts` | Bubble sync pattern |

---

**Plan Created:** 2026-01-09 15:12:00
**Author:** Claude Opus 4.5
**Status:** Ready for Execution
