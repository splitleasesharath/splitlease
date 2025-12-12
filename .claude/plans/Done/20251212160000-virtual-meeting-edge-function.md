# Implementation Plan: Virtual Meeting Edge Function

## Overview
Create a new Edge Function called `virtual-meeting` that handles virtual meeting record creation. Wire the "Submit Request" button on the guest-proposal page to invoke this function when 3 time slots are selected. The function inserts a record into the `virtualmeetingschedulesandlinks` table with automatically generated IDs, relationship fields, meeting metadata, and user-selected datetime slots.

## Success Criteria
- [ ] New Edge Function `virtual-meeting` deployed with `create` action
- [ ] Function generates unique `_id` via `generate_bubble_id` RPC
- [ ] Function populates all required fields in `virtualmeetingschedulesandlinks` table
- [ ] Frontend VirtualMeetingManager invokes new Edge Function instead of bubble-proxy
- [ ] Time slots are stored as ISO 8601 format in `suggested dates and times` JSONB field
- [ ] Meeting duration defaults to 45 minutes
- [ ] Function follows action-based routing pattern matching existing Edge Functions
- [ ] Bubble sync is enqueued for the created record

---

## Context & References

### Relevant Files - Backend (Edge Functions)
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/functions/virtual-meeting/index.ts` | NEW: Main router for virtual meeting operations | Create new file |
| `supabase/functions/virtual-meeting/handlers/create.ts` | NEW: Handler for creating virtual meeting records | Create new file |
| `supabase/functions/virtual-meeting/lib/types.ts` | NEW: TypeScript interfaces for virtual meeting | Create new file |
| `supabase/functions/virtual-meeting/lib/validators.ts` | NEW: Input validation for create action | Create new file |
| `supabase/functions/_shared/cors.ts` | CORS headers (existing, no changes) | Reference only |
| `supabase/functions/_shared/errors.ts` | Error classes (existing, no changes) | Reference only |
| `supabase/functions/_shared/validation.ts` | Validation utilities (existing, no changes) | Reference only |
| `supabase/functions/_shared/slack.ts` | Error collector (existing, no changes) | Reference only |
| `supabase/functions/_shared/queueSync.ts` | Bubble sync queue (existing, no changes) | Reference only |
| `supabase/config.toml` | Supabase local config | Add new function entry |

### Relevant Files - Frontend
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/shared/VirtualMeetingManager/virtualMeetingService.js` | API service layer | Update `createVirtualMeetingRequest` to call new Edge Function |

### Related Documentation
- [supabase/CLAUDE.md](C:\Users\Split Lease\Documents\Split Lease\supabase\CLAUDE.md) - Edge Function patterns and conventions
- [largeCLAUDE.md](C:\Users\Split Lease\Documents\Split Lease\.claude\Documentation\largeCLAUDE.md) - Full project context
- [proposal/index.ts](C:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\index.ts) - Reference pattern for Edge Function structure

### Existing Patterns to Follow
- **Action-Based Routing**: Edge Functions use `{ action, payload }` pattern (see `proposal/index.ts`)
- **Error Collection**: ONE REQUEST = ONE LOG consolidated error reporting (see `_shared/slack.ts`)
- **ID Generation**: Use `supabase.rpc('generate_bubble_id')` for Bubble-compatible IDs
- **Bubble Sync Queue**: Use `enqueueBubbleSync()` for async sync to Bubble (see `_shared/queueSync.ts`)
- **Validation Pattern**: Use `validateRequired()` and custom validators (see `_shared/validation.ts`)
- **Public Actions**: No auth required for initial implementation (can be locked down later)

---

## Database Schema Reference

### Table: `virtualmeetingschedulesandlinks`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `_id` | text | NO | Primary key - generated via `generate_bubble_id` |
| `Created By` | text | YES | FK to `user._id` - current logged-in user |
| `Created Date` | timestamptz | NO | Timestamp of creation |
| `Modified Date` | timestamptz | NO | Timestamp of last modification |
| `host` | text | YES | FK to `user._id` - the listing's host |
| `guest` | text | YES | FK to `user._id` - current logged-in user (guest) |
| `proposal` | text | YES | FK to `proposal._id` - associated proposal |
| `requested by` | text | YES | FK to `user._id` - who requested the meeting |
| `meeting duration` | integer | YES | Duration in minutes (default: 45) |
| `suggested dates and times` | jsonb | NO | Array of ISO 8601 datetime strings |
| `booked date` | timestamptz | YES | NULL initially (set when meeting is confirmed) |
| `confirmedBySplitLease` | boolean | NO | Default: false |
| `meeting declined` | boolean | YES | Default: false |
| `meeting link` | text | YES | NULL initially (populated later) |
| `guest email` | text | YES | Guest's email |
| `guest name` | text | YES | Guest's name |
| `host email` | text | YES | Host's email |
| `host name` | text | YES | Host's name |
| `invitation sent to guest?` | boolean | YES | Default: false |
| `invitation sent to host?` | boolean | YES | Default: false |
| `end of meeting` | text | YES | NULL initially |
| `Listing (for Co-Host feature)` | text | YES | FK to `listing._id` |
| `pending` | boolean | YES | Default: false |

