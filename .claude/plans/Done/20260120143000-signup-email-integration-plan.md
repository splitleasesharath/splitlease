# Signup Email Integration Plan

**Date:** 2026-01-20
**Type:** BUILD - Feature Integration
**Status:** PLANNING
**Priority:** High

---

## Executive Summary

Integrate email sending functionality into the Split Lease React/Supabase authentication flow to match the Bubble.io email requirements. This includes welcome emails, verification emails, and internal notification emails triggered during signup.

---

## Requirements Analysis (From Bubble Documentation)

### Email Types Required

| Email Type | Bubble Trigger | Target Recipients | When |
|------------|----------------|-------------------|------|
| **Password Reset** | `send_security_2` | User + BCC list | Password reset requested |
| **Magic Login Link** | `core-generic-magic-login-link` | User | Magic link requested |
| **Welcome Email (Guest)** | `l2-signup-user-emails-sending` Step 5 | New Guest users | After signup |
| **Welcome Email (Host)** | `l2-signup-user-emails-sending` Step 7 | New Host users | After signup |
| **Internal Notification** | `l2-signup-user-emails-sending` Step 1 | Internal team | Every signup |
| **Email Verification** | Magic link creation (Step 3) | New users | After signup |

### Bubble Placeholders → Our Equivalents

| Bubble Placeholder | Our Data Source | Notes |
|--------------------|-----------------|-------|
| `INL: reset password email's Value` | `payload.email` | User-entered email |
| `user's Account - Guest's Email` | `user.email` from `public.user` | After insert |
| `user's Type - User Signup` | `payload.userType` ('Host' \| 'Guest') | From signup form |
| `Current geographic position` | Not currently captured | Could add via frontend |
| `Platform B's Name` | `navigator.userAgent` | Could add via frontend |
| `Result of step 1 (create reset pw link)` | Supabase magic link token | From `generateMagicLink()` |
| `Website home URL` | `Deno.env.get('SITE_URL')` or hardcoded | Environment variable |

### BCC Recipients (Internal Notifications)

From Bubble config:
- `customer-activation's address` → Map to Slack channel or email list
- `design-emails-for-review's email address` → For QA/design review
- `bubble-noisy-log's address` → For debugging/logging
- `splitleasesteam@gmail.com` → Team notifications
- `tech@leasesplit.com` → Technical monitoring

**Our approach:** Query `reference_table.os_slack_channels` for BCC list (already used in magic link flow).

---

## Current Architecture Assessment

### What Already Exists ✅

1. **`send-email` Edge Function** - Fully functional, uses SendGrid
2. **Email template system** - Templates in `reference_table.zat_email_html_template_eg_sendbasicemailwf_`
3. **Magic link email** - Template ID `1757433099447x202755280527849400` (Security 2)
4. **Password reset** - Uses Supabase native email (not custom template)
5. **BCC lookup** - Queries `os_slack_channels` for notification emails

### What Needs to Be Added 🔧

1. **Welcome email templates** - Create/identify templates for Guest and Host
2. **Internal notification email** - Send to team on every signup
3. **Trigger point in signup handler** - Call `send-email` after user creation
4. **Device/location tracking** - Optional: capture browser + geolocation

---

## Implementation Plan

### Phase 1: Database Setup (Templates & Config)

#### 1.1 Verify/Create Email Templates

Check if these templates exist in `reference_table.zat_email_html_template_eg_sendbasicemailwf_`:

| Template Purpose | Expected Name | Template ID |
|------------------|---------------|-------------|
| Welcome Email - Guest | "Welcome Guest" or similar | TBD |
| Welcome Email - Host | "Welcome Host" or similar | TBD |
| Internal Signup Notification | "New User Created" or similar | TBD |

**Action:** Query the template table to find existing templates or document which ones need creation in Bubble.

#### 1.2 Verify BCC Configuration

Check `reference_table.os_slack_channels` for:
- `customer-activation` channel
- `design-emails-for-review` channel
- `bubble-noisy-log` channel

These should have `address` fields with email addresses for BCC.

---

### Phase 2: Edge Function Enhancement

#### 2.1 Create `sendWelcomeEmail` Utility

**File:** `supabase/functions/_shared/emailUtils.ts` (new file)

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface WelcomeEmailParams {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'Host' | 'Guest';
  deviceInfo?: string;
  location?: string;
}

interface InternalNotificationParams {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'Host' | 'Guest';
  signupTimestamp: string;
}

