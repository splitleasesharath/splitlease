# Comprehensive Migration Plan: Bubble API → Supabase Edge Functions

**Project:** Split Lease Application
**Date:** 2025-11-24
**Objective:** Migrate all Bubble.io backend workflow triggers from client-side to Supabase Edge Functions to eliminate the "Dual Write" consistency issue and secure API keys
**Principle:** NO FALLBACK - Real data or nothing. No compatibility layers, no hardcoded values, no fallback mechanisms.

---

## Executive Summary

### Problem Statement

**Current Architecture Issues:**
1. **"Dual Write" Problem**: Data is written to Bubble (source of truth) first, then separately to Supabase, creating a consistency gap
2. **Ghost Data Risk**: If client disconnects after Bubble write but before Supabase sync, data exists in Bubble but is missing from Supabase
3. **Security Vulnerability**: `VITE_BUBBLE_API_KEY` is exposed in browser source code and DevTools
4. **Hardcoded Values**: API key `5dbb448f9a6bbb043cb56ac16b8de109` is hardcoded in `AiSignupMarketReport.jsx:106`
5. **Multiple API Domains**: Using both `app.split.lease` and `upgradefromstr.bubbleapps.io` for different workflows

### Solution Architecture

**Edge Proxy Pattern:**
```
Client → Supabase Edge Function → Bubble API (Create) → Bubble Data API (Fetch) → Supabase DB (Upsert) → Client
```

**Key Benefits:**
- Atomic operations: Sync logic runs on server
- Client receives response only once both databases are aligned
- API keys secured in Supabase Secrets (server-side only)
- Single transaction boundary eliminates ghost data
- Authentication enforced at Edge Function level

---

## Current State Analysis

### 1. Bubble Workflow Inventory

Based on `BUBBLE_WORKFLOW_API_ENUMERATION.md` and codebase analysis:

#### Authentication Workflows (Domain: `upgradefromstr.bubbleapps.io`)

| Workflow | Endpoint | Location | Status |
|----------|----------|----------|--------|
| Login User | `/api/1.1/wf/login-user` | `app/src/lib/auth.js:405` | **MIGRATE** |
| Signup User | `/api/1.1/wf/signup-user` | `app/src/lib/auth.js:406` | **MIGRATE** |
| Check Login | `/api/1.1/wf/check-login` | `app/src/lib/auth.js:407` | **DEPRECATED** (unused) |
| Logout User | `/api/1.1/wf/logout-user` | `app/src/lib/auth.js:408` | **MIGRATE** |
| User Data API | `/api/1.1/obj/user/{user_id}` | `app/src/lib/auth.js:409` | **MIGRATE** |

#### Core Feature Workflows (Domain: `app.split.lease`)

| Workflow | Endpoint | Location | Priority | Has Sync Requirement |
|----------|----------|----------|----------|---------------------|
| Listing Creation | `/version-test/api/1.1/wf/listing_creation_in_code` | `app/src/lib/bubbleAPI.js:122` | **CRITICAL** | ✅ YES |
| Photo Upload | `/api/1.1/wf/listing_photos_section_in_code` | `SubmitListingPhotos.jsx:69` | **HIGH** | ✅ YES |
| Contact Host | `/api/1.1/wf/core-contact-host-send-message` | `ContactHostMessaging.jsx:111` | **HIGH** | ❌ NO |
| AI Signup Guest | `/version-test/api/1.1/wf/ai-signup-guest` | `AiSignupMarketReport.jsx:105` | **MEDIUM** | ✅ YES |
| Referral Tracking | `/api/1.1/wf/referral-index-lite` | `Footer.jsx:46` | **LOW** | ✅ YES |

### 2. Security Vulnerabilities Found

#### Critical Issues

**File: `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx:105-106`**
```javascript
const url = 'https://app.split.lease/version-test/api/1.1/wf/ai-signup-guest';
const apiKey = '5dbb448f9a6bbb043cb56ac16b8de109';  // ❌ HARDCODED API KEY
```
**Impact:** CRITICAL - API key exposed in source code, version control, and browser

**File: `app/.env:9`**
```bash
VITE_BUBBLE_API_KEY=5dbb448f9a6bbb043cb56ac16b8de109  # ❌ EXPOSED CLIENT-SIDE
```
**Impact:** HIGH - Prefixed with `VITE_`, bundled into client JavaScript

#### All API Key Exposures

