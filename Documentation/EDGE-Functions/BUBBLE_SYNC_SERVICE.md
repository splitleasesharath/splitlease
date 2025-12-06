# BubbleSyncService - Comprehensive Documentation

**GENERATED**: 2025-12-06
**LOCATION**: `supabase/functions/_shared/bubbleSync.ts`
**RELATED**: `supabase/functions/bubble_sync/` (reverse sync Edge Function)
**VERSION**: 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [The Write-Read-Write Pattern](#the-write-read-write-pattern)
4. [BubbleSyncService Class](#bubblesyncservice-class)
5. [Method Reference](#method-reference)
6. [Error Handling](#error-handling)
7. [Shared Utilities](#shared-utilities)
8. [Handler Usage Patterns](#handler-usage-patterns)
9. [The bubble_sync Edge Function](#the-bubble_sync-edge-function)
10. [Configuration & Secrets](#configuration--secrets)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Overview

### What is BubbleSyncService?

`BubbleSyncService` is the **core synchronization layer** that bridges Split Lease's legacy Bubble.io backend with the new Supabase infrastructure during the migration period. It is a shared utility class used by Edge Functions to ensure data consistency between both systems.

### Purpose

During the Bubble.io → Supabase migration, we need to:
- **Keep Bubble as the source of truth** (existing business logic lives there)
- **Replicate data to Supabase** (preparing for full migration)
- **Maintain atomic operations** (either both systems are updated, or neither)

### Core Principle: NO FALLBACK

The service follows a strict **"No Fallback"** principle:

```
- Real data or nothing
- No fallback mechanisms
- No hardcoded values
- Atomic operations only
- Errors propagate, not hidden
```

If any step fails, the entire operation fails. Clients can retry the full operation.

---

## Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React App)                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ POST /functions/v1/bubble-proxy
                               │ { action: "...", payload: {...} }
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTION (bubble-proxy)                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    BubbleSyncService                          │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐    │  │
│  │  │ 1. Create   │  │ 2. Fetch     │  │ 3. Sync to        │    │  │
│  │  │ in Bubble   │→ │ from Bubble  │→ │ Supabase          │    │  │
│  │  │ (Workflow)  │  │ (Data API)   │  │ (Upsert)          │    │  │
│  │  └─────────────┘  └──────────────┘  └───────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │                      │                       │
         ▼                      ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐
│   BUBBLE.IO     │   │   BUBBLE.IO     │   │      SUPABASE           │
│   Workflow API  │   │   Data API      │   │      PostgreSQL         │
│   /wf/...       │   │   /obj/...      │   │      (Replica)          │
│                 │   │                 │   │                         │
│  (Source of     │   │  (Read full     │   │  (Target for            │
│   Truth)        │   │   object data)  │   │   future migration)     │
└─────────────────┘   └─────────────────┘   └─────────────────────────┘
```

### Edge Functions Using BubbleSyncService

| Edge Function | Purpose | Uses BubbleSyncService |
|---------------|---------|------------------------|
| `bubble-proxy` | General API proxy | Yes (via handlers) |
| `bubble-auth-proxy` | Authentication | Partial (manual fetch) |
| `ai-gateway` | AI completions | No |
| `ai-signup-guest` | AI signup | No |
| `bubble_sync` | Reverse sync (Supabase→Bubble) | No (uses `bubblePush.ts`) |

---

## The Write-Read-Write Pattern

The `BubbleSyncService` implements an **atomic Write-Read-Write pattern**:

### Step-by-Step

```
Step 1: WRITE to Bubble (Workflow API)
─────────────────────────────────────
POST /api/1.1/wf/{workflow_name}
→ Creates record in Bubble (source of truth)
→ Returns: created item ID

Step 2: READ from Bubble (Data API)
─────────────────────────────────────
GET /api/1.1/obj/{object_type}/{id}
→ Fetches the complete record from Bubble
→ Includes all computed fields, relations, etc.

Step 3: WRITE to Supabase (Upsert)
─────────────────────────────────────
supabase.from(table).upsert(data, { onConflict: '_id' })
→ Replicates the complete record to Supabase
→ Uses _id for conflict resolution
```

### Why This Pattern?

1. **Bubble remains authoritative**: Business logic in Bubble workflows is preserved
2. **Data API provides complete data**: Including computed fields and relations
3. **Supabase stays in sync**: Replica ready for full migration
4. **Atomic guarantee**: All-or-nothing operation

---

## BubbleSyncService Class

### Constructor

```typescript
class BubbleSyncService {
  constructor(
    bubbleBaseUrl: string,     // e.g., "https://app.split.lease/version-test/api/1.1"
    bubbleApiKey: string,      // Bubble API key
    supabaseUrl: string,       // Supabase project URL
    supabaseServiceKey: string // Service role key (bypasses RLS)
  )
}
```

**Initialization Example:**

```typescript
const syncService = new BubbleSyncService(
  Deno.env.get('BUBBLE_API_BASE_URL'),
  Deno.env.get('BUBBLE_API_KEY'),
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);
```

### Internal Properties

| Property | Type | Description |
|----------|------|-------------|
| `bubbleBaseUrl` | `string` | Base URL for Bubble API calls |
| `bubbleApiKey` | `string` | Bearer token for Bubble authentication |
| `supabaseClient` | `SupabaseClient` | Initialized with service role key |

---

## Method Reference

### 1. `createAndSync()`

**Purpose**: Complete atomic create-and-sync operation

```typescript
async createAndSync(
  workflowName: string,        // Bubble workflow name (e.g., 'listing_creation_in_code')
  params: Record<string, any>, // Parameters to pass to workflow
  bubbleObjectType: string,    // Bubble object type (e.g., 'Listing', 'zat_users')
  supabaseTable: string        // Supabase table name (e.g., 'listing', 'zat_users')
): Promise<any>
```

**Returns**: Synced data from Supabase (complete record)

**Example Usage:**

```typescript
// From referral.ts handler
const syncedReferral = await syncService.createAndSync(
  'referral-index-lite',  // Bubble workflow
  { method, contact },     // Workflow params
  'zat_referrals',         // Bubble object type
  'zat_referrals'          // Supabase table
);
```

---

### 2. `triggerWorkflow()`

**Purpose**: Trigger a Bubble workflow and extract the created item ID

```typescript
async triggerWorkflow(
  workflowName: string,
  params: Record<string, any>
): Promise<string>  // Returns created item ID
```

**Bubble Workflow Requirements**:
- Workflow must return a response with ID in one of these locations:
  - `response.listing` (for listing workflows)
  - `response.listing_id`
  - `response.id`
  - `response.user_id`

**Example Usage:**

```typescript
// From listing.ts handler
const listingId = await syncService.triggerWorkflow(
  'listing_creation_in_code',
  { listing_name: name.trim(), user_email }
);
```

---

### 3. `triggerWorkflowOnly()`

**Purpose**: Trigger a Bubble workflow WITHOUT syncing to Supabase

```typescript
async triggerWorkflowOnly(
  workflowName: string,
  params: Record<string, any>
): Promise<any>  // Returns workflow response
```

**Use Cases**:
- Sending emails/notifications
- Logout operations
- Photo uploads (Bubble handles storage)
- Full listing submissions (update, not create)

**Example Usage:**

```typescript
// From messaging.ts handler
await syncService.triggerWorkflowOnly(
  'core-contact-host-send-message',
  { listing_unique_id, sender_name, sender_email, message_body }
);
```

---

### 4. `fetchBubbleObject()`

**Purpose**: Fetch complete object data from Bubble Data API

```typescript
async fetchBubbleObject(
  objectType: string,  // e.g., 'Listing', 'User', 'zat_users'
  objectId: string     // The _id of the object
): Promise<any>
```

**API Endpoint**: `GET /obj/{objectType}/{objectId}`

**Example Usage:**

```typescript
// From getListing.ts handler
const listingData = await syncService.fetchBubbleObject('Listing', listing_id);
```

---

### 5. `syncToSupabase()`

**Purpose**: Upsert data to Supabase table using `_id` as conflict key

```typescript
async syncToSupabase(
  table: string,  // Supabase table name
  data: any       // Data to upsert (must include _id field)
): Promise<any>   // Returns synced data
```

**Important**: Data MUST include `_id` field for conflict resolution.

**Example Usage:**

```typescript
const dataToSync = { ...listingData, _id: listingId };
await syncService.syncToSupabase('listing', dataToSync);
```

---

### 6. `extractId()` (Private)

**Purpose**: Extract ID from various Bubble response formats

```typescript
private extractId(response: BubbleWorkflowResponse): string
```

**Checks these locations in order**:
1. `response.response.listing`
2. `response.response.listing_id`
3. `response.response.id`
4. `response.response.user_id`
5. `response.listing`
6. `response.listing_id`
7. `response.id`
8. `response.user_id`

---

## Error Handling

### Custom Error Classes

Located in `supabase/functions/_shared/errors.ts`:

| Error Class | HTTP Status | When Thrown |
|-------------|-------------|-------------|
| `BubbleApiError` | Variable (default 500) | Bubble API call failures |
| `SupabaseSyncError` | 500 | Supabase upsert failures |
| `ValidationError` | 400 | Input validation failures |
| `AuthenticationError` | 401 | Missing/invalid auth token |
| `OpenAIError` | Variable (default 500) | OpenAI API failures |

### BubbleApiError

```typescript
class BubbleApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public bubbleResponse?: any
  ) { ... }
}
```

### Error Response Format

All Edge Functions return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Status Code Resolution

```typescript
function getStatusCodeFromError(error: Error): number {
  if (error instanceof BubbleApiError) return error.statusCode;
  if (error instanceof AuthenticationError) return 401;
  if (error instanceof ValidationError) return 400;
  if (error instanceof OpenAIError) return error.statusCode;
  return 500;
}
```

---

## Shared Utilities

### Location: `supabase/functions/_shared/`

### cors.ts

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};
```

**Usage in all Edge Functions:**

```typescript
// Handle CORS preflight
if (req.method === 'OPTIONS') {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// Include in all responses
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

### validation.ts

| Function | Purpose | Throws |
|----------|---------|--------|
| `validateEmail(email)` | Validate email format | `ValidationError` |
| `validatePhone(phone)` | Validate US phone format | `ValidationError` |
| `validateRequired(value, fieldName)` | Check field exists and not empty | `ValidationError` |
| `validateRequiredFields(obj, fields[])` | Check multiple required fields | `ValidationError` |
| `validateAction(action, allowedActions[])` | Check action is in allowed list | `ValidationError` |

**Example:**

```typescript
validateRequiredFields(payload, ['listing_id', 'user_email']);
validateEmail(user_email);
validateAction(action, ['create_listing', 'get_listing']);
```

### types.ts

```typescript
interface BubbleWorkflowResponse {
  status?: string;
  response?: {
    listing_id?: string;
    id?: string;
    user_id?: string;
    token?: string;
    expires?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

interface EdgeFunctionRequest {
  action: string;
  payload: Record<string, any>;
}

interface EdgeFunctionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface User {
  id: string;
  email?: string;
  [key: string]: any;
}
```

---

## Handler Usage Patterns

### Pattern 1: Full Atomic Sync (Referral, AI Signup)

Used when creating new records that should be synced to Supabase.

```typescript
// From signup.ts
const syncedSignup = await syncService.createAndSync(
  'ai-signup-guest',    // Bubble workflow
  { email, phone },     // Params
  'zat_users',          // Bubble type
  'zat_users'           // Supabase table
);
```

### Pattern 2: Manual 3-Step (Listing Create)

Used when Supabase sync is **best-effort** (non-blocking).

```typescript
// From listing.ts
// Step 1: Create in Bubble (REQUIRED)
const listingId = await syncService.triggerWorkflow('listing_creation_in_code', params);

// Step 2: Fetch from Bubble (REQUIRED)
const listingData = await syncService.fetchBubbleObject('Listing', listingId);

// Step 3: Sync to Supabase (BEST EFFORT)
try {
  await syncService.syncToSupabase('listing', { ...listingData, _id: listingId });
} catch (syncError) {
  console.error('Supabase sync failed, continuing anyway:', syncError);
}
```

### Pattern 3: Workflow Only (Messaging, Photos)

Used for workflows that don't create persistent data needing sync.

```typescript
// From messaging.ts
await syncService.triggerWorkflowOnly('core-contact-host-send-message', {
  listing_unique_id,
  sender_name,
  sender_email,
  message_body,
});
```

### Pattern 4: Fetch Only (Get Listing)

Used for read operations.

```typescript
// From getListing.ts
const listingData = await syncService.fetchBubbleObject('Listing', listing_id);
return listingData;
```

---

## The bubble_sync Edge Function

### Purpose: Reverse Sync (Supabase → Bubble)

While `BubbleSyncService` syncs FROM Bubble TO Supabase, the `bubble_sync` Edge Function handles the **reverse direction**: pushing changes FROM Supabase TO Bubble.

### Location: `supabase/functions/bubble_sync/`

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (Source)                            │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐   │
│  │  Table      │────▶│ sync_queue  │────▶│ bubble_sync     │   │
│  │  Triggers   │     │  (pending)  │     │ Edge Function   │   │
│  └─────────────┘     └─────────────┘     └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BUBBLE.IO (Target)                           │
│  ┌─────────────────┐         ┌──────────────────────────────┐  │
│  │  Workflow API   │         │  Data API                    │  │
│  │  /wf/...        │    OR   │  /obj/...                    │  │
│  │  (Complex ops)  │         │  (Direct CRUD - recommended) │  │
│  └─────────────────┘         └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Available Actions

| Action | Description |
|--------|-------------|
| `process_queue` | Process pending items via Workflow API |
| `process_queue_data_api` | Process pending items via Data API (recommended) |
| `sync_single` | Manually sync a single record |
| `retry_failed` | Retry failed items |
| `get_status` | Get queue statistics |
| `cleanup` | Clean up old completed items |
| `build_request` | Preview API request (debugging) |

### Queue Management

The `sync_queue` table tracks all pending synchronizations:

```typescript
interface QueueItem {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  error_message?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  processed_at?: string;
  next_retry_at?: string;
}
```

### Retry Strategy (Exponential Backoff)

| Retry # | Delay |
|---------|-------|
| 1 | 1 minute |
| 2 | 5 minutes |
| 3 | 15 minutes |
| 4 | 30 minutes |
| 5+ | 1 hour |

---

## Configuration & Secrets

### Required Environment Variables

Configure in **Supabase Dashboard > Project Settings > Secrets**:

| Secret | Value | Used By |
|--------|-------|---------|
| `BUBBLE_API_BASE_URL` | `https://app.split.lease/version-test/api/1.1` | All Bubble API calls |
| `BUBBLE_API_KEY` | API key from Bubble Settings | All Bubble API calls |
| `SUPABASE_URL` | Supabase project URL | Service client init |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Bypasses RLS |

### Bubble API URL Structure

```
https://app.split.lease/version-test/api/1.1
        │                 │            │
        │                 │            └── API version
        │                 └── Development: version-test, Production: version-live
        └── Custom domain (or bubbleapps.io subdomain)
```

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/wf/{workflow_name}` | Trigger a workflow |
| `/obj/{object_type}` | List objects of type |
| `/obj/{object_type}/{id}` | Get single object |

---

## Best Practices

### 1. Handler Structure

```typescript
export async function handleAction(
  syncService: BubbleSyncService,
  payload: Record<string, any>,
  user: User
): Promise<any> {
  console.log('[Handler] ========== ACTION START ==========');

  // 1. Validate required fields
  validateRequiredFields(payload, ['required_field']);

  // 2. Extract and validate data
  const { required_field } = payload;

  try {
    // 3. Perform operation
    const result = await syncService.createAndSync(...);

    console.log('[Handler] ========== SUCCESS ==========');
    return result;

  } catch (error) {
    console.error('[Handler] ========== ERROR ==========');
    throw error;  // Let error propagate
  }
}
```

### 2. Logging Standards

Use consistent log prefixes:

```typescript
console.log('[HandlerName] Step 1/3: Doing something...');
console.log('[HandlerName] ✅ Step completed');
console.error('[HandlerName] ⚠️ Step failed (non-critical)');
console.error('[HandlerName] ========== ERROR ==========');
```

### 3. Best-Effort vs Required Steps

```typescript
// REQUIRED: Bubble create (if this fails, entire operation fails)
const id = await syncService.triggerWorkflow('create-thing', params);

// REQUIRED: Fetch complete data
const data = await syncService.fetchBubbleObject('Thing', id);

// BEST-EFFORT: Supabase sync (log error, don't fail)
try {
  await syncService.syncToSupabase('thing', data);
  console.log('✅ Synced to Supabase');
} catch (syncError) {
  console.error('⚠️ Supabase sync failed:', syncError);
  // Continue without failing
}
```

### 4. Never Hide Errors

```typescript
// WRONG - hiding errors
try {
  await riskyOperation();
} catch (error) {
  return { success: false };  // No details!
}

// CORRECT - propagate with context
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof BubbleApiError) throw error;
  throw new BubbleApiError(`Failed to do thing: ${error.message}`, 500, error);
}
```

---

## Troubleshooting

### Issue: "Missing required configuration"

**Symptoms:**
```
Error: BubbleSyncService: Missing required configuration. All parameters are required.
```

**Solution:**
1. Check secrets in Supabase Dashboard > Project Settings > Secrets
2. Verify all 4 required secrets are set:
   - `BUBBLE_API_BASE_URL`
   - `BUBBLE_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

### Issue: "No ID found in Bubble response"

**Symptoms:**
```
Error: No ID found in Bubble response. Response structure may have changed.
```

**Cause:** Bubble workflow returns ID in unexpected location

**Solution:**
1. Check Edge Function logs for actual response structure
2. Verify workflow returns ID in one of supported fields:
   - `response.listing`, `response.listing_id`
   - `response.id`, `response.user_id`
3. Update `extractId()` method if needed

---

### Issue: Supabase sync fails silently

**Symptoms:** Data appears in Bubble but not in Supabase

**Solution:**
1. This is often **by design** (best-effort sync)
2. Check Edge Function logs for sync errors
3. Verify Supabase table has matching `_id` column
4. Check RLS policies (service role should bypass)

---

### Issue: CORS errors in browser

**Symptoms:**
```
Access to fetch blocked by CORS policy
```

**Solution:**
1. Ensure Edge Function handles `OPTIONS` requests:
```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, { status: 200, headers: corsHeaders });
}
```
2. Ensure all responses include `corsHeaders`

---

### Issue: Workflow returns 204 No Content

**Symptoms:**
```
Error: Workflow completed but did not return an ID
```

**Cause:** Bubble workflow doesn't return a response body

**Solution:**
1. Edit Bubble workflow to return data in response
2. Add "Return data from API" action with the created item ID

---

## Quick Reference

### Files

| File | Purpose |
|------|---------|
| `_shared/bubbleSync.ts` | BubbleSyncService class |
| `_shared/errors.ts` | Custom error classes |
| `_shared/validation.ts` | Input validation utilities |
| `_shared/cors.ts` | CORS headers configuration |
| `_shared/types.ts` | TypeScript interfaces |

### Common Methods

| Method | Use Case |
|--------|----------|
| `createAndSync()` | Full atomic create + sync |
| `triggerWorkflow()` | Create in Bubble, get ID |
| `triggerWorkflowOnly()` | Workflow without sync |
| `fetchBubbleObject()` | Read from Bubble |
| `syncToSupabase()` | Upsert to Supabase |

### Required Secrets

| Secret | Example Value |
|--------|---------------|
| `BUBBLE_API_BASE_URL` | `https://app.split.lease/version-test/api/1.1` |
| `BUBBLE_API_KEY` | `xxxxxxxxxxxxxxxxx` |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJxxxxxxx` |

---

**DOCUMENT_VERSION**: 1.0
**LAST_UPDATED**: 2025-12-06
**MAINTAINER**: Split Lease Engineering