// Template IDs (to be confirmed from database)
const TEMPLATE_IDS = {
  WELCOME_GUEST: 'TBD', // Query from database
  WELCOME_HOST: 'TBD',  // Query from database
  INTERNAL_NOTIFICATION: 'TBD', // Query from database
};

export async function sendWelcomeEmail(
  supabase: SupabaseClient,
  params: WelcomeEmailParams
): Promise<{ success: boolean; error?: string }> {
  const templateId = params.userType === 'Guest'
    ? TEMPLATE_IDS.WELCOME_GUEST
    : TEMPLATE_IDS.WELCOME_HOST;

  // Build variables for template
  const variables = {
    first_name: params.firstName,
    last_name: params.lastName,
    email: params.email,
    user_type: params.userType,
    // Add more as needed by template
  };

  // Call send-email function internally or use shared sender
  // Implementation depends on whether we call the Edge Function
  // or use a shared SendGrid utility

  return { success: true };
}

export async function sendInternalSignupNotification(
  supabase: SupabaseClient,
  params: InternalNotificationParams
): Promise<{ success: boolean; error?: string }> {
  // Fetch BCC list from os_slack_channels
  const { data: channels } = await supabase
    .from('reference_table.os_slack_channels')
    .select('address')
    .in('Name', ['customer-activation', 'tech-notifications']);

  const bccEmails = channels?.map(c => c.address).filter(Boolean) || [];

  // Add hardcoded fallbacks
  bccEmails.push('splitleasesteam@gmail.com', 'tech@leasesplit.com');

  // Send notification email
  // ...

  return { success: true };
}
```

#### 2.2 Modify Signup Handler

**File:** `supabase/functions/auth-user/handlers/signup.ts`

Add email sending after successful user creation:

```typescript
// After line ~130 (after enqueueSignupSync)

// Send welcome email (async, don't block signup response)
EdgeRuntime.waitUntil(
  sendWelcomeEmail(supabaseAdmin, {
    userId: userData._id,
    email: userData.email,
    firstName: firstName,
    lastName: lastName,
    userType: userType,
  }).catch(err => {
    console.error('[signup] Welcome email failed:', err);
    // Don't throw - email failure shouldn't block signup
  })
);

// Send internal notification (async)
EdgeRuntime.waitUntil(
  sendInternalSignupNotification(supabaseAdmin, {
    userId: userData._id,
    email: userData.email,
    firstName: firstName,
    lastName: lastName,
    userType: userType,
    signupTimestamp: new Date().toISOString(),
  }).catch(err => {
    console.error('[signup] Internal notification failed:', err);
  })
);
```

**Key Design Decision:** Use `EdgeRuntime.waitUntil()` to send emails asynchronously. This:
- Doesn't block the signup response (user gets immediate feedback)
- Still guarantees email is sent before function terminates
- Matches Bubble's "Schedule API Workflow" pattern with 5-second delays

---

### Phase 3: Frontend Enhancement (Optional)

#### 3.1 Capture Device & Location Info

**File:** `app/src/islands/shared/SignUpLoginModal.jsx`

Add to `handleSignupSubmit()`:

```javascript
// Capture device info
const deviceInfo = navigator.userAgent;

// Capture location (with permission)
let location = null;
if (navigator.geolocation) {
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 5000,
        maximumAge: 300000 // 5 min cache
      });
    });
    location = `${position.coords.latitude},${position.coords.longitude}`;
  } catch (e) {
    // Location not available - continue without it
  }
}

