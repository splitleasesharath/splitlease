# Supabase Edge Functions Documentation

**GENERATED**: 2025-12-11
**UPDATED**: 2026-01-20
**SCOPE**: Supabase Edge Functions for Split Lease Platform
**RUNTIME**: Deno 2

---

## Overview

Split Lease uses Supabase Edge Functions (Deno 2) as the backend API layer, serving as a proxy between the React frontend and both Supabase (PostgreSQL) and Bubble.io (legacy backend).

### Architecture Principles

| Principle | Description |
|-----------|-------------|
| **NO_FALLBACK** | All functions fail fast without fallback logic or default values |
| **FP_ARCHITECTURE** | Pure functions, immutable data, side effects isolated to boundaries |
| **ERROR_COLLECTION** | One request = one Slack log (consolidated reporting via ErrorLog) |
| **QUEUE_BASED_SYNC** | Async sync via `sync_queue` table for non-blocking ops |
| **ACTION_ROUTING** | All functions use `{ action, payload }` request pattern |
| **RESULT_TYPE** | Error propagation via Result type (ok/err) instead of exceptions |

### Quick Stats

- **Total Edge Functions**: 29
- **Total Shared Utilities**: 12+
- **Primary Language**: TypeScript
- **Runtime**: Deno 2
- **Key Patterns**: action-based-routing, FP-architecture, queue-based-sync, result-type-propagation

---

## Edge Functions Index

### Core Authentication & User Management

| Function | Purpose | Auth Required | Endpoint |
|----------|---------|---------------|----------|
| [auth-user](./AUTH_USER.md) | Authentication (login, signup, password reset, validate) | No | `/functions/v1/auth-user` |
| [ai-signup-guest](./AI_SIGNUP_GUEST.md) | AI-powered guest signup flow | No | `/functions/v1/ai-signup-guest` |
| [ai-parse-profile](./AI_PARSE_PROFILE.md) | AI profile parsing with queue management | No | `/functions/v1/ai-parse-profile` |

### Listing & Proposal Management

| Function | Purpose | Auth Required | Endpoint |
|----------|---------|---------------|----------|
| [proposal](./PROPOSAL.md) | Proposal CRUD with AI summaries | Mixed | `/functions/v1/proposal` |
| [listing](./LISTING.md) | Listing CRUD operations | Mixed | `/functions/v1/listing` |
| [rental-application](./RENTAL_APPLICATION.md) | Rental application processing (submit, get, upload) | Public* | `/functions/v1/rental-application` |

### Messaging & Communications

| Function | Purpose | Auth Required | Endpoint |
|----------|---------|---------------|----------|
| [messages](./MESSAGES.md) | Real-time messaging threads with SplitBot | Mixed* | `/functions/v1/messages` |
| [send-email](./SEND_EMAIL.md) | SendGrid email sending service | Mixed | `/functions/v1/send-email` |
| [send-sms](./SEND_SMS.md) | Twilio SMS sending service | Mixed | `/functions/v1/send-sms` |
| [communications](./COMMUNICATIONS.md) | Communications placeholder | No | `/functions/v1/communications` |

### Payment & Scheduling

| Function | Purpose | Auth Required | Endpoint |
|----------|---------|---------------|----------|
| [guest-payment-records](./GUEST_PAYMENT_RECORDS.md) | Guest payment record generation for leases | Public | `/functions/v1/guest-payment-records` |
| [host-payment-records](./HOST_PAYMENT_RECORDS.md) | Host payment record generation for leases | Public | `/functions/v1/host-payment-records` |
| [date-change-request](./DATE_CHANGE_REQUEST.md) | Two-tier throttling date change system (8 actions) | Public* | `/functions/v1/date-change-request` |
| [virtual-meeting](./VIRTUAL_MEETING.md) | Virtual meeting scheduling & management (6 actions) | Public* | `/functions/v1/virtual-meeting` |
| [reminder-scheduler](./REMINDER_SCHEDULER.md) | Automated reminder system for house manuals (9 actions) | Public* | `/functions/v1/reminder-scheduler` |

### AI & Intelligence

| Function | Purpose | Auth Required | Endpoint |
|----------|---------|---------------|----------|
| [ai-gateway](./AI_GATEWAY.md) | OpenAI proxy with prompt templating | Mixed | `/functions/v1/ai-gateway` |
| [house-manual](./HOUSE_MANUAL.md) | AI Tools suite for house manual creation (6 actions) | Public* | `/functions/v1/house-manual` |

### Co-Host System

