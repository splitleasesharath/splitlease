# Send SMS Edge Function

**Endpoint**: `POST /functions/v1/send-sms`
**Purpose**: Send templated SMS messages via Twilio with dynamic placeholder replacement
**Version**: 1.0
**Last Updated**: 2025-12-13

---

## Table of Contents

1. [Overview](#overview)
2. [Actions](#actions)
3. [Authentication](#authentication)
4. [Request Format](#request-format)
5. [Response Format](#response-format)
6. [Template System](#template-system)
7. [Placeholder Replacement](#placeholder-replacement)
8. [Phone Number Validation](#phone-number-validation)
9. [SMS Length Limits](#sms-length-limits)
10. [Error Handling](#error-handling)
11. [Environment Variables](#environment-variables)
12. [Usage Examples](#usage-examples)
13. [Integration Guide](#integration-guide)
14. [Troubleshooting](#troubleshooting)

---

## Overview

The `send-sms` edge function provides a centralized service for sending templated SMS messages through Twilio. It retrieves message templates from the database, processes Jinja-style placeholders with provided variables, and delivers SMS via the Twilio API.

### Key Features

| Feature | Description |
|---------|-------------|
| **Template-based** | Templates stored in `zat_sms_template` table |
| **Dynamic placeholders** | Jinja-style `{{ variable }}` replacement |
| **E.164 validation** | Automatic phone number format validation |
| **Configurable sender** | Override from_phone per request |
| **Length validation** | Enforces Twilio's 1600 character limit |
| **Health monitoring** | Built-in health check endpoint |

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SEND SMS FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. REQUEST RECEIVED                                                        │
│     ├─ Validate Bearer token                                                │
│     └─ Parse { action: "send", payload: {...} }                             │
│                                                                             │
│  2. TEMPLATE RETRIEVAL                                                      │
│     ├─ Query zat_sms_template                                               │
│     └─ Fetch: _id, Name, Message Content, From Phone                        │
│                                                                             │
│  3. VALIDATION                                                              │
│     ├─ Validate to_phone (E.164 format)                                     │
│     ├─ Validate from_phone (E.164 format)                                   │
│     └─ Validate SMS length (max 1600 chars)                                 │
│                                                                             │
│  4. PLACEHOLDER PROCESSING                                                  │
│     ├─ Extract all {{ variable }} patterns                                  │
│     ├─ Warn on missing placeholder values                                   │
│     └─ Replace placeholders in message content                              │
│                                                                             │
│  5. TWILIO API CALL                                                         │
│     ├─ Build form-urlencoded request body                                   │
│     ├─ POST to Twilio Messages API (Basic Auth)                             │
│     └─ Extract message_sid from response                                    │
│                                                                             │
│  6. RESPONSE                                                                │
│     └─ Return { message_sid, template_id, to_phone, status, sent_at }       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Difference from send-email

| Aspect | send-email (SendGrid) | send-sms (Twilio) |
|--------|----------------------|-------------------|
| **Content-Type** | `application/json` | `application/x-www-form-urlencoded` |
| **Authentication** | Bearer token | HTTP Basic Auth (base64) |
| **Success Status** | `202 Accepted` | `201 Created` |
| **Message ID** | `x-message-id` header | `sid` in response body |
| **Content Escaping** | HTML escaping (XSS) | No escaping needed (plain text) |
| **Length Limit** | None | 1600 characters |

---

## Actions

| Action | Description | Auth Required |
|--------|-------------|---------------|
| `send` | Send an SMS using a template | Yes (Bearer token) |
| `health` | Check function health and secret configuration | No |

---

## Authentication

The `send` action requires a Bearer token in the Authorization header.

```http
Authorization: Bearer <token>
```

**Current Implementation**: Validates that a non-empty Bearer token is present. Future enhancement will validate against Supabase Auth or an API key whitelist.

**Health Check**: The `health` action does not require authentication.

---

## Request Format

### Send SMS Request

```http
POST /functions/v1/send-sms
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "action": "send",
  "payload": {
    "template_id": "string",
    "to_phone": "string",
    "from_phone": "string",
    "variables": {
      "key1": "value1",
      "key2": "value2"
    }
  }
}
```

### Payload Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `template_id` | string | **Yes** | ID of template in `zat_sms_template` table |
| `to_phone` | string | **Yes** | Recipient phone in E.164 format (e.g., `+15551234567`) |
| `from_phone` | string | No | Sender phone (defaults to template value or `TWILIO_FROM_PHONE` env var) |
| `variables` | object | **Yes** | Key-value pairs for placeholder replacement |

### Priority Order for From Phone

The function uses the following priority order for `from_phone`:

1. **Payload value** (if provided)
2. **Template value** (from database `From Phone` column)
3. **Environment variable** (`TWILIO_FROM_PHONE`)

If none are available, the request will fail with an error.

### Health Check Request

```http
POST /functions/v1/send-sms
Content-Type: application/json
```

```json
{
  "action": "health"
}
```

---

## Response Format

### Successful Send Response

```json
{
  "success": true,
  "data": {
    "message_sid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "template_id": "template_abc123",
    "to_phone": "+15551234567",
    "status": "queued",
    "sent_at": "2025-12-13T10:30:00.000Z"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `message_sid` | string \| undefined | Twilio message SID (unique identifier) |
| `template_id` | string | Template ID used for this SMS |
| `to_phone` | string | Recipient phone number |
| `status` | string | Always `"queued"` on success (Twilio queues messages) |
| `sent_at` | string | ISO 8601 timestamp of send time |

### Health Check Response

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-12-13T10:30:00.000Z",
    "actions": ["send", "health"],
    "secrets": {
      "TWILIO_ACCOUNT_SID": true,
      "TWILIO_AUTH_TOKEN": true,
      "TWILIO_FROM_PHONE": true
    }
  }
}
```

| Status Value | Meaning |
|--------------|---------|
| `healthy` | Required secrets (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) are configured |
| `unhealthy (missing secrets)` | One or more required secrets are missing |

### Error Response

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Validation error (missing fields, invalid phone format, SMS too long) |
| `401` | Authentication error (missing/invalid Bearer token) |
| `404` | Template not found |
| `405` | Method not allowed (only POST accepted) |
| `500` | Internal server error (Twilio failure, database error) |

---

## Template System

### Database Table

**Table Name**: `zat_sms_template`

### Table Schema

| Column | Type | Description |
|--------|------|-------------|
| `_id` | string | Unique template identifier (used as `template_id`) |
| `Name` | string | Human-readable template name |
| `Message Content` | string | SMS template with `{{ placeholder }}` syntax |
| `From Phone` | string | Default sender phone number (E.164 format) |

### Template Example

```
Hi {{ first_name }}, your proposal for {{ listing_address }} has been accepted! Your move-in date is {{ move_in_date }}. Reply STOP to unsubscribe.
```

---

## Placeholder Replacement

### Syntax

Placeholders use Jinja-style double curly braces:

```
{{ variable_name }}
```

### Supported Patterns

| Pattern | Valid | Example |
|---------|-------|---------|
| `{{ variable }}` | Yes | `{{ first_name }}` |
| `{{variable}}` | Yes | `{{first_name}}` |
| `{{ variable_name }}` | Yes | `{{ move_in_date }}` |
| `{{ variable-name }}` | Yes | `{{ listing-address }}` |
| `{{ nested.variable }}` | Yes | `{{ user.email }}` |
| `{{ 123 }}` | No | Numbers only not allowed |
| `{{ var name }}` | No | Spaces in name not allowed |

### Regex Pattern

```regex
/\{\{\s*([a-zA-Z0-9_\-.]+)\s*\}\}/g
```

### Missing Placeholder Behavior

When a placeholder is found in the template but no corresponding value is provided in `variables`:

1. **Warning logged** to console
2. **Original placeholder preserved** in output (not removed or replaced with empty string)
3. **SMS still sent** - missing placeholders do not cause failure

This allows for optional placeholders in templates.

### No HTML Escaping

Unlike email templates, SMS content is plain text and does **NOT** require HTML escaping. Variable values are inserted directly without transformation.

---

## Phone Number Validation

### E.164 Format

All phone numbers must be in E.164 international format:

```
+[country code][number]
```

### Validation Rules

| Rule | Description | Example |
|------|-------------|---------|
| Must start with `+` | International prefix required | `+1...` |
| Country code cannot start with 0 | Valid country codes are 1-9 | `+1...` (US), `+44...` (UK) |
| Total length: 2-15 digits | After the `+` sign | `+15551234567` (12 digits) |

### Regex Pattern

```regex
/^\+[1-9]\d{1,14}$/
```

### Valid Examples

| Phone Number | Country | Valid |
|--------------|---------|-------|
| `+15551234567` | USA | Yes |
| `+447911123456` | UK | Yes |
| `+61412345678` | Australia | Yes |
| `+919876543210` | India | Yes |

### Invalid Examples

| Phone Number | Reason |
|--------------|--------|
| `5551234567` | Missing `+` prefix |
| `+05551234567` | Country code starts with 0 |
| `+1-555-123-4567` | Contains dashes |
| `+1 555 123 4567` | Contains spaces |
| `(555) 123-4567` | US domestic format |

---

## SMS Length Limits

### Character Limits

| Type | Limit | Notes |
|------|-------|-------|
| **Single SMS** | 160 characters | GSM-7 encoding |
| **Concatenated SMS** | 1600 characters | Twilio maximum |
| **Unicode SMS** | 70 characters per segment | Emojis, special chars |

The `send-sms` function enforces a **maximum of 1600 characters** after placeholder processing.

### Segment Calculation

SMS messages longer than 160 characters are split into segments:

| Message Length | Segments | Notes |
|----------------|----------|-------|
| 1-160 chars | 1 | Single SMS |
| 161-306 chars | 2 | Concatenated (153 chars/segment due to headers) |
| 307-459 chars | 3 | Concatenated |
| ... | ... | ... |
| 1530-1600 chars | 11 | Maximum allowed |

**Cost Note**: Each segment is billed as a separate SMS by Twilio.

---

## Error Handling

### Error Types

| Error Type | HTTP Code | When Triggered |
|------------|-----------|----------------|
| `ValidationError` | 400 | Missing required fields, invalid phone format, SMS too long |
| `AuthenticationError` | 401 | Missing/empty Bearer token |
| `Template not found` | 500 | Template ID doesn't exist in database |
| `Template has no message content` | 500 | Template exists but `Message Content` is empty |
| `Twilio API error` | 500 | Twilio rejects the request |
| `Missing environment variables` | 500 | Required secrets not configured |

### Slack Error Reporting

All errors are reported to Slack via the error collector pattern (ONE RUN = ONE LOG):

```typescript
collector.add(error, 'context description');
collector.reportToSlack();
```

### Common Error Messages

| Message | Cause | Resolution |
|---------|-------|------------|
| `Missing or invalid Authorization header. Use Bearer token.` | No Authorization header | Add `Authorization: Bearer <token>` header |
| `Empty Bearer token` | Authorization header present but token is empty | Provide a non-empty token |
| `to_phone must be in E.164 format` | Phone number not in E.164 | Format as `+15551234567` |
| `SMS Template not found: xxx` | Template ID doesn't exist | Verify template ID in database |
| `SMS message exceeds maximum length of 1600 characters` | Processed message too long | Shorten template or variable values |
| `Twilio API error (401): ...` | Invalid Twilio credentials | Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` |
| `Twilio API error (21211): ...` | Invalid 'To' phone number | Verify recipient phone is valid |
| `Twilio API error (21212): ...` | Invalid 'From' phone number | Verify sender phone is a valid Twilio number |

---

## Environment Variables

### Required Secrets

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID (starts with `AC`) | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |

### Recommended Secrets

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_FROM_PHONE` | Default sender phone number (E.164) | `+15551234567` |

### Auto-Configured (Supabase)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin database access |

### Configuration Location

Secrets are configured in: **Supabase Dashboard > Project Settings > Edge Functions > Secrets**

---

## Usage Examples

### Basic SMS Send

```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/send-sms', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-auth-token',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'send',
    payload: {
      template_id: 'proposal_accepted_sms',
      to_phone: '+15551234567',
      variables: {
        first_name: 'John',
        listing_address: '123 Main Street',
        move_in_date: 'January 15, 2025'
      }
    }
  })
});

const result = await response.json();
console.log(result);
// {
//   success: true,
//   data: {
//     message_sid: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
//     template_id: 'proposal_accepted_sms',
//     to_phone: '+15551234567',
//     status: 'queued',
//     sent_at: '2025-12-13T10:30:00.000Z'
//   }
// }
```

### With Custom Sender

```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/send-sms', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-auth-token',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'send',
    payload: {
      template_id: 'verification_code',
      to_phone: '+15559876543',
      from_phone: '+15551112222',
      variables: {
        code: '123456',
        expiry_minutes: '10'
      }
    }
  })
});
```

### Health Check

```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/send-sms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'health'
  })
});

const result = await response.json();
console.log(result);
// {
//   success: true,
//   data: {
//     status: 'healthy',
//     timestamp: '2025-12-13T10:30:00.000Z',
//     actions: ['send', 'health'],
//     secrets: {
//       TWILIO_ACCOUNT_SID: true,
//       TWILIO_AUTH_TOKEN: true,
//       TWILIO_FROM_PHONE: true
//     }
//   }
// }
```

### Using with Supabase Client

```typescript
import { supabase } from '@/lib/supabase';

async function sendProposalNotificationSms(
  phone: string,
  guestName: string,
  listingAddress: string
): Promise<{ messageSid?: string; sentAt: string }> {
  const { data: session } = await supabase.auth.getSession();

  const response = await supabase.functions.invoke('send-sms', {
    body: {
      action: 'send',
      payload: {
        template_id: 'proposal_notification',
        to_phone: phone,
        variables: {
          guest_name: guestName,
          listing_address: listingAddress
        }
      }
    },
    headers: {
      Authorization: `Bearer ${session?.session?.access_token}`
    }
  });

  if (response.error) {
    console.error('Failed to send SMS:', response.error);
    throw response.error;
  }

  return {
    messageSid: response.data.message_sid,
    sentAt: response.data.sent_at
  };
}
```

---

## Integration Guide

### Step 1: Verify Function Health

Before integrating, verify the function is deployed and configured:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-sms \
  -H "Content-Type: application/json" \
  -d '{"action": "health"}'
```

Expected response: `"status": "healthy"` with `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` showing `true`.

### Step 2: Identify Template ID

Query the database to find available templates:

```sql
SELECT _id, "Name", "From Phone"
FROM zat_sms_template;
```

### Step 3: Extract Required Variables

Each template has specific placeholders. To find them:

1. Read the `Message Content` column
2. Look for `{{ variable }}` patterns
3. Map these to your data model

### Step 4: Implement the Call

```typescript
// Utility function for sending templated SMS
async function sendTemplatedSms(params: {
  templateId: string;
  toPhone: string;
  fromPhone?: string;
  variables: Record<string, string>;
}): Promise<{ messageSid?: string; sentAt: string }> {
  const { data: session } = await supabase.auth.getSession();

  if (!session?.session?.access_token) {
    throw new Error('No authenticated session');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send',
        payload: {
          template_id: params.templateId,
          to_phone: params.toPhone,
          from_phone: params.fromPhone,
          variables: params.variables
        }
      })
    }
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to send SMS');
  }

  return {
    messageSid: result.data.message_sid,
    sentAt: result.data.sent_at
  };
}
```

### Step 5: Error Handling

Always implement proper error handling:

```typescript
try {
  const result = await sendTemplatedSms({
    templateId: 'proposal_accepted',
    toPhone: guest.phone,
    variables: {
      guest_name: guest.firstName,
      listing_address: listing.address,
      move_in_date: proposal.startDate
    }
  });

  console.log(`SMS sent successfully: ${result.messageSid}`);
} catch (error) {
  // Log error but don't block user flow
  console.error('Failed to send notification SMS:', error);

  // Optionally: Queue for retry or alert monitoring
}
```

---

## Troubleshooting

### Common Issues

#### 1. "unhealthy (missing secrets)" in health check

**Cause**: Required environment variables not configured.

**Solution**:
1. Go to Supabase Dashboard > Project Settings > Edge Functions > Secrets
2. Add `TWILIO_ACCOUNT_SID` with your Twilio Account SID
3. Add `TWILIO_AUTH_TOKEN` with your Twilio Auth Token
4. (Optional) Add `TWILIO_FROM_PHONE` with your default sender number

#### 2. "SMS Template not found" error

**Cause**: The `template_id` doesn't match any `_id` in the templates table.

**Solution**:
1. Query the database: `SELECT _id FROM zat_sms_template`
2. Verify the exact `_id` value (case-sensitive)
3. Ensure the template record exists

#### 3. "to_phone must be in E.164 format" error

**Cause**: Phone number not in international format.

**Solution**:
1. Ensure phone starts with `+`
2. Include country code (e.g., `+1` for USA)
3. Remove all spaces, dashes, and parentheses
4. Example: `(555) 123-4567` → `+15551234567`

#### 4. Twilio API error (21211)

**Cause**: Invalid 'To' phone number.

**Solution**:
1. Verify the phone number is valid and reachable
2. Check that the number isn't on a blocklist
3. Verify the country is supported by your Twilio account

#### 5. Twilio API error (21212)

**Cause**: Invalid 'From' phone number.

**Solution**:
1. Verify the sender phone is a valid Twilio number
2. Check the number is registered in your Twilio account
3. Ensure the number is capable of sending SMS

#### 6. "SMS message exceeds maximum length" error

**Cause**: Processed message exceeds 1600 characters.

**Solution**:
1. Shorten the template content
2. Use shorter variable values
3. Split into multiple messages if necessary

#### 7. Placeholders appear in sent SMS

**Cause**: Variable names don't match placeholders in template.

**Solution**:
1. Extract placeholders from template using regex
2. Ensure all variable keys match exactly (case-sensitive)
3. Check for typos in variable names

### Debug Checklist

- [ ] Health check returns `"status": "healthy"`
- [ ] Required secrets show `true` in health response
- [ ] Template ID exists in database
- [ ] Template has non-empty `Message Content`
- [ ] All placeholder names match variable keys
- [ ] `to_phone` is in E.164 format
- [ ] `from_phone` (if provided) is in E.164 format
- [ ] Processed SMS is under 1600 characters
- [ ] Bearer token is included in Authorization header

---

## Related Documentation

- [Send Email Usage](./SEND_EMAIL_USAGE.md)
- [Edge Functions Overview](../README.md)
- [Shared Utilities](../SHARED_UTILITIES.md)
- [Quick Reference](../QUICK_REFERENCE.md)
- [Twilio SMS API Documentation](https://www.twilio.com/docs/sms/api/message-resource)
- [E.164 Phone Number Format](https://www.twilio.com/docs/glossary/what-e164)

---

## File References

| File | Purpose |
|------|---------|
| `supabase/functions/send-sms/index.ts` | Main router, action handling |
| `supabase/functions/send-sms/handlers/send.ts` | Send action implementation |
| `supabase/functions/send-sms/lib/templateProcessor.ts` | Placeholder replacement, length validation |
| `supabase/functions/send-sms/lib/twilioClient.ts` | Twilio API client (form-urlencoded) |
| `supabase/functions/send-sms/lib/types.ts` | TypeScript interfaces |
| `supabase/functions/send-sms/deno.json` | Import map configuration |
| `supabase/functions/_shared/validation.ts` | E.164 phone validation utility |

---

**Document Version**: 1.0
**Created**: 2025-12-13
**Author**: Claude Code
