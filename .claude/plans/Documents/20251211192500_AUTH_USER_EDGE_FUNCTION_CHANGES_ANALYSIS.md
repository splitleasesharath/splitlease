# Auth-User Edge Function Changes Analysis (Past 25 Hours)

**Generated**: 2025-12-11 19:25:00
**Scope**: `supabase/functions/auth-user/` and `ai-signup-guest` introduction
**Analysis Period**: Last 25 hours from 2025-12-11

---

## Executive Summary

This document enumerates all changes made to the `auth-user` edge function in the past 25 hours and details the commit that introduced the new `ai-signup-guest` edge function.

**Key Findings**:
- 3 commits modified `auth-user` handlers
- 1 commit introduced `ai-signup-guest` as a new edge function
- Major architectural change: removal of `account_guest` table references
- Validation handler significantly simplified

---

## Auth-User Edge Function Overview

**Location**: `supabase/functions/auth-user/`

**Purpose**: Authentication operations via Supabase Auth (native) and Bubble (legacy)

**Supported Actions**:
| Action | Handler | Backend |
|--------|---------|---------|
| `login` | `handlers/login.ts` | Supabase Auth (native) |
| `signup` | `handlers/signup.ts` | Supabase Auth (native) |
| `logout` | `handlers/logout.ts` | Client-side (stub) |
| `validate` | `handlers/validate.ts` | Supabase + Bubble (legacy) |
| `request_password_reset` | `handlers/resetPassword.ts` | Supabase Auth (native) |
| `update_password` | `handlers/updatePassword.ts` | Supabase Auth (native) |

**Endpoint**: `POST /functions/v1/auth-user`

---

## Commits in Past 25 Hours

### Commit 1: `d3f6a3dd98c0b4390ddc309b610f3b6d9ee39207`

**Timestamp**: 2025-12-11 13:57:23 -0500
**Author**: splitleasesharath
**Message**: `fix(auth): correct column names and logout race condition`

#### Files Modified

| File | Type |
|------|------|
| `supabase/functions/auth-user/handlers/login.ts` | Modified |
| `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx` | Modified |

#### Changes to `login.ts`

**Problem**: Column names in SELECT query did not match Bubble user table schema.

**Fix**:
```diff
- .select('_id, email, "First Name", "Last Name", "Profile Photo", "Account - Host / Landlord"')
+ .select('_id, email, "Name - First", "Name - Last", "Profile Photo", "Account - Host / Landlord"')
```

```diff
- firstName: userProfile?.['First Name'] || '',
- lastName: userProfile?.['Last Name'] || '',
+ firstName: userProfile?.['Name - First'] || '',
+ lastName: userProfile?.['Name - Last'] || '',
```

**Impact**: Fixed login profile fetch error where first/last names were not being returned correctly.

---

### Commit 2: `048eb9ff24cec955e1eac7bb33a436c6bf38c999`

**Timestamp**: 2025-12-10 17:18:36 -0600
**Author**: Claude Code
**Message**: `refactor: remove account_guest table and column references`

#### Files Modified (auth-user related)

| File | Type |
|------|------|
| `supabase/functions/auth-user/handlers/login.ts` | Modified |
| `supabase/functions/auth-user/handlers/signup.ts` | Modified |
| `supabase/functions/auth-user/handlers/resetPassword.ts` | Modified |

#### Detailed Changes

##### `login.ts`

```diff
- .select('_id, email, "First Name", "Last Name", "Profile Photo", "Account - Host / Landlord", "Account - Guest"')
+ .select('_id, email, "First Name", "Last Name", "Profile Photo", "Account - Host / Landlord"')

- let guestAccountId = userProfile?.['Account - Guest'] || authUser.user_metadata?.guest_account_id;
- console.log(`[login]    Guest Account ID: ${guestAccountId}`);

- guest_account_id: guestAccountId,
```

##### `signup.ts`

**Major changes**:
1. No longer generates `generatedGuestId` via `generate_bubble_id()` RPC
2. Removed `account_guest` table insert entirely
3. Removed `Account - Guest` field from user record insert
4. Removed `guest_account_id` from return object
5. Updated `enqueueSignupSync()` call to exclude guest account

```diff
- const { data: generatedGuestId, error: guestIdError } = await supabaseAdmin.rpc('generate_bubble_id');
- if (userIdError || hostIdError || guestIdError) {
+ if (userIdError || hostIdError) {

- console.log(`[signup]    Generated Guest Account ID: ${generatedGuestId}`);

- guest_account_id: generatedGuestId,

- // Step 2: Insert into account_guest table
- console.log('[signup] Creating account_guest record...');
- const guestAccountRecord = {
-   '_id': generatedGuestId,
-   'User': generatedUserId,
-   'Email': email,
-   'Created Date': now,
-   'Modified Date': now,
-   'bubble_id': null
- };
- const { error: guestInsertError } = await supabaseAdmin
-   .from('account_guest')
-   .insert(guestAccountRecord);

- 'Account - Guest': generatedGuestId,

- await enqueueSignupSync(supabaseAdmin, generatedUserId, generatedHostId, generatedGuestId);
+ await enqueueSignupSync(supabaseAdmin, generatedUserId, generatedHostId);

- guest_account_id: generatedGuestId,
```