---

## Implementation Steps

### Step 1: Create Edge Function Directory Structure
**Files:**
- `supabase/functions/virtual-meeting/index.ts`
- `supabase/functions/virtual-meeting/handlers/create.ts`
- `supabase/functions/virtual-meeting/lib/types.ts`
- `supabase/functions/virtual-meeting/lib/validators.ts`
- `supabase/functions/virtual-meeting/deno.json`

**Purpose:** Set up the folder structure and boilerplate files for the new Edge Function

**Details:**
- Create `virtual-meeting` directory under `supabase/functions/`
- Create `handlers/` subdirectory for action handlers
- Create `lib/` subdirectory for types and validators
- Create `deno.json` import map (copy from existing function like `proposal/deno.json`)

**Validation:** Directory structure exists with empty files

---

### Step 2: Implement Type Definitions
**Files:** `supabase/functions/virtual-meeting/lib/types.ts`

**Purpose:** Define TypeScript interfaces for the virtual meeting create operation

**Details:**
```typescript
export interface CreateVirtualMeetingInput {
  proposalId: string;           // Required: FK to proposal._id
  timesSelected: string[];      // Required: Array of ISO 8601 datetime strings (exactly 3)
  requestedById: string;        // Required: FK to user._id (current user)
  timezoneString?: string;      // Optional: default 'America/New_York'
  isAlternativeTimes?: boolean; // Optional: true if suggesting alternative times
}

export interface CreateVirtualMeetingResponse {
  virtualMeetingId: string;
  proposalId: string;
  requestedById: string;
  createdAt: string;
}

export interface ProposalData {
  _id: string;
  Guest: string;
  Listing: string;
  'Host - Account': string;
}

export interface ListingData {
  _id: string;
  'Host / Landlord': string;
  'Created By': string;
}

export interface UserData {
  _id: string;
  email: string;
  'Name - First'?: string;
  'Name - Full'?: string;
}

export interface HostAccountData {
  _id: string;
  User: string;
}
```

**Validation:** TypeScript compiles without errors

---

### Step 3: Implement Input Validators
**Files:** `supabase/functions/virtual-meeting/lib/validators.ts`

**Purpose:** Validate the create virtual meeting input payload

**Details:**
```typescript
import { ValidationError } from "../../_shared/errors.ts";

export function validateCreateVirtualMeetingInput(input: unknown): void {
  const data = input as Record<string, unknown>;

  // Required fields
  if (!data.proposalId || typeof data.proposalId !== 'string') {
    throw new ValidationError('proposalId is required and must be a string');
  }

  if (!data.timesSelected || !Array.isArray(data.timesSelected)) {
    throw new ValidationError('timesSelected is required and must be an array');
  }

  // Exactly 3 time slots required
  if (data.timesSelected.length !== 3) {
    throw new ValidationError('Exactly 3 time slots are required');
  }

  // Validate each time slot is a valid ISO 8601 string
  for (const timeSlot of data.timesSelected) {
    if (typeof timeSlot !== 'string') {
      throw new ValidationError('Each time slot must be a string');
    }
    const date = new Date(timeSlot);
    if (isNaN(date.getTime())) {
      throw new ValidationError(`Invalid datetime format: ${timeSlot}`);
    }
  }

  if (!data.requestedById || typeof data.requestedById !== 'string') {
    throw new ValidationError('requestedById is required and must be a string');
  }
}
```

**Validation:** Validator rejects invalid input, accepts valid input

---

### Step 4: Implement the Create Handler
**Files:** `supabase/functions/virtual-meeting/handlers/create.ts`

**Purpose:** Handle the virtual meeting creation logic

