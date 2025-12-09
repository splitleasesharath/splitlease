# Password Reset Return URL Implementation Plan

**Created**: 2025-12-09 18:30:00
**Status**: READY FOR IMPLEMENTATION
**Complexity**: LOW-MEDIUM (4 files, minimal changes each)
**Estimated Changes**: ~30 lines of code

---

## Problem Statement

After completing a password reset, users are shown a success message with a link to "/signup-login". This is not optimal because:

1. Users lose their context (the page they were on when they initiated the reset)
2. If they were trying to access a protected page, they have to navigate back manually
3. The UX is jarring - users expect to return to where they started

### MCP Investigation Findings

- Edge Function `auth-user` is operational (version 11)
- Password reset emails are being sent successfully
- Some 403 "token expired" errors likely due to email prefetching
- Mixed redirect URLs observed: `split.lease` and `www.split.lease`
- Default Edge Function redirect is `https://app.split.lease/reset-password` (should be `split.lease`)

---

## Solution Architecture

### Approach: URL-Based State Passing (Option A)

Pass the `returnTo` URL through the password reset email link:

```
Request Flow:
SignUpLoginModal → Edge Function → Supabase Email → User's Inbox

Email Link Format:
https://split.lease/reset-password?returnTo=/search#access_token=...&type=recovery
                                   ^^^^^^^^^^^^^^^^
                                   Query param preserved

After Reset:
ResetPasswordPage reads returnTo → redirects user → /search (or / if not set)
```

**Why this approach:**
- Works across devices/browsers (unlike localStorage)
- Clean URL-based state management
- No backend changes required (Edge Function just passes `redirectTo` through)
- Query params are preserved before hash fragment

---

## Implementation Steps

### Step 1: Update SignUpLoginModal.jsx

**File**: `app/src/islands/shared/SignUpLoginModal.jsx`
**Location**: `handlePasswordReset` function (lines 657-696)

**Changes**:
```javascript
// Line ~670-676 - Update the redirectTo URL to include returnTo param
const currentPath = window.location.pathname + window.location.search;
const returnToParam = encodeURIComponent(currentPath);

const { data, error: fnError } = await supabase.functions.invoke('auth-user', {
  body: {
    action: 'request_password_reset',
    payload: {
      email: resetEmail,
      redirectTo: `${window.location.origin}/reset-password?returnTo=${returnToParam}`
    }
  }
});
```

**Rationale**: Capture the current page URL and encode it as a query parameter in the redirect URL.

---

### Step 2: Fix Edge Function Default URL

**File**: `supabase/functions/auth-user/handlers/resetPassword.ts`
**Location**: Line 61

**Current**:
```typescript
const resetRedirectUrl = redirectTo || 'https://app.split.lease/reset-password';
```

**Updated**:
```typescript
const resetRedirectUrl = redirectTo || 'https://split.lease/reset-password';
```

**Rationale**: The default should match the production domain. This fixes cases where the frontend doesn't provide a redirectTo (edge case, but important for safety).

---

### Step 3: Update ResetPasswordPage.jsx to Read returnTo

**File**: `app/src/islands/pages/ResetPasswordPage.jsx`
**Location**: Add URL parsing and redirect logic

**Changes**:

1. **Parse returnTo from URL** (add to useEffect around line 27):
```javascript
// Extract returnTo from URL query params
const getReturnToUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('returnTo');
  // Validate it's a relative path (security: prevent open redirects)
  if (returnTo && returnTo.startsWith('/')) {
    return returnTo;
  }
  return '/'; // Default to home
};
```

2. **Auto-redirect after success** (update the success state handling around line 109-118):
```javascript
if (result.success) {
  setStatus('success');
  // Auto-redirect after short delay
  const returnTo = getReturnToUrl();
  setTimeout(() => {
    window.location.href = returnTo;
  }, 2000); // 2 second delay to show success message
}
```

3. **Update success UI to show redirect destination** (update success state JSX around line 184-192):
```javascript
{status === 'success' && (
  <div className="success-state">
    <div className="success-icon">&#10003;</div>
    <p className="success-message">Your password has been updated successfully!</p>
    <p className="redirect-notice">Redirecting you back...</p>
    <a href={getReturnToUrl()} className="btn-primary">
      Continue Now
    </a>
  </div>
)}
```

---

### Step 4: Add CSS for redirect notice (Optional Enhancement)

**File**: `app/src/styles/reset-password.css`
**Location**: Add after `.success-message` styles

