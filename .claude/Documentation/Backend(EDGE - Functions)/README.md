# Supabase Edge Functions Documentation

**GENERATED**: 2025-12-11
**SCOPE**: Supabase Edge Functions for Split Lease Platform
**RUNTIME**: Deno 2

---

## Overview

Split Lease uses Supabase Edge Functions (Deno 2) as the backend API layer, serving as a proxy between the React frontend and both Supabase (PostgreSQL) and Bubble.io (legacy backend).

### Architecture Principles

| Principle | Description |
|-----------|-------------|
| **NO_FALLBACK** | All functions fail fast without fallback logic or default values |
| **ATOMIC_OPERATIONS** | Write-Read-Write pattern ensures data consistency |
| **ERROR_COLLECTION** | One request = one Slack log (consolidated reporting) |
| **QUEUE_BASED_SYNC** | Async sync via `sync_queue` table for non-blocking ops |
| **ACTION_ROUTING** | All functions use `{ action, payload }` request pattern |

### Quick Stats

- **Total Edge Functions**: 10
- **Total Shared Utilities**: 9
- **Primary Language**: TypeScript
- **Runtime**: Deno 2

---

## Edge Functions Index

| Function | Purpose | Auth Required | Endpoint |
|----------|---------|---------------|----------|
| [auth-user](./AUTH_USER.md) | Authentication (login, signup, password reset) | No | `/functions/v1/auth-user` |
| [bubble-proxy](./BUBBLE_PROXY.md) | Bubble API proxy (messaging, photos, favorites) | Mixed | `/functions/v1/bubble-proxy` |
| [ai-gateway](./AI_GATEWAY.md) | OpenAI proxy with prompt templating | Mixed | `/functions/v1/ai-gateway` |
| [proposal](./PROPOSAL.md) | Proposal CRUD operations | Mixed | `/functions/v1/proposal` |
| [listing](./LISTING.md) | Listing CRUD operations | Mixed | `/functions/v1/listing` |
| [bubble_sync](./BUBBLE_SYNC.md) | Supabase-to-Bubble sync queue processor | No | `/functions/v1/bubble_sync` |
| [ai-signup-guest](./AI_SIGNUP_GUEST.md) | AI-powered guest signup flow | No | `/functions/v1/ai-signup-guest` |
| [ai-parse-profile](./AI_PARSE_PROFILE.md) | AI profile parsing during signup | No | `/functions/v1/ai-parse-profile` |
| [slack](./SLACK.md) | Slack integration for FAQ inquiries | No | `/functions/v1/slack` |
| [communications](./COMMUNICATIONS.md) | Future email/SMS (placeholder) | No | `/functions/v1/communications` |
| [pricing](./PRICING.md) | Future pricing calculations (placeholder) | No | `/functions/v1/pricing` |

---

## Shared Utilities

| Utility | File | Purpose |
|---------|------|---------|
| BubbleSyncService | `_shared/bubbleSync.ts` | Core atomic sync (Write-Read-Write pattern) |
| QueueSync | `_shared/queueSync.ts` | Standardized queue-based sync |
| Slack | `_shared/slack.ts` | Centralized error reporting to Slack |
| Errors | `_shared/errors.ts` | Custom error classes with HTTP status |
| Validation | `_shared/validation.ts` | Input validation utilities |
| CORS | `_shared/cors.ts` | CORS headers configuration |
| OpenAI | `_shared/openai.ts` | OpenAI API wrapper |
| Types | `_shared/types.ts` | General TypeScript interfaces |
| AI Types | `_shared/aiTypes.ts` | AI-specific TypeScript types |

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

## Related Documentation

- [CLAUDE.md (root)](../../../CLAUDE.md) - Main project context
- [supabase/CLAUDE.md](../../../supabase/CLAUDE.md) - Backend reference
- [DATABASE_SCHEMA_OVERVIEW.md](../../../DATABASE_SCHEMA_OVERVIEW.md) - 93 table schemas

---

**VERSION**: 1.0
**LAST_UPDATED**: 2025-12-11
