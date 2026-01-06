# Implementation Plan: LinkedIn OAuth Profile Picture Capture

## Overview
Extend the LinkedIn OAuth signup flow to automatically capture and save the user's LinkedIn profile picture URL to the 'Profile Photo' field in the user table. This is an optional enhancement that should not fail the signup if the picture is unavailable.

## Success Criteria
- [ ] Profile picture URL is extracted from LinkedIn OAuth response during signup
- [ ] Profile picture URL is saved to 'Profile Photo' field in user table (if available)
- [ ] Signup flow succeeds even if profile picture is missing or invalid
- [ ] Login flow is NOT affected (only signup captures profile photo)
- [ ] Existing users' profile photos are NOT overwritten on OAuth login

---

## Context & References

### LinkedIn OAuth Data Flow
```
User clicks LinkedIn signup
        |
        v
Supabase Auth → LinkedIn OIDC → Returns session with user_metadata
        |
        v
Frontend: handleLinkedInOAuthCallback() extracts data from session.user
        |
        v
Frontend calls Edge Function: auth-user with action='oauth_signup'
        |
        v
Edge Function: handleOAuthSignup() creates user record in public.user
```

### Where LinkedIn Profile Picture is Available

LinkedIn OIDC uses standard OpenID Connect claims. The profile picture is available as:
- `user.user_metadata.picture` - LinkedIn profile picture URL (OIDC standard claim)
- Alternative: `user.user_metadata.avatar_url` - Some OAuth flows normalize to this