**Details:**
```typescript
/**
 * Create Virtual Meeting Handler
 *
 * 1. Validate input (proposalId, timesSelected, requestedById)
 * 2. Fetch proposal to get Guest, Host, Listing relationships
 * 3. Fetch host user data via account_host -> user
 * 4. Fetch guest user data
 * 5. Generate unique _id via generate_bubble_id RPC
 * 6. Insert record into virtualmeetingschedulesandlinks
 * 7. Update proposal.virtual meeting field to link the new VM
 * 8. Enqueue Bubble sync for the created record
 * 9. Return the created VM ID
 */
```

**Key Implementation Points:**
- Use `supabase.rpc('generate_bubble_id')` for ID generation
- Fetch proposal first to get relationships:
  - `Guest` -> guest user ID
  - `Listing` -> listing ID -> `Host / Landlord` -> host account ID -> `User` -> host user ID
- Set `meeting duration` to 45 (minutes)
- Store `timesSelected` as-is in `suggested dates and times` JSONB field
- Set `Created Date` and `Modified Date` to current ISO timestamp
- Set `confirmedBySplitLease` to false
- Set `meeting declined` to false
- Update `proposal."virtual meeting"` field to link the new VM record
- Enqueue Bubble sync using `enqueueBubbleSync()`

**Validation:** Function creates a valid record in the database with all required fields

---

### Step 5: Implement the Main Router (index.ts)
**Files:** `supabase/functions/virtual-meeting/index.ts`

**Purpose:** Route incoming requests to the appropriate handler

**Details:**
- Follow the exact pattern from `proposal/index.ts`
- Allowed actions: `["create"]` (can add more later: `update`, `get`, `delete`)
- Public actions: `["create"]` (no auth required for MVP)
- Handle CORS preflight (OPTIONS)
- Parse JSON body, validate action
- Route to `handleCreate` for "create" action
- Use error collector for consolidated error reporting

**Pattern Reference (from proposal/index.ts):**
```typescript
const ALLOWED_ACTIONS = ["create"] as const;
const PUBLIC_ACTIONS = ["create"] as const;

// ... standard router pattern
switch (body.action) {
  case "create":
    result = await handleCreate(body.payload, user, serviceClient);
    break;
  default:
    throw new ValidationError(`Unhandled action: ${body.action}`);
}
```

**Validation:** Function responds to POST requests with `{ action: "create", payload: {...} }`

---

### Step 6: Create deno.json Import Map
**Files:** `supabase/functions/virtual-meeting/deno.json`

**Purpose:** Configure import map for the Edge Function

