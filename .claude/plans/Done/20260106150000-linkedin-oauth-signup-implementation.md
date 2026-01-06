# Implementation Plan: LinkedIn OAuth Signup

## Overview
Implement LinkedIn OIDC signup functionality in the SignUpLoginModal, allowing users to sign up with their LinkedIn account while preserving their selected user type (Guest/Host). This plan covers the frontend OAuth flow, user type persistence via localStorage, OAuth callback handling, user record creation, and duplicate email handling.

## Success Criteria
- [ ] User can click "Continue with LinkedIn" button and be redirected to LinkedIn OAuth
- [ ] User type (Guest/Host) is preserved across OAuth redirect via localStorage
- [ ] After OAuth callback, user record is created in public.user table with LinkedIn data
- [ ] User is redirected to /account-profile after successful signup
- [ ] Duplicate email shows confirmation modal before account linking
- [ ] Errors are handled gracefully with user-friendly toast messages
- [ ] Bubble sync is queued for the new user record

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/shared/SignUpLoginModal.jsx` | Auth modal with LinkedIn button placeholder | Add OAuth handler, callback detection, user creation flow |
| `app/src/lib/auth.js` | Auth utilities | Add LinkedIn OAuth helper functions |
| `app/src/lib/supabase.js` | Supabase client | No changes (already configured) |
| `app/src/lib/secureStorage.js` | Secure localStorage | Add LinkedIn-specific storage keys |
| `supabase/functions/auth-user/index.ts` | Auth router | Add `oauth_signup` action |
| `supabase/functions/auth-user/handlers/signup.ts` | Signup handler | Reference for user record creation pattern |
| (NEW) `supabase/functions/auth-user/handlers/oauthSignup.ts` | OAuth user creation | Create new handler |

### Related Documentation
- `supabase/CLAUDE.md` - Edge Functions patterns and conventions
- `app/src/CLAUDE.md` - Frontend architecture and patterns
- `app/src/lib/constants.js` - Application constants

### Existing Patterns to Follow
1. **Supabase Auth OAuth**: Use `supabase.auth.signInWithOAuth()` for LinkedIn OIDC
2. **User Record Creation**: Follow pattern from `signup.ts` handler (generate_bubble_id, user_metadata, public.user insert)
3. **Queue Sync**: Use `enqueueSignupSync()` from `_shared/queueSync.ts` for Bubble sync
4. **Error Handling**: Use toast notifications for user-facing errors
5. **secureStorage Pattern**: Store OAuth state in localStorage before redirect

## Implementation Steps

### Step 1: Add LinkedIn OAuth Storage Keys
**Files:** `app/src/lib/secureStorage.js`
**Purpose:** Add storage keys for LinkedIn OAuth state (user type before redirect)
**Details:**
- Add `LINKEDIN_OAUTH_USER_TYPE` key to `STATE_KEYS`
- Add `setLinkedInOAuthUserType(userType)` function
- Add `getLinkedInOAuthUserType()` function
- Add `clearLinkedInOAuthUserType()` function
**Validation:** Keys are accessible via getter/setter functions

```javascript
// Add to STATE_KEYS
const STATE_KEYS = {
  // ... existing keys
  LINKEDIN_OAUTH_USER_TYPE: 'sl_linkedin_oauth_user_type',
};

// Add helper functions
export function setLinkedInOAuthUserType(userType) {
  if (userType) {
    localStorage.setItem(STATE_KEYS.LINKEDIN_OAUTH_USER_TYPE, userType);
  }
}

export function getLinkedInOAuthUserType() {
  return localStorage.getItem(STATE_KEYS.LINKEDIN_OAUTH_USER_TYPE);
}

