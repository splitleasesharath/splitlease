# Supabase Backend - Comprehensive Analysis Report

**Generated**: 2026-01-04
**Purpose**: Complete documentation update for CLAUDE.md
**Scope**: Edge Functions, Shared Utilities, Migrations, Patterns

---

## Executive Summary

The Supabase backend has evolved significantly beyond what is documented in the existing `supabase/CLAUDE.md`. This analysis identifies **17 active Edge Functions** (up from 9 documented), **12 shared utilities** (up from 9 documented), and introduces **new architectural patterns** including workflow orchestration via pgmq and Slack interactive callbacks.

---

## 1. Directory Structure

```
supabase/
├── config.toml                    # Supabase local development configuration
├── seed.sql                       # Database seed file
├── functions/                     # Edge Functions directory
│   ├── _shared/                   # Shared utilities (12 files)
│   ├── ai-gateway/                # AI/OpenAI proxy with prompts
│   ├── ai-parse-profile/          # AI profile parsing from freeform text
│   ├── ai-signup-guest/           # AI signup flow for guests
│   ├── auth-user/                 # Authentication operations
│   ├── bubble_sync/               # Queue-based Bubble.io sync
│   ├── bubble-proxy/              # Legacy Bubble API proxy (deprecated)
│   ├── cohost-request/            # Co-host request management
│   ├── cohost-request-slack-callback/  # Slack interactive callbacks
│   ├── communications/            # Placeholder for future communications
│   ├── listing/                   # Listing CRUD operations
│   ├── messages/                  # Real-time messaging
│   ├── pricing/                   # Placeholder for pricing calculations
│   ├── proposal/                  # Proposal CRUD operations
│   ├── rental-application/        # Rental application handling
│   ├── send-email/                # Email sending via Resend
│   ├── send-sms/                  # SMS sending via Twilio
│   ├── slack/                     # Slack webhook integration
│   ├── virtual-meeting/           # Virtual meeting management
│   ├── workflow-enqueue/          # Workflow request validation/queueing
│   └── workflow-orchestrator/     # Workflow step execution
└── migrations/                    # SQL migrations (17 files)
```

---

## 2. Edge Functions (17 Total)

### 2.1 Core Business Functions

| Function | Actions | Auth Required | Purpose |
|----------|---------|---------------|---------|
| **auth-user** | login, signup, logout, validate, request_password_reset, update_password | No (auth endpoint) | Supabase Auth native login/signup |
| **proposal** | create, update, get, suggest | get/create: No; update: Yes | Proposal CRUD with Bubble queue sync |
| **listing** | create, get, submit, update | submit/update: Yes; others: No | Listing CRUD with Bubble queue sync |
| **messages** | send_message, get_messages, send_guest_inquiry | send/get: Yes; inquiry: No | Real-time messaging threads |
| **rental-application** | submit, get, upload | No (user_id in payload) | Rental application handling (Supabase only) |

### 2.2 AI-Powered Functions

| Function | Actions | Auth Required | Purpose |
|----------|---------|---------------|---------|
| **ai-gateway** | complete, stream | Public prompts: No; others: Yes | OpenAI proxy with prompt templating |
| **ai-signup-guest** | (no action pattern) | No | Bridge user creation to AI parsing |
| **ai-parse-profile** | queue, process, process_batch, queue_and_process | No | Parse freeform signup text via GPT-4 |

### 2.3 Communication Functions

| Function | Actions | Auth Required | Purpose |
|----------|---------|---------------|---------|
| **send-email** | send, send_template | No | Email sending via Resend API |
| **send-sms** | send | No | SMS sending via Twilio API |
| **slack** | faq_inquiry, diagnose | No | Slack webhook for FAQ inquiries |

### 2.4 Virtual Meeting & Co-Hosting

| Function | Actions | Auth Required | Purpose |
|----------|---------|---------------|---------|
| **virtual-meeting** | create, delete, accept, decline, send_calendar_invite, notify_participants | No (migration pending) | Virtual meeting lifecycle |
| **cohost-request** | create, rate, notify-host | No (migration pending) | Co-host request management |
| **cohost-request-slack-callback** | (Slack payload types) | No | Handle Slack button clicks and modal submissions |

### 2.5 Workflow Orchestration (NEW)

| Function | Actions | Auth Required | Purpose |
|----------|---------|---------------|---------|
| **workflow-enqueue** | enqueue, status, health | No | Validate and queue workflow requests |
| **workflow-orchestrator** | (triggered by pgmq) | No | Execute workflow steps sequentially |

### 2.6 Sync & Infrastructure