| File | Line | Type | Severity |
|------|------|------|----------|
| `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx` | 106 | Hardcoded | 🔴 CRITICAL |
| `app/.env` | 9 | Client-side env var | 🔴 CRITICAL |
| `app/src/lib/bubbleAPI.js` | 21 | Uses `VITE_BUBBLE_API_KEY` | 🔴 HIGH |
| `app/src/islands/shared/SubmitListingPhotos/SubmitListingPhotos.jsx` | 68 | Uses `VITE_BUBBLE_API_KEY` | 🔴 HIGH |
| `app/src/islands/shared/ContactHostMessaging.jsx` | 15 | Uses `VITE_BUBBLE_API_KEY` | 🔴 HIGH |
| `app/src/lib/auth.js` | 404 | Uses `VITE_BUBBLE_API_KEY` | 🔴 HIGH |

### 3. Hardcoded URLs and Constants

**File: `app/src/lib/auth.js:405-409`**
```javascript
const BUBBLE_LOGIN_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/wf/login-user';
const BUBBLE_SIGNUP_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/wf/signup-user';
const BUBBLE_CHECK_LOGIN_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/wf/check-login';
const BUBBLE_LOGOUT_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/wf/logout-user';
const BUBBLE_USER_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/obj/user';
```

**File: `app/src/lib/constants.js:22-24`**
```javascript
export const REFERRAL_API_ENDPOINT = 'https://app.split.lease/api/1.1/wf/referral-index-lite';
export const BUBBLE_MESSAGING_ENDPOINT = 'https://app.split.lease/api/1.1/wf/core-contact-host-send-message';
export const AI_SIGNUP_WORKFLOW_URL = 'https://app.split.lease/api/1.1/wf/ai-signup-guest';
```

**File: `app/src/islands/shared/SubmitListingPhotos/SubmitListingPhotos.jsx:69`**
```javascript
const UPLOAD_ENDPOINT = 'https://app.split.lease/api/1.1/wf/listing_photos_section_in_code'
```

### 4. Environment Variables Audit

#### Current Client-Side Variables (MUST REMOVE)
```bash
VITE_BUBBLE_API_KEY=5dbb448f9a6bbb043cb56ac16b8de109
VITE_BUBBLE_API_BASE_URL=https://app.split.lease/version-test/api/1.1
```

#### Current Server-Side Variables (OK TO KEEP)
```bash
VITE_SUPABASE_URL=https://qcfifybkaddcoimjroca.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_GOOGLE_MAPS_API_KEY=AIzaSyC...
VITE_HOTJAR_SITE_ID=your_site_id_here
```

#### Required Supabase Secrets (TO BE CREATED)
```bash
BUBBLE_API_BASE_URL=https://app.split.lease/version-test/api/1.1
BUBBLE_API_KEY=5dbb448f9a6bbb043cb56ac16b8de109
BUBBLE_AUTH_BASE_URL=https://upgradefromstr.bubbleapps.io/api/1.1
SUPABASE_SERVICE_ROLE_KEY=[from Supabase dashboard]
```

### 5. Data Consistency Requirements

#### Workflows Requiring Atomic Sync

| Workflow | Bubble Object Type | Supabase Table | Conflict Resolution Key |
|----------|-------------------|----------------|------------------------|
| Listing Creation | `zat_listings` | `zat_listings` | `_id` |
| Photo Upload | `zat_listing_photos` | `zat_listing_photos` | `_id` |
| AI Signup Guest | `zat_users` | `zat_users` | `_id` |
| Referral Tracking | `zat_referrals` | `zat_referrals` | `_id` |

#### Workflows NOT Requiring Sync (Trigger-Only)

| Workflow | Reason |
|----------|--------|
| Contact Host | Email/notification only, no data persistence |
| Logout | Session invalidation only |

---

## Target Architecture

### 1. Directory Structure

