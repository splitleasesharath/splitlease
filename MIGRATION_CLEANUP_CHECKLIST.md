# Post-Migration Cleanup Checklist

**Project:** Split Lease Application
**Date:** 2025-11-24
**Purpose:** Comprehensive cleanup checklist for post-Bubble-to-Edge-Function migration
**Principle:** NO FALLBACK - Remove all legacy code, hardcoded values, and security vulnerabilities

---

## Overview

This document provides a systematic checklist for cleaning up the codebase after migrating Bubble API calls to Supabase Edge Functions. The goal is to eliminate all traces of:
- Hardcoded API keys
- Hardcoded URLs
- Fallback mechanisms
- Legacy direct Bubble API calls
- Deprecated code paths
- Security vulnerabilities

---

## Priority Levels

- 🔴 **CRITICAL**: Security vulnerabilities, must fix immediately
- 🟠 **HIGH**: Functionality blockers, fix within 24 hours
- 🟡 **MEDIUM**: Code quality issues, fix within 1 week
- 🟢 **LOW**: Nice-to-have improvements, fix within 1 month

---

## Section 1: Security-Critical Cleanup (🔴 CRITICAL)

### 1.1 Remove Hardcoded API Keys

#### File: `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`
**Lines:** 105-106
**Current Code:**
```javascript
const url = 'https://app.split.lease/version-test/api/1.1/wf/ai-signup-guest';
const apiKey = '5dbb448f9a6bbb043cb56ac16b8de109';  // ❌ REMOVE THIS
```

**Action:**
- [ ] Replace with Edge Function call
- [ ] Remove both `url` and `apiKey` constants
- [ ] Update `submitSignup()` function to use `supabase.functions.invoke()`

**Expected Result:**
```javascript
// NO hardcoded values
const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  body: {
    action: 'signup_ai',
    payload: {
      email: data.email,
      phone: data.phone,
      marketResearchText: data.marketResearchText
    }
  }
});
```

**Verification Command:**
```bash
grep -r "5dbb448f9a6bbb043cb56ac16b8de109" app/src/
# Should return NO results
```

---

#### File: `app/.env`
**Line:** 9
**Current Code:**
```bash
VITE_BUBBLE_API_KEY=5dbb448f9a6bbb043cb56ac16b8de109  # ❌ REMOVE THIS
```

**Action:**
- [ ] Delete line containing `VITE_BUBBLE_API_KEY`
- [ ] Delete line containing `VITE_BUBBLE_API_BASE_URL` (if exists)
- [ ] Create backup before deletion

**Verification Command:**
```bash
grep "VITE_BUBBLE_API_KEY" app/.env
# Should return NO results
```

---

#### File: `app/.env.example`
**Lines:** 13-14
**Current Code:**
```bash
VITE_BUBBLE_API_BASE_URL=your-bubble-api-base-url  # ❌ REMOVE THIS
VITE_BUBBLE_API_KEY=your-bubble-api-key            # ❌ REMOVE THIS
```

**Action:**
- [ ] Delete both lines
- [ ] Add comment explaining migration

**Expected Result:**
```bash
# Bubble API Configuration
# DEPRECATED: Bubble API calls now route through Supabase Edge Functions
# API keys are stored in Supabase Secrets (server-side only)
# No client-side Bubble API configuration needed
```

---

### 1.2 Remove API Key References from Source Code

#### File: `app/src/lib/bubbleAPI.js`
**Lines:** 20-21, 50-51
**Current Code:**
```javascript
const baseUrl = import.meta.env.VITE_BUBBLE_API_BASE_URL;  // ❌ REMOVE
const apiKey = import.meta.env.VITE_BUBBLE_API_KEY;        // ❌ REMOVE
```

**Action:**
- [ ] Remove `getBubbleConfig()` function entirely
- [ ] Remove all references to `VITE_BUBBLE_API_KEY`
- [ ] Remove all references to `VITE_BUBBLE_API_BASE_URL`
- [ ] Replace `triggerBubbleWorkflow()` with Edge Function calls
- [ ] Update `createListingInCode()` to use Edge Functions

**Expected Result:**
```javascript
// NO environment variable reads
// ALL functions call supabase.functions.invoke()
```

**Verification Command:**
```bash
grep "VITE_BUBBLE_API" app/src/lib/bubbleAPI.js
# Should return NO results
```

