# listing Edge Function

**ENDPOINT**: `POST /functions/v1/listing`
**AUTH_REQUIRED**: Mixed (see actions below)
**SOURCE**: `supabase/functions/listing/`

---

## Purpose

Main router for listing CRUD operations. Handles listing creation, retrieval, and full submission with Bubble sync.

---

## Actions

| Action | Handler | Auth | Description |
|--------|---------|------|-------------|
| `create` | `handlers/create.ts` | No | Create new listing (minimal data) |
| `get` | `handlers/get.ts` | No | Get listing details |
| `submit` | `handlers/submit.ts` | **Yes** | Full listing submission |

---

## Action Details

### create

Create a new listing with minimal data. Used for initial listing creation in self-listing wizard.

**Request:**
```json
{
  "action": "create",
  "payload": {
    "user_email": "host@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "listing-uuid",
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

**Bubble Workflow**: `listing_creation_in_code`
**Sync**: Atomic sync to `listing` table

---

### get

Get listing details from Bubble Data API.

**Request:**
```json
{
  "action": "get",
  "payload": {
    "listing_id": "listing-uuid"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "listing-uuid",
    "Name": "Cozy Studio in Manhattan",
    "Description": "...",
    "Features - Qty Bedrooms": 1,
    "Features - Qty Bathrooms": 1,
    "Location - Hood": "neighborhood-uuid",
    "Location - Borough": "borough-uuid",
    "💰Nightly Host Rate for 5 nights": 150,
    "Days Available (List of Days)": [2, 3, 4, 5, 6],
    "Active": true
  }
}
```

---

### submit

Full listing submission with all form data from self-listing wizard. Requires authentication.

**Request:**
```json
{
  "action": "submit",
  "payload": {
    "listing_id": "listing-uuid",
    "user_email": "host@example.com",
    "name": "Cozy Studio in Manhattan",
    "description": "Beautiful studio apartment...",
    "bedrooms": 1,
    "bathrooms": 1,
    "neighborhood_id": "neighborhood-uuid",
    "amenities": ["wifi", "kitchen", "washer"],
    "days_available": [1, 2, 3, 4, 5],
    "nightly_rate_5": 150,
    "photos": ["photo-id-1", "photo-id-2"],
    "house_rules": ["no-smoking", "no-pets"]
  }
}
```

**Bubble Workflow**: `submit_listing_full`
**Sync**: Atomic sync to `listing` table
**Validation**: Verifies user ownership via email

---

## File Structure

```
listing/
├── index.ts                    # Main router
├── handlers/
│   ├── create.ts              # handleCreate()
│   ├── get.ts                 # handleGet()
│   └── submit.ts              # handleSubmit()
└── deno.json                  # Import map
```

---

## Handler Details

### handleCreate

Uses `BubbleSyncService.createAndSync()` for atomic operation:

```typescript
const syncService = new BubbleSyncService(...);
const result = await syncService.createAndSync(
  'listing_creation_in_code',
  { user_email: payload.user_email },
  'zat_listings',
  'listing'
);
```

### handleGet

Direct fetch from Bubble Data API:

```typescript
const response = await fetch(
  `${bubbleBaseUrl}/obj/zat_listings/${listingId}`,
  { headers: { Authorization: `Bearer ${bubbleApiKey}` } }
);
```

### handleSubmit

Full submission with validation:

1. Validate user email matches listing owner
2. Trigger `submit_listing_full` workflow
3. Fetch updated data from Bubble
4. Sync to Supabase

---

## Dependencies

- `BubbleSyncService` (`_shared/bubbleSync.ts`)
- `_shared/cors.ts`
- `_shared/errors.ts`
- `_shared/validation.ts`
- `_shared/slack.ts`

---

## Error Handling

- Missing authentication (submit): 401 (AuthenticationError)
- Missing required fields: 400 (ValidationError)
- Invalid listing ID: 404
- User doesn't own listing: 403

---

**LAST_UPDATED**: 2025-12-11
