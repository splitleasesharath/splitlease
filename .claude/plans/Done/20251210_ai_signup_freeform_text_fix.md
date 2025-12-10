# AI Signup Freeform Text Saving Fix

**Date**: 2025-12-10
**Status**: IMPLEMENTED
**Commit**: 0e97949

## Problem

When users signed up using the AI signup market research report shared island (`AiSignupMarketReport.jsx`), the freeform text they entered was NOT being saved to the database. Specifically:

1. `freeform ai signup text` - The raw text user entered (e.g., "i need sunday to wednesday every week for going to work in NYC")
2. `freeform ai signup text (chatgpt generation)` - The AI-parsed structured result

## Root Cause

The `ai-signup-guest` edge function was **configured in `config.toml` but the actual file did not exist**:

```toml
# In supabase/config.toml
[functions.ai-signup-guest]
enabled = true
verify_jwt = false
entrypoint = "./functions/ai-signup-guest/index.ts"  # FILE DID NOT EXIST!
```

This caused the following flow to fail:

1. `signupUser()` - Creates user account via auth-user/signup.ts (WORKS)
2. `submitSignup()` calls `/functions/v1/ai-signup-guest` (FAILS - 404/500)
3. `parseProfileWithAI()` - Never called due to step 2 failure

## Data Flow Analysis

```
AiSignupMarketReport.jsx
    │
    ├── Step 1: signupUser() → auth-user/signup.ts
    │   └── Creates: auth.users, public.user, account_host, account_guest
    │   └── Returns: user_id (Bubble-style _id)
    │
    ├── Step 2: fetch('/functions/v1/ai-signup-guest') ← MISSING FILE!
    │   └── Should save: 'freeform ai signup text'
    │   └── Returns: user data with _id
    │
    └── Step 3: parseProfileWithAI() → bubble-proxy/parseProfile.ts
        └── Calls GPT-4 to parse freeform text
        └── Saves: 'freeform ai signup text' AND 'freeform ai signup text (chatgpt generation)'
        └── Updates user profile with extracted data
        └── Auto-favorites matching listings
```

## Solution

Created the missing `supabase/functions/ai-signup-guest/index.ts` that:

1. Accepts `email`, `phone`, `text_inputted` from request body
2. Looks up user by email in `public.user` table
3. Saves `freeform ai signup text` field to user record
4. Returns `_id` in response for subsequent `parseProfileWithAI()` call

The `parseProfile.ts` handler then:
- Calls GPT-4 to parse the freeform text
- Saves `freeform ai signup text (chatgpt generation)` with the GPT response
- Extracts structured data (biography, needs, borough preferences, etc.)
- Auto-favorites matching listings

## Files Changed

- `supabase/functions/ai-signup-guest/index.ts` - NEW FILE (171 lines)

## Database Fields

| Field Name | Type | Saved By |
|------------|------|----------|
| `freeform ai signup text` | text | ai-signup-guest + parseProfile |
| `freeform ai signup text (chatgpt generation)` | text | parseProfile only |

## Deployment Required

**IMPORTANT**: The new edge function must be deployed manually:

```bash
supabase functions deploy ai-signup-guest
```

## Testing

To test the fix:
1. Deploy the edge function
2. Create a new test user via the AI signup flow
3. Check the `user` table for:
   - `freeform ai signup text` should contain the raw input
   - `freeform ai signup text (chatgpt generation)` should contain the GPT-4 parsed result

## Related Files

- `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx:217-365` - Frontend submission flow
- `supabase/functions/bubble-proxy/handlers/parseProfile.ts:387-447` - GPT parsing and DB update
- `supabase/functions/auth-user/handlers/signup.ts` - User creation
- `supabase/config.toml:375-378` - Edge function config