```
Split Lease/
├── supabase/
│   ├── config.toml                          # Supabase project config
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── types.ts                     # TypeScript type definitions
│   │   │   ├── cors.ts                      # CORS configuration
│   │   │   ├── errors.ts                    # Error handling utilities
│   │   │   ├── validation.ts                # Input validation
│   │   │   └── bubbleSync.ts                # ⭐ Core sync service
│   │   │
│   │   ├── bubble-proxy/
│   │   │   ├── index.ts                     # ⭐ Main router/entry point
│   │   │   ├── handlers/
│   │   │   │   ├── listing.ts               # Listing workflows
│   │   │   │   ├── photos.ts                # Photo upload
│   │   │   │   ├── messaging.ts             # Contact host
│   │   │   │   ├── referral.ts              # Referral tracking
│   │   │   │   └── signup.ts                # AI signup
│   │   │   └── README.md
│   │   │
│   │   └── bubble-auth-proxy/
│   │       ├── index.ts                     # Auth workflows router
│   │       ├── handlers/
│   │       │   ├── login.ts                 # Login flow
│   │       │   ├── signup.ts                # Signup flow
│   │       │   ├── logout.ts                # Logout flow
│   │       │   └── validate.ts              # Token validation
│   │       └── README.md
│   │
│   └── migrations/
│       └── [timestamp]_add_edge_function_logs.sql  # Optional: logging table
│
└── app/
    ├── .env.example                         # ⚠️ REMOVE BUBBLE_API_KEY references
    ├── .env                                 # ⚠️ DELETE BUBBLE_API_KEY
    └── src/
        └── lib/
            ├── bubbleAPI.js                 # ⚠️ REWRITE to use Edge Functions
            └── auth.js                      # ⚠️ REWRITE to use Edge Functions
```

### 2. Module Responsibilities

#### `_shared/bubbleSync.ts` - Core Sync Service

**Purpose:** Atomic Bubble-to-Supabase synchronization using "Write-Read-Write" pattern

**Key Methods:**
```typescript
class BubbleSyncService {
  // 1. Trigger Bubble workflow and extract created item ID
  triggerWorkflow(workflowName: string, params: Record<string, any>): Promise<string>

  // 2. Fetch full object data from Bubble Data API
  fetchBubbleObject(objectType: string, objectId: string): Promise<any>

  // 3. Sync Bubble object to Supabase table (service role, bypasses RLS)
  syncToSupabase(table: string, data: any): Promise<any>

  // 4. Atomic create-and-sync operation (combines 1-3)
  createAndSync(
    workflowName: string,
    params: Record<string, any>,
    bubbleObjectType: string,
    supabaseTable: string
  ): Promise<any>
}
```

**Error Handling:**
- Bubble API failures → throw with context
- Supabase sync failures → throw with context
- NO retries (fail fast, let client retry)
- NO fallbacks (atomic or nothing)

#### `bubble-proxy/index.ts` - Main Request Router

**Responsibilities:**
1. Parse incoming requests (`{ action, payload }`)
2. Authenticate user via Supabase Auth
3. Route to appropriate handler based on `action`
4. Return standardized responses: `{ success: boolean, data?: any, error?: string }`

**Supported Actions:**
- `create_listing` → `handlers/listing.ts:handleListingCreate()`
- `upload_photos` → `handlers/photos.ts:handlePhotoUpload()`
- `send_message` → `handlers/messaging.ts:handleSendMessage()`
- `submit_referral` → `handlers/referral.ts:handleReferral()`
- `signup_ai` → `handlers/signup.ts:handleAiSignup()`

#### `bubble-auth-proxy/index.ts` - Auth Workflows Router

**Responsibilities:**
1. Handle authentication workflows separately (different Bubble domain)
2. No user authentication required (these ARE the auth endpoints)
3. Manage Bubble tokens and sync to Supabase Auth

**Supported Actions:**
- `login` → `handlers/login.ts:handleLogin()`
- `signup` → `handlers/signup.ts:handleSignup()`
- `logout` → `handlers/logout.ts:handleLogout()`
- `validate_token` → `handlers/validate.ts:handleValidateToken()`

### 3. Authentication Flow

#### Current Flow (Client-Side)
```
Client → Bubble Auth API → localStorage (token) → Client manages session
```

#### New Flow (Edge-Proxied)
```
Client → bubble-auth-proxy Edge Function → Bubble Auth API → Supabase Auth (sync) → Client
```

**Key Changes:**
- Bubble tokens stored in Supabase Auth custom claims
- Dual session management: Supabase Auth (primary) + Bubble token (synced)
- Edge Function validates Supabase session, then uses Bubble token for Bubble API calls

### 4. Data Flow Diagrams