##### `resetPassword.ts`

```diff
- .select('_id, email, "Name - First", "Name - Last", "Type - User Current", "Account - Host / Landlord", "Account - Guest"')
+ .select('_id, email, "Name - First", "Name - Last", "Type - User Current", "Account - Host / Landlord"')

- guest_account_id: legacyUser['Account - Guest'],
```

**Architectural Impact**: User guest status is now determined from `Type - User Current` / `Type - User Signup` fields on the user table rather than the existence of an `account_guest` record.

---

### Commit 3: `7b68c5a1a32d5a50d7f6fac93b0392da7082f993`

**Timestamp**: 2025-12-10 16:08:42 -0600
**Author**: Claude Code
**Message**: `validate.js`

#### File Modified

| File | Type |
|------|------|
| `supabase/functions/auth-user/handlers/validate.ts` | Modified |

#### Major Refactoring

**Before**: ~200 lines with complex branching logic
**After**: ~75 lines with simplified single-path flow

##### Removed Features

1. **UUID Detection Logic**
   - Removed `isUUID()` helper function
   - Removed conditional branching for Supabase Auth vs Bubble Auth users

2. **Bubble Token Validation**
   - Removed Supabase Auth `getUser(token)` validation
   - Now trusts login-issued tokens

3. **Dual User Lookup**
   - Removed lookup by email → fallback to bubble_user_id pattern
   - Simplified to single query by `_id`

4. **Proposal Count Fetching**
   - Removed query to `proposal` table
   - Removed `proposalCount` from return object

5. **Reduced User Profile Fields**
   - Removed `aboutMe`, `needForSpace`, `specialNeeds` from return
   - Kept core fields: `userId`, `firstName`, `fullName`, `email`, `profilePhoto`, `userType`, `accountHostId`

##### New Flow

```typescript
// Step 1: Fetch user data from Supabase (validates user exists)
const { data: userData, error: userError } = await supabase
  .from('user')
  .select('_id, bubble_id, "Name - First", "Name - Full", "Profile Photo", "Type - User Current", "email as text", "email", "Account - Host / Landlord"')
  .eq('_id', user_id)
  .single();

// Step 2: Format and return user data
```

**Rationale** (from comments):
- Token was validated when login succeeded
- Bubble will reject expired tokens on actual API calls
- Bubble Data API may not accept workflow-issued tokens

---

## AI-Signup-Guest Introduction Commit

### Commit: `0e979493abd241758426ded92b2e27cac83d9b52`

**Timestamp**: 2025-12-10 13:34:47 -0600
**Author**: Claude Code
**Message**: `fix(ai-signup): create missing ai-signup-guest edge function`

#### Problem

The `ai-signup-guest` edge function was configured in `config.toml` but the actual implementation file was missing. This caused the AI signup flow to fail silently, preventing freeform text from being saved to:
- `freeform ai signup text` field
- `freeform ai signup text (chatgpt generation)` field

#### File Added

| File | Lines |
|------|-------|
| `supabase/functions/ai-signup-guest/index.ts` | 171 |

#### Function Purpose

Bridges the gap between user creation (`auth-user/signup`) and AI profile parsing (`bubble-proxy/parseProfile`).

#### Implementation Flow

```
1. Receive POST request with { email, phone?, text_inputted }
2. Validate required fields (email, text_inputted)
3. Initialize Supabase admin client
4. Look up user by email in 'user' table
5. If user not found: return success with text_captured flag
6. If user found: update user record with:
   - 'freeform ai signup text' = text_inputted
   - 'Phone Number (as text)' = phone (if provided)
   - 'Modified Date' = current timestamp
7. Return user data for subsequent parseProfile call
```

#### Request/Response Format

**Request**:
```json
POST /functions/v1/ai-signup-guest
{
  "email": "user@example.com",
  "phone": "123-456-7890",
  "text_inputted": "I'm looking for a room in Manhattan near the subway..."
}
```

**Success Response (user found)**:
```json
{
  "success": true,
  "data": {
    "_id": "1734567890123x456789012345678",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "text_saved": true
  }
}
```

**Success Response (user not found)**:
```json
{
  "success": true,
  "data": {
    "message": "User not found, but text captured for processing",
    "email": "user@example.com",
    "text_captured": true
  }
}
```

#### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Uses `maybeSingle()` | Handles 0 or 1 result gracefully, no error if user missing |
| Returns success on missing user | Defensive for timing issues between signup and AI text submission |
| Updates `Modified Date` | Maintains audit trail |
| Optional phone field | Not all AI signup flows capture phone |
| Standard CORS handling | Consistent with other edge functions |