| Function | Actions | Auth Required | Purpose |
|----------|---------|---------------|---------|
| **bubble_sync** | process_queue, process_queue_data_api, sync_single, retry_failed, get_status, cleanup, build_request, sync_signup_atomic | No | Process sync_queue for Bubble sync |

### 2.7 Placeholder Functions

| Function | Actions | Purpose |
|----------|---------|---------|
| **communications** | health | Future: email, SMS, push, in-app |
| **pricing** | health | Future: pricing calculations |

### 2.8 Deprecated Functions

| Function | Status | Notes |
|----------|--------|-------|
| **bubble-proxy** | Removed from config.toml | Migrated to dedicated functions (cohost-request, virtual-meeting, etc.) |

---

## 3. Shared Utilities (_shared/)

### 3.1 Core Utilities (12 files)

| File | Exports | Purpose |
|------|---------|---------|
| **cors.ts** | `corsHeaders` | Standard CORS headers for all functions |
| **errors.ts** | `BubbleApiError`, `SupabaseSyncError`, `ValidationError`, `AuthenticationError`, `OpenAIError`, `formatErrorResponse()`, `getStatusCodeFromError()` | Custom error classes with HTTP status mapping |
| **validation.ts** | `validateEmail()`, `validatePhone()`, `validateRequired()`, `validateRequiredFields()`, `validateAction()` | Input validation utilities |
| **types.ts** | `EdgeFunctionRequest`, `BubbleWorkflowResponse`, `User`, etc. | General TypeScript interfaces |
| **slack.ts** | `ErrorCollector`, `sendToSlack()`, `createErrorCollector()` | Consolidated error reporting (ONE RUN = ONE LOG) |
| **bubbleSync.ts** | `BubbleSyncService` | Atomic sync: Write-Read-Write pattern |
| **queueSync.ts** | `enqueueBubbleSync()`, `enqueueSingleItem()`, `triggerQueueProcessing()`, `enqueueSignupSync()`, `filterBubbleIncompatibleFields()` | Queue-based async Bubble sync |
| **openai.ts** | `complete()`, `stream()` | OpenAI API wrapper for completions |
| **aiTypes.ts** | `AIGatewayRequest`, `PromptConfig`, `DataLoader`, etc. | AI-specific TypeScript types |
| **jsonUtils.ts** | JSON parsing/normalization helpers | JSON manipulation |
| **geoLookup.ts** | `lookupGeoData()` | Geographic data lookup |
| **junctionHelpers.ts** | `addUserListingFavoritesBatch()`, `setUserPreferredHoods()`, `setUserStorageItems()` | Junction table operations |
| **messagingHelpers.ts** | Messaging thread helpers | Thread creation, message formatting |

---

## 4. Action-Based Request Pattern

All Edge Functions (except Slack callback) follow a consistent pattern:

### Request Format
```json
{
  "action": "action_name",
  "payload": {
    "field1": "value1",
    "field2": "value2"
  }
}
```

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

### Standard Function Structure
```typescript
Deno.serve(async (req: Request) => {
  // 1. CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 2. Parse request
  const { action, payload } = await req.json();

  // 3. Validate action
  validateAction(action, ALLOWED_ACTIONS);

  // 4. Create error collector
  const collector = createErrorCollector('function-name', action);

  // 5. Authenticate if required
  if (!isPublicAction) {
    // ... auth logic
  }

  // 6. Route to handler
  switch (action) {
    case "action1": result = await handleAction1(payload); break;
    // ...
  }

  // 7. Return response
  return new Response(JSON.stringify({ success: true, data: result }));
});
```

---

## 5. Authentication Patterns

### Pattern 1: Public Actions
```typescript
const PUBLIC_ACTIONS = ["create", "get"] as const;
const isPublicAction = PUBLIC_ACTIONS.includes(action);

if (!isPublicAction) {
  // Require auth
}
```

### Pattern 2: Optional Auth
```typescript
const authHeader = req.headers.get('Authorization');
let user = null;
if (authHeader) {
  const { data: { user: authUser } } = await authClient.auth.getUser();
  user = authUser;
}
```

### Pattern 3: Required Auth
```typescript
if (!authHeader) {
  throw new AuthenticationError("Missing Authorization header");
}
const { data: { user: authUser }, error } = await authClient.auth.getUser();
if (error || !authUser) {
  throw new AuthenticationError("Invalid or expired token");
}
```

### Pattern 4: User ID from Payload (Legacy Support)
```typescript
// Supports both JWT and Bubble token users
const userId = jwtUserId || (payload.user_id as string);
if (!userId) {
  throw new AuthenticationError("User ID required");
}
```

