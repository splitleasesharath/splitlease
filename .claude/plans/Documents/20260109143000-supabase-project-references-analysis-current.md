# Supabase Project References Analysis

**Date**: 2026-01-09
**Purpose**: Comprehensive inventory of all Supabase API endpoint references and project ID usages for dev/prod environment planning
**Status**: Current

---

## Executive Summary

This document catalogs all references to Supabase endpoints and the production project ID (`qcfifybkaddcoimjroca`) in the Split Lease codebase. The analysis reveals that environment separation is well-architected except for **one critical issue**: hardcoded production URLs in the `AiSignupMarketReport` component.

### Supabase Projects

| Environment | Project ID | Region | Status |
|-------------|-----------|--------|--------|
| **Production** | `qcfifybkaddcoimjroca` | us-east-2 | Active & Healthy |
| **Development** | `qzsmhgyojmwvtjmnrdea` | us-east-2 | Active & Healthy |

---

## Critical Finding: Hardcoded Production URLs

**File**: `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`

**Locations**: Lines 215, 358, 475

**Code Pattern**:
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qcfifybkaddcoimjroca.supabase.co';
```

**Impact**: This hardcoded fallback prevents true dev/prod separation for the AI Signup Market Report feature. When `VITE_SUPABASE_URL` is missing, the component will always default to production.

**Recommendation**: Remove the fallback and fail fast if the environment variable is missing, following the pattern in `app/src/lib/supabase.js`.

---

## Reference Inventory by Category

### 1. Environment Configuration Files

#### Frontend Environment Variables (Vite)

**File**: `app/.env` (Production credentials - should not be committed)
```env
VITE_SUPABASE_URL=https://qcfifybkaddcoimjroca.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**File**: `app/.env.example` (Template)
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Usage**: Frontend environment variables are prefixed with `VITE_` and injected at build time.

---

### 2. Primary Supabase Client Initialization

**File**: `app/src/lib/supabase.js`

**Implementation**: ✅ Correct pattern
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Pattern**: Fails fast if environment variables are missing (preferred approach).

---

### 3. Frontend Files Using VITE_SUPABASE_URL

| File | Lines | Usage Type | Status |
|------|-------|------------|--------|
| `app/src/lib/config.js` | 32 | Config export | ✅ |
| `app/src/lib/auth.js` | 481, 490, 690, 699, 1465, 1600 | Storage keys & Edge Function calls | ✅ |
| `app/src/lib/listingService.js` | 434 | Edge Function calls | ✅ |
| `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx` | 215, 358, 475 | With hardcoded fallback | ⚠️ **NEEDS FIX** |
| `app/src/islands/shared/RentalApplicationWizardModal/useRentalApplicationWizardLogic.js` | 156, 434, 521 | Edge Function calls | ✅ |
| `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js` | 802, 807 | Slack Edge Function | ✅ |
| `app/src/islands/pages/InternalTestPage.jsx` | 101, 105, 167, 171 | Test utilities | ✅ |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | 209-227 | Direct REST API calls | ✅ |
| `app/src/islands/pages/useEmailSmsUnitPageLogic.js` | 296, 300, 382, 386 | Test utilities | ✅ |
| `app/src/islands/pages/useRentalApplicationPageLogic.js` | 439, 701, 908 | Edge Function calls | ✅ |

**Total Frontend Files**: 11 files (10 correct, 1 needs fixing)

---

### 4. Edge Functions Using SUPABASE_URL

All Edge Functions use `Deno.env.get('SUPABASE_URL')` which is **automatically injected by Supabase** based on deployment target (dev vs prod). No manual configuration needed.

| File | Lines | Usage |
|------|-------|-------|
| `supabase/functions/_shared/queueSync.ts` | 196 | Service client initialization |
| `supabase/functions/_shared/fp/orchestration.ts` | 165-166 | URL and key retrieval |
| `supabase/functions/workflow-orchestrator/index.ts` | 28, 213 | Service client initialization |
| `supabase/functions/workflow-enqueue/index.ts` | 128 | Client initialization |
| `supabase/functions/slack/index.ts` | 91-94, 142-143 | URL retrieval with logging |
| `supabase/functions/send-email/handlers/send.ts` | 52 | URL retrieval |
| `supabase/functions/proposal/lib/bubbleSyncQueue.ts` | 132 | URL retrieval |
| `supabase/functions/listing/handlers/submit.ts` | 270 | URL retrieval |
| `supabase/functions/listing/handlers/get.ts` | 34 | URL retrieval |
| `supabase/functions/listing/handlers/delete.ts` | 42 | URL retrieval |
| `supabase/functions/listing/handlers/create.ts` | 48 | URL retrieval |
| `supabase/functions/cohost-request-slack-callback/index.ts` | 94, 149, 591-592 | Multiple usages |
| `supabase/functions/ai-signup-guest/index.ts` | 58 | URL retrieval |
| `supabase/functions/ai-parse-profile/index.ts` | 636 | URL retrieval |

**Total Edge Function Files**: 14 files (all ✅ correct)

**Pattern**: Edge Functions receive environment variables at runtime from Supabase's deployment infrastructure.

---

### 5. Configuration Files

#### Supabase Configuration

**File**: `supabase/config.toml`

Defines all 14 Edge Functions and their deployment configuration:
- `auth-user`
- `proposal`
- `listing`
- `ai-gateway`
- `bubble_sync`
- `send-email`
- `send-sms`
- `rental-application`
- `slack`
- `virtual-meeting`
- `workflow-orchestrator`
- `workflow-enqueue`
- `cohost-request-slack-callback`
- `ai-parse-profile`

