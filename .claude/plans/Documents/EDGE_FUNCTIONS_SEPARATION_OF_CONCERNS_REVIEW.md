# Edge Functions - Separation of Concerns Review

**Date**: 2025-12-09
**Status**: Analysis Complete - Awaiting Action
**Reviewer**: Claude Opus 4.5

---

## Executive Summary

The Supabase Edge Functions codebase has **significant separation of concerns violations**. The most critical issue is **duplicate proposal creation logic** that exists in two separate functions. Additionally, the dedicated `listing` edge function is empty while all listing logic resides in `bubble-proxy`.

---

## Discrepancy Severity Levels

| Severity | Description |
|----------|-------------|
| **CRITICAL** | Code duplication creating maintenance burden and potential inconsistencies |
| **HIGH** | Logic in wrong function, violates architectural intent |
| **MEDIUM** | Partial violation, acceptable but should be addressed |
| **LOW** | Minor concern, cosmetic or future consideration |

---

## Discrepancy #1: DUPLICATE PROPOSAL CREATION LOGIC

**Severity**: CRITICAL

### Problem

Proposal creation logic exists in **TWO separate locations**:

1. **`bubble-proxy/handlers/proposal.ts`** (687 lines)
   - Action: `create_proposal`
   - Function: `handleCreateProposal(payload)`
   - Route: `POST /functions/v1/bubble-proxy` with `action: "create_proposal"`

2. **`proposal/actions/create.ts`** (425 lines)
   - Action: `create`
   - Function: `handleCreate(payload, user, supabase)`
   - Route: `POST /functions/v1/proposal` with `action: "create"`

### Both Implementations Do:

| Operation | bubble-proxy/proposal.ts | proposal/actions/create.ts |
|-----------|--------------------------|---------------------------|
| Generate Bubble-compatible ID via RPC | Yes (line 329-337) | Yes (line 211-217) |
| Fetch listing from Supabase | Yes (line 345-376) | Yes (line 62-94) |
| Fetch guest user from Supabase | Yes (line 379-401) | Yes (line 98-122) |
| Fetch host account from Supabase | Yes (line 404-416) | Yes (line 125-136) |
| Fetch host user from Supabase | Yes (line 418-430) | Yes (line 139-151) |
| Calculate compensation | Yes (line 467-474) | Yes (line 181-188) |
| Calculate move-out date | Yes (line 477-481) | Yes (line 191-195) |
| Determine initial status | Yes (line 484-488) | Yes (line 198-202) |
| Insert proposal record | Yes (line 590-597) | Yes (line 314-321) |
| Update guest user | Yes (line 634-644) | Yes (line 358-368) |
| Update host user | Yes (line 653-660) | Yes (line 376-388) |

### Code Smell: Inlined Types

`bubble-proxy/handlers/proposal.ts` has **inlined types and calculation functions** (lines 24-184) with the comment:

```typescript
// NOTE: Calculation functions are inlined here to avoid cross-function imports
// which can cause deployment issues with the Supabase MCP tool.
```

This indicates the duplication was intentional to work around deployment issues, but creates a maintenance nightmare.

### Impact

- **Bug fixes** must be applied to BOTH files
- **Business logic changes** must be synchronized manually
- **Different behavior possible** if files drift apart
- **Confusion** about which endpoint to use

### Files Affected

- `supabase/functions/bubble-proxy/handlers/proposal.ts:1-687`
- `supabase/functions/bubble-proxy/index.ts:39,84,188-189` (imports and routes)
- `supabase/functions/proposal/actions/create.ts:1-425`
- `supabase/functions/proposal/index.ts:25,148-153` (imports and routes)

### Recommended Resolution

1. **Deprecate** `bubble-proxy/handlers/proposal.ts`
2. **Route** all proposal creation through `proposal` edge function
3. **Remove** `create_proposal` action from `bubble-proxy`
4. **Update** frontend to call `proposal` function directly

---

## Discrepancy #2: EMPTY LISTING EDGE FUNCTION

**Severity**: HIGH

### Problem

The dedicated `listing` edge function exists but is **effectively empty**:

```typescript
// supabase/functions/listing/index.ts (lines 22-31)
switch (action) {
  // Add handlers here as needed:
  // case "example":
  //   return await handleExample(req);

  default:
    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
```

Meanwhile, `bubble-proxy` contains **THREE listing handlers**:

| Handler | Purpose | Lines |
|---------|---------|-------|
| `handlers/listing.ts` | Create listing | 95 lines |
| `handlers/getListing.ts` | Fetch listing data | 49 lines |
| `handlers/submitListing.ts` | Full listing submission | 273 lines |

### bubble-proxy Listing Actions

From `bubble-proxy/index.ts`:
```typescript
const allowedActions = [
  'create_listing',    // -> handlers/listing.ts
  'get_listing',       // -> handlers/getListing.ts
  'submit_listing',    // -> handlers/submitListing.ts
  // ... other actions
];
```

### Files Affected

