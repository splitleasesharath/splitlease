# Supabase Edge Functions Architectural Analysis

**Generated**: 2026-01-04
**Scope**: Complete analysis of `supabase/functions/` directory structure, patterns, and opportunities

---

## Executive Summary

The Supabase Edge Functions codebase follows a well-documented **action-based routing pattern** with **queue-based sync** to Bubble.io. The architecture demonstrates strong adherence to the **NO FALLBACK PRINCIPLE** and uses consolidated error reporting via Slack. However, there are notable inconsistencies in handler signatures, varying levels of abstraction, and opportunities for more functional composition.

---

## 1. Function Organization

### 1.1 Directory Structure

```
supabase/functions/
├── _shared/                    # Shared utilities (9 files)
├── ai-gateway/                 # AI/OpenAI proxy with prompt templating
│   ├── handlers/               # complete.ts, stream.ts
│   └── prompts/                # Registry + prompt definitions
├── auth-user/                  # Authentication (Supabase Auth native)
│   └── handlers/               # login, signup, logout, validate, password reset
├── bubble_sync/                # Queue processor (Supabase -> Bubble)
│   ├── handlers/               # processQueue, syncSingle, retry, cleanup, etc.
│   └── lib/                    # bubbleDataApi, queueManager, fieldMapping, etc.
├── listing/                    # Listing CRUD
│   └── handlers/               # create, get, delete, submit, createMockupProposal
├── messages/                   # Real-time messaging
│   └── handlers/               # sendMessage, getMessages, sendGuestInquiry
├── proposal/                   # Proposal CRUD
│   ├── actions/                # create, update, get, suggest (NOTE: "actions" not "handlers")
│   └── lib/                    # calculations, validators, status, types, bubbleSyncQueue
├── send-email/                 # SendGrid email
│   ├── handlers/               # send
│   └── lib/                    # sendgridClient, templateProcessor, types
├── send-sms/                   # Twilio SMS
│   └── lib/                    # twilioClient, types
├── virtual-meeting/            # Virtual meeting scheduling
│   ├── handlers/               # accept, decline, delete, sendCalendarInvite, etc.
│   └── lib/                    # validators, types
├── workflow-enqueue/           # Workflow queue entry
├── workflow-orchestrator/      # Workflow processing
│   └── lib/                    # types
├── ai-parse-profile/           # AI profile parsing
├── ai-signup-guest/            # AI-powered guest signup
├── communications/             # Placeholder
├── pricing/                    # Placeholder
├── slack/                      # Slack integration
└── cohost-request-slack-callback/  # Slack interactive callback
```

### 1.2 Naming Inconsistencies

| Function | Handler Directory | Notes |
|----------|-------------------|-------|
| `proposal` | `actions/` | Unique - uses "actions" instead of "handlers" |
| `listing` | `handlers/` | Standard pattern |
| `auth-user` | `handlers/` | Standard pattern |
| `messages` | `handlers/` | Standard pattern |
| `bubble_sync` | `handlers/` + `lib/` | Standard pattern |
| `virtual-meeting` | `handlers/` + `lib/` | Standard pattern |

**Recommendation**: Standardize on `handlers/` for all functions to maintain consistency.

---

## 2. Shared Utilities (`_shared/`)

### 2.1 Available Utilities

| File | Purpose | Exports |
|------|---------|---------|
| `cors.ts` | CORS headers | `corsHeaders` object |
| `errors.ts` | Error classes + formatters | `BubbleApiError`, `SupabaseSyncError`, `ValidationError`, `AuthenticationError`, `OpenAIError`, `formatErrorResponse()`, `getStatusCodeFromError()` |
| `validation.ts` | Input validation | `validateEmail()`, `validatePhone()`, `validatePhoneE164()`, `validateRequired()`, `validateRequiredFields()`, `validateAction()` |
| `slack.ts` | Slack webhooks + error collection | `sendToSlack()`, `sendInteractiveMessage()`, `updateSlackMessage()`, `ErrorCollector`, `createErrorCollector()` |
| `bubbleSync.ts` | Atomic sync service (Write-Read-Write) | `BubbleSyncService` class |
| `queueSync.ts` | Queue-based async sync | `enqueueBubbleSync()`, `enqueueSingleItem()`, `triggerQueueProcessing()`, `enqueueSignupSync()`, `filterBubbleIncompatibleFields()` |
| `types.ts` | Shared TypeScript interfaces | `BubbleWorkflowResponse`, `EdgeFunctionRequest`, `EdgeFunctionResponse`, `User`, etc. |
| `aiTypes.ts` | AI-specific types | `AIGatewayRequest`, `PromptConfig`, `DataLoader`, etc. |
| `jsonUtils.ts` | JSON parsing utilities | Helper functions for JSON manipulation |
| `junctionHelpers.ts` | Junction table dual-write | `addUserProposal()`, `addUserListingFavorite()`, `addThreadMessage()`, etc. |
| `messagingHelpers.ts` | Messaging utilities | Thread/message helpers |
| `geoLookup.ts` | Geo lookup utilities | Location-based helpers |