**Details:**
```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

**Validation:** Function can import Supabase client

---

### Step 7: Add Function to config.toml
**Files:** `supabase/config.toml`

**Purpose:** Register the new Edge Function with Supabase

**Details:**
Add the following section to `config.toml`:
```toml
[functions.virtual-meeting]
enabled = true
verify_jwt = false
```

**Validation:** Function appears in `supabase functions list`

---

### Step 8: Update Frontend Service Layer
**Files:** `app/src/islands/shared/VirtualMeetingManager/virtualMeetingService.js`

**Purpose:** Update `createVirtualMeetingRequest` to call the new Edge Function

**Details:**
- Change from calling `bubble-proxy` with endpoint `/wf/CORE-create-virtual-meeting`
- To calling `virtual-meeting` with action `create`

**Before:**
```javascript
export async function createVirtualMeetingRequest(
  proposalId,
  timesSelected,
  requestedById,
  isAlternativeTimes = false,
  timezoneString = 'America/New_York'
) {
  const data = {
    proposal: proposalId,
    times_selected: timesSelected.map(toISOString),
    requested_by: requestedById,
    is_alternative_times: isAlternativeTimes,
    timezone_string: timezoneString,
  };

  return proxyRequest('CORE-create-virtual-meeting', data);
}
```

**After:**
```javascript
export async function createVirtualMeetingRequest(
  proposalId,
  timesSelected,
  requestedById,
  isAlternativeTimes = false,
  timezoneString = 'America/New_York'
) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('virtual-meeting', {
      body: {
        action: 'create',
        payload: {
          proposalId,
          timesSelected: timesSelected.map(toISOString),
          requestedById,
          isAlternativeTimes,
          timezoneString,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to create virtual meeting');
    }

    return {
      status: 'success',
      data: responseData?.data,
    };
  } catch (error) {
    console.error('API Error (create-virtual-meeting):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
```

**Validation:** Frontend successfully calls the new Edge Function

---

### Step 9: Deploy the Edge Function
**Command:** `supabase functions deploy virtual-meeting`

**Purpose:** Deploy the new Edge Function to production

**Details:**
- Ensure all files are saved and syntax is valid
- Run `supabase functions deploy virtual-meeting`
- Verify deployment in Supabase dashboard

**Validation:** Function appears in Supabase dashboard under Edge Functions

---

### Step 10: Test End-to-End Flow
**Purpose:** Verify the complete flow from UI to database

**Test Steps:**
1. Open guest-proposals page with a valid proposal
2. Click "Request Virtual Meeting" button
3. Select exactly 3 time slots using the calendar picker
4. Click "Submit Request" button
5. Verify:
   - New record created in `virtualmeetingschedulesandlinks` table
   - `_id` is a valid Bubble-format ID
   - `suggested dates and times` contains the 3 selected times in ISO 8601 format
   - `meeting duration` is 45
   - `host`, `guest`, `proposal`, `requested by` fields are correctly populated
   - `proposal."virtual meeting"` field is updated to reference the new VM

**Validation:** Complete flow works without errors

---

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| Invalid proposalId (not found) | Throw `ValidationError("Proposal not found: {id}")` |
| Less than 3 time slots | Throw `ValidationError("Exactly 3 time slots are required")` |
| Invalid datetime format | Throw `ValidationError("Invalid datetime format: {slot}")` |
| Proposal already has virtual meeting | Allow creating new one (previous may have been declined) |
| Host account not found | Throw `ValidationError("Host account not found")` |
| Database insert fails | Throw `SupabaseSyncError("Failed to create virtual meeting: {error}")` |
| Bubble sync fails | Log error but don't fail the request (non-blocking) |

---

## Testing Considerations

### Unit Tests (if applicable)
- Test validator rejects invalid input (missing fields, wrong types)
- Test validator accepts valid input with exactly 3 time slots
- Test ID generation returns valid Bubble-format ID

### Integration Tests
- Test complete flow: frontend -> Edge Function -> database
- Test error responses for invalid input
- Test that proposal.virtual meeting field is updated

### Manual Testing
- Use Postman/curl to test Edge Function directly:
```bash
curl -X POST 'https://[PROJECT_REF].supabase.co/functions/v1/virtual-meeting' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer [ANON_KEY]' \
  -d '{
    "action": "create",
    "payload": {
      "proposalId": "1234567890123x1234567890123456",
      "timesSelected": [
        "2025-01-15T14:00:00.000Z",
        "2025-01-16T10:00:00.000Z",
        "2025-01-17T15:30:00.000Z"
      ],
      "requestedById": "9876543210987x6543210987654321"
    }
  }'
```

---

## Rollback Strategy

1. **If Edge Function deployment fails:**
   - The old `bubble-proxy` workflow will continue to work
   - No frontend changes needed

2. **If Edge Function has bugs:**
   - Revert frontend changes in `virtualMeetingService.js` to use `bubble-proxy` again
   - Delete/disable the Edge Function in Supabase dashboard

3. **If database schema issues:**
   - The schema already exists and is production-ready
   - No migrations needed

---

## Dependencies & Blockers

### Prerequisites
- [ ] Supabase project access
- [ ] `generate_bubble_id` RPC function exists (already present)
- [ ] `virtualmeetingschedulesandlinks` table exists (already present)

### No Blockers Identified

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Edge Function deployment fails | Low | Medium | Test locally first with `supabase functions serve` |
| Type errors in TypeScript | Low | Low | Use strict type checking, reference existing patterns |
| Bubble sync fails | Medium | Low | Non-blocking - sync can be retried manually |
| Frontend breaks | Low | High | Test thoroughly before deploying frontend changes |
| Performance issues | Low | Low | Simple insert operation, should be fast |

---

## File References Summary

### Files to CREATE (Backend)
1. `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\index.ts`
2. `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\handlers\create.ts`
3. `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\lib\types.ts`
4. `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\lib\validators.ts`
5. `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\virtual-meeting\deno.json`

### Files to MODIFY (Backend)
6. `C:\Users\Split Lease\Documents\Split Lease\supabase\config.toml` - Add function entry

### Files to MODIFY (Frontend)
7. `C:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\VirtualMeetingManager\virtualMeetingService.js` - Update `createVirtualMeetingRequest`

### Reference Files (READ ONLY)
- `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\index.ts` - Pattern reference
- `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\actions\create.ts` - Handler pattern
- `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\cors.ts` - CORS headers
- `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\errors.ts` - Error classes
- `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\validation.ts` - Validation utilities
- `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\slack.ts` - Error collector
- `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\queueSync.ts` - Bubble sync

---

**Plan Created:** 2025-12-12
**Estimated Implementation Time:** 2-3 hours
**Complexity:** Medium
