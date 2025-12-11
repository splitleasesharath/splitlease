# bubble-proxy Edge Function

**ENDPOINT**: `POST /functions/v1/bubble-proxy`
**AUTH_REQUIRED**: Mixed (see actions below)
**SOURCE**: `supabase/functions/bubble-proxy/`

---

## Purpose

Proxy for Bubble API operations with atomic sync. Routes client requests to appropriate Bubble workflow handlers while maintaining data consistency between Bubble and Supabase.

---

## Actions

| Action | Handler | Auth | Sync | Description |
|--------|---------|------|------|-------------|
| `send_message` | `handlers/messaging.ts` | No | No | Send message to host |
| `ai_inquiry` | `handlers/aiInquiry.ts` | No | Yes | AI market research inquiry |
| `upload_photos` | `handlers/photos.ts` | No | Yes | Upload listing photos |
| `submit_referral` | `handlers/referral.ts` | **Yes** | Yes | Submit referral |
| `toggle_favorite` | `handlers/favorites.ts` | No | No | Add/remove favorite listing |
| `get_favorites` | `handlers/getFavorites.ts` | No | No | Get user's favorites |
| `parse_profile` | `handlers/parseProfile.ts` | No | No | Parse profile during AI signup |

**Deprecated Actions** (moved to dedicated functions):
- `create_proposal` → Use `/functions/v1/proposal`
- `create_listing` → Use `/functions/v1/listing`
- `get_listing` → Use `/functions/v1/listing`

---

## Action Details

### send_message

Send message to host (no sync, workflow only).

**Request:**
```json
{
  "action": "send_message",
  "payload": {
    "listing_id": "listing-uuid",
    "message": "Hello, I'm interested in your listing.",
    "guest_name": "John Doe",
    "guest_email": "john@example.com"
  }
}
```

**Bubble Workflow**: `send-message-to-host`

---

### ai_inquiry

AI-powered market research inquiry with atomic sync.

**Request:**
```json
{
  "action": "ai_inquiry",
  "payload": {
    "email": "user@example.com",
    "inquiry_text": "Looking for weekday rentals in Manhattan",
    "neighborhood_preference": "Upper West Side"
  }
}
```

**Bubble Workflow**: `ai-inquiry`
**Sync**: Atomic sync to `inquiries` table

---

### upload_photos

Upload listing photos with atomic sync.

**Note**: Public because photos are uploaded in Section 6 before user signup in Section 7.

**Request:**
```json
{
  "action": "upload_photos",
  "payload": {
    "listing_id": "listing-uuid",
    "photos": ["base64-data-1", "base64-data-2"]
  }
}
```

**Bubble Workflow**: `upload-photos`
**Sync**: Atomic sync to `photos` table

---

### submit_referral

Submit referral with atomic sync. **Requires authentication**.

**Request:**
```json
{
  "action": "submit_referral",
  "payload": {
    "referrer_email": "referrer@example.com",
    "referee_email": "friend@example.com",
    "referee_name": "Jane Doe"
  }
}
```

**Bubble Workflow**: `submit-referral`
**Sync**: Atomic sync to `referrals` table

---

### toggle_favorite

Add or remove a listing from user's favorites.

**Request:**
```json
{
  "action": "toggle_favorite",
  "payload": {
    "user_id": "bubble-user-id",
    "listing_id": "listing-uuid"
  }
}
```

**Bubble Workflow**: `toggle-favorite`

---

### get_favorites

Get user's favorited listings.

**Request:**
```json
{
  "action": "get_favorites",
  "payload": {
    "user_id": "bubble-user-id"
  }
}
```

**Bubble Workflow**: `get-favorites`

---

### parse_profile

Parse user profile during AI signup flow. Supabase query only (no Bubble API).

**Request:**
```json
{
  "action": "parse_profile",
  "payload": {
    "profile_text": "I work in finance and travel to NYC Mon-Thu"
  }
}
```

---

## File Structure

```
bubble-proxy/
├── index.ts                    # Main router
├── handlers/
│   ├── messaging.ts           # handleSendMessage()
│   ├── aiInquiry.ts           # handleAiInquiry()
│   ├── photos.ts              # handlePhotoUpload()
│   ├── referral.ts            # handleReferral()
│   ├── favorites.ts           # handleFavorites()
│   ├── getFavorites.ts        # handleGetFavorites()
│   ├── parseProfile.ts        # handleParseProfile()
│   └── listingSync.ts         # (legacy sync handler)
└── deno.json                  # Import map
```

---

## BubbleSyncService Usage

Handlers use `BubbleSyncService` for atomic sync operations:

```typescript
const syncService = new BubbleSyncService(
  bubbleBaseUrl,
  bubbleApiKey,
  supabaseUrl,
  supabaseServiceKey
);

// Atomic create-and-sync
const result = await syncService.createAndSync(
  'workflow-name',
  params,
  'BubbleObjectType',
  'supabase_table'
);

// Workflow only (no sync)
const result = await syncService.triggerWorkflowOnly(
  'workflow-name',
  params
);
```

---

## Dependencies

- `BubbleSyncService` (`_shared/bubbleSync.ts`)
- `_shared/cors.ts`
- `_shared/errors.ts`
- `_shared/validation.ts`
- `_shared/slack.ts`

---

## Error Handling

- Missing authentication (for protected actions): 401 (AuthenticationError)
- Missing required fields: 400 (ValidationError)
- Bubble API errors: Pass through with original status
- Supabase sync errors: 500 (SupabaseSyncError)

---

**LAST_UPDATED**: 2025-12-11
