# Supabase Directory Comprehensive Exploration

**Generated**: 2025-12-18
**Purpose**: Comprehensive overview of the `/supabase` directory for README documentation

---

## Executive Summary

The Supabase backend consists of **17 Edge Functions**, **13 shared utilities**, **14 migrations**, and configuration files. The architecture follows a **queue-based sync pattern** between Supabase (replica) and Bubble.io (legacy source of truth), with a newer **workflow orchestration system** using pgmq.

---

## Directory Structure

```
supabase/
├── config.toml                    # Supabase local dev configuration
├── CLAUDE.md                      # LLM reference documentation
├── .gitignore
├── functions/                     # Edge Functions (Deno/TypeScript)
│   ├── _shared/                   # Shared utilities (13 files)
│   ├── ai-gateway/                # OpenAI proxy with prompt templating
│   ├── ai-parse-profile/          # AI profile parsing queue processor
│   ├── ai-signup-guest/           # AI-powered guest signup
│   ├── auth-user/                 # Authentication operations
│   ├── bubble-proxy/              # Legacy Bubble API proxy
│   ├── bubble_sync/               # Supabase→Bubble sync processor
│   ├── communications/            # Placeholder for future comms
│   ├── listing/                   # Listing CRUD
│   ├── messages/                  # Real-time messaging
│   ├── pricing/                   # Placeholder for pricing
│   ├── proposal/                  # Proposal CRUD
│   ├── rental-application/        # Rental application submissions
│   ├── send-email/                # SendGrid email integration
│   ├── send-sms/                  # Twilio SMS integration
│   ├── slack/                     # Slack integration
│   ├── virtual-meeting/           # Virtual meeting management
│   ├── workflow-enqueue/          # Workflow entry point
│   └── workflow-orchestrator/     # pgmq workflow processor
└── migrations/                    # Database migrations (14 files)
```

---

## Edge Functions (17 Total)

### Core Business Functions

| Function | Purpose | Actions | Auth Required |
|----------|---------|---------|---------------|
| `auth-user` | Authentication via Supabase Auth | login, signup, logout, validate, request_password_reset, update_password | No (is auth endpoint) |
| `proposal` | Proposal CRUD | create, update, get, suggest | get/create: No, others: Yes |
| `listing` | Listing CRUD | create, get, submit | submit: Yes, others: No |
| `messages` | Real-time messaging threads | send_message, get_messages, send_guest_inquiry | send_message/get_messages: Yes |
| `rental-application` | Rental application submissions | submit | No (user_id in payload) |
| `virtual-meeting` | Virtual meeting management | create, delete, accept, decline, send_calendar_invite, notify_participants | Currently all public |

### AI & Integration Functions

| Function | Purpose | Actions | Auth Required |
|----------|---------|---------|---------------|
| `ai-gateway` | OpenAI proxy with prompt templating | complete, stream | Varies by prompt |
| `ai-parse-profile` | AI profile parsing (GPT-4) | queue, process, process_batch, queue_and_process | No |
| `ai-signup-guest` | AI-powered guest signup flow | (single action) | No |

### Communication Functions

| Function | Purpose | Actions | Auth Required |
|----------|---------|---------|---------------|
| `send-email` | SendGrid email integration | send, health | send: Yes |
| `send-sms` | Twilio SMS integration | send, health | send: Yes |
| `slack` | Slack webhook integration | faq_inquiry | No |

### Sync & Orchestration Functions

| Function | Purpose | Actions | Auth Required |
|----------|---------|---------|---------------|
| `bubble_sync` | Process sync_queue, push to Bubble | process_queue, process_queue_data_api, sync_single, retry_failed, get_status, cleanup, build_request, sync_signup_atomic | No (internal) |
| `bubble-proxy` | Legacy Bubble API proxy | send_message, ai_inquiry, upload_photos, submit_referral, toggle_favorite, get_favorites, parse_profile | submit_referral: Yes |
| `workflow-enqueue` | Workflow entry point | enqueue, status, health | No |
| `workflow-orchestrator` | pgmq workflow processor | (triggered by queue) | No (internal) |