### 2.2 Usage Patterns

**Highly Consistent:**
- `corsHeaders` - Used identically in all index files
- `formatErrorResponse()` + `getStatusCodeFromError()` - Used in all error handling
- `createErrorCollector()` - Used in all functions for Slack error reporting
- `validateAction()` - Used in all functions with action routing

**Inconsistent Usage:**
- Some functions import `validateRequiredFields()`, others use `validateRequired()` individually
- `bubbleSync.ts` (BubbleSyncService) is only used in bubble-proxy handlers, while most functions use `queueSync.ts`

---

## 3. Action Pattern Implementation

### 3.1 Standard Pattern

All functions follow this structure in their `index.ts`:

```typescript
// 1. CORS preflight handling
if (req.method === 'OPTIONS') {
  return new Response(null/ok, { status: 200, headers: corsHeaders });
}

// 2. Method validation (POST only)
if (req.method !== 'POST') {
  return new Response({ error: 'Method not allowed' }, { status: 405 });
}

// 3. Parse request body
const body: RequestBody = await req.json();

// 4. Validate action
validateRequired(body.action, "action");
validateAction(body.action, [...ALLOWED_ACTIONS]);

// 5. Create error collector
collector = createErrorCollector('function-name', body.action);

// 6. Authentication (if required for action)
// ...varies by function...

// 7. Route to handler via switch statement
switch (body.action) {
  case "action1": result = await handleAction1(...); break;
  case "action2": result = await handleAction2(...); break;
  // ...
}

// 8. Return success response
return new Response({ success: true, data: result }, { status: 200 });

// 9. Error handling with Slack reporting
catch (error) {
  collector.add(error, 'Fatal error');
  collector.reportToSlack();
  return new Response({ success: false, error: error.message }, { status: getStatusCodeFromError(error) });
}
```

### 3.2 Variations in Implementation

| Function | Payload Validation | Auth Check | Handler Signature |
|----------|-------------------|------------|-------------------|
| `auth-user` | `validateRequiredFields(body, ['action'])` | None (these ARE auth endpoints) | `handler(supabaseUrl, serviceKey, payload)` |
| `proposal` | `validateRequired(action)` + `validateRequired(payload)` | Conditional by action | `handler(payload, user, supabase)` |
| `listing` | `validateRequired(action)` + `validateRequired(payload)` | Conditional by action | `handler(payload)` - creates own client |
| `messages` | `validateRequiredFields(body, ['action'])` | Conditional by action | `handler(supabaseAdmin, payload, user)` |
| `send-email` | `validateRequired(action)` + conditional payload | Bearer token check | `handler(payload)` |
| `bubble_sync` | Manual check | None (internal) | `handler(supabase, bubbleConfig, payload)` |
| `ai-gateway` | `validateRequired()` for action, payload, prompt_key | Conditional by prompt | Returns context object to handler |

---

## 4. Data Flow Patterns

### 4.1 Supabase-First with Queue-Based Bubble Sync (Current Standard)

```
Frontend Request
       │
       ▼
┌─────────────────────────────────────────┐
│           Edge Function                  │
│  1. Validate input                       │
│  2. Generate ID via generate_bubble_id() │
│  3. INSERT into Supabase (primary)       │
│  4. Enqueue to sync_queue                │
│  5. triggerQueueProcessing() (fire&forget)│
│  6. Return response immediately          │
└─────────────────────────────────────────┘
       │
       ▼ (async, non-blocking)
┌─────────────────────────────────────────┐
│        bubble_sync Function              │
│  (pg_cron every 5 min OR HTTP trigger)   │
│  1. Fetch pending items from sync_queue  │
│  2. Transform data for Bubble API        │
│  3. POST/PATCH/DELETE to Bubble Data API │
│  4. Mark as completed/failed             │
└─────────────────────────────────────────┘
```

**Used by**: `proposal/create`, `proposal/update`, `listing/create`, `auth-user/signup`, `virtual-meeting/*`

### 4.2 Atomic Sync (Legacy Pattern)

```
Frontend Request
       │
       ▼
┌─────────────────────────────────────────┐
│         Edge Function                    │
│  BubbleSyncService.createAndSync()       │
│  1. POST to Bubble Workflow API          │
│  2. Fetch from Bubble Data API           │
│  3. UPSERT to Supabase                   │
│  4. Return response                      │
└─────────────────────────────────────────┘
```

**Used by**: `bubble-proxy` handlers (legacy), `listing/submit`

