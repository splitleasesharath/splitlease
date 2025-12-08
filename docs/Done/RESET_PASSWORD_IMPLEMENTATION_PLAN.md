# Reset Password Implementation Plan

**Created**: 2025-12-07
**Status**: Pending Implementation
**Feature**: Password Reset for Supabase Auth

---

## Overview

Implement a complete password reset flow for the existing Supabase Auth system. Users will be able to:
1. Request a password reset email from the login page
2. Receive an email with a secure reset link
3. Click the link and set a new password

---

## Current auth-user Edge Function Context

### Existing Structure

```
supabase/functions/auth-user/
├── index.ts                    # Main router (POST handler)
└── handlers/
    ├── login.ts               # Supabase Auth native (signInWithPassword)
    ├── signup.ts              # Supabase Auth native (admin.createUser + DB records)
    ├── logout.ts              # Bubble API (wf/logout-user)
    └── validate.ts            # Hybrid (Supabase DB lookup by bubble_id)
```

### Handler Function Signatures (from actual code)

| Handler | Signature | Notes |
|---------|-----------|-------|
| `handleLogin` | `(supabaseUrl, supabaseServiceKey, payload)` | Supabase only |
| `handleSignup` | `(supabaseUrl, supabaseServiceKey, payload)` | Supabase only |
| `handleLogout` | `(bubbleAuthBaseUrl, bubbleApiKey, payload)` | Bubble only |
| `handleValidate` | `(bubbleAuthBaseUrl, bubbleApiKey, supabaseUrl, supabaseServiceKey, payload)` | Hybrid |

### Key Patterns from Existing Handlers

**1. Supabase Client Initialization** (from `login.ts:38-43`):
```typescript
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
```

**2. Import Statement** (from `login.ts:20`):
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
```

**3. Error Handling** (from `login.ts:21-22`):
```typescript
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
```

**4. Logging Pattern** (from `login.ts:29`, `login.ts:74`, etc.):
```typescript
console.log('[handler_name] ========== REQUEST_TYPE ==========');
console.log('[handler_name] Step description...');
console.log('[handler_name] ✅ Success message');
console.error('[handler_name] ❌ Error message');
```

**5. Error Throwing** (from `login.ts:59`):
```typescript
throw new BubbleApiError('User-friendly error message.', 401);
```

**6. Return Format** (handlers return object directly, router wraps in `{ success: true, data: result }`):
```typescript
return {
  field1: value1,
  field2: value2
};
```

### index.ts Router Pattern (from actual code)

```typescript
// Line 64: Allowed actions array
const allowedActions = ['login', 'signup', 'logout', 'validate'];

// Lines 70-83: Secret retrieval
const bubbleAuthBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Lines 76-83: Conditional config validation
// Supabase config required for all actions
// Bubble config required only for logout/validate

