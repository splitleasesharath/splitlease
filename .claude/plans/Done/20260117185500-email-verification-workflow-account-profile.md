# Implementation Plan: Email Verification Workflow for Account Profile Page

## Overview

This plan implements an email verification workflow for the account profile page. When a user clicks the "Verify" button for email, the system sends a SendGrid-templated email containing a magic login link. Upon returning via the magic link, the user's `email_verified` field in the database is set to `true`.

## Success Criteria

- [ ] Clicking "Verify" button on email row triggers verification email
- [ ] Email uses existing Security 2 template (magic login link style)
- [ ] Magic link returns user to `/account-profile/{userId}?verified=email`
- [ ] URL parameter detection triggers database update on page load
- [ ] `is email confirmed` field in `user` table set to `true`
- [ ] UI reflects verified status after completion
- [ ] Toast notification confirms successful verification
- [ ] Error handling for failed operations

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` | Page logic hook | Implement `handleVerifyEmail`, add URL param detection, add database update logic |
| `app/src/islands/pages/AccountProfilePage/components/cards/TrustVerificationCard.jsx` | Trust verification UI | No changes (already wired) |
| `supabase/functions/auth-user/handlers/generateMagicLink.ts` | Generate magic link | No changes (reuse existing) |
| `supabase/functions/send-email/handlers/send.ts` | Send templated email | No changes (reuse existing) |
| `supabase/functions/send-email/index.ts` | Email router | Already allows public template `1757433099447x202755280527849400` |

### Related Documentation

- [AUTH_USER.md](../../Documentation/Backend(EDGE%20-%20Functions)/AUTH_USER.md) - Documents `generate_magic_link` action
- [DATABASE_TABLES_DETAILED.md](../../Documentation/Database/DATABASE_TABLES_DETAILED.md) - Documents `user` table with `is email confirmed` column

### Existing Patterns to Follow

1. **Magic Link Pattern**: Already implemented in `SignUpLoginModal.jsx` (lines 1364-1552)
   - Call `auth-user` with `action: 'generate_magic_link'`
   - Then call `send-email` with `action: 'send'` and template `1757433099447x202755280527849400`
   - BCC emails fetched from `os_slack_channels` table

2. **Verifications Object Pattern**: Used in `useAccountProfilePageLogic.js` (lines 282-291)
   ```javascript
   const verifications = useMemo(() => ({
     email: profileData['is email confirmed'] === true,
     phone: profileData['Verify - Phone'] === true,
     govId: profileData['user verified?'] === true,
     linkedin: !!profileData['Verify - Linked In ID']
   }), [profileData]);
   ```

3. **URL Parameter Detection Pattern**: Used in authentication flows
   - Check `window.location.search` on page load
   - Clear parameter after processing

## Implementation Steps

### Step 1: Add State Variables for Email Verification Flow

**Files:** `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`
**Purpose:** Add state for tracking verification email sending status and success toast

**Details:**
- Add `isVerifyingEmail` state (boolean, false)
- Add `verificationEmailSent` state (boolean, false)
- Add toast state for email verification success

**Location:** Near line 230 (UI state section)

```javascript
// Email verification state
const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
const [verificationEmailSent, setVerificationEmailSent] = useState(false);
```

**Validation:** State variables visible in React DevTools

---

### Step 2: Implement handleVerifyEmail Function

**Files:** `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`
**Purpose:** Replace placeholder with full implementation that sends magic link email

**Details:**
Replace the existing stub at line 837-840:
```javascript
const handleVerifyEmail = useCallback(() => {
  console.log('Verify email clicked');
}, []);
```

With full implementation:

```javascript
const handleVerifyEmail = useCallback(async () => {
  // Prevent duplicate requests
  if (isVerifyingEmail) return;

  // Get user's email from profile data
  const userEmail = profileData?.email;
  if (!userEmail) {
    console.error('[handleVerifyEmail] No email found in profile data');
    setToast({
      show: true,
      type: 'error',
      message: 'Unable to verify email. Please refresh and try again.'
    });
    return;
  }

  setIsVerifyingEmail(true);

  try {
    // Step 1: Fetch BCC email addresses from os_slack_channels
    console.log('[handleVerifyEmail] Fetching BCC email addresses');

    const { data: channelData, error: channelError } = await supabase
      .schema('reference_table')
      .from('os_slack_channels')
      .select('email_address')
      .in('name', ['bots_log', 'customer_activation']);

    let bccEmails = [];
    if (!channelError && channelData) {
      bccEmails = channelData
        .map(c => c.email_address)
        .filter(e => e && e.trim() && e.includes('@'));
    }

    // Step 2: Generate magic link with redirect to account profile + verification param
    console.log('[handleVerifyEmail] Generating magic link');

    const redirectTo = `${window.location.origin}/account-profile/${profileUserId}?verified=email`;

    const { data: magicLinkData, error: magicLinkError } = await supabase.functions.invoke('auth-user', {
      body: {
        action: 'generate_magic_link',
        payload: {
          email: userEmail.toLowerCase().trim(),
          redirectTo: redirectTo
        }
      }
    });

    if (magicLinkError || !magicLinkData?.success) {
      console.error('[handleVerifyEmail] Error generating magic link:', magicLinkError || magicLinkData);
      setToast({
        show: true,
        type: 'error',
        message: 'Failed to generate verification link. Please try again.'
      });
      setIsVerifyingEmail(false);
      return;
    }

    const magicLink = magicLinkData.data.action_link;
    const firstName = profileData?.['Name - First'] || 'there';

    // Step 3: Send verification email using send-email edge function
    console.log('[handleVerifyEmail] Sending verification email');

    const bodyText = `Hi ${firstName}. Please click the link below to verify your email address on Split Lease. This helps us ensure your account is secure and builds trust with other members of our community.`;

    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        action: 'send',
        payload: {
          template_id: '1757433099447x202755280527849400', // Security 2 template (Magic Login)
          to_email: userEmail.toLowerCase().trim(),
          variables: {
            toemail: userEmail.toLowerCase().trim(),
            fromemail: 'tech@leasesplit.com',
            fromname: 'Split Lease',
            subject: 'Verify Your Email - Split Lease',
            preheadertext: 'Click to verify your email address',
            title: 'Verify Your Email',
            bodytext: bodyText,
            buttonurl: magicLink,
            buttontext: 'Verify Email',
            bannertext1: 'EMAIL VERIFICATION',
            bannertext2: 'This link expires in 1 hour',
            bannertext3: "If you didn't request this, please ignore this email",
            footermessage: 'For your security, never share this link with anyone.',
            cc: '',
            bcc: ''
          },
          ...(bccEmails.length > 0 && { bcc_emails: bccEmails })
        }
      }
    });

    if (emailError) {
      console.error('[handleVerifyEmail] Error sending email:', emailError);
      setToast({
        show: true,
        type: 'error',
        message: 'Failed to send verification email. Please try again.'
      });
    } else {
      console.log('[handleVerifyEmail] Verification email sent successfully');
      setVerificationEmailSent(true);
      setToast({
        show: true,
        type: 'success',
        message: 'Verification email sent! Check your inbox and click the link to verify.'
      });
    }

  } catch (err) {
    console.error('[handleVerifyEmail] Unexpected error:', err);
    setToast({
      show: true,
      type: 'error',
      message: 'An unexpected error occurred. Please try again.'
    });
  }

  setIsVerifyingEmail(false);
}, [isVerifyingEmail, profileData, profileUserId, supabase]);
```

**Validation:** Click Verify button, check console logs, verify email arrives

---

### Step 3: Add URL Parameter Detection for Email Verification Callback

**Files:** `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`
**Purpose:** Detect `?verified=email` URL parameter and update database on page load

**Details:**
Add a new useEffect that runs on mount to check for verification callback:

```javascript
/**
 * Handle email verification callback from magic link
 * Detects ?verified=email URL param and updates database
 */
