# Supabase Edge Functions - Context Guide

**GENERATED**: 2025-12-04
**LOCATION**: `supabase/functions/`
**RUNTIME**: Deno 2

---

## Architecture Overview

The project has **5 main Edge Functions**:

| Function | Purpose | JWT Auth |
|----------|---------|----------|
| `bubble-proxy` | General Bubble API proxy for listings, messaging, photos, favorites | No (optional per action) |
| `auth-user` | Authentication (native Supabase Auth for login/signup, Bubble for logout/validate) | No |
| `ai-gateway` | AI completions with OpenAI (streaming + non-streaming) | Optional per prompt |
| `ai-signup-guest` | AI-powered guest signup flow | No |
| `slack` | Slack integration (FAQ inquiries to Slack channels) | No |

---

## Directory Structure

```
supabase/
├── config.toml                    # Supabase local config + function definitions
├── CLAUDE.md                      # This file
└── functions/
    ├── _shared/                   # Shared utilities
    │   ├── aiTypes.ts             # AI-specific TypeScript types
    │   ├── bubbleSync.ts          # Core BubbleSyncService class
    │   ├── cors.ts                # CORS headers configuration
    │   ├── errors.ts              # Custom error classes
    │   ├── openai.ts              # OpenAI API wrapper
    │   ├── types.ts               # General TypeScript interfaces
    │   └── validation.ts          # Input validation utilities
    │
    ├── bubble-proxy/              # General Bubble API proxy
    │   ├── index.ts               # Main router
    │   ├── deno.json              # Import map
    │   └── handlers/
    │       ├── favorites.ts       # Toggle favorites
    │       ├── getFavorites.ts    # Get user favorites
    │       ├── getListing.ts      # Fetch listing data
    │       ├── listing.ts         # Create listing
    │       ├── listingSync.ts     # Listing sync utilities
    │       ├── messaging.ts       # Send messages
    │       ├── photos.ts          # Upload photos
    │       ├── referral.ts        # Submit referrals
    │       ├── signup.ts          # AI signup
    │       └── submitListing.ts   # Full listing submission
    │
    ├── auth-user/                 # Native Supabase Auth (login/signup) + Bubble (logout/validate)
    │   ├── index.ts               # Main router
    │   └── handlers/
    │       ├── login.ts           # User login (Supabase Auth native)
    │       ├── logout.ts          # User logout (Bubble legacy)
    │       ├── signup.ts          # User registration (Supabase Auth native)
    │       └── validate.ts        # Token validation (Bubble legacy)
    │
    ├── ai-gateway/                # AI service gateway
    │   ├── index.ts               # Main router
    │   ├── deno.json              # Import map
    │   ├── handlers/
    │   │   ├── complete.ts        # Non-streaming completion
    │   │   └── stream.ts          # SSE streaming completion
    │   └── prompts/
    │       ├── _registry.ts       # Prompt registry
    │       ├── _template.ts       # Template interpolation
    │       └── listing-description.ts
    │
    ├── ai-signup-guest/           # AI-powered guest signup
    │   └── index.ts
    │
    └── slack/                     # Slack integration
        └── index.ts               # FAQ inquiry handler
```

---

## Shared Utilities (`_shared/`)

### bubbleSync.ts - Core Sync Service

The `BubbleSyncService` class implements the **Write-Read-Write atomic pattern**:

```typescript
// Pattern: Atomic Create-and-Sync
// 1. Create in Bubble (source of truth)
// 2. Fetch full data from Bubble Data API
// 3. Sync to Supabase (replica)
// 4. Return synced data to client

const syncService = new BubbleSyncService(
  bubbleBaseUrl,
  bubbleApiKey,
  supabaseUrl,
  supabaseServiceKey
);

// Atomic operation
await syncService.createAndSync(
  'workflow_name',
  params,
  'BubbleObjectType',
  'supabase_table'
);

// Workflow only (no sync)
await syncService.triggerWorkflowOnly('workflow_name', params);

// Manual fetch
await syncService.fetchBubbleObject('ObjectType', 'object_id');

// Manual sync
await syncService.syncToSupabase('table_name', data);
```

### errors.ts - Custom Error Classes