### 4.3 Data Flow Summary by Function

| Function | Read From | Write To | Sync Method |
|----------|-----------|----------|-------------|
| `auth-user/signup` | - | Supabase Auth + public.user | Queue-based |
| `auth-user/login` | Supabase Auth | - | None |
| `proposal/create` | Supabase (listing, user) | Supabase (proposal) | Queue-based |
| `proposal/update` | Supabase (proposal) | Supabase (proposal) | Queue-based |
| `listing/create` | Supabase (user) | Supabase (listing) | Queue-based |
| `listing/get` | Bubble Data API | - | None |
| `messages/send` | Supabase (threads, users) | Supabase (messages) | None |
| `virtual-meeting/*` | Supabase | Supabase | Queue-based |

---

## 5. Error Handling Patterns

### 5.1 Error Classes

| Class | HTTP Status | Use Case |
|-------|-------------|----------|
| `ValidationError` | 400 | Invalid input, missing fields |
| `AuthenticationError` | 401 | Missing/invalid auth token |
| `BubbleApiError` | Variable (from Bubble) | Bubble API failures |
| `SupabaseSyncError` | 500 | Supabase write failures |
| `OpenAIError` | Variable (from OpenAI) | AI operation failures |

### 5.2 Error Collection Pattern

All functions implement consolidated error reporting:

```typescript
// Create collector after action is known
collector = createErrorCollector('function-name', action);

// Set user context if available
if (user) collector.setContext({ userId: user.id });

// In catch block
collector.add(error, 'Context description');
collector.reportToSlack();  // Fire-and-forget
```

**Principle**: ONE RUN = ONE LOG (consolidated Slack notification)

### 5.3 Non-Blocking Error Patterns

```typescript
// For non-critical operations (e.g., Bubble sync queue)
try {
  await enqueueBubbleSync(supabase, {...});
} catch (syncError) {
  // Log but don't fail main operation
  console.error('[function] Failed to enqueue (non-blocking):', syncError);
}
```

---

## 6. Identified Inconsistencies

### 6.1 Handler Signature Inconsistency

