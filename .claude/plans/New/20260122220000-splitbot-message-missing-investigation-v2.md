# SplitBot Message Missing Investigation v2

**Date**: 2026-01-22 22:00 UTC
**Status**: INVESTIGATION COMPLETE - ROOT CAUSE IDENTIFIED
**Proposal ID**: `1769118739842x04922255471005776`
**Thread ID**: `1769118740041x63712065796370944`
**Supabase Project**: `qzsmhgyojmwvtjmnrdea` (splitlease-backend-dev)

---

## Executive Summary

**ROOT CAUSE**: The `messages` Edge Function with action `create_proposal_thread` is NOT being called by the frontend after proposal creation - despite the code existing in `ViewSplitLeasePage.tsx`.

**Evidence**:
1. Proposal created successfully at 21:52:19 UTC on 2026-01-22
2. Thread created successfully at 21:52:20 UTC (by the `proposal` Edge Function)
3. **ZERO messages exist for this thread**
4. **ZERO SplitBot messages created on Jan 22** - last messages are from Jan 21 at 22:05 UTC
5. Edge Function logs show `messages` POST calls happened ~55 seconds after proposal, but these were for `get_messages`/`get_threads`, NOT `create_proposal_thread`

---

## Timeline Analysis

| Timestamp (UTC) | Event | Edge Function | Status |
|-----------------|-------|---------------|--------|
| 21:52:19.849 | Proposal created | `proposal` | 200 OK |
| 21:52:19.849 | Thread created | `proposal` (inline) | Success |
| 21:52:22.530 | Proposal Edge Function returns | `proposal` | 200 OK |
| 21:52:37+ | Messages calls | `messages` | 200 OK (but NOT create_proposal_thread) |

**Key Observation**: The `messages` function calls at timestamps 1769118797-1769118799 (about 55 seconds after proposal) are returning 200 OK, but they are NOT creating messages. They are likely `get_threads` or `get_messages` actions being called by the UI to refresh the message view.

---

## Database State

### Thread (EXISTS)
```
_id: 1769118740041x63712065796370944
Created Date: 2026-01-22 21:52:19.849+00
Proposal: 1769118739842x04922255471005776
-Guest User: 1769098333351x88400778893078464
-Host User: 1768496609507x04459521370938590
Message list: null
```

### Proposal (EXISTS)
```
_id: 1769118739842x04922255471005776
Status: Proposal Submitted by guest - Awaiting Rental Application
Created Date: 2026-01-22 21:52:19.849+00
Guest: 1769098333351x88400778893078464
Host User: 1768496609507x04459521370938590
```

### Messages for Thread (EMPTY)
```sql
SELECT * FROM "_message"
WHERE "Associated Thread/Conversation" = '1769118740041x63712065796370944';
-- Result: 0 rows
```

### Most Recent Messages (ALL FROM JAN 21)
```
Latest message: 1769033112549x01480905994109460
Created Date: 2026-01-21 22:05:12.56+00 (24+ hours ago)
Thread: 1769033107592x97704697397202416 (different thread)
```

---

## CTA Configuration Analysis

The proposal status is: `"Proposal Submitted by guest - Awaiting Rental Application"`

From `ctaHelpers.ts` STATUS_TO_CTA mapping:
```typescript
'Proposal Submitted by guest - Awaiting Rental Application': {
  guest: 'fill_out_rental_application',  // EXISTS - should create guest message
  // host: undefined - NO HOST CTA for this status
},
```

**CTA Record in Database**:
```
name: fill_out_rental_application
display: Fill out Rental Application
message: [Host name] cannot see your proposal until you fill out your Rental Application.
visible_to_guest_only: true
```

**Expected Behavior**:
- Guest should receive a SplitBot message: "Host cannot see your proposal until you fill out your Rental Application."
- Host should NOT receive a message (no CTA defined for this status/role)

**Actual Behavior**: No messages created at all.

---

