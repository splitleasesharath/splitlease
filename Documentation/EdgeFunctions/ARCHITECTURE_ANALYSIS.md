# Edge Functions Architecture Analysis
**Date**: 2025-12-04
**Project**: Split Lease
**Focus**: Supabase Edge Functions Structure, Patterns, and Design

---

## Executive Summary

The Split Lease project implements a **Action-Based Routing** pattern across 5 main Deno-based Edge Functions. Each function accepts POST requests with `{action, payload}` structure and routes to specific handlers. The architecture emphasizes:

1. **Atomic Operations** - Write-Read-Write pattern for data consistency
2. **No Fallback Principle** - Real data or nothing; errors propagate
3. **Strict Validation** - Input validation at function boundary
4. **Separation of Concerns** - Handlers focus on single responsibility
5. **Shared Utilities** - Reusable services for cross-cutting concerns

---

## Edge Functions Overview

| Function | Purpose | Handlers | Auth Model | Status |
|----------|---------|----------|-----------|--------|
| **bubble-proxy** | General Bubble API proxy | 9 handlers | Optional per action | Active |
| **bubble-auth-proxy** | Authentication system | 4 handlers | None (IS the auth) | Active |
| **ai-gateway** | AI completions service | 2 handlers + prompts | Optional per prompt | Active |
| **ai-signup-guest** | AI-powered guest signup | 1 handler | None | Active |
| **slack** | Slack notifications | 1 handler | None | Active |

---

## Directory Structure & Organization

```
supabase/functions/
├── _shared/                          # Shared utilities (all functions use)
│   ├── aiTypes.ts                    # AI-specific TypeScript types
│   ├── bubbleSync.ts                 # BubbleSyncService class
│   ├── cors.ts                       # CORS headers configuration
│   ├── errors.ts                     # Custom error classes
│   ├── openai.ts                     # OpenAI API wrapper
│   ├── types.ts                      # General TypeScript interfaces
│   └── validation.ts                 # Input validation utilities
│
├── bubble-proxy/
│   ├── index.ts                      # Main router with action dispatch
│   ├── deno.json                     # Import map for dependencies
│   └── handlers/                     # 9 action handlers
│       ├── listing.ts                # create_listing
│       ├── getListing.ts             # get_listing
│       ├── photos.ts                 # upload_photos
│       ├── messaging.ts              # send_message
│       ├── referral.ts               # submit_referral
│       ├── signup.ts                 # signup_ai
│       ├── submitListing.ts          # submit_listing
│       ├── favorites.ts              # toggle_favorite
│       ├── getFavorites.ts           # get_favorites
│       └── listingSync.ts            # Sync utilities
│
├── bubble-auth-proxy/
│   ├── index.ts                      # Main router
│   ├── deno.json                     # Import map
│   └── handlers/                     # 4 action handlers
│       ├── login.ts                  # login
│       ├── signup.ts                 # signup
│       ├── logout.ts                 # logout
│       └── validate.ts               # validate
│
├── ai-gateway/
│   ├── index.ts                      # Main router
│   ├── deno.json                     # Import map
│   ├── handlers/
│   │   ├── complete.ts               # complete (non-streaming)
│   │   └── stream.ts                 # stream (SSE)
│   └── prompts/
│       ├── _registry.ts              # Prompt/loader registry
│       ├── _template.ts              # Template interpolation
│       └── listing-description.ts    # Example prompt config
│
├── ai-signup-guest/
│   └── index.ts                      # Single handler
│
└── slack/
    └── index.ts                      # Single handler
```

---

## Routing Pattern: Action-Based Dispatch

Every Edge Function follows the same routing structure:

### Request Format (Universal)
```json
{
  "action": "action_name",
  "payload": { /* action-specific data */ }
}
```