| Function | Purpose | Auth Required | Endpoint |
|----------|---------|---------------|----------|
| [cohost-request](./COHOST_REQUEST.md) | Co-host request handling (create, rate, notify-host) | Public* | `/functions/v1/cohost-request` |
| [cohost-request-slack-callback](./COHOST_REQUEST_SLACK_CALLBACK.md) | Slack interactive callback for co-host assignment | No | `/functions/v1/cohost-request-slack-callback` |

### Workflow Orchestration

| Function | Purpose | Auth Required | Endpoint |
|----------|---------|---------------|----------|
| [workflow-enqueue](./WORKFLOW_SYSTEM.md) | Workflow queue system with validation | No | `/functions/v1/workflow-enqueue` |
| [workflow-orchestrator](./WORKFLOW_SYSTEM.md) | Workflow orchestration (hollow orchestrator) | No | `/functions/v1/workflow-orchestrator` |

### Bubble Integration & Sync

| Function | Purpose | Auth Required | Endpoint |
|----------|---------|---------------|----------|
| [bubble-proxy](./BUBBLE_PROXY.md) | Bubble API proxy (messaging, photos, favorites) | Mixed | `/functions/v1/bubble-proxy` |
| [bubble_sync](./BUBBLE_SYNC.md) | Supabase-to-Bubble sync queue processor | No | `/functions/v1/bubble_sync` |

### Utilities & Tools

| Function | Purpose | Auth Required | Endpoint |
|----------|---------|---------------|----------|
| [qr-generator](./QR_GENERATOR.md) | Branded QR code generation (PNG binary) | No | `/functions/v1/qr-generator` |
| [query-leo](./QUERY_LEO.md) | Debug utility for Leo DiCaprio mockup queries | No | `/functions/v1/query-leo` |
| [slack](./SLACK.md) | Slack integration for FAQ inquiries | No | `/functions/v1/slack` |
| [pricing](./PRICING.md) | Pricing calculations (placeholder) | No | `/functions/v1/pricing` |

> **Note**: "Public*" indicates actions are temporarily public during Supabase auth migration, with legacy auth (user_id in payload) supported.

---

## Shared Utilities

### Core Utilities

| Utility | File | Purpose |
|---------|------|---------|
| BubbleSyncService | `_shared/bubbleSync.ts` | Core atomic sync (Write-Read-Write pattern) |
| QueueSync | `_shared/queueSync.ts` | Standardized queue-based sync |
| Slack | `_shared/slack.ts` | Centralized error reporting to Slack (ErrorCollector, reportErrorLog) |
| Errors | `_shared/errors.ts` | Custom error classes with HTTP status |
| Validation | `_shared/validation.ts` | Input validation utilities |
| CORS | `_shared/cors.ts` | CORS headers configuration |
| OpenAI | `_shared/openai.ts` | OpenAI API wrapper (complete, stream) |
| Types | `_shared/types.ts` | General TypeScript interfaces |
| AI Types | `_shared/aiTypes.ts` | AI-specific TypeScript types |

### FP (Functional Programming) Utilities

| Utility | File | Purpose |
|---------|------|---------|
| Result | `_shared/fp/result.ts` | Result type for error propagation (ok/err pattern) |
| Orchestration | `_shared/fp/orchestration.ts` | Pure functions for parsing, validation, routing, response formatting |
| ErrorLog | `_shared/fp/errorLog.ts` | Functional error log creation and management |

### Helper Utilities

| Utility | File | Purpose |
|---------|------|---------|
| Junction Helpers | `_shared/junctionHelpers.ts` | Junction table operations (favorites, hoods, storage items) |
| JSON Utils | `_shared/jsonUtils.ts` | JSON parsing and normalization utilities |

---

## Standard Request/Response Format

