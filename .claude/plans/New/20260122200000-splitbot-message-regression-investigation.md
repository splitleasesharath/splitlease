# SplitBot Message Regression Investigation

**Date**: 2026-01-22
**Status**: ✅ FIXED
**Proposal ID**: 1769098335838x71627558843102768
**Thread ID**: 1769098336064x62069884046665024
**Supabase Project**: qzsmhgyojmwvtjmnrdea (splitlease-backend-dev)

---

## Executive Summary

**Root Cause**: The `messages` Edge Function is **never being called** from the frontend after proposal creation.

**ACTUAL ROOT CAUSE IDENTIFIED**: There are TWO versions of `ViewSplitLeasePage`:
1. `ViewSplitLeasePage.jsx` (UNUSED) - Contains the `messages` Edge Function call
2. `ViewSplitLeasePage/ViewSplitLeasePage.tsx` (ACTIVE) - Was MISSING the `messages` call

The entry point `view-split-lease.jsx` imports from the TypeScript version, which didn't have the SplitBot message creation code.

**Key Evidence**:
- Proposal exists in Supabase with correct data
- Thread exists in Supabase (created by `proposal` Edge Function)
- NO messages exist for the thread
- Edge Function logs show **NO calls to `messages` function** - only `auth-user`, `proposal`, and `send-email`
- The `messages` Edge Function IS deployed and active (version 34)
- **Older proposals (Jan 21) have messages, newer ones (Jan 22) do not** - this is a regression

---

## Investigation Findings

### 1. Data Does Not Exist in Supabase

| Query | Dev Database | Production Database |
|-------|--------------|---------------------|
| Proposal `1769098335838x...` | NOT FOUND | NOT FOUND |
| Thread `1769098336064x...` | NOT FOUND | NOT FOUND |
| Any `1769%` prefix proposals | NONE | NONE |
| Any `1769%` prefix threads | NONE | NONE |

**Newest data in dev database**: `1768915236579x...` (January 20, 2026)
**Proposal ID timestamp**: `1769098335838x...` (January 22, 2026 - TODAY)

### 2. Edge Function Logs Show No Activity

The Supabase Edge Function logs for the past 24 hours show:
- **Only `auth-user` function calls** (login/session validation)
- **NO calls to `proposal` Edge Function**
- **NO calls to `messages` Edge Function**

This is definitive proof that the proposal submission did NOT reach Supabase.

### 3. Frontend Code Analysis

The frontend (`ViewSplitLeasePage.jsx`) correctly calls Supabase Edge Functions:

```javascript
// Line 1173
const { data, error } = await supabase.functions.invoke('proposal', {
  body: {
    action: 'create',
    payload: edgeFunctionPayload
  }
});
```

And the thread creation (line 1259-1272):
```javascript
const threadResponse = await supabase.functions.invoke('messages', {
  body: {
    action: 'create_proposal_thread',
    payload: { ... }
  }
});
```

### 4. CTA Configuration is Correct

The CTA helpers correctly use the `reference_table` schema:
```typescript
// ctaHelpers.ts line 197
.schema('reference_table')
.from('os_messaging_cta')
```

The `STATUS_TO_CTA` mapping includes both guest and host CTAs for `'Host Review'`:
```typescript
'Host Review': {
  guest: 'view_proposal_guest',
  host: 'view_proposal_host',
},
```

### 5. HostProposalsPage Reads from Supabase

The HostProposalsPage (`useHostProposalsPageLogic.js`) queries Supabase directly:
```javascript
const { data: proposals, error } = await supabase
  .from('proposal')
  .select(...)
```

**This means if data appears in HostProposalsPage, it should be in Supabase.**

---

## Possible Root Causes

### Hypothesis 1: Environment Misconfiguration (MOST LIKELY)

The `.env` file may be pointing to a different Supabase project than the MCP servers we queried:
- MCP `supabase-dev` connects to one project
- The local dev environment's `VITE_SUPABASE_URL` connects to a different project

