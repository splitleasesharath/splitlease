# Implementation Plan: Extract Virtual Meeting Service from Bubble-Proxy

## Overview
Migrate remaining virtual meeting workflows from the deprecated `bubble-proxy` edge function to the dedicated `virtual-meeting` edge function. This completes the consolidation of all virtual meeting operations into a single, focused edge function as part of the broader bubble-proxy retirement initiative.

## Success Criteria
- [ ] All virtual meeting operations consolidated in `virtual-meeting` edge function
- [ ] `virtualMeetingService.js` updated to call `virtual-meeting` endpoint for all actions
- [ ] No virtual meeting related code remains in `bubble-proxy`
- [ ] All existing functionality works as before (accept, decline, calendar, notifications)
- [ ] Bubble sync properly enqueued for all operations that modify data
- [ ] Edge function deployed and tested

## Context & References

### Current State Analysis

**Already Migrated to `virtual-meeting` edge function:**
| Action | Frontend Function | Edge Function Action | Status |
|--------|------------------|---------------------|--------|
| Create VM Request | `createVirtualMeetingRequest()` | `create` | DONE |
| Cancel/Delete VM | `cancelVirtualMeeting()` | `delete` | DONE |

**Still Using `bubble-proxy` (Need Migration):**
| Action | Frontend Function | Bubble Workflow | Status |
|--------|------------------|-----------------|--------|
| Accept VM | `acceptVirtualMeeting()` | `/wf/accept-virtual-meeting` | TO MIGRATE |
| Decline VM | `declineVirtualMeeting()` | `/wf/decline-virtual-meeting` | TO MIGRATE |
| Send Calendar Invite | `sendGoogleCalendarInvite()` | `/wf/l3-trigger-send-google-calend` | TO MIGRATE |
| Notify Participants | `notifyVirtualMeetingParticipants()` | `/wf/notify-virtual-meeting-partici` | TO MIGRATE |

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/functions/virtual-meeting/index.ts` | Edge function router | Add 4 new actions: `accept`, `decline`, `send_calendar_invite`, `notify_participants` |
| `supabase/functions/virtual-meeting/handlers/accept.ts` | New handler | CREATE - Handle accept meeting request |
| `supabase/functions/virtual-meeting/handlers/decline.ts` | New handler | CREATE - Handle decline meeting request |
| `supabase/functions/virtual-meeting/handlers/sendCalendarInvite.ts` | New handler | CREATE - Trigger calendar invite workflow |
| `supabase/functions/virtual-meeting/handlers/notifyParticipants.ts` | New handler | CREATE - Trigger notification workflow |
| `supabase/functions/virtual-meeting/lib/types.ts` | Type definitions | Add new input/response types |
| `supabase/functions/virtual-meeting/lib/validators.ts` | Input validation | Add new validation functions |
| `app/src/islands/shared/VirtualMeetingManager/virtualMeetingService.js` | Frontend service | Update 4 functions to call `virtual-meeting` endpoint |
| `supabase/functions/bubble-proxy/index.ts` | Legacy router | VERIFY - No VM code to remove (already delegated) |

### Related Documentation
- [VirtualMeetingManager CLAUDE.md](c:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\CLAUDE.md) - Documents the 4-view modal workflow
- [Supabase CLAUDE.md](c:\Users\Split Lease\Documents\Split Lease\supabase\CLAUDE.md) - Edge Functions patterns and conventions

### Existing Patterns to Follow
- **Action-Based Routing**: `{ action, payload }` request pattern from index.ts
- **Queue-Based Sync**: Use `enqueueBubbleSync()` + `triggerQueueProcessing()` for Bubble operations
- **Error Collection**: Use `createErrorCollector()` for consolidated Slack logging
- **Validation Pattern**: Separate validator functions in `lib/validators.ts`
- **Type Safety**: TypeScript interfaces in `lib/types.ts`
- **No Fallback Principle**: Fail fast without fallback logic

## Implementation Steps

### Step 1: Add New Types to `lib/types.ts`
**Files:** `supabase/functions/virtual-meeting/lib/types.ts`
**Purpose:** Define TypeScript interfaces for new operations
**Details:**
```typescript
// Accept Virtual Meeting
export interface AcceptVirtualMeetingInput {
  proposalId: string;           // Required: FK to proposal._id
  bookedDate: string;           // Required: ISO 8601 datetime (selected time slot)
  userAcceptingId: string;      // Required: FK to user._id (user accepting)
}