---

#### File: `app/src/islands/shared/SubmitListingPhotos/SubmitListingPhotos.jsx`
**Line:** 68
**Current Code:**
```javascript
const BUBBLE_API_KEY = import.meta.env.VITE_BUBBLE_API_KEY  // ❌ REMOVE
```

**Action:**
- [ ] Remove `BUBBLE_API_KEY` constant
- [ ] Remove `UPLOAD_ENDPOINT` constant (line 69)
- [ ] Replace `fetch()` call with Edge Function invocation

**Expected Result:**
```javascript
// NO BUBBLE_API_KEY reference
const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  body: {
    action: 'upload_photos',
    payload: {
      listing_id: listingId,
      photos: uploadedFiles  // Will be handled by Edge Function
    }
  }
});
```

---

#### File: `app/src/islands/shared/ContactHostMessaging.jsx`
**Lines:** 15, 90
**Current Code:**
```javascript
const BUBBLE_API_KEY = import.meta.env.VITE_BUBBLE_API_KEY;  // ❌ REMOVE
```

**Action:**
- [ ] Remove `BUBBLE_API_KEY` constant
- [ ] Remove API key check at line 90
- [ ] Replace `fetch()` call with Edge Function invocation

---

#### File: `app/src/lib/auth.js`
**Lines:** 404, 422, 498
**Current Code:**
```javascript
const BUBBLE_API_KEY = import.meta.env.VITE_BUBBLE_API_KEY;  // ❌ REMOVE
```

**Action:**
- [ ] Remove `BUBBLE_API_KEY` constant
- [ ] Replace all `loginUser()`, `signupUser()`, `logoutUser()` with Edge Function calls
- [ ] Update `validateTokenAndFetchUser()` to use Edge Functions

---

### 1.3 Verify No API Keys in Version Control

**Action:**
- [ ] Search entire git history for exposed keys

**Commands:**
```bash
# Search current files
grep -r "5dbb448f9a6bbb043cb56ac16b8de109" .

# Search git history
git log -S "5dbb448f9a6bbb043cb56ac16b8de109" --all

# If found in history, consider using git-filter-repo to remove
```

**If found in git history:**
- [ ] Consider the API key compromised
- [ ] Rotate the Bubble API key immediately
- [ ] Update Supabase Secrets with new key
- [ ] Use `git-filter-repo` to remove from history (if critical)

---

## Section 2: Remove Hardcoded URLs (🟠 HIGH)

### 2.1 Authentication URLs

#### File: `app/src/lib/auth.js`
**Lines:** 405-409
**Current Code:**
```javascript
const BUBBLE_LOGIN_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/wf/login-user';       // ❌ REMOVE
const BUBBLE_SIGNUP_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/wf/signup-user';     // ❌ REMOVE
const BUBBLE_CHECK_LOGIN_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/wf/check-login'; // ❌ REMOVE
const BUBBLE_LOGOUT_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/wf/logout-user';     // ❌ REMOVE
const BUBBLE_USER_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/obj/user';             // ❌ REMOVE
```

**Action:**
- [ ] Remove all 5 constants
- [ ] Replace all functions using these endpoints with Edge Function calls
- [ ] Update function signatures to match Edge Function responses

**Note:** These URLs should ONLY exist in Supabase Edge Functions (server-side), never in client code.

---

### 2.2 Workflow URLs in Constants

#### File: `app/src/lib/constants.js`
**Lines:** 22-24

**Current Code:**
```javascript
export const REFERRAL_API_ENDPOINT = 'https://app.split.lease/api/1.1/wf/referral-index-lite';
export const BUBBLE_MESSAGING_ENDPOINT = 'https://app.split.lease/api/1.1/wf/core-contact-host-send-message';
export const AI_SIGNUP_WORKFLOW_URL = 'https://app.split.lease/api/1.1/wf/ai-signup-guest';
```

**Action:**
- [ ] **DECISION REQUIRED**: Should these be removed or kept for reference?

**Option A: Remove entirely (Recommended)**
- These are now only used in Edge Functions
- Client code should never know about Bubble endpoints

**Option B: Keep as documentation**
- Add `// DEPRECATED:` comment
- Rename to indicate they're for reference only
- Example: `const LEGACY_REFERRAL_ENDPOINT = '...' // For reference only, use Edge Functions`

