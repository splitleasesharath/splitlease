# Send Email Edge Function

**Endpoint**: `POST /functions/v1/send-email`
**Purpose**: Send templated emails via SendGrid using pre-built SendGrid JSON templates
**Version**: 2.0
**Last Updated**: 2025-12-14

---

## Quick Start

```javascript
const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'send',
    payload: {
      template_id: '1756320055390x685004717147094100',
      to_email: 'recipient@example.com',
      from_email: 'tech@leasesplit.com',
      from_name: 'Split Lease',
      subject: 'Your Subject Here',
      variables: {
        title: 'Welcome!',
        bodytext1: 'First paragraph content...',
        bodytext2: 'Second paragraph content...',
        button_url: 'https://splitlease.com',
        button_text: 'Visit Site',
        logourl: 'https://splitlease.com/logo.png',
        preheadertext: 'Preview text for email clients',
      }
    }
  })
});
```

---

## Table of Contents

1. [Overview](#overview)
2. [Template System](#template-system)
3. [Placeholder Reference](#placeholder-reference)
4. [Request Format](#request-format)
5. [Response Format](#response-format)
6. [Usage Examples](#usage-examples)
7. [Configuration](#configuration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The `send-email` Edge Function sends templated emails through SendGrid. Templates are stored in the database as **complete SendGrid JSON payloads** with `$$placeholder$$` variables that get replaced at send time.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        SEND EMAIL FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. RECEIVE REQUEST                                             │
│     └─ { action: "send", payload: { template_id, variables } }  │
│                                                                 │
│  2. FETCH TEMPLATE                                              │
│     └─ Query reference_table.zat_email_html_template_*          │
│     └─ Get "Email Template JSON" (complete SendGrid payload)    │
│                                                                 │
│  3. REPLACE PLACEHOLDERS                                        │
│     └─ Find all $$variable$$ patterns                           │
│     └─ Replace with JSON-escaped values from variables          │
│                                                                 │
│  4. SEND TO SENDGRID                                            │
│     └─ Parse processed JSON                                     │
│     └─ POST directly to SendGrid API                            │
│                                                                 │
│  5. RETURN RESULT                                               │
│     └─ { message_id, status: "sent", sent_at }                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features

| Feature | Description |
|---------|-------------|
| **SendGrid JSON Templates** | Templates contain the full SendGrid API payload structure |
| **Double Dollar Placeholders** | `$$variable$$` syntax for variable replacement |
| **JSON-Safe Escaping** | Values are escaped for JSON (handles quotes, newlines, etc.) |
| **Flexible Variables** | Pass any variables needed by your template |

---

## Template System

### Template Structure

Templates are stored in `reference_table.zat_email_html_template_eg_sendbasicemailwf_` and contain a **complete SendGrid JSON payload**:

```json
{
  "personalizations": [
    {
      "to": [{ "email": "$$to_email$$" }]
    }
  ],
  "from": {
    "email": "$$from_email$$",
    "name": "$$from_name$$"
  },
  "subject": "$$subject$$",
  "content": [
    {
      "type": "text/plain",
      "value": "$$title$$\n\n$$bodytext1$$..."
    },
    {
      "type": "text/html",
      "value": "<!DOCTYPE html>...$$title$$...$$bodytext1$$..."
    }
  ]
}
```

### Database Schema

**Schema**: `reference_table`
**Table**: `zat_email_html_template_eg_sendbasicemailwf_`

| Column | Type | Description |
|--------|------|-------------|
| `_id` | text | Template ID (use this as `template_id`) |
| `Name` | text | Human-readable template name |
| `Email Template JSON` | text | Complete SendGrid JSON payload with `$$placeholders$$` |
| `Description` | text | Template description |
| `Placeholder` | text[] | Array of placeholder names used in template |

### Available Templates

| Template ID | Name | Description |
|-------------|------|-------------|
| `1756320055390x685004717147094100` | General Email Template 4 | Standard email with title, body, button |

---

## Placeholder Reference

### Syntax

Placeholders use **double dollar signs**:

```
$$variable_name$$
```

### "General Email Template 4" Placeholders

| Placeholder | Required | Description | Example Value |
|-------------|----------|-------------|---------------|
| `$$to_email$$` | **Yes** | Recipient email | Provided via `to_email` in payload |
| `$$from_email$$` | **Yes** | Sender email | Provided via `from_email` in payload |
| `$$from_name$$` | **Yes** | Sender name | Provided via `from_name` in payload |
| `$$subject$$` | **Yes** | Email subject | Provided via `subject` in payload |
| `$$title$$` | **Yes** | Email heading | `"Welcome to Split Lease!"` |
| `$$bodytext1$$` | **Yes** | First paragraph | `"Your booking has been confirmed..."` |
| `$$bodytext2$$` | **Yes** | Second paragraph | `"Next steps: ..."` |
| `$$button_url$$` | **Yes** | CTA button link | `"https://splitlease.com/dashboard"` |
| `$$button_text$$` | **Yes** | CTA button label | `"View Dashboard"` |
| `$$logourl$$` | **Yes** | Logo image URL | `"https://splitlease.com/logo.png"` |
| `$$preheadertext$$` | **Yes** | Email preview text | `"Your booking confirmation"` |
| `$$warningmessage$$` | No | Warning banner HTML | `""` (empty for no warning) |
| `$$banner$$` | No | Banner HTML content | `""` (empty for no banner) |
| `$$cc_email$$` | No | CC recipients JSON | `""` (empty for none) |
| `$$bcc_email$$` | No | BCC recipients JSON | `""` (empty for none) |
| `$$message_id$$` | No | Email threading ID | `""` (for new threads) |
| `$$in_reply_to$$` | No | Reply threading | `""` (for new threads) |
| `$$references$$` | No | Thread references | `""` (for new threads) |

### JSON Escaping

Variable values are automatically escaped for JSON safety:

| Character | Escaped To |
|-----------|------------|
| `"` | `\"` |
| `\` | `\\` |
| Newline | `\n` |
| Tab | `\t` |
| Other control chars | `\uXXXX` |

This means you can safely include quotes and newlines in your variable values.

---

## Request Format

### Send Email

```http
POST /functions/v1/send-email
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "action": "send",
  "payload": {
    "template_id": "1756320055390x685004717147094100",
    "to_email": "recipient@example.com",
    "to_name": "John Doe",
    "from_email": "tech@leasesplit.com",
    "from_name": "Split Lease",
    "subject": "Your Email Subject",
    "variables": {
      "title": "Email Title",
      "bodytext1": "First paragraph...",
      "bodytext2": "Second paragraph...",
      "button_url": "https://splitlease.com",
      "button_text": "Click Here",
      "logourl": "https://splitlease.com/logo.png",
      "preheadertext": "Preview text",
      "warningmessage": "",
      "banner": "",
      "cc_email": "",
      "bcc_email": "",
      "message_id": "",
      "in_reply_to": "",
      "references": ""
    }
  }
}
```

### Payload Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `template_id` | string | **Yes** | Template ID from database |
| `to_email` | string | **Yes** | Recipient email address |
| `to_name` | string | No | Recipient display name |
| `from_email` | string | No | Sender email (default: `noreply@splitlease.com`) |
| `from_name` | string | No | Sender name (default: `Split Lease`) |
| `subject` | string | No | Email subject (default: `Message from Split Lease`) |
| `variables` | object | **Yes** | All placeholder values for the template |

### Health Check

```json
{
  "action": "health"
}
```

No authentication required.

---

## Response Format

### Success

```json
{
  "success": true,
  "data": {
    "message_id": "abc123xyz",
    "template_id": "1756320055390x685004717147094100",
    "to_email": "recipient@example.com",
    "status": "sent",
    "sent_at": "2025-12-14T10:30:00.000Z"
  }
}
```

### Error

```json
{
  "success": false,
  "error": "Template not found: invalid_template_id"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Validation error (missing fields, invalid email) |
| 401 | Authentication error (missing Bearer token) |
| 500 | Server error (template not found, SendGrid error) |

---

## Usage Examples

### Basic Email (Frontend)

```javascript
import { supabase } from './lib/supabase';

async function sendWelcomeEmail(userEmail, userName) {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send',
        payload: {
          template_id: '1756320055390x685004717147094100',
          to_email: userEmail,
          to_name: userName,
          from_email: 'welcome@leasesplit.com',
          from_name: 'Split Lease',
          subject: 'Welcome to Split Lease!',
          variables: {
            title: `Welcome, ${userName}!`,
            bodytext1: 'Thank you for joining Split Lease. We\'re excited to help you find your perfect shared living space.',
            bodytext2: 'Get started by browsing available listings or creating your own listing.',
            button_url: 'https://splitlease.com/search',
            button_text: 'Browse Listings',
            logourl: 'https://splitlease.com/assets/images/split-lease-logo.png',
            preheadertext: 'Welcome to Split Lease - Your journey starts here',
            warningmessage: '',
            banner: '',
            cc_email: '',
            bcc_email: '',
            message_id: '',
            in_reply_to: '',
            references: '',
          }
        }
      })
    }
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data;
}
```

### Proposal Notification

```javascript
async function sendProposalNotification(host, guest, listing, proposal) {
  const { data: { session } } = await supabase.auth.getSession();

  await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'send',
      payload: {
        template_id: '1756320055390x685004717147094100',
        to_email: host.email,
        to_name: host.name,
        from_email: 'notifications@leasesplit.com',
        from_name: 'Split Lease',
        subject: `New proposal for ${listing.address}`,
        variables: {
          title: 'You have a new proposal!',
          bodytext1: `${guest.name} has submitted a proposal for your listing at ${listing.address}.`,
          bodytext2: `Proposed dates: ${proposal.startDate} - ${proposal.endDate}\nMonthly rent: $${proposal.monthlyRent}`,
          button_url: `https://splitlease.com/host-proposals/${host.id}`,
          button_text: 'View Proposal',
          logourl: 'https://splitlease.com/assets/images/split-lease-logo.png',
          preheadertext: `New proposal from ${guest.name}`,
          warningmessage: '',
          banner: '',
          cc_email: '',
          bcc_email: '',
          message_id: '',
          in_reply_to: '',
          references: '',
        }
      }
    })
  });
}
```

### Using Supabase Client

```javascript
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    action: 'send',
    payload: {
      template_id: '1756320055390x685004717147094100',
      to_email: 'user@example.com',
      from_email: 'tech@leasesplit.com',
      from_name: 'Split Lease',
      subject: 'Test Email',
      variables: {
        title: 'Test Title',
        bodytext1: 'Test body 1',
        bodytext2: 'Test body 2',
        button_url: 'https://splitlease.com',
        button_text: 'Click Me',
        logourl: 'https://splitlease.com/logo.png',
        preheadertext: 'Test preview',
        warningmessage: '',
        banner: '',
        cc_email: '',
        bcc_email: '',
        message_id: '',
        in_reply_to: '',
        references: '',
      }
    }
  }
});
```

---

## Configuration

### Required Environment Variables

Configure these in **Supabase Dashboard > Project Settings > Edge Functions > Secrets**:

| Variable | Description |
|----------|-------------|
| `SENDGRID_API_KEY` | Your SendGrid API key |
| `SENDGRID_EMAIL_ENDPOINT` | `https://api.sendgrid.com/v3/mail/send` |

