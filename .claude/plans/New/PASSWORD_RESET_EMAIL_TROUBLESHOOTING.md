# Password Reset Email Not Sending - Troubleshooting Guide

**CREATED**: 2025-12-07
**STATUS**: Investigation
**SYMPTOM**: Password reset completes with 200 status but email not received

---

## Investigation Summary

### What's Working
- Edge Function `auth-user` receives the request correctly
- `/recover` endpoint returns 200 status
- No errors visible in auth logs
- The code is executing without throwing exceptions

### The Problem
The `resetPassword.ts` handler **silently swallows errors** for security (to prevent email enumeration):

```typescript
if (error) {
  // Log the error but don't expose it to prevent email enumeration
  console.error(`[reset-password] Supabase error (not exposed):`, error.message);
  // Still return success - security best practice
}
```

This means even if Supabase Auth fails to send the email, the API returns success.

---

## Potential Issues (Ranked by Likelihood)

### 1. REDIRECT URL NOT WHITELISTED (Most Likely)

**Check in**: Supabase Dashboard > Authentication > URL Configuration

The `redirectTo` URL passed to `resetPasswordForEmail()` MUST be in the allowed redirect URLs list.

**Current code** (`resetPassword.ts:49`):
```typescript
const resetRedirectUrl = redirectTo || 'https://app.split.lease/reset-password';
```

**Action Required**:
1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Add `https://app.split.lease/reset-password` to **Redirect URLs**
3. Also add `http://localhost:5173/reset-password` for local development

---

### 2. SENDGRID LINK TRACKING BREAKING LINKS

**Known Issue**: SendGrid's click tracking rewrites URLs, which can break Supabase Auth confirmation links.

**Action Required**:
1. Log into SendGrid Dashboard
2. Go to Settings > Tracking
3. **Disable Click Tracking** for the API key used with Supabase
4. Or disable it globally for auth emails

---

### 3. SMTP NOT PROPERLY CONFIGURED

**Check in**: Supabase Dashboard > Project Settings > Authentication > SMTP Settings

**Required Settings for SendGrid**:
| Setting | Value |
|---------|-------|
| SMTP Host | `smtp.sendgrid.net` |
| Port | `587` (TLS) or `465` (SSL) |
| Username | `apikey` (literally the word "apikey") |
| Password | Your SendGrid API Key |
| Sender Email | Verified sender email in SendGrid |
| Sender Name | `Split Lease` or similar |

**Action Required**:
1. Verify all SMTP settings are correct
2. Ensure the sender email is verified in SendGrid
3. Test by sending a test email from Supabase Dashboard

---

### 4. SENDGRID SENDER VERIFICATION

**Check in**: SendGrid Dashboard > Settings > Sender Authentication

SendGrid requires either:
- **Domain Authentication** (recommended for production)
- **Single Sender Verification** (quick setup for testing)

**Action Required**:
1. Verify the sender email address used in Supabase SMTP settings
2. If using domain authentication, ensure DNS records are properly configured

---

### 5. SITE URL NOT CONFIGURED

**Check in**: Supabase Dashboard > Authentication > URL Configuration

The Site URL is used in email templates via `{{ .SiteURL }}`.

**Action Required**:
1. Set Site URL to `https://app.split.lease`
2. For local development, you may need to temporarily change this to `http://localhost:5173`

---

### 6. EMAIL TEMPLATE ISSUES

**Check in**: Supabase Dashboard > Authentication > Email Templates > Reset Password

The email template might be misconfigured or the token variables might be wrong.

**Default Template Should Include**:
```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

Or for PKCE flow:
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">
  Reset Password
</a>
```

---

### 7. RATE LIMITING

**Check in**: Supabase Dashboard > Authentication > Rate Limits

| Limit | Default Value |
|-------|---------------|
| Password Reset Request | 60 seconds between requests |
| Custom SMTP Initial Limit | 30 emails/hour |

If you've been testing repeatedly, you might have hit rate limits.

**Action Required**:
1. Wait 60+ seconds between password reset attempts
2. Check if you've exceeded the hourly email limit

---

### 8. SPAM FOLDER / EMAIL FILTERING

The email might be delivered but filtered.

**Action Required**:
1. Check spam/junk folder
2. Check if email was blocked by corporate email filters
3. Try with a Gmail or personal email account

---

## Diagnostic Steps

### Step 1: Check Edge Function Logs for Actual Error

1. Go to **Supabase Dashboard > Edge Functions > auth-user > Logs**
2. Look for log entries containing `[reset-password]`
3. Find the line: `Supabase error (not exposed):` - this reveals the actual error

### Step 2: Verify SMTP Configuration

1. Go to **Supabase Dashboard > Project Settings > Authentication**
2. Scroll to **SMTP Settings**
3. Click **Send Test Email** to verify the configuration works

### Step 3: Check Redirect URLs

1. Go to **Supabase Dashboard > Authentication > URL Configuration**
2. Verify these URLs are listed:
   - `https://app.split.lease/reset-password`
   - `http://localhost:5173/reset-password` (for dev)
   - `http://localhost:3000/reset-password` (if using port 3000)

### Step 4: Check SendGrid Activity

1. Log into **SendGrid Dashboard**
2. Go to **Activity Feed**
3. Look for recent email attempts
4. Check if emails are:
   - Successfully sent
   - Blocked
   - Bounced
   - Deferred

---

## Quick Fix Checklist

- [ ] Add `https://app.split.lease/reset-password` to Supabase Redirect URLs
- [ ] Disable SendGrid Click Tracking
- [ ] Verify SMTP credentials in Supabase Dashboard
- [ ] Verify sender email is authenticated in SendGrid
- [ ] Set Site URL to `https://app.split.lease`
- [ ] Send test email from Supabase SMTP settings
- [ ] Check SendGrid Activity Feed for delivery status
- [ ] Check spam folder

---

## Files Reference

- `supabase/functions/auth-user/handlers/resetPassword.ts` - Password reset handler (line 54)
- `app/src/islands/shared/SignUpLoginModal.jsx` - Frontend reset UI (line 652-691)
- `app/src/lib/auth.js` - `requestPasswordReset()` function (line 939-982)

---

**DOCUMENT_VERSION**: 1.0
**PRIORITY**: High - Blocking legacy user migration