#### Full Source Code

```typescript
/**
 * AI Signup Guest - Edge Function
 * Split Lease
 *
 * This edge function handles the AI signup flow for guests:
 * 1. Receives email, phone, and freeform text input
 * 2. Looks up the user by email (user was already created in auth-user/signup)
 * 3. Saves the freeform text to the user's `freeform ai signup text` field
 * 4. Returns the user data (including _id) for the subsequent parseProfile call
 *
 * This function bridges the gap between user creation and AI profile parsing.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { ValidationError } from '../_shared/errors.ts';

console.log('[ai-signup-guest] Edge Function started');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[ai-signup-guest] ========== NEW REQUEST ==========');
    console.log('[ai-signup-guest] Method:', req.method);

    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed. Use POST.');
    }

    // Parse request body
    const body = await req.json();
    console.log('[ai-signup-guest] Request body:', JSON.stringify(body, null, 2));

    const { email, phone, text_inputted } = body;

    // Validate required fields
    if (!email) {
      throw new ValidationError('email is required');
    }
    if (!text_inputted) {
      throw new ValidationError('text_inputted is required');
    }

    console.log('[ai-signup-guest] Email:', email);
    console.log('[ai-signup-guest] Phone:', phone || 'Not provided');
    console.log('[ai-signup-guest] Text length:', text_inputted.length);

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    // Initialize Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // ========== STEP 1: Find user by email ==========
    console.log('[ai-signup-guest] Step 1: Looking up user by email...');

    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('_id, email, "Name - First", "Name - Last"')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userError) {
      console.error('[ai-signup-guest] Error looking up user:', userError);
      throw new Error(`Failed to look up user: ${userError.message}`);
    }

    if (!userData) {
      console.log('[ai-signup-guest] User not found, they may not have been created yet');
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            message: 'User not found, but text captured for processing',
            email: email,
            text_captured: true
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[ai-signup-guest] ✅ User found:', userData._id);

    // ========== STEP 2: Save freeform text to user record ==========
    console.log('[ai-signup-guest] Step 2: Saving freeform text to user record...');

    const updateData: Record<string, any> = {
      'freeform ai signup text': text_inputted,
      'Modified Date': new Date().toISOString(),
    };

    if (phone) {
      updateData['Phone Number (as text)'] = phone;
    }

    const { error: updateError } = await supabase
      .from('user')
      .update(updateData)
      .eq('_id', userData._id);

    if (updateError) {
      console.error('[ai-signup-guest] Error updating user:', updateError);
      throw new Error(`Failed to update user: ${updateError.message}`);
    }

    console.log('[ai-signup-guest] ✅ Freeform text saved to user record');
    console.log('[ai-signup-guest] ========== SUCCESS ==========');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          _id: userData._id,
          email: userData.email,
          firstName: userData['Name - First'],
          lastName: userData['Name - Last'],
          text_saved: true
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[ai-signup-guest] ========== ERROR ==========');
    console.error('[ai-signup-guest] Error:', error);
    console.error('[ai-signup-guest] Error stack:', error.stack);

    const statusCode = error instanceof ValidationError ? 400 : 500;

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

---

## Summary Table

| Commit | Timestamp | Files Changed | Key Change |
|--------|-----------|---------------|------------|
| `d3f6a3d` | 2025-12-11 13:57 | 2 | Column name fix (`Name - First`/`Name - Last`) |
| `048eb9f` | 2025-12-10 17:18 | 8 | Removed `account_guest` table references |
| `7b68c5a` | 2025-12-10 16:08 | 1 | Simplified `validate.ts` (~200→75 lines) |
| `0e97949` | 2025-12-10 13:34 | 1 | **Added** `ai-signup-guest` edge function |

---

## Deployment Reminders

After these changes, the following edge functions require deployment:

```bash
supabase functions deploy auth-user
supabase functions deploy ai-signup-guest
```

---

## Related Files

### Current auth-user Structure

```
supabase/functions/auth-user/
├── index.ts                    # Main router
├── deno.json                   # Import map
└── handlers/
    ├── login.ts                # Supabase Auth login
    ├── signup.ts               # Supabase Auth signup
    ├── logout.ts               # Client-side logout stub
    ├── validate.ts             # Session validation
    ├── resetPassword.ts        # Password reset request
    └── updatePassword.ts       # Password update after reset
```

### ai-signup-guest Structure

```
supabase/functions/ai-signup-guest/
└── index.ts                    # Single-file implementation
```

---

## References

- [AUTH_USER.md](../Documentation/Backend(EDGE%20-%20Functions)/AUTH_USER.md)
- [AI_SIGNUP_GUEST.md](../Documentation/Backend(EDGE%20-%20Functions)/AI_SIGNUP_GUEST.md)
- [SIGNUP_FLOW.md](../Documentation/Auth/SIGNUP_FLOW.md)

---

**Document Version**: 1.0
**Last Updated**: 2025-12-11