**If Option A (Remove):**
- [ ] Delete all three constants
- [ ] Search codebase for imports of these constants
- [ ] Replace all usages with Edge Function calls

**Verification Command:**
```bash
grep -r "REFERRAL_API_ENDPOINT\|BUBBLE_MESSAGING_ENDPOINT\|AI_SIGNUP_WORKFLOW_URL" app/src/
# Should return NO results (if Option A)
```

---

### 2.3 Photo Upload URL

#### File: `app/src/islands/shared/SubmitListingPhotos/SubmitListingPhotos.jsx`
**Line:** 69

**Current Code:**
```javascript
const UPLOAD_ENDPOINT = 'https://app.split.lease/api/1.1/wf/listing_photos_section_in_code'  // ❌ REMOVE
```

**Action:**
- [ ] Remove constant
- [ ] Replace with Edge Function call

---

### 2.4 Display URLs (KEEP THESE)

The following URLs in `constants.js` are for **user-facing navigation** and should be KEPT:

```javascript
export const BUBBLE_API_URL = 'https://app.split.lease';               // ✅ KEEP (for display)
export const SIGNUP_LOGIN_URL = 'https://app.split.lease/signup-login'; // ✅ KEEP (navigation)
export const VIEW_LISTING_URL = 'https://app.split.lease/view-split-lease'; // ✅ KEEP
export const ACCOUNT_PROFILE_URL = 'https://app.split.lease/account-profile'; // ✅ KEEP
```

**Note:** These are navigation URLs, not API endpoints. They remain valid.

---

## Section 3: Legacy Code Removal (🟡 MEDIUM)

### 3.1 Deprecated Functions

#### File: `app/src/lib/bubbleAPI.js`

**Functions to deprecate or remove:**

##### `triggerBubbleWorkflow(workflowName, parameters)`
**Lines:** 47-100

**Action:**
- [ ] **Option A (Recommended)**: Remove entirely
  - No code should be calling this directly anymore
  - All workflows go through Edge Functions

- [ ] **Option B**: Keep as deprecated stub
  ```javascript
  export async function triggerBubbleWorkflow(workflowName, parameters = {}) {
    throw new Error(
      'triggerBubbleWorkflow() is deprecated. ' +
      'Direct Bubble API calls are no longer supported. ' +
      'Use supabase.functions.invoke() instead.'
    );
  }
  ```

**Verification:**
```bash
# Find all calls to triggerBubbleWorkflow
grep -r "triggerBubbleWorkflow" app/src/
# Each result should be investigated and replaced
```

---

#### File: `app/src/lib/auth.js`

**Functions to update:**

##### `loginUser(email, password)` - Lines 419-483
**Action:**
- [ ] Replace entire implementation with Edge Function call
- [ ] Keep function signature for backward compatibility
- [ ] Update all localStorage/session management

**Expected Structure:**
```javascript
export async function loginUser(email, password) {
  const { data, error } = await supabase.functions.invoke('bubble-auth-proxy', {
    body: { action: 'login', payload: { email, password } }
  });

  if (error || !data.success) {
    return { success: false, error: error?.message || data.error };
  }

  // Handle session management
  return data;
}
```

##### `signupUser(email, password, retype)` - Lines 495-583
**Action:**
- [ ] Replace entire implementation with Edge Function call
- [ ] Keep client-side validation
- [ ] Update session management

##### `logoutUser()` - Likely around line 600+
**Action:**
- [ ] Replace with Edge Function call
- [ ] Clear local storage
- [ ] Clear Supabase session

---

### 3.2 Remove Check-Login Endpoint (Unused)

#### File: `app/src/lib/auth.js`
**Line:** 407

**Current Code:**
```javascript
const BUBBLE_CHECK_LOGIN_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/wf/check-login';
```

**Analysis:** According to `BUBBLE_WORKFLOW_API_ENUMERATION.md:72`, this is "defined but not actively used"

**Action:**
- [ ] Remove constant
- [ ] Search for any references to `check-login`
- [ ] Verify no code uses this endpoint

**Verification:**
```bash
grep -r "check-login" app/src/
# Should return NO results
```

---

### 3.3 Cleanup Helper Functions