**LinkedIn OIDC returns these standard claims:**
- `sub` - User's LinkedIn member ID
- `email` - User's email address
- `email_verified` - Boolean
- `given_name` - First name
- `family_name` - Last name
- `name` - Full name
- `picture` - Profile picture URL (this is what we need)
- `locale` - User's locale

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/lib/auth.js` | Frontend OAuth callback handler | Extract `picture` from `user_metadata`, pass to Edge Function |
| `supabase/functions/auth-user/handlers/oauthSignup.ts` | Creates user record from OAuth data | Accept `profilePhoto` in payload, save to 'Profile Photo' field |

### Related Documentation
- [Supabase LinkedIn OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-linkedin) - OAuth setup and metadata fields
- [User Management Docs](https://supabase.com/docs/guides/auth/managing-user-data) - How user_metadata is populated from OAuth

### Existing Patterns to Follow

1. **OAuth Data Extraction Pattern** (from `auth.js` lines 1451-1457):
```javascript
const linkedInData = {
  email: user.email,
  firstName: user.user_metadata?.given_name || user.user_metadata?.first_name || '',
  lastName: user.user_metadata?.family_name || user.user_metadata?.last_name || '',
  supabaseUserId: user.id,
};
```

2. **User Record Creation Pattern** (from `oauthSignup.ts` lines 126-145):
```typescript
const userRecord = {
  '_id': generatedUserId,
  'email': email.toLowerCase(),
  'Name - First': firstName || null,
  // ... other fields
};
```

3. **Optional Field Handling** (from `oauthSignup.ts` line 135):
```typescript
'Date of Birth': null, // OAuth signup skips DOB
'Phone Number (as text)': null, // OAuth signup skips phone
```

---

## Implementation Steps

### Step 1: Extract Profile Picture in Frontend OAuth Callback

**File:** `app/src/lib/auth.js`
**Location:** `handleLinkedInOAuthCallback()` function (around line 1451)
**Purpose:** Extract the LinkedIn profile picture URL from the OAuth session and include it in the Edge Function call

**Details:**
1. Add `profilePhoto` extraction from `user.user_metadata.picture` (OIDC standard) with fallback to `user.user_metadata.avatar_url`
2. Add `profilePhoto` to the `linkedInData` object
3. The Edge Function payload already spreads `...linkedInData`, so the field will automatically be included

**Current Code (lines 1451-1457):**
```javascript
// Extract LinkedIn data from user_metadata
const linkedInData = {
  email: user.email,
  firstName: user.user_metadata?.given_name || user.user_metadata?.first_name || '',
  lastName: user.user_metadata?.family_name || user.user_metadata?.last_name || '',
  supabaseUserId: user.id,
};
```

**Updated Code:**
```javascript
// Extract LinkedIn data from user_metadata
const linkedInData = {
  email: user.email,
  firstName: user.user_metadata?.given_name || user.user_metadata?.first_name || '',
  lastName: user.user_metadata?.family_name || user.user_metadata?.last_name || '',
  profilePhoto: user.user_metadata?.picture || user.user_metadata?.avatar_url || null,
  supabaseUserId: user.id,
};
```

**Validation:**
- Log the `linkedInData` object (line 1459 already does this) to verify `profilePhoto` is extracted
- Check browser console after LinkedIn OAuth callback

---

### Step 2: Update OAuthSignupPayload Interface

**File:** `supabase/functions/auth-user/handlers/oauthSignup.ts`
**Location:** `OAuthSignupPayload` interface (lines 22-31)
**Purpose:** Add `profilePhoto` as an optional field in the TypeScript interface

**Current Code:**
```typescript
interface OAuthSignupPayload {
  email: string;
  firstName: string;
  lastName: string;
  userType: 'Host' | 'Guest';
  provider: string;
  supabaseUserId: string;
  access_token: string;
  refresh_token: string;
}
```

**Updated Code:**
```typescript
interface OAuthSignupPayload {
  email: string;
  firstName: string;
  lastName: string;
  userType: 'Host' | 'Guest';
  provider: string;
  supabaseUserId: string;
  access_token: string;
  refresh_token: string;
  profilePhoto?: string | null; // Optional - LinkedIn profile picture URL
}
```

**Validation:** TypeScript compilation should pass without errors

---

### Step 3: Extract profilePhoto from Payload

**File:** `supabase/functions/auth-user/handlers/oauthSignup.ts`
**Location:** Payload destructuring (lines 53-62)
**Purpose:** Extract `profilePhoto` from the incoming payload

**Current Code:**
```typescript
const {
  email,
  firstName = '',
  lastName = '',
  userType = 'Guest',
  provider,
  supabaseUserId,
  access_token,
  refresh_token,
} = payload;
```

**Updated Code:**
```typescript
const {
  email,
  firstName = '',
  lastName = '',
  userType = 'Guest',
  provider,
  supabaseUserId,
  access_token,
  refresh_token,
  profilePhoto = null,
} = payload;
```

**Validation:** No errors in Edge Function logs

---

### Step 4: Add profilePhoto to User Record

**File:** `supabase/functions/auth-user/handlers/oauthSignup.ts`
**Location:** `userRecord` object creation (lines 126-145)
**Purpose:** Include the profile photo URL in the user record being inserted

**Current Code (partial):**
```typescript
const userRecord = {
  '_id': generatedUserId,
  'bubble_id': null,
  'email': email.toLowerCase(),
  'email as text': email.toLowerCase(),
  'Name - First': firstName || null,
  'Name - Last': lastName || null,
  'Name - Full': fullName,
  'Date of Birth': null,
  'Phone Number (as text)': null,
  'Type - User Current': userTypeDisplay,
  'Type - User Signup': userTypeDisplay,
  'Created Date': now,
  'Modified Date': now,
  'authentication': {},
  'user_signed_up': true,
  'Receptivity': 0,
  'MedianHoursToReply': null,
  'Listings': null,
};
```

**Updated Code (add after 'Phone Number (as text)'):**
```typescript
const userRecord = {
  '_id': generatedUserId,
  'bubble_id': null,
  'email': email.toLowerCase(),
  'email as text': email.toLowerCase(),
  'Name - First': firstName || null,
  'Name - Last': lastName || null,
  'Name - Full': fullName,
  'Date of Birth': null,
  'Phone Number (as text)': null,
  'Profile Photo': profilePhoto || null, // LinkedIn profile picture (if available)
  'Type - User Current': userTypeDisplay,
  'Type - User Signup': userTypeDisplay,
  'Created Date': now,
  'Modified Date': now,
  'authentication': {},
  'user_signed_up': true,
  'Receptivity': 0,
  'MedianHoursToReply': null,
  'Listings': null,
};
```

**Validation:**
- Check database after signup to verify `Profile Photo` field is populated
- Verify the URL is a valid LinkedIn CDN URL (typically `media.licdn.com` or `platform-lookaside.fbsbx.com`)

---

### Step 5: Add Logging for Profile Photo

**File:** `supabase/functions/auth-user/handlers/oauthSignup.ts`
**Location:** After line 69 (after existing logging)
**Purpose:** Log whether profile photo was provided for debugging

**Add after line 69:**
```typescript
console.log(`[oauth-signup] Profile Photo: ${profilePhoto ? 'provided' : 'not provided'}`);
```

**Validation:** Check Edge Function logs to see profile photo status

---

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| No `picture` field in user_metadata | Fallback to `avatar_url`, then `null` - field defaults to null |
| Invalid URL format | Store as-is - URL validation not required (LinkedIn provides valid URLs) |
| Expired LinkedIn CDN URL | Not handled - LinkedIn CDN URLs are typically long-lived |
| User denies profile scope | `picture` field will be missing - handled by null fallback |
| OAuth login (not signup) | No changes needed - login flow doesn't create user record |

### No-Failure Principle
The implementation ensures signup NEVER fails due to profile photo issues:
- All extractions use optional chaining (`?.`)
- Fallbacks cascade: `picture` -> `avatar_url` -> `null`
- Database field accepts null values
- No validation that could throw errors

---

## Testing Considerations

### Manual Testing Steps
1. **New LinkedIn Signup (with photo)**
   - Sign up with a LinkedIn account that has a profile picture
   - Verify `Profile Photo` field in user table contains LinkedIn CDN URL
   - Verify profile photo displays in UI (account profile page)

2. **New LinkedIn Signup (without photo)**
   - Sign up with a LinkedIn account without a profile picture
   - Verify signup completes successfully
   - Verify `Profile Photo` field is null

3. **Existing User LinkedIn Login**
   - Login with LinkedIn for a user that already exists
   - Verify `Profile Photo` field is NOT overwritten (login uses different handler)

4. **Traditional Email Signup**
   - Sign up with email/password
   - Verify `Profile Photo` field is null (not affected by OAuth changes)

### Log Verification
Check Edge Function logs for:
```
[oauth-signup] Profile Photo: provided
```
or
```
[oauth-signup] Profile Photo: not provided
```

---

## Rollback Strategy

If issues arise, changes can be reverted by:
1. Reverting the two files to their previous state
2. The `Profile Photo` field already exists and accepts null - no database changes needed

**Git revert command:**
```bash
git revert HEAD  # If committed in single commit
```

---

## Dependencies & Blockers

| Dependency | Status |
|------------|--------|
| LinkedIn OAuth already configured | Confirmed working |
| `Profile Photo` column exists in user table | Confirmed (text field) |
| OAuth signup handler exists | Confirmed (`handleOAuthSignup`) |
| Frontend callback handler exists | Confirmed (`handleLinkedInOAuthCallback`) |

**No blockers identified.**

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LinkedIn changes `picture` claim name | Low | Low | Fallback to `avatar_url` already in place |
| Profile photo URL expires | Low | Low | LinkedIn CDN URLs are typically persistent |
| Signup fails due to DB error | Very Low | High | Field is nullable, follows existing pattern |
| TypeScript compilation error | Very Low | Medium | Interface change is additive (optional field) |

---

## Deployment Notes

**Edge Function Deployment Required:**
After implementing the Edge Function changes, manual deployment is needed:
```bash
supabase functions deploy auth-user
```

---

## Summary of Changes

### Files Modified

1. **`app/src/lib/auth.js`**
   - Add `profilePhoto` extraction in `handleLinkedInOAuthCallback()` (line ~1454)

2. **`supabase/functions/auth-user/handlers/oauthSignup.ts`**
   - Add `profilePhoto?: string | null` to `OAuthSignupPayload` interface (line ~31)
   - Add `profilePhoto = null` to payload destructuring (line ~62)
   - Add `'Profile Photo': profilePhoto || null` to `userRecord` object (line ~136)
   - Add logging for profile photo status (line ~70)

### Files Referenced (Read-Only)
- `app/src/lib/auth.js` - Full file for OAuth flow understanding
- `supabase/functions/auth-user/handlers/oauthSignup.ts` - Handler implementation
- `supabase/functions/auth-user/handlers/oauthLogin.ts` - Confirmed login doesn't need changes

### Database Tables Affected
- `public.user` - `Profile Photo` column will be populated for new OAuth signups

---

## Sources

- [Login with LinkedIn | Supabase Docs](https://supabase.com/docs/guides/auth/social-login/auth-linkedin)
- [User Management | Supabase Docs](https://supabase.com/docs/guides/auth/managing-user-data)
- [Current User Avatar](https://supabase.com/ui/docs/nextjs/current-user-avatar)