export function clearLinkedInOAuthUserType() {
  localStorage.removeItem(STATE_KEYS.LINKEDIN_OAUTH_USER_TYPE);
}
```

### Step 2: Add LinkedIn OAuth Helper in auth.js
**Files:** `app/src/lib/auth.js`
**Purpose:** Add helper function to initiate LinkedIn OAuth and handle callbacks
**Details:**
- Add `initiateLinkedInOAuth(userType)` function that:
  1. Stores userType in secureStorage before redirect
  2. Calls `supabase.auth.signInWithOAuth({ provider: 'linkedin_oidc' })`
  3. Passes redirectTo to `/account-profile`
- Add `handleLinkedInOAuthCallback()` function that:
  1. Checks for fresh session from OAuth
  2. Retrieves stored userType from localStorage
  3. Calls Edge Function to create user record
  4. Clears OAuth storage keys
  5. Returns success/failure with user data

**Validation:** OAuth redirect works, callback detection works

```javascript
import {
  setLinkedInOAuthUserType,
  getLinkedInOAuthUserType,
  clearLinkedInOAuthUserType
} from './secureStorage.js';

/**
 * Initiate LinkedIn OAuth signup flow
 * Stores user type in localStorage before redirecting to LinkedIn
 *
 * @param {string} userType - 'Host' or 'Guest'
 * @returns {Promise<Object>} Result with success status or error
 */