#### Atomic Create-and-Sync Flow
```
┌─────────┐     1. invoke          ┌──────────────────┐
│ Client  │────────────────────────→│ Edge Function    │
└─────────┘                         │ (bubble-proxy)   │
                                    └──────────────────┘
                                             │
                                    2. POST /wf/create
                                             ↓
                                    ┌──────────────────┐
                                    │  Bubble API      │
                                    │  (Source of      │
                                    │   Truth)         │
                                    └──────────────────┘
                                             │
                                    3. return { id: "..." }
                                             ↓
                                    ┌──────────────────┐
                                    │ Edge Function    │
                                    └──────────────────┘
                                             │
                                    4. GET /obj/{type}/{id}
                                             ↓
                                    ┌──────────────────┐
                                    │  Bubble Data API │
                                    └──────────────────┘
                                             │
                                    5. return { full data }
                                             ↓
                                    ┌──────────────────┐
                                    │ Edge Function    │
                                    └──────────────────┘
                                             │
                                    6. UPSERT (service role)
                                             ↓
                                    ┌──────────────────┐
                                    │  Supabase DB     │
                                    │  (Synchronized   │
                                    │   Replica)       │
                                    └──────────────────┘
                                             │
                                    7. return synced data
                                             ↓
┌─────────┐     8. return data     ┌──────────────────┐
│ Client  │←────────────────────────│ Edge Function    │
└─────────┘                         └──────────────────┘
```

**Transaction Boundary:** Steps 2-6 execute on server. Client only receives response once sync is complete.

---

## Implementation Plan

### Phase 1: Foundation (Day 1)

#### 1.1 Initialize Supabase Functions
```bash
cd "C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease"
supabase init
supabase functions new bubble-proxy
supabase functions new bubble-auth-proxy
```

#### 1.2 Create Shared Utilities
**Files to create:**
- `supabase/functions/_shared/types.ts`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/errors.ts`
- `supabase/functions/_shared/validation.ts`
- `supabase/functions/_shared/bubbleSync.ts` ⭐

#### 1.3 Configure Secrets
```bash
supabase secrets set BUBBLE_API_BASE_URL="https://app.split.lease/version-test/api/1.1"
supabase secrets set BUBBLE_API_KEY="5dbb448f9a6bbb043cb56ac16b8de109"
supabase secrets set BUBBLE_AUTH_BASE_URL="https://upgradefromstr.bubbleapps.io/api/1.1"
```

**Verify secrets:**
```bash
supabase secrets list
```

### Phase 2: Core Workflows (Day 2-3)

#### Priority 1: Listing Creation (CRITICAL)
**Estimated Effort:** 4 hours

**Files to create:**
- `supabase/functions/bubble-proxy/index.ts`
- `supabase/functions/bubble-proxy/handlers/listing.ts`

**Files to modify:**
- `app/src/lib/bubbleAPI.js` - Replace `createListingInCode()` with Edge Function call
- `app/src/islands/shared/CreateDuplicateListingModal/CreateDuplicateListingModal.jsx` - Test integration

**Success Criteria:**
- ✅ Listing created in Bubble
- ✅ Listing synced to Supabase atomically
- ✅ Client receives synced listing data
- ✅ No API key in client bundle
- ✅ Redirect to `/self-listing.html?listing_id={id}` works

#### Priority 2: Photo Upload (HIGH)
**Estimated Effort:** 3 hours

**Files to create:**
- `supabase/functions/bubble-proxy/handlers/photos.ts`

**Files to modify:**
- `app/src/islands/shared/SubmitListingPhotos/SubmitListingPhotos.jsx`

**Challenges:**
- Handle `multipart/form-data` in Edge Function
- Stream files to Bubble API
- Sync photo metadata to Supabase

**Success Criteria:**
- ✅ Photos uploaded to Bubble
- ✅ Photo metadata synced to Supabase
- ✅ No API key in client bundle

#### Priority 3: Contact Host Messaging (HIGH)
**Estimated Effort:** 2 hours

**Files to create:**
- `supabase/functions/bubble-proxy/handlers/messaging.ts`

**Files to modify:**
- `app/src/islands/shared/ContactHostMessaging.jsx`

**Note:** This workflow does NOT require sync (email/notification only)

**Success Criteria:**
- ✅ Message sent to host via Bubble
- ✅ No API key in client bundle
- ✅ User authentication enforced

### Phase 3: Authentication Workflows (Day 4-5)

#### Auth Migration Strategy
**Estimated Effort:** 6 hours

**Decision Required:** Should we migrate authentication to Supabase Auth entirely, or keep Bubble as auth source?

**Option A: Keep Bubble as Auth Source (Recommended)**
- Less disruptive
- Sync Bubble tokens to Supabase custom claims
- Edge Function acts as proxy

**Option B: Migrate to Supabase Auth**
- More secure
- Better integration with Supabase ecosystem
- Requires data migration and user re-authentication

**Files to create (Option A):**
- `supabase/functions/bubble-auth-proxy/index.ts`
- `supabase/functions/bubble-auth-proxy/handlers/login.ts`
- `supabase/functions/bubble-auth-proxy/handlers/signup.ts`
- `supabase/functions/bubble-auth-proxy/handlers/logout.ts`

**Files to modify:**
- `app/src/lib/auth.js` - Replace all `fetch()` calls with Edge Function invocations

### Phase 4: Secondary Workflows (Day 6)

#### AI Signup Guest (MEDIUM)
**Estimated Effort:** 3 hours

**Files to create:**
- `supabase/functions/bubble-proxy/handlers/signup.ts`

**Files to modify:**
- `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx:105-106` ⚠️ **REMOVE HARDCODED API KEY**

**Success Criteria:**
- ✅ AI signup data submitted to Bubble
- ✅ User data synced to Supabase
- ✅ NO hardcoded API key
- ✅ NO hardcoded URL

#### Referral Tracking (LOW)
**Estimated Effort:** 2 hours

**Files to create:**
- `supabase/functions/bubble-proxy/handlers/referral.ts`

**Files to modify:**
- `app/src/islands/shared/Footer.jsx:46`

### Phase 5: Client-Side Cleanup (Day 7)

#### 5.1 Remove API Keys from Client
```bash
# Remove from .env
sed -i '/VITE_BUBBLE_API_KEY/d' app/.env
sed -i '/VITE_BUBBLE_API_BASE_URL/d' app/.env

