# Edge Functions - Quick Reference Guide

**For**: Developers working with Split Lease Edge Functions
**Updated**: 2025-12-04
**Focus**: Fast lookup, copy-paste templates, common patterns

---

## TL;DR - The 30-Second Version

**Edge Functions** are Deno-based functions running on Supabase that handle API requests.

**Every function**:
1. Receives `{action, payload}`
2. Routes to a handler
3. Returns `{success, data|error}`

**Files involved**:
- `supabase/functions/function-name/index.ts` - Router
- `supabase/functions/function-name/handlers/*.ts` - Business logic
- `supabase/functions/_shared/*.ts` - Reusable utilities

---

## Endpoints & Actions Quick Reference

| Function | Endpoint | Actions | Examples |
|----------|----------|---------|----------|
| **bubble-proxy** | `/bubble-proxy` | create_listing, get_listing, send_message, upload_photos, toggle_favorite, submit_listing, signup_ai | [Requests](#bubble-proxy-requests) |
| **auth-user** | `/auth-user` | login, signup, logout, validate | [Requests](#auth-user-requests) |
| **ai-gateway** | `/ai-gateway` | complete, stream | [Requests](#ai-gateway-requests) |

---

## bubble-proxy Requests

### Create Listing (Public)
```bash
curl -X POST https://project.supabase.co/functions/v1/bubble-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_listing",
    "payload": {
      "listing_name": "Downtown Studio Apartment",
      "user_email": "user@example.com"
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "abc123",
    "Name": "Downtown Studio Apartment",
    "Address": "123 Main St, NYC",
    "...": "..."
  }
}
```

### Get Listing (Public)
```bash
curl -X POST https://project.supabase.co/functions/v1/bubble-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_listing",
    "payload": {
      "listing_id": "abc123"
    }
  }'
```

### Toggle Favorite (Public)
```bash
curl -X POST https://project.supabase.co/functions/v1/bubble-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "action": "toggle_favorite",
    "payload": {
      "userId": "user123",
      "listingId": "listing456",
      "action": "add"
    }
  }'
```

**Payload Actions**: `"add"` or `"remove"`

### Send Message (Public)
```bash
curl -X POST https://project.supabase.co/functions/v1/bubble-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send_message",
    "payload": {
      "to_user_id": "host123",
      "message": "Hi, I'm interested in your listing!"
    }
  }'
```

### Upload Photos (Public)
```bash
curl -X POST https://project.supabase.co/functions/v1/bubble-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "action": "upload_photos",
    "payload": {
      "listing_id": "abc123",
      "photos": ["photo_url_1", "photo_url_2"]
    }
  }'
```

### Submit Listing (AUTHENTICATED)
```bash
curl -X POST https://project.supabase.co/functions/v1/bubble-proxy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "action": "submit_listing",
    "payload": {
      "listing_id": "abc123",
      "user_email": "user@example.com",
      "listing_data": {
        "Name": "My Apartment",
        "Type of Space": "Entire place",
        "Bedrooms": 1,
        "Address": "123 Main St",
        "...": "..."
      }
    }
  }'
```

---

## auth-user Requests

### Login
```bash
curl -X POST https://project.supabase.co/functions/v1/auth-user \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "payload": {
      "email": "user@example.com",
      "password": "securepassword"
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user_id": "bubble_user_123",
    "expires": 3600
  }
}
```

### Signup
```bash
curl -X POST https://project.supabase.co/functions/v1/auth-user \
  -H "Content-Type: application/json" \
  -d '{
    "action": "signup",
    "payload": {
      "email": "newuser@example.com",
      "password": "securepassword",
      "retype": "securepassword",
      "additionalData": {
        "firstName": "John",
        "lastName": "Doe",
        "userType": "Guest",
        "birthDate": "1990-01-15",
        "phoneNumber": "(555) 123-4567"
      }
    }
  }'
```

### Validate Token
```bash
curl -X POST https://project.supabase.co/functions/v1/auth-user \
  -H "Content-Type: application/json" \
  -d '{
    "action": "validate",
    "payload": {
      "token": "eyJhbGc..."
    }
  }'
```

### Logout
```bash
curl -X POST https://project.supabase.co/functions/v1/auth-user \
  -H "Content-Type: application/json" \
  -d '{
    "action": "logout",
    "payload": {
      "token": "eyJhbGc..."
    }
  }'
```

---

## ai-gateway Requests

### Get Completion (Non-Streaming)
```bash
curl -X POST https://project.supabase.co/functions/v1/ai-gateway \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "action": "complete",
    "payload": {
      "prompt_key": "listing-description",
      "variables": {
        "neighborhood": "Brooklyn",
        "amenities": ["WiFi", "AC", "Parking"]
      },
      "options": {
        "model": "gpt-4o",
        "temperature": 0.7,
        "max_tokens": 500
      }
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "content": "This beautiful studio in Brooklyn...",
    "model": "gpt-4o",
    "usage": {
      "prompt_tokens": 150,
      "completion_tokens": 250,
      "total_tokens": 400
    }
  }
}
```

### Stream Completion (SSE)
```bash
curl -X POST https://project.supabase.co/functions/v1/ai-gateway \
  -H "Content-Type: application/json" \
  -d '{
    "action": "stream",
    "payload": {
      "prompt_key": "listing-description",
      "variables": { "..." : "..." }
    }
  }'
```

**Response**: Server-Sent Events (streaming)
```
data: {"delta":"This","usage":{"total_tokens":5}}
data: {"delta":" beautiful","usage":{"total_tokens":10}}
data: {"delta":" studio...","usage":{"total_tokens":20}}
```

---

## Creating a New Handler

### Template: bubble-proxy Handler

**File**: `supabase/functions/bubble-proxy/handlers/myAction.ts`

```typescript
/**
 * My Action Handler
 *
 * Handles the "my_action" action
 * Steps: 1) Validate 2) Process 3) Return
 */

import { BubbleSyncService } from '../../_shared/bubbleSync.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { User } from '../../_shared/types.ts';

interface MyActionPayload {
  field1: string;
  field2?: number;
}

export async function handleMyAction(
  syncService: BubbleSyncService,
  payload: MyActionPayload,
  user: User
): Promise<any> {
  console.log('[MyAction Handler] ========== MY ACTION ==========');
  console.log('[MyAction Handler] User:', user.email);
  console.log('[MyAction Handler] Payload:', JSON.stringify(payload, null, 2));

  // Validate
  validateRequiredFields(payload, ['field1']);

  // Process
  const result = await syncService.triggerWorkflow('my_workflow', {
    field1: payload.field1,
    field2: payload.field2
  });

  // Return
  console.log('[MyAction Handler] ========== SUCCESS ==========');
  return result;
}
```

**Update index.ts**:

```typescript
// 1. Add import at top
import { handleMyAction } from './handlers/myAction.ts';

// 2. Add to allowedActions
const allowedActions = [
  'create_listing',
  'get_listing',
  'my_action',  // <-- Add here
  // ...
];

// 3. Add to PUBLIC_ACTIONS if no auth required
const PUBLIC_ACTIONS = ['create_listing', 'get_listing', 'my_action', ...];

// 4. Add to switch statement
switch (action) {
  case 'create_listing':
    result = await handleListingCreate(syncService, payload, user);
    break;

  case 'my_action':  // <-- Add case
    result = await handleMyAction(syncService, payload, user);
    break;

  // ...
}
```

---

## Common Patterns

### Pattern 1: Validate & Return

```typescript
export async function handleSimpleAction(
  syncService: BubbleSyncService,
  payload: any,
  user: User
): Promise<any> {
  // Validate
  validateRequiredFields(payload, ['required_field']);

  // Process
  const data = await someOperation(payload.required_field);

  // Return
  return data;
}
```

### Pattern 2: Bubble Workflow

```typescript
// Create in Bubble
const id = await syncService.triggerWorkflow('workflow_name', params);

// Fetch full data
const fullData = await syncService.fetchBubbleObject('ObjectType', id);

// Sync to Supabase
await syncService.syncToSupabase('table_name', fullData);

// Return
return fullData;
```

### Pattern 3: Error Handling

```typescript
import { BubbleApiError, ValidationError } from '../../_shared/errors.ts';

try {
  // Try something
  const result = await operation();
} catch (error) {
  // Rethrow with context
  if (error instanceof BubbleApiError) {
    throw new BubbleApiError('Operation failed: ' + error.message);
  }
  throw new ValidationError('Invalid input');
}
```

### Pattern 4: Conditional Logic

```typescript
if (!user || user.id === 'guest') {
  throw new AuthenticationError('Authentication required');
}

// Now user is definitely authenticated
console.log(`Authenticated user: ${user.email}`);
```

### Pattern 5: Optional Auth

```typescript
// Try to get auth header
const authHeader = req.headers.get('Authorization');

if (authHeader) {
  // Validate if present
  const { data: { user } } = await supabase.auth.getUser();
  // Use authenticated user
} else {
  // Use guest
  console.log('Guest user');
}
```

---

## Debugging Tips

### View Function Logs

```bash
# Watch logs in real-time
supabase functions logs bubble-proxy --tail

# View recent logs
supabase functions logs bubble-proxy
```

### Add Debug Logging

```typescript
console.log('[Handler] Step X: Description');
console.log('[Handler] Variable:', value);
console.log('[Handler] Full object:', JSON.stringify(object, null, 2));

// In logs you'll see:
// [bubble-proxy] ========== REQUEST ==========
// [bubble-proxy] Method: POST
// [bubble-proxy] Action: create_listing
// [Listing Handler] ========== CREATE LISTING ==========
```

### Test Locally

```bash
# Terminal 1: Start Supabase
supabase start

# Terminal 2: Serve functions
supabase functions serve

# Terminal 3: Make request
curl -X POST http://localhost:54321/functions/v1/bubble-proxy \
  -H "Content-Type: application/json" \
  -d '{"action": "test", "payload": {}}'
```

### Check Secrets

```bash
# List secrets
supabase secrets list

# Set secret
supabase secrets set BUBBLE_API_KEY=abc123
```

---

## Error Handling Quick Reference

| Error | Status | When to Use |
|-------|--------|------------|
| `ValidationError` | 400 | Invalid input, missing required field |
| `AuthenticationError` | 401 | Missing/invalid auth token |
| `BubbleApiError` | 500 (or custom) | Bubble API call failed |
| `SupabaseSyncError` | 500 | Supabase operation failed |
| `OpenAIError` | 500 (or custom) | OpenAI API failed |

```typescript
// Throw appropriate error
if (!payload.email) {
  throw new ValidationError('Missing required field: email');
}

if (!user) {
  throw new AuthenticationError('Authentication required');
}

if (bubbleResponse.status !== 200) {
  throw new BubbleApiError('Workflow failed', bubbleResponse.status);
}
```

---

## Authentication Scenarios

### Scenario 1: Public Action (No Auth)
```typescript
// Action in PUBLIC_ACTIONS
// Result: Works with or without Authorization header
const PUBLIC_ACTIONS = ['create_listing', 'get_listing', ...];
```

### Scenario 2: Protected Action (Auth Required)
```typescript
// Action NOT in PUBLIC_ACTIONS
// If no auth: AuthenticationError thrown (401)
if (!isPublicAction && !user) {
  throw new AuthenticationError('Auth required');
}
```

### Scenario 3: Optional Auth (Guest or User)
```typescript
// Header present? Validate it
// Header missing? Use guest {id: 'guest', email: null}
if (authHeader) {
  // Validate and use user
} else {
  user = { id: 'guest', email: null };
}
```

---

## Payload Examples by Action

### create_listing
```json
{
  "listing_name": "My Apartment",
  "user_email": "user@example.com"
}
```

### toggle_favorite
```json
{
  "userId": "user123",
  "listingId": "listing456",
  "action": "add"
}
```

### send_message
```json
{
  "to_user_id": "recipient123",
  "message": "Hi there!"
}
```

### submit_referral
```json
{
  "referee_email": "friend@example.com",
  "referral_code": "ref123"
}
```

### AI: complete
```json
{
  "prompt_key": "listing-description",
  "variables": {
    "neighborhood": "Brooklyn",
    "amenities": ["WiFi", "AC"]
  },
  "options": {
    "model": "gpt-4o",
    "temperature": 0.7,
    "max_tokens": 500
  }
}
```

---

## Deployment

### Deploy Single Function
```bash
supabase functions deploy bubble-proxy
```

### Deploy All Functions
```bash
supabase functions deploy
```

### Deploy with Secrets
```bash
supabase secrets set BUBBLE_API_KEY=<value>
supabase functions deploy bubble-proxy
```

### Check Deployment Status
```bash
supabase functions list
```

---

## Common Mistakes to Avoid

### ❌ WRONG: Fallback Logic
```typescript
// NO!
const result = data || { fallback: 'default' };
```

### ✅ RIGHT: Real Data or Error
```typescript
// YES
if (!data) {
  throw new ValidationError('Data not found');
}
```

---

### ❌ WRONG: Missing Validation
```typescript
// NO!
export async function handler(payload) {
  const { field } = payload;  // What if field is missing?
  return field;
}
```

### ✅ RIGHT: Explicit Validation
```typescript
// YES
export async function handler(payload) {
  validateRequiredFields(payload, ['field']);
  const { field } = payload;
  return field;
}
```

---

### ❌ WRONG: Hardcoded Values
```typescript
// NO!
const userId = 'user123';  // Hardcoded!
```

### ✅ RIGHT: From Request
```typescript
// YES
const { userId } = payload;
validateRequired(userId, 'userId');
```

---

### ❌ WRONG: Silent Failures
```typescript
// NO!
try {
  await operation();
} catch (error) {
  console.error('Error:', error);
  return { success: false };  // Hidden error!
}
```

### ✅ RIGHT: Explicit Errors
```typescript
// YES
try {
  await operation();
} catch (error) {
  console.error('Error:', error);
  throw error;  // Propagate!
}
```

---

## Where to Find Things

| Need | Location |
|------|----------|
| Write-Read-Write pattern | `_shared/bubbleSync.ts` |
| Custom errors | `_shared/errors.ts` |
| Input validation | `_shared/validation.ts` |
| CORS headers | `_shared/cors.ts` |
| Type definitions | `_shared/types.ts`, `_shared/aiTypes.ts` |
| OpenAI integration | `_shared/openai.ts` |
| AI prompt registry | `ai-gateway/prompts/_registry.ts` |
| Add new action | `bubble-proxy/handlers/newAction.ts` |
| Configure routing | `bubble-proxy/index.ts` (allowedActions, PUBLIC_ACTIONS, switch) |
| Secrets setup | Supabase Dashboard > Project Settings > Secrets |
| Function config | `supabase/config.toml` |

---

**QUICK_REFERENCE_VERSION**: 1.0
**UPDATED**: 2025-12-04
**NEXT**: See EDGE_FUNCTIONS_ARCHITECTURE_ANALYSIS.md for detailed information