| Error Class | HTTP Status | Use Case |
|-------------|-------------|----------|
| `BubbleApiError` | Variable (default 500) | Bubble API failures |
| `SupabaseSyncError` | 500 | Supabase sync failures |
| `ValidationError` | 400 | Input validation failures |
| `AuthenticationError` | 401 | Missing/invalid authentication |
| `OpenAIError` | Variable (default 500) | OpenAI API failures |

### validation.ts - Input Validation

```typescript
validateEmail(email);                    // Throws if invalid format
validatePhone(phone);                    // Throws if invalid (optional field)
validateRequired(value, 'fieldName');    // Throws if null/undefined/empty
validateRequiredFields(obj, ['field1', 'field2']);
validateAction(action, ['allowed1', 'allowed2']);
```

### cors.ts - CORS Configuration

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};
```

### openai.ts - OpenAI Wrapper

```typescript
// Non-streaming
const result = await complete(messages, {
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 1000,
  responseFormat: 'json_object' | 'text'
});

// Streaming (returns ReadableStream)
const stream = await stream(messages, options);
```

---

## bubble-proxy Actions

**Endpoint**: `POST /functions/v1/bubble-proxy`

**Request Format**:
```json
{
  "action": "action_name",
  "payload": { ... }
}
```

| Action | Auth Required | Handler | Description |
|--------|---------------|---------|-------------|
| `create_listing` | No | `listing.ts` | Create new listing with Supabase sync |
| `get_listing` | No | `getListing.ts` | Fetch listing data from Bubble |
| `send_message` | No | `messaging.ts` | Send message to host |
| `signup_ai` | No | `signup.ts` | AI-powered signup |
| `upload_photos` | No | `photos.ts` | Upload listing photos |
| `toggle_favorite` | No | `favorites.ts` | Add/remove from favorites |
| `get_favorites` | No | `getFavorites.ts` | Get user's favorited listings |
| `submit_referral` | **Yes** | `referral.ts` | Submit referral |
| `submit_listing` | **Yes** | `submitListing.ts` | Full listing submission with all form data |

### submit_listing Payload Structure

```typescript
{
  listing_id: string;
  user_email: string;
  user_unique_id?: string;
  listing_data: {
    'Name': string;
    'Type of Space': string;
    'Bedrooms': number;
    'Beds': number;
    'Bathrooms': number;
    'Address': string;
    'Neighborhood': string;
    'Amenities Inside Unit': string[];
    'Amenities Outside Unit': string[];
    'Description of Lodging': string;
    'Rental Type': string;
    'Available Nights': string[];
    'Damage Deposit': number;
    'House Rules': string[];
    // ... more fields
  }
}
```

---

## auth-user Actions

**Endpoint**: `POST /functions/v1/auth-user`

| Action | Handler | Backend | Description |
|--------|---------|---------|-------------|
| `login` | `login.ts` | Supabase Auth (native) | Authenticate user via signInWithPassword |
| `signup` | `signup.ts` | Supabase Auth (native) | Register new user + create profile in public.user |
| `logout` | `logout.ts` | Bubble (legacy) | Invalidate token |
| `validate` | `validate.ts` | Bubble + Supabase | Validate token + fetch user data |

### Login/Signup Response
```json
{
  "success": true,
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 3600,
    "user_id": "...",
    "supabase_user_id": "...",
    "user_type": "Host|Guest",
    "host_account_id": "...",
    "guest_account_id": "..."
  }
}
```

---

## ai-gateway Actions

**Endpoint**: `POST /functions/v1/ai-gateway`

| Action | Handler | Description |
|--------|---------|-------------|
| `complete` | `complete.ts` | Non-streaming OpenAI completion |
| `stream` | `stream.ts` | SSE streaming completion |

### Public Prompts (No Auth Required)
- `listing-description`
- `echo-test`

### Request Format
```json
{
  "action": "complete",
  "payload": {
    "prompt_key": "listing-description",
    "variables": {
      "neighborhood": "Brooklyn",
      "amenities": ["WiFi", "AC"]
    },
    "options": {
      "model": "gpt-4",
      "temperature": 0.7,
      "max_tokens": 1000
    }
  }
}
```

---

## slack Actions

**Endpoint**: `POST /functions/v1/slack`

| Action | Description |
|--------|-------------|
| `faq_inquiry` | Send FAQ inquiries to Slack channels |

### Request Format
```json
{
  "action": "faq_inquiry",
  "payload": {
    "name": "John Doe",
    "email": "john@example.com",
    "inquiry": "What are the payment methods available?"
  }
}
```

### Response
```json
{
  "success": true,
  "data": {
    "message": "Inquiry sent successfully"
  }
}
```

---

## Required Secrets

Configure in **Supabase Dashboard > Project Settings > Secrets**:

| Secret | Value | Used By |
|--------|-------|---------|
| `BUBBLE_API_BASE_URL` | `https://app.split.lease/version-test/api/1.1` | bubble-proxy, auth-user (logout/validate) |
| `BUBBLE_API_KEY` | See secrets setup | All Bubble API calls |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase Dashboard | Server-side operations, auth-user |
| `OPENAI_API_KEY` | From OpenAI | ai-gateway |
| `SLACK_WEBHOOK_ACQUISITION` | Slack webhook URL | slack (acquisition channel) |
| `SLACK_WEBHOOK_GENERAL` | Slack webhook URL | slack (general channel) |