#### File: `app/src/lib/bubbleAPI.js`

##### `getBubbleConfig()` - Lines 18-39
**Action:**
- [ ] Remove entire function
- [ ] No longer needed (Edge Functions manage config)

---

## Section 4: Update Documentation (🟡 MEDIUM)

### 4.1 Update README.md

**File:** `README.md`

**Search for sections mentioning:**
- Bubble API setup
- `VITE_BUBBLE_API_KEY` configuration
- Workflow trigger instructions

**Action:**
- [ ] Remove instructions for setting up Bubble API keys
- [ ] Add section explaining Edge Function architecture
- [ ] Update development setup instructions
- [ ] Add link to `MIGRATION_PLAN_BUBBLE_TO_EDGE.md`

**New Section to Add:**
```markdown
## Bubble API Integration (via Edge Functions)

All Bubble.io backend workflows are now proxied through Supabase Edge Functions for security and data consistency.

**Client-Side:** No Bubble API keys needed. All requests go through:
- `supabase.functions.invoke('bubble-proxy', { ... })`
- `supabase.functions.invoke('bubble-auth-proxy', { ... })`

**Server-Side (Edge Functions):** API keys stored in Supabase Secrets:
- `BUBBLE_API_KEY`
- `BUBBLE_API_BASE_URL`
- `BUBBLE_AUTH_BASE_URL`

See `MIGRATION_PLAN_BUBBLE_TO_EDGE.md` for architecture details.
```

---

### 4.2 Update BUBBLE_WORKFLOW_API_ENUMERATION.md

**File:** `BUBBLE_WORKFLOW_API_ENUMERATION.md`

**Action:**
- [ ] Add "MIGRATION STATUS" column to workflow tables
- [ ] Mark each workflow as "MIGRATED" or "PENDING"
- [ ] Add section explaining Edge Function architecture
- [ ] Update "Usage Patterns" section to show Edge Function examples
- [ ] Add deprecation notices to direct fetch examples

**New Section to Add:**
```markdown
## Migration Status

All workflows have been migrated to Supabase Edge Functions.

### Direct API Calls (DEPRECATED)
❌ Do NOT use direct `fetch()` calls to Bubble API anymore.
❌ API keys are NO LONGER available client-side.

### Edge Function Proxy (CURRENT)
✅ Use `supabase.functions.invoke('bubble-proxy', { ... })`
✅ API keys secured server-side in Supabase Secrets.
✅ Atomic sync guarantees data consistency.

See `MIGRATION_PLAN_BUBBLE_TO_EDGE.md` for implementation details.
```

---

### 4.3 Update Component README Files

#### File: `app/src/islands/shared/SubmitListingPhotos/README.md`
**Line:** 96

**Current Text:**
```markdown
Requires `VITE_BUBBLE_API_KEY` to be set in `.env` file (already configured).
```

**Action:**
- [ ] Remove this line
- [ ] Add note about Edge Function usage

**Expected Result:**
```markdown
## Configuration

Photo uploads are handled via Supabase Edge Functions. No client-side API keys required.

The component calls `supabase.functions.invoke('bubble-proxy', { action: 'upload_photos', ... })` to securely upload photos to Bubble and sync metadata to Supabase.
```

---

### 4.4 Update .env.example Comments

**File:** `app/.env.example`

**Current Comments (Lines 11-14):**
```bash
# Bubble API Configuration
# Base URL for Bubble API workflows (e.g., https://app.split.lease/version-test/api/1.1)
VITE_BUBBLE_API_BASE_URL=your-bubble-api-base-url
VITE_BUBBLE_API_KEY=your-bubble-api-key
```

**Action:**
- [ ] Replace with migration notice

**Expected Result:**
```bash
# Bubble API Configuration - DEPRECATED
# Bubble API calls now route through Supabase Edge Functions
# API keys are stored in Supabase Secrets (server-side only)
# No client-side Bubble configuration needed after migration
# See MIGRATION_PLAN_BUBBLE_TO_EDGE.md for details
```

---

## Section 5: Remove Fallback Mechanisms (🟠 HIGH)

### 5.1 Audit for Fallback Logic

**Search Patterns:**
```bash
# Find all occurrences of fallback patterns
grep -rn "fallback\|default.*value\||| ''\|?? ''" app/src/
```

