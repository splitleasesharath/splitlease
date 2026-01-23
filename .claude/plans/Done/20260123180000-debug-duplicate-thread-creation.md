# Debug Analysis: Duplicate Thread Creation When Proposal is Created

**Created**: 2026-01-23 18:00:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: Proposal Creation / Messaging Threads

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18 + Vite frontend, Supabase Edge Functions (Deno/TypeScript), PostgreSQL
- **Data Flow**:
  - Guest contacts host via ContactHostMessaging component -> `send_message` action -> creates thread
  - Guest creates proposal via CreateProposalFlowV2 -> `create` action -> creates ANOTHER thread

### 1.2 Domain Context
- **Feature Purpose**: Enable guest-host communication through message threads
- **Related Documentation**:
  - `supabase/CLAUDE.md` - Edge Functions reference
  - `.claude/Documentation/Backend(EDGE - Functions)/MESSAGES.md` - Messages function docs
  - `.claude/Documentation/Backend(EDGE - Functions)/PROPOSAL.md` - Proposal function docs
- **Data Model**:
  - `thread` table: Stores conversation threads with `-Host User`, `-Guest User`, `Listing`, `Proposal` columns
  - `_message` table: Stores individual messages linked to threads
  - One thread should exist per unique combination of host+guest+listing

### 1.3 Relevant Conventions
- **Action-Based Edge Functions**: All functions use `{ action, payload }` pattern
- **ID Generation**: Uses `supabase.rpc('generate_bubble_id')` for Bubble-compatible IDs
- **Thread Uniqueness**: A single thread should exist for a guest-host-listing combination

### 1.4 Entry Points and Dependencies
- **ContactHost Entry Point**: `ContactHostMessaging.jsx` -> `messages` Edge Function -> `send_message` action
- **Proposal Entry Point**: `CreateProposalFlowV2.jsx` -> `proposal` Edge Function -> `create` action
- **Critical Path**: Both paths create threads, but they do NOT coordinate with each other
- **Dependencies**:
  - `_shared/messagingHelpers.ts` - Contains `findExistingThread`, `findOrCreateProposalThread`, `createThread`
  - `messages/handlers/sendMessage.ts` - Uses `findExistingThread` to avoid duplicates
  - `proposal/actions/create.ts` - Directly inserts thread WITHOUT using `findOrCreateProposalThread`

## 2. Problem Statement

When a guest contacts a host about a listing (creating message thread A), and then subsequently creates a proposal for that same listing, the system creates a NEW thread (thread B) instead of reusing the existing one.

**Evidence provided:**
- 1st thread created (guest message to host): `1769178963990x54464697305685328`
- 2nd thread created (proposal creation): `1769179081859x71786309698089792`
- Both threads are for the same guest-host-listing combination

**Impact:**
- Fragmented conversation history between guest and host
- Confusing user experience - messages appear in different threads
- Potential data integrity issues with orphaned threads

## 3. Reproduction Context

**Environment:** Production (based on Bubble-style thread IDs)

**Steps to reproduce:**
1. Guest (logged in) views a listing
2. Guest contacts host via "Contact Host" button (uses `ContactHostMessaging.jsx`)
3. System creates Thread A via `send_message` action
4. Guest submits a proposal for the same listing (via `CreateProposalFlowV2.jsx`)
5. System creates Thread B via `proposal/create` action

**Expected behavior:** Step 5 should find and reuse Thread A instead of creating Thread B

**Actual behavior:** A new thread is created, resulting in duplicate threads for the same conversation

## 4. Investigation Summary

### 4.1 Files Examined

| File | Relevance |
|------|-----------|
| `supabase/functions/proposal/actions/create.ts` | **ROOT CAUSE** - Creates thread directly without checking for existing threads (lines 560-592) |
| `supabase/functions/_shared/messagingHelpers.ts` | Contains `findOrCreateProposalThread` which DOES check for existing threads (lines 409-453) |
| `supabase/functions/messages/handlers/sendMessage.ts` | Uses `findExistingThread` correctly to avoid duplicates (lines 173-186) |
| `supabase/functions/messages/handlers/createProposalThread.ts` | Uses `findOrCreateProposalThread` correctly (line 145) |
| `app/src/islands/shared/ContactHostMessaging.jsx` | Frontend component that triggers `send_message` action |

### 4.2 Execution Flow Trace

