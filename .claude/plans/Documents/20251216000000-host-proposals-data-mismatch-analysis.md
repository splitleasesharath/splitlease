# Host Proposals Page - Data Mismatch Analysis

**Investigation Date**: 2025-12-16
**User**: wayneyrooney@test.com
**Issue**: Host Proposals page showing no proposals despite data existing in database

---

## Executive Summary

**ROOT CAUSE IDENTIFIED**: The proposal's "Host - Account" field contains the **user._id** instead of the **host account ID**. The page logic is correctly looking up proposals by host account ID, but the data was incorrectly stored with the user ID.

---

## Data Investigation Results

### 1. User Record Analysis

**Query**:
```sql
SELECT _id, email, "Type - User Current", "Account - Host / Landlord", "Listings", "Proposals List"
FROM public.user
WHERE email = 'wayneyrooney@test.com'
```

**Result**:
```json
{
  "_id": "1765907762738x23464328844204752",
  "email": "wayneyrooney@test.com",
  "Type - User Current": "A Host (I have a space available to rent)",
  "Account - Host / Landlord": "1765907762847x99257916729631536",  ← CORRECT HOST ACCOUNT ID
  "Listings": [
    "1765907800316x18862107892191048",
    "1765907900140x03032140472078071"
  ],
  "Proposals List": ["1765907801814x82070097473075616"]
}
```

**Key Finding**: User has a valid host account ID: `1765907762847x99257916729631536`

---

### 2. Listing Records Analysis

**Query**:
```sql
SELECT _id, "Name", "Host / Landlord", "Created By", "rental type"
FROM public.listing
WHERE "Created By" = '1765907762738x23464328844204752' OR "Host / Landlord" = '1765907762738x23464328844204752'
```

**Results**:
```json
[
  {
    "_id": "1765907800316x18862107892191048",
    "Name": "1 Bedroom Entire Place in Staten Island",
    "Host / Landlord": "1765907762847x99257916729631536",  ← CORRECT HOST ACCOUNT ID
    "Created By": "1765907762738x23464328844204752",
    "rental type": "Nightly"
  },
  {
    "_id": "1765907900140x03032140472078071",
    "Name": "1 Bedroom Entire Place in Manhattan",
    "Host / Landlord": "1765907762847x99257916729631536",  ← CORRECT HOST ACCOUNT ID
    "Created By": "1765907762738x23464328844204752",
    "rental type": "Nightly"
  }
]
```

**Key Finding**: Listings correctly reference the host account ID in "Host / Landlord" field

---

### 3. Proposal Records Analysis

**Query**:
```sql
SELECT _id, "Status", "Listing", "Guest", "Host - Account", "Created Date"
FROM public.proposal
WHERE "Listing" IN ('1765907800316x18862107892191048', '1765907900140x03032140472078071')
```

**Result**:
```json
{
  "_id": "1765907801814x82070097473075616",
  "Status": "Host Review",
  "Listing": "1765907800316x18862107892191048",
  "Guest": "1697550315775x613621430341750000",
  "Host - Account": "1765907762738x23464328844204752",  ← ❌ WRONG! This is the USER ID
  "Created Date": "2025-12-16 17:56:41.821+00"
}
```

**Key Finding**: The proposal's "Host - Account" field contains the user._id (`1765907762738x23464328844204752`) instead of the host account ID (`1765907762847x99257916729631536`)

---

## The Mismatch Explained

### What Should Happen

1. User creates listing with "Host / Landlord" = their host account ID
2. Guest submits proposal for that listing
3. Proposal "Host - Account" field should be populated with the listing's "Host / Landlord" value
4. Host Proposals page queries proposals where "Host - Account" matches user's host account ID

### What Actually Happened

1. ✅ User created listing with correct host account ID (`1765907762847x99257916729631536`)
2. ❌ Proposal was created with "Host - Account" = user._id (`1765907762738x23464328844204752`)
3. ❌ Host Proposals page looks for host account ID but proposal has user ID
4. ❌ No match found, page shows empty state