// Lines 90-107: Switch statement routing
switch (action) {
  case 'login':
    result = await handleLogin(supabaseUrl, supabaseServiceKey, payload);
    break;
  case 'signup':
    result = await handleSignup(supabaseUrl, supabaseServiceKey, payload);
    break;
  // ... etc
}
```

---

## Architecture Decision

**Approach**: Implicit Flow (Client-side) with Edge Function proxying

Password reset will follow the same pattern as `login` and `signup`:
- **Supabase Auth native** - no Bubble dependency
- **Handler signature**: `(supabaseUrl, supabaseServiceKey, payload)`

We'll implement:
- Two new Edge Function actions: `request_password_reset` and `update_password`
- Frontend functions in `auth.js`
- A dedicated Reset Password page (`/reset-password`)
- UI integration in existing login modal/page

---

## Implementation Steps

### Phase 1: Edge Function Backend

#### 1.1 Create Password Reset Request Handler

**File**: `supabase/functions/auth-user/handlers/resetPassword.ts`

```typescript
/**
 * Reset Password Request Handler - Send password reset email
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Validate email in payload
 * 2. Call Supabase Auth resetPasswordForEmail
 * 3. Return success (always - don't reveal if email exists)
 *
 * SECURITY: Always returns success to prevent email enumeration
 * Uses Supabase Auth natively - no Bubble dependency
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key for admin operations
 * @param payload - Request payload {email, redirectTo?}
 * @returns {message: string}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields, validateEmail } from '../../_shared/validation.ts';

export async function handleRequestPasswordReset(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  console.log('[reset-password] ========== PASSWORD RESET REQUEST ==========');

  // Validate required fields
  validateRequiredFields(payload, ['email']);
  const { email, redirectTo } = payload;

  // Validate email format
  validateEmail(email);

  console.log(`[reset-password] Requesting reset for: ${email}`);

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Default redirect URL for Split Lease
    const resetRedirectUrl = redirectTo || 'https://app.split.lease/reset-password';

    console.log(`[reset-password] Redirect URL: ${resetRedirectUrl}`);

    // Call Supabase Auth to send reset email
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo: resetRedirectUrl
    });

    if (error) {
      // Log the error but don't expose it to prevent email enumeration
      console.error(`[reset-password] Supabase error (not exposed):`, error.message);
      // Still return success - security best practice
    }

    console.log(`[reset-password] ✅ Password reset processed`);
    console.log(`[reset-password] ========== REQUEST COMPLETE ==========`);

    // Always return success to prevent email enumeration
    return {
      message: 'If an account with that email exists, a password reset link has been sent.'
    };

  } catch (error) {
    console.error(`[reset-password] ========== RESET ERROR ==========`);
    console.error(`[reset-password] Error:`, error);

    // Still return success to prevent email enumeration
    return {
      message: 'If an account with that email exists, a password reset link has been sent.'
    };
  }
}
```

#### 1.2 Create Password Update Handler

**File**: `supabase/functions/auth-user/handlers/updatePassword.ts`

```typescript
/**
 * Update Password Handler - Set new password after reset link clicked
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Validate password in payload
 * 2. Validate access_token (user must have valid session from reset link)
 * 3. Create Supabase client with user's access token
 * 4. Call updateUser to set new password
 * 5. Return success
 *
 * NO FALLBACK - If password update fails, entire operation fails
 * Uses Supabase Auth natively - no Bubble dependency
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key (used to verify token)
 * @param payload - Request payload {password, access_token}
 * @returns {message: string}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

export async function handleUpdatePassword(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  console.log('[update-password] ========== PASSWORD UPDATE REQUEST ==========');

  // Validate required fields
  validateRequiredFields(payload, ['password', 'access_token']);
  const { password, access_token } = payload;

  console.log(`[update-password] Validating session and updating password...`);

  // Password validation (matching signup.ts:70-71 - minimum 4 characters)
  if (password.length < 4) {
    throw new BubbleApiError('Password must be at least 4 characters long.', 400);
  }

  try {
    // Create Supabase client with user's access token
    // This ensures only the authenticated user can update their password
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    });

    // Verify the session is valid
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(access_token);

    if (userError || !user) {
      console.error(`[update-password] Invalid or expired session:`, userError?.message);
      throw new BubbleApiError('Invalid or expired reset link. Please request a new password reset.', 401);
    }

    console.log(`[update-password] Session valid for user: ${user.id}`);

    // Update the password using admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: password
    });

    if (updateError) {
      console.error(`[update-password] Password update failed:`, updateError.message);
      throw new BubbleApiError('Failed to update password. Please try again.', 500);
    }

    console.log(`[update-password] ✅ Password updated successfully`);
    console.log(`[update-password] ========== UPDATE COMPLETE ==========`);

    return {
      message: 'Password updated successfully. You can now sign in with your new password.'
    };

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error(`[update-password] ========== UPDATE ERROR ==========`);
    console.error(`[update-password] Error:`, error);

    throw new BubbleApiError(
      `Failed to update password: ${error.message}`,
      500,
      error
    );
  }
}
```

#### 1.3 Update Edge Function Router

**File**: `supabase/functions/auth-user/index.ts`

**Changes to make:**

1. Add imports at top (after line 29):
```typescript
import { handleRequestPasswordReset } from './handlers/resetPassword.ts';
import { handleUpdatePassword } from './handlers/updatePassword.ts';
```

2. Update allowedActions array (line 64):
```typescript
const allowedActions = ['login', 'signup', 'logout', 'validate', 'request_password_reset', 'update_password'];
```

3. Add cases to switch statement (after line 107, before `default`):
```typescript
case 'request_password_reset':
  // Password reset request uses Supabase Auth natively (no Bubble dependency)
  result = await handleRequestPasswordReset(supabaseUrl, supabaseServiceKey, payload);
  break;

case 'update_password':
  // Password update uses Supabase Auth natively (no Bubble dependency)
  result = await handleUpdatePassword(supabaseUrl, supabaseServiceKey, payload);
  break;
```

---

### Phase 2: Frontend Auth Functions

#### 2.1 Add Password Reset Functions to auth.js

**File**: `app/src/lib/auth.js`

Add after `logoutUser` function (around line 920):

```javascript
// ============================================================================
// Password Reset Functions
// ============================================================================

/**
 * Request password reset email via Edge Function (auth-user)
 * Always returns success to prevent email enumeration
 *
 * ✅ Uses Edge Functions - API keys stored server-side
 *
 * @param {string} email - User's email address
 * @returns {Promise<Object>} Response object with success status and message
 */