**Action:**
- [ ] Review each occurrence
- [ ] Remove fallback logic that masks errors
- [ ] Keep only intentional defaults (e.g., optional parameters)

---

### 5.2 Environment Variable Fallbacks

**Search for patterns like:**
```javascript
const apiKey = import.meta.env.VITE_BUBBLE_API_KEY || 'default_key';  // ❌ BAD
const baseUrl = import.meta.env.VITE_BUBBLE_API_BASE_URL || 'https://...';  // ❌ BAD
```

**Action:**
- [ ] Remove all `|| 'default_value'` patterns for API keys
- [ ] Remove all `?? 'default_value'` patterns for API keys
- [ ] Let code fail explicitly if env vars missing

---

### 5.3 Error Handling Fallbacks

**Example Pattern to Remove:**
```javascript
try {
  await fetch(bubbleEndpoint, ...);
} catch (error) {
  // ❌ BAD: Falling back to alternative approach
  return await alternativeApproach();
}
```

**Action:**
- [ ] Search for try-catch blocks that fallback to alternative logic
- [ ] Replace with explicit error throwing
- [ ] Let errors propagate to user (fail fast)

**Expected Pattern:**
```javascript
try {
  await supabase.functions.invoke('bubble-proxy', ...);
} catch (error) {
  // ✅ GOOD: Log and rethrow, no fallback
  console.error('[Component] Failed to call Edge Function:', error);
  throw error;
}
```

---

## Section 6: Test File Cleanup (🟢 LOW)

### 6.1 Update Test Page

#### File: `app/src/islands/shared/AiSignupMarketReport/TestPage.jsx`
**Line:** 239

**Current Code:**
```javascript
value="https://app.split.lease/version-test/api/1.1/wf/ai-signup-guest"
```

**Action:**
- [ ] Remove hardcoded URL input field (no longer relevant)
- [ ] Update test page to use Edge Function
- [ ] Add Edge Function endpoint display for debugging

---

### 6.2 Remove Deprecated Test Files

**Search for test files referencing old API:**
```bash
find app/src -name "*.test.js" -o -name "*.spec.js" | xargs grep -l "VITE_BUBBLE_API"
```

**Action:**
- [ ] Review each test file
- [ ] Update or remove tests for direct Bubble API calls
- [ ] Add new tests for Edge Function integration

---

## Section 7: Supabase Edge Function Cleanup (🟢 LOW)

### 7.1 Remove Development Logging

**After migration is stable, reduce logging verbosity:**

**Files:**
- `supabase/functions/_shared/bubbleSync.ts`
- `supabase/functions/bubble-proxy/index.ts`
- `supabase/functions/bubble-auth-proxy/index.ts`

**Action:**
- [ ] Remove verbose `console.log()` statements
- [ ] Keep only error logs and critical events
- [ ] Consider adding optional debug mode via environment variable

---

### 7.2 Optimize Error Messages

**Review all `throw new Error()` statements:**

**Action:**
- [ ] Ensure error messages are helpful but not exposing sensitive data
- [ ] Standardize error message format
- [ ] Add error codes for client-side handling

**Example:**
```typescript
// ❌ BAD: Exposes internal details
throw new Error(`Bubble API failed with key ${apiKey.substring(0, 5)}...`);

// ✅ GOOD: Generic but actionable
throw new Error('Failed to sync listing to database. Please try again.');
```

---

## Section 8: Version Control & History (🟡 MEDIUM)

### 8.1 Create Backup Branch

**Before cleanup:**
```bash
git checkout -b backup-pre-migration-cleanup
git push origin backup-pre-migration-cleanup
```

**Action:**
- [ ] Create backup branch
- [ ] Document branch purpose in README
- [ ] Set branch protection rules

---

### 8.2 Commit Strategy

**Recommended commit sequence:**

1. **Security commit** (🔴 CRITICAL)
   ```bash
   git add app/.env app/.env.example
   git commit -m "security: remove VITE_BUBBLE_API_KEY from client"
   ```

2. **Remove hardcoded keys** (🔴 CRITICAL)
   ```bash
   git add app/src/islands/shared/AiSignupMarketReport/
   git commit -m "security: remove hardcoded API key from AiSignupMarketReport"
   ```