// Include in signup payload
const signupPayload = {
  ...existingPayload,
  deviceInfo,
  location,
};
```

**Note:** This is optional and matches Bubble's geographic tracking. Consider privacy implications.

---

### Phase 4: Template Configuration

#### 4.1 Email Template Variables

Document the variables each template expects:

**Welcome Email (Guest)**
```json
{
  "first_name": "User's first name",
  "last_name": "User's last name",
  "email": "User's email",
  "login_url": "https://split.lease/login",
  "profile_url": "https://split.lease/account"
}
```

**Welcome Email (Host)**
```json
{
  "first_name": "User's first name",
  "last_name": "User's last name",
  "email": "User's email",
  "login_url": "https://split.lease/login",
  "listing_create_url": "https://split.lease/create-listing"
}
```

**Internal Notification**
```json
{
  "user_email": "New user's email",
  "user_name": "First + Last name",
  "user_type": "Host or Guest",
  "signup_timestamp": "ISO timestamp",
  "user_id": "Database ID"
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SIGNUP EMAIL FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SignUpLoginModal.jsx                                                   │
│       │                                                                 │
│       ▼                                                                 │
│  handleSignupSubmit()                                                   │
│       │                                                                 │
│       │  POST { action: 'signup', payload: {...} }                      │
│       ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  auth-user Edge Function                                         │   │
│  │       │                                                          │   │
│  │       ▼                                                          │   │
│  │  signup.ts handler                                               │   │
│  │       │                                                          │   │
│  │       ├─► 1. Validate payload                                    │   │
│  │       ├─► 2. Check existing user                                 │   │
│  │       ├─► 3. Create Supabase Auth user                           │   │
│  │       ├─► 4. Insert into public.user                             │   │
│  │       ├─► 5. Enqueue Bubble sync                                 │   │
│  │       │                                                          │   │
│  │       ├─► 6. EdgeRuntime.waitUntil(sendWelcomeEmail())  ───────────► send-email EF
│  │       │                                                          │        │
│  │       ├─► 7. EdgeRuntime.waitUntil(sendInternalNotification()) ────► send-email EF
│  │       │                                                          │        │
│  │       ▼                                                          │        ▼
│  │  Return { session, user } immediately                            │   SendGrid API
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Migration Considerations

### Bubble → Supabase Email Mapping

| Bubble Backend Workflow | Supabase Equivalent |
|-------------------------|---------------------|
| `core-generic-magic-login-link` | Already exists in `generate_magic_link.ts` + `send-email` |
| `send_security_2` (password reset) | Supabase native + could add custom template |
| `l2-signup-user-emails-sending` | **NEW:** Add to `signup.ts` handler |
| `core-create-new-user-accounts` | Already exists in `signup.ts` |

### Conditional Logic Mapping

| Bubble Conditional | Our Implementation |
|--------------------|-------------------|
| `Isn't live version is no` | Check `Deno.env.get('ENVIRONMENT') === 'production'` |
| `user's Type - User Signup is A Guest` | `payload.userType === 'Guest'` |
| `Search for Users:count > 1` | Already handled - we check for existing users |

---

## Testing Plan

1. **Unit Test:** Mock `send-email` Edge Function, verify correct payload
2. **Integration Test:** Signup new user, verify emails received
3. **E2E Test:** Full signup flow with email verification link click

### Test Cases

| Test | Expected Outcome |
|------|------------------|
| Guest signup | Welcome email (Guest template) + Internal notification |
| Host signup | Welcome email (Host template) + Internal notification |
| Signup with existing email | No emails sent, error returned |
| Email service down | Signup succeeds, email silently fails (logged) |

---

## Files to Modify/Create

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/YYYYMMDD_add_email_verified_to_user.sql` | CREATE | Add `email_verified` column |
| `supabase/functions/_shared/emailUtils.ts` | CREATE | Shared email sending utilities |
| `supabase/functions/auth-user/handlers/signup.ts` | MODIFY | Add email/SMS triggers after user creation |
| `supabase/functions/auth-user/handlers/verifyEmail.ts` | CREATE | Handle email verification callback |
| `supabase/functions/auth-user/index.ts` | MODIFY | Add `verify_email` action |
| `app/src/islands/shared/SignUpLoginModal.jsx` | OPTIONAL | Add device/location capture |

---

## Detailed Implementation Steps

### Step 1: Database Migration

**File:** `supabase/migrations/20260120_add_email_verified_to_user.sql`

```sql
-- Add email_verified column to public.user table
ALTER TABLE public.user
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_email_verified
ON public.user(email_verified)
WHERE email_verified = false;

-- Comment for documentation
COMMENT ON COLUMN public.user.email_verified IS 'Whether user has verified their email address via magic link';
```

### Step 2: Email Utilities

**File:** `supabase/functions/_shared/emailUtils.ts`

```typescript
import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// Template IDs from database
export const EMAIL_TEMPLATES = {
  MAGIC_LOGIN_LINK: '1757433099447x202755280527849400',
  BASIC_EMAIL: '1560447575939x331870423481483500',
} as const;

// BCC recipients for internal notifications
export const INTERNAL_BCC_EMAILS = [
  'activation-aaaacxk3rf2od4tbjuf2hpquii@splitlease.slack.com',
  'emails-for-review-aaaagbdra6rjlq6q3pqevmxgym@splitlease.slack.com',
  'noisybubble-aaaaffhc4jdfays3fjqjcdatmi@splitlease.slack.com',
  'splitleasesteam@gmail.com',
  'tech@leasesplit.com',
];

// SMS configuration
export const SMS_CONFIG = {
  FROM_NUMBER: '+14155692985',
} as const;

interface SendEmailParams {
  templateId: string;
  toEmail: string;
  toName?: string;
  fromEmail?: string;
  fromName?: string;
  subject: string;
  variables: Record<string, string>;
  bccEmails?: string[];
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const sendEmailUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;

  const response = await fetch(sendEmailUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({
      action: 'send',
      payload: {
        template_id: params.templateId,
        to_email: params.toEmail,
        to_name: params.toName,
        from_email: params.fromEmail || 'no-reply@split.lease',
        from_name: params.fromName || 'Split Lease',
        subject: params.subject,
        variables: params.variables,
        bcc_emails: params.bccEmails,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error };
  }

  return { success: true };
}

export async function sendWelcomeEmail(
  userType: 'Host' | 'Guest',
  email: string,
  firstName: string,
  verificationLink: string
): Promise<{ success: boolean; error?: string }> {
  const subject = userType === 'Guest'
    ? 'Welcome to Split Lease! Verify your email'
    : 'Welcome to Split Lease! Start hosting today';

  return sendEmail({
    templateId: EMAIL_TEMPLATES.BASIC_EMAIL,
    toEmail: email,
    toName: firstName,
    subject,
    variables: {
      first_name: firstName,
      user_type: userType,
      verification_link: verificationLink,
      login_url: 'https://split.lease/login',
    },
  });
}

export async function sendInternalSignupNotification(
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  userType: 'Host' | 'Guest'
): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    templateId: EMAIL_TEMPLATES.BASIC_EMAIL,
    toEmail: 'tech@leasesplit.com', // Primary recipient
    fromEmail: 'no-reply@split.lease',
    fromName: 'Split Lease System',
    subject: `New ${userType} Signup: ${firstName} ${lastName}`,
    variables: {
      user_id: userId,
      user_email: email,
      user_name: `${firstName} ${lastName}`,
      user_type: userType,
      signup_timestamp: new Date().toISOString(),
    },
    bccEmails: INTERNAL_BCC_EMAILS,
  });
}

