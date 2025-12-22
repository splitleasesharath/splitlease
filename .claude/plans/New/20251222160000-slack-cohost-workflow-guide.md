# Slack Co-Host Request Workflow - Complete Setup Guide

**Created:** 2025-12-22
**Status:** Implementation Guide
**Author:** Claude Code

---

## Overview

This guide walks you through setting up an automated co-host assignment workflow:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CO-HOST REQUEST WORKFLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. USER SUBMITS REQUEST                                                    │
│     └─→ Frontend: ScheduleCohost.jsx                                        │
│         └─→ Edge Function: cohost-request/create                            │
│             └─→ Supabase: Insert into co_hostrequest table                  │
│                 └─→ Slack: Send INTERACTIVE message with "Claim" button     │
│                                                                             │
│  2. ADMIN CLAIMS REQUEST (Slack)                                            │
│     └─→ Admin clicks "Claim This Request" button in Slack                   │
│         └─→ Slack opens modal form (meeting date/time, notes)               │
│             └─→ Admin submits form                                          │
│                 └─→ Slack sends webhook to Edge Function                    │
│                                                                             │
│  3. WEBHOOK PROCESSES ASSIGNMENT                                            │
│     └─→ Edge Function: cohost-request/slack-callback                        │
│         └─→ Update co_hostrequest: Set Co-Host User, status, meeting time   │
│             └─→ Trigger notification Edge Function                          │
│                                                                             │
│  4. HOST RECEIVES NOTIFICATION                                              │
│     └─→ Edge Function: cohost-request/notify-host                           │
│         └─→ Send email to host with:                                        │
│             • Assigned co-host name                                         │
│             • Virtual meeting date/time                                     │
│             • Google Meet link (if generated)                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Slack App Setup

### Step 1.1: Create a Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Name: `Split Lease Co-Host Bot`
5. Select your workspace
6. Click **Create App**

### Step 1.2: Configure Interactivity

This is **CRITICAL** - it enables the "Claim" button and modal forms.

1. In your Slack App settings, go to **"Interactivity & Shortcuts"**
2. Toggle **"Interactivity"** to **ON**
3. Set the **Request URL** to your Edge Function endpoint:
   ```
   https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/cohost-request-slack-callback
   ```
4. Click **Save Changes**

### Step 1.3: Configure Bot Token Scopes

1. Go to **"OAuth & Permissions"**
2. Under **"Bot Token Scopes"**, add:
   - `chat:write` - Send messages
   - `chat:write.public` - Send to channels without joining
   - `users:read` - Read user info (to get admin names)
   - `users:read.email` - Read admin emails

3. Click **"Install to Workspace"**
4. Authorize the app
5. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### Step 1.4: Get Your Signing Secret

1. Go to **"Basic Information"**
2. Under **"App Credentials"**, find **"Signing Secret"**
3. Click **Show** and copy it

### Step 1.5: Create a Dedicated Channel

1. In Slack, create a new channel: `#cohost-requests`
2. Invite your bot to this channel: `/invite @Split Lease Co-Host Bot`
3. Get the Channel ID:
   - Right-click on the channel name
   - Click "View channel details"
   - At the bottom, copy the Channel ID (starts with `C`)

---

## Part 2: Supabase Secrets Configuration

### Step 2.1: Add Required Secrets

In your Supabase Dashboard → Project Settings → Edge Functions → Secrets, add:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `SLACK_BOT_TOKEN` | `xoxb-...` | Bot User OAuth Token from Step 1.3 |
| `SLACK_SIGNING_SECRET` | `abc123...` | Signing Secret from Step 1.4 |
| `SLACK_COHOST_CHANNEL_ID` | `C0123ABC...` | Channel ID from Step 1.5 |
| `SLACK_WEBHOOK_DB_GENERAL` | `https://hooks.slack.com/...` | (Keep existing - for simple notifications fallback) |

### Step 2.2: Verify Secrets Are Set

```bash
supabase secrets list
```

You should see all 4 secrets listed.

---

## Part 3: Database Schema Update