---

## 6. Error Handling Patterns

### ErrorCollector Pattern (ONE RUN = ONE LOG)
```typescript
const collector = createErrorCollector('function-name', action);
collector.setContext({ userId: user.id });

try {
  // ... operation
} catch (error) {
  collector.add(error, 'context description');
  collector.reportToSlack();  // Fire-and-forget
  throw error;
}
```

### HTTP Status Mapping
| Error Class | HTTP Status |
|-------------|-------------|
| ValidationError | 400 |
| AuthenticationError | 401 |
| BubbleApiError | Variable |
| SupabaseSyncError | 500 |
| OpenAIError | Variable |
| Default | 500 |

---

## 7. CORS Configuration

All functions use this standard configuration:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};
```

All functions handle OPTIONS preflight:
```typescript
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

---

## 8. Database Migrations (17 Total)

### Sync Infrastructure
| Migration | Purpose |
|-----------|---------|
| 20251205_create_sync_queue_tables.sql | Create sync_queue table for Bubble sync |
| 20251209_extend_sync_queue_for_signup.sql | Add SIGNUP_ATOMIC operation |
| 20251209_fix_bubble_sync_payload_filtering.sql | Fix payload filtering |
| 20251209_listing_bubble_sync_backend.sql | Add Bubble sync columns to listing |
| 20251210_queue_processing_cron.sql | Setup pg_cron for sync processing |

### Workflow Orchestration (NEW)
| Migration | Purpose |
|-----------|---------|
| 20251213_create_workflow_definitions.sql | Named workflow configurations |
| 20251213_create_workflow_executions.sql | Workflow execution tracking |
| 20251213_enable_pgmq.sql | Enable pgmq extension |
| 20251213_seed_workflow_definitions.sql | Seed initial workflows |
| 20251213_workflow_cron_backup.sql | Backup cron for orchestrator |
| 20251213_workflow_immediate_trigger.sql | Immediate trigger via pg_net |

### Feature-Specific
| Migration | Purpose |
|-----------|---------|
| 20251214_create_get_email_template_function.sql | Email template lookup function |
| 20251214_create_notification_preferences.sql | User notification preferences |
| 20251217_add_message_foreign_keys.sql | Foreign keys for _message table |
| 20251219_add_1_night_rate_column.sql | 1-night base rate for listings |
| 20251221_add_6_night_rate_column.sql | 6-night rate for listings |

---

## 9. Workflow Orchestration System (NEW)

A significant addition not in current documentation.

### Architecture
```
┌─────────────────┐      ┌────────────────────┐      ┌──────────────────────┐
│  Frontend       │ ──→  │ workflow-enqueue   │ ──→  │ pgmq (workflow_queue)│
│  Request        │      │ (validate/queue)   │      │                      │
└─────────────────┘      └────────────────────┘      └──────────┬───────────┘
                                                                 │
                         ┌────────────────────────────────────────┘
                         ▼
              ┌──────────────────────┐
              │ workflow-orchestrator │ ◄─── Triggered by:
              │ (execute steps)       │      1. pg_net (immediate)
              └──────────┬───────────┘      2. pg_cron (every 30s backup)
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌─────────┐     ┌──────────┐     ┌─────────┐
   │send-email│     │send-sms  │     │ other   │
   └─────────┘     └──────────┘     │functions │
                                    └─────────┘
```

### Workflow Definition Structure
```json
{
  "name": "proposal_accepted",
  "steps": [
    {
      "name": "send_acceptance_email",
      "function": "send-email",
      "action": "send",
      "payload_template": {
        "to_email": "{{guest_email}}",
        "template_id": "proposal_accepted_template"
      },
      "on_failure": "continue"
    }
  ],
  "required_fields": ["proposal_id", "guest_email"]
}
```

### Dual Validation
1. **required_fields** - Explicit fields from definition
2. **template_variables** - All `{{placeholders}}` extracted from steps

---

## 10. Slack Integration Patterns

### Pattern 1: Webhook-Based (slack function)
```typescript
// Send to Slack channel via webhook
fetch(webhookUrl, {
  method: 'POST',
  body: JSON.stringify({ text: message })
});
```

### Pattern 2: Interactive Callbacks (cohost-request-slack-callback)
Handles Slack interactive components:
- `block_actions`: Button clicks open modals
- `view_submission`: Modal form submissions