export async function requestPasswordReset(email) {
  console.log('🔐 Requesting password reset for:', email);

  if (!email) {
    return {
      success: false,
      error: 'Email is required.'
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('auth-user', {
      body: {
        action: 'request_password_reset',
        payload: {
          email,
          redirectTo: `${window.location.origin}/reset-password`
        }
      }
    });

    if (error) {
      console.error('❌ Password reset request failed:', error);
      // Don't expose error details - always show generic message
      return {
        success: true, // Return success even on error to prevent email enumeration
        message: 'If an account with that email exists, a password reset link has been sent.'
      };
    }

    console.log('✅ Password reset request processed');
    return {
      success: true,
      message: data?.message || 'If an account with that email exists, a password reset link has been sent.'
    };

  } catch (error) {
    console.error('❌ Password reset error:', error);
    return {
      success: true, // Return success even on error to prevent email enumeration
      message: 'If an account with that email exists, a password reset link has been sent.'
    };
  }
}

/**
 * Update password after clicking reset link
 * Must be called when user has active session from PASSWORD_RECOVERY event
 *
 * ✅ Uses Edge Functions - API keys stored server-side
 *
 * @param {string} newPassword - New password to set
 * @returns {Promise<Object>} Response object with success status
 */
export async function updatePassword(newPassword) {
  console.log('🔐 Updating password...');

  if (!newPassword) {
    return {
      success: false,
      error: 'New password is required.'
    };
  }

  if (newPassword.length < 4) {
    return {
      success: false,
      error: 'Password must be at least 4 characters long.'
    };
  }

  // Get current session (from PASSWORD_RECOVERY event)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    console.error('❌ No active session for password update');
    return {
      success: false,
      error: 'Invalid or expired reset link. Please request a new password reset.'
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('auth-user', {
      body: {
        action: 'update_password',
        payload: {
          password: newPassword,
          access_token: session.access_token
        }
      }
    });

    if (error) {
      console.error('❌ Password update failed:', error);

      // Extract detailed error from response body if available
      let errorMessage = 'Failed to update password. Please try again.';

      if (error.context?.body) {
        try {
          const errorBody = typeof error.context.body === 'string'
            ? JSON.parse(error.context.body)
            : error.context.body;
          if (errorBody?.error) {
            errorMessage = errorBody.error;
          }
        } catch (parseErr) {
          // Silent - use default message
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }

    if (!data.success && data.error) {
      return {
        success: false,
        error: data.error
      };
    }

    console.log('✅ Password updated successfully');

    // Clear existing auth data - user should log in with new password
    clearAuthData();

    return {
      success: true,
      message: data?.message || 'Password updated successfully.'
    };

  } catch (error) {
    console.error('❌ Password update error:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.'
    };
  }
}
```

---

### Phase 3: Frontend UI Components

#### 3.1 Create Reset Password Page

**File**: `app/reset-password.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password - Split Lease</title>
  <link rel="stylesheet" href="src/styles/main.css">
  <link rel="icon" type="image/png" href="/favicon.png">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="src/reset-password.jsx"></script>
</body>
</html>
```

**File**: `app/src/reset-password.jsx`

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import ResetPasswordPage from './islands/pages/ResetPasswordPage';
import './styles/main.css';

const root = createRoot(document.getElementById('root'));
root.render(<ResetPasswordPage />);
```

#### 3.2 Create ResetPasswordPage Component

**File**: `app/src/islands/pages/ResetPasswordPage.jsx`

```jsx
/**
 * Reset Password Page
 * Handles the password reset flow after user clicks reset link in email
 *
 * Flow:
 * 1. User clicks reset link in email
 * 2. Supabase redirects to this page with tokens in URL hash
 * 3. Supabase client detects PASSWORD_RECOVERY event
 * 4. User enters new password
 * 5. Password is updated via Edge Function
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { updatePassword } from '../../lib/auth.js';
import Header from '../shared/Header';
import Footer from '../shared/Footer';
import './ResetPasswordPage.css';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('loading'); // loading, ready, success, error
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log('🔐 ResetPasswordPage: Initializing...');

    // Listen for PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth event:', event);

      if (event === 'PASSWORD_RECOVERY') {
        console.log('✅ PASSWORD_RECOVERY event received');
        setStatus('ready');
      } else if (event === 'SIGNED_IN' && status === 'loading') {
        // User might already have session from reset link
        console.log('✅ SIGNED_IN event - user has session');
        setStatus('ready');
      }
    });

    // Check if we already have a session (in case event already fired)
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 Checking existing session:', session ? 'found' : 'none');

      if (session) {
        setStatus('ready');
      } else {
        // Give time for the auth state change to fire from URL hash
        const timeoutId = setTimeout(() => {
          setStatus((currentStatus) => {
            if (currentStatus === 'loading') {
              console.log('❌ No session detected after timeout');
              setError('Invalid or expired reset link. Please request a new password reset.');
              return 'error';
            }
            return currentStatus;
          });
        }, 3000);

        return () => clearTimeout(timeoutId);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    const result = await updatePassword(newPassword);

    if (result.success) {
      setStatus('success');
    } else {
      setError(result.error || 'Failed to update password. Please try again.');
    }

    setIsSubmitting(false);
  };

  return (
    <>
      <Header />
      <main className="reset-password-page">
        <div className="reset-password-container">
          <h1>Reset Your Password</h1>

          {status === 'loading' && (
            <div className="loading-state">
              <p>Verifying reset link...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="error-state">
              <p className="error-message">{error}</p>
              <a href="https://app.split.lease/signup-login" className="btn-primary">
                Back to Login
              </a>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="reset-password-form">
              {error && <p className="error-message">{error}</p>}

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={4}
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="btn-primary btn-full-width"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          {status === 'success' && (
            <div className="success-state">
              <div className="success-icon">✓</div>
              <p className="success-message">Your password has been updated successfully!</p>
              <a href="https://app.split.lease/signup-login" className="btn-primary">
                Sign In
              </a>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
```

#### 3.3 Create ResetPasswordPage Styles

**File**: `app/src/islands/pages/ResetPasswordPage.css`

```css
.reset-password-page {
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background-color: var(--color-bg-light, #f3f4f6);
}

.reset-password-container {
  background: white;
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.reset-password-container h1 {
  color: var(--color-primary, #31135d);
  margin-bottom: 1.5rem;
  font-size: 1.75rem;
}

.reset-password-form {
  text-align: left;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--color-text-dark, #1a1a1a);
}

.form-group input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary, #31135d);
  box-shadow: 0 0 0 3px rgba(49, 19, 93, 0.1);
}

.btn-primary {
  background-color: var(--color-primary, #31135d);
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  text-decoration: none;
  display: inline-block;
}

.btn-primary:hover {
  background-color: var(--color-primary-hover, #1f0b38);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-full-width {
  width: 100%;
}

.error-message {
  color: var(--color-error, #EF4444);
  background-color: #FEF2F2;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.success-state {
  padding: 1rem 0;
}

.success-icon {
  width: 60px;
  height: 60px;
  background-color: var(--color-success, #00C851);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin: 0 auto 1rem;
}

.success-message {
  color: var(--color-success, #00C851);
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
}

.loading-state {
  padding: 2rem 0;
  color: var(--color-text-light, #6b7280);
}

.error-state {
  padding: 1rem 0;
}

.error-state .error-message {
  margin-bottom: 1.5rem;
}
```

---

### Phase 4: Configuration

#### 4.1 Supabase Dashboard Configuration

1. **Add Redirect URLs**:
   - Go to: Supabase Dashboard > Authentication > URL Configuration
   - Add to "Redirect URLs":
     - `https://app.split.lease/reset-password`
     - `http://localhost:5173/reset-password` (for local dev)

2. **Optional: Customize Email Template**:
   - Go to: Supabase Dashboard > Authentication > Email Templates
   - Edit "Reset Password" template:

```html
<h2>Reset Your Split Lease Password</h2>
<p>Hi there,</p>
<p>We received a request to reset your password. Click the button below to choose a new one:</p>
<p>
  <a href="{{ .ConfirmationURL }}"
     style="background-color: #31135d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
    Reset Password
  </a>
</p>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>This link will expire in 24 hours.</p>
<p>- The Split Lease Team</p>
```

#### 4.2 Vite Configuration

**File**: `app/vite.config.js`

Add to `build.rollupOptions.input`:
```javascript
'reset-password': resolve(__dirname, 'reset-password.html'),
```

#### 4.3 Cloudflare Pages Redirects

**File**: `app/public/_redirects`

Add:
```
/reset-password    /reset-password.html    200
```

---

## File Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/auth-user/handlers/resetPassword.ts` | Request password reset email |
| `supabase/functions/auth-user/handlers/updatePassword.ts` | Update password after reset |
| `app/reset-password.html` | Reset password page HTML |
| `app/src/reset-password.jsx` | Reset password page entry point |
| `app/src/islands/pages/ResetPasswordPage.jsx` | Reset password React component |
| `app/src/islands/pages/ResetPasswordPage.css` | Page styles |

### Files to Modify

| File | Line Numbers | Changes |
|------|--------------|---------|
| `supabase/functions/auth-user/index.ts` | 26-29, 64, 107+ | Add imports, update allowedActions, add switch cases |
| `app/src/lib/auth.js` | ~920+ | Add `requestPasswordReset` and `updatePassword` functions |
| `app/vite.config.js` | rollupOptions.input | Add reset-password entry |
| `app/public/_redirects` | End of file | Add clean URL redirect |
| Login UI component | TBD | Add "Forgot Password?" link |

---

## Security Considerations

1. **Email enumeration prevention**: `requestPasswordReset` always returns success
2. **Rate limiting**: Supabase has built-in protection against brute force
3. **Token expiry**: Reset tokens expire in 24 hours (Supabase default)
4. **Password requirements**: Minimum 4 characters (matching existing signup)
5. **Session validation**: Password update requires valid session from reset link
6. **Server-side secrets**: All API keys remain in Supabase Secrets

---

## Testing Checklist

- [ ] Request reset for existing email - should receive email
- [ ] Request reset for non-existing email - should show success (no email sent)
- [ ] Click reset link - should load ResetPasswordPage with form
- [ ] Expired/invalid link - should show error state
- [ ] Password mismatch - should show validation error
- [ ] Password too short (<4 chars) - should show validation error
- [ ] Successful reset - should show success and clear auth data
- [ ] Login with new password - should work
- [ ] Login with old password - should fail

---

## Deployment Checklist

1. [ ] Deploy Edge Function handlers to Supabase
2. [ ] Configure redirect URLs in Supabase Dashboard
3. [ ] Deploy frontend to Cloudflare Pages
4. [ ] Test end-to-end flow in staging
5. [ ] Update email template (optional)

---

## Important Files Reference

| File | Path | Purpose |
|------|------|---------|
| Edge Function Router | `supabase/functions/auth-user/index.ts:1-145` | Routes auth actions |
| Login Handler | `supabase/functions/auth-user/handlers/login.ts` | Pattern reference (Supabase native) |
| Signup Handler | `supabase/functions/auth-user/handlers/signup.ts` | Pattern reference (Supabase native) |
| Frontend Auth | `app/src/lib/auth.js` | Auth utility functions |
| Shared Errors | `supabase/functions/_shared/errors.ts` | BubbleApiError, ValidationError |
| Shared Validation | `supabase/functions/_shared/validation.ts` | validateRequiredFields, validateEmail |

---

**Document Version**: 2.0
**Author**: Claude Code
**Review Status**: Updated with actual codebase context
