# Fix Duplicate SplitBot Messages on Proposal Creation

**Date:** 2026-01-17
**Issue Type:** Bug Fix
**Severity:** Medium
**Status:** PLANNED

---

## Problem Summary

When a guest creates a proposal, the "Fill out Rental Application" SplitBot message (and other CTA messages) appears **twice** in the messaging panel. Both messages have the same content and near-identical timestamps.

**Screenshot evidence:** The user's screenshot shows two identical "Host cannot see your proposal until you fill out your Rental Application" messages, both timestamped "Jan 17, 10:59 PM".

---

## Root Cause

Two independent code paths are both creating SplitBot messages during proposal creation:

### Path 1: Backend (Proposal Edge Function)
**File:** `supabase/functions/proposal/actions/create.ts` (lines 593-703)

After creating the proposal and thread, the Edge Function directly calls `createSplitBotMessage()` for both guest and host.

### Path 2: Frontend → Messages Edge Function
**File:** `app/src/islands/pages/ViewSplitLeasePage.jsx` (lines 1256-1267)

After receiving the proposal creation response, the frontend makes a separate call to the `messages` Edge Function with action `create_proposal_thread`.

**File:** `supabase/functions/messages/handlers/createProposalThread.ts` (lines 101-238)

This handler uses `findOrCreateProposalThread()` which finds the existing thread (created by Path 1), but then proceeds to create **new** SplitBot messages anyway because thread existence doesn't prevent message creation.

### Timeline
```
T+0ms:   Frontend calls proposal/create
T+50ms:  Proposal created in DB
T+100ms: Thread created in DB (by proposal Edge Function)
T+150ms: SplitBot messages created (MESSAGE #1 - Path 1)
T+200ms: Response returned to frontend
T+250ms: Frontend calls messages/create_proposal_thread
T+300ms: findOrCreateProposalThread finds existing thread
T+350ms: SplitBot messages created AGAIN (MESSAGE #2 - Path 2)
```

---

## Solution

**Remove the message creation logic from the proposal Edge Function** and let only the `create_proposal_thread` handler manage SplitBot messages.

### Why this approach?

1. **Single Responsibility**: The proposal Edge Function should focus on creating proposals, not messaging. The `create_proposal_thread` handler is specifically designed for message creation.

2. **Cleaner Architecture**: Thread/message creation as a separate step makes the flow more modular and easier to maintain.

3. **AI Summary Consideration**: The proposal Edge Function generates an AI summary for the host. This needs to be preserved. We have two options:
   - **Option A (Recommended)**: Pass the AI summary to the frontend, which passes it to `create_proposal_thread`
   - **Option B**: Keep AI generation in proposal Edge Function but move message creation out

We will use **Option A** because it keeps all messaging logic in one place.

---

## Implementation Steps

### Step 1: Modify Proposal Edge Function Response
**File:** `supabase/functions/proposal/actions/create.ts`

Add the AI host summary to the response so the frontend can pass it to the messages handler.

**Changes:**
- Keep the AI summary generation (lines 622-657) - it's valuable and works well
- Remove the `createSplitBotMessage` calls (lines 659-692)
- Remove the `updateThreadLastMessage` call (line 696)
- Add `aiHostSummary` to the response object

### Step 2: Update Frontend to Pass AI Summary
**File:** `app/src/islands/pages/ViewSplitLeasePage.jsx`

Update the `create_proposal_thread` call to include the AI summary from the proposal response.

**Changes:**
- Extract `aiHostSummary` from the proposal response
- Pass it as `customHostMessage` in the payload to `create_proposal_thread`

### Step 3: Update createProposalThread Handler
**File:** `supabase/functions/messages/handlers/createProposalThread.ts`

Accept an optional custom host message to use instead of the default CTA template.

**Changes:**
- Add `customHostMessage?: string` to the payload type
- Use `customHostMessage` for the host message body if provided