**Status**: ✅ No hardcoded URLs

#### Vite Configuration

**File**: `app/vite.config.js`

Build configuration for Islands Architecture. Environment variables are injected at build time.

**Status**: ✅ No hardcoded URLs

---

### 6. Utility Scripts

| File | Usage | Status |
|------|-------|--------|
| `query-os-cohost-admins.js` | Creates Supabase client from env vars | ✅ |
| `app/scripts/extract-email-placeholders.mjs` | Loads `VITE_SUPABASE_URL` for email extraction | ✅ |

---

## Environment Variable Architecture

### Frontend (Client-Side)

**Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Source**:
- Local development: `app/.env`
- Production build: Cloudflare Pages environment settings (overrides `.env`)

**Injection**: Build-time via Vite

**Pattern**:
```javascript
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

---

### Edge Functions (Server-Side)

**Variables**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Source**: Automatically provided by Supabase based on deployment target

**Injection**: Runtime by Supabase infrastructure

**Pattern**:
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
```

**Behavior**:
- Deploy to `qcfifybkaddcoimjroca` → receives prod credentials
- Deploy to `qzsmhgyojmwvtjmnrdea` → receives dev credentials

---

## Edge Function Endpoint URLs

All Edge Functions follow this URL pattern:

```
https://[PROJECT_ID].supabase.co/functions/v1/[FUNCTION_NAME]
```

**Production**: `https://qcfifybkaddcoimjroca.supabase.co/functions/v1/*`
**Development**: `https://qzsmhgyojmwvtjmnrdea.supabase.co/functions/v1/*`

### Active Endpoints

1. `auth-user` - Authentication (login, signup, password reset)
2. `proposal` - Proposal CRUD with Bubble sync
3. `listing` - Listing CRUD with Bubble sync
4. `ai-gateway` - OpenAI proxy with prompt templating
5. `bubble_sync` - Queue processor for Supabase→Bubble sync
6. `send-email` - Email sending via Resend
7. `send-sms` - SMS sending via Twilio
8. `rental-application` - Rental application processing
9. `slack` - Slack notifications
10. `virtual-meeting` - Virtual meeting management
11. `workflow-orchestrator` - Workflow orchestration
12. `workflow-enqueue` - Workflow queue management
13. `cohost-request-slack-callback` - Slack callback handler
14. `ai-parse-profile` - AI profile parsing

---

## Dev/Prod Separation Strategy

### Current State

✅ **Working Correctly**:
- Edge Functions (auto-configured per deployment)
- Main Supabase client (`app/src/lib/supabase.js`)
- All other frontend files (10/11)

⚠️ **Needs Fixing**:
- `AiSignupMarketReport.jsx` hardcoded fallbacks (3 locations)

### Recommended Changes

#### 1. Fix AiSignupMarketReport.jsx

**Current (Lines 215, 358, 475)**:
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qcfifybkaddcoimjroca.supabase.co';
```

**Recommended**:
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is required');
}
```

**Rationale**: Fail fast if configuration is missing rather than silently defaulting to production.

---

#### 2. Update Local Environment for Dev

**File**: `app/.env`

**Change from**:
```env
VITE_SUPABASE_URL=https://qcfifybkaddcoimjroca.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (prod key)
```

**Change to**:
```env
VITE_SUPABASE_URL=https://qzsmhgyojmwvtjmnrdea.supabase.co
VITE_SUPABASE_ANON_KEY=<dev_anon_key_from_supabase>
```

---

#### 3. Configure Cloudflare Pages for Production

Ensure Cloudflare Pages environment variables are set to production values:

**Production Build Settings**:
- `VITE_SUPABASE_URL` = `https://qcfifybkaddcoimjroca.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = (production anon key)

**Preview Builds** (optional):
- Can use dev credentials for preview deployments

---

## Testing Checklist

After implementing changes, verify:

- [ ] Local dev uses `qzsmhgyojmwvtjmnrdea` (dev project)
- [ ] Production builds use `qcfifybkaddcoimjroca` (prod project)
- [ ] Edge Functions deployed to dev project receive dev credentials
- [ ] Edge Functions deployed to prod project receive prod credentials
- [ ] AI Signup Market Report works in both environments
- [ ] No hardcoded production URLs remain in codebase
- [ ] `.env` file is in `.gitignore` (never committed)

---

## Related Files

### Key Architecture Documents
- `app/src/lib/supabase.js` - Primary client initialization pattern
- `app/src/lib/auth.js` - Authentication with environment-aware storage keys
- `supabase/config.toml` - Edge Function deployment configuration
- `app/.env.example` - Environment variable template

### Files Requiring Changes
- `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx` - Remove hardcoded fallbacks
- `app/.env` - Update to dev credentials for local development

### Reference Documentation
- `.claude/CLAUDE.md` - Project architecture overview
- `app/CLAUDE.md` - Frontend architecture details
- `supabase/CLAUDE.md` - Edge Functions reference

---

## Conclusion

The Split Lease codebase has a well-architected environment separation strategy with one exception. Fixing the hardcoded URLs in `AiSignupMarketReport.jsx` and updating local `.env` settings will enable full dev/prod isolation.

**Priority**: High - The hardcoded production URLs create a hidden dependency that bypasses environment configuration.

**Effort**: Low - 3 line changes + 1 env file update

**Risk**: Low - Change follows existing pattern in `supabase.js`