```typescript
// Slack sends form-urlencoded data
const formData = await req.text();
const params = new URLSearchParams(formData);
const payload = JSON.parse(params.get('payload'));

switch (payload.type) {
  case 'block_actions':
    // Open modal via views.open
    break;
  case 'view_submission':
    // Process form data
    break;
}
```

---

## 11. Naming Conventions

### Function Names
- **kebab-case**: `ai-gateway`, `send-email`, `virtual-meeting`
- **snake_case** (legacy): `bubble_sync`
- **Descriptive**: Function name reflects primary purpose

### Handler Files
- Located in `handlers/` subdirectory
- Named by action: `create.ts`, `update.ts`, `sendMessage.ts`
- Export function named `handle<Action>`: `handleCreate`, `handleUpdate`

### Action Names
- **snake_case**: `send_message`, `get_status`, `process_queue`
- **Verb-first**: Describes the operation

### Environment Variables
- **SCREAMING_SNAKE_CASE**: `SUPABASE_URL`, `SLACK_WEBHOOK_ACQUISITION`
- **Prefixed by service**: `SLACK_*`, `BUBBLE_*`, `OPENAI_*`

---

## 12. Recent Changes & Patterns

### 12.1 bubble-proxy Deprecation
The `bubble-proxy` function has been removed from `config.toml`. Its functionality migrated to dedicated functions:
- `cohost-request`
- `virtual-meeting`
- `rental-application`

### 12.2 Workflow Orchestration Addition
Complete workflow system added via pgmq:
- `workflow-enqueue` for frontend requests
- `workflow-orchestrator` for step execution
- Dual trigger mechanism (immediate + backup cron)

### 12.3 Reference Table Schema Usage
Functions query `reference_table` schema for lookups:
```typescript
const schemaClient = createClient(supabaseUrl, serviceKey, {
  db: { schema: 'reference_table' }
});
await schemaClient.from('os_cohost_admins').select('*');
```

### 12.4 Inlined Dependencies Pattern
Some functions (slack, communications, pricing) inline shared utilities to avoid bundling issues:
```typescript
// ============ CORS Headers (from _shared/cors.ts) ============
const corsHeaders = { ... };
```

### 12.5 New Notification System
- `send-email` with Resend API
- `send-sms` with Twilio API
- `notification_preferences` table for user preferences
- `get_email_template` function for template lookup

---

## 13. Environment Variables

### Supabase (Auto-configured)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### External Services (Secrets)
- `BUBBLE_API_BASE_URL`
- `BUBBLE_API_KEY`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `SLACK_BOT_TOKEN`
- `SLACK_WEBHOOK_DATABASE_WEBHOOK`
- `SLACK_WEBHOOK_ACQUISITION`
- `SLACK_WEBHOOK_GENERAL`
- `ZAPIER_CALENDAR_WEBHOOK_URL`

---

## 14. Critical Notes for Documentation

### Day Indexing
JavaScript 0-based (Sun=0 to Sat=6). Database stores natively in this format.

### No Fallback Principle
All functions fail fast without fallback logic. Errors surface to client.

### JWT Verification Disabled
All functions have `verify_jwt = false` in config.toml. Functions handle their own auth.

### Queue-Based Sync
Supabase -> Bubble sync is async via `sync_queue` table, processed by `bubble_sync` function + cron.

### Bubble Source of Truth
Bubble.io remains primary database. Supabase is replica during migration.

---

## 15. Recommendations for CLAUDE.md Update

1. **Update Edge Function Count**: 9 -> 17
2. **Add Workflow Orchestration Section**: Document pgmq-based workflows
3. **Document Slack Interactive Callbacks**: New pattern not covered
4. **Add New Shared Utilities**: geoLookup, junctionHelpers, messagingHelpers
5. **Document send-email and send-sms**: New communication functions
6. **Note bubble-proxy Deprecation**: Removed from config
7. **Add New Migrations**: Workflow, notification, and pricing columns
8. **Document Reference Table Schema**: Used for lookups
9. **Add Environment Variables**: Resend, Twilio, Zapier

---

## 16. Files Referenced

### Edge Functions
- `c:/Users/Split Lease/Documents/Split Lease/supabase/functions/*/index.ts`

### Shared Utilities
- `c:/Users/Split Lease/Documents/Split Lease/supabase/functions/_shared/*.ts`

### Configuration
- `c:/Users/Split Lease/Documents/Split Lease/supabase/config.toml`

### Migrations
- `c:/Users/Split Lease/Documents/Split Lease/supabase/migrations/*.sql`

---

**Document Version**: 1.0
**Analysis Completed By**: Claude Opus 4.5
**Next Steps**: Update `supabase/CLAUDE.md` based on this analysis
