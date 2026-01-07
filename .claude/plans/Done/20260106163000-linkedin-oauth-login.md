# Implementation Plan: LinkedIn OAuth Login Functionality

## Overview
Implement LinkedIn OAuth login for the existing login modal, extending the signup OAuth pattern. When a user clicks "Login with LinkedIn" and their account exists, they log in seamlessly. If the account doesn't exist, they are shown an error with an option to switch to signup.

## Success Criteria
- [ ] Clicking "Login with LinkedIn" initiates LinkedIn OAuth flow
- [ ] If user exists: Login succeeds, modal closes, UI updates to logged-in state
- [ ] If user doesn't exist: Error message shown with option to switch to signup modal
- [ ] OAuth failures show appropriate error messages
- [ ] Session tokens stored correctly for authenticated state
- [ ] Page does not reload (stays on current page after successful login)

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/shared/SignUpLoginModal.jsx` | Login modal UI | Add click handler for LinkedIn login button, add OAuth callback handling for login flow |
| `app/src/lib/auth.js` | Authentication utilities | Add `initiateLinkedInOAuthLogin()` and `handleLinkedInOAuthLoginCallback()` functions |
| `app/src/lib/secureStorage.js` | Secure storage for auth state | Add login-specific OAuth storage key (distinguish from signup flow) |
| `supabase/functions/auth-user/index.ts` | Auth router | Add `oauth_login` action to allowed actions |
| `supabase/functions/auth-user/handlers/oauthLogin.ts` | **NEW FILE** | Handle OAuth login - verify user exists, return session data |

### Related Documentation
- `supabase/CLAUDE.md` - Edge Function patterns and action-based routing
- `app/src/lib/CLAUDE.md` - Frontend utility conventions
- `app/src/islands/CLAUDE.md` - Component patterns

### Existing Patterns to Follow
- **OAuth Signup Pattern** (`initiateLinkedInOAuth` + `handleLinkedInOAuthCallback`): Stores user type before redirect, handles callback after OAuth return
- **Action-Based Edge Functions**: All edge functions use `{ action, payload }` request pattern
- **Session Storage Pattern**: Use Supabase `setSession()` to establish authenticated client state
- **Error Response Pattern**: Return `{ success: false, error: string, isDuplicate?: boolean }` for errors

## Implementation Steps

### Step 1: Add OAuth Login Storage Key to Secure Storage
**Files:** `app/src/lib/secureStorage.js`
**Purpose:** Distinguish login OAuth flow from signup OAuth flow
**Details:**
- Add `LINKEDIN_OAUTH_LOGIN_FLOW: 'sl_linkedin_oauth_login_flow'` to `STATE_KEYS`
- Add `setLinkedInOAuthLoginFlow()` function to mark this as a login attempt
- Add `getLinkedInOAuthLoginFlow()` function to check if this is a login attempt
- Add `clearLinkedInOAuthLoginFlow()` function to clear after callback handling
**Validation:** Check localStorage in browser dev tools during OAuth flow

### Step 2: Add OAuth Login Functions to auth.js
**Files:** `app/src/lib/auth.js`
**Purpose:** Create login-specific OAuth initiation and callback handling
**Details:**
- Add `initiateLinkedInOAuthLogin()` function:
  - Set login flow flag via `setLinkedInOAuthLoginFlow(true)`
  - Call `supabase.auth.signInWithOAuth()` with provider 'linkedin_oidc'
  - Use `redirectTo: window.location.href` (stay on current page)
  - Return success/error result
- Add `handleLinkedInOAuthLoginCallback()` function:
  - Check `getLinkedInOAuthLoginFlow()` to verify this is a login callback
  - Get session from `supabase.auth.getSession()`
  - Verify provider is 'linkedin_oidc'
  - Call Edge Function with `action: 'oauth_login'`
  - If success: Store session data, clear flow flag, return user data
  - If user not found: Return `{ success: false, error: 'Account not found', userNotFound: true }`
  - Clear flow flag regardless of outcome
**Validation:** Console log each step, test OAuth redirect and callback

### Step 3: Create OAuth Login Edge Function Handler
**Files:** `supabase/functions/auth-user/handlers/oauthLogin.ts` (NEW FILE)
**Purpose:** Verify user exists and return session data for OAuth login
**Details:**
- Export `handleOAuthLogin(supabaseUrl, supabaseServiceKey, payload)` function
- Validate required fields: `email`, `supabaseUserId`
- Query `public.user` table for existing user by email (lowercase)
- If user NOT found:
  - Return `{ userNotFound: true, email: payload.email }`
- If user found:
  - Update Supabase Auth user metadata with user_id, user_type (if not already set)
  - Return session data: `{ user_id, user_type, supabase_user_id, access_token, refresh_token }`
**Validation:** Test with existing user email, non-existing email

### Step 4: Register OAuth Login Action in Edge Function Router
**Files:** `supabase/functions/auth-user/index.ts`
**Purpose:** Route oauth_login action to handler
**Details:**
- Import `handleOAuthLogin` from './handlers/oauthLogin.ts'
- Add 'oauth_login' to `allowedActions` array
- Add case in switch statement:
  ```typescript
  case 'oauth_login':
    result = await handleOAuthLogin(supabaseUrl, supabaseServiceKey, payload);
    break;
  ```
**Validation:** Call endpoint with action: 'oauth_login', verify routing

### Step 5: Update Login Modal - Add LinkedIn Button Handler
**Files:** `app/src/islands/shared/SignUpLoginModal.jsx`
**Purpose:** Wire up LinkedIn login button to OAuth flow
**Details:**
- Import new functions from auth.js: `initiateLinkedInOAuthLogin`, `handleLinkedInOAuthLoginCallback`
- Replace placeholder `onClick` handler for LinkedIn button in `renderLoginView()`:
  ```jsx
  onClick={async () => {
    const result = await initiateLinkedInOAuthLogin();
    if (!result.success) {
      setError(result.error || 'Failed to start LinkedIn login');
    }
  }}
  ```
- Add loading state while initiating OAuth
**Validation:** Click LinkedIn button, verify OAuth redirect to LinkedIn

### Step 6: Add Login OAuth Callback Detection to Modal
**Files:** `app/src/islands/shared/SignUpLoginModal.jsx`
**Purpose:** Handle OAuth callback when returning from LinkedIn for login flow
**Details:**
- Modify existing `useEffect` for OAuth callback detection
- Check `getLinkedInOAuthLoginFlow()` FIRST (before signup flow check)
- If login flow detected:
  - Call `handleLinkedInOAuthLoginCallback()`
  - On success: Show success toast, call `onAuthSuccess`, close modal (no page reload)
  - On `userNotFound`: Show error message, offer to switch to signup
  - On other error: Show error toast, clear error state
- Keep existing signup callback handling as fallback
**Validation:** Complete OAuth flow, verify callback handling in both success and failure cases

### Step 7: Add User Not Found State and UI
**Files:** `app/src/islands/shared/SignUpLoginModal.jsx`
**Purpose:** Handle case when user tries to login but account doesn't exist
**Details:**
- Add state: `const [userNotFoundData, setUserNotFoundData] = useState({ email: '', showModal: false })`
- When `handleLinkedInOAuthLoginCallback()` returns `userNotFound: true`:
  - Set `userNotFoundData({ email: result.email, showModal: true })`
- Render conditional modal/message similar to `duplicateEmailData` pattern:
  - Title: "Account Not Found"
  - Message: "No account exists with [email]. Would you like to create one?"
  - Primary button: "Sign up instead" - switches to signup flow, prefills email
  - Secondary button: "Try different account" - clears state, stays on login
**Validation:** Test with non-existing LinkedIn account email

## Edge Cases & Error Handling
- **Network failure during OAuth**: Supabase handles redirect, catch errors in callback
- **OAuth cancelled by user**: No callback triggered, user returns to site without hash params
- **Session already exists**: `getSession()` may return existing session - verify provider matches
- **Concurrent signup/login flows**: Clear flow flags at start of each new flow to prevent confusion
- **Stale storage keys**: Always clear OAuth storage keys in finally block

## Testing Considerations
- Test with LinkedIn account that has NO Split Lease user record -> should show "Account Not Found"
- Test with LinkedIn account that HAS Split Lease user record -> should login successfully
- Test OAuth flow cancellation (user clicks "Cancel" on LinkedIn) -> should return to modal cleanly
- Test page reload during OAuth flow -> should handle gracefully
- Verify session persistence after successful login
- Verify UI updates to logged-in state (Header shows avatar, etc.)

## Rollback Strategy
- Remove `oauth_login` from allowed actions in `auth-user/index.ts`
- Revert LinkedIn button handler to placeholder alert
- No database changes required (read-only operation for login)

## Dependencies & Blockers
- LinkedIn OAuth must be configured in Supabase Auth settings (already done for signup)
- `linkedin_oidc` provider must be enabled (already done)

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OAuth callback conflicts with signup flow | Medium | Medium | Check login flow flag FIRST before signup |
| User metadata update fails | Low | Low | Non-blocking, log warning and continue |
| Session storage race condition | Low | High | Verify session with getSession() loop |

---

## File References Summary

### Files to Modify
1. `app/src/lib/secureStorage.js` - Add login flow storage key
2. `app/src/lib/auth.js` - Add login OAuth functions
3. `app/src/islands/shared/SignUpLoginModal.jsx` - Wire up button, handle callback
4. `supabase/functions/auth-user/index.ts` - Register new action

### Files to Create
1. `supabase/functions/auth-user/handlers/oauthLogin.ts` - OAuth login handler

### Files for Reference (read-only)
- `supabase/functions/auth-user/handlers/oauthSignup.ts` - Pattern reference
- `supabase/functions/auth-user/handlers/login.ts` - Session return pattern
- `app/src/lib/constants.js` - URL constants if needed
