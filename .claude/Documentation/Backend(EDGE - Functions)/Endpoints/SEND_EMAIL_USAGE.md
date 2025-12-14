# Send Email Edge Function

**Endpoint**: `POST /functions/v1/send-email`
**Purpose**: Send templated emails via SendGrid with dynamic placeholder replacement
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
8. [Error Handling](#error-handling)
9. [Environment Variables](#environment-variables)
10. [Usage Examples](#usage-examples)
11. [Integration Guide](#integration-guide)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The `send-email` edge function provides a centralized service for sending templated emails through SendGrid. It retrieves HTML templates from the database, processes Jinja-style placeholders with provided variables, and delivers emails via the SendGrid API.

### Key Features

| Feature | Description |
|---------|-------------|
| **Template-based** | Templates stored in `zat_email_html_template_eg_sendbasicemailwf_` table |
| **Dynamic placeholders** | Jinja-style `{{ variable }}` replacement |
| **XSS protection** | Automatic HTML escaping of variable values |
| **Configurable sender** | Override from_email/from_name per request |
| **Subject templating** | Subject line also supports placeholder replacement |
| **Health monitoring** | Built-in health check endpoint |

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SEND EMAIL FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. REQUEST RECEIVED                                                        │
│     ├─ Validate Bearer token                                                │
│     └─ Parse { action: "send", payload: {...} }                             │
│                                                                             │
│  2. TEMPLATE RETRIEVAL                                                      │
│     ├─ Query zat_email_html_template_eg_sendbasicemailwf_                   │
│     └─ Fetch: _id, Name, HTML Content, Subject, From Email, From Name       │
│                                                                             │
│  3. PLACEHOLDER PROCESSING                                                  │
│     ├─ Extract all {{ variable }} patterns                                  │
│     ├─ Validate provided variables                                          │
│     ├─ Escape HTML in values (XSS prevention)                               │
│     └─ Replace placeholders in HTML and subject                             │
│                                                                             │
│  4. SENDGRID API CALL                                                       │
│     ├─ Build SendGrid request body                                          │
│     ├─ POST to SendGrid endpoint                                            │
│     └─ Extract message_id from response                                     │
│                                                                             │
│  5. RESPONSE                                                                │
│     └─ Return { message_id, template_id, to_email, status, sent_at }        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Actions

| Action | Description | Auth Required |
|--------|-------------|---------------|
| `send` | Send an email using a template | Yes (Bearer token) |
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

### Send Email Request

```http
POST /functions/v1/send-email
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "action": "send",
  "payload": {
    "template_id": "string",
    "to_email": "string",
    "to_name": "string",
    "from_email": "string",
    "from_name": "string",
    "subject": "string",
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
| `template_id` | string | **Yes** | ID of template in `zat_email_html_template_eg_sendbasicemailwf_` table |
| `to_email` | string | **Yes** | Recipient email address (validated format) |
| `to_name` | string | No | Recipient display name |
| `from_email` | string | No | Sender email (defaults to template value or `noreply@splitlease.com`) |
| `from_name` | string | No | Sender display name (defaults to template value or `Split Lease`) |
| `subject` | string | No | Email subject (defaults to template value or `Message from Split Lease`) |
| `variables` | object | **Yes** | Key-value pairs for placeholder replacement |

### Priority Order for Sender/Subject

The function uses the following priority order for `from_email`, `from_name`, and `subject`:

1. **Payload value** (if provided)
2. **Template value** (from database)
3. **Default value** (hardcoded fallback)

| Field | Default Value |
|-------|---------------|
| `from_email` | `noreply@splitlease.com` |
| `from_name` | `Split Lease` |
| `subject` | `Message from Split Lease` |

### Health Check Request

```http
POST /functions/v1/send-email
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
    "message_id": "abc123xyz",
    "template_id": "template_abc123",
    "to_email": "recipient@example.com",
    "status": "sent",
    "sent_at": "2025-12-13T10:30:00.000Z"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `message_id` | string \| undefined | SendGrid message ID (from `x-message-id` header) |
| `template_id` | string | Template ID used for this email |
| `to_email` | string | Recipient email address |
| `status` | string | Always `"sent"` on success |
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
      "SENDGRID_API_KEY": true,
      "SENDGRID_EMAIL_ENDPOINT": true
    }
  }
}
```

| Status Value | Meaning |
|--------------|---------|
| `healthy` | All required secrets are configured |
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
| `400` | Validation error (missing fields, invalid email format) |
| `401` | Authentication error (missing/invalid Bearer token) |
| `404` | Template not found |
| `405` | Method not allowed (only POST accepted) |
| `500` | Internal server error (SendGrid failure, database error) |

---

## Template System

### Database Table

**Table Name**: `zat_email_html_template_eg_sendbasicemailwf_`

### Table Schema

| Column | Type | Description |
|--------|------|-------------|
| `_id` | string | Unique template identifier (used as `template_id`) |
| `Name` | string | Human-readable template name |
| `HTML Content` | string | HTML template with `{{ placeholder }}` syntax |
| `Subject` | string | Default email subject line |
| `From Email` | string | Default sender email |
| `From Name` | string | Default sender display name |

### Template Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Welcome to Split Lease</title>
</head>
<body>
  <h1>Hello, {{ first_name }}!</h1>
  <p>Welcome to Split Lease. Your account has been created successfully.</p>
  <p>Your listing at {{ listing_address }} is now active.</p>
  <p>Move-in date: {{ move_in_date }}</p>
  <footer>
    <p>Best regards,<br>The Split Lease Team</p>
  </footer>
</body>
</html>
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
3. **Email still sent** - missing placeholders do not cause failure

This allows for optional placeholders in templates.

### XSS Protection

All variable values are HTML-escaped before insertion to prevent XSS attacks:

| Character | Escaped To |
|-----------|------------|
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;` |
| `'` | `&#39;` |

**Example**:
```javascript
// Input variable
{ "user_input": "<script>alert('xss')</script>" }

// Output in email
&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;
```

### Subject Line Processing

The subject line also supports placeholder replacement using the same syntax:

```json
{
  "subject": "Your proposal for {{ listing_address }} has been accepted!"
}
```

---

## Error Handling

### Error Types

| Error Type | HTTP Code | When Triggered |
|------------|-----------|----------------|
| `ValidationError` | 400 | Missing required fields, invalid email format |
| `AuthenticationError` | 401 | Missing/empty Bearer token |
| `Template not found` | 500 | Template ID doesn't exist in database |
| `Template has no HTML content` | 500 | Template exists but `HTML Content` is empty |
| `SendGrid API error` | 500 | SendGrid rejects the request |
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
| `Missing or invalid Authorization header. Use Bearer token.` | No Authorization header or wrong format | Add `Authorization: Bearer <token>` header |
| `Empty Bearer token` | Authorization header present but token is empty | Provide a non-empty token |
| `Validation error: Missing required field: template_id` | `template_id` not provided | Include `template_id` in payload |
| `Validation error: Invalid email format: xxx` | `to_email` fails regex validation | Provide valid email address |
| `Template not found: xxx` | Template ID doesn't exist | Verify template ID exists in database |
| `SendGrid API error (403): {...}` | SendGrid authentication failed | Verify `SENDGRID_API_KEY` is correct |

---

## Environment Variables

### Required Secrets

| Variable | Description | Example |
|----------|-------------|---------|
| `SENDGRID_API_KEY` | SendGrid API authentication key | `SG.xxxxx...` |
| `SENDGRID_EMAIL_ENDPOINT` | SendGrid mail send endpoint | `https://api.sendgrid.com/v3/mail/send` |

### Auto-Configured (Supabase)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin database access |

### Configuration Location

Secrets are configured in: **Supabase Dashboard > Project Settings > Edge Functions > Secrets**

---

## Usage Examples

### Basic Email Send

```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/send-email', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-auth-token',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'send',
    payload: {
      template_id: 'welcome_email_template',
      to_email: 'user@example.com',
      to_name: 'John Doe',
      variables: {
        first_name: 'John',
        listing_address: '123 Main Street, Apt 4B',
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
//     message_id: 'abc123xyz',
//     template_id: 'welcome_email_template',
//     to_email: 'user@example.com',
//     status: 'sent',
//     sent_at: '2025-12-13T10:30:00.000Z'
//   }
// }
```

### With Custom Sender

```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/send-email', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-auth-token',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'send',
    payload: {
      template_id: 'proposal_accepted',
      to_email: 'guest@example.com',
      to_name: 'Jane Smith',
      from_email: 'notifications@splitlease.com',
      from_name: 'Split Lease Notifications',
      subject: 'Great news! Your proposal was accepted',
      variables: {
        guest_name: 'Jane',
        host_name: 'Michael',
        listing_address: '456 Oak Avenue',
        monthly_rent: '$2,500',
        start_date: 'February 1, 2025',
        end_date: 'July 31, 2025'
      }
    }
  })
});
```

### Health Check

```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/send-email', {
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
//       SENDGRID_API_KEY: true,
//       SENDGRID_EMAIL_ENDPOINT: true
//     }
//   }
// }
```

### Using with Supabase Client

```typescript
import { supabase } from '@/lib/supabase';

async function sendWelcomeEmail(user: { email: string; name: string }) {
  const { data: session } = await supabase.auth.getSession();

  const response = await supabase.functions.invoke('send-email', {
    body: {
      action: 'send',
      payload: {
        template_id: 'welcome_email',
        to_email: user.email,
        to_name: user.name,
        variables: {
          first_name: user.name.split(' ')[0],
          signup_date: new Date().toLocaleDateString()
        }
      }
    },
    headers: {
      Authorization: `Bearer ${session?.session?.access_token}`
    }
  });

  if (response.error) {
    console.error('Failed to send welcome email:', response.error);
    throw response.error;
  }

  return response.data;
}
```

---

## Integration Guide

### Step 1: Verify Function Health

Before integrating, verify the function is deployed and configured:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -d '{"action": "health"}'
```

Expected response: `"status": "healthy"` with all secrets showing `true`.

### Step 2: Identify Template ID

Query the database to find available templates:

```sql
SELECT _id, "Name", "Subject"
FROM zat_email_html_template_eg_sendbasicemailwf_;
```

### Step 3: Extract Required Variables

Each template has specific placeholders. To find them:

1. Read the `HTML Content` column
2. Look for `{{ variable }}` patterns
3. Map these to your data model

### Step 4: Implement the Call

```typescript
// Utility function for sending templated emails
async function sendTemplatedEmail(params: {
  templateId: string;
  toEmail: string;
  toName?: string;
  variables: Record<string, string>;
  subject?: string;
}): Promise<{ messageId?: string; sentAt: string }> {
  const { data: session } = await supabase.auth.getSession();

  if (!session?.session?.access_token) {
    throw new Error('No authenticated session');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
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
          to_email: params.toEmail,
          to_name: params.toName,
          subject: params.subject,
          variables: params.variables
        }
      })
    }
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to send email');
  }

  return {
    messageId: result.data.message_id,
    sentAt: result.data.sent_at
  };
}
```

### Step 5: Error Handling

Always implement proper error handling:

```typescript
try {
  const result = await sendTemplatedEmail({
    templateId: 'proposal_notification',
    toEmail: host.email,
    toName: host.name,
    variables: {
      guest_name: proposal.guestName,
      listing_title: listing.title,
      proposed_dates: `${proposal.startDate} - ${proposal.endDate}`
    }
  });

  console.log(`Email sent successfully: ${result.messageId}`);
} catch (error) {
  // Log error but don't block user flow
  console.error('Failed to send notification email:', error);

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
2. Add `SENDGRID_API_KEY` with your SendGrid API key
3. Add `SENDGRID_EMAIL_ENDPOINT` with value `https://api.sendgrid.com/v3/mail/send`

#### 2. "Template not found" error

**Cause**: The `template_id` doesn't match any `_id` in the templates table.

**Solution**:
1. Query the database: `SELECT _id FROM zat_email_html_template_eg_sendbasicemailwf_`
2. Verify the exact `_id` value (case-sensitive)
3. Ensure the template record exists

#### 3. SendGrid API error (403)

**Cause**: Invalid SendGrid API key or insufficient permissions.

**Solution**:
1. Verify API key in SendGrid dashboard
2. Ensure API key has "Mail Send" permission
3. Update `SENDGRID_API_KEY` secret in Supabase

#### 4. Placeholders appear in sent email

**Cause**: Variable names don't match placeholders in template.

**Solution**:
1. Extract placeholders from template using regex
2. Ensure all variable keys match exactly (case-sensitive)
3. Check for typos in variable names

#### 5. "Invalid email format" error

**Cause**: `to_email` doesn't pass email validation.

**Solution**:
1. Verify email format: `user@domain.com`
2. Remove leading/trailing whitespace
3. Check for invisible characters

### Debug Checklist

- [ ] Health check returns `"status": "healthy"`
- [ ] All secrets show `true` in health response
- [ ] Template ID exists in database
- [ ] Template has non-empty `HTML Content`
- [ ] All placeholder names match variable keys
- [ ] `to_email` is valid email format
- [ ] Bearer token is included in Authorization header

---

## Related Documentation

- [Edge Functions Overview](../README.md)
- [Shared Utilities](../SHARED_UTILITIES.md)
- [Quick Reference](../QUICK_REFERENCE.md)
- [SendGrid API Documentation](https://docs.sendgrid.com/api-reference/mail-send/mail-send)

---

## File References

| File | Purpose |
|------|---------|
| `supabase/functions/send-email/index.ts` | Main router, action handling |
| `supabase/functions/send-email/handlers/send.ts` | Send action implementation |
| `supabase/functions/send-email/lib/templateProcessor.ts` | Placeholder replacement |
| `supabase/functions/send-email/lib/sendgridClient.ts` | SendGrid API client |
| `supabase/functions/send-email/lib/types.ts` | TypeScript interfaces |
| `supabase/functions/send-email/deno.json` | Import map configuration |

---

**Document Version**: 1.0
**Created**: 2025-12-13
**Author**: Claude Code