useEffect(() => {
  const handleEmailVerificationCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const verifiedType = params.get('verified');

    // Only process if it's an email verification callback and user is authenticated
    if (verifiedType !== 'email' || !isAuthenticated || !profileUserId) {
      return;
    }

    console.log('[email-verification] Processing verification callback');

    // Clean URL immediately to prevent re-processing
    const url = new URL(window.location.href);
    url.searchParams.delete('verified');
    window.history.replaceState({}, '', url.toString());

    try {
      // Update user's email verification status in database
      const { error: updateError } = await supabase
        .from('user')
        .update({ 'is email confirmed': true })
        .eq('_id', profileUserId);

      if (updateError) {
        console.error('[email-verification] Error updating verification status:', updateError);
        setToast({
          show: true,
          type: 'error',
          message: 'Failed to update email verification status.'
        });
        return;
      }

      console.log('[email-verification] Email verified successfully');

      // Refresh profile data to reflect new verification status
      await fetchProfileData(profileUserId);

      // Show success toast
      setToast({
        show: true,
        type: 'success',
        message: 'Your email has been verified successfully!'
      });

    } catch (err) {
      console.error('[email-verification] Unexpected error:', err);
      setToast({
        show: true,
        type: 'error',
        message: 'An error occurred during verification.'
      });
    }
  };

  // Run when authentication state and profile data are available
  if (isAuthenticated && profileUserId) {
    handleEmailVerificationCallback();
  }
}, [isAuthenticated, profileUserId, supabase, fetchProfileData]);
```

**Location:** Add after the existing data fetching useEffects (around line 580)

**Validation:**
- Navigate to `/account-profile/{userId}?verified=email`
- Verify database updates
- Verify toast shows success
- Verify URL is cleaned

---

### Step 4: Export New State Values from Hook

**Files:** `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`
**Purpose:** Make verification state available to components if needed

**Details:**
Add to the return object (around line 1050-1100):

```javascript
// Email verification state
isVerifyingEmail,
verificationEmailSent,
```

**Validation:** State values accessible in component

---

### Step 5: Update Button Label During Loading State (Optional Enhancement)

**Files:** `app/src/islands/pages/AccountProfilePage/components/cards/TrustVerificationCard.jsx`
**Purpose:** Show loading state on Verify button while email is being sent

**Details:**
Update TrustVerificationCard to accept `isVerifyingEmail` prop and show loading state:

```jsx
// In component props
isVerifyingEmail = false,