# Update .env.example
# Remove VITE_BUBBLE_API_KEY and VITE_BUBBLE_API_BASE_URL references
```

#### 5.2 Update Documentation
**Files to update:**
- `README.md` - Remove Bubble API key setup instructions
- `BUBBLE_WORKFLOW_API_ENUMERATION.md` - Add Edge Function migration notes
- `app/.env.example` - Remove Bubble API key references

#### 5.3 Security Audit
**Checklist:**
- [ ] `VITE_BUBBLE_API_KEY` not in any `.env` file
- [ ] No hardcoded API keys in source code
- [ ] No hardcoded Bubble URLs in source code (except constants.js for display URLs)
- [ ] All workflow calls go through Edge Functions
- [ ] Supabase secrets configured correctly
- [ ] Edge Functions enforce authentication

### Phase 6: Testing & Validation (Day 8)

#### 6.1 Unit Tests
- Test `BubbleSyncService` methods independently
- Mock Bubble API responses
- Test error handling paths

#### 6.2 Integration Tests
- Test each Edge Function handler
- Test authentication flow
- Test atomic sync operations

#### 6.3 End-to-End Tests
- Create listing flow (CreateDuplicateListingModal)
- Upload photos flow (SubmitListingPhotos)
- Contact host flow (ContactHostMessaging)
- AI signup flow (AiSignupMarketReport)

#### 6.4 Security Tests
- Verify API keys not in browser
- Verify Edge Functions require authentication
- Verify service role key only used server-side

### Phase 7: Deployment & Monitoring (Day 9)

#### 7.1 Deploy Edge Functions
```bash
# Deploy to Supabase production
supabase functions deploy bubble-proxy
supabase functions deploy bubble-auth-proxy

