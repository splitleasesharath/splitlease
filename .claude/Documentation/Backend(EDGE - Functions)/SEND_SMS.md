# Send SMS Edge Function

**GENERATED**: 2026-01-20
**VERSION**: 1.0
**LOCATION**: `supabase/functions/send-sms/index.ts`
**ENDPOINT**: `POST /functions/v1/send-sms`

---

## Overview

Twilio SMS sending proxy. Provides a unified SMS sending interface for notifications, reminders, and alerts.

---

## Actions

| Action | Purpose | Auth Required |
|--------|---------|---------------|
| `send` | Send an SMS message | Mixed* |
| `health` | Health check | No |

> **Note**: "Mixed*" - Some sender numbers bypass authentication for system notifications.

---

## Public From Numbers

The following sender numbers can be used without authentication:

```typescript
const PUBLIC_FROM_NUMBERS: ReadonlySet<string> = new Set([
  // System notification numbers
]);
```

---

## Request Format

### Basic Send

```json
{
  "action": "send",
  "payload": {
    "to": "+1234567890",
    "message": "Your Split Lease booking is confirmed!"
  }
}
```

### With Custom From Number

```json
{
  "action": "send",
  "payload": {
    "to": "+1234567890",
    "from": "+0987654321",
    "message": "Reminder: Your co-host session is tomorrow at 2 PM"
  }
}
```

---

## Response Format

```json
{
  "success": true,
  "data": {
    "message_sid": "SMxxxxxxxxxxxxxxxx",
    "status": "queued",
    "to": "+1234567890"
  }
}
```

---

## Message Types

| Type | Use Case |
|------|----------|
| **Booking** | Confirmation, reminders |
| **Verification** | Phone number verification |
| **Alerts** | Payment due, cancellation |
| **Reminders** | House manual, check-in/out |
| **Co-Host** | Session reminders, follow-ups |

---

## Error Handling

```json
// Invalid phone number
{
  "success": false,
  "error": "Invalid phone number format"
}

// Unverified number (Twilio trial)
{
  "success": false,
  "error": "Phone number not verified for trial account"
}

// Twilio error
{
  "success": false,
  "error": "Twilio API error: insufficient funds"
}
```

---

## Phone Number Format

All phone numbers should be in E.164 format:

```
+1234567890  (US)
+442071234567  (UK)
```

The function attempts to normalize common formats:

```
(123) 456-7890  →  +11234567890
123-456-7890    →  +11234567890
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Twilio authentication token |
| `TWILIO_FROM_NUMBER` | Default sender phone number |

---

## Architecture

```typescript
const ALLOWED_ACTIONS = ["send", "health"] as const;

// Public numbers bypass auth
const PUBLIC_FROM_NUMBERS: ReadonlySet<string> = new Set([...]);
```

---

## Rate Limiting

Twilio applies rate limits:

| Limit Type | Value |
|------------|-------|
| Messages per second | ~1-10 (varies by number type) |
| Daily messages | Account-dependent |

---

## Related Files

- Handler: `send-sms/handlers/send.ts`

---

**LAST_UPDATED**: 2026-01-20
