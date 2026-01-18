/**
 * Create Co-Host Request Handler
 * Split Lease - Supabase Edge Functions
 *
 * Creates a co-host request record in the database.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
import { validateRequired } from "../../_shared/validation.ts";
import { sendToSlack, sendInteractiveMessage } from "../../_shared/slack.ts";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface UserContext {
  id: string;
  email: string;
}

interface CreateCoHostRequestInput {
  userId: string;           // User's Bubble _id
  userEmail: string;        // User's email
  userName: string;         // User's name
  listingId?: string;       // Optional: Listing Bubble _id
  selectedTimes: string[];  // Array of formatted datetime strings
  subject?: string;         // Topics/help needed (comma-separated)
  details?: string;         // Additional details text
}

interface CreateCoHostRequestResponse {
  requestId: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle create co-host request
 *
 * Steps:
 * 1. Validate input (userId, selectedTimes required)
 * 2. Generate unique _id for co-host request
 * 3. Insert co-host request record
 * 4. Return the created ID
 */
export async function handleCreate(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<CreateCoHostRequestResponse> {
  console.log(`[cohost-request:create] Starting create for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as CreateCoHostRequestInput;

  validateRequired(input.userId, "userId");
  validateRequired(input.selectedTimes, "selectedTimes");

  if (!Array.isArray(input.selectedTimes) || input.selectedTimes.length === 0) {
    throw new ValidationError("selectedTimes must be a non-empty array");
  }

  console.log(`[cohost-request:create] Validated input for user: ${input.userId}`);
  console.log(`[cohost-request:create] Selected times: ${input.selectedTimes.length}`);

  // ================================================
  // GENERATE ID
  // ================================================

  const { data: coHostRequestId, error: requestIdError } = await supabase.rpc('generate_bubble_id');
  if (requestIdError || !coHostRequestId) {
    console.error(`[cohost-request:create] Co-host request ID generation failed:`, requestIdError);
    throw new SupabaseSyncError('Failed to generate co-host request ID');
  }

  console.log(`[cohost-request:create] Generated ID: ${coHostRequestId}`);

  // ================================================
  // CREATE CO-HOST REQUEST RECORD
  // ================================================

  const now = new Date().toISOString();

  // Combine subject (topics) and details into single "Request notes" field
  // Format: "Topics: X, Y, Z\n\nAdditional details here"
  const requestNotes = [
    input.subject ? `Topics: ${input.subject}` : null,
    input.details ? input.details : null,
  ].filter(Boolean).join('\n\n') || null;

  // co_hostrequest table - insert required fields including timestamps
  // The admin selection will be handled manually via Slack notification
  // Note: "Host User" is the user making the request (the host who needs help)
  // "Co-Host User" will be assigned later via Slack notification workflow
  const coHostData: Record<string, unknown> = {
    _id: coHostRequestId,
    "Host User": input.userId,      // The host requesting co-host assistance
    "Co-Host User": null,           // Will be assigned later by admin
    "Created By": input.userId,
    Listing: input.listingId || null,
    "Status - Co-Host Request": "pending",  // Initial status from os_co_host_status
    "Dates and times suggested": input.selectedTimes,  // JSONB array of datetime strings
    "Request notes": requestNotes,  // Combined topics + freeform details
    "Created Date": now,
    "Modified Date": now,
  };

  // Log which columns we're attempting to insert
  console.log(`[cohost-request:create] Attempting insert with columns:`, Object.keys(coHostData));
  console.log(`[cohost-request:create] Data:`, JSON.stringify(coHostData));

  console.log(`[cohost-request:create] Inserting co-host request:`, JSON.stringify(coHostData));

  const { error: requestInsertError } = await supabase
    .from("co_hostrequest")
    .insert(coHostData);

  if (requestInsertError) {
    console.error(`[cohost-request:create] Insert failed:`, requestInsertError);
    console.error(`[cohost-request:create] Error details - code: ${requestInsertError.code}, message: ${requestInsertError.message}, details: ${requestInsertError.details}, hint: ${requestInsertError.hint}`);
    throw new SupabaseSyncError(`Failed to create co-host request: ${requestInsertError.message}`);
  }

  console.log(`[cohost-request:create] Co-host request created successfully: ${coHostRequestId}`);

  // ================================================
  // SEND INTERACTIVE SLACK MESSAGE
  // ================================================

  const channelId = Deno.env.get('SLACK_COHOST_CHANNEL_ID');

  if (!channelId) {
    // Fallback to simple webhook if Bot API not configured
    console.warn('[cohost-request:create] SLACK_COHOST_CHANNEL_ID not configured, using webhook fallback');
    const slackMessage = {
      text: [
        `🙋 *New Co-Host Request*`,
        ``,
        `*From:* ${input.userName || 'Unknown'} (${input.userEmail || 'no email'})`,
        `*Listing:* ${input.listingId || 'Not specified'}`,
        `*Request ID:* ${coHostRequestId}`,
        ``,
        `*Preferred Times:*`,
        ...input.selectedTimes.map((t: string) => `• ${t}`),
        ``,
        input.subject ? `*Topics:* ${input.subject}` : '',
        input.details ? `*Details:* ${input.details}` : '',
        ``,
        `_Please assign a co-host internally._`,
      ].filter(Boolean).join('\n'),
    };
    sendToSlack('general', slackMessage);
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
          text: `*Preferred Times (EST):*\n${input.selectedTimes.map((t: string) => `• ${t}`).join('\n')}`
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
      // Store the message timestamp so we can update it later when claimed
      await supabase
        .from("co_hostrequest")
        .update({ "Slack Message TS": slackResult.ts })
        .eq("_id", coHostRequestId);

      console.log(`[cohost-request:create] Interactive Slack message sent, ts: ${slackResult.ts}`);
    } else {
      console.error(`[cohost-request:create] Failed to send interactive Slack message: ${slackResult.error}`);
      // Don't fail the request - Slack notification is non-critical
    }
  }

  console.log(`[cohost-request:create] Slack notification processed`);

  // ================================================
  // RETURN RESPONSE
  // ================================================

  return {
    requestId: coHostRequestId,
    createdAt: now,
  };
}
