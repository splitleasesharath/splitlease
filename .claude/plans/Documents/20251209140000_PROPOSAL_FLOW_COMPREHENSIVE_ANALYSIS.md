# Proposal Creation Flow - Comprehensive Analysis

**Date**: 2025-12-09
**Status**: COMPLETE (field name fix implemented)

---

## Executive Summary

The proposal creation flow involves 4 key components:
1. **CreateProposalFlowV2.jsx** - Multi-step popup wizard
2. **ViewSplitLeasePage.jsx** - Parent page that invokes Edge Function
3. **proposal Edge Function** - Creates proposal in Supabase
4. **bubble_sync Edge Function** - Syncs to Bubble via queue

**Fix Applied**: Changed `checkInDay` → `checkIn`, `checkOutDay` → `checkOut` in ViewSplitLeasePage.jsx:1061-1062 (commit `b4f7e3f`)

---

## Component Flow Diagram

```
User clicks "Submit Proposal"
           │
           ▼
┌──────────────────────────────────┐
│  CreateProposalFlowV2.jsx        │
│  (Multi-step popup wizard)       │
│  - Section 1: Review             │
│  - Section 2: User Details       │
│  - Section 3: Move-in Date       │
│  - Section 4: Days Selection     │
│                                  │
│  onSubmit(proposalData)          │
└──────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  ViewSplitLeasePage.jsx          │
│  handleProposalSubmit()          │
│                                  │
│  Builds edgeFunctionPayload:     │
│  - guestId, listingId            │
│  - moveInStartRange/EndRange     │
│  - daysSelected, nightsSelected  │
│  - checkIn, checkOut ✓ (FIXED)   │
│  - proposalPrice, fourWeekRent   │
│  - needForSpace, aboutMe, etc.   │
└──────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  supabase.functions.invoke(      │
│    'proposal',                   │
│    { action: 'create', payload } │
│  )                               │
└──────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│  proposal Edge Function                          │
│  supabase/functions/proposal/index.ts            │
│                                                  │
│  1. Validates input (validators.ts)              │
│  2. Fetches related data:                        │
│     - Listing, Guest, Host Account, Host User    │
│     - Rental Application (if exists)             │
│  3. Calculates:                                  │
│     - Order ranking, compensation                │
│     - Move-out date, initial status              │
│  4. Generates Bubble-compatible ID               │
│  5. INSERTs into Supabase `proposal` table       │
│  6. UPDATEs guest and host `user` records        │
│  7. Enqueues to sync_queue (via bubbleSyncQueue) │
│  8. Returns proposalId, status, etc.             │
└──────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│  sync_queue table                                │
│  (3 items enqueued)                              │
│                                                  │
│  1. INSERT proposal into Bubble (seq: 1)         │
│  2. UPDATE guest user in Bubble (seq: 2)         │
│  3. UPDATE host user in Bubble (seq: 3)          │
└──────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│  bubble_sync Edge Function                       │
│  supabase/functions/bubble_sync/index.ts         │
│                                                  │
│  Actions:                                        │
│  - process_queue_data_api (recommended)          │
│  - process_queue (Workflow API)                  │
│  - sync_single, retry_failed, get_status         │
│                                                  │
│  Features:                                       │
│  - Day conversion (JS 0-6 → Bubble 1-7)          │
│  - Exponential backoff retry                     │
│  - Field mapping and transformation              │
│  - Table name translation                        │
└──────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│  Bubble.io Data API                              │
│  https://app.split.lease/api/1.1/obj/{table}     │
│                                                  │
│  POST /obj/proposal - Create proposal            │
│  PATCH /obj/user/{id} - Update users             │
└──────────────────────────────────────────────────┘
```

---

## Key Files Reference

### Frontend

| File | Purpose |
|------|---------|
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | Multi-step popup wizard |
| `app/src/islands/shared/CreateProposalFlowV2Components/ReviewSection.jsx` | Review step |
| `app/src/islands/shared/CreateProposalFlowV2Components/UserDetailsSection.jsx` | User info step |
| `app/src/islands/shared/CreateProposalFlowV2Components/MoveInSection.jsx` | Move-in date step |
| `app/src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx` | Days selection step |
| `app/src/islands/pages/ViewSplitLeasePage.jsx:1052-1084` | Edge Function payload & invocation |

### proposal Edge Function