**Flow 1: Contact Host (CORRECT - checks for existing thread)**
```
ContactHostMessaging.jsx
  └─> supabase.functions.invoke('messages', { action: 'send_message', ... })
        └─> messages/handlers/sendMessage.ts::handleSendMessage()
              └─> findExistingThread(supabase, recipientId, senderBubbleId, listingId)  // Line 173
              └─> if not found: findExistingThread(supabase, senderBubbleId, recipientId, listingId)  // Line 181
              └─> if still not found: createThread(...)  // Line 191
```

**Flow 2: Create Proposal (INCORRECT - creates thread directly)**
```
CreateProposalFlowV2.jsx
  └─> supabase.functions.invoke('proposal', { action: 'create', ... })
        └─> proposal/actions/create.ts::handleCreate()
              └─> supabase.rpc('generate_bubble_id')  // Line 561 - generates new thread ID
              └─> supabase.from('thread').insert(...)  // Line 580 - ALWAYS creates new thread
              └─> NEVER calls findExistingThread or findOrCreateProposalThread!
```

### 4.3 Git History Analysis

**Relevant Commits:**
- `82e1dfb5` (2026-01-22): "fix(proposal): create SplitBot messages directly in Edge Function"
  - This commit added direct thread creation in proposal/actions/create.ts
  - The change was made because frontend calls to `create_proposal_thread` were unreliable
  - However, it introduced the duplicate thread bug by not using `findOrCreateProposalThread`

- `f6b5cc71`: "feat(messages): Add proposal thread creation and SplitBot messaging"
  - Introduced `findOrCreateProposalThread` in `messagingHelpers.ts`
  - This function PROPERLY checks for existing threads before creating

The `findOrCreateProposalThread` function (lines 409-453 in `messagingHelpers.ts`) implements the correct logic:
1. Check if thread exists for this proposal: `findThreadByProposal(proposalId)`
2. Check if thread exists for this listing+guest: `findExistingThread(hostUserId, guestUserId, listingId)`
3. If found an existing thread by listing+guest, UPDATE it with the proposalId
4. Only create a new thread if neither check finds anything

## 5. Hypotheses

### Hypothesis 1: Proposal creation bypasses existing thread lookup (Likelihood: 95%)

**Theory:** The `proposal/actions/create.ts` file creates a thread directly (lines 560-592) without calling `findOrCreateProposalThread` or `findExistingThread`. This means it ALWAYS creates a new thread, even when one already exists for the same guest-host-listing combination.

**Supporting Evidence:**
- Code at lines 560-592 shows direct `supabase.rpc('generate_bubble_id')` and `supabase.from('thread').insert()` calls
- No calls to `findExistingThread` or `findOrCreateProposalThread` in the entire `create.ts` file
- The `messages/handlers/createProposalThread.ts` correctly uses `findOrCreateProposalThread` (line 145), but this handler is NOT called by `proposal/actions/create.ts`

**Contradicting Evidence:** None

**Verification Steps:**
1. Search `proposal/actions/create.ts` for `findExistingThread` or `findOrCreateProposalThread` - will find no matches
2. Compare thread creation code in `create.ts` vs `createProposalThread.ts`

**Potential Fix:** Replace direct thread creation in `proposal/actions/create.ts` with a call to `findOrCreateProposalThread`

**Convention Check:** This violates the DRY principle - thread creation logic exists in `messagingHelpers.ts` but is not being reused.

### Hypothesis 2: Incorrect thread lookup parameters (Likelihood: 5%)

**Theory:** The `findExistingThread` function might not be finding threads due to incorrect column name quoting or parameter ordering.

**Supporting Evidence:**
- The `findExistingThread` function queries `"-Host User"` and `"-Guest User"` columns with specific quoting
- The thread creation in `send_message` assigns `hostUserId: recipientId, guestUserId: senderBubbleId`
- The thread creation in `proposal/create.ts` uses `"-Guest User": input.guestId, "-Host User": hostUserData._id`

**Contradicting Evidence:**
- `send_message` calls `findExistingThread` twice with swapped host/guest parameters (lines 173-186)
- Even if parameters were swapped, the second call would find the thread

**Verification Steps:**
1. Query the database for the two threads and compare their `-Host User` and `-Guest User` values
2. Verify they have the same listing ID

**Potential Fix:** If parameters are indeed swapped, fix the parameter order in thread lookups

**Convention Check:** N/A - this hypothesis is likely incorrect

## 6. Recommended Action Plan

