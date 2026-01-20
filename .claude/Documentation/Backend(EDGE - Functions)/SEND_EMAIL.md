# Send Email Edge Function

**GENERATED**: 2026-01-20
**VERSION**: 1.0
**LOCATION**: `supabase/functions/send-email/index.ts`
**ENDPOINT**: `POST /functions/v1/send-email`

---

## Overview

SendGrid email sending proxy. Provides a unified email sending interface with template support and delivery tracking.

---

## Actions

| Action | Purpose | Auth Required |
|--------|---------|---------------|
| `send` | Send an email | Mixed* |
| `health` | Health check | No |

> **Note**: "Mixed*" - Some templates are public (no auth required), others require JWT authentication.

---

## Public Templates

The following templates can be sent without authentication:

```typescript
const PUBLIC_TEMPLATES = new Set([
  "welcome_guest",
  "welcome_host",
  "password_reset",
  "email_verification"
]);
```

---

## Request Format

### Send with Template

```json
{
  "action": "send",
  "payload": {
    "to": "user@example.com",
    "template": "welcome_guest",
    "template_data": {
      "user_name": "John",
      "listing_name": "Cozy Brooklyn Apartment"
    }
  }
}
```

### Send with Custom Content

```json
{
  "action": "send",
  "payload": {
    "to": "user@example.com",
    "subject": "Your Split Lease Confirmation",
    "html": "<h1>Hello!</h1><p>Your booking is confirmed.</p>",
    "text": "Hello! Your booking is confirmed."
  }
}
```

### Multiple Recipients

```json
{
  "action": "send",
  "payload": {
    "to": ["user1@example.com", "user2@example.com"],
    "template": "proposal_notification",
    "template_data": {...}
  }
}
```

---

## Response Format

```json
{
  "success": true,
  "data": {
    "message_id": "sg-xxxxxxxx",
    "status": "sent",
    "recipients": 1
  }
}
```

---

## Template Categories

| Category | Templates |
|----------|-----------|
| **Welcome** | welcome_guest, welcome_host |
| **Auth** | password_reset, email_verification |
| **Proposals** | proposal_submitted, proposal_accepted, proposal_declined |
| **Booking** | booking_confirmed, booking_reminder |
| **Payments** | payment_due, payment_received, payment_failed |
| **Co-Host** | cohost_request_created, cohost_assigned |

---

## Error Handling

```json
// Invalid email
{
  "success": false,
  "error": "Invalid email address: user@invalid"
}

// Missing template
{
  "success": false,
  "error": "Template not found: unknown_template"
}

// SendGrid error
{
  "success": false,
  "error": "SendGrid API error: rate limit exceeded"
}
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `SENDGRID_API_KEY` | SendGrid API authentication |
| `SENDGRID_FROM_EMAIL` | Default sender email address |
| `SENDGRID_FROM_NAME` | Default sender display name |

---

## Architecture

```typescript
const ALLOWED_ACTIONS = ["send", "health"] as const;

// Public templates don't require auth
const PUBLIC_TEMPLATES: ReadonlySet<string> = new Set([...]);
```

---

## Related Files

- Handler: `send-email/handlers/send.ts`
- Templates: Configured in SendGrid Dashboard

---

**LAST_UPDATED**: 2026-01-20
