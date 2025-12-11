# Edge Functions Sequence Diagrams

**GENERATED**: 2025-12-11

This document contains ASCII sequence diagrams for complex edge function flows.

---

## Table of Contents

1. [Authentication Flow](#1-authentication-flow)
2. [Atomic Sync Pattern](#2-atomic-sync-pattern)
3. [Queue-Based Sync Flow](#3-queue-based-sync-flow)
4. [Proposal Creation Flow](#4-proposal-creation-flow)
5. [AI Gateway Flow](#5-ai-gateway-flow)
6. [Signup with Bubble Sync](#6-signup-with-bubble-sync)

---

## 1. Authentication Flow

### Login Flow (Supabase Auth Native)

```
┌────────┐     ┌───────────────┐     ┌──────────────┐     ┌──────────┐
│ Client │     │  auth-user    │     │ Supabase Auth│     │ Supabase │
│        │     │ Edge Function │     │              │     │    DB    │
└───┬────┘     └───────┬───────┘     └──────┬───────┘     └────┬─────┘
    │                  │                    │                  │
    │ POST /auth-user  │                    │                  │
    │ action: login    │                    │                  │
    │ email, password  │                    │                  │
    │─────────────────>│                    │                  │
    │                  │                    │                  │
    │                  │ signInWithPassword │                  │
    │                  │───────────────────>│                  │
    │                  │                    │                  │
    │                  │ access_token       │                  │
    │                  │ refresh_token      │                  │
    │                  │<───────────────────│                  │
    │                  │                    │                  │
    │                  │ SELECT user, host_account, guest_account
    │                  │──────────────────────────────────────>│
    │                  │                    │                  │
    │                  │ user data with accounts               │
    │                  │<──────────────────────────────────────│
    │                  │                    │                  │
    │ {success: true,  │                    │                  │
    │  access_token,   │                    │                  │
    │  user_id, ...}   │                    │                  │
    │<─────────────────│                    │                  │
    │                  │                    │                  │
```

### Signup Flow (with Bubble Sync Queue)

```
┌────────┐     ┌───────────────┐     ┌──────────────┐     ┌──────────┐     ┌────────────┐
│ Client │     │  auth-user    │     │ Supabase Auth│     │ Supabase │     │ sync_queue │
│        │     │ Edge Function │     │              │     │    DB    │     │   (async)  │
└───┬────┘     └───────┬───────┘     └──────┬───────┘     └────┬─────┘     └─────┬──────┘
    │                  │                    │                  │                 │
    │ POST /auth-user  │                    │                  │                 │
    │ action: signup   │                    │                  │                 │
    │─────────────────>│                    │                  │                 │
    │                  │                    │                  │                 │
    │                  │ signUp()           │                  │                 │
    │                  │───────────────────>│                  │                 │
    │                  │                    │                  │                 │
    │                  │ auth user created  │                  │                 │
    │                  │<───────────────────│                  │                 │
    │                  │                    │                  │                 │
    │                  │ INSERT public.user │                  │                 │
    │                  │──────────────────────────────────────>│                 │
    │                  │                    │                  │                 │
    │                  │ INSERT host_account, guest_account    │                 │
    │                  │──────────────────────────────────────>│                 │
    │                  │                    │                  │                 │
    │                  │ enqueueSignupSync()│                  │                 │
    │                  │─────────────────────────────────────────────────────────>
    │                  │                    │                  │                 │
    │ {success: true}  │                    │                  │                 │
    │<─────────────────│                    │                  │                 │
    │                  │                    │                  │                 │
    │                  │                    │   (Later, via cron job)           │
    │                  │                    │                  │<────────────────│
    │                  │                    │                  │   Process queue │
    │                  │                    │                  │   Push to Bubble│
```

---

## 2. Atomic Sync Pattern

### Write-Read-Write (BubbleSyncService.createAndSync)

```
┌────────┐     ┌───────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│ Client │     │ Edge Function │     │ Bubble       │     │ Bubble       │     │ Supabase │
│        │     │               │     │ Workflow API │     │ Data API     │     │    DB    │
└───┬────┘     └───────┬───────┘     └──────┬───────┘     └──────┬───────┘     └────┬─────┘
    │                  │                    │                    │                  │
    │ Request          │                    │                    │                  │
    │─────────────────>│                    │                    │                  │
    │                  │                    │                    │                  │
    │                  │ ┌─────────────────────────────────────────────────────────┐│
    │                  │ │ STEP 1: WRITE (Create in Bubble - Source of Truth)     ││
    │                  │ └─────────────────────────────────────────────────────────┘│
    │                  │                    │                    │                  │
    │                  │ POST /wf/workflow  │                    │                  │
    │                  │───────────────────>│                    │                  │
    │                  │                    │                    │                  │
    │                  │ {id: "bubble-id"}  │                    │                  │
    │                  │<───────────────────│                    │                  │
    │                  │                    │                    │                  │
    │                  │ ┌─────────────────────────────────────────────────────────┐│
    │                  │ │ STEP 2: READ (Fetch full data from Bubble)             ││
    │                  │ └─────────────────────────────────────────────────────────┘│
    │                  │                    │                    │                  │
    │                  │ GET /obj/type/id   │                    │                  │
    │                  │───────────────────────────────────────>│                  │
    │                  │                    │                    │                  │
    │                  │ {full object data} │                    │                  │
    │                  │<───────────────────────────────────────│                  │
    │                  │                    │                    │                  │
    │                  │ ┌─────────────────────────────────────────────────────────┐│
    │                  │ │ STEP 3: WRITE (Sync to Supabase - Replica)             ││
    │                  │ └─────────────────────────────────────────────────────────┘│
    │                  │                    │                    │                  │
    │                  │ UPSERT on _id      │                    │                  │
    │                  │─────────────────────────────────────────────────────────>│
    │                  │                    │                    │                  │
    │                  │ {synced data}      │                    │                  │
    │                  │<─────────────────────────────────────────────────────────│
    │                  │                    │                    │                  │
    │ {success: true,  │                    │                    │                  │
    │  data: {...}}    │                    │                    │                  │
    │<─────────────────│                    │                    │                  │
    │                  │                    │                    │                  │

    ⚠️  If any step fails, entire operation fails. Client can retry.
```

---

## 3. Queue-Based Sync Flow

### Async Sync via sync_queue Table

```
┌────────┐     ┌───────────────┐     ┌──────────┐     ┌────────────┐     ┌──────────────┐
│ Client │     │ Edge Function │     │ Supabase │     │ bubble_sync│     │ Bubble       │
│        │     │ (proposal)    │     │    DB    │     │ (cron job) │     │ Data API     │
└───┬────┘     └───────┬───────┘     └────┬─────┘     └─────┬──────┘     └──────┬───────┘
    │                  │                  │                 │                   │
    │ Create Proposal  │                  │                 │                   │
    │─────────────────>│                  │                 │                   │
    │                  │                  │                 │                   │
    │                  │ INSERT proposal  │                 │                   │
    │                  │─────────────────>│                 │                   │
    │                  │                  │                 │                   │
    │                  │ INSERT sync_queue│                 │                   │
    │                  │ (status: pending)│                 │                   │
    │                  │─────────────────>│                 │                   │
    │                  │                  │                 │                   │
    │ {success: true}  │                  │                 │                   │
    │<─────────────────│                  │                 │                   │
    │                  │                  │                 │                   │
    │                  │                  │   (Every 5 min) │                   │
    │                  │                  │<────────────────│                   │
    │                  │                  │ SELECT pending  │                   │
    │                  │                  │ items           │                   │
    │                  │                  │                 │                   │
    │                  │                  │ UPDATE status   │                   │
    │                  │                  │ = processing    │                   │
    │                  │                  │<────────────────│                   │
    │                  │                  │                 │                   │
    │                  │                  │                 │ POST /obj/proposal
    │                  │                  │                 │──────────────────>│
    │                  │                  │                 │                   │
    │                  │                  │                 │ {created}         │
    │                  │                  │                 │<──────────────────│
    │                  │                  │                 │                   │
    │                  │                  │ UPDATE status   │                   │
    │                  │                  │ = completed     │                   │
    │                  │                  │<────────────────│                   │
    │                  │                  │                 │                   │

    ✅ Non-blocking: Client returns immediately
    ✅ Retry: Failed items can be retried later
    ✅ Idempotent: correlation_id prevents duplicates
```

---

## 4. Proposal Creation Flow

### Complete Proposal Creation with Pricing

```
┌────────┐     ┌───────────────┐     ┌──────────┐     ┌────────────┐     ┌────────────┐
│ Client │     │   proposal    │     │ Supabase │     │ sync_queue │     │   Slack    │
│        │     │ Edge Function │     │    DB    │     │            │     │ (on error) │
└───┬────┘     └───────┬───────┘     └────┬─────┘     └─────┬──────┘     └─────┬──────┘
    │                  │                  │                 │                  │
    │ POST /proposal   │                  │                 │                  │
    │ action: create   │                  │                 │                  │
    │ {listing_id,     │                  │                 │                  │
    │  guest_id,       │                  │                 │                  │
    │  days_selected}  │                  │                 │                  │
    │─────────────────>│                  │                 │                  │
    │                  │                  │                 │                  │
    │                  │ ┌────────────────────────────────┐ │                  │
    │                  │ │ 1. Validate input              │ │                  │
    │                  │ │ 2. Fetch listing data          │ │                  │
    │                  │ │ 3. Calculate pricing:          │ │                  │
    │                  │ │    - getNightlyRate(nights)    │ │                  │
    │                  │ │    - fourWeekRent = rate*n*4   │ │                  │
    │                  │ │    - serviceFee = rent * 0.10  │ │                  │
    │                  │ │ 4. Convert days (JS → Bubble)  │ │                  │
    │                  │ └────────────────────────────────┘ │                  │
    │                  │                  │                 │                  │
    │                  │ SELECT listing   │                 │                  │
    │                  │─────────────────>│                 │                  │
    │                  │                  │                 │                  │
    │                  │ listing data     │                 │                  │
    │                  │<─────────────────│                 │                  │
    │                  │                  │                 │                  │
    │                  │ INSERT proposal  │                 │                  │
    │                  │ (with pricing)   │                 │                  │
    │                  │─────────────────>│                 │                  │
    │                  │                  │                 │                  │
    │                  │ proposal created │                 │                  │
    │                  │<─────────────────│                 │                  │
    │                  │                  │                 │                  │
    │                  │ INSERT sync_queue│                 │                  │
    │                  │─────────────────────────────────>│                  │
    │                  │                  │                 │                  │
    │ {success: true,  │                  │                 │                  │
    │  data: {         │                  │                 │                  │
    │    _id,          │                  │                 │                  │
    │    nightly_rate, │                  │                 │                  │
    │    four_week_rent│                  │                 │                  │
    │    service_fee,  │                  │                 │                  │
    │    total}}       │                  │                 │                  │
    │<─────────────────│                  │                 │                  │
    │                  │                  │                 │                  │
```

---

## 5. AI Gateway Flow

### Non-Streaming Completion

```
┌────────┐     ┌───────────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│ Client │     │  ai-gateway   │     │ Prompt       │     │ Supabase │     │  OpenAI  │
│        │     │ Edge Function │     │ Registry     │     │    DB    │     │   API    │
└───┬────┘     └───────┬───────┘     └──────┬───────┘     └────┬─────┘     └────┬─────┘
    │                  │                    │                  │                │
    │ POST /ai-gateway │                    │                  │                │
    │ action: complete │                    │                  │                │
    │ prompt_key:      │                    │                  │                │
    │  "listing-desc"  │                    │                  │                │
    │ variables: {...} │                    │                  │                │
    │─────────────────>│                    │                  │                │
    │                  │                    │                  │                │
    │                  │ ┌───────────────────────────────────────────────────┐  │
    │                  │ │ Check if public prompt (no auth needed)          │  │
    │                  │ └───────────────────────────────────────────────────┘  │
    │                  │                    │                  │                │
    │                  │ getPrompt(key)     │                  │                │
    │                  │───────────────────>│                  │                │
    │                  │                    │                  │                │
    │                  │ {template,         │                  │                │
    │                  │  systemMessage,    │                  │                │
    │                  │  dataLoaders}      │                  │                │
    │                  │<───────────────────│                  │                │
    │                  │                    │                  │                │
    │                  │ ┌───────────────────────────────────────────────────┐  │
    │                  │ │ Load data (if dataLoaders configured)            │  │
    │                  │ └───────────────────────────────────────────────────┘  │
    │                  │                    │                  │                │
    │                  │ SELECT user data   │                  │                │
    │                  │──────────────────────────────────────>│                │
    │                  │                    │                  │                │
    │                  │ ┌───────────────────────────────────────────────────┐  │
    │                  │ │ Interpolate template with variables + loader data│  │
    │                  │ │ "Generate description for {{beds}}-bed in {{hood}}"│
    │                  │ └───────────────────────────────────────────────────┘  │
    │                  │                    │                  │                │
    │                  │ POST /chat/completions                │                │
    │                  │───────────────────────────────────────────────────────>│
    │                  │                    │                  │                │
    │                  │ {content, usage}   │                  │                │
    │                  │<───────────────────────────────────────────────────────│
    │                  │                    │                  │                │
    │ {success: true,  │                    │                  │                │
    │  data: {         │                    │                  │                │
    │    response,     │                    │                  │                │
    │    usage}}       │                    │                  │                │
    │<─────────────────│                    │                  │                │
    │                  │                    │                  │                │
```

### Streaming Completion (SSE)

```
┌────────┐     ┌───────────────┐     ┌──────────┐
│ Client │     │  ai-gateway   │     │  OpenAI  │
│        │     │ Edge Function │     │   API    │
└───┬────┘     └───────┬───────┘     └────┬─────┘
    │                  │                  │
    │ POST /ai-gateway │                  │
    │ action: stream   │                  │
    │─────────────────>│                  │
    │                  │                  │
    │                  │ POST (stream)    │
    │                  │─────────────────>│
    │                  │                  │
    │ SSE: data: {...} │                  │
    │<─────────────────│<─────────────────│
    │                  │                  │
    │ SSE: data: {...} │                  │
    │<─────────────────│<─────────────────│
    │                  │                  │
    │ SSE: data: {...} │                  │
    │<─────────────────│<─────────────────│
    │                  │                  │
    │ SSE: [DONE]      │                  │
    │<─────────────────│<─────────────────│
    │                  │                  │

    Content-Type: text/event-stream
    Transfer-Encoding: chunked
```

---

## 6. Signup with Bubble Sync

### Atomic Signup Sync (User + Host Account + Guest Account)

```
┌──────────┐     ┌────────────────┐     ┌────────────┐     ┌──────────────┐
│sync_queue│     │  bubble_sync   │     │  Bubble    │     │   Supabase   │
│ (pending)│     │ Edge Function  │     │  Data API  │     │      DB      │
└────┬─────┘     └───────┬────────┘     └─────┬──────┘     └──────┬───────┘
     │                   │                    │                   │
     │ ┌───────────────────────────────────────────────────────────────────┐
     │ │ Cron Job Trigger (every 5 min)                                    │
     │ │ action: process_queue_data_api                                    │
     │ └───────────────────────────────────────────────────────────────────┘
     │                   │                    │                   │
     │ SELECT pending    │                    │                   │
     │ WHERE operation = │                    │                   │
     │ 'SIGNUP_ATOMIC'   │                    │                   │
     │<──────────────────│                    │                   │
     │                   │                    │                   │
     │ correlation_id:   │                    │                   │
     │ signup:{userId}   │                    │                   │
     │ 3 items in seq    │                    │                   │
     │──────────────────>│                    │                   │
     │                   │                    │                   │
     │                   │ ┌─────────────────────────────────────┐│
     │                   │ │ Step 1: Create user in Bubble      ││
     │                   │ └─────────────────────────────────────┘│
     │                   │                    │                   │
     │                   │ POST /obj/user     │                   │
     │                   │───────────────────>│                   │
     │                   │                    │                   │
     │                   │ {_id: bubble_uid}  │                   │
     │                   │<───────────────────│                   │
     │                   │                    │                   │
     │                   │ UPDATE user SET bubble_id             │
     │                   │────────────────────────────────────────>
     │                   │                    │                   │
     │                   │ ┌─────────────────────────────────────┐│
     │                   │ │ Step 2: Create host_account         ││
     │                   │ └─────────────────────────────────────┘│
     │                   │                    │                   │
     │                   │ POST /obj/host     │                   │
     │                   │ (with user FK)     │                   │
     │                   │───────────────────>│                   │
     │                   │                    │                   │
     │                   │ ┌─────────────────────────────────────┐│
     │                   │ │ Step 3: Create guest_account        ││
     │                   │ └─────────────────────────────────────┘│
     │                   │                    │                   │
     │                   │ POST /obj/guest    │                   │
     │                   │ (with user FK)     │                   │
     │                   │───────────────────>│                   │
     │                   │                    │                   │
     │ UPDATE status =   │                    │                   │
     │ 'completed'       │                    │                   │
     │<──────────────────│                    │                   │
     │                   │                    │                   │

    ⚠️  If any step fails:
        - Status = 'failed'
        - Error message stored
        - Can retry with 'retry_failed' action
```

---

## Error Handling Pattern

All edge functions follow this consolidated error handling:

```
┌────────┐     ┌───────────────┐     ┌──────────┐
│ Client │     │ Edge Function │     │  Slack   │
│        │     │               │     │          │
└───┬────┘     └───────┬───────┘     └────┬─────┘
    │                  │                  │
    │ Request          │                  │
    │─────────────────>│                  │
    │                  │                  │
    │                  │ ┌──────────────────────────────────┐
    │                  │ │ try {                            │
    │                  │ │   collector = createErrorCollector│
    │                  │ │   // ... operation               │
    │                  │ │ } catch (error) {                │
    │                  │ │   collector.add(error, context)  │
    │                  │ │   collector.reportToSlack() ───────────>│
    │                  │ │   return errorResponse           │  (fire-and-forget)
    │                  │ │ }                                │
    │                  │ └──────────────────────────────────┘
    │                  │                  │
    │ {success: false, │                  │
    │  error: "..."}   │                  │
    │<─────────────────│                  │
    │                  │                  │

    ONE REQUEST = ONE SLACK LOG (consolidated errors)
```

---

**LAST_UPDATED**: 2025-12-11