3. **Update API client** (🟠 HIGH)
   ```bash
   git add app/src/lib/bubbleAPI.js
   git commit -m "refactor: migrate bubbleAPI.js to Edge Functions"
   ```

4. **Update auth module** (🟠 HIGH)
   ```bash
   git add app/src/lib/auth.js
   git commit -m "refactor: migrate auth.js to Edge Functions"
   ```

5. **Update components** (🟡 MEDIUM)
   ```bash
   git add app/src/islands/shared/
   git commit -m "refactor: update components to use Edge Functions"
   ```

6. **Update documentation** (🟢 LOW)
   ```bash
   git add README.md BUBBLE_WORKFLOW_API_ENUMERATION.md
   git commit -m "docs: update for Edge Function migration"
   ```

**Action:**
- [ ] Follow commit sequence
- [ ] Write descriptive commit messages
- [ ] Link commits to migration plan sections

---

## Section 9: Verification & Testing (🟠 HIGH)

### 9.1 Automated Verification Scripts

**Create:** `scripts/verify_cleanup.sh`

```bash
#!/bin/bash
# verify_cleanup.sh - Verify migration cleanup

set -e

echo "🔍 Running post-migration cleanup verification..."

# Test 1: No API keys in .env
echo "Test 1: Checking .env files..."
if grep -q "VITE_BUBBLE_API_KEY" app/.env; then
  echo "❌ FAIL: VITE_BUBBLE_API_KEY found in app/.env"
  exit 1
fi
echo "✅ PASS: No BUBBLE_API_KEY in .env"

# Test 2: No hardcoded API keys
echo "Test 2: Checking for hardcoded API keys..."
if grep -r "5dbb448f9a6bbb043cb56ac16b8de109" app/src/; then
  echo "❌ FAIL: Hardcoded API key found"
  exit 1
fi
echo "✅ PASS: No hardcoded API keys"

# Test 3: No direct Bubble API URLs in code
echo "Test 3: Checking for direct Bubble API calls..."
if grep -r "fetch.*app\.split\.lease.*api.*wf" app/src/; then
  echo "⚠️  WARNING: Direct Bubble API fetch() calls found"
  grep -rn "fetch.*app\.split\.lease.*api.*wf" app/src/
fi

# Test 4: All imports use Edge Functions
echo "Test 4: Checking for Edge Function usage..."
if ! grep -q "supabase.functions.invoke" app/src/lib/bubbleAPI.js; then
  echo "⚠️  WARNING: bubbleAPI.js may not be using Edge Functions"
fi

echo ""
echo "✅ Verification complete!"
```

**Action:**
- [ ] Create verification script
- [ ] Run after each cleanup phase
- [ ] Add to CI/CD pipeline

---

### 9.2 Manual Testing Checklist

**After cleanup, test each workflow:**

#### Listing Creation
- [ ] Create new listing from "List With Us"
- [ ] Verify listing appears in Bubble admin
- [ ] Verify listing appears in Supabase dashboard
- [ ] Verify redirect to `/self-listing.html?listing_id=...`

#### Photo Upload
- [ ] Upload photos to a listing
- [ ] Verify photos appear in Bubble
- [ ] Verify photo metadata synced to Supabase

#### Contact Host
- [ ] Send message to a listing host
- [ ] Verify message delivered (check Bubble admin)

#### AI Signup
- [ ] Complete AI market research signup
- [ ] Verify signup recorded in Bubble
- [ ] Verify user synced to Supabase

#### Authentication
- [ ] Log in with existing account
- [ ] Sign up new account
- [ ] Log out
- [ ] Verify sessions managed correctly

---

### 9.3 Performance Testing

**Compare performance before vs. after:**

**Metrics to track:**
- Time to create listing (should be < 2 seconds)
- Time to upload photos (should be within 10% of baseline)
- Time to send message (should be < 1 second)
- Authentication latency (should be < 1 second)

**Action:**
- [ ] Baseline measurements (before migration)
- [ ] Post-migration measurements
- [ ] Compare and document any regressions

---

## Section 10: Deployment Verification (🔴 CRITICAL)

### 10.1 Pre-Deployment Checklist

**Before deploying to production:**

- [ ] All cleanup tasks marked complete
- [ ] Verification script passes
- [ ] Manual testing complete
- [ ] Performance within acceptable range
- [ ] Documentation updated
- [ ] Team notified of changes