export interface AcceptVirtualMeetingResponse {
  success: boolean;
  virtualMeetingId: string;
  proposalId: string;
  bookedDate: string;
  updatedAt: string;
}

// Decline Virtual Meeting
export interface DeclineVirtualMeetingInput {
  proposalId: string;           // Required: FK to proposal._id
}

export interface DeclineVirtualMeetingResponse {
  success: boolean;
  proposalId: string;
  declinedAt: string;
}

// Send Calendar Invite
export interface SendCalendarInviteInput {
  proposalId: string;           // Required: FK to proposal._id
  userId: string;               // Required: FK to user._id (recipient)
}

export interface SendCalendarInviteResponse {
  success: boolean;
  proposalId: string;
  userId: string;
  triggeredAt: string;
}

// Notify Participants
export interface NotifyParticipantsInput {
  hostId: string;               // Required: FK to user._id
  guestId: string;              // Required: FK to user._id
  virtualMeetingId: string;     // Required: FK to virtualmeetingschedulesandlinks._id
}

export interface NotifyParticipantsResponse {
  success: boolean;
  virtualMeetingId: string;
  notifiedAt: string;
}
```
**Validation:** Types compile without errors

### Step 2: Add New Validators to `lib/validators.ts`
**Files:** `supabase/functions/virtual-meeting/lib/validators.ts`
**Purpose:** Add input validation for new actions
**Details:**
```typescript
export function validateAcceptVirtualMeetingInput(input: unknown): void {
  const data = input as Record<string, unknown>;

  if (!data.proposalId || typeof data.proposalId !== 'string') {
    throw new ValidationError('proposalId is required and must be a string');
  }

  if (!data.bookedDate || typeof data.bookedDate !== 'string') {
    throw new ValidationError('bookedDate is required and must be a string');
  }

  // Validate bookedDate is valid ISO 8601
  const date = new Date(data.bookedDate);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`Invalid datetime format for bookedDate: ${data.bookedDate}`);
  }

  if (!data.userAcceptingId || typeof data.userAcceptingId !== 'string') {
    throw new ValidationError('userAcceptingId is required and must be a string');
  }
}

export function validateDeclineVirtualMeetingInput(input: unknown): void {
  const data = input as Record<string, unknown>;

  if (!data.proposalId || typeof data.proposalId !== 'string') {
    throw new ValidationError('proposalId is required and must be a string');
  }
}

export function validateSendCalendarInviteInput(input: unknown): void {
  const data = input as Record<string, unknown>;

  if (!data.proposalId || typeof data.proposalId !== 'string') {
    throw new ValidationError('proposalId is required and must be a string');
  }

  if (!data.userId || typeof data.userId !== 'string') {
    throw new ValidationError('userId is required and must be a string');
  }
}

export function validateNotifyParticipantsInput(input: unknown): void {
  const data = input as Record<string, unknown>;

  if (!data.hostId || typeof data.hostId !== 'string') {
    throw new ValidationError('hostId is required and must be a string');
  }

  if (!data.guestId || typeof data.guestId !== 'string') {
    throw new ValidationError('guestId is required and must be a string');
  }

  if (!data.virtualMeetingId || typeof data.virtualMeetingId !== 'string') {
    throw new ValidationError('virtualMeetingId is required and must be a string');
  }
}
```
**Validation:** Validators throw ValidationError for invalid inputs

### Step 3: Create `handlers/accept.ts`
**Files:** `supabase/functions/virtual-meeting/handlers/accept.ts`
**Purpose:** Handle accepting a virtual meeting request (sets booked date)
**Details:**
```typescript
/**
 * Accept Virtual Meeting Handler
 *
 * Updates the virtual meeting record with the selected booked date.
 * This confirms the meeting and sets the scheduled time.
 *
 * Steps:
 * 1. Validate input
 * 2. Fetch proposal to get virtual meeting ID
 * 3. Update virtual meeting: set booked date, clear pending
 * 4. Update proposal: set request_virtual_meeting status
 * 5. Enqueue Bubble sync for UPDATE operation
 * 6. Return response
 */