**To Verify**: Check `VITE_SUPABASE_URL` in `.env` and compare with MCP project URLs.

### Hypothesis 2: Bubble.io Still Processing Proposals

Some pages may still be embedding Bubble.io directly or fetching data from Bubble:
- The `BUBBLE_API_URL` constant is still defined: `https://app.split.lease`
- Some legacy code may still call Bubble directly

**Evidence Against**: The HostProposalsPage code clearly uses Supabase, not Bubble.

### Hypothesis 3: Edge Function Invocation Silently Failing

The `supabase.functions.invoke()` call may be failing before reaching the server:
- CORS issues
- Network errors
- Auth token issues

**To Verify**: Check browser console/network tab during proposal submission.

---

## Recommended Actions

### Immediate (To Diagnose)

1. **Check Browser Console**: When submitting a proposal, look for:
   - Network requests to `supabase.co/functions/v1/proposal`
   - Any CORS or network errors
   - The response from the Edge Function

2. **Verify Supabase URL**: Compare the `VITE_SUPABASE_URL` in `.env` with the project URL for the MCP server:
   ```
   MCP supabase-dev project URL: [need to verify]
   .env VITE_SUPABASE_URL: [need to check]
   ```

3. **Check if `supabase functions serve` is running**: If testing locally, Edge Functions need to be served locally.

### Fix (Once Root Cause Confirmed)

If the issue is environment mismatch:
- Ensure `.env` points to the correct Supabase project
- Verify Edge Functions are deployed to that project

If Edge Functions aren't being called:
- Debug the `supabase.functions.invoke()` flow
- Check for missing auth tokens or CORS issues

---

## Code Flow Reference

### Proposal Submission Flow (Expected)

```
1. ViewSplitLeasePage.jsx:handleSubmit()
   ↓
2. supabase.functions.invoke('proposal', { action: 'create', ... })
   ↓
3. proposal/index.ts → actions/create.ts
   ↓
4. INSERT INTO proposal table
   ↓
5. supabase.functions.invoke('messages', { action: 'create_proposal_thread', ... })
   ↓
6. messages/handlers/createProposalThread.ts
   ↓
7. findOrCreateProposalThread() → INSERT INTO thread
   ↓
8. getCTAForProposalStatus() → Lookup CTA from reference_table.os_messaging_cta
   ↓
9. createSplitBotMessage() for guest → INSERT INTO _message
   ↓
10. createSplitBotMessage() for host → INSERT INTO _message
```

### Where the Flow is Breaking

Based on logs: **Step 2 is not reaching the server**. The Edge Function is never invoked.

---

## Files Referenced

| File | Purpose |
|------|---------|
| [ViewSplitLeasePage.jsx](../../../app/src/islands/pages/ViewSplitLeasePage.jsx) | Frontend proposal submission |
| [useHostProposalsPageLogic.js](../../../app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js) | Host proposals data fetching |
| [proposal/actions/create.ts](../../../supabase/functions/proposal/actions/create.ts) | Proposal Edge Function |
| [messages/handlers/createProposalThread.ts](../../../supabase/functions/messages/handlers/createProposalThread.ts) | Thread/message creation handler |
| [ctaHelpers.ts](../../../supabase/functions/_shared/ctaHelpers.ts) | CTA lookup (correctly uses reference_table schema) |
| [messagingHelpers.ts](../../../supabase/functions/_shared/messagingHelpers.ts) | Core messaging utilities |
| [supabase.js](../../../app/src/lib/supabase.js) | Supabase client configuration |

---

## Conclusion

**This is NOT a regression in the message creation code.** The CTA configuration, status mapping, and message creation logic are all correct.

**The issue is that the proposal submission never reaches Supabase at all.** The data exists in Bubble.io but not in Supabase, indicating the frontend is either:
1. Connected to a different Supabase project than we're querying
2. Failing to invoke the Edge Function due to network/auth issues
3. Still routing some requests to Bubble.io

**Next Step**: Ask the user to check their browser's Network tab during proposal submission to see where the request is actually going.