// Update button rendering (around line 149-157)
{!isVerified && handleVerify && (
  <button
    type="button"
    className="verification-btn"
    onClick={handleVerify}
    disabled={item.key === 'email' && isVerifyingEmail}
  >
    {item.key === 'email' && isVerifyingEmail ? 'Sending...' : item.verifyLabel}
  </button>
)}
```

**Validation:** Button shows "Sending..." while email is being sent

---

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| User not logged in when clicking verify | Check `isAuthenticated` before proceeding |
| No email in profile data | Show error toast, log issue |
| Magic link generation fails | Show error toast, user can retry |
| Email send fails | Show error toast, user can retry |
| User already verified | UI shows "Verified" status, no verify button |
| URL param processing fails | Clean URL, show error toast |
| Database update fails | Show error toast, URL already cleaned |
| Duplicate requests | `isVerifyingEmail` flag prevents re-entry |

## Testing Considerations

1. **Manual Testing Flow:**
   - Log in as user with unverified email
   - Navigate to account profile page
   - Click "Verify" on email row
   - Check inbox for verification email
   - Click magic link in email
   - Verify redirected to account profile with success toast
   - Verify email now shows as verified
   - Verify profile strength meter updated

2. **Key Scenarios:**
   - Unverified user completes verification
   - Already verified user (no verify button visible)
   - Network failure during verification
   - Email service unavailable
   - User clicks link after it expires (1 hour)

## Rollback Strategy

Changes are contained to:
1. `useAccountProfilePageLogic.js` - State and handlers only, no breaking changes
2. `TrustVerificationCard.jsx` - Optional loading state enhancement

To rollback:
1. Revert the `handleVerifyEmail` implementation back to placeholder
2. Remove the URL parameter detection useEffect
3. Remove new state variables

No database migrations required. No Edge Function changes required.

## Dependencies & Blockers

- None - all required infrastructure exists:
  - `auth-user` Edge Function with `generate_magic_link` action
  - `send-email` Edge Function with Security 2 template
  - `user` table with `is email confirmed` column

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Email delivery failure | Low | Medium | Retry button available, BCC for monitoring |
| Magic link token expiry | Low | Low | User can request new link |
| Concurrent verification attempts | Low | Low | Disabled button during request |
| URL spoofing verification param | Low | Medium | Supabase Auth validates magic link token before allowing update |

---

## Files Referenced Summary

### Files to Modify

1. **`c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\AccountProfilePage\useAccountProfilePageLogic.js`**
   - Add state variables for verification flow
   - Implement `handleVerifyEmail` function
   - Add URL parameter detection useEffect
   - Export new state values

2. **`c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\AccountProfilePage\components\cards\TrustVerificationCard.jsx`**
   - (Optional) Add loading state for verify button

### Files Referenced (No Changes Needed)

- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\supabase\functions\auth-user\handlers\generateMagicLink.ts`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\supabase\functions\auth-user\index.ts`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\supabase\functions\send-email\handlers\send.ts`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\supabase\functions\send-email\index.ts`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\shared\SignUpLoginModal.jsx` (reference pattern)
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\.claude\Documentation\Database\DATABASE_TABLES_DETAILED.md`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\.claude\Documentation\Backend(EDGE - Functions)\AUTH_USER.md`

---

**Plan Version:** 1.0
**Created:** 2026-01-17T18:55:00Z
**Status:** Ready for Execution
