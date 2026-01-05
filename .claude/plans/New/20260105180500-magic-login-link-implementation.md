# Implementation Plan: Magic Login Link Functionality

## Overview

Implement the "Log in Without Password" (magic login link) feature in the SignUpLoginModal. When clicked, the system will show a security-conscious message, silently check if the email exists, and if found, generate a magic link via the auth-user edge function and send it via the send-email edge function using the "Security 2" email template.

## Success Criteria

- [ ] Clicking "Log in Without Password" shows an alert that says a link will be sent if the email exists
- [ ] The system checks for email existence without exposing whether the account exists (security)
- [ ] If email exists: generate magic link via `auth-user` + send email via `send-email`
- [ ] If email does not exist: show same success message (prevents account enumeration)
- [ ] Email uses the "Security 2" template with proper placeholder population
- [ ] Magic link redirects user to the profile page after authentication

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/shared/SignUpLoginModal.jsx` | Login modal with "Log in Without Password" button | Rewrite `handleMagicLink` function |
| `supabase/functions/auth-user/handlers/generateMagicLink.ts` | Generates magic link without sending email | Already implemented, no changes |
| `supabase/functions/auth-user/index.ts` | Routes to generateMagicLink handler | Already implemented, no changes |
| `supabase/functions/send-email/handlers/send.ts` | Sends templated emails via SendGrid | No changes needed |
| `supabase/functions/send-email/index.ts` | Routes email operations | No changes needed |

### Email Template Reference

**Template Name**: Security 2
**Template ID**: `1757433099447x202755280527849400`
**Table**: `reference_table.zat_email_html_template_eg_sendbasicemailwf_`

**Placeholders to populate**:
| Placeholder | Value |
|------------|-------|
| `$$toemail$$` | User's email address |
| `$$fromemail$$` | `tech@leasesplit.com` |
| `$$fromname$$` | `Split Lease` |
| `$$subject$$` | `Your Split Lease Magic Login Link` |
| `$$preheadertext$$` | `Click the link to log in without a password` |
| `$$title$$` | `Magic Login Link` |
| `$$bodytext$$` | `Hi {firstName}. Please use the link below to log in to your Split Lease account. Once logged in, you can update your password from the profile page. Please feel free to text (937) 673-7470 with any queries.` |
| `$$buttonurl$$` | The magic link URL |
| `$$buttontext$$` | `Log In Now` |
| `$$bannertext1$$` | `SECURITY NOTICE` |
| `$$bannertext2$$` | `This link expires in 1 hour` |
| `$$bannertext3$$` | `If you didn't request this, please ignore this email` |
| `$$footermessage$$` | `For your security, never share this link with anyone.` |
| `$$cc_email$$` | Empty string (no CC) |
| `$$bcc_email$$` | Empty string (no BCC) |

### Existing Patterns to Follow

1. **Edge Function Invocation Pattern**:
```javascript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: {
    action: 'action_name',
    payload: { /* data */ }
  }
});
```

2. **Security Pattern from Password Reset** (lines 777-828 in SignUpLoginModal.jsx):
   - Always show success message regardless of whether email exists
   - Capture errors but don't expose them to user
   - Prevents email enumeration attacks

3. **Toast Notification Pattern**:
```javascript
showToast({
  title: 'Title',
  content: 'Message',
  type: 'info' // or 'success', 'error'
});
```

## Implementation Steps

### Step 1: Update handleMagicLink Function in SignUpLoginModal.jsx

**Files**: `app/src/islands/shared/SignUpLoginModal.jsx`
**Purpose**: Rewrite the magic link handler to:
1. Check if email exists by looking up user in database
2. If exists: call generate_magic_link, then send email
3. Always show same success message for security

**Details**:

Replace the existing `handleMagicLink` function (lines 831-864) with:

```javascript
// Handle magic link request
const handleMagicLink = async () => {
  const email = currentView === VIEWS.PASSWORD_RESET ? resetEmail : loginData.email;

  if (!email.trim()) {
    setError('Please enter your email address first.');
    return;
  }

  setIsLoading(true);
  setError('');

  // Always show the same message for security (prevents email enumeration)
  const showSuccessMessage = () => {
    showToast({
      title: 'Check Your Inbox',
      content: 'If an account with that email exists, a magic login link has been sent.',
      type: 'info'
    });
  };

  try {
    // Step 1: Check if user exists (using Supabase directly)
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('_id, "Name - First", email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (userError) {
      console.error('[handleMagicLink] Error checking user:', userError);
      // Don't expose error - show success for security
      showSuccessMessage();
      setIsLoading(false);
      return;
    }

    if (!userData) {
      // User doesn't exist - still show success message for security
      console.log('[handleMagicLink] No user found for email');
      showSuccessMessage();
      setIsLoading(false);
      return;
    }

    // Step 2: User exists - generate magic link
    console.log('[handleMagicLink] User found, generating magic link');

    const redirectTo = `${window.location.origin}/account-profile/${userData._id}`;

    const { data: magicLinkData, error: magicLinkError } = await supabase.functions.invoke('auth-user', {
      body: {
        action: 'generate_magic_link',
        payload: {
          email: email.toLowerCase().trim(),
          redirectTo: redirectTo
        }
      }
    });

    if (magicLinkError || !magicLinkData?.success) {
      console.error('[handleMagicLink] Error generating magic link:', magicLinkError || magicLinkData);
      // Don't expose error - show success for security
      showSuccessMessage();
      setIsLoading(false);
      return;
    }

    const magicLink = magicLinkData.data.action_link;
    const firstName = userData['Name - First'] || 'there';

    // Step 3: Send magic link email using send-email edge function
    console.log('[handleMagicLink] Sending magic link email');

    // Get current session token for authorization
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    // Build the body text with the user's first name
    const bodyText = `Hi ${firstName}. Please use the link below to log in to your Split Lease account. Once logged in, you can update your password from the profile page. Please feel free to text (937) 673-7470 with any queries.`;

    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        action: 'send',
        payload: {
          template_id: '1757433099447x202755280527849400', // Security 2 template
          to_email: email.toLowerCase().trim(),
          variables: {
            toemail: email.toLowerCase().trim(),
            fromemail: 'tech@leasesplit.com',
            fromname: 'Split Lease',
            subject: 'Your Split Lease Magic Login Link',
            preheadertext: 'Click the link to log in without a password',
            title: 'Magic Login Link',
            bodytext: bodyText,
            buttonurl: magicLink,
            buttontext: 'Log In Now',
            bannertext1: 'SECURITY NOTICE',
            bannertext2: 'This link expires in 1 hour',
            bannertext3: "If you didn't request this, please ignore this email",
            footermessage: 'For your security, never share this link with anyone.',
            cc_email: '',
            bcc_email: ''
          }
        }
      }
    });

    if (emailError) {
      console.error('[handleMagicLink] Error sending email:', emailError);
      // Still show success for security
    } else {
      console.log('[handleMagicLink] Magic link email sent successfully');
    }

    showSuccessMessage();

  } catch (err) {
    console.error('[handleMagicLink] Unexpected error:', err);
    // Don't expose error - show success for security
    showSuccessMessage();
  }

  setIsLoading(false);
};
```

**Key Implementation Notes**:

1. **Security-First Approach**: Always show the same success message regardless of whether:
   - The email exists or not
   - The magic link generation succeeds or fails
   - The email sending succeeds or fails

2. **User Lookup**: Uses Supabase direct query to `public.user` table to check if email exists and get first name

3. **Magic Link Generation**: Calls the existing `generate_magic_link` action on `auth-user` edge function

4. **Email Sending**: Calls `send-email` edge function with `send` action and proper template variables

5. **Redirect URL**: Uses `/account-profile/{userId}` as the redirect after magic link authentication

**Validation**:
- Test with existing email - should receive email with magic link
- Test with non-existing email - should show same success message
- Click magic link - should authenticate and redirect to profile page

### Step 2: Add Authorization Header Handling for Unauthenticated Users

**Files**: `supabase/functions/send-email/index.ts`
**Purpose**: Allow unauthenticated requests to send specific email types (magic link emails)

**Details**:

The current `send-email` function requires a Bearer token (lines 107-121). Since magic link requests come from unauthenticated users (they can't log in, that's why they need the magic link), we need to handle this case.

**Option A - Use Service Role Key from Frontend (Not Recommended)**:
This would expose the service role key, which is a security risk.

**Option B - Create Internal Bypass Token (Recommended)**:
Add a special bypass mechanism for internal calls.

However, looking at the code more carefully, the `supabase.functions.invoke()` method automatically includes the anon key or session token. For unauthenticated users, it will include the anon key.

**Update the send-email function to accept anon key for specific templates**:

In `supabase/functions/send-email/index.ts`, modify the authorization check (around line 107-121):

```typescript
if (body.action === 'send') {
  const authHeader = req.headers.get("Authorization");

  // Check if this is a magic link email (allowed without auth)
  const isMagicLinkEmail = body.payload?.template_id === '1757433099447x202755280527849400';

  if (!isMagicLinkEmail) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("Missing or invalid Authorization header. Use Bearer token.");
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      throw new AuthenticationError("Empty Bearer token");
    }
  }

  console.log(`[send-email] Authorization: ${isMagicLinkEmail ? 'Magic link bypass' : 'Bearer token present'}`);
}
```

