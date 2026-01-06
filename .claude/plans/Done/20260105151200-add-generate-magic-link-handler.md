# Implementation Plan: Add generate_magic_link Action to auth-user Edge Function

## Overview

Add a new `generate_magic_link` action to the auth-user Edge Function that generates a magic link for a given email WITHOUT sending an email. This enables custom email delivery workflows where the application controls the email content and delivery mechanism.

## Success Criteria

- [ ] New handler file `generateMagicLink.ts` created following existing handler patterns
- [ ] Action `generate_magic_link` added to index.ts routing
- [ ] Handler validates email input
- [ ] Handler uses `supabaseAdmin.auth.admin.generateLink()` with type `magiclink`
- [ ] Handler returns `action_link` and token properties WITHOUT sending email
- [ ] Error handling follows existing patterns (ValidationError, BubbleApiError)

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/functions/auth-user/index.ts` | Action router | Add import and switch case for `generate_magic_link` |
| `supabase/functions/auth-user/handlers/generateMagicLink.ts` | NEW | Handler implementation |
| `supabase/functions/_shared/validation.ts` | Input validation | Use existing `validateRequiredFields`, `validateEmail` |
| `supabase/functions/_shared/errors.ts` | Error classes | Use existing `ValidationError`, `BubbleApiError` |

### Existing Patterns to Follow

- **Handler Signature**: `async function handleXxx(supabaseUrl: string, supabaseServiceKey: string, payload: any): Promise<any>`
- **Supabase Admin Client**: Initialize with `createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })`
- **Validation**: Call `validateRequiredFields(payload, ['field1', 'field2'])` then specific validators like `validateEmail(email)`
- **Logging**: Use `console.log('[handler-name] message')` pattern with visual separators
- **Error Handling**: Throw `BubbleApiError` for API failures, let `ValidationError` propagate

### Supabase Admin API Reference

The `generateLink` method signature:
```typescript
const { data, error } = await supabaseAdmin.auth.admin.generateLink({
  type: 'magiclink',
  email: string,
  options?: {
    redirectTo?: string,
    // Other options available but not needed for this use case
  }
});