---

### 10.2 Deployment Steps

1. **Deploy Edge Functions**
   ```bash
   supabase functions deploy bubble-proxy
   supabase functions deploy bubble-auth-proxy
   ```

2. **Set Production Secrets**
   ```bash
   supabase secrets set --env production BUBBLE_API_KEY="[production_key]"
   supabase secrets set --env production BUBBLE_API_BASE_URL="https://app.split.lease/api/1.1"
   ```

3. **Deploy Client Code**
   ```bash
   cd app
   npm run build
   # Deploy to hosting (Vercel, Netlify, etc.)
   ```

4. **Verify Production**
   - [ ] Test one workflow in production
   - [ ] Check Supabase logs for errors
   - [ ] Monitor for 30 minutes

---

### 10.3 Post-Deployment Monitoring

**First 24 Hours:**
- [ ] Monitor Edge Function error rates (should be < 1%)
- [ ] Check Supabase logs every 4 hours
- [ ] Verify data consistency (Bubble ↔ Supabase)
- [ ] Monitor user feedback/support tickets

**First Week:**
- [ ] Daily error rate check
- [ ] Weekly consistency audit
- [ ] Performance baseline comparison

**First Month:**
- [ ] Weekly monitoring
- [ ] Cost analysis (Edge Function usage)
- [ ] User satisfaction survey

---

## Section 11: Rollback Plan (🔴 CRITICAL)

### 11.1 Rollback Triggers

**Initiate rollback if:**
- Error rate > 5% for any workflow
- Critical user flow broken (unable to create listings)
- Data inconsistency detected (Bubble ≠ Supabase)
- Security incident (API key leak)

---

### 11.2 Rollback Procedure

**Step 1: Revert Client Code**
```bash
# Switch to backup branch
git checkout backup-pre-migration-cleanup

# Restore .env with API keys (from secure backup)
cp app/.env.backup.YYYYMMDD app/.env

# Rebuild and deploy
cd app
npm run build
# Deploy to hosting
```

**Step 2: Disable Edge Functions**
```bash
# Pause Edge Functions to prevent conflicts
supabase functions pause bubble-proxy
supabase functions pause bubble-auth-proxy
```

**Step 3: Verify Rollback**
- [ ] Test listing creation (direct Bubble API)
- [ ] Test authentication
- [ ] Verify all workflows functional

**Step 4: Incident Report**
- [ ] Document what went wrong
- [ ] Identify root cause
- [ ] Plan remediation

---

## Section 12: Final Verification (🟠 HIGH)

### 12.1 Security Audit

**Run complete security scan:**

```bash
# 1. Check for exposed secrets
grep -r "5dbb448f9a6bbb043cb56ac16b8de109" .
grep -r "VITE_BUBBLE_API_KEY" .

# 2. Check for hardcoded URLs
grep -r "app\.split\.lease.*api.*wf" app/src/
grep -r "upgradefromstr\.bubbleapps" app/src/

# 3. Check for fallback logic
grep -r "|| ''\|?? ''" app/src/ | grep -i "api\|key\|token"

# 4. Check for direct fetch calls
grep -r "fetch.*bubble" app/src/
```

**Expected Results:**
- ✅ Zero exposed secrets
- ✅ Zero hardcoded Bubble API URLs
- ✅ Zero fallback logic for API keys
- ✅ Zero direct Bubble API fetch calls

---

### 12.2 Code Quality Check

**Run linter and type checker:**
```bash
cd app
npm run lint
npm run type-check  # If using TypeScript
```

**Action:**
- [ ] Fix all linting errors
- [ ] Fix all type errors
- [ ] Review warnings

---

### 12.3 Dependency Audit

**Check for unused dependencies:**
```bash
npm install -g depcheck
depcheck app/
```

**Action:**
- [ ] Remove unused dependencies related to direct Bubble API calls

---

## Section 13: Team Communication (🟡 MEDIUM)

### 13.1 Migration Announcement

**Send to team:**