```
- Fetch proposal to get `virtual meeting` field
- Update `virtualmeetingschedulesandlinks`: set `booked date`, `confirmedBySplitLease: true`
- Update `proposal`: set `request virtual meeting` status appropriately
- Enqueue Bubble sync for the virtual meeting UPDATE
**Validation:** Booked date is set correctly, proposal updated

### Step 4: Create `handlers/decline.ts`
**Files:** `supabase/functions/virtual-meeting/handlers/decline.ts`
**Purpose:** Handle declining a virtual meeting request
**Details:**
```typescript
/**
 * Decline Virtual Meeting Handler
 *
 * Marks the virtual meeting as declined without deleting it.
 * The meeting record remains for history/audit purposes.
 *
 * Steps:
 * 1. Validate input
 * 2. Fetch proposal to get virtual meeting ID
 * 3. Update virtual meeting: set meeting declined = true
 * 4. Update proposal: clear request_virtual_meeting
 * 5. Enqueue Bubble sync for UPDATE operation
 * 6. Return response
 */
```
- Fetch proposal to get `virtual meeting` field
- Update `virtualmeetingschedulesandlinks`: set `meeting declined: true`
- Update `proposal`: clear `request virtual meeting` field
- Enqueue Bubble sync for the virtual meeting UPDATE
**Validation:** Meeting marked as declined, proposal updated

### Step 5: Create `handlers/sendCalendarInvite.ts`
**Files:** `supabase/functions/virtual-meeting/handlers/sendCalendarInvite.ts`
**Purpose:** Trigger Google Calendar invite via Zapier integration
**Details:**
```typescript
/**
 * Send Calendar Invite Handler
 *
 * Triggers the Zapier workflow to send Google Calendar invites.
 * This is a fire-and-forget operation - we trigger the workflow
 * and don't wait for Zapier's response.
 *
 * Steps:
 * 1. Validate input
 * 2. Call Bubble workflow: l3-trigger-send-google-calend
 * 3. Return success response
 *
 * NOTE: This calls Bubble workflow directly (not queue-based)
 * because it's triggering an external integration, not syncing data.
 */
```
- Use BubbleSyncService to trigger workflow directly (not queue-based)
- Workflow: `l3-trigger-send-google-calend`
- Params: `{ proposal: proposalId, user: userId }`
**Validation:** Workflow triggered successfully

### Step 6: Create `handlers/notifyParticipants.ts`
**Files:** `supabase/functions/virtual-meeting/handlers/notifyParticipants.ts`
**Purpose:** Trigger SMS/Email notifications to meeting participants
**Details:**
```typescript
/**
 * Notify Participants Handler
 *
 * Triggers the notification workflow to send SMS/Email to participants.
 * This is a fire-and-forget operation.
 *
 * Steps:
 * 1. Validate input
 * 2. Call Bubble workflow: notify-virtual-meeting-partici
 * 3. Return success response
 *
 * NOTE: This calls Bubble workflow directly (not queue-based)
 * because it's triggering notifications, not syncing data.
 */
```
- Use BubbleSyncService to trigger workflow directly
- Workflow: `notify-virtual-meeting-partici`
- Params: `{ host: hostId, guest: guestId, virtual_meeting: virtualMeetingId }`
**Validation:** Workflow triggered successfully

### Step 7: Update `index.ts` Router
**Files:** `supabase/functions/virtual-meeting/index.ts`
**Purpose:** Add routing for new actions
**Details:**
- Add imports for new handlers
- Expand `ALLOWED_ACTIONS` to include: `create`, `delete`, `accept`, `decline`, `send_calendar_invite`, `notify_participants`
- Add `PUBLIC_ACTIONS` to include all actions (until Supabase auth migration complete)
- Add switch cases for new actions
```typescript
const ALLOWED_ACTIONS = ["create", "delete", "accept", "decline", "send_calendar_invite", "notify_participants"] as const;
const PUBLIC_ACTIONS = ["create", "delete", "accept", "decline", "send_calendar_invite", "notify_participants"] as const;