# Verify deployment
supabase functions list
```

#### 7.2 Environment Variables
```bash
# Production Supabase secrets
supabase secrets set --env production BUBBLE_API_BASE_URL="https://app.split.lease/api/1.1"
supabase secrets set --env production BUBBLE_API_KEY="[production key]"
supabase secrets set --env production BUBBLE_AUTH_BASE_URL="https://upgradefromstr.bubbleapps.io/api/1.1"
```

#### 7.3 Monitoring Setup
- Enable Edge Function logs in Supabase dashboard
- Set up error alerting
- Monitor success rates for each workflow

#### 7.4 Rollback Plan
**If error rate > 1% in first 24 hours:**
1. Revert `app/src/lib/bubbleAPI.js` to backup
2. Revert `app/src/lib/auth.js` to backup
3. Re-add `VITE_BUBBLE_API_KEY` to `.env`
4. Rebuild and redeploy client

---

## Risk Assessment & Mitigation

### High-Risk Areas

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Bubble API response format changes | HIGH | LOW | Flexible ID extraction logic, comprehensive error messages |
| Network timeout during atomic sync | MEDIUM | MEDIUM | Fail fast, no retries, let client retry with idempotency |
| Race conditions on concurrent requests | MEDIUM | LOW | Use Bubble IDs as conflict resolution key in Supabase |
| Edge Function cold starts | LOW | HIGH | Keep warm with periodic pings (future enhancement) |
| Authentication state desync | HIGH | LOW | Dual validation: Supabase session + Bubble token |
| Data schema mismatch Bubble ↔ Supabase | MEDIUM | MEDIUM | Validate data before sync, log mismatches |

### Critical Path Dependencies

1. **Supabase Edge Functions availability** - If Supabase has outage, entire system fails
   - **Mitigation:** Monitor Supabase status page, have rollback plan ready

2. **Bubble API availability** - If Bubble is down, workflows fail
   - **Mitigation:** This is existing risk, no change in surface area

3. **Service Role Key security** - If leaked, attacker bypasses RLS
   - **Mitigation:** Never log, rotate quarterly, use Supabase Vault

### Testing Strategy

#### Regression Tests
- All existing user flows must continue working
- No user-facing behavior changes
- Performance within 10% of baseline

#### Stress Tests
- Concurrent listing creation (10 simultaneous users)
- Large photo uploads (>10MB files)
- Rapid authentication requests (simulate login storm)

---

## Success Metrics

### Functional Requirements
- ✅ All workflows route through Edge Functions
- ✅ Zero API keys exposed in client bundle
- ✅ Atomic sync: Bubble → Supabase (no ghost data)
- ✅ Error handling with proper rollback
- ✅ Authentication enforced on all requests

### Performance Requirements
- ✅ Response time < 2 seconds for create operations
- ✅ 99.9% success rate for atomic operations
- ✅ Zero data loss (Bubble and Supabase always consistent)

### Security Requirements
- ✅ API keys stored in Supabase Secrets only
- ✅ User authentication required for all workflows (except auth itself)
- ✅ Service role key used only server-side
- ✅ CORS configured for production domain only

---

## Timeline Estimate

| Phase | Duration | Blocking Dependencies |
|-------|----------|----------------------|
| Phase 1: Foundation | 1 day | None |
| Phase 2: Core Workflows | 2 days | Phase 1 |
| Phase 3: Auth Workflows | 2 days | Phase 1 |
| Phase 4: Secondary Workflows | 1 day | Phase 1 |
| Phase 5: Cleanup | 1 day | Phase 2, 3, 4 |
| Phase 6: Testing | 1 day | Phase 5 |
| Phase 7: Deployment | 1 day | Phase 6 |

**Total Estimated Duration: 9 days (1-2 developer weeks)**

---

## Post-Migration Validation

### Week 1 Monitoring
- Monitor error rates hourly
- Check Bubble ↔ Supabase consistency daily
- User feedback collection

### Week 2-4 Monitoring
- Monitor error rates daily
- Performance baseline comparison
- Cost analysis (Supabase Edge Function usage)

### Month 2+ Optimization
- Implement caching if needed
- Optimize Edge Function cold starts
- Add comprehensive logging
- Implement retry logic if justified by data

---

## Appendix A: Code Snippets

### A.1 BubbleSyncService (Core Implementation)

```typescript
// supabase/functions/_shared/bubbleSync.ts

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export class BubbleSyncService {
  private bubbleBaseUrl: string;
  private bubbleApiKey: string;
  private supabaseClient: SupabaseClient;

  constructor(bubbleBaseUrl: string, bubbleApiKey: string, supabaseServiceKey: string) {
    if (!bubbleBaseUrl || !bubbleApiKey || !supabaseServiceKey) {
      throw new Error('BubbleSyncService: Missing required configuration');
    }

    this.bubbleBaseUrl = bubbleBaseUrl;
    this.bubbleApiKey = bubbleApiKey;
    this.supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  /**
   * Trigger a Bubble workflow and extract the created item ID
   * NO FALLBACK - Throws if workflow fails or ID not found
   */
  async triggerWorkflow(workflowName: string, params: Record<string, any>): Promise<string> {
    const url = `${this.bubbleBaseUrl}/wf/${workflowName}`;

    console.log(`[BubbleSync] Triggering workflow: ${workflowName}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.bubbleApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bubble workflow failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const id = this.extractId(data);

    console.log(`[BubbleSync] Workflow completed, ID: ${id}`);
    return id;
  }

  /**
   * Fetch full object data from Bubble Data API
   * NO FALLBACK - Throws if fetch fails
   */
  async fetchBubbleObject(objectType: string, objectId: string): Promise<any> {
    const url = `${this.bubbleBaseUrl}/obj/${objectType}/${objectId}`;

    console.log(`[BubbleSync] Fetching object: ${objectType}/${objectId}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.bubbleApiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Bubble object: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[BubbleSync] Fetched object with ${Object.keys(data).length} fields`);

    return data.response || data;
  }

  /**
   * Sync Bubble object to Supabase table using service role
   * NO FALLBACK - Throws if sync fails
   */
  async syncToSupabase(table: string, data: any): Promise<any> {
    console.log(`[BubbleSync] Syncing to Supabase table: ${table}`);

    const { data: syncedData, error } = await this.supabaseClient
      .from(table)
      .upsert(data, { onConflict: '_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase sync failed: ${error.message}`);
    }

    console.log(`[BubbleSync] Sync successful, ID: ${syncedData._id}`);
    return syncedData;
  }

  /**
   * Atomic create-and-sync operation
   * NO FALLBACK - All-or-nothing transaction
   */
  async createAndSync(
    workflowName: string,
    params: Record<string, any>,
    bubbleObjectType: string,
    supabaseTable: string
  ): Promise<any> {
    console.log(`[BubbleSync] ========== ATOMIC CREATE-AND-SYNC ==========`);
    console.log(`[BubbleSync] Workflow: ${workflowName}`);
    console.log(`[BubbleSync] Object Type: ${bubbleObjectType}`);
    console.log(`[BubbleSync] Table: ${supabaseTable}`);

    try {
      // Step 1: Create in Bubble (source of truth)
      const bubbleId = await this.triggerWorkflow(workflowName, params);

      // Step 2: Fetch fresh data from Bubble
      const bubbleData = await this.fetchBubbleObject(bubbleObjectType, bubbleId);

      // Step 3: Sync to Supabase
      const syncedData = await this.syncToSupabase(supabaseTable, bubbleData);

      console.log(`[BubbleSync] ========== SYNC COMPLETE ==========`);
      return syncedData;
    } catch (error) {
      console.error(`[BubbleSync] ========== SYNC FAILED ==========`);
      console.error(`[BubbleSync] Error:`, error);
      throw error;
    }
  }

  /**
   * Extract ID from Bubble response (handles various formats)
   * NO FALLBACK - Throws if ID not found
   */
  private extractId(response: any): string {
    const id = response?.response?.listing_id
      || response?.response?.id
      || response?.listing_id
      || response?.id;

    if (!id) {
      console.error('[BubbleSync] Response structure:', JSON.stringify(response, null, 2));
      throw new Error('No ID found in Bubble response. Response structure may have changed.');
    }

    return id;
  }
}
```

### A.2 Edge Function Router (Main Entry Point)

```typescript
// supabase/functions/bubble-proxy/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleSyncService } from '../_shared/bubbleSync.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { handleListingCreate } from './handlers/listing.ts';
import { handlePhotoUpload } from './handlers/photos.ts';
import { handleSendMessage } from './handlers/messaging.ts';
import { handleReferral } from './handlers/referral.ts';
import { handleAiSignup } from './handlers/signup.ts';