| File | Purpose |
|------|---------|
| `supabase/functions/proposal/index.ts` | Main router |
| `supabase/functions/proposal/actions/create.ts` | Create handler (487 lines) |
| `supabase/functions/proposal/lib/types.ts` | Type definitions (CreateProposalInput) |
| `supabase/functions/proposal/lib/validators.ts` | Input validation |
| `supabase/functions/proposal/lib/calculations.ts` | Pricing/compensation calculations |
| `supabase/functions/proposal/lib/status.ts` | Status determination |
| `supabase/functions/proposal/lib/bubbleSyncQueue.ts` | Queue helper for Bubble sync |

### bubble_sync Edge Function

| File | Purpose |
|------|---------|
| `supabase/functions/bubble_sync/index.ts` | Main router |
| `supabase/functions/bubble_sync/handlers/processQueueDataApi.ts` | Data API batch processing |
| `supabase/functions/bubble_sync/handlers/processQueue.ts` | Workflow API batch processing |
| `supabase/functions/bubble_sync/handlers/syncSingle.ts` | Manual single record sync |
| `supabase/functions/bubble_sync/handlers/retryFailed.ts` | Retry failed items |
| `supabase/functions/bubble_sync/handlers/getStatus.ts` | Queue statistics |
| `supabase/functions/bubble_sync/lib/bubbleDataApi.ts` | Data API client |
| `supabase/functions/bubble_sync/lib/transformer.ts` | Field type conversion |
| `supabase/functions/bubble_sync/lib/fieldMapping.ts` | Field transformations |
| `supabase/functions/bubble_sync/lib/tableMapping.ts` | Table name translation |

---

## API Contract

### CreateProposalInput (types.ts:19-63)

```typescript
interface CreateProposalInput {
  // Required Identifiers
  listingId: string;
  guestId: string;

  // Required Pricing
  estimatedBookingTotal: number;

  // Dates & Duration
  moveInStartRange: string;    // ISO date
  moveInEndRange: string;      // ISO date
  reservationSpanWeeks: number;
  reservationSpan: string;     // → os_stay_periods.name

  // Day/Night Selection (Bubble indexing: 1-7, Sun=1)
  daysSelected: number[];
  nightsSelected: number[];
  checkIn: number;             // ✓ Fixed field name
  checkOut: number;            // ✓ Fixed field name

  // Pricing Details
  proposalPrice: number;
  fourWeekRent?: number;
  fourWeekCompensation?: number;
  hostCompensation?: number;

  // Guest Information (optional)
  comment?: string;
  needForSpace?: string;
  aboutMe?: string;
  specialNeeds?: string;

  // Optional Overrides
  status?: string;
  moveInRangeText?: string;
  flexibleMoveIn?: boolean;
  // ... more optional fields
}
```

---

## Day Indexing Convention

| System | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|--------|-----|-----|-----|-----|-----|-----|-----|
| JavaScript (Internal) | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| Bubble API | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

**Conversion happens at**:
- Frontend → Edge Function: Frontend converts to Bubble format before sending
- bubble_sync: `transformer.ts` handles any necessary conversions

---

## Fix Applied

**File**: `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Lines**: 1061-1062
**Commit**: `b4f7e3f`

**Before**:
```javascript
checkInDay: checkInDayBubble,
checkOutDay: checkOutDayBubble,
```

**After**:
```javascript
checkIn: checkInDayBubble,
checkOut: checkOutDayBubble,
```

---

## Testing Checklist

- [ ] Submit proposal from view-split-lease page
- [ ] Verify no 400 errors in browser console
- [ ] Check Supabase Edge Function logs for success
- [ ] Verify proposal created in Supabase `proposal` table
- [ ] Check `sync_queue` for pending items
- [ ] Verify Bubble sync completes (items move to completed status)
- [ ] Confirm proposal appears in Bubble

---

## Related Plans

| Plan | Status | Description |
|------|--------|-------------|
| `20251209093545_PROPOSAL_EDGE_FUNCTION_DEPLOYMENT_MISMATCH_ANALYSIS.md` | **Done** | Field name fix |
| `PROPOSAL_EDGE_FUNCTION_IMPLEMENTATION_PLAN.md` | New | Full implementation plan |
| `PROPOSAL_CREATION_SUPABASE_NATIVE_MIGRATION.md` | New/Documents | Native migration plan |
| `PROPOSAL_TO_BUBBLE_SYNC_PLAN.md` | Done | Bubble sync implementation |
| `PROPOSAL_HOUSE_RULES_SELECTION_PLAN.md` | New | House rules feature |