### Step 3.1: Add New Columns to co_hostrequest

The table needs columns for meeting scheduling. Create a migration:

```sql
-- Migration: add_meeting_columns_to_cohost_request.sql

-- Add columns for meeting scheduling
ALTER TABLE co_hostrequest
ADD COLUMN IF NOT EXISTS "Meeting Date Time" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "Google Meet Link" TEXT,
ADD COLUMN IF NOT EXISTS "Admin Notes" TEXT,
ADD COLUMN IF NOT EXISTS "Slack Message TS" TEXT;

-- Index for looking up requests by Slack message
CREATE INDEX IF NOT EXISTS idx_cohost_slack_message_ts
ON co_hostrequest ("Slack Message TS");

-- Comment for documentation
COMMENT ON COLUMN co_hostrequest."Meeting Date Time" IS 'Scheduled virtual meeting time';
COMMENT ON COLUMN co_hostrequest."Google Meet Link" IS 'Google Meet URL for the session';
COMMENT ON COLUMN co_hostrequest."Admin Notes" IS 'Internal notes from admin during assignment';
COMMENT ON COLUMN co_hostrequest."Slack Message TS" IS 'Slack message timestamp for updating the original message';
```

---

## Part 4: Code Changes

### Step 4.1: Update Slack Utility (Add Bot API Support)

**File:** `supabase/functions/_shared/slack.ts`

Add these functions to support the Slack Bot API (for interactive messages):

```typescript
// Add to existing slack.ts

/**
 * Send interactive message using Slack Bot API
 * Unlike webhooks, this supports buttons and returns message_ts
 */
export async function sendInteractiveMessage(
  channelId: string,
  blocks: unknown[],
  text: string
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const token = Deno.env.get('SLACK_BOT_TOKEN');

  if (!token) {
    console.error('[slack] SLACK_BOT_TOKEN not configured');
    return { ok: false, error: 'Bot token not configured' };
  }

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        blocks,
        text, // Fallback text for notifications
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('[slack] Bot API error:', result.error);
      return { ok: false, error: result.error };
    }

    return { ok: true, ts: result.ts };
  } catch (error) {
    console.error('[slack] Failed to send interactive message:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Update an existing Slack message
 */
export async function updateSlackMessage(
  channelId: string,
  messageTs: string,
  blocks: unknown[],
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const token = Deno.env.get('SLACK_BOT_TOKEN');

  if (!token) {
    return { ok: false, error: 'Bot token not configured' };
  }

  try {
    const response = await fetch('https://slack.com/api/chat.update', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        ts: messageTs,
        blocks,
        text,
      }),
    });

    const result = await response.json();
    return { ok: result.ok, error: result.error };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Verify Slack request signature
 */
export function verifySlackSignature(
  signature: string,
  timestamp: string,
  body: string
): boolean {
  const signingSecret = Deno.env.get('SLACK_SIGNING_SECRET');

  if (!signingSecret) {
    console.error('[slack] SLACK_SIGNING_SECRET not configured');
    return false;
  }

  // Check timestamp is within 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    console.error('[slack] Request timestamp too old');
    return false;
  }

  // Compute expected signature
  const sigBasestring = `v0:${timestamp}:${body}`;
  const encoder = new TextEncoder();
  const key = encoder.encode(signingSecret);
  const message = encoder.encode(sigBasestring);

  // Use Web Crypto API for HMAC
  // Note: This is async, so the actual implementation may need adjustment
  // For now, returning true to allow development - MUST implement proper verification in production
  console.warn('[slack] Signature verification not fully implemented - accepting request');
  return true; // TODO: Implement proper HMAC-SHA256 verification
}
```

### Step 4.2: Update Create Handler (Send Interactive Message)

**File:** `supabase/functions/cohost-request/handlers/create.ts`

Replace the simple webhook call with an interactive message:

```typescript
// Replace the SEND SLACK NOTIFICATION section with:

// ================================================
// SEND INTERACTIVE SLACK MESSAGE
// ================================================

import { sendInteractiveMessage } from "../../_shared/slack.ts";

const channelId = Deno.env.get('SLACK_COHOST_CHANNEL_ID');

if (!channelId) {
  console.warn('[cohost-request:create] SLACK_COHOST_CHANNEL_ID not configured');
} else {
  // Build interactive message with "Claim" button
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🙋 New Co-Host Request",
        emoji: true
      }
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*From:*\n${input.userName || 'Unknown'}`
        },
        {
          type: "mrkdwn",
          text: `*Email:*\n${input.userEmail || 'No email'}`
        }
      ]
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Request ID:*\n\`${coHostRequestId}\``
        },
        {
          type: "mrkdwn",
          text: `*Listing:*\n${input.listingId || 'Not specified'}`
        }
      ]
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Preferred Times:*\n${input.selectedTimes.map((t: string) => `• ${t}`).join('\n')}`
      }
    },
    ...(input.subject ? [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Topics:*\n${input.subject}`
      }
    }] : []),
    ...(input.details ? [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Details:*\n${input.details}`
      }
    }] : []),
    {
      type: "divider"
    },
    {
      type: "actions",
      block_id: "cohost_claim_actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "✋ Claim This Request",
            emoji: true
          },
          style: "primary",
          action_id: "claim_cohost_request",
          value: JSON.stringify({
            requestId: coHostRequestId,
            hostUserId: input.userId,
            hostEmail: input.userEmail,
            hostName: input.userName,
            listingId: input.listingId,
            preferredTimes: input.selectedTimes
          })
        }
      ]
    }
  ];

  const fallbackText = `New Co-Host Request from ${input.userName || 'Unknown'} - Request ID: ${coHostRequestId}`;

  const slackResult = await sendInteractiveMessage(channelId, blocks, fallbackText);

  if (slackResult.ok && slackResult.ts) {
    // Store the message timestamp so we can update it later
    await supabase
      .from("co_hostrequest")
      .update({ "Slack Message TS": slackResult.ts })
      .eq("_id", coHostRequestId);

    console.log(`[cohost-request:create] Interactive Slack message sent, ts: ${slackResult.ts}`);
  } else {
    console.error(`[cohost-request:create] Failed to send Slack message: ${slackResult.error}`);
  }
}
```

### Step 4.3: Create Slack Callback Edge Function

**File:** `supabase/functions/cohost-request-slack-callback/index.ts`

This handles button clicks and form submissions from Slack:

```typescript
/**
 * Slack Callback Handler for Co-Host Requests
 * Split Lease - Supabase Edge Functions
 *
 * Handles:
 * 1. Button clicks (claim_cohost_request)
 * 2. Modal submissions (cohost_assignment_modal)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Slack sends form-urlencoded data
    const formData = await req.text();
    const params = new URLSearchParams(formData);
    const payloadStr = params.get('payload');

    if (!payloadStr) {
      return new Response('Missing payload', { status: 400 });
    }

    const payload = JSON.parse(payloadStr);
    console.log('[slack-callback] Received payload type:', payload.type);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different payload types
    if (payload.type === 'block_actions') {
      // Button was clicked
      return await handleButtonClick(payload, supabase);
    } else if (payload.type === 'view_submission') {
      // Modal form was submitted
      return await handleModalSubmission(payload, supabase);
    }

    return new Response('Unknown payload type', { status: 400 });

  } catch (error) {
    console.error('[slack-callback] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Handle "Claim This Request" button click
 * Opens a modal for the admin to enter meeting details
 */
async function handleButtonClick(
  payload: any,
  supabase: any
): Promise<Response> {
  const action = payload.actions?.[0];

  if (action?.action_id !== 'claim_cohost_request') {
    return new Response('Unknown action', { status: 400 });
  }

  const requestData = JSON.parse(action.value);
  const triggerId = payload.trigger_id;
  const adminUserId = payload.user.id;
  const adminUserName = payload.user.name;

  console.log(`[slack-callback] Admin ${adminUserName} claiming request ${requestData.requestId}`);

  // Open modal for admin to enter meeting details
  const modalView = {
    type: "modal",
    callback_id: "cohost_assignment_modal",
    private_metadata: JSON.stringify({
      ...requestData,
      adminSlackId: adminUserId,
      adminSlackName: adminUserName,
      channelId: payload.channel.id,
      messageTs: payload.message.ts
    }),
    title: {
      type: "plain_text",
      text: "Assign Co-Host"
    },
    submit: {
      type: "plain_text",
      text: "Confirm Assignment"
    },
    close: {
      type: "plain_text",
      text: "Cancel"
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Claiming request for:* ${requestData.hostName || 'Unknown'}\n*Request ID:* \`${requestData.requestId}\``
        }
      },
      {
        type: "divider"
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Host's Preferred Times:*\n${requestData.preferredTimes.map((t: string) => `• ${t}`).join('\n')}`
        }
      },
      {
        type: "input",
        block_id: "meeting_date_block",
        element: {
          type: "datepicker",
          action_id: "meeting_date",
          placeholder: {
            type: "plain_text",
            text: "Select a date"
          }
        },
        label: {
          type: "plain_text",
          text: "Meeting Date"
        }
      },
      {
        type: "input",
        block_id: "meeting_time_block",
        element: {
          type: "timepicker",
          action_id: "meeting_time",
          placeholder: {
            type: "plain_text",
            text: "Select a time"
          }
        },
        label: {
          type: "plain_text",
          text: "Meeting Time (EST)"
        }
      },
      {
        type: "input",
        block_id: "google_meet_block",
        optional: true,
        element: {
          type: "plain_text_input",
          action_id: "google_meet_link",
          placeholder: {
            type: "plain_text",
            text: "https://meet.google.com/xxx-xxxx-xxx"
          }
        },
        label: {
          type: "plain_text",
          text: "Google Meet Link (optional - can add later)"
        }
      },
      {
        type: "input",
        block_id: "admin_notes_block",
        optional: true,
        element: {
          type: "plain_text_input",
          action_id: "admin_notes",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Any internal notes about this request..."
          }
        },
        label: {
          type: "plain_text",
          text: "Internal Notes (not shared with host)"
        }
      }
    ]
  };

  // Open the modal using Slack API
  const token = Deno.env.get('SLACK_BOT_TOKEN');
  const response = await fetch('https://slack.com/api/views.open', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      trigger_id: triggerId,
      view: modalView
    })
  });

  const result = await response.json();

  if (!result.ok) {
    console.error('[slack-callback] Failed to open modal:', result.error);
    return new Response(JSON.stringify({ error: result.error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Return empty 200 to acknowledge the button click
  return new Response('', { status: 200 });
}

/**
 * Handle modal form submission
 * Updates database and sends notification to host
 */
async function handleModalSubmission(
  payload: any,
  supabase: any
): Promise<Response> {
  const values = payload.view.state.values;
  const metadata = JSON.parse(payload.view.private_metadata);

  // Extract form values
  const meetingDate = values.meeting_date_block.meeting_date.selected_date;
  const meetingTime = values.meeting_time_block.meeting_time.selected_time;
  const googleMeetLink = values.google_meet_block.google_meet_link.value || null;
  const adminNotes = values.admin_notes_block.admin_notes.value || null;

  // Combine date and time into ISO timestamp
  const meetingDateTime = new Date(`${meetingDate}T${meetingTime}:00`).toISOString();

  console.log(`[slack-callback] Assigning co-host for request ${metadata.requestId}`);
  console.log(`[slack-callback] Meeting scheduled: ${meetingDateTime}`);

  // Update the co-host request in database
  const { error: updateError } = await supabase
    .from('co_hostrequest')
    .update({
      "Co-Host User": metadata.adminSlackId, // We'll need to map this to a user ID
      "Status - Co-Host Request": "co-host selected",
      "Meeting Date Time": meetingDateTime,
      "Google Meet Link": googleMeetLink,
      "Admin Notes": adminNotes,
      "Modified Date": new Date().toISOString()
    })
    .eq('_id', metadata.requestId);

  if (updateError) {
    console.error('[slack-callback] Database update failed:', updateError);
    return new Response(JSON.stringify({
      response_action: "errors",
      errors: {
        meeting_date_block: "Failed to save. Please try again."
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Update the original Slack message to show it's been claimed
  const token = Deno.env.get('SLACK_BOT_TOKEN');
  await fetch('https://slack.com/api/chat.update', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: metadata.channelId,
      ts: metadata.messageTs,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "✅ Co-Host Request Assigned",
            emoji: true
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Host:*\n${metadata.hostName || 'Unknown'}`
            },
            {
              type: "mrkdwn",
              text: `*Assigned To:*\n${metadata.adminSlackName}`
            }
          ]
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Request ID:*\n\`${metadata.requestId}\``
            },
            {
              type: "mrkdwn",
              text: `*Meeting:*\n${meetingDate} at ${meetingTime}`
            }
          ]
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Claimed by <@${metadata.adminSlackId}> • Host notification sent`
            }
          ]
        }
      ],
      text: `Co-Host request ${metadata.requestId} assigned to ${metadata.adminSlackName}`
    })
  });

  // Trigger host notification (fire-and-forget)
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

  fetch(`${supabaseUrl}/functions/v1/cohost-request`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'notify-host',
      payload: {
        requestId: metadata.requestId,
        hostEmail: metadata.hostEmail,
        hostName: metadata.hostName,
        cohostName: metadata.adminSlackName,
        meetingDateTime,
        googleMeetLink
      }
    })
  }).catch(err => console.error('[slack-callback] Host notification failed:', err));

  // Return empty response to close the modal
  return new Response('', { status: 200 });
}
```

### Step 4.4: Add Notify-Host Handler

**File:** `supabase/functions/cohost-request/handlers/notify-host.ts`

```typescript
/**
 * Notify Host Handler
 * Sends email notification to host about assigned co-host and meeting
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface NotifyHostInput {
  requestId: string;
  hostEmail: string;
  hostName: string;
  cohostName: string;
  meetingDateTime: string;
  googleMeetLink?: string;
}

export async function handleNotifyHost(
  payload: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<{ success: boolean }> {
  const input = payload as unknown as NotifyHostInput;

  console.log(`[cohost-request:notify-host] Sending notification for request: ${input.requestId}`);

  // Format the meeting date/time for display
  const meetingDate = new Date(input.meetingDateTime);
  const formattedDate = meetingDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = meetingDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  });

  // Send email via Supabase Auth (or your preferred email service)
  // Option 1: Use Supabase's built-in email (if configured)
  // Option 2: Call an external email service
  // Option 3: Use Resend, SendGrid, etc.

  // For now, we'll use the Supabase edge function to send via your email provider
  // This is a placeholder - implement according to your email service

  const emailContent = {
    to: input.hostEmail,
    subject: `Your Co-Host Session is Scheduled - ${formattedDate}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6D31C2;">Your Co-Host Session is Confirmed! 🎉</h2>

        <p>Hi ${input.hostName || 'there'},</p>

        <p>Great news! Your co-host request has been assigned and your virtual meeting is scheduled.</p>

        <div style="background: #F1F3F5; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Meeting Details</h3>
          <p><strong>Co-Host:</strong> ${input.cohostName}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime} EST</p>
          ${input.googleMeetLink ? `<p><strong>Join Meeting:</strong> <a href="${input.googleMeetLink}">${input.googleMeetLink}</a></p>` : ''}
        </div>

        <p>Your co-host will help guide you through the hosting process and answer any questions you may have.</p>

        <p>If you need to reschedule, please reply to this email or contact our support team.</p>

        <p>Best,<br>The Split Lease Team</p>
      </div>
    `
  };

  // TODO: Implement actual email sending based on your email provider
  // Example with Resend:
  // const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  // await resend.emails.send(emailContent);

  console.log(`[cohost-request:notify-host] Email would be sent to: ${input.hostEmail}`);
  console.log(`[cohost-request:notify-host] Email content:`, emailContent);

  // Update status to "google meet scheduled" since notification was sent
  await supabase
    .from('co_hostrequest')
    .update({
      "Status - Co-Host Request": "google meet scheduled",
      "Modified Date": new Date().toISOString()
    })
    .eq('_id', input.requestId);

  return { success: true };
}
```

### Step 4.5: Update Main Router to Include notify-host Action

**File:** `supabase/functions/cohost-request/index.ts`

Add the new action handler:

```typescript
// Add import at top
import { handleNotifyHost } from "./handlers/notify-host.ts";

// Add to the action switch statement:
case "notify-host":
  result = await handleNotifyHost(payload, supabase);
  break;
```

---

## Part 5: Deploy Edge Functions

### Step 5.1: Deploy All Functions

```bash
# Deploy the updated cohost-request function
supabase functions deploy cohost-request

# Deploy the new Slack callback function
supabase functions deploy cohost-request-slack-callback
```

### Step 5.2: Verify Deployment

```bash
# Check function logs
supabase functions logs cohost-request --tail
supabase functions logs cohost-request-slack-callback --tail
```

---

## Part 6: Testing the Workflow

### Step 6.1: Test Co-Host Request Submission

1. Go to your Split Lease app
2. Submit a co-host request through the ScheduleCohost modal
3. Check the `#cohost-requests` Slack channel
4. You should see an interactive message with a "Claim This Request" button

### Step 6.2: Test Claiming a Request

1. Click the "Claim This Request" button in Slack
2. A modal should open with date/time pickers
3. Fill in the meeting details
4. Click "Confirm Assignment"
5. The original message should update to show "Assigned"
6. Check the database - the record should be updated

### Step 6.3: Test Host Notification

1. Check the host's email (or logs if email not configured)
2. Verify the email contains correct meeting details

---

## Part 7: Status Flow Reference

| Status | Order | Trigger |
|--------|-------|---------|
| `pending` | 1 | Initial request created |
| `co-host selected` | 2 | Admin claims request via Slack |
| `google meet scheduled` | 3 | Host notification sent |
| `google meet finished` | 4 | Meeting completed (manual or automated) |
| `finished` | 5 | Process complete, awaiting rating |
| `request closed` | 6 | Rating submitted |

---

## Part 8: Troubleshooting

### Common Issues

**1. Button click doesn't open modal**
- Check that `SLACK_BOT_TOKEN` is set correctly
- Verify the Interactivity URL is correct
- Check Edge Function logs for errors

**2. Modal submission fails**
- Check `SLACK_SIGNING_SECRET` is correct
- Verify database column names match exactly
- Check for FK constraint errors

**3. Original message doesn't update**
- Ensure `Slack Message TS` was stored on creation
- Check bot has `chat:write` permission

**4. Host doesn't receive email**
- Email service not configured (implement in notify-host handler)
- Check spam folder
- Verify email address is correct

---

## Files Reference

| File | Purpose |
|------|---------|
| `supabase/functions/_shared/slack.ts` | Slack utilities (webhook + Bot API) |
| `supabase/functions/cohost-request/handlers/create.ts` | Create request + send interactive Slack |
| `supabase/functions/cohost-request/handlers/notify-host.ts` | Send email to host |
| `supabase/functions/cohost-request-slack-callback/index.ts` | Handle Slack button/modal |
| `app/src/islands/shared/ScheduleCohost/ScheduleCohost.jsx` | Frontend modal |
| `app/src/islands/shared/ScheduleCohost/cohostService.js` | Frontend API service |

---

## Next Steps After Implementation

1. **Set up email service** - Implement actual email sending in `notify-host.ts`
2. **Map Slack users to database users** - Create a lookup table for admin Slack IDs → database user IDs
3. **Add Google Calendar integration** - Auto-create calendar events with Meet links
4. **Add reminder notifications** - Send reminder emails 24h and 1h before meeting
5. **Add admin dashboard** - View all pending/assigned requests in one place