### Router Pattern (Pseudo-code)
```typescript
// 1. Parse and validate request structure
const body = await req.json();
validateRequiredFields(body, ['action']);
const { action, payload } = body;

// 2. Validate action is supported
const allowedActions = ['action1', 'action2', 'action3'];
validateAction(action, allowedActions);

// 3. Determine authentication requirements
const isPublicAction = PUBLIC_ACTIONS.includes(action);
if (!isPublicAction && !user) {
  throw new AuthenticationError('Auth required');
}

// 4. Initialize shared services
const syncService = new BubbleSyncService(...);

// 5. Route to handler
let result;
switch (action) {
  case 'action1':
    result = await handleAction1(syncService, payload, user);
    break;
  case 'action2':
    result = await handleAction2(syncService, payload, user);
    break;
  // ...
  default:
    throw new Error(`Unknown action: ${action}`);
}

// 6. Return standardized response
return new Response(JSON.stringify({
  success: true,
  data: result
}), {
  status: 200,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

---

## Detailed Router Implementations

### 1. bubble-proxy (9 Handlers)

**File**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\supabase\functions\bubble-proxy\index.ts`

**Public Actions** (no auth required):
- `create_listing` - Create new listing, trigger workflow
- `get_listing` - Fetch listing data from Bubble
- `send_message` - Send message to host
- `signup_ai` - AI-powered signup flow
- `upload_photos` - Upload listing photos (public because uploaded before signup)
- `toggle_favorite` - Add/remove from user's favorites
- `get_favorites` - Fetch user's favorited listings

**Authenticated Actions**:
- `submit_referral` - Submit referral with auth
- `submit_listing` - Full listing submission with all form data

**Authentication Model**:
- Optional: Check Authorization header, validate JWT
- If header missing or invalid: Create guest user object `{id: 'guest', email: null}`
- For non-public actions: Throw `AuthenticationError` if guest

**Handler Pattern**:
```typescript
export async function handleListingCreate(
  syncService: BubbleSyncService,
  payload: Record<string, any>,
  user: User
): Promise<any> {
  // 1. Validate payload
  validateRequiredFields(payload, ['listing_name']);

  // 2. Build workflow parameters
  const params = { listing_name: payload.listing_name.trim() };

  // 3. Execute workflow (Bubble is source of truth)
  const listingId = await syncService.triggerWorkflow(
    'listing_creation_in_code',
    params
  );

  // 4. Fetch full data from Bubble
  const listingData = await syncService.fetchBubbleObject('Listing', listingId);

  // 5. Sync to Supabase (best-effort, non-blocking)
  try {
    await syncService.syncToSupabase('listing', { ...listingData, _id: listingId });
  } catch (error) {
    console.error('Sync failed, continuing...', error);
  }

  return listingData;
}
```

### 2. bubble-auth-proxy (4 Handlers)

**File**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\supabase\functions\bubble-auth-proxy\index.ts`

**Actions**:
- `login` - Authenticate user via email/password
- `signup` - Register new user
- `logout` - Invalidate token
- `validate` - Validate token and fetch user data

**Authentication Model**:
- **NO authentication required** - These ARE the auth endpoints
- Users can't be authenticated to log in

**Handler Pattern** (signup example):
```typescript
export async function handleSignup(
  bubbleAuthBaseUrl: string,
  bubbleApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  // 1. Validate payload
  validateRequiredFields(payload, ['email', 'password', 'retype']);

  // 2. Validate password constraints
  if (password.length < 4) {
    throw new Error('Password must be at least 4 characters');
  }
  if (password !== retype) {
    throw new Error('Passwords do not match');
  }

  // 3. Call Bubble signup workflow (REQUIRED)
  const bubbleResponse = await fetch(`${bubbleAuthBaseUrl}/wf/signup-user`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${bubbleApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password, ...additionalData })
  });

  // 4. Create Supabase Auth user (best-effort)
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
  } catch (error) {
    console.error('Supabase auth creation failed, continuing...', error);
  }

  // 5. Create user profile in public.user table (REQUIRED)
  await supabase.from('user').upsert({ /* user data */ });

  return {
    token: bubbleResponse.token,
    user_id: bubbleResponse.user_id,
    expires: bubbleResponse.expires
  };
}
```

### 3. ai-gateway (2 Handlers + Prompt Registry)

**File**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\supabase\functions\ai-gateway\index.ts`