---

## Key Design Principles

### NO FALLBACK PRINCIPLE

All Edge Functions follow the "No Fallback" principle:

```typescript
// CORRECT - Fail fast
if (!data) {
  throw new BubbleApiError('Data not found', 404);
}

// WRONG - Never do this
if (!data) {
  return { fallback: 'default value' }; // NO!
}
```

- Real data or nothing
- No fallback mechanisms
- No hardcoded values
- Atomic operations only
- Errors propagate, not hidden

### Action-Based Routing

All functions accept POST requests with:
```json
{
  "action": "action_name",
  "payload": { ... }
}
```

### Authentication Pattern

```typescript
// Optional auth (for public actions)
const authHeader = req.headers.get('Authorization');
if (authHeader) {
  const { data: { user } } = await supabase.auth.getUser();
  // Use authenticated user
} else {
  // Guest user
  user = { id: 'guest', email: null };
}

// Required auth
if (!user) {
  throw new AuthenticationError('Authentication required');
}
```

---

## Configuration (config.toml)

```toml
[functions.bubble-proxy]
enabled = true
verify_jwt = false
import_map = "./functions/bubble-proxy/deno.json"
entrypoint = "./functions/bubble-proxy/index.ts"

[functions.auth-user]
enabled = true
verify_jwt = false
entrypoint = "./functions/auth-user/index.ts"

[functions.ai-signup-guest]
enabled = true
verify_jwt = false
entrypoint = "./functions/ai-signup-guest/index.ts"

[edge_runtime]
enabled = true
policy = "per_worker"  # Hot reload in dev
deno_version = 2
```

**Note**: `verify_jwt = false` because functions handle their own authentication.

---

## Local Development

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve

# View function logs
supabase functions logs bubble-proxy
supabase functions logs auth-user
supabase functions logs ai-gateway
```

---

## Deployment

```bash
# Deploy single function
supabase functions deploy bubble-proxy

# Deploy all functions
supabase functions deploy
```

---

## Error Response Format

All functions return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

HTTP status codes are determined by error type:
- `400` - ValidationError
- `401` - AuthenticationError
- `500` - Default / SupabaseSyncError
- Variable - BubbleApiError (uses original status)

---

## Adding a New Edge Function

1. Create directory: `supabase/functions/new-function/`
2. Create `index.ts` with `Deno.serve()` handler
3. Create `deno.json` for import map (optional)
4. Add configuration to `config.toml`:
   ```toml
   [functions.new-function]
   enabled = true
   verify_jwt = false
   entrypoint = "./functions/new-function/index.ts"
   ```
5. Deploy: `supabase functions deploy new-function`

---

## Adding a New Handler to bubble-proxy

1. Create handler in `supabase/functions/bubble-proxy/handlers/newHandler.ts`
2. Import in `index.ts`:
   ```typescript
   import { handleNewAction } from './handlers/newHandler.ts';
   ```
3. Add to `allowedActions` array
4. Add to switch statement in router
5. If public (no auth), add to `PUBLIC_ACTIONS` array

---

**DOCUMENT_VERSION**: 1.0
**LAST_UPDATED**: 2025-12-04
