# Implementation Plan: Extend Virtual Meeting Create to Update Proposal

## Overview

Modify the virtual-meeting Edge Function's create handler to automatically update the proposal record with `request virtual meeting` and `virtual meeting` fields after successfully creating a virtual meeting.

## Success Criteria

- [x] After VM creation succeeds, proposal is updated with `request virtual meeting` = 'guest'
- [x] After VM creation succeeds, proposal is updated with `virtual meeting` = newly created VM's `_id`
- [x] Update is non-blocking (follows existing pattern at lines 197-210)
- [x] Update is queued for Bubble sync (follows existing sync pattern)

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/functions/virtual-meeting/handlers/create.ts` | VM create handler | Extend proposal update section |

### Existing Pattern to Follow

The file already has a proposal update section (lines 193-210) that updates only the `virtual meeting` field. We need to extend this to also set `request virtual meeting`.

```typescript
// Current code (lines 197-210):
const { error: proposalUpdateError } = await supabase
  .from("proposal")
  .update({
    "virtual meeting": virtualMeetingId,
    "Modified Date": now,
  })
  .eq("_id", input.proposalId);
```

## Implementation Steps

### Step 1: Extend the Proposal Update Object

**File:** `supabase/functions/virtual-meeting/handlers/create.ts`
**Purpose:** Add `request virtual meeting` field to the existing update

**Details:**
- Locate the proposal update section (lines 193-210)
- Add `"request virtual meeting": "guest"` to the update object
- The `virtual meeting` field is already being set (line 200)

**Change:**
```typescript
// Lines 197-203 - Replace:
const { error: proposalUpdateError } = await supabase
  .from("proposal")
  .update({
    "virtual meeting": virtualMeetingId,
    "Modified Date": now,
  })
  .eq("_id", input.proposalId);

// With:
const { error: proposalUpdateError } = await supabase
  .from("proposal")
  .update({
    "request virtual meeting": "guest",
    "virtual meeting": virtualMeetingId,
    "Modified Date": now,
  })
  .eq("_id", input.proposalId);
```

**Validation:**
- Deploy function and test VM creation
- Verify proposal record has both fields updated

### Step 2: Update Log Message (Optional Enhancement)

**File:** `supabase/functions/virtual-meeting/handlers/create.ts`
**Purpose:** Improve logging to reflect both field updates

**Change:**
```typescript
// Line 209 - Update log message:
console.log(`[virtual-meeting:create] Proposal updated with VM link and request status`);
```

## Edge Cases & Error Handling

- **Proposal update failure:** Already handled as non-blocking (lines 205-210). VM creation succeeds even if proposal update fails.
- **Field validation:** The `request virtual meeting` field accepts string values; 'guest' is a valid option set value.

## Testing Considerations

1. Create a virtual meeting via the Edge Function
2. Verify the proposal record shows:
   - `request virtual meeting` = 'guest'
   - `virtual meeting` = the newly created VM's `_id`
3. Verify the Bubble sync queue processes the proposal update correctly

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Field name mismatch with Bubble | Low | Medium | Field name matches existing Bubble schema |
| Value 'guest' not in option set | Low | Medium | Standard option set value already in use |

## Notes

- This is a minimal change - only 1 line addition + 1 log message update
- The existing proposal update + Bubble sync patterns are already in place
- No new dependencies or imports required
- The Bubble sync for this proposal update happens via the existing enqueueBubbleSync call for the VM record; however, the direct Supabase update will also need to sync to Bubble. Consider if a separate enqueueBubbleSync for the proposal update is needed (currently not present in the code).

## Files Referenced Summary

1. `supabase/functions/virtual-meeting/handlers/create.ts` - Primary file to modify (lines 197-210)
2. `supabase/functions/proposal/actions/update.ts` - Reference for proposal update patterns
3. `supabase/functions/proposal/lib/types.ts` - Reference for proposal field definitions