---

## ID Comparison Table

| Field | Expected Value | Actual Value | Status |
|-------|---------------|--------------|--------|
| user._id | `1765907762738x23464328844204752` | `1765907762738x23464328844204752` | ✅ Correct |
| user["Account - Host / Landlord"] | `1765907762847x99257916729631536` | `1765907762847x99257916729631536` | ✅ Correct |
| listing["Host / Landlord"] | `1765907762847x99257916729631536` | `1765907762847x99257916729631536` | ✅ Correct |
| proposal["Host - Account"] | `1765907762847x99257916729631536` | `1765907762738x23464328844204752` | ❌ **WRONG** |

---

## Frontend Logic Analysis

The Host Proposals page logic in `useHostProposalsPageLogic.js` is **CORRECT**:

```javascript
const userHostAccountId = validatedUser?.hostAccount?._id;
// Expects: 1765907762847x99257916729631536

// Fetches proposals where "Host - Account" matches userHostAccountId
const { data: proposalsData, error: proposalsError } = await supabase
  .from('proposal')
  .select('*, ...')
  .eq('Host - Account', userHostAccountId);
```

The page correctly:
1. Gets the user's host account ID from `validatedUser.hostAccount._id`
2. Queries proposals where "Host - Account" equals that host account ID

**The page logic is NOT the problem.**

---

## Root Cause

The issue is in the **proposal creation process**. When a proposal is created, the "Host - Account" field is being populated with the wrong value.

### Likely Source

Looking at the Edge Function that creates proposals (`supabase/functions/proposal/index.ts`), there may be logic that incorrectly sets:

```javascript
// WRONG (current behavior)
"Host - Account": listing["Created By"]  // This gives user._id

// CORRECT (should be)
"Host - Account": listing["Host / Landlord"]  // This gives host account ID
```

---

## Next Steps

### Option 1: Fix the Data (Temporary)
Update the existing proposal to have the correct host account ID:

```sql
UPDATE public.proposal
SET "Host - Account" = '1765907762847x99257916729631536'
WHERE _id = '1765907801814x82070097473075616';
```

### Option 2: Fix the Root Cause (Permanent)
Investigate and fix the proposal creation logic in:
- `supabase/functions/proposal/index.ts` (Edge Function)
- Any Bubble workflows that create proposals

Ensure the "Host - Account" field is set to `listing["Host / Landlord"]`, not `listing["Created By"]`.

### Option 3: Fix Both
1. Update existing proposal data (Option 1)
2. Fix the creation logic (Option 2)
3. Test with a new proposal to verify the fix

---

## Affected Files

### Frontend
- `app/src/logic/hooks/useHostProposalsPageLogic.js` - ✅ Logic is CORRECT
- `app/src/pages/host-proposals.jsx` - Uses the hook (no changes needed)

### Backend (Likely culprit)
- `supabase/functions/proposal/index.ts` - Proposal creation Edge Function
- Any Bubble workflows creating proposals

### Database
- `public.proposal` table - Contains incorrect data

---

## Verification Queries

After implementing fixes, verify with:

```sql
-- Check if proposal now has correct host account ID
SELECT
  p._id,
  p."Host - Account" as proposal_host_account,
  l."Host / Landlord" as listing_host_account,
  u."Account - Host / Landlord" as user_host_account,
  CASE
    WHEN p."Host - Account" = l."Host / Landlord" THEN '✅ CORRECT'
    ELSE '❌ MISMATCH'
  END as status
FROM public.proposal p
JOIN public.listing l ON p."Listing" = l._id
JOIN public.user u ON l."Created By" = u._id
WHERE p._id = '1765907801814x82070097473075616';
```

---

## Conclusion

The Host Proposals page frontend logic is working correctly. The issue is a data integrity problem where proposals are being created with the user ID instead of the host account ID in the "Host - Account" field. This needs to be fixed at the source (proposal creation logic) and existing data may need correction.