export async function sendWelcomeSms(
  phoneNumber: string,
  firstName: string
): Promise<{ success: boolean; error?: string }> {
  const sendSmsUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`;

  const smsBody = `Hi ${firstName}! Welcome to Split Lease. Complete your profile to start finding flexible rentals: https://split.lease/account`;

  const response = await fetch(sendSmsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({
      action: 'send',
      payload: {
        to: phoneNumber,
        from: SMS_CONFIG.FROM_NUMBER,
        body: smsBody,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error };
  }

  return { success: true };
}
```

### Step 3: Verify Email Handler

**File:** `supabase/functions/auth-user/handlers/verifyEmail.ts`

```typescript
import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { EdgeFunctionResponse, successResponse, errorResponse } from '../../_shared/response.ts';

interface VerifyEmailPayload {
  token: string;  // Magic link token from email
  email: string;
}

export async function handleVerifyEmail(
  supabaseAdmin: SupabaseClient,
  payload: VerifyEmailPayload
): Promise<EdgeFunctionResponse> {
  const { token, email } = payload;

  if (!token || !email) {
    return errorResponse('Token and email are required', 400);
  }

  // Verify the magic link token
  const { data: session, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
    token_hash: token,
    type: 'magiclink',
  });

  if (verifyError) {
    console.error('[verifyEmail] Token verification failed:', verifyError);
    return errorResponse('Invalid or expired verification link', 400);
  }

  // Update email_verified in public.user
  const { error: updateError } = await supabaseAdmin
    .from('user')
    .update({ email_verified: true })
    .eq('email', email.toLowerCase());

  if (updateError) {
    console.error('[verifyEmail] Failed to update email_verified:', updateError);
    return errorResponse('Failed to update verification status', 500);
  }

  return successResponse({
    verified: true,
    message: 'Email verified successfully',
  });
}
```

### Step 4: Modify Signup Handler

**File:** `supabase/functions/auth-user/handlers/signup.ts`

Add after successful user creation (around line 130):

```typescript
// Import at top of file
import {
  sendWelcomeEmail,
  sendInternalSignupNotification,
  sendWelcomeSms
} from '../../_shared/emailUtils.ts';

// After enqueueSignupSync() call, add:

// Generate email verification magic link
const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
  type: 'magiclink',
  email: emailLower,
  options: {
    redirectTo: `${Deno.env.get('SITE_URL')}/email-verified`,
  },
});
const verificationLink = linkData?.properties?.action_link || '';