| Pattern | Functions Using |
|---------|-----------------|
| `handler(payload)` | listing/create, listing/get, listing/delete |
| `handler(payload, user, supabase)` | proposal/* |
| `handler(supabase, payload, user)` | messages/* |
| `handler(supabaseAdmin, payload, user)` | messages/* (duplicate pattern) |
| `handler(supabaseUrl, supabaseKey, payload)` | auth-user/* |
| `handler(supabase, bubbleConfig, payload)` | bubble_sync/* |

**Recommendation**: Standardize on `handler(payload, context)` where context contains `{ supabase, user?, config? }`.

### 6.2 Directory Naming

- `proposal/` uses `actions/` directory
- All others use `handlers/` directory

### 6.3 Supabase Client Creation

| Pattern | Location | Usage |
|---------|----------|-------|
| Created in index.ts, passed to handler | proposal, messages | Cleaner |
| Created inside handler | listing/create, send-email | Duplicated logic |

### 6.4 Import Patterns

```typescript
// Pattern 1: Direct import from shared
import { enqueueBubbleSync } from "../../_shared/queueSync.ts";

// Pattern 2: Re-export through local lib
import { enqueueBubbleSync } from "../lib/bubbleSyncQueue.ts";  // proposal only
```

### 6.5 Authentication Validation

| Function | Auth Method |
|----------|-------------|
| proposal | `supabase.auth.getUser()` with anon key client |
| messages | `supabase.auth.getUser()` with anon key client |
| send-email | Bearer token presence check only |
| listing | Trust auth header for submit, no validation |
| bubble_sync | None (internal service) |
| ai-gateway | `supabase.auth.getUser()` for non-public prompts |

---

## 7. Code Duplication Opportunities

### 7.1 Supabase Client Initialization

**Duplicated in**: Almost every index.ts and some handlers

```typescript
// This pattern is repeated 10+ times
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
```

**Recommendation**: Create `_shared/supabaseClient.ts`:
```typescript
export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

### 7.2 Environment Variable Validation

**Duplicated in**: Every function

```typescript
// Pattern repeated in all functions
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables');
}
```

**Recommendation**: Create `_shared/config.ts`:
```typescript
export function getRequiredEnv(...keys: string[]): Record<string, string> {
  const missing = keys.filter(k => !Deno.env.get(k));
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`);
  return Object.fromEntries(keys.map(k => [k, Deno.env.get(k)!]));
}
```

### 7.3 User Authentication Validation

**Duplicated in**: proposal, messages, ai-gateway (with slight variations)

```typescript
// Pattern repeated with minor variations
const authHeader = req.headers.get("Authorization");
if (!authHeader) {
  throw new AuthenticationError("Missing Authorization header");
}
const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } },
});
const { data: { user }, error } = await authClient.auth.getUser();
if (error || !user) {
  throw new AuthenticationError("Invalid or expired token");
}
```

**Recommendation**: Create `_shared/auth.ts`:
```typescript
export async function authenticateRequest(req: Request): Promise<User | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  // ... validation logic
}
```

---

## 8. Mixed Responsibilities

### 8.1 `proposal/actions/create.ts`

This 563-line file handles:
1. Input validation
2. Fetching listing, guest, host data
3. Early profile save (before proposal creation)
4. Pricing calculations
5. Status determination
6. ID generation
7. Proposal record creation
8. Guest user update
9. Junction table writes
10. Host user update
11. Bubble sync enqueue

**Recommendation**: Extract into:
- `lib/dataFetcher.ts` - fetch related entities
- `lib/proposalBuilder.ts` - build proposal data object
- `lib/userUpdater.ts` - update guest/host records

### 8.2 `auth-user/handlers/signup.ts`

This 333-line file handles:
1. Input validation
2. Duplicate email check (public.user)
3. Duplicate email check (Supabase Auth)
4. ID generation
5. Supabase Auth user creation
6. Session token generation
7. Database record insertion
8. Bubble sync enqueue

**Recommendation**: Extract authentication flow into `lib/authFlow.ts`.

---

## 9. Functional Composition Opportunities

### 9.1 Compose Database Operations

```typescript
// Current: Manual error handling in each operation
const { data, error } = await supabase.from('table').select().eq('_id', id);
if (error) throw new SupabaseSyncError(`Failed: ${error.message}`);

// Proposed: Composable wrapper
const data = await dbGet(supabase, 'table', id);  // Throws on error
```

### 9.2 Compose Validation

```typescript
// Current: Sequential validation calls
validateRequired(body.action, "action");
validateRequired(body.payload, "payload");
validateAction(body.action, ALLOWED_ACTIONS);

// Proposed: Composable pipeline
const validated = validateRequest(body)
  .required('action')
  .required('payload')
  .oneOf('action', ALLOWED_ACTIONS)
  .result();  // Throws ValidationError with all issues
```

### 9.3 Compose Sync Operations

```typescript
// Current: Manual try-catch wrapping
try {
  await enqueueBubbleSync(...);
  triggerQueueProcessing();
} catch (e) {
  console.error('Non-blocking:', e);
}

// Proposed: Fire-and-forget wrapper
nonBlocking(() => enqueueBubbleSync(...))
  .then(() => triggerQueueProcessing());
```

---

## 10. Recommendations Summary

### High Priority

1. **Standardize handler signatures** to `handler(payload, context)` pattern
2. **Rename** `proposal/actions/` to `proposal/handlers/` for consistency
3. **Extract** Supabase client creation to `_shared/supabaseClient.ts`
4. **Extract** auth validation to `_shared/auth.ts`
5. **Extract** environment variable validation to `_shared/config.ts`

### Medium Priority

6. **Refactor** `proposal/actions/create.ts` to separate concerns
7. **Refactor** `auth-user/handlers/signup.ts` to separate concerns
8. **Create** composable database operation wrappers
9. **Create** composable validation pipeline

### Low Priority (Future)

10. **Deprecate** `bubbleSync.ts` (BubbleSyncService) in favor of queue-based sync
11. **Unify** authentication patterns across all functions
12. **Add** type-safe config pattern for all functions

---

## 11. Files Referenced

### Shared Utilities
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/errors.ts`
- `supabase/functions/_shared/validation.ts`
- `supabase/functions/_shared/slack.ts`
- `supabase/functions/_shared/bubbleSync.ts`
- `supabase/functions/_shared/queueSync.ts`
- `supabase/functions/_shared/types.ts`
- `supabase/functions/_shared/junctionHelpers.ts`

### Function Index Files
- `supabase/functions/auth-user/index.ts`
- `supabase/functions/proposal/index.ts`
- `supabase/functions/listing/index.ts`
- `supabase/functions/messages/index.ts`
- `supabase/functions/bubble_sync/index.ts`
- `supabase/functions/ai-gateway/index.ts`
- `supabase/functions/send-email/index.ts`

### Handler Examples
- `supabase/functions/proposal/actions/create.ts`
- `supabase/functions/proposal/actions/update.ts`
- `supabase/functions/listing/handlers/create.ts`
- `supabase/functions/auth-user/handlers/signup.ts`
- `supabase/functions/bubble_sync/handlers/processQueueDataApi.ts`
- `supabase/functions/virtual-meeting/handlers/accept.ts`

### Documentation
- `supabase/CLAUDE.md`

---

**Analysis Complete**: This document provides a comprehensive view of the Edge Functions architecture with specific recommendations for standardization and improvement.