### Step 4: Keep Thread Creation in Proposal Edge Function
The thread creation (lines 568-591) should **remain** in the proposal Edge Function because:
- The thread ID is needed for the response
- Thread creation is tightly coupled to proposal creation
- `findOrCreateProposalThread` in the messages handler will find this existing thread (no duplicate)

---

## Detailed Code Changes

### File 1: `supabase/functions/proposal/actions/create.ts`

**Remove lines 659-702** (SplitBot message creation and thread last message update):

```typescript
// REMOVE THIS SECTION (lines 659-702):
// Send SplitBot message to GUEST
if (guestCTA) {
  // ... all of this
}

// Send SplitBot message to HOST (with AI summary if available)
if (hostCTA) {
  // ... all of this
}

// Update thread's last message preview
await updateThreadLastMessage(supabase, threadId, lastMessageBody);
```

**Keep lines 622-657** (AI summary generation) but refactor to return the summary.

**Update the response object** (around line 711):

```typescript
return {
  proposalId: proposalId,
  status: status,
  orderRanking: orderRanking,
  listingId: input.listingId,
  guestId: input.guestId,
  hostId: hostAccountData.User,
  createdAt: now,
  threadId: threadId,  // ADD: for frontend reference
  aiHostSummary: aiHostSummary,  // ADD: for messages handler
};
```

### File 2: `app/src/islands/pages/ViewSplitLeasePage.jsx`

**Update the create_proposal_thread call** (around line 1256):

```javascript
// Extract AI summary from response
const aiHostSummary = data.data?.aiHostSummary;

const threadResponse = await supabase.functions.invoke('messages', {
  body: {
    action: 'create_proposal_thread',
    payload: {
      proposalId: newProposalId,
      guestId: guestId,
      hostId: actualHostId,
      listingId: proposalData.listingId,
      proposalStatus: actualProposalStatus,
      customHostMessage: aiHostSummary  // ADD: pass AI summary
    }
  }
});
```

### File 3: `supabase/functions/messages/handlers/createProposalThread.ts`

**Update the payload interface** (around line 39):

```typescript
export interface CreateProposalThreadPayload {
  proposalId: string;
  guestId: string;
  hostId: string;
  listingId: string;
  proposalStatus: string;
  customMessageBody?: string;
  customHostMessage?: string;  // ADD: for AI-generated host message
  splitBotWarning?: string;
}
```

**Update the validation function** (around line 62):

```typescript
return {
  // ... existing fields
  customHostMessage: payload.customHostMessage as string | undefined,
};
```

**Update the host message creation** (around line 198):

```typescript
if (hostCTA) {
  // Use custom host message (AI summary) if provided, otherwise fall back to CTA template
  const hostMessageBody = input.customHostMessage ||
    hostCTA.message ||
    getDefaultMessage(input.proposalStatus, 'host', templateContext);
  // ... rest unchanged
}
```

---

## Testing Plan

1. **Create a new proposal** as a guest who hasn't completed their rental application
2. **Verify** only ONE "Fill out Rental Application" message appears
3. **Verify** the host still receives their AI-generated summary message (if generated)
4. **Check logs** to ensure no duplicate message creation attempts

---

## Files Referenced

| File | Purpose | Lines Affected |
|------|---------|----------------|
| [create.ts](../../supabase/functions/proposal/actions/create.ts) | Proposal Edge Function | 659-702 (remove), 711-720 (modify) |
| [ViewSplitLeasePage.jsx](../../app/src/islands/pages/ViewSplitLeasePage.jsx) | Frontend proposal submission | 1245-1267 (modify) |
| [createProposalThread.ts](../../supabase/functions/messages/handlers/createProposalThread.ts) | Messages handler | 39-49, 82-89, 197-199 (modify) |

---

## Rollback Plan

If issues arise, revert the changes and the duplicate messages will reappear (annoying but functional). The duplicate messages are a UX issue, not a data integrity issue.

---

## Post-Implementation Reminder

After modifying the Edge Functions:
- **Reminder:** Edge Functions require manual deployment via `supabase functions deploy proposal` and `supabase functions deploy messages`