- `supabase/functions/listing/index.ts:1-41` (empty stub)
- `supabase/functions/bubble-proxy/handlers/listing.ts:1-95`
- `supabase/functions/bubble-proxy/handlers/getListing.ts:1-49`
- `supabase/functions/bubble-proxy/handlers/submitListing.ts:1-273`
- `supabase/functions/bubble-proxy/index.ts:30,36,74-76,152-158,176-177`

### Recommended Resolution

1. **Move** listing handlers to `listing` edge function
2. **Create** action routing in `listing/index.ts`:
   - `create` -> handleListingCreate
   - `get` -> handleGetListing
   - `submit` -> handleSubmitListing
3. **Deprecate** listing actions in `bubble-proxy`
4. **Update** frontend to call `listing` function directly

---

## Discrepancy #3: AI SIGNUP IN BUBBLE-PROXY

**Severity**: MEDIUM

### Problem

`bubble-proxy/handlers/signup.ts` contains `handleAiSignup` function for "AI-powered market research signup".

### Analysis

This handler:
- Collects user email, phone, and "text inputted" (market research description)
- Calls Bubble workflow `ai-signup-guest`
- Syncs to `zat_users` table (NOT the main `user` table)

### Assessment

After analysis, this is **NOT a true authentication concern**:
- It does NOT create auth sessions
- It does NOT handle login/logout
- It's a **lead generation/inquiry form** that happens to collect email

However, the naming is confusing. A function called "signup" in an edge function called "bubble-proxy" suggests auth concerns.

### Files Affected

- `supabase/functions/bubble-proxy/handlers/signup.ts:1-71`
- `supabase/functions/bubble-proxy/index.ts:35,79,172-173`

### Recommended Resolution

1. **Rename** handler to `handleAiMarketResearch` or `handleAiInquiry`
2. **Rename** action from `signup_ai` to `market_research_ai` or `ai_inquiry`
3. **OR** Move to a dedicated `inquiries` or `leads` edge function

---

## Discrepancy #4: AUTH-USER CORRECTLY CONTAINED

**Severity**: N/A (No Issue)

### Analysis

The `auth-user` edge function correctly contains:
- `handlers/login.ts` - User login via Supabase Auth
- `handlers/signup.ts` - User registration via Supabase Auth
- `handlers/logout.ts` - User logout (legacy Bubble)
- `handlers/validate.ts` - Token validation
- `handlers/resetPassword.ts` - Password reset request
- `handlers/updatePassword.ts` - Password update

All true authentication concerns are properly isolated in `auth-user`.

---

## Summary Table

| Function | Expected Concern | Actual Content | Violation |
|----------|------------------|----------------|-----------|
| `auth-user` | Authentication | Auth handlers | None |
| `bubble-proxy` | Bubble API proxy | Auth-adjacent, Listings, Proposals, Favorites, Messaging | Yes |
| `proposal` | Proposal operations | Proposal CRUD | None |
| `listing` | Listing operations | **Empty** | Yes |
| `ai-gateway` | AI operations | AI completions | None |

---

## Recommended Consolidation Plan

### Phase 1: Proposal Consolidation (CRITICAL)

1. Verify `proposal/actions/create.ts` handles all use cases from `bubble-proxy/handlers/proposal.ts`
2. Update frontend to use `proposal` edge function for creation
3. Remove `create_proposal` action from `bubble-proxy`
4. Delete `bubble-proxy/handlers/proposal.ts`

### Phase 2: Listing Migration (HIGH)

1. Move handlers to `listing` edge function:
   - `listing.ts` -> `listing/actions/create.ts`
   - `getListing.ts` -> `listing/actions/get.ts`
   - `submitListing.ts` -> `listing/actions/submit.ts`
2. Update `listing/index.ts` with proper routing
3. Update frontend to use `listing` edge function
4. Remove listing actions from `bubble-proxy`

### Phase 3: Cleanup (MEDIUM)

1. Rename `signup_ai` to `ai_inquiry` in `bubble-proxy`
2. Consider moving favorites to a dedicated function (optional)
3. Update `bubble-proxy` CLAUDE.md to reflect reduced scope

---

## Files Reference Summary

### Critical Files (Proposal Duplication)

```
supabase/functions/bubble-proxy/handlers/proposal.ts     # DUPLICATE - To Remove
supabase/functions/proposal/actions/create.ts            # KEEP - Canonical implementation
```

### High Priority Files (Listing Migration)

```
supabase/functions/listing/index.ts                      # EMPTY - Needs handlers
supabase/functions/bubble-proxy/handlers/listing.ts     # MOVE to listing/
supabase/functions/bubble-proxy/handlers/getListing.ts  # MOVE to listing/
supabase/functions/bubble-proxy/handlers/submitListing.ts # MOVE to listing/
```

### Medium Priority Files (Rename)

```
supabase/functions/bubble-proxy/handlers/signup.ts      # RENAME to aiInquiry.ts
```

---

**End of Analysis**
