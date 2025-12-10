# Bubble-Proxy Edge Function - Usage Analysis

**Date**: 2025-12-10
**Status**: Analysis Complete
**Purpose**: Understand why bubble-proxy still exists and what functionality requires Bubble API

---

## Executive Summary

The `bubble-proxy` edge function serves as a **legacy bridge** to Bubble.io's backend workflows. It exists because certain operations **cannot be performed without Bubble**:

1. **Photo uploads** - Bubble handles image storage and creates Listing-Photo records
2. **Email/notification workflows** - Bubble sends emails via its workflow engine
3. **Referral tracking** - Data synced to Bubble's zat_referrals table
4. **AI market inquiry** - Creates records in Bubble's zat_users table

Some actions have been **migrated to dedicated edge functions** (listing, proposal) but the frontend still calls bubble-proxy for them (technical debt).

---

## Current Actions in bubble-proxy

### Active Actions (7 total)

| Action | Handler | Requires Bubble API | Why |
|--------|---------|---------------------|-----|
| `upload_photos` | `photos.ts` | **YES** | Bubble stores images and creates Listing-Photo records |
| `send_message` | `messaging.ts` | **YES** | Triggers Bubble workflow that sends email notifications to hosts |
| `submit_referral` | `referral.ts` | **YES** | Creates record in Bubble's `zat_referrals` table with atomic sync |
| `ai_inquiry` | `aiInquiry.ts` | **YES** | Creates record in Bubble's `zat_users` table with atomic sync |
| `toggle_favorite` | `favorites.ts` | **NO** | Supabase-only (uses RPC function) |
| `get_favorites` | `getFavorites.ts` | **NO** | Supabase-only |
| `parse_profile` | `parseProfile.ts` | **NO** | Uses OpenAI + Supabase only |

### Deprecated Actions (marked in index.ts comments)

| Action | New Location | Status |
|--------|--------------|--------|
| `create_listing` | `POST /functions/v1/listing` action: "create" | **Frontend still calls bubble-proxy** |
| `get_listing` | `POST /functions/v1/listing` action: "get" | **Frontend still calls bubble-proxy** |
| `submit_listing` | `POST /functions/v1/listing` action: "submit" | **Frontend still calls bubble-proxy** |
| `create_proposal` | `POST /functions/v1/proposal` action: "create" | Migrated |

---

## Detailed Handler Analysis

### 1. `upload_photos` - **REQUIRES BUBBLE**

**File**: `handlers/photos.ts`

**Why Bubble is required**:
- Bubble stores images in its CDN
- Bubble workflow `listing_photos_section_in_code` creates `Listing-Photo` records
- Photos are associated with listings via Bubble's object relationships
- Sort order (cover photo) is managed by Bubble

**Bubble Workflow Called**: `listing_photos_section_in_code`

**Data Flow**:
```
Frontend (base64 photos)
  → Edge Function (converts to Bubble file format)
  → Bubble Workflow (stores images, creates Listing-Photo records)
  → No sync back (photos stored only in Bubble)
```

**Migration Possibility**: Would require implementing image storage in Supabase Storage, then syncing photo metadata to Bubble. Complex.

---

### 2. `send_message` - **REQUIRES BUBBLE**

**File**: `handlers/messaging.ts`

**Why Bubble is required**:
- Bubble workflow handles email sending via SendGrid/Postmark integration
- Notification logic lives in Bubble
- No persistent data created (notification only)

**Bubble Workflow Called**: `core-contact-host-send-message`

**Data Flow**:
```
Frontend (message details)
  → Edge Function (validates, proxies)
  → Bubble Workflow (sends email to host)
  → Returns success (no sync)
```

**Migration Possibility**: Replace with Supabase Edge Function + email provider (Resend, SendGrid). Moderate complexity.

---

### 3. `submit_referral` - **REQUIRES BUBBLE**

**File**: `handlers/referral.ts`

**Why Bubble is required**:
- Bubble is source of truth for `zat_referrals` table
- Uses atomic `createAndSync` pattern (Bubble → Supabase)
- Referral tracking tied to Bubble's CRM features

**Bubble Workflow Called**: `referral-index-lite`

**Data Flow**:
```
Frontend (referral data)
  → Edge Function
  → Bubble Workflow (creates referral)
  → Fetch from Bubble Data API
  → Sync to Supabase zat_referrals
```

**Migration Possibility**: Create referrals directly in Supabase if Bubble's referral features aren't used. Low complexity.

---

### 4. `ai_inquiry` - **REQUIRES BUBBLE**

**File**: `handlers/aiInquiry.ts`

**Why Bubble is required**:
- Creates lead in Bubble's `zat_users` table
- Market research data synced to both systems
- Original workflow: `ai-signup-guest`

**Bubble Workflow Called**: `ai-signup-guest`

**Data Flow**:
```
Frontend (email, inquiry text)
  → Edge Function (validates)
  → Bubble Workflow (creates user/lead record)
  → Fetch from Bubble Data API
  → Sync to Supabase zat_users
```

**Migration Possibility**: Store leads directly in Supabase. Would require removing Bubble's lead tracking. Low-medium complexity.

---

### 5. `toggle_favorite` - **NO BUBBLE REQUIRED**

**File**: `handlers/favorites.ts`

**Why it's in bubble-proxy**: Historical reasons - was part of the migration batch.

**Data Flow**:
```
Frontend (userId, listingId, action)
  → Edge Function
  → Supabase RPC function `update_user_favorites`
  → Returns updated favorites
```

**Should be moved to**: Could be a dedicated `favorites` edge function or just direct Supabase calls from frontend.