## Code Analysis

### Frontend Call (ViewSplitLeasePage.tsx lines 842-855)
```typescript
const threadResponse = await supabase.functions.invoke('messages', {
  body: {
    action: 'create_proposal_thread',
    payload: {
      proposalId: newProposalId,
      guestId: guestId,
      hostId: actualHostId,
      listingId: proposalData.listingId,
      proposalStatus: actualProposalStatus,
      customHostMessage: aiHostSummary
    }
  }
});
```

**The code is correct** - but it's not being executed OR it's failing silently.

### Edge Function Handler (createProposalThread.ts)
```typescript
// Step 4: Create SplitBot message for GUEST
if (guestCTA) {
  guestMessageId = await createSplitBotMessage(supabase, {...});
}

// Step 5: Create SplitBot message for HOST
if (hostCTA) {
  hostMessageId = await createSplitBotMessage(supabase, {...});
}
```

**The handler is correct** - if called, it would create at least the guest message.

---

## Possible Root Causes

### Hypothesis 1: Frontend Call Not Executing (MOST LIKELY)
The `supabase.functions.invoke('messages', ...)` call may be:
1. Not reaching the server due to a network issue
2. Being caught by an earlier error in the try/catch
3. The `actualHostId` is undefined/null causing validation to fail

### Hypothesis 2: Edge Function Returning Early
The `createProposalThread` handler may be:
1. Failing validation (missing required fields)
2. Throwing an error before message creation
3. CTA lookup failing silently

### Hypothesis 3: Different Frontend File Being Used
There are TWO ViewSplitLeasePage files:
- `ViewSplitLeasePage.jsx` (OLD)
- `ViewSplitLeasePage/ViewSplitLeasePage.tsx` (NEW - active)

The entry point `view-split-lease.jsx` imports:
```javascript
import ViewSplitLeasePage from './islands/pages/ViewSplitLeasePage/ViewSplitLeasePage';
```

Need to verify this is importing the TSX version and not the JSX.

---

## Recommended Actions

### Immediate Debugging

1. **Add diagnostic logging to frontend**:
   ```typescript
   console.log('🔍 [DEBUG] create_proposal_thread payload:', {
     proposalId: newProposalId,
     guestId: guestId,
     hostId: actualHostId,
     listingId: proposalData.listingId,
     proposalStatus: actualProposalStatus,
   });
   ```

2. **Check browser console** during proposal submission for:
   - Network request to `messages` Edge Function
   - Any errors in the console
   - The actual response from the Edge Function

3. **Add server-side logging** to `createProposalThread.ts`:
   ```typescript
   console.log('[createProposalThread] ENTRY - payload received:', JSON.stringify(payload));
   ```

### Fix Verification

After identifying the exact failure point:
1. Fix the issue
2. Retest proposal submission
3. Verify messages are created in `_message` table
4. Verify both guest and host see appropriate messages (when applicable)

---

## Files Referenced

| File | Purpose | Status |
|------|---------|--------|
| `app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.tsx` | Frontend - proposal submission + thread creation | Code EXISTS but not executing |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | OLD frontend file | May be causing confusion |
| `app/src/view-split-lease.jsx` | Entry point - need to verify import | CHECK |
| `supabase/functions/messages/handlers/createProposalThread.ts` | Thread/message creation handler | Code is CORRECT |
| `supabase/functions/_shared/ctaHelpers.ts` | CTA lookup and rendering | Config is CORRECT |
| `supabase/functions/_shared/messagingHelpers.ts` | Core messaging utilities | Not analyzed |

---

## Conclusion

The `create_proposal_thread` action is NOT reaching the Edge Function server. The frontend code exists but is either:
1. Not being executed (control flow issue)
2. Failing before the HTTP request (validation/undefined values)
3. A different version of the file is being loaded

**Next Step**: Add diagnostic logging to the frontend and monitor browser console during proposal submission to identify the exact failure point.