**Actions**:
- `complete` - Non-streaming OpenAI completion
- `stream` - SSE streaming completion

**Public Prompts** (no auth):
- `listing-description`
- `echo-test`

**Authentication Model**:
- Parsed from request payload: `payload.prompt_key`
- If prompt is public: Skip authentication
- If prompt is protected: Require Authorization header + valid JWT

**Routing Logic**:
```typescript
// 1. Parse request (need prompt_key for auth decision)
const body = await req.json();
validateRequired(body.action, 'action');
validateRequired(body.payload.prompt_key, 'payload.prompt_key');

// 2. Check if prompt is public
const isPublicPrompt = PUBLIC_PROMPTS.includes(body.payload.prompt_key);

// 3. Conditionally authenticate
if (!isPublicPrompt) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new ValidationError('Missing Authorization header');
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) {
    throw new ValidationError('Invalid or expired token');
  }
}

// 4. Route to handler
switch (body.action) {
  case 'complete':
    return await handleComplete(context);
  case 'stream':
    return await handleStream(context);
}
```

**Handler Pattern** (complete):
```typescript
export async function handleComplete(context: HandlerContext): Promise<Response> {
  const { user, serviceClient, request } = context;
  const { payload } = request;

  // 1. Get prompt configuration from registry
  const promptConfig = getPrompt(payload.prompt_key);

  // 2. Load required data (if configured)
  const loaderContext = {
    userId: user?.id ?? 'anonymous',
    userEmail: user?.email ?? 'anonymous',
    supabaseClient: serviceClient,
    variables: payload.variables ?? {}
  };
  const loadedData = await loadAllData(promptConfig.requiredLoaders ?? [], loaderContext);

  // 3. Build messages with template interpolation
  const templateContext = { ...loadedData, ...payload.variables };
  const userPrompt = interpolate(promptConfig.userPromptTemplate, templateContext);

  // 4. Call OpenAI
  const result = await complete([
    { role: 'system', content: promptConfig.systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    model: payload.options?.model ?? promptConfig.defaults.model,
    temperature: payload.options?.temperature ?? promptConfig.defaults.temperature,
    maxTokens: payload.options?.max_tokens ?? promptConfig.defaults.maxTokens,
    responseFormat: promptConfig.responseFormat === 'json' ? 'json_object' : 'text'
  });

  return new Response(JSON.stringify({
    success: true,
    data: {
      content: result.content,
      model: result.model,
      usage: result.usage
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
```

---

## Shared Utilities Library

### 1. BubbleSyncService (bubbleSync.ts)

**Core Responsibility**: Atomic Write-Read-Write pattern for data sync

**Pattern**:
```
1. Create in Bubble (source of truth)
2. Fetch full data from Bubble Data API
3. Sync to Supabase (replica)
4. Return synced data to client
```

**Key Methods**:
```typescript
// Trigger workflow and extract ID
async triggerWorkflow(workflowName: string, params: Record<string, any>): Promise<string>

// Fetch object from Bubble Data API
async fetchBubbleObject(objectType: string, objectId: string): Promise<any>

// Sync data to Supabase
async syncToSupabase(tableName: string, data: Record<string, any>): Promise<void>

// Atomic: Create + Fetch + Sync
async createAndSync(
  workflowName: string,
  params: Record<string, any>,
  bubbleObjectType: string,
  supabaseTable: string
): Promise<any>

// Workflow only (no sync)
async triggerWorkflowOnly(workflowName: string, params: Record<string, any>): Promise<string>
```

**Initialization**:
```typescript
const syncService = new BubbleSyncService(
  bubbleBaseUrl,           // from Deno.env
  bubbleApiKey,            // from Deno.env
  supabaseUrl,             // from Deno.env
  supabaseServiceKey       // from Deno.env (bypasses RLS)
);
```

