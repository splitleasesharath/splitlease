# proposal Edge Function

**ENDPOINT**: `POST /functions/v1/proposal`
**AUTH_REQUIRED**: Mixed (see actions below)
**SOURCE**: `supabase/functions/proposal/`

---

## Purpose

Main router for proposal CRUD operations. Handles proposal creation, updates, retrieval, and suggestions with Bubble sync via queue.

---

## Actions

| Action | Handler | Auth | Description |
|--------|---------|------|-------------|
| `create` | `actions/create.ts` | No* | Create new proposal |
| `update` | `actions/update.ts` | **Yes** | Update existing proposal |
| `get` | `actions/get.ts` | No | Get proposal details |
| `suggest` | `actions/suggest.ts` | **Yes** | Find/create suggestion proposals |

*`create` is temporarily public during Supabase auth migration. Handler validates `guestId` from payload instead.

---

## Action Details

### create

Create a new proposal with calculated prices and status.

**Request:**
```json
{
  "action": "create",
  "payload": {
    "listing_id": "listing-uuid",
    "guest_id": "guest-account-id",
    "guest_email": "guest@example.com",
    "guest_name": "John Doe",
    "days_selected": [1, 2, 3, 4, 5],
    "move_in_date": "2025-02-01",
    "weekly_frequency": "every_week",
    "message": "I'm interested in your listing"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "proposal-uuid",
    "listing_id": "...",
    "guest_id": "...",
    "status": "pending",
    "nightly_rate": 150,
    "four_week_rent": 2100,
    "service_fee": 210,
    "total": 2310,
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

**Sync**: Enqueues Bubble sync via `enqueueBubbleSync()`.

---

### update

Update existing proposal. Validates user ownership.

**Request:**
```json
{
  "action": "update",
  "payload": {
    "proposal_id": "proposal-uuid",
    "days_selected": [1, 2, 3, 4],
    "move_in_date": "2025-02-15"
  }
}
```

**Sync**: Enqueues Bubble sync via `enqueueBubbleSync()`.

---

### get

Get proposal details with all related data.

**Request:**
```json
{
  "action": "get",
  "payload": {
    "proposal_id": "proposal-uuid"
  }
}
```

**Response:** Full proposal object with listing and guest data.

---

### suggest

Find and create suggestion proposals based on:
- `weekly_match` - Same days, different listings
- `same_address` - Same building/address

**Request:**
```json
{
  "action": "suggest",
  "payload": {
    "listing_id": "listing-uuid",
    "days_selected": [1, 2, 3, 4, 5],
    "suggestion_type": "weekly_match"
  }
}
```

---

## File Structure

```
proposal/
├── index.ts                    # Main router
├── actions/
│   ├── create.ts              # handleCreate()
│   ├── update.ts              # handleUpdate()
│   ├── get.ts                 # handleGet()
│   └── suggest.ts             # handleSuggest()
├── lib/
│   ├── calculations.ts        # Price calculations
│   ├── dayConversion.ts       # JS ↔ Bubble day indexing
│   ├── validators.ts          # Data validation
│   ├── types.ts               # TypeScript types
│   ├── status.ts              # Status management
│   └── bubbleSyncQueue.ts     # Queue sync helpers
└── deno.json                  # Import map
```

---

## Price Calculations

`lib/calculations.ts` exports:
- `calculateProposalPrices()` - Full pricing breakdown
- `calculateNightlyRate()` - Rate based on nights selected
- `calculateServiceFee()` - Platform service fee
- `calculateTotalPrice()` - Sum of rent + fees

### Pricing Logic

```typescript
// 1. Get nightly rate based on nights selected
const nightlyRate = getNightlyRateByNights(listing, nightsPerWeek);

// 2. Calculate 4-week rent
const fourWeekRent = nightlyRate * nightsPerWeek * 4;

// 3. Calculate service fee (typically 10%)
const serviceFee = fourWeekRent * 0.10;

// 4. Total
const total = fourWeekRent + serviceFee;
```

---

## Day Indexing Conversion

**CRITICAL**: Always convert at API boundaries!

`lib/dayConversion.ts` exports:
- `adaptDaysFromBubble({ bubbleDays })` - Bubble (1-7) → JS (0-6)
- `adaptDaysToBubble({ jsDays })` - JS (0-6) → Bubble (1-7)

```typescript
// Receiving from Bubble
const jsDays = adaptDaysFromBubble({ bubbleDays: [2, 3, 4, 5, 6] });
// Result: [1, 2, 3, 4, 5] (Mon-Fri in JS)

// Sending to Bubble
const bubbleDays = adaptDaysToBubble({ jsDays: [1, 2, 3, 4, 5] });
// Result: [2, 3, 4, 5, 6] (Mon-Fri in Bubble)
```

---

## Status Management

`lib/status.ts` exports:
- `getProposalStatus()` - Get current status
- `canTransitionTo()` - Check valid transitions
- `updateProposalStatus()` - Update status with validation

**Valid Statuses:**
- `pending` - Awaiting host response
- `accepted` - Host accepted
- `rejected` - Host rejected
- `expired` - Proposal expired
- `cancelled` - Guest cancelled

---

## Queue-Based Sync

Uses `_shared/queueSync.ts` for async Bubble sync:

```typescript
await enqueueBubbleSync(supabase, {
  correlationId: `proposal:${proposalId}`,
  items: [{
    sequence: 1,
    table: 'proposal',
    recordId: proposalId,
    operation: 'INSERT',
    payload: proposalData,
  }],
});

// Optionally trigger immediate processing
await triggerQueueProcessing();
```

---

## Dependencies

- `_shared/queueSync.ts` - Queue-based sync
- `_shared/cors.ts`
- `_shared/errors.ts`
- `_shared/validation.ts`
- `_shared/slack.ts`

---

## Error Handling

- Missing authentication (update/suggest): 401 (AuthenticationError)
- Missing required fields: 400 (ValidationError)
- Invalid proposal ID: 404
- Invalid status transition: 400

---

**LAST_UPDATED**: 2025-12-11