### Required Database Configuration

The `reference_table` schema must be exposed to the API:

1. **Dashboard**: Go to **Project Settings > API > Exposed schemas** and add `reference_table`

2. **SQL Grants** (run in SQL Editor):
```sql
GRANT USAGE ON SCHEMA reference_table TO anon, authenticated, service_role;
GRANT SELECT ON reference_table.zat_email_html_template_eg_sendbasicemailwf_ TO anon, authenticated, service_role;
```

---

## Troubleshooting

### "Template not found"

**Cause**: Template ID doesn't exist or schema not accessible.

**Solution**:
1. Verify template exists: Query the database for the `_id`
2. Ensure `reference_table` schema is exposed in API settings
3. Run the SQL grants above

### "permission denied for schema reference_table"

**Cause**: Schema not exposed or grants not applied.

**Solution**:
1. Add `reference_table` to exposed schemas in Dashboard
2. Run the SQL grants in SQL Editor

### Placeholders not being replaced

**Cause**: Variable names don't match placeholder names.

**Solution**:
1. Check the `Placeholder` column in the template for exact names
2. Ensure variable keys match exactly (case-sensitive, no `$$` in key names)
3. Pass variables as: `{ "title": "value" }` not `{ "$$title$$": "value" }`

### "Invalid JSON after placeholder processing"

**Cause**: Malformed template or special characters in values.

**Solution**:
1. Values are auto-escaped for JSON, but check template JSON is valid
2. Empty string `""` is valid for optional placeholders

### Email appears blank

**Cause**: Required placeholders have empty values.

**Solution**: Ensure all required placeholders have non-empty values:
- `title`, `bodytext1`, `bodytext2`
- `button_url`, `button_text`
- `logourl`, `preheadertext`

---

## File References

| File | Purpose |
|------|---------|
| `supabase/functions/send-email/index.ts` | Main router |
| `supabase/functions/send-email/handlers/send.ts` | Send action logic |
| `supabase/functions/send-email/lib/templateProcessor.ts` | Placeholder replacement |
| `supabase/functions/send-email/lib/sendgridClient.ts` | SendGrid API client |
| `supabase/functions/send-email/lib/types.ts` | TypeScript types |

---

**Document Version**: 2.0
**Last Updated**: 2025-12-14
**Author**: Claude Code
