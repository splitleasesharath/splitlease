# Proposal Submission Flow Analysis & Fix Plan

**Date**: 2025-12-10
**Issue**: Proposal submitted successfully but guest-proposals page shows no proposals, missing toast/success modal
**Listing ID**: 1586447992720x748691103167545300
**User**: splitleasefrederick+guest8@gmail.com

---

## Executive Summary

The proposal **WAS created successfully** in the database. The core issue is an **RLS policy bug** on the `proposal` table that prevents authenticated users from reading their own proposals.

---

## Investigation Findings

### 1. Proposal Creation: SUCCESS

The proposal was created correctly:
```sql
_id: 1765385661325x76496710701206736
Created Date: 2025-12-10 16:54:21
Guest: 1765384690310x93115947539843888
Listing: 1586447992720x748691103167545300
Status: "Proposal Submitted by guest - Awaiting Rental Application"
```

### 2. User's Proposals List: SUCCESS

The user's `Proposals List` field was correctly updated:
```json
"Proposals List": ["1765385661325x76496710701206736"]
```

### 3. Toast Notification: WORKS (but brief)

The toast IS rendered in `ViewSplitLeasePage.jsx:1236-1251`:
```jsx
{toast.show && (
  <div className={`toast toast-${toast.type} show`}>
    <span className="toast-message">{toast.message}</span>
  </div>
)}
```

The toast shows for 1.5 seconds before redirect. User may have missed it.

### 4. Success Modal: MISSING FEATURE

The current code only shows a toast, not a success modal with CTAs. This is a **feature gap**, not a bug.

---

## ROOT CAUSE: RLS Policy Bug (CRITICAL)

### Current RLS Policies on `proposal` table:

| Role | Command | Policy |
|------|---------|--------|
| `anon` | SELECT | `true` (can read all) |
| `authenticated` | SELECT | `((auth.uid())::text = "Guest")` |

### The Problem:

The authenticated SELECT policy compares:
- `auth.uid()` = Supabase Auth UUID (e.g., `5e0019ef-9e11-4ca2-9e2f-78e88f8d11a6`)
- `"Guest"` column = Bubble User ID (e.g., `1765384690310x93115947539843888`)

**These will NEVER match** because they are completely different ID systems.

### Evidence from logs:
```
userProposalQueries.js:49 fetchUserWithProposalList: User fetched: augusto
userProposalQueries.js:84 extractProposalIds: Extracted 1 proposal IDs from user's Proposals List
...
userProposalQueries.js:161 fetchProposalsByIds: No valid proposals found
```

The user table query works (returns user with 1 proposal ID), but the proposal table query returns 0 results due to RLS blocking.

---

## Data Flow Analysis

### Current Flow (with issues marked):

```
┌─────────────────────────────────────────────────────────────────┐
│ ViewSplitLeasePage                                              │
├─────────────────────────────────────────────────────────────────┤
│ 1. User clicks "Submit Proposal"                                │
│ 2. handleProposalSubmit() checks auth                           │
│ 3. submitProposal() calls Edge Function                         │
│ 4. Edge Function creates proposal in Supabase                   │
│ 5. Edge Function updates user's Proposals List                  │
│ 6. showToast("Proposal submitted successfully!")   ◀── WORKS    │
│ 7. setTimeout 1.5s → redirect to /guest-proposals  ◀── TOO FAST │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ GuestProposalsPage                                              │
├─────────────────────────────────────────────────────────────────┤
│ 1. useGuestProposalsPageLogic checks auth                       │
│ 2. fetchUserProposalsFromUrl() called                           │
│ 3. getUserIdFromSession() → Bubble User ID                      │
│ 4. fetchUserWithProposalList() → SUCCESS (user fetched)         │
│ 5. extractProposalIds() → ["1765385661325x76496710701206736"]   │
│ 6. fetchProposalsByIds() → FAILS (RLS blocks) ◀── BUG          │
│ 7. Returns "No valid proposals found"                           │
│ 8. EmptyState rendered                                          │
└─────────────────────────────────────────────────────────────────┘
```

### How User IDs Work:

| Context | ID Type | Example |
|---------|---------|---------|
| Supabase Auth | UUID | `5e0019ef-9e11-4ca2-9e2f-78e88f8d11a6` |
| Bubble/Legacy | String | `1765384690310x93115947539843888` |
| `user._id` | Bubble ID | `1765384690310x93115947539843888` |
| `proposal.Guest` | Bubble ID | `1765384690310x93115947539843888` |
| `auth.uid()` | Supabase UUID | `5e0019ef-9e11-4ca2-9e2f-78e88f8d11a6` |

The RLS policy tries to compare `auth.uid()` (UUID) with `Guest` column (Bubble ID) - **they will never match**.

---

## Fix Plan

### Fix 1: RLS Policy (CRITICAL - Do First)

**Option A**: Allow anon role for reads (simplest, already works)
- Change frontend to use anon key for proposal reads
- Keep authenticated for writes

**Option B**: Fix the RLS policy to use a user mapping table
```sql
-- Create mapping between Supabase Auth UUID and Bubble User ID
-- Then update RLS to:
CREATE POLICY "Users can view own proposals" ON proposal
  FOR SELECT TO authenticated
  USING (
    "Guest" IN (
      SELECT bubble_id FROM user_auth_mapping
      WHERE supabase_uid = auth.uid()
    )
  );
```

**Option C**: Store Supabase UUID in user table and reference it
```sql
-- Add supabase_auth_id column to user table
-- Update RLS to join through user table
```

**Recommended**: Option A for quick fix, Option C for long-term.

### Fix 2: Success Modal with CTAs

Add a success modal after proposal submission with options:
- "Go to Guest Dashboard" → `/guest-proposals?proposal={id}`
- "Submit Rental Application" → `/rental-app-new-design?proposal={id}`
- "Continue Browsing" → Stay on listing or go to `/search`

**File to modify**: `ViewSplitLeasePage.jsx`

### Fix 3: Improve Toast Timing

Increase toast visibility:
- Extend delay before redirect from 1.5s to 3s, OR
- Replace toast with success modal (Fix 2)

---

## Key Files

| File | Purpose |
|------|---------|
| `app/src/islands/pages/ViewSplitLeasePage.jsx:1014-1116` | submitProposal function |
| `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | Guest proposals page logic |
| `app/src/lib/proposals/userProposalQueries.js` | Proposal fetch queries |
| `supabase/functions/proposal/` | Edge Function for create |

---

## Verification Steps After Fix

1. Submit a new proposal as guest user
2. Verify toast/modal appears
3. Verify redirect to guest-proposals with proposal in URL
4. Verify proposal card displays correctly
5. Check console for any RLS errors

---

## Additional Notes

- The proposal Edge Function creates proposals correctly (uses service role, bypasses RLS)
- The user table queries work (different RLS or none)
- Only the proposal table SELECT for authenticated users is broken
- Two `useGuestProposalsPageLogic.js` files exist - the one in `proposals/` subdirectory is the active one