// Returns:
// data.properties.action_link - The full magic link URL
// data.properties.email_otp - OTP code (if applicable)
// data.properties.hashed_token - Hashed token value
// data.properties.redirect_to - Redirect URL used
// data.properties.verification_type - Type of verification
// data.user - The user object
```

## Implementation Steps

### Step 1: Create the Handler File

**File:** `supabase/functions/auth-user/handlers/generateMagicLink.ts`

**Purpose:** Implement the magic link generation logic

**Details:**

Create new file with this structure:

```typescript
/**
 * Generate Magic Link Handler - Generate magic link without sending email
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Validate email in payload
 * 2. Call Supabase Auth admin.generateLink() with type 'magiclink'
 * 3. Return action_link and token data (NO email sent)
 *
 * Use Case: Custom email delivery - caller handles sending the link
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key for admin operations
 * @param payload - Request payload {email, redirectTo?}
 * @returns {action_link, hashed_token, redirect_to, verification_type, user_id?}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields, validateEmail } from '../../_shared/validation.ts';

export async function handleGenerateMagicLink(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  console.log('[generate-magic-link] ========== GENERATE MAGIC LINK ==========');

  // Validate required fields
  validateRequiredFields(payload, ['email']);
  const { email, redirectTo } = payload;

  // Validate email format
  validateEmail(email);

  const emailLower = email.toLowerCase().trim();
  console.log(`[generate-magic-link] Generating magic link for: ${emailLower}`);

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Generate magic link WITHOUT sending email
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: emailLower,
      options: {
        redirectTo: redirectTo || undefined
      }
    });

    if (error) {
      console.error('[generate-magic-link] Error generating link:', error.message);
      throw new BubbleApiError(
        `Failed to generate magic link: ${error.message}`,
        error.status || 500
      );
    }

    if (!data?.properties?.action_link) {
      console.error('[generate-magic-link] No action_link in response');
      throw new BubbleApiError('Magic link generation failed - no link returned', 500);
    }

    console.log('[generate-magic-link] Magic link generated successfully');
    console.log('[generate-magic-link] User ID:', data.user?.id);

    // Return the link and token data
    return {
      action_link: data.properties.action_link,
      hashed_token: data.properties.hashed_token,
      redirect_to: data.properties.redirect_to,
      verification_type: data.properties.verification_type,
      user_id: data.user?.id,
      email: emailLower
    };

  } catch (error: any) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error('[generate-magic-link] ========== ERROR ==========');
    console.error('[generate-magic-link] Error:', error);

    throw new BubbleApiError(
      `Failed to generate magic link: ${error.message}`,
      500,
      error
    );
  }
}
```

**Validation:** Run `supabase functions serve auth-user` and test with curl/Postman

### Step 2: Update index.ts - Add Import

**File:** `supabase/functions/auth-user/index.ts`

**Purpose:** Import the new handler

**Details:**

Add import after line 35 (after `handleUpdatePassword` import):

```typescript
import { handleGenerateMagicLink } from './handlers/generateMagicLink.ts';
```

**Validation:** No syntax errors in import

### Step 3: Update index.ts - Add to allowedActions

**File:** `supabase/functions/auth-user/index.ts`

**Purpose:** Register the action as valid

**Details:**

Modify line 78 to add `'generate_magic_link'` to the array:

```typescript
const allowedActions = ['login', 'signup', 'logout', 'validate', 'request_password_reset', 'update_password', 'generate_magic_link'];
```

**Validation:** Action validation passes for `generate_magic_link`

### Step 4: Update index.ts - Add Switch Case

**File:** `supabase/functions/auth-user/index.ts`

**Purpose:** Route to the handler

**Details:**

Add case after line 132 (after `update_password` case, before `default`):

```typescript
      case 'generate_magic_link':
        // Generate magic link without sending email (for custom email flows)
        result = await handleGenerateMagicLink(supabaseUrl, supabaseServiceKey, payload);
        break;
```

**Validation:** Action routes correctly to handler

### Step 5: Update Header Comment

**File:** `supabase/functions/auth-user/index.ts`

**Purpose:** Document the new action

**Details:**

Add to the header comment (around line 15):

```
 * - generate_magic_link: Generate magic link without sending email - via Supabase Auth (native)
```

**Validation:** Documentation is accurate

## Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| Invalid email format | `validateEmail()` throws `ValidationError` (400) |
| Missing email | `validateRequiredFields()` throws `ValidationError` (400) |
| User does not exist | Supabase will create a new user OR return error depending on config |
| Supabase API failure | Throw `BubbleApiError` with status from Supabase |
| Rate limiting | Let Supabase error propagate (429) |

## Testing Considerations

**Manual Test Request:**
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/auth-user \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate_magic_link",
    "payload": {
      "email": "test@example.com",
      "redirectTo": "https://split.lease/magic-login"
    }
  }'
```

**Expected Success Response:**
```json
{
  "success": true,
  "data": {
    "action_link": "https://YOUR_PROJECT.supabase.co/auth/v1/verify?token=xxx&type=magiclink&redirect_to=...",
    "hashed_token": "abc123...",
    "redirect_to": "https://split.lease/magic-login",
    "verification_type": "magiclink",
    "user_id": "uuid-here",
    "email": "test@example.com"
  }
}
```

**Expected Error Response (invalid email):**
```json
{
  "success": false,
  "error": "Invalid email format: not-an-email"
}
```

## Rollback Strategy

1. Remove the switch case from `index.ts`
2. Remove `'generate_magic_link'` from `allowedActions` array
3. Remove the import statement
4. Delete `handlers/generateMagicLink.ts`
5. Redeploy function

## Dependencies & Blockers

- None - uses existing Supabase Auth Admin API
- No database changes required
- No Bubble integration needed

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| User enumeration via magic link | Low | Medium | Consider rate limiting or always-success pattern if needed |
| Token exposure in logs | Low | High | Do not log `action_link` or `hashed_token` values |
| Breaking existing actions | Very Low | High | New action is additive, no changes to existing handlers |

## Post-Implementation

- [ ] **REMINDER**: Deploy Edge Function manually: `supabase functions deploy auth-user`
- [ ] Test in local environment first: `supabase functions serve auth-user`
- [ ] Verify existing actions still work after deployment

---

## Files Referenced Summary

| File Path | Action |
|-----------|--------|
| `supabase/functions/auth-user/index.ts` | MODIFY |
| `supabase/functions/auth-user/handlers/generateMagicLink.ts` | CREATE |
| `supabase/functions/auth-user/handlers/login.ts` | REFERENCE (pattern) |
| `supabase/functions/auth-user/handlers/resetPassword.ts` | REFERENCE (pattern) |
| `supabase/functions/_shared/validation.ts` | REFERENCE (use existing) |
| `supabase/functions/_shared/errors.ts` | REFERENCE (use existing) |