// In switch statement:
case "accept":
  result = await handleAccept(body.payload, user, serviceClient);
  break;

case "decline":
  result = await handleDecline(body.payload, user, serviceClient);
  break;

case "send_calendar_invite":
  result = await handleSendCalendarInvite(body.payload, user, serviceClient);
  break;

case "notify_participants":
  result = await handleNotifyParticipants(body.payload, user, serviceClient);
  break;
```
**Validation:** All new actions route to correct handlers

### Step 8: Update Frontend `virtualMeetingService.js`
**Files:** `app/src/islands/shared/VirtualMeetingManager/virtualMeetingService.js`
**Purpose:** Update API calls to use new `virtual-meeting` endpoint
**Details:**

**8a. Update `acceptVirtualMeeting()`:**
```javascript
export async function acceptVirtualMeeting(proposalId, bookedDate, userAcceptingId) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('virtual-meeting', {
      body: {
        action: 'accept',
        payload: {
          proposalId,
          bookedDate: toISOString(bookedDate),
          userAcceptingId,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to accept virtual meeting');
    }

    return {
      status: 'success',
      data: responseData?.data,
    };
  } catch (error) {
    console.error('API Error (accept-virtual-meeting):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
```

**8b. Update `declineVirtualMeeting()`:**
```javascript
export async function declineVirtualMeeting(proposalId) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('virtual-meeting', {
      body: {
        action: 'decline',
        payload: {
          proposalId,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to decline virtual meeting');
    }

    return {
      status: 'success',
      data: responseData?.data,
    };
  } catch (error) {
    console.error('API Error (decline-virtual-meeting):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
```

**8c. Update `sendGoogleCalendarInvite()`:**
```javascript
export async function sendGoogleCalendarInvite(proposalId, userId) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('virtual-meeting', {
      body: {
        action: 'send_calendar_invite',
        payload: {
          proposalId,
          userId,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to send calendar invite');
    }

    return {
      status: 'success',
      data: responseData?.data,
    };
  } catch (error) {
    console.error('API Error (send-calendar-invite):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
```

**8d. Update `notifyVirtualMeetingParticipants()`:**
```javascript
export async function notifyVirtualMeetingParticipants(hostId, guestId, virtualMeetingId) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('virtual-meeting', {
      body: {
        action: 'notify_participants',
        payload: {
          hostId,
          guestId,
          virtualMeetingId,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to notify participants');
    }

    return {
      status: 'success',
      data: responseData?.data,
    };
  } catch (error) {
    console.error('API Error (notify-participants):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
```

**8e. Remove `proxyRequest()` helper:**
- The `proxyRequest()` function that calls bubble-proxy is no longer needed
- Can be deleted or kept for backwards compatibility if other functions use it
**Validation:** All 4 functions call `virtual-meeting` endpoint with correct action/payload

### Step 9: Remove Dead Code from `virtualMeetingService.js`
**Files:** `app/src/islands/shared/VirtualMeetingManager/virtualMeetingService.js`
**Purpose:** Clean up unused code
**Details:**
- Remove the `BUBBLE_PROXY_FUNCTION` constant (line 10)
- Remove the `proxyRequest()` helper function (lines 18-43) if no longer used
- Keep `updateVirtualMeetingDirect()` - it's a direct Supabase operation, not via bubble-proxy
**Validation:** No remaining references to `bubble-proxy` for VM operations

### Step 10: Verify No VM Code in bubble-proxy
**Files:** `supabase/functions/bubble-proxy/index.ts`
**Purpose:** Confirm no virtual meeting specific handlers exist
**Details:**
- Review bubble-proxy/index.ts - CONFIRMED: No VM-specific actions in `allowedActions` array
- The bubble-proxy function is generic - it proxies to Bubble workflows
- Virtual meeting operations went through the generic `proxyRequest()` on frontend, not specific handlers
- **No changes needed to bubble-proxy** - it was just being used as a pass-through
**Validation:** bubble-proxy has no VM-specific code to remove

### Step 11: Add BubbleSyncService Import (if needed)
**Files:** `supabase/functions/virtual-meeting/handlers/sendCalendarInvite.ts`, `supabase/functions/virtual-meeting/handlers/notifyParticipants.ts`
**Purpose:** Import BubbleSyncService for triggering Bubble workflows
**Details:**
- The `send_calendar_invite` and `notify_participants` actions need to call Bubble workflows directly
- Option A: Import and use `BubbleSyncService.triggerWorkflowOnly()` from `_shared/bubbleSync.ts`
- Option B: Use direct `fetch()` to Bubble API (simpler, no sync needed)
- **Recommendation**: Use direct fetch since these are trigger-only operations, not data sync
```typescript
// Direct approach for workflow triggers
const bubbleBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');

const response = await fetch(`${bubbleBaseUrl}/wf/workflow-name`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${bubbleApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(params),
});
```
**Validation:** Bubble workflows are triggered successfully

## Edge Cases & Error Handling
- **VM not found for accept/decline**: Throw ValidationError with clear message
- **Proposal not found**: Throw ValidationError with proposal ID
- **Already accepted/declined**: Check current state before updating, return appropriate response
- **Bubble workflow failure**: Log error, return error response (no fallback)
- **Network timeout to Bubble**: Let error propagate, client can retry

## Testing Considerations
- Test accept VM flow end-to-end:
  - Create VM request with 3 time slots
  - Accept with one of the proposed times
  - Verify booked date is set correctly
  - Verify Bubble sync queued
- Test decline VM flow:
  - Create VM request
  - Decline the request
  - Verify `meeting declined` flag is true
  - Verify Bubble sync queued
- Test calendar invite trigger:
  - Accept a VM
  - Trigger calendar invite
  - Verify Bubble workflow called (check Bubble logs)
- Test participant notifications:
  - Have confirmed VM
  - Trigger notifications
  - Verify Bubble workflow called
- Test error scenarios:
  - Invalid proposal ID
  - Invalid date format
  - Missing required fields
  - VM already accepted/declined

## Rollback Strategy
- If issues arise, revert frontend changes in `virtualMeetingService.js` to call bubble-proxy again
- Edge function changes are independent - can deploy old version
- No database schema changes required
- git revert is straightforward

## Dependencies & Blockers
- **Bubble workflows must exist**: `accept-virtual-meeting`, `decline-virtual-meeting`, `l3-trigger-send-google-calend`, `notify-virtual-meeting-partici`
- **Bubble API credentials**: Must be configured in Supabase secrets

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Bubble workflow name mismatch | Low | High | Verify exact workflow names in Bubble |
| Missing Bubble API credentials | Low | High | Verify secrets configured before deploy |
| Field name mismatches | Medium | Medium | Review virtualmeetingschedulesandlinks schema |
| Queue sync issues | Low | Medium | Follow existing patterns from create.ts/delete.ts |

## Deployment Notes
- **REMINDER**: After implementing, deploy with: `supabase functions deploy virtual-meeting`
- Test locally first with: `supabase functions serve virtual-meeting`
- Verify environment variables are set in production

## Files Referenced Summary
| File Path | Purpose |
|-----------|---------|
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\index.ts` | Edge function router - add new actions |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\handlers\create.ts` | Existing create handler - pattern reference |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\handlers\delete.ts` | Existing delete handler - pattern reference |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\handlers\accept.ts` | NEW - Accept VM handler |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\handlers\decline.ts` | NEW - Decline VM handler |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\handlers\sendCalendarInvite.ts` | NEW - Calendar invite trigger |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\handlers\notifyParticipants.ts` | NEW - Notification trigger |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\lib\types.ts` | Type definitions - add new types |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\lib\validators.ts` | Validators - add new validators |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\deno.json` | Deno config - no changes needed |
| `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\virtualMeetingService.js` | Frontend service - update API calls |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\bubbleSync.ts` | Bubble sync service - import if needed |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\queueSync.ts` | Queue sync utility - for data operations |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\errors.ts` | Error classes - ValidationError, etc. |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\cors.ts` | CORS headers - already imported |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\slack.ts` | Error collection - already imported |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\bubble-proxy\index.ts` | Legacy router - verify no VM code |
