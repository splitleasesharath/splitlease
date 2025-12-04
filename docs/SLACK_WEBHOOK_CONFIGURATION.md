# Slack Webhook Environment Variables - Configuration Guide

**Date**: 2025-12-04
**Status**: Environment variables NOT configured
**Impact**: FAQ inquiry submissions to Slack fail

---

## Problem Summary

The Slack Edge Function is rejecting all FAQ inquiry requests with:
```json
{
  "success": false,
  "error": "Server configuration error: Slack webhooks not configured"
}
```

**Root Cause**: The required Supabase secrets are missing from the dashboard.

---

## Diagnosis

### Test Results

Direct API test:
```bash
curl -X POST "https://qcfifybkaddcoimjroca.supabase.co/functions/v1/slack" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "faq_inquiry",
    "payload": {
      "name": "Test User",
      "email": "test@example.com",
      "inquiry": "Test inquiry"
    }
  }'
```

**Response**:
```json
{
  "success": false,
  "error": "Server configuration error: Slack webhooks not configured"
}
```

### Code Location

Function checks for webhooks at `supabase/functions/slack/index.ts`:
```typescript
const webhookAcquisition = Deno.env.get('SLACK_WEBHOOK_ACQUISITION');
const webhookGeneral = Deno.env.get('SLACK_WEBHOOK_GENERAL');

if (!webhookAcquisition || !webhookGeneral) {
  throw new Error('Server configuration error: Slack webhooks not configured');
}
```

Both environment variables are **undefined**.

---

## Required Configuration

### Step 1: Obtain Slack Webhook URLs

1. Go to [Slack API Applications](https://api.slack.com/apps)
2. Select your Split Lease workspace app
3. Navigate to **Incoming Webhooks** section
4. Create webhooks for each channel:
   - **Acquisition Channel**: #acquisition (or equivalent)
   - **General Channel**: #general (or equivalent)
5. Copy the webhook URLs

**Webhook URL format**:
```
<YOUR_SLACK_WEBHOOK_URL>
```

### Step 2: Configure Secrets in Supabase Dashboard

1. Navigate to [Supabase Dashboard](https://app.supabase.com)
2. Select **Split Lease** project
3. Go to **Project Settings** → **Secrets**
4. Create two secrets:

**Secret 1: Acquisition Webhook**
| Field | Value |
|-------|-------|
| Name | `SLACK_WEBHOOK_ACQUISITION` |
| Value | Your Slack acquisition channel webhook URL |

**Secret 2: General Webhook**
| Field | Value |
|-------|-------|
| Name | `SLACK_WEBHOOK_GENERAL` |
| Value | Your Slack general channel webhook URL |

5. Click **Save** for each secret

### Step 3: Verify Configuration

Test the function with:
```bash
curl -X POST "https://qcfifybkaddcoimjroca.supabase.co/functions/v1/slack" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "faq_inquiry",
    "payload": {
      "name": "John Doe",
      "email": "john@example.com",
      "inquiry": "What are your rental policies?"
    }
  }'
```

**Expected response on success**:
```json
{
  "success": true,
  "data": {
    "message": "Inquiry sent successfully"
  }
}
```

---

## Function Specifications

### Endpoint
```
POST /functions/v1/slack
```

### Supported Actions

| Action | Description |
|--------|-------------|
| `faq_inquiry` | Send FAQ inquiries to Slack channels |

### Request Format

```json
{
  "action": "faq_inquiry",
  "payload": {
    "name": "string (required)",
    "email": "string (required, valid email)",
    "inquiry": "string (required)"
  }
}
```

### Response Format

**Success**:
```json
{
  "success": true,
  "data": {
    "message": "Inquiry sent successfully"
  }
}
```

**Error** (missing secrets):
```json
{
  "success": false,
  "error": "Server configuration error: Slack webhooks not configured"
}
```

**Error** (validation):
```json
{
  "success": false,
  "error": "Missing required field: name"
}
```

---

## Implementation Notes

### Multi-Channel Delivery
The function sends the inquiry to **both channels atomically**:
- Uses `Promise.allSettled()` to prevent failure if one webhook fails
- Succeeds if **at least one webhook** responds with 200 OK
- Both channels receiving the message is optimal but not required

### Message Format
Inquiries appear in Slack as:
```
*New FAQ Inquiry*

*Name:* [User Name]
*Email:* [User Email]
*Inquiry:*
[Full inquiry text]
```

### Security
- No authentication required (public endpoint)
- Webhook URLs stored securely in Supabase secrets
- Never exposed to frontend code
- Email validation performed before webhook calls

---

## Troubleshooting

### Still getting "webhooks not configured" error

**Check**:
1. Secrets are saved in Supabase Dashboard (not just typed)
2. Secret names are exactly `SLACK_WEBHOOK_ACQUISITION` and `SLACK_WEBHOOK_GENERAL`
3. Webhook URLs are complete (start with `https://hooks.slack.com`)
4. No extra spaces or newlines in webhook URLs

### Webhook returning 401/403

**Check**:
1. Webhook URL is correct and hasn't been revoked
2. Slack workspace hasn't disabled webhook integration
3. Channel still exists and app has permission to post

### Webhook returning 500

**Check**:
1. Slack API status: [api.slack.com/status](https://api.slack.com/status)
2. Function logs in Supabase Dashboard for details
3. Message payload format (see "Message Format" section above)

---

## References

- **Function Location**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\supabase\functions\slack\index.ts`
- **Function Documentation**: `supabase/CLAUDE.md` (Lines 280-308)
- **Supabase Secrets**: `supabase/CLAUDE.md` (Lines 312-323)
- **Slack API**: https://api.slack.com/messaging/webhooks

---

**Version**: 1.0
**Status**: Configuration Guide
**Last Updated**: 2025-12-04
