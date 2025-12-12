# Implementation Plan: Virtual Meeting Delete Action

## Overview
Add a delete action to the virtual-meeting Edge Function that removes virtual meeting records from the database and updates the associated proposal. Wire the frontend's CancelVirtualMeetings component to call this new endpoint instead of the legacy Bubble proxy.

## Success Criteria
- [ ] DELETE action is available in virtual-meeting Edge Function
- [ ] Virtual meeting record is deleted from virtualmeetingschedulesandlinks table
- [ ] Proposal is updated: 'virtual meeting' set to null, 'request virtual meeting' cleared
- [ ] Bubble sync is enqueued for the deletion (DELETE operation)
- [ ] Frontend service calls the new Edge Function delete action
- [ ] Cancel button in UI successfully triggers the delete flow

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/functions/virtual-meeting/index.ts` | Edge Function router | Add 'delete' to ALLOWED_ACTIONS, PUBLIC_ACTIONS, import handler, add switch case |
| `supabase/functions/virtual-meeting/handlers/create.ts` | Create handler reference | Reference only - follow this pattern for delete handler |
| `supabase/functions/virtual-meeting/handlers/delete.ts` | Delete handler (NEW) | Create new file with handleDelete function |
| `supabase/functions/virtual-meeting/lib/types.ts` | Type definitions | Add DeleteVirtualMeetingInput and DeleteVirtualMeetingResponse types |
| `supabase/functions/virtual-meeting/lib/validators.ts` | Input validators | Add validateDeleteVirtualMeetingInput function |
| `app/src/islands/shared/VirtualMeetingManager/virtualMeetingService.js` | Frontend API service | Update cancelVirtualMeeting to use new Edge Function |
| `app/src/islands/shared/VirtualMeetingManager/CancelVirtualMeetings.jsx` | Cancel UI component | No changes needed - already calls onCancel correctly |
| `app/src/islands/shared/VirtualMeetingManager/VirtualMeetingManager.jsx` | Parent orchestrator | No changes needed - already wires handleCancelMeeting |

### Related Documentation
- `supabase/CLAUDE.md` - Edge Function patterns and conventions
- `app/src/islands/shared/VirtualMeetingManager/CLAUDE.md` - VM Manager component documentation

### Existing Patterns to Follow
- **Action-based routing**: Use `{ action: 'delete', payload: {...} }` request format
- **Handler pattern**: Follow create.ts structure with validation, DB operations, sync queue
- **Bubble sync queue**: Use `enqueueBubbleSync` with operation: 'DELETE'
- **Error handling**: Use custom error classes (ValidationError, SupabaseSyncError)
- **Response format**: Return `{ success: true, data: {...} }` or error response

## Implementation Steps

### Step 1: Add Type Definitions
**Files:** `supabase/functions/virtual-meeting/lib/types.ts`
**Purpose:** Define TypeScript interfaces for delete operation input and response

**Details:**
- Add `DeleteVirtualMeetingInput` interface:
  ```typescript
  export interface DeleteVirtualMeetingInput {
    virtualMeetingId: string;  // Required: _id of the virtual meeting to delete
    proposalId: string;        // Required: _id of the associated proposal
  }
  ```
- Add `DeleteVirtualMeetingResponse` interface:
  ```typescript
  export interface DeleteVirtualMeetingResponse {
    deleted: boolean;
    virtualMeetingId: string;
    proposalId: string;
    deletedAt: string;
  }
  ```

**Validation:** TypeScript compilation should pass

---

### Step 2: Add Input Validator
**Files:** `supabase/functions/virtual-meeting/lib/validators.ts`
**Purpose:** Validate delete input payload before processing

**Details:**
- Add `validateDeleteVirtualMeetingInput` function:
  ```typescript
  export function validateDeleteVirtualMeetingInput(input: unknown): void {
    const data = input as Record<string, unknown>;

    if (!data.virtualMeetingId || typeof data.virtualMeetingId !== 'string') {
      throw new ValidationError('virtualMeetingId is required and must be a string');
    }

    if (!data.proposalId || typeof data.proposalId !== 'string') {
      throw new ValidationError('proposalId is required and must be a string');
    }
  }
  ```

**Validation:** Function throws ValidationError for invalid input

---

### Step 3: Create Delete Handler
**Files:** `supabase/functions/virtual-meeting/handlers/delete.ts` (NEW FILE)
**Purpose:** Handle the delete virtual meeting business logic

**Details:**
- Create new file following create.ts pattern
- Import dependencies:
  ```typescript
  import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
  import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
  import { enqueueBubbleSync, triggerQueueProcessing } from "../../_shared/queueSync.ts";
  import { DeleteVirtualMeetingInput, DeleteVirtualMeetingResponse, UserContext } from "../lib/types.ts";
  import { validateDeleteVirtualMeetingInput } from "../lib/validators.ts";
  ```

- Implement `handleDelete` function with these steps:
  1. **Validate input** - Call validateDeleteVirtualMeetingInput
  2. **Verify VM exists** - Fetch the record to confirm it exists
  3. **Delete VM record** - Delete from virtualmeetingschedulesandlinks
  4. **Update proposal** - Set 'virtual meeting' to null, clear 'request virtual meeting'
  5. **Enqueue Bubble sync** - Use DELETE operation
  6. **Return response** - Return DeleteVirtualMeetingResponse

- Key implementation details:
  ```typescript
  export async function handleDelete(
    payload: Record<string, unknown>,
    user: UserContext | null,
    supabase: SupabaseClient
  ): Promise<DeleteVirtualMeetingResponse> {
    console.log(`[virtual-meeting:delete] Starting delete for user: ${user?.email || 'public'}`);

    // VALIDATION
    const input = payload as unknown as DeleteVirtualMeetingInput;
    validateDeleteVirtualMeetingInput(input);

    // VERIFY VM EXISTS
    const { data: existingVM, error: fetchError } = await supabase
      .from("virtualmeetingschedulesandlinks")
      .select("_id")
      .eq("_id", input.virtualMeetingId)
      .single();

    if (fetchError || !existingVM) {
      throw new ValidationError(`Virtual meeting not found: ${input.virtualMeetingId}`);
    }

    // DELETE VM RECORD
    const { error: deleteError } = await supabase
      .from("virtualmeetingschedulesandlinks")
      .delete()
      .eq("_id", input.virtualMeetingId);

    if (deleteError) {
      throw new SupabaseSyncError(`Failed to delete virtual meeting: ${deleteError.message}`);
    }

    // UPDATE PROPOSAL
    const now = new Date().toISOString();
    const { error: proposalUpdateError } = await supabase
      .from("proposal")
      .update({
        "virtual meeting": null,
        "request virtual meeting": null,
        "Modified Date": now,
      })
      .eq("_id", input.proposalId);

    if (proposalUpdateError) {
      console.error(`[virtual-meeting:delete] Proposal update failed:`, proposalUpdateError);
      // Non-blocking - VM was deleted successfully
    }

    // ENQUEUE BUBBLE SYNC
    try {
      await enqueueBubbleSync(supabase, {
        correlationId: `delete-vm:${input.virtualMeetingId}`,
        items: [
          {
            sequence: 1,
            table: 'virtualmeetingschedulesandlinks',
            recordId: input.virtualMeetingId,
            operation: 'DELETE',
            bubbleId: input.virtualMeetingId,
            payload: { _id: input.virtualMeetingId },
          },
        ],
      });
      triggerQueueProcessing();
    } catch (syncError) {
      console.error(`[virtual-meeting:delete] Bubble sync failed (non-blocking):`, syncError);
    }

    // RETURN RESPONSE
    return {
      deleted: true,
      virtualMeetingId: input.virtualMeetingId,
      proposalId: input.proposalId,
      deletedAt: now,
    };
  }
  ```

**Validation:** Handler can be tested via Edge Function invocation

---

### Step 4: Register Delete Action in Router
**Files:** `supabase/functions/virtual-meeting/index.ts`
**Purpose:** Wire the delete action into the Edge Function router

**Details:**
1. Update ALLOWED_ACTIONS array:
   ```typescript
   const ALLOWED_ACTIONS = ["create", "delete"] as const;
   ```

2. Update PUBLIC_ACTIONS array (delete should be public during migration):
   ```typescript
   const PUBLIC_ACTIONS = ["create", "delete"] as const;
   ```

3. Add import for handleDelete:
   ```typescript
   import { handleDelete } from "./handlers/delete.ts";
   ```

4. Add case to switch statement:
   ```typescript
   case "delete":
     result = await handleDelete(body.payload, user, serviceClient);
     break;
   ```

**Validation:** Edge Function responds to `{ action: 'delete', payload: {...} }`

---

### Step 5: Update Frontend Service
**Files:** `app/src/islands/shared/VirtualMeetingManager/virtualMeetingService.js`
**Purpose:** Update cancelVirtualMeeting to call new Edge Function

**Details:**
- Modify the `cancelVirtualMeeting` function to use the virtual-meeting Edge Function instead of bubble-proxy:
  ```javascript
  /**
   * Cancel an existing virtual meeting
   * @param {string} meetingId - Virtual meeting ID
   * @param {string} proposalId - Proposal ID
   * @returns {Promise<{status: string, data?: any, message?: string}>}
   */
  export async function cancelVirtualMeeting(meetingId, proposalId) {
    try {
      const { data: responseData, error } = await supabase.functions.invoke('virtual-meeting', {
        body: {
          action: 'delete',
          payload: {
            virtualMeetingId: meetingId,
            proposalId: proposalId,
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to cancel virtual meeting');
      }

      return {
        status: 'success',
        data: responseData?.data,
      };
    } catch (error) {
      console.error('API Error (cancel-virtual-meeting):', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
  ```

**Validation:** Frontend cancel button works end-to-end

---

### Step 6: Deploy Edge Function
**Purpose:** Deploy the updated virtual-meeting Edge Function to production

**Details:**
- Use Supabase MCP to deploy:
  ```
  Deploy edge function: virtual-meeting
  ```
- Or via CLI: `supabase functions deploy virtual-meeting`

**Validation:** Edge Function is accessible at production URL

---

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| Virtual meeting doesn't exist | Return ValidationError: "Virtual meeting not found" |
| Proposal doesn't exist | Delete VM succeeds, proposal update fails silently (logged) |
| Database error during delete | Return SupabaseSyncError with message |
| Bubble sync fails | Log error, continue (non-blocking) |
| Missing virtualMeetingId | ValidationError: "virtualMeetingId is required" |
| Missing proposalId | ValidationError: "proposalId is required" |

## Testing Considerations

### Manual Testing Checklist
1. Call delete action with valid VM and proposal IDs
2. Verify VM record is deleted from virtualmeetingschedulesandlinks
3. Verify proposal 'virtual meeting' field is set to null
4. Verify proposal 'request virtual meeting' field is cleared
5. Check sync_queue for DELETE entry
6. Test error cases (invalid IDs, non-existent records)

### Frontend Integration Testing
1. Open proposal with active virtual meeting
2. Click Cancel Meeting button
3. Confirm cancellation in modal
4. Verify meeting is removed from UI
5. Refresh page and verify meeting is gone

## Rollback Strategy

If issues arise:
1. **Immediate**: Revert virtualMeetingService.js to use bubble-proxy again
2. **Full rollback**: Redeploy previous version of virtual-meeting Edge Function
3. **Data recovery**: VM records can be manually restored if needed (sync queue logs contain payloads)

## Dependencies & Blockers

- None - all required infrastructure (Edge Function, sync queue) already exists

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Bubble sync fails for DELETE | Low | Medium | Sync queue has retry mechanism |
| Proposal update fails | Low | Low | VM delete succeeds, proposal update is secondary |
| Frontend breaks | Low | High | Test thoroughly before deployment |

---

## File Reference Summary

### Files to CREATE
1. `supabase/functions/virtual-meeting/handlers/delete.ts` - New delete handler

### Files to MODIFY
1. `supabase/functions/virtual-meeting/index.ts` - Add delete action routing
2. `supabase/functions/virtual-meeting/lib/types.ts` - Add delete types
3. `supabase/functions/virtual-meeting/lib/validators.ts` - Add delete validator
4. `app/src/islands/shared/VirtualMeetingManager/virtualMeetingService.js` - Update cancelVirtualMeeting

### Files REFERENCED (no changes)
- `supabase/functions/virtual-meeting/handlers/create.ts` - Pattern reference
- `supabase/functions/_shared/queueSync.ts` - Queue sync utility
- `supabase/functions/_shared/errors.ts` - Error classes
- `app/src/islands/shared/VirtualMeetingManager/CancelVirtualMeetings.jsx` - Cancel UI
- `app/src/islands/shared/VirtualMeetingManager/VirtualMeetingManager.jsx` - Parent orchestrator