export async function initiateLinkedInOAuth(userType) {
  console.log('[Auth] Initiating LinkedIn OAuth with userType:', userType);

  // Store user type before redirect
  setLinkedInOAuthUserType(userType);

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/account-profile`,
        scopes: 'openid profile email',
      }
    });

    if (error) {
      clearLinkedInOAuthUserType();
      return { success: false, error: error.message };
    }

    // OAuth redirect will happen automatically
    return { success: true, data };
  } catch (err) {
    clearLinkedInOAuthUserType();
    return { success: false, error: err.message };
  }
}

/**
 * Handle LinkedIn OAuth callback after redirect
 * Creates user record if new user, or links accounts if existing
 *
 * @returns {Promise<Object>} Result with user data or error
 */
export async function handleLinkedInOAuthCallback() {
  console.log('[Auth] Handling LinkedIn OAuth callback');

  // Get the session from OAuth callback
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    clearLinkedInOAuthUserType();
    return {
      success: false,
      error: sessionError?.message || 'No session found after OAuth'
    };
  }

  // Check if this is a fresh OAuth session (from LinkedIn)
  const user = session.user;
  const isLinkedInProvider = user?.app_metadata?.provider === 'linkedin_oidc';

  if (!isLinkedInProvider) {
    return { success: false, error: 'Not a LinkedIn OAuth session' };
  }

  // Retrieve stored user type
  const userType = getLinkedInOAuthUserType() || 'Guest';

  // Extract LinkedIn data from user_metadata
  const linkedInData = {
    email: user.email,
    firstName: user.user_metadata?.given_name || user.user_metadata?.first_name || '',
    lastName: user.user_metadata?.family_name || user.user_metadata?.last_name || '',
    supabaseUserId: user.id,
  };

  console.log('[Auth] LinkedIn data:', linkedInData);
  console.log('[Auth] Stored userType:', userType);

  // Call Edge Function to create/link user record
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'oauth_signup',
        payload: {
          ...linkedInData,
          userType,
          provider: 'linkedin_oidc',
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      clearLinkedInOAuthUserType();
      return {
        success: false,
        error: data.error || 'Failed to create user record',
        isDuplicate: data.isDuplicate || false,
        existingEmail: data.existingEmail || null,
      };
    }

    // Clear OAuth storage keys
    clearLinkedInOAuthUserType();

    // Store session data
    setAuthToken(session.access_token);
    setSessionId(data.data.user_id);
    setAuthState(true, data.data.user_id);
    if (userType) {
      setUserType(userType);
    }

    return {
      success: true,
      data: data.data,
      isNewUser: data.data.isNewUser,
    };

  } catch (err) {
    clearLinkedInOAuthUserType();
    return { success: false, error: err.message };
  }
}
```

### Step 3: Create OAuth Signup Handler (Edge Function)
**Files:** `supabase/functions/auth-user/handlers/oauthSignup.ts` (NEW)
**Purpose:** Handle user record creation for OAuth signups
**Details:**
- Accept payload: `{ email, firstName, lastName, userType, provider, supabaseUserId, access_token, refresh_token }`
- Check if email exists in public.user table
- If duplicate: Return `{ isDuplicate: true, existingEmail }` for frontend confirmation
- If new:
  1. Generate bubble ID using `generate_bubble_id()`
  2. Create public.user record with LinkedIn data
  3. Enqueue Bubble sync
  4. Return user data with `isNewUser: true`

**Validation:** User record is created with correct fields

```typescript
/**
 * OAuth Signup Handler - Create user record from OAuth provider data
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Validate OAuth payload
 * 2. Check if email already exists in public.user table
 * 3. If duplicate: Return indicator for frontend to show confirmation modal
 * 4. If new: Generate ID, create user record, queue Bubble sync
 * 5. Return user data
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key
 * @param payload - Request payload from OAuth callback
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { enqueueSignupSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';

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

function mapUserTypeToDisplay(userType: string): string {
  const mapping: Record<string, string> = {
    'Host': 'A Host (I have a space available to rent)',
    'Guest': 'A Guest (I would like to rent a space)',
    'host': 'A Host (I have a space available to rent)',
    'guest': 'A Guest (I would like to rent a space)',
  };
  return mapping[userType] || 'A Guest (I would like to rent a space)';
}

export async function handleOAuthSignup(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: OAuthSignupPayload
): Promise<any> {
  console.log('[oauth-signup] ========== OAUTH SIGNUP REQUEST ==========');

  // Validate required fields
  validateRequiredFields(payload, ['email', 'supabaseUserId']);

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

  const userTypeDisplay = mapUserTypeToDisplay(userType);

  console.log(`[oauth-signup] Provider: ${provider}`);
  console.log(`[oauth-signup] Email: ${email}`);
  console.log(`[oauth-signup] Name: ${firstName} ${lastName}`);
  console.log(`[oauth-signup] UserType: ${userType} -> ${userTypeDisplay}`);

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // ========== CHECK FOR EXISTING USER ==========
    console.log('[oauth-signup] Checking if email already exists...');

    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('user')
      .select('_id, email, "Name - First", "Name - Last"')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userCheckError) {
      console.error('[oauth-signup] Error checking existing user:', userCheckError.message);
      throw new BubbleApiError('Failed to verify email availability', 500);
    }

    if (existingUser) {
      console.log('[oauth-signup] Email already exists in user table:', email);
      // Return duplicate indicator for frontend to show confirmation modal
      return {
        isDuplicate: true,
        existingEmail: email,
        existingUserId: existingUser._id,
        message: 'An account with this email already exists.',
      };
    }

    console.log('[oauth-signup] Email is available');

    // ========== GENERATE BUBBLE-STYLE ID ==========
    console.log('[oauth-signup] Generating ID using generate_bubble_id()...');

    const { data: generatedUserId, error: userIdError } = await supabaseAdmin.rpc('generate_bubble_id');

    if (userIdError) {
      console.error('[oauth-signup] Failed to generate ID:', userIdError);
      throw new BubbleApiError('Failed to generate unique ID', 500);
    }

    const generatedHostId = generatedUserId;
    console.log(`[oauth-signup] Generated User ID: ${generatedUserId}`);

    // ========== CREATE DATABASE RECORD ==========
    const now = new Date().toISOString();
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

    console.log('[oauth-signup] Creating user record...');

    const userRecord = {
      '_id': generatedUserId,
      'bubble_id': null,
      'email': email.toLowerCase(),
      'email as text': email.toLowerCase(),
      'Name - First': firstName || null,
      'Name - Last': lastName || null,
      'Name - Full': fullName,
      'Date of Birth': null, // OAuth signup skips DOB
      'Phone Number (as text)': null, // OAuth signup skips phone
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

    console.log('[oauth-signup] User record to insert:', JSON.stringify(userRecord, null, 2));

    const { error: userInsertError } = await supabaseAdmin
      .from('user')
      .insert(userRecord);

    if (userInsertError) {
      console.error('[oauth-signup] Failed to insert user:', userInsertError.message);
      throw new BubbleApiError(
        `Failed to create user profile: ${userInsertError.message}`,
        500
      );
    }

    console.log('[oauth-signup] User inserted into public.user table');

    // ========== UPDATE SUPABASE AUTH USER METADATA ==========
    console.log('[oauth-signup] Updating Supabase Auth user metadata...');

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      supabaseUserId,
      {
        user_metadata: {
          user_id: generatedUserId,
          host_account_id: generatedHostId,
          first_name: firstName,
          last_name: lastName,
          user_type: userType,
        }
      }
    );

    if (updateError) {
      console.warn('[oauth-signup] Failed to update user metadata (non-blocking):', updateError);
      // Non-blocking - user record already created
    }

    // ========== QUEUE BUBBLE SYNC ==========
    console.log('[oauth-signup] Queueing Bubble sync...');

    try {
      await enqueueSignupSync(supabaseAdmin, generatedUserId, generatedHostId);
      console.log('[oauth-signup] Bubble sync queued');
      triggerQueueProcessing();
    } catch (syncQueueError) {
      console.error('[oauth-signup] Failed to queue Bubble sync (non-blocking):', syncQueueError);
    }

    console.log('[oauth-signup] ========== OAUTH SIGNUP COMPLETE ==========');

    return {
      isNewUser: true,
      user_id: generatedUserId,
      host_account_id: generatedHostId,
      supabase_user_id: supabaseUserId,
      user_type: userType,
      access_token,
      refresh_token,
    };

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error('[oauth-signup] Error:', error);
    throw new BubbleApiError(
      `Failed to complete OAuth signup: ${error.message}`,
      500
    );
  }
}
```

### Step 4: Register OAuth Handler in auth-user Router
**Files:** `supabase/functions/auth-user/index.ts`
**Purpose:** Add `oauth_signup` action to router
**Details:**
- Import `handleOAuthSignup` from `./handlers/oauthSignup.ts`
- Add `'oauth_signup'` to `allowedActions` array
- Add case for `'oauth_signup'` in switch statement

**Validation:** `oauth_signup` action is routable

```typescript
// Add to imports
import { handleOAuthSignup } from './handlers/oauthSignup.ts';

// Add to allowedActions (line ~80)
const allowedActions = ['login', 'signup', 'logout', 'validate', 'request_password_reset', 'update_password', 'generate_magic_link', 'oauth_signup'];

// Add case in switch statement (after generate_magic_link case)
case 'oauth_signup':
  result = await handleOAuthSignup(supabaseUrl, supabaseServiceKey, payload);
  break;
```

### Step 5: Update SignUpLoginModal - LinkedIn OAuth Handler
**Files:** `app/src/islands/shared/SignUpLoginModal.jsx`
**Purpose:** Replace placeholder with actual LinkedIn OAuth handler
**Details:**
- Import `initiateLinkedInOAuth` from `../../lib/auth.js`
- Replace `onClick={() => alert('LinkedIn OAuth signup coming soon!')}` (line 1734) with actual handler
- Handler should:
  1. Store current userType in secureStorage
  2. Call `initiateLinkedInOAuth(signupData.userType)`
  3. Show loading state during redirect

**Validation:** Clicking LinkedIn button initiates OAuth flow

**Location:** Lines 1730-1742 (Identity View - LinkedIn button)

```javascript
// Replace the placeholder LinkedIn button onClick handler
<button
  type="button"
  style={styles.linkedinBtn}
  onClick={async () => {
    setIsLoading(true);
    showToast({
      title: 'Connecting to LinkedIn',
      content: 'Redirecting you to LinkedIn...',
      type: 'info',
      duration: 5000
    });

    const result = await initiateLinkedInOAuth(signupData.userType);

    if (!result.success) {
      setIsLoading(false);
      showToast({
        title: 'LinkedIn Error',
        content: result.error || 'Failed to connect to LinkedIn',
        type: 'error',
        duration: 5000
      });
    }
    // If success, user will be redirected to LinkedIn
  }}
  disabled={isLoading}
>
  {/* ... existing button content ... */}
</button>
```

### Step 6: Add OAuth Callback Detection in SignUpLoginModal
**Files:** `app/src/islands/shared/SignUpLoginModal.jsx`
**Purpose:** Detect OAuth callback and complete user creation
**Details:**
- Add useEffect hook to detect OAuth callback on component mount
- Check for Supabase session with LinkedIn provider
- If detected, call `handleLinkedInOAuthCallback()`
- Handle success: Close modal, redirect to /account-profile
- Handle duplicate: Show confirmation modal
- Handle error: Show toast

**Validation:** OAuth callback is detected and handled

```javascript
// Add to imports
import { handleLinkedInOAuthCallback, checkAuthStatus } from '../../lib/auth.js';
import { getLinkedInOAuthUserType } from '../../lib/secureStorage.js';

// Add useEffect for OAuth callback detection (after existing useEffects, around line 860)
useEffect(() => {
  // Check for LinkedIn OAuth callback
  const checkOAuthCallback = async () => {
    // Only check if we have a stored OAuth user type (indicating OAuth was initiated)
    const storedUserType = getLinkedInOAuthUserType();
    if (!storedUserType) return;

    console.log('[SignUpLoginModal] Detected stored OAuth user type, checking for callback...');

    setIsLoading(true);
    showToast({
      title: 'Completing Sign Up',
      content: 'Creating your account from LinkedIn...',
      type: 'info',
      duration: 10000
    });

    const result = await handleLinkedInOAuthCallback();
    setIsLoading(false);

    if (result.success) {
      showToast({
        title: 'Welcome to Split Lease!',
        content: 'Your account has been created successfully.',
        type: 'success',
        duration: 4000
      });

      if (onAuthSuccess) {
        onAuthSuccess(result.data);
      }

      // Redirect to account profile
      const userId = result.data.user_id;
      setTimeout(() => {
        window.location.href = `/account-profile/${userId}`;
      }, 1500);

    } else if (result.isDuplicate) {
      // Show confirmation modal for duplicate email
      setDuplicateEmailData({
        email: result.existingEmail,
        showModal: true
      });
      showToast({
        title: 'Account Exists',
        content: 'An account with this email already exists. Would you like to link your accounts?',
        type: 'warning',
        duration: 8000
      });
    } else {
      showToast({
        title: 'Sign Up Failed',
        content: result.error || 'Failed to complete sign up with LinkedIn.',
        type: 'error',
        duration: 5000
      });
    }
  };

  // Only run on mount
  checkOAuthCallback();
}, []); // Empty deps - run once on mount
```

### Step 7: Add Duplicate Email Confirmation State and Modal
**Files:** `app/src/islands/shared/SignUpLoginModal.jsx`
**Purpose:** Show confirmation modal when duplicate email detected during OAuth
**Details:**
- Add state: `const [duplicateEmailData, setDuplicateEmailData] = useState({ email: '', showModal: false })`
- Add confirmation modal JSX in render
- On confirm: Call API to link accounts (future enhancement - for now, redirect to login)
- On cancel: Clear state, show login option

**Validation:** Duplicate email shows confirmation modal

```javascript
// Add state (around line 827, after other useState declarations)
const [duplicateEmailData, setDuplicateEmailData] = useState({
  email: '',
  showModal: false
});

// Add modal JSX (inside the modal render, after main content)
{duplicateEmailData.showModal && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001
  }}>
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '400px',
      width: '90%',
      textAlign: 'center'
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 600 }}>
        Account Already Exists
      </h3>
      <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: '14px' }}>
        An account with <strong>{duplicateEmailData.email}</strong> already exists.
        Would you like to log in instead?
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => {
            setDuplicateEmailData({ email: '', showModal: false });
            goToLogin();
          }}
          style={styles.buttonPrimary}
        >
          Go to Login
        </button>
        <button
          onClick={() => setDuplicateEmailData({ email: '', showModal: false })}
          style={styles.buttonSecondary}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
```

### Step 8: Update Login View LinkedIn Button
**Files:** `app/src/islands/shared/SignUpLoginModal.jsx`
**Purpose:** Add OAuth handler to login view LinkedIn button (for future login implementation)
**Details:**
- The login view also has a LinkedIn button (lines 1596-1607)
- For now, keep it as placeholder for login (different from signup)
- Add comment noting this is for future login implementation

**Validation:** Login LinkedIn button remains placeholder with clear comment

**Note:** This step is deferred as per requirements - focus on signup only.

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| OAuth cancelled by user | Clear stored userType from localStorage, show informative toast |
| LinkedIn returns no email | Return error - email is required for account creation |
| Duplicate email detected | Show confirmation modal, offer to redirect to login |
| User type not stored (localStorage cleared) | Default to 'Guest' with warning log |
| Network error during user creation | Show retry toast, allow manual retry |
| Supabase Auth session expired | Redirect to login with error message |
| Bubble sync fails | Non-blocking - user creation succeeds, sync will be retried by cron |

## Testing Considerations

### Manual Testing Checklist
1. **Happy Path - New User Guest**
   - Select "Guest" in user type view
   - Click "Continue with LinkedIn"
   - Authorize on LinkedIn
   - Verify redirected to /account-profile
   - Verify user record created with Guest type
   - Verify name fields populated from LinkedIn

2. **Happy Path - New User Host**
   - Select "Host" in user type view
   - Click "Continue with LinkedIn"
   - Authorize on LinkedIn
   - Verify redirected to /account-profile
   - Verify user record created with Host type

3. **Duplicate Email**
   - Try OAuth signup with email that exists in database
   - Verify confirmation modal appears
   - Verify "Go to Login" redirects correctly

4. **OAuth Cancellation**
   - Start OAuth flow
   - Cancel on LinkedIn authorization page
   - Verify returned to modal without errors
   - Verify localStorage cleared

5. **Network Error**
   - Simulate network failure during user creation
   - Verify error toast shown
   - Verify can retry

### Database Verification
- Check public.user table for new records
- Verify `Type - User Current` matches selected type
- Verify `Name - First`, `Name - Last`, `Name - Full` populated
- Verify `email` is lowercase
- Verify sync_queue has pending entry

## Rollback Strategy

1. **Frontend Rollback**: Revert changes to SignUpLoginModal.jsx and auth.js
2. **Backend Rollback**: Remove oauthSignup.ts handler and router registration
3. **Storage Rollback**: Clear `sl_linkedin_oauth_user_type` from localStorage for affected users

## Dependencies & Blockers

### Prerequisites
- [ ] LinkedIn OIDC must be configured in Supabase Auth dashboard
- [ ] LinkedIn App must have correct redirect URLs configured
- [ ] Supabase project URL must match LinkedIn redirect URI

### Supabase LinkedIn OIDC Configuration
1. Go to Supabase Dashboard > Authentication > Providers
2. Enable LinkedIn OIDC
3. Add Client ID and Client Secret from LinkedIn Developer Portal
4. Ensure redirect URL is set correctly (typically `https://<project>.supabase.co/auth/v1/callback`)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LinkedIn API rate limits | Low | Medium | Implement retry logic with exponential backoff |
| User type lost during redirect | Medium | High | Multiple storage mechanisms (localStorage + URL param fallback) |
| Duplicate email edge cases | Medium | Medium | Comprehensive duplicate check before user creation |
| OAuth session timeout | Low | Medium | Clear guidance for users, timeout handling |

## Files Referenced Summary

### Frontend Files
- `app/src/islands/shared/SignUpLoginModal.jsx` (lines 1730-1742, 827, 860)
- `app/src/lib/auth.js` (new functions)
- `app/src/lib/secureStorage.js` (new keys and functions)
- `app/src/lib/supabase.js` (no changes - reference only)
- `app/src/lib/constants.js` (reference only)

### Backend Files
- `supabase/functions/auth-user/index.ts` (line 80 and switch statement)
- `supabase/functions/auth-user/handlers/signup.ts` (reference pattern)
- `supabase/functions/auth-user/handlers/oauthSignup.ts` (NEW FILE)
- `supabase/functions/_shared/queueSync.ts` (reference - enqueueSignupSync)
- `supabase/functions/_shared/errors.ts` (reference - BubbleApiError)
- `supabase/functions/_shared/validation.ts` (reference - validateRequiredFields)

---

**Implementation Order:**
1. Step 1 (secureStorage.js) - Foundational storage
2. Step 3 (oauthSignup.ts) - Backend handler
3. Step 4 (index.ts) - Router registration
4. Step 2 (auth.js) - Frontend OAuth helpers
5. Step 5 (SignUpLoginModal) - LinkedIn button handler
6. Step 6 (SignUpLoginModal) - OAuth callback detection
7. Step 7 (SignUpLoginModal) - Duplicate email modal

**Reminder:** After Edge Function changes, manual deployment is required via `supabase functions deploy auth-user`.