### 2. Error Handling (errors.ts)

**Custom Error Classes**:
```typescript
// Bubble API failures
class BubbleApiError extends Error {
  constructor(message, statusCode = 500, bubbleResponse?)
}

// Supabase sync failures
class SupabaseSyncError extends Error {
  constructor(message, originalError?)
}

// Input validation failures
class ValidationError extends Error {
  constructor(message)
}

// Authentication failures (401)
class AuthenticationError extends Error {
  constructor(message = 'Unauthorized')
}

// OpenAI API failures
class OpenAIError extends Error {
  constructor(message, statusCode = 500, openaiResponse?)
}
```

**Status Code Mapping**:
```typescript
export function getStatusCodeFromError(error: Error): number {
  if (error instanceof BubbleApiError) return error.statusCode;
  if (error instanceof AuthenticationError) return 401;
  if (error instanceof ValidationError) return 400;
  if (error instanceof OpenAIError) return error.statusCode;
  return 500;  // default
}
```

**Response Formatting**:
```typescript
// All errors return consistent format
export function formatErrorResponse(error: Error) {
  return {
    success: false,
    error: error.message || 'An error occurred'
  };
}
```

### 3. Validation (validation.ts)

**Validation Functions**:
```typescript
// Validate email format (throws on invalid)
validateEmail(email: string): void

// Validate US phone format (throws on invalid)
validatePhone(phone: string): void

// Validate required field exists
validateRequired(value: any, fieldName: string): void

// Validate multiple required fields
validateRequiredFields(obj, ['field1', 'field2']): void

// Validate action is in allowed list
validateAction(action: string, allowedActions: string[]): void
```

**Pattern**: All throw `ValidationError` immediately on failure

### 4. Type Definitions (types.ts)

**Key Interfaces**:
```typescript
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
}

interface AuthResponse {
  success: boolean;
  user_id?: string;
  token?: string;
  expires?: number;
  error?: string;
}
```