```css
.redirect-notice {
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 1rem;
}
```

---

## Complexity Assessment

| Component | Changes | Risk |
|-----------|---------|------|
| SignUpLoginModal.jsx | 3 lines | LOW - Just URL construction |
| resetPassword.ts | 1 line | LOW - Default URL fix |
| ResetPasswordPage.jsx | ~15 lines | LOW - URL parsing + redirect |
| reset-password.css | 5 lines | MINIMAL - Optional styling |

**Total**: ~25-30 lines of code changes

**Verdict**: This is a LOW complexity change. The approach is straightforward, doesn't introduce new dependencies, and the risk of regression is minimal.

---

## Edge Cases Handled

1. **No returnTo param**: Defaults to `/` (home page)
2. **Invalid returnTo (not starting with `/`)**: Rejected, defaults to `/` (security: prevents open redirect attacks)
3. **URL with special characters**: Properly encoded/decoded via `encodeURIComponent`/`URLSearchParams`
4. **User opens email on different device**: Works! The returnTo is in the URL, not localStorage
5. **Reset link from home page**: returnTo would be `/`, user returns to home (no change from current behavior)

---

## Security Considerations

1. **Open Redirect Prevention**: Only accept `returnTo` values starting with `/` (relative paths only)
2. **XSS Prevention**: Using `URLSearchParams` for parsing (browser-native, secure)
3. **No sensitive data in URL**: Only the path is stored, no tokens or user data

---

## Testing Checklist

- [ ] Request password reset from home page → returns to home
- [ ] Request password reset from /search → returns to /search
- [ ] Request password reset from /search?borough=manhattan → returns to /search?borough=manhattan
- [ ] Request password reset from /view-split-lease/123 → returns to /view-split-lease/123
- [ ] Manually modify returnTo to external URL → should redirect to home (security test)
- [ ] Password reset with expired token → shows error, doesn't redirect
- [ ] Password reset on different device → still works (returnTo in URL)

---

## Files Reference

| File | Purpose | Changes Required |
|------|---------|------------------|
| `app/src/islands/shared/SignUpLoginModal.jsx:670-676` | Capture current page and pass to Edge Function | YES |
| `supabase/functions/auth-user/handlers/resetPassword.ts:61` | Fix default redirect URL | YES |
| `app/src/islands/pages/ResetPasswordPage.jsx` | Parse returnTo and redirect after success | YES |
| `app/src/styles/reset-password.css` | Optional styling for redirect notice | OPTIONAL |
| `app/src/lib/auth.js:1015` | Already passes `window.location.origin` - no change needed | NO |

---

## Manual Changes Required (Supabase Dashboard)

After implementing the code changes, verify/update these settings in Supabase Dashboard:

### 1. URL Configuration (Authentication > URL Configuration)

**Site URL**:
```
https://split.lease
```

**Redirect URLs** (add both if not present):
```
https://split.lease/reset-password
https://www.split.lease/reset-password
https://split.lease/reset-password?returnTo=*
```

Note: The wildcard `?returnTo=*` pattern may not be supported. In that case, Supabase should accept any query params on a whitelisted base URL.

### 2. Email Templates (Authentication > Email Templates)

Verify the "Reset Password" template uses the correct variables:
- `{{ .SiteURL }}` - should resolve to `https://split.lease`
- `{{ .RedirectTo }}` - should include the full redirect URL with returnTo param
- `{{ .TokenHash }}` and `{{ .Token }}` - for the reset token

If using custom template, ensure it looks like:
```html
<a href="{{ .RedirectTo }}">Reset Password</a>
```

### 3. Rate Limiting (if experiencing issues)

If users report rate limiting errors ("429: For security purposes..."):
- This is expected behavior for repeated requests
- Consider adding a cooldown message in the UI after first request

---

## Rollback Plan

If issues arise, revert to current behavior by:
1. Removing the `returnTo` param from SignUpLoginModal
2. Removing the auto-redirect from ResetPasswordPage
3. Keep the success UI as-is with manual link to login

The Edge Function change (fixing default URL) should remain as it's a bug fix.

---

## Alternative Considered: localStorage Approach

**Why NOT chosen**:
- Doesn't work if user opens reset link on different device/browser
- Pollutes localStorage with temporary state
- More complex cleanup logic needed

**When to reconsider**:
- If Supabase starts stripping query params from redirect URLs
- If URL length becomes an issue (very long returnTo paths)

---

**Document Version**: 1.0
**Author**: Claude Code
**Approved By**: Pending User Review