---

### 6. `get_favorites` - **NO BUBBLE REQUIRED**

**File**: `handlers/getFavorites.ts`

**Why it's in bubble-proxy**: Historical reasons.

**Data Flow**:
```
Frontend (userId)
  → Edge Function
  → Supabase query (user table → listing table)
  → Returns transformed listings
```

**Should be moved to**: Could be direct Supabase query from frontend (with proper RLS).

---

### 7. `parse_profile` - **NO BUBBLE REQUIRED**

**File**: `handlers/parseProfile.ts`

**Why it's in bubble-proxy**: Part of AI signup flow, colocated for convenience.

**Data Flow**:
```
Frontend (user_id, text)
  → Edge Function
  → OpenAI GPT-4 (parse freeform text)
  → Supabase queries (match boroughs, hoods)
  → Supabase update (user profile)
  → Returns matched listings
```

**Should be moved to**: Could be in `ai-gateway` or dedicated `profile` edge function.

---

## Frontend Usage Summary

### Files That Call bubble-proxy

| File | Actions Used | Notes |
|------|--------------|-------|
| `app/src/lib/bubbleAPI.js` | `create_listing`, `get_listing`, `upload_photos`, `submit_listing` | **3 deprecated actions still routed here** |
| `app/src/islands/shared/ContactHostMessaging.jsx` | `send_message` | Active |
| `app/src/islands/shared/Footer.jsx` | `submit_referral` | Active |
| `app/src/islands/shared/FavoriteButton/FavoriteButton.jsx` | `toggle_favorite` | Could be direct Supabase |
| `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx` | `parse_profile` | Active |
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | `getHostListings`, `getProposalsForListing`, `deleteProposal`, `acceptProposal` | **Non-existent actions!** |

### Technical Debt Identified

1. **bubbleAPI.js** calls deprecated actions (`create_listing`, `get_listing`, `submit_listing`) that should route to `/functions/v1/listing`

2. **useHostProposalsPageLogic.js** calls actions that DON'T EXIST in bubble-proxy:
   - `getHostListings` - Not implemented
   - `getProposalsForListing` - Not implemented
   - `deleteProposal` - Not implemented
   - `acceptProposal` - Not implemented

---

## BubbleSyncService Analysis

**File**: `supabase/functions/_shared/bubbleSync.ts`

The `BubbleSyncService` class implements the **Write-Read-Write** atomic pattern:

```typescript
// Pattern:
1. triggerWorkflow() → Create in Bubble
2. fetchBubbleObject() → Read full data from Bubble Data API
3. syncToSupabase() → Write to Supabase replica
```

**Methods**:
- `createAndSync()` - Full atomic operation (used by referral, ai_inquiry)
- `triggerWorkflowOnly()` - No sync, just trigger (used by messaging, photos)
- `fetchBubbleObject()` - Manual fetch from Bubble Data API
- `syncToSupabase()` - Manual sync to Supabase

**Why This Pattern Exists**:
- Bubble is the **source of truth** for certain data
- Supabase is a **replica** for faster reads
- Atomic operations ensure data consistency

---

## Migration Roadmap

### Phase 1: Remove Non-Bubble Actions from bubble-proxy

| Action | Migration Target |
|--------|------------------|
| `toggle_favorite` | Move to dedicated `favorites` edge function or direct Supabase RPC |
| `get_favorites` | Move to direct Supabase query with RLS |
| `parse_profile` | Move to `ai-gateway` or new `profile` edge function |

### Phase 2: Fix Frontend Technical Debt

| File | Issue | Fix |
|------|-------|-----|
| `bubbleAPI.js` | Calls deprecated `create_listing`, `get_listing`, `submit_listing` | Route to `/functions/v1/listing` |
| `useHostProposalsPageLogic.js` | Calls non-existent actions | Route to `/functions/v1/proposal` or Supabase |

### Phase 3: Evaluate Bubble Dependency

| Action | Bubble Dependency | Migration Difficulty |
|--------|-------------------|---------------------|
| `upload_photos` | Image storage | **HIGH** - Requires Supabase Storage setup |
| `send_message` | Email sending | **MEDIUM** - Add email provider to Supabase |
| `submit_referral` | Referral tracking | **LOW** - Can store in Supabase if Bubble CRM unused |
| `ai_inquiry` | Lead tracking | **LOW-MEDIUM** - Can store in Supabase |

---

## Conclusion

**Why bubble-proxy still exists**:

1. **Photo uploads** - Bubble manages image storage and Listing-Photo records
2. **Email notifications** - Bubble's workflow engine sends emails
3. **Atomic sync** - Pattern ensures Bubble remains source of truth for certain data
4. **Technical debt** - Some actions haven't been migrated yet

**Recommended Actions**:

1. **Immediate**: Fix broken `useHostProposalsPageLogic.js` calls
2. **Short-term**: Move Supabase-only actions out of bubble-proxy
3. **Medium-term**: Update `bubbleAPI.js` to use dedicated edge functions
4. **Long-term**: Evaluate replacing Bubble's photo storage and email with Supabase equivalents

---

## Files Referenced

| File | Purpose |
|------|---------|
| `supabase/functions/bubble-proxy/index.ts` | Main router |
| `supabase/functions/bubble-proxy/handlers/*.ts` | Individual handlers |
| `supabase/functions/_shared/bubbleSync.ts` | Bubble sync service |
| `app/src/lib/bubbleAPI.js` | Frontend Bubble API wrapper |
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | Broken calls |

---

**Analysis By**: Claude Code