### 5. CORS Configuration (cors.ts)

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};
```

**Usage in Every Function**:
```typescript
// CORS preflight handling
if (req.method === 'OPTIONS') {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// All responses include CORS headers
return new Response(JSON.stringify(data), {
  status: 200,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

### 6. OpenAI Wrapper (openai.ts)

```typescript
// Non-streaming completion
async function complete(
  messages: ChatMessage[],
  options: CompletionOptions
): Promise<CompletionResult>

// Streaming completion
async function stream(
  messages: ChatMessage[],
  options: CompletionOptions
): Promise<ReadableStream>
```

### 7. AI Types (aiTypes.ts)

**Prompt Configuration Registry**:
```typescript
interface PromptConfig {
  key: string;                    // Unique prompt identifier
  name: string;
  description: string;

  systemPrompt: string;           // System instruction
  userPromptTemplate: string;     // Supports {{variable}} interpolation

  defaults: {
    model: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
    temperature: number;
    maxTokens: number;
  };

  requiredLoaders?: string[];     // Data loaders to inject data
  responseFormat?: 'text' | 'json';
  jsonSchema?: Record<string, unknown>;
}

interface DataLoader {
  key: string;
  name: string;
  load: (context: DataLoaderContext) => Promise<Record<string, unknown>>;
}

interface DataLoaderContext {
  userId: string;
  userEmail: string;
  supabaseClient: SupabaseClient;
  variables: Record<string, unknown>;
}
```

---

## Handler Organization Patterns

### Pattern 1: Synchronous Data Handler
**Example**: `favorites.ts`

```typescript
export async function handleFavorites(
  payload: FavoritesPayload
): Promise<{ success: boolean; favorites: string[] }> {
  // 1. Validate input
  validateRequiredFields(payload, ['userId', 'listingId', 'action']);

  // 2. Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 3. Fetch current state
  const { data: userData } = await supabase
    .from('user')
    .select('"Favorited Listings"')
    .eq('_id', userId)
    .single();

  // 4. Transform data
  const currentFavorites = userData?.['Favorited Listings'] || [];
  const updatedFavorites = action === 'add'
    ? [...currentFavorites, listingId]
    : currentFavorites.filter(id => id !== listingId);

  // 5. Update database
  await supabase.rpc('update_user_favorites', {
    p_user_id: userId,
    p_favorites: updatedFavorites
  });

  return { success: true, favorites: updatedFavorites };
}
```

### Pattern 2: Workflow Orchestration Handler
**Example**: `listing.ts` (bubble-proxy)

```typescript
export async function handleListingCreate(
  syncService: BubbleSyncService,
  payload: Record<string, any>,
  user: User
): Promise<any> {
  // Step 1: Validate
  validateRequiredFields(payload, ['listing_name']);

  // Step 2: Create in Bubble (REQUIRED)
  const listingId = await syncService.triggerWorkflow(
    'listing_creation_in_code',
    { listing_name: payload.listing_name.trim() }
  );

  // Step 3: Fetch full data (REQUIRED for complete response)
  let listingData: any;
  try {
    listingData = await syncService.fetchBubbleObject('Listing', listingId);
  } catch (error) {
    // Fallback if fetch fails
    return { _id: listingId, listing_id: listingId, Name: payload.listing_name };
  }

  // Step 4: Sync to Supabase (BEST EFFORT - don't fail)
  try {
    await syncService.syncToSupabase('listing', { ...listingData, _id: listingId });
  } catch (error) {
    console.error('Sync failed, continuing...', error);
  }

  return listingData;
}
```

### Pattern 3: Multi-Step Auth Handler
**Example**: `signup.ts` (bubble-auth-proxy)

```typescript
export async function handleSignup(
  bubbleAuthBaseUrl: string,
  bubbleApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  // Step 1: Validate
  validateRequiredFields(payload, ['email', 'password', 'retype']);

  // Step 2: Call Bubble (REQUIRED)
  const bubbleResponse = await fetch(`${bubbleAuthBaseUrl}/wf/signup-user`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${bubbleApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!bubbleResponse.ok) {
    throw new BubbleApiError('Signup failed', bubbleResponse.status);
  }

  const bubbleData = await bubbleResponse.json();

  // Step 3: Create Supabase Auth user (BEST EFFORT)
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    await supabase.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true
    });
  } catch (error) {
    console.error('Auth user creation failed', error);
  }

  // Step 4: Create user profile (REQUIRED)
  await supabase.from('user').upsert({
    _id: bubbleData.user_id,
    email: payload.email,
    // ...additional data
  });

  return {
    token: bubbleData.token,
    user_id: bubbleData.user_id,
    expires: bubbleData.expires
  };
}
```

### Pattern 4: AI Gateway Handler
**Example**: `complete.ts` (ai-gateway)

```typescript
export async function handleComplete(context: HandlerContext): Promise<Response> {
  // Step 1: Get prompt config from registry
  const promptConfig = getPrompt(context.request.payload.prompt_key);

  // Step 2: Load required data
  const loaderContext = {
    userId: context.user?.id ?? 'anonymous',
    supabaseClient: context.serviceClient,
    variables: context.request.payload.variables ?? {}
  };
  const loadedData = await loadAllData(promptConfig.requiredLoaders ?? [], loaderContext);

  // Step 3: Interpolate templates
  const templateContext = { ...loadedData, ...context.request.payload.variables };
  const userPrompt = interpolate(promptConfig.userPromptTemplate, templateContext);

  // Step 4: Call OpenAI
  const result = await complete([
    { role: 'system', content: promptConfig.systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    model: context.request.payload.options?.model ?? promptConfig.defaults.model,
    temperature: context.request.payload.options?.temperature ?? promptConfig.defaults.temperature,
    maxTokens: context.request.payload.options?.max_tokens ?? promptConfig.defaults.maxTokens,
    responseFormat: promptConfig.responseFormat === 'json' ? 'json_object' : 'text'
  });

  // Step 5: Return formatted response
  return new Response(JSON.stringify({
    success: true,
    data: {
      content: result.content,
      model: result.model,
      usage: result.usage
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
```

---

## Key Design Principles

### 1. NO FALLBACK PRINCIPLE

**Definition**: Real data or nothing. No fallback mechanisms, hardcoded values, or workarounds.

**Correct**:
```typescript
if (!data) {
  throw new BubbleApiError('Data not found', 404);
}
return data;
```

**WRONG**:
```typescript
if (!data) {
  return { fallback: 'default value' };  // NO!
}
```

**Application**:
- Validation failures throw immediately
- Errors propagate, not hidden
- No auto-retry or fallback logic
- No demo data or hardcoded values

### 2. Atomic Operations

**Write-Read-Write Pattern**:
1. Create in Bubble (source of truth)
2. Fetch full data from Bubble API
3. Sync to Supabase (replica)
4. Return synced data to client

**Benefit**: Ensures Supabase replica stays in sync with Bubble source

### 3. Action-Based Routing

**Every request structure**:
```json
{
  "action": "operation_name",
  "payload": { /* action-specific data */ }
}
```

**Benefit**: Standardized routing, easy to understand dispatch logic

### 4. Authentication Flexibility

**Pattern**:
- Define which actions require authentication
- Optional auth: Check header, create guest if missing
- Required auth: Throw if missing
- Per-prompt auth (ai-gateway): Check prompt config

**Benefit**: Supports public endpoints AND authenticated operations

### 5. Service Layering

**Separation of concerns**:
- **Router** (index.ts): Request parsing, auth, dispatch
- **Handlers**: Business logic for specific action
- **Services**: Shared utilities (BubbleSyncService, validation, errors)

**Benefit**: Testable, maintainable, composable

---

## Handler File Structure

**Standard Handler Template**:
```typescript
/**
 * Action Handler
 *
 * Description of what this handler does
 * Key workflow steps if complex
 */

import { /* required imports */ } from '../../_shared/..';

interface ActionPayload {
  field1: string;
  field2?: number;
}

export async function handleAction(
  syncService: BubbleSyncService,  // or other services
  payload: ActionPayload,
  user: User                        // if auth required
): Promise<any> {
  console.log('[Action Handler] ========== ACTION NAME ==========');
  console.log('[Action Handler] Payload:', payload);

  // 1. Validate
  validateRequiredFields(payload, ['field1']);

  // 2. Core business logic
  // ...

  // 3. Return result
  console.log('[Action Handler] ========== SUCCESS ==========');
  return result;
}
```

---

## Configuration & Secrets

**Required Secrets** (in Supabase Dashboard):
- `BUBBLE_API_BASE_URL` - Bubble API endpoint
- `BUBBLE_API_KEY` - Bubble authentication
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin operations (bypasses RLS)
- `OPENAI_API_KEY` - OpenAI API access
- `SLACK_WEBHOOK_*` - Slack integration webhooks

**Environment Variables** (injected by Supabase):
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Public anonymous key

**Function Configuration** (config.toml):
```toml
[functions.bubble-proxy]
enabled = true
verify_jwt = false                    # Functions handle auth themselves
import_map = "./functions/bubble-proxy/deno.json"
entrypoint = "./functions/bubble-proxy/index.ts"
```

---

## Response Format Standardization

**Success Response**:
```json
{
  "success": true,
  "data": { /* handler-specific result */ }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

**HTTP Status Codes**:
- `200` - Success
- `400` - ValidationError
- `401` - AuthenticationError
- `500` - Default / SupabaseSyncError
- Variable - BubbleApiError (preserves original status)

---

## Adding New Handlers

### To bubble-proxy:
1. Create file: `supabase/functions/bubble-proxy/handlers/newHandler.ts`
2. Export function: `export async function handleNewAction(...)`
3. Import in index.ts: `import { handleNewAction } from './handlers/newHandler.ts'`
4. Add action to `allowedActions` array
5. Add case to switch statement in router
6. If public: Add to `PUBLIC_ACTIONS` array

### To new function:
1. Create directory: `supabase/functions/new-function/`
2. Create `index.ts` with `Deno.serve()` handler
3. Create `deno.json` for imports (optional)
4. Add config to `config.toml`
5. Deploy with CLI

---

## Testing & Debugging

**Local Development**:
```bash
supabase start                          # Start local Supabase
supabase functions serve                # Serve functions locally
supabase functions logs function-name   # View logs
```

**Request Example**:
```bash
curl -X POST http://localhost:54321/functions/v1/bubble-proxy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "action": "create_listing",
    "payload": {
      "listing_name": "My Apartment"
    }
  }'
```

---

## Architecture Strengths

1. **Consistency** - All functions follow same routing pattern
2. **Clarity** - Switch statement makes dispatch explicit
3. **Flexibility** - Easy to add new actions to existing functions
4. **Reusability** - Shared services avoid duplication
5. **Testability** - Handlers are pure functions with clear inputs/outputs
6. **Error Handling** - Centralized error classes and response formatting
7. **Observability** - Detailed console logging at each step

---

## Architecture Weaknesses / Considerations

1. **Switch Statement Scalability** - Very large functions may get unwieldy with 20+ cases
   - Mitigation: Split into sub-functions by domain

2. **Handler Signature Variety** - Some handlers take syncService, others don't
   - Mitigation: Document required parameters clearly

3. **Import Complexity** - Each new handler requires import statement
   - Mitigation: Use barrel exports in handlers/index.ts

4. **Testing** - Handlers are integration tests, hard to unit test
   - Mitigation: Extract core logic to utilities, test separately

---

## Example: Complete Request-Response Flow

### Request
```json
{
  "action": "create_listing",
  "payload": {
    "listing_name": "Downtown Studio"
  }
}
```

### Processing
1. `bubble-proxy/index.ts` receives POST request
2. Parse body: `{action: 'create_listing', payload: {...}}`
3. Check action in `allowedActions` ✓
4. Check if public action: YES (no auth required)
5. Initialize `BubbleSyncService` with secrets
6. Route: `case 'create_listing'` → `handleListingCreate()`
7. Handler validates: `listing_name` present ✓
8. Handler calls: `syncService.triggerWorkflow('listing_creation_in_code', {...})`
9. Bubble workflow returns: `{id: 'abc123'}`
10. Handler calls: `syncService.fetchBubbleObject('Listing', 'abc123')`
11. Bubble returns: `{_id: 'abc123', Name: 'Downtown Studio', ...}`
12. Handler tries: `syncService.syncToSupabase('listing', {...})`
13. Sync succeeds: Data replicated to Supabase
14. Handler returns: `{_id: 'abc123', Name: 'Downtown Studio', ...}`
15. Router wraps: `{success: true, data: {...}}`
16. Response sent: HTTP 200 + CORS headers

### Response
```json
{
  "success": true,
  "data": {
    "_id": "abc123",
    "Name": "Downtown Studio",
    "Address": "...",
    "...": "..."
  }
}
```

---

## Related Files

Key architecture files referenced throughout this analysis:

- `/supabase/functions/bubble-proxy/index.ts` - Main router
- `/supabase/functions/bubble-auth-proxy/index.ts` - Auth router
- `/supabase/functions/ai-gateway/index.ts` - AI router
- `/supabase/functions/_shared/bubbleSync.ts` - Core sync service
- `/supabase/functions/_shared/errors.ts` - Error handling
- `/supabase/functions/_shared/validation.ts` - Input validation
- `/supabase/functions/_shared/types.ts` - TypeScript types
- `/supabase/CLAUDE.md` - Supabase documentation (detailed)
- `/CLAUDE.md` - Root project documentation

---

**DOCUMENT_VERSION**: 1.0
**STATUS**: Analysis Complete
**NEXT_STEPS**: Ready for implementation of new functions or handlers