### Placeholder Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `communications` | Future communications hub | Placeholder (health only) |
| `pricing` | Future pricing calculations | Placeholder (health only) |

---

## Shared Utilities (`functions/_shared/`)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `cors.ts` | CORS headers configuration | `corsHeaders` |
| `errors.ts` | Custom error classes | `BubbleApiError`, `SupabaseSyncError`, `ValidationError`, `AuthenticationError`, `OpenAIError`, `formatErrorResponse()`, `getStatusCodeFromError()` |
| `validation.ts` | Input validation | `validateEmail()`, `validatePhone()`, `validateRequired()`, `validateRequiredFields()`, `validateAction()`, `validatePhoneE164()` |
| `slack.ts` | Slack error reporting | `ErrorCollector`, `sendToSlack()`, `createErrorCollector()` |
| `queueSync.ts` | Queue-based Bubble sync | `enqueueBubbleSync()`, `enqueueSingleItem()`, `triggerQueueProcessing()`, `enqueueSignupSync()`, `filterBubbleIncompatibleFields()` |
| `bubbleSync.ts` | Atomic sync service | `BubbleSyncService` class (Write-Read-Write pattern) |
| `openai.ts` | OpenAI API wrapper | `complete()`, `stream()` |
| `junctionHelpers.ts` | Junction table dual-write helpers | `addUserProposal()`, `addUserListingFavorite()`, `setUserStorageItems()`, `setUserPreferredHoods()`, `addThreadMessage()`, `addThreadParticipant()` |
| `messagingHelpers.ts` | Native Supabase messaging | `generateBubbleId()`, `getUserBubbleId()`, `createThread()`, `findExistingThread()`, `createMessage()`, `markMessagesAsRead()` |
| `geoLookup.ts` | Geographic lookup utilities | (location matching) |
| `types.ts` | General TypeScript interfaces | `EdgeFunctionRequest`, `BubbleWorkflowResponse`, `User`, etc. |
| `aiTypes.ts` | AI-specific TypeScript types | `AIGatewayRequest`, `PromptConfig`, `DataLoader`, etc. |
| `jsonUtils.ts` | JSON parsing utilities | JSON manipulation helpers |

---

## Database Migrations (14 Total)

### Sync Queue System (Dec 5-10, 2025)
| Migration | Purpose |
|-----------|---------|
| `20251205_create_sync_queue_tables.sql` | Create `sync_queue` and `sync_config` tables with triggers |
| `20251209_listing_bubble_sync_backend.sql` | Add bubble_id, sync_status columns to listing |
| `20251209_extend_sync_queue_for_signup.sql` | Add SIGNUP_ATOMIC operation type |
| `20251209_fix_bubble_sync_payload_filtering.sql` | Fix payload field filtering |
| `20251210_queue_processing_cron.sql` | pg_cron job for sync_queue (every 5 min) |

### Workflow Orchestration System (Dec 13, 2025)
| Migration | Purpose |
|-----------|---------|
| `20251213_enable_pgmq.sql` | Enable pgmq extension |
| `20251213_create_workflow_definitions.sql` | Create `workflow_definitions` table |
| `20251213_create_workflow_executions.sql` | Create `workflow_executions` table |
| `20251213_workflow_immediate_trigger.sql` | pg_net trigger for immediate workflow execution |
| `20251213_workflow_cron_backup.sql` | Backup cron job (every 30 seconds) |
| `20251213_seed_workflow_definitions.sql` | Initial workflow definitions |

### Other Migrations (Dec 14-17, 2025)
| Migration | Purpose |
|-----------|---------|
| `20251214_create_get_email_template_function.sql` | Email template lookup function |
| `20251214_create_notification_preferences.sql` | User notification preferences |
| `20251217_add_message_foreign_keys.sql` | Message FK constraints |

---

## Architecture Patterns

### 1. Action-Based Routing
All Edge Functions use consistent `{ action, payload }` request pattern:

```json
{
  "action": "create",
  "payload": { "field1": "value1" }
}
```

### 2. Queue-Based Sync (Bubble Integration)
```
[Supabase CRUD] → sync_queue table → bubble_sync function → Bubble API
                         ↑
              pg_cron (every 5 min) or immediate trigger
```

**Key Tables:**
- `sync_queue`: Pending sync operations
- `sync_config`: Table-to-workflow mappings

### 3. Workflow Orchestration (pgmq)
```
[Frontend] → workflow-enqueue → pgmq queue → workflow-orchestrator → [Edge Functions]
                                    ↑
                        pg_net trigger + pg_cron backup
```

**Key Tables:**
- `workflow_definitions`: Named workflow configurations with steps
- `workflow_executions`: Execution state tracking

**Workflow Step Structure:**
```json
{
  "name": "send_email",
  "function": "send-email",
  "action": "send",
  "payload_template": {
    "to_email": "{{guest_email}}",
    "template_id": "welcome"
  },
  "on_failure": "continue" | "abort" | "retry"
}
```

### 4. Error Collection Pattern
```typescript
const collector = createErrorCollector('function-name', action);
try {
  // operation
} catch (error) {
  collector.add(error, 'context');
  collector.reportToSlack(); // fire-and-forget
  throw error;
}
```

### 5. Junction Table Dual-Write
During JSONB→junction migration, helpers write to both:
- Legacy JSONB columns on parent tables
- New normalized junction tables in `junctions` schema

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `SUPABASE_URL` | Supabase project URL | Auto |
| `SUPABASE_ANON_KEY` | Anon key for client ops | Auto |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin) | Yes |
| `BUBBLE_API_BASE_URL` | Bubble API base URL | Yes |
| `BUBBLE_API_KEY` | Bubble API key | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `SENDGRID_API_KEY` | SendGrid API key | For email |
| `SENDGRID_EMAIL_ENDPOINT` | SendGrid endpoint | For email |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | For SMS |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | For SMS |
| `TWILIO_FROM_PHONE` | Twilio phone number | For SMS |
| `SLACK_WEBHOOK_DATABASE_WEBHOOK` | Slack webhook for errors | For logging |
| `SLACK_WEBHOOK_ACQUISITION` | Slack acquisition channel | Optional |
| `SLACK_WEBHOOK_GENERAL` | Slack general channel | Optional |

---

## Configuration Files

### `config.toml`
- Supabase local development configuration
- All Edge Function definitions with entrypoints
- Deno version: 2
- `verify_jwt: false` (functions handle own auth)
- `policy: per_worker` (enables hot reload)

### Function-specific `deno.json`
Import maps for each function with specific dependencies.

---

## Key Design Principles

1. **NO_FALLBACK_PRINCIPLE**: All functions fail fast without fallback logic or default values
2. **ATOMIC_OPERATIONS**: Write-Read-Write pattern for Bubble sync ensures consistency
3. **ERROR_COLLECTION**: One request = one Slack log (consolidated reporting)
4. **FIRE_AND_FORGET**: Queue triggers and Slack notifications don't block responses
5. **HOLLOW ORCHESTRATOR**: workflow-orchestrator contains NO workflow logic - reads steps from database

---

## Deployment Commands

```bash
# Local Development
supabase start              # Start local Supabase
supabase functions serve    # Serve all functions with hot reload
supabase functions serve <name>  # Serve single function

# Production
supabase functions deploy   # Deploy all functions
supabase functions deploy <name>  # Deploy single function
supabase functions logs <name>    # View function logs

# Migrations
supabase migration new <name>     # Create new migration
supabase db reset                 # Reset local database
```

---

## Files Referenced

- `/supabase/config.toml` - Main configuration
- `/supabase/CLAUDE.md` - LLM reference documentation
- `/supabase/functions/*/index.ts` - 17 Edge Function entry points
- `/supabase/functions/_shared/*.ts` - 13 shared utilities
- `/supabase/migrations/*.sql` - 14 database migrations