### Request
```json
POST /functions/v1/{function-name}
Content-Type: application/json
Authorization: Bearer {access_token}  // Optional for public actions

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
  "data": {
    "result_field1": "value1",
    "result_field2": "value2"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes (auto) |
| `SUPABASE_ANON_KEY` | Supabase anon key | Yes (auto) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin ops | Yes (secret) |
| `BUBBLE_API_BASE_URL` | Bubble API base URL | Yes (secret) |
| `BUBBLE_API_KEY` | Bubble API key | Yes (secret) |
| `OPENAI_API_KEY` | OpenAI API key | Yes (secret) |
| `SLACK_WEBHOOK_DATABASE_WEBHOOK` | Slack webhook for errors | Yes (secret) |
| `SLACK_WEBHOOK_ACQUISITION` | Slack webhook for acquisition | Optional |
| `SLACK_WEBHOOK_GENERAL` | Slack webhook for general | Optional |

---

## Deployment

> ⚠️ **CRITICAL REMINDER**: Supabase Edge Functions require **MANUAL DEPLOYMENT** after code changes!
> Unlike frontend code deployed via Cloudflare Pages, edge functions are NOT auto-deployed.
> Always run `supabase functions deploy <name>` after modifying edge function code.

### Local Development
```bash
supabase start                      # Start local Supabase
supabase functions serve            # Serve all functions
supabase functions serve <name>     # Serve specific function
supabase functions logs <name>      # View function logs
```

### Production Deployment
```bash
supabase functions deploy <name>    # Deploy specific function
supabase functions deploy           # Deploy all functions
```

### Deployment Checklist

- [ ] Test function locally with `supabase functions serve`
- [ ] Verify all required secrets are configured in Supabase Dashboard
- [ ] Deploy with `supabase functions deploy <function-name>`
- [ ] Test deployed function in production
- [ ] Monitor Slack channel for any error reports

**Secrets**: Configured in Supabase Dashboard > Project Settings > Secrets

---

## Critical Notes

| Topic | Detail |
|-------|--------|
| **Day Indexing** | JavaScript: Sun=0 to Sat=6 \| Bubble: Sun=1 to Sat=7 |
| **Unique ID Gen** | Use `supabaseAdmin.rpc('generate_bubble_id')` |
| **Bubble = Primary** | Bubble is source of truth, Supabase is replica |
| **Sync Pattern** | Create in Bubble first, then sync to Supabase |
| **Queue Processing** | Async sync via `sync_queue`, processed by cron |
| **CORS** | All functions return CORS headers |

---

## Sequence Diagrams

For visual understanding of complex flows, see [SEQUENCE_DIAGRAMS.md](./SEQUENCE_DIAGRAMS.md):

1. **Authentication Flow** - Login and signup with Bubble sync
2. **Atomic Sync Pattern** - Write-Read-Write consistency
3. **Queue-Based Sync Flow** - Async sync via sync_queue
4. **Proposal Creation Flow** - Complete flow with pricing
5. **AI Gateway Flow** - Streaming and non-streaming completions
6. **Signup with Bubble Sync** - User + host + guest account creation

---

## Related Documentation

- [CLAUDE.md (root)](../../../CLAUDE.md) - Main project context
- [supabase/CLAUDE.md](../../../supabase/CLAUDE.md) - Backend reference
- [DATABASE_SCHEMA_OVERVIEW.md](../../../DATABASE_SCHEMA_OVERVIEW.md) - 93 table schemas
- [SEQUENCE_DIAGRAMS.md](./SEQUENCE_DIAGRAMS.md) - Visual flow diagrams

---

## Recent Changes (Since 2025-12-11)

### New Edge Functions Added

| Function | Purpose | Key Features |
|----------|---------|--------------|
| **messages** | Real-time messaging | 5 actions: send_message, get_messages, get_threads, send_guest_inquiry, create_proposal_thread |
| **reminder-scheduler** | Automated reminders | 9 actions: create, update, get, delete, process-pending, webhooks, health |
| **virtual-meeting** | Meeting scheduling | 6 actions: create, delete, accept, decline, send_calendar_invite, notify_participants |
| **date-change-request** | Date change system | 8 actions with two-tier throttling (warning/hard-block) |
| **house-manual** | AI house manual | 6 actions: parse_text, transcribe_audio, extract_wifi, parse_document, parse_google_doc, initiate_call |
| **guest-payment-records** | Guest payments | Replaces Bubble's CORE-create-guest-payment-records workflow |
| **host-payment-records** | Host payments | Replaces Bubble's CORE-create-host-payment-records workflow |
| **send-email** | Email service | SendGrid proxy with template support |
| **send-sms** | SMS service | Twilio proxy for notifications |
| **qr-generator** | QR codes | Branded QR code generation (PNG binary response) |
| **rental-application** | Applications | 3 actions: submit, get, upload |
| **cohost-request** | Co-host system | 3 actions: create, rate, notify-host |
| **cohost-request-slack-callback** | Slack callbacks | Interactive button and modal handling |
| **workflow-enqueue** | Workflow queue | Dual-level validation (required_fields + template_variables) |
| **workflow-orchestrator** | Workflow execution | Hollow orchestrator using pgmq |

### Architecture Changes

- **FP Architecture**: Most new functions follow functional programming patterns with Result types
- **Bubble Sync Removal**: Many functions now operate Supabase-only (no Bubble dependency)
- **ErrorLog System**: New functional error logging with `createErrorLog`, `addError`, `reportErrorLog`
- **Legacy Auth Support**: Public actions support both JWT and user_id in payload

---

**VERSION**: 2.0
**LAST_UPDATED**: 2026-01-20