console.log('bubble-proxy Edge Function started');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user via Supabase Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[bubble-proxy] Auth error:', authError);
      throw new Error('Unauthorized');
    }

    console.log(`[bubble-proxy] Authenticated user: ${user.email}`);

    // 2. Parse request body
    const { action, payload } = await req.json();
    console.log(`[bubble-proxy] Action: ${action}`);

    if (!action) {
      throw new Error('Missing action parameter');
    }

    // 3. Initialize sync service
    const syncService = new BubbleSyncService(
      Deno.env.get('BUBBLE_API_BASE_URL')!,
      Deno.env.get('BUBBLE_API_KEY')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 4. Route to appropriate handler
    let result;
    switch (action) {
      case 'create_listing':
        result = await handleListingCreate(syncService, payload, user);
        break;
      case 'upload_photos':
        result = await handlePhotoUpload(syncService, payload, user);
        break;
      case 'send_message':
        result = await handleSendMessage(syncService, payload, user);
        break;
      case 'submit_referral':
        result = await handleReferral(syncService, payload, user);
        break;
      case 'signup_ai':
        result = await handleAiSignup(syncService, payload, user);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // 5. Return success response
    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[bubble-proxy] Error:', error);

    const status = error.message === 'Unauthorized' ? 401 : 500;

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

### A.3 Client-Side Adapter (Updated)

```javascript
// app/src/lib/bubbleAPI.js (AFTER migration)

/**
 * Bubble.io API Service - Edge Function Proxy
 *
 * ALL Bubble workflow calls now route through Supabase Edge Functions.
 * This ensures atomic operations and secure API key storage.
 *
 * NO FALLBACK: If Edge Function fails, we fail. No client-side retry logic.
 */

import { supabase } from './supabase.js';

/**
 * Create a new listing via Edge Function
 * NO FALLBACK - Throws if Edge Function fails
 */
export async function createListingInCode(listingName, userEmail = null) {
  console.log('[Bubble API] Creating listing via Edge Function');
  console.log('[Bubble API] Listing name:', listingName);

  if (!listingName?.trim()) {
    throw new Error('Listing name is required');
  }

  const { data, error } = await supabase.functions.invoke('bubble-proxy', {
    body: {
      action: 'create_listing',
      payload: {
        listing_name: listingName.trim()
      }
    }
  });

  if (error) {
    console.error('[Bubble API] Edge Function error:', error);
    throw new Error(error.message || 'Failed to create listing');
  }

  if (!data.success) {
    throw new Error(data.error || 'Unknown error');
  }

  console.log('[Bubble API] Listing created and synced:', data.data);
  return data.data;
}

/**
 * Generic workflow trigger (DEPRECATED)
 * Use specific functions like createListingInCode instead
 */
export async function triggerBubbleWorkflow(workflowName, parameters = {}) {
  console.warn('[Bubble API] triggerBubbleWorkflow is deprecated and will be removed.');
  console.warn('[Bubble API] Use Edge Function proxies instead.');
  throw new Error('Direct Bubble workflow calls are not supported. Use Edge Functions.');
}
```

---

## Appendix B: Deployment Scripts

### B.1 Initial Setup Script

```bash
#!/bin/bash
# setup_edge_functions.sh

set -e

echo "🚀 Setting up Supabase Edge Functions for Bubble API migration"

# 1. Initialize Supabase (if not already done)
if [ ! -d "supabase" ]; then
  echo "📦 Initializing Supabase..."
  supabase init
else
  echo "✅ Supabase already initialized"
fi

# 2. Create Edge Functions
echo "📝 Creating Edge Functions..."
supabase functions new bubble-proxy
supabase functions new bubble-auth-proxy

# 3. Set secrets
echo "🔐 Setting secrets..."
read -p "Enter BUBBLE_API_KEY: " BUBBLE_API_KEY
read -p "Enter SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY

supabase secrets set BUBBLE_API_BASE_URL="https://app.split.lease/version-test/api/1.1"
supabase secrets set BUBBLE_API_KEY="$BUBBLE_API_KEY"
supabase secrets set BUBBLE_AUTH_BASE_URL="https://upgradefromstr.bubbleapps.io/api/1.1"

echo "✅ Secrets configured"

# 4. Deploy functions
echo "🚢 Deploying Edge Functions..."
supabase functions deploy bubble-proxy
supabase functions deploy bubble-auth-proxy

echo "🎉 Setup complete!"
```

### B.2 Cleanup Script

```bash
#!/bin/bash
# cleanup_api_keys.sh

set -e

echo "🧹 Cleaning up API keys from client-side code"

# 1. Backup .env
cp app/.env app/.env.backup.$(date +%Y%m%d_%H%M%S)

# 2. Remove Bubble API keys from .env
echo "🔑 Removing BUBBLE_API_KEY from .env..."
sed -i '/VITE_BUBBLE_API_KEY/d' app/.env
sed -i '/VITE_BUBBLE_API_BASE_URL/d' app/.env

# 3. Update .env.example
echo "📝 Updating .env.example..."
sed -i '/VITE_BUBBLE_API_KEY/d' app/.env.example
sed -i '/VITE_BUBBLE_API_BASE_URL/d' app/.env.example

# 4. Search for hardcoded API keys
echo "🔍 Searching for hardcoded API keys..."
if grep -r "5dbb448f9a6bbb043cb56ac16b8de109" app/src/; then
  echo "⚠️  WARNING: Hardcoded API key found! Please remove manually."
  exit 1
fi

echo "✅ Cleanup complete!"
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-24
**Next Review:** After Phase 1 completion