```
Subject: Bubble API Migration Complete - Action Required

Team,

The Bubble API migration to Edge Functions is complete. Key changes:

1. NO MORE VITE_BUBBLE_API_KEY in .env files
2. All Bubble workflows now go through Supabase Edge Functions
3. Updated client code in app/src/lib/bubbleAPI.js and auth.js

ACTION REQUIRED:
- Pull latest from main branch
- Delete VITE_BUBBLE_API_KEY from your local .env file
- Rebuild your local environment: npm install && npm run build
- Test locally before pushing changes

Documentation:
- MIGRATION_PLAN_BUBBLE_TO_EDGE.md
- MIGRATION_CLEANUP_CHECKLIST.md (this file)

Questions? Ask in #dev-split-lease

- Split Lease Dev Team
```

---

### 13.2 Update Onboarding Docs

**For new developers:**

**Action:**
- [ ] Update onboarding documentation
- [ ] Remove Bubble API key setup instructions
- [ ] Add Edge Function architecture overview
- [ ] Add link to migration documentation

---

## Section 14: Long-Term Maintenance (🟢 LOW)

### 14.1 Quarterly Reviews

**Every 3 months:**
- [ ] Audit Supabase Secrets (rotate if needed)
- [ ] Review Edge Function logs for anomalies
- [ ] Check data consistency Bubble ↔ Supabase
- [ ] Update documentation if Bubble API changes

---

### 14.2 API Key Rotation

**When rotating Bubble API keys:**

1. Generate new key in Bubble admin
2. Update Supabase Secrets
   ```bash
   supabase secrets set BUBBLE_API_KEY="[new_key]"
   ```
3. Test all workflows in staging
4. Deploy to production
5. Monitor for 24 hours
6. Revoke old key in Bubble admin

**Action:**
- [ ] Schedule quarterly key rotation
- [ ] Document key rotation procedure
- [ ] Set calendar reminders

---

## Summary of Critical Actions

### Immediate (🔴 Must do before deployment)
- [ ] Remove hardcoded API key from `AiSignupMarketReport.jsx:106`
- [ ] Remove `VITE_BUBBLE_API_KEY` from `app/.env`
- [ ] Remove `VITE_BUBBLE_API_KEY` from `app/.env.example`
- [ ] Update all components to use Edge Functions
- [ ] Run security verification script
- [ ] Test all workflows manually

### Short-Term (🟠 Within 1 week)
- [ ] Update all documentation (README, etc.)
- [ ] Remove hardcoded URLs from auth.js
- [ ] Remove hardcoded URLs from constants.js (or mark as deprecated)
- [ ] Update component README files
- [ ] Create rollback plan documentation

### Medium-Term (🟡 Within 1 month)
- [ ] Remove deprecated `triggerBubbleWorkflow()` function
- [ ] Clean up verbose logging in Edge Functions
- [ ] Add comprehensive test coverage
- [ ] Optimize Edge Function performance

### Long-Term (🟢 Ongoing)
- [ ] Quarterly security audits
- [ ] API key rotation
- [ ] Performance monitoring
- [ ] Cost optimization

---

## Verification Commands Quick Reference

```bash
# No API keys in .env
grep "VITE_BUBBLE_API_KEY" app/.env
# Expected: No results

# No hardcoded keys in source
grep -r "5dbb448f9a6bbb043cb56ac16b8de109" app/src/
# Expected: No results

# No direct Bubble API calls
grep -r "fetch.*app\.split\.lease.*api.*wf" app/src/
# Expected: No results (or only in comments/docs)

# Edge Functions deployed
supabase functions list
# Expected: bubble-proxy and bubble-auth-proxy listed

# Secrets configured
supabase secrets list
# Expected: BUBBLE_API_KEY, BUBBLE_API_BASE_URL, BUBBLE_AUTH_BASE_URL

# Build succeeds
cd app && npm run build
# Expected: No errors
```

---

## Sign-Off Checklist

**Before marking migration complete:**

- [ ] All 🔴 CRITICAL tasks completed
- [ ] All 🟠 HIGH tasks completed
- [ ] Security verification script passes
- [ ] Manual testing complete for all workflows
- [ ] Documentation updated
- [ ] Team notified
- [ ] Rollback plan documented
- [ ] Production deployment successful
- [ ] Monitoring in place
- [ ] Post-deployment verification complete

**Signed off by:** ___________________
**Date:** ___________________
**Notes:** _____________________________________

---

**Document Version:** 1.0
**Last Updated:** 2025-11-24
**Next Review:** After deployment to production