// Send welcome email with verification link (async)
EdgeRuntime.waitUntil(
  sendWelcomeEmail(userType, emailLower, firstName, verificationLink)
    .then(result => {
      if (!result.success) {
        console.error('[signup] Welcome email failed:', result.error);
      }
    })
    .catch(err => console.error('[signup] Welcome email error:', err))
);

// Send internal notification (async)
EdgeRuntime.waitUntil(
  sendInternalSignupNotification(userData._id, emailLower, firstName, lastName, userType)
    .then(result => {
      if (!result.success) {
        console.error('[signup] Internal notification failed:', result.error);
      }
    })
    .catch(err => console.error('[signup] Internal notification error:', err))
);

// Send welcome SMS to Guests with phone numbers (async)
if (userType === 'Guest' && phoneNumber) {
  EdgeRuntime.waitUntil(
    sendWelcomeSms(phoneNumber, firstName)
      .then(result => {
        if (!result.success) {
          console.error('[signup] Welcome SMS failed:', result.error);
        }
      })
      .catch(err => console.error('[signup] Welcome SMS error:', err))
  );
}
```

### Step 5: Update Router

**File:** `supabase/functions/auth-user/index.ts`

Add new action:

```typescript
// Add to imports
import { handleVerifyEmail } from './handlers/verifyEmail.ts';

// Add to action handlers map
case 'verify_email':
  return handleVerifyEmail(supabaseAdmin, payload);
```

---

## Resolved Questions ✅

### 1. Template IDs (CONFIRMED)

| Template Purpose | Template ID | Notes |
|------------------|-------------|-------|
| Magic Login Link | `1757433099447x202755280527849400` | Public (no auth) |
| Basic Email (Welcome/Notifications) | `1560447575939x331870423481483500` | Requires auth |

### 2. BCC Configuration (CONFIRMED)

Internal notification emails will BCC these Slack channel addresses:
```
customer-activation: activation-aaaacxk3rf2od4tbjuf2hpquii@splitlease.slack.com
design-emails-for-review: emails-for-review-aaaagbdra6rjlq6q3pqevmxgym@splitlease.slack.com
bubble-noisy-log: noisybubble-aaaaffhc4jdfays3fjqjcdatmi@splitlease.slack.com
```

Plus hardcoded:
- `splitleasesteam@gmail.com`
- `tech@leasesplit.com`

### 3. Email Verification (CONFIRMED - Custom Implementation)

**Current State:** `public.user` table has NO `email_verified` field. Supabase Auth tracks `email_confirmed_at` in `auth.users` but we don't sync it.

**Required:**
1. Add `email_verified BOOLEAN DEFAULT false` column to `public.user`
2. Send verification magic link email on signup
3. When user clicks link → update `email_verified = true` in `public.user`

### 4. SMS Integration (CONFIRMED - Yes)

**SMS Edge Function:** `send-sms` is fully functional with Twilio.

**Payload:**
```typescript
{
  action: 'send',
  payload: {
    to: '+15551234567',    // E.164 format
    from: '+14155692985',  // Split Lease SMS number
    body: 'Welcome message...'
  }
}
```

**Will implement:** Welcome SMS to Guests after signup (matches Bubble Step 6)

---

## Dependencies

- SendGrid API key configured in Edge Function secrets ✅
- Email templates in `reference_table.zat_email_html_template_eg_sendbasicemailwf_` ✅
- Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`) ✅
- `SITE_URL` environment variable for verification redirect

---