### Priority 1 (Most Likely Fix - 95% confidence)

**Replace direct thread creation in `proposal/actions/create.ts` with `findOrCreateProposalThread`**

**Implementation Details:**

1. **Import the helper function:**
```typescript
// Add to imports at top of proposal/actions/create.ts
import { findOrCreateProposalThread } from "../../_shared/messagingHelpers.ts";
```

2. **Replace lines 560-592 with:**
```typescript
// ================================================
// CREATE OR FIND THREAD FOR PROPOSAL
// ================================================

let threadId: string | null = null;
let threadCreated = false;

try {
  // Fetch listing name for thread subject
  const listingName = await getListingName(supabase, input.listingId);
  const resolvedListingName = listingName || "this listing";

  const { threadId: resolvedThreadId, isNew } = await findOrCreateProposalThread(supabase, {
    proposalId: proposalId,
    hostUserId: hostUserData._id,
    guestUserId: input.guestId,
    listingId: input.listingId,
    listingName: resolvedListingName,
  });

  threadId = resolvedThreadId;
  threadCreated = isNew;

  console.log(`[proposal:create] Thread ${isNew ? 'created' : 'found'}: ${threadId}`);
} catch (threadError) {
  console.error(`[proposal:create] Thread creation/lookup failed:`, threadError);
  // Non-blocking - proposal already created
}
```

3. **Ensure `getListingName` is imported:**
```typescript
import {
  createSplitBotMessage,
  updateThreadLastMessage,
  getUserProfile,
  getListingName,
  findOrCreateProposalThread,  // ADD THIS
} from "../../_shared/messagingHelpers.ts";
```

4. **The rest of the code (SplitBot messages, AI summary) should work unchanged** since it already checks `if (threadCreated && threadId)` or `if (threadId)`.

**Files to Modify:**
- `supabase/functions/proposal/actions/create.ts` (lines 560-592)

### Priority 2 (If Priority 1 Fails)

**Verify the `findOrCreateProposalThread` function is working correctly**

1. Add logging to `findOrCreateProposalThread` in `messagingHelpers.ts`:
```typescript
console.log('[messagingHelpers] findOrCreateProposalThread called with:', JSON.stringify(params));
```

2. Test the function directly by calling the `create_proposal_thread` action on the messages Edge Function

### Priority 3 (Deeper Investigation)

**If threads are still being duplicated:**

1. Check database for unique constraint on thread table:
```sql
-- Add unique constraint if missing
ALTER TABLE thread ADD CONSTRAINT unique_thread_listing_guest
UNIQUE ("Listing", "-Guest User", "-Host User");
```

2. Check if there's a race condition between Contact Host and Create Proposal flows

## 7. Prevention Recommendations

1. **Add Unique Constraint:** Consider adding a database-level unique constraint on `(Listing, "-Guest User", "-Host User")` to prevent duplicate threads at the database level

2. **Centralize Thread Creation:** All thread creation should go through `findOrCreateProposalThread` or a similar centralized function - never create threads directly

3. **Add Logging:** Add comprehensive logging for thread creation to track down any future issues

4. **Consider Database Trigger:** A PostgreSQL trigger could automatically check for existing threads before INSERT and raise an error or redirect to the existing thread

5. **Reference the Pattern:** Document this pattern in `messagingHelpers.ts` with a comment:
```typescript
/**
 * IMPORTANT: Always use findOrCreateProposalThread for thread creation!
 * Never create threads directly - this prevents duplicate thread issues.
 */
```

## 8. Related Files Reference

| File | Line Numbers | Action Needed |
|------|-------------|---------------|
| `supabase/functions/proposal/actions/create.ts` | 560-592 | **MODIFY** - Replace direct thread creation with `findOrCreateProposalThread` |
| `supabase/functions/_shared/messagingHelpers.ts` | 409-453 | Reference - `findOrCreateProposalThread` implementation |
| `supabase/functions/_shared/messagingHelpers.ts` | 147-171 | Reference - `findExistingThread` implementation |
| `supabase/functions/messages/handlers/sendMessage.ts` | 173-201 | Reference - Correct thread lookup pattern |
| `supabase/functions/messages/handlers/createProposalThread.ts` | 145-152 | Reference - Correct usage of `findOrCreateProposalThread` |

---

**Analysis completed by:** Claude Opus 4.5 (debug-analyst)
**Ready for:** Implementation by plan-executor