**Alternative Approach (Cleaner)**:

Create a new action `send_magic_link_email` that doesn't require auth:

```typescript
// In ALLOWED_ACTIONS
const ALLOWED_ACTIONS = ["send", "health", "send_magic_link_email"] as const;

// In the route handler
case "send_magic_link_email":
  // No auth required for magic link emails
  validateRequired(body.payload, "payload");
  // Validate it's using the correct template
  if (body.payload.template_id !== '1757433099447x202755280527849400') {
    throw new ValidationError("Invalid template for magic link email");
  }
  result = await handleSend(body.payload);
  break;
```

For this implementation, I recommend **modifying the auth check** (Option B, first approach) as it's simpler and keeps the existing structure.

**Validation**:
- Test sending magic link email from unauthenticated context
- Verify regular emails still require authentication

### Step 3: Handle CC/BCC Placeholder Format in Template

**Files**: None (template already handles this)
**Purpose**: Ensure CC and BCC placeholders work correctly

**Details**:

Looking at the template JSON, the CC and BCC placeholders are used inline:
```json
"personalizations": [
  {
    "to": [{ "email": "$$toemail$$" }]
    $$cc_email$$
    $$bcc_email$$
  }
]
```

This means passing empty strings for `cc_email` and `bcc_email` will result in valid JSON. However, if we want to properly omit them, we should not include them at all or pass them as empty JSON fragments.

The template processor replaces missing placeholders with empty strings in JSON mode (line 67 of templateProcessor.ts), so passing empty strings is fine.

**No code changes needed** - just ensure the variables object includes:
```javascript
cc_email: '',
bcc_email: ''
```

**Validation**:
- Verify email is sent without CC/BCC recipients
- Check SendGrid dashboard for successful delivery

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| Empty email field | Show validation error "Please enter your email address first" |
| Email doesn't exist in database | Show success message (security - don't reveal if email exists) |
| Magic link generation fails | Log error, show success message (security) |
| Email sending fails | Log error, show success message (security) |
| User has no first name | Default to "there" in the greeting |
| Network error | Catch in try/catch, show success message (security) |

## Testing Considerations

1. **Manual Testing**:
   - Test with valid email that exists in database
   - Test with email that doesn't exist
   - Test with malformed email
   - Test clicking the magic link
   - Verify redirect works after authentication

2. **Security Testing**:
   - Verify same message shown for existing/non-existing emails
   - Verify no error details exposed to user
   - Verify magic link expires after use

3. **Email Testing**:
   - Check email renders correctly
   - Verify all placeholders are replaced
   - Test on multiple email clients (Gmail, Outlook, etc.)
   - Verify magic link URL is correct and clickable

## Rollback Strategy

If issues arise:
1. Revert `handleMagicLink` function to previous implementation
2. If send-email auth changes cause issues, revert those changes
3. The `generate_magic_link` action in auth-user can remain as it's already deployed

## Dependencies & Blockers

- **Required**: `generate_magic_link` action in auth-user edge function (already deployed)
- **Required**: send-email edge function (already deployed)
- **Required**: "Security 2" email template in database (already exists)
- **May Need**: Update send-email to allow unauthenticated magic link emails

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Email enumeration attack | Low | Medium | Always show same success message |
| Magic link abuse (spam) | Low | Low | Link expires in 1 hour, rate limiting on Supabase |
| SendGrid API failure | Low | Medium | Log errors, show generic success |
| User confusion about next steps | Medium | Low | Clear email copy with instructions |

## File References Summary

### Files to Modify
1. `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\SignUpLoginModal.jsx` - Rewrite handleMagicLink function

### Files to Potentially Modify (for auth bypass)
2. `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\index.ts` - Add magic link email bypass

### Reference Files (No Changes)
3. `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\auth-user\handlers\generateMagicLink.ts`
4. `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\auth-user\index.ts`
5. `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\handlers\send.ts`
6. `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\lib\types.ts`
7. `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\send-email\lib\templateProcessor.ts`

### Database References
- **User Table**: `public.user` - columns `_id`, `email`, `"Name - First"`
- **Email Template Table**: `reference_table.zat_email_html_template_eg_sendbasicemailwf_`
- **Template ID**: `1757433099447x202755280527849400` (Security 2)

---

**VERSION**: 1.0
**CREATED**: 2026-01-05
**AUTHOR**: Claude Code (Implementation Planner)