## Complete Email/SMS Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SIGNUP EMAIL/SMS FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User clicks "Agree and Sign Up"                                            │
│       │                                                                     │
│       ▼                                                                     │
│  SignUpLoginModal.jsx → handleSignupSubmit()                                │
│       │                                                                     │
│       │  POST { action: 'signup', payload: { email, password, ...} }        │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  auth-user Edge Function → signup.ts                                 │   │
│  │                                                                      │   │
│  │  1. ✅ Validate payload                                              │   │
│  │  2. ✅ Check existing user                                           │   │
│  │  3. ✅ Create Supabase Auth user                                     │   │
│  │  4. ✅ Insert into public.user (email_verified: false)               │   │
│  │  5. ✅ Enqueue Bubble sync                                           │   │
│  │                                                                      │   │
│  │  6. 🆕 Generate verification magic link                              │   │
│  │       │                                                              │   │
│  │       ▼                                                              │   │
│  │  7. 🆕 EdgeRuntime.waitUntil(sendWelcomeEmail())                     │   │
│  │       │                                                              │   │
│  │       └──► send-email EF ──► SendGrid ──► User inbox                 │   │
│  │            Template: 1560447575939x331870423481483500                 │   │
│  │            Contains: verification_link, first_name, user_type        │   │
│  │                                                                      │   │
│  │  8. 🆕 EdgeRuntime.waitUntil(sendInternalNotification())             │   │
│  │       │                                                              │   │
│  │       └──► send-email EF ──► SendGrid ──► Slack channels (BCC)       │   │
│  │            To: tech@leasesplit.com                                   │   │
│  │            BCC: activation@slack, emails-for-review@slack, etc.      │   │
│  │                                                                      │   │
│  │  9. 🆕 IF Guest + has phone: EdgeRuntime.waitUntil(sendWelcomeSms()) │   │
│  │       │                                                              │   │
│  │       └──► send-sms EF ──► Twilio ──► User phone                     │   │
│  │            From: +14155692985                                        │   │
│  │            Body: "Hi {name}! Welcome to Split Lease..."              │   │
│  │                                                                      │   │
│  │  10. Return { session, user } immediately (don't wait for emails)    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  User clicks verification link in email                                     │
│       │                                                                     │
│       ▼                                                                     │
│  Browser redirects to: /email-verified?token=xxx&email=yyy                  │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  auth-user Edge Function → verifyEmail.ts                            │   │
│  │                                                                      │   │
│  │  1. Verify magic link token                                          │   │
│  │  2. UPDATE public.user SET email_verified = true WHERE email = ?     │   │
│  │  3. Return success                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Bubble → Supabase Mapping (Complete)

| Bubble Workflow/Step | Supabase Implementation |
|----------------------|-------------------------|
| `B: Send Magic Link is clicked` | ✅ `generate_magic_link.ts` + `send-email` |
| `Button send Reset Link is clicked` | ✅ Supabase native password reset |
| `Button Agree and Sign Up → Step 4 (Sign user up)` | ✅ `signup.ts` |
| `Button Agree and Sign Up → Step 6 (core-create-new-user-accounts)` | ✅ `signup.ts` (creates user profile) |
| `Button Agree and Sign Up → Step 8 (l2-signup-user-emails-sending)` | 🆕 `signup.ts` + `emailUtils.ts` |
| `l2-signup-user-emails-sending → Step 1 (Internal notification)` | 🆕 `sendInternalSignupNotification()` |
| `l2-signup-user-emails-sending → Step 3 (Email verification)` | 🆕 `sendWelcomeEmail()` with verification link |
| `l2-signup-user-emails-sending → Step 5 (Welcome email Guest)` | 🆕 `sendWelcomeEmail('Guest', ...)` |
| `l2-signup-user-emails-sending → Step 6 (Welcome SMS Guest)` | 🆕 `sendWelcomeSms()` |
| `l2-signup-user-emails-sending → Step 7 (Welcome email Host)` | 🆕 `sendWelcomeEmail('Host', ...)` |

---

## Next Steps

1. **Query database** for existing email templates that match our needs
2. **Confirm BCC configuration** in `os_slack_channels`
3. **Create `emailUtils.ts`** with template IDs once confirmed
4. **Modify `signup.ts`** to trigger emails
5. **Test in development** environment
6. **Deploy to production** with manual edge function deployment

---

## References

- [SignUpLoginModal.jsx](../../app/src/islands/shared/SignUpLoginModal.jsx) - Frontend auth UI
- [auth.js](../../app/src/lib/auth.js) - Frontend auth library
- [signup.ts](../../supabase/functions/auth-user/handlers/signup.ts) - Signup handler
- [send-email/index.ts](../../supabase/functions/send-email/index.ts) - Email Edge Function
- [send.ts](../../supabase/functions/send-email/handlers/send.ts) - Email send handler
- [Bubble Requirements](../Documents/SIGN%20UP%20%26%20LOGIN%20REUSABLE%20ELEMENT.md) - Original requirements doc
