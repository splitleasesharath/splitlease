/**
 * Create Co-Host Request Handler
 * Split Lease - Supabase Edge Functions
 *
 * Creates a co-host request record in the database.
 *
 * FP PATTERN: Separates pure data builders from effectful database operations
 * All data transformations are pure with @pure annotations
 * All database operations are explicit with @effectful annotations
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * @module cohost-request/handlers/create
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
import { validateRequired } from "../../_shared/validation.ts";
import { sendToSlack, sendInteractiveMessage } from "../../_shared/slack.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[cohost-request:create]'
const INITIAL_STATUS = 'pending'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface UserContext {
  readonly id: string;
  readonly email: string;
}

interface CreateCoHostRequestInput {
  readonly userId: string;           // User's Bubble _id
  readonly userEmail: string;        // User's email
  readonly userName: string;         // User's name
  readonly listingId?: string;       // Optional: Listing Bubble _id
  readonly selectedTimes: readonly string[];  // Array of formatted datetime strings
  readonly subject?: string;         // Topics/help needed (comma-separated)
  readonly details?: string;         // Additional details text
}

interface CreateCoHostRequestResponse {
  readonly requestId: string;
  readonly createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Pure Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if selected times array is valid
 * @pure
 */
const isValidSelectedTimes = (times: unknown): times is readonly string[] =>
  Array.isArray(times) && times.length > 0

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build request notes from subject and details
 * @pure
 */
const buildRequestNotes = (subject?: string, details?: string): string | null => {
  const parts = [
    subject ? `Topics: ${subject}` : null,
    details || null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join('\n\n') : null;
}

/**
 * Build co-host request data record
 * @pure
 */
const buildCoHostRequestData = (
  requestId: string,
  input: CreateCoHostRequestInput,
  now: string
): Record<string, unknown> =>
  Object.freeze({
    _id: requestId,
    "Host User": input.userId,
    "Co-Host User": null,
    "Created By": input.userId,
    Listing: input.listingId || null,
    "Status - Co-Host Request": INITIAL_STATUS,
    "Dates and times suggested": input.selectedTimes,
    "Request notes": buildRequestNotes(input.subject, input.details),
    "Created Date": now,
    "Modified Date": now,
  })

/**
 * Build success response
 * @pure
 */
const buildSuccessResponse = (requestId: string, createdAt: string): CreateCoHostRequestResponse =>
  Object.freeze({
    requestId,
    createdAt,
  })

/**
 * Build simple Slack message for webhook fallback
 * @pure
 */
const buildSimpleSlackMessage = (
  input: CreateCoHostRequestInput,
  requestId: string
): { text: string } => ({
  text: [
    `🙋 *New Co-Host Request*`,
    ``,
    `*From:* ${input.userName || 'Unknown'} (${input.userEmail || 'no email'})`,
    `*Listing:* ${input.listingId || 'Not specified'}`,
    `*Request ID:* ${requestId}`,
    ``,
    `*Preferred Times:*`,
    ...input.selectedTimes.map((t: string) => `• ${t}`),
    ``,
    input.subject ? `*Topics:* ${input.subject}` : '',
    input.details ? `*Details:* ${input.details}` : '',
    ``,
    `_Please assign a co-host internally._`,
  ].filter(Boolean).join('\n'),
})

/**
 * Build interactive Slack blocks for Bot API
 * @pure
 */
const buildInteractiveSlackBlocks = (
  input: CreateCoHostRequestInput,
  requestId: string
): unknown[] => [
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
        text: `*Request ID:*\n\`${requestId}\``
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
          requestId: requestId,
          hostUserId: input.userId,
          hostEmail: input.userEmail,
          hostName: input.userName,
          listingId: input.listingId,
          preferredTimes: input.selectedTimes
        })
      }
    ]
  }
]

// ─────────────────────────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Validate create input
 * @pure - Throws ValidationError on invalid input
 */
const validateCreateInput = (input: CreateCoHostRequestInput): void => {
  validateRequired(input.userId, "userId");
  validateRequired(input.selectedTimes, "selectedTimes");

  if (!isValidSelectedTimes(input.selectedTimes)) {
    throw new ValidationError("selectedTimes must be a non-empty array");
  }
}

// ─────────────────────────────────────────────────────────────
// Database Operations
// ─────────────────────────────────────────────────────────────

/**
 * Generate unique Bubble-compatible ID
 * @effectful - Database RPC call
 */
const generateBubbleId = async (supabase: SupabaseClient): Promise<string> => {
  const { data: id, error } = await supabase.rpc('generate_bubble_id');

  if (error || !id) {
    console.error(`${LOG_PREFIX} ID generation failed:`, error);
    throw new SupabaseSyncError('Failed to generate co-host request ID');
  }

  return id;
}

/**
 * Insert co-host request record
 * @effectful - Database write operation
 */
const insertCoHostRequest = async (
  supabase: SupabaseClient,
  data: Record<string, unknown>
): Promise<void> => {
  console.log(`${LOG_PREFIX} Attempting insert with columns:`, Object.keys(data));

  const { error } = await supabase
    .from("co_hostrequest")
    .insert(data);

  if (error) {
    console.error(`${LOG_PREFIX} Insert failed:`, error);
    console.error(`${LOG_PREFIX} Error details - code: ${error.code}, message: ${error.message}, details: ${error.details}, hint: ${error.hint}`);
    throw new SupabaseSyncError(`Failed to create co-host request: ${error.message}`);
  }
}

/**
 * Update request with Slack message timestamp
 * @effectful - Database write operation (non-blocking)
 */
const updateSlackMessageTs = async (
  supabase: SupabaseClient,
  requestId: string,
  messageTs: string
): Promise<void> => {
  const { error } = await supabase
    .from("co_hostrequest")
    .update({ "Slack Message TS": messageTs })
    .eq("_id", requestId);

  if (error) {
    console.error(`${LOG_PREFIX} Failed to store Slack message TS:`, error);
    // Non-blocking
  }
}

// ─────────────────────────────────────────────────────────────
// Slack Operations
// ─────────────────────────────────────────────────────────────

/**
 * Send Slack notification for new request
 * @effectful - External API call (non-blocking)
 */
const sendSlackNotification = async (
  supabase: SupabaseClient,
  input: CreateCoHostRequestInput,
  requestId: string
): Promise<void> => {
  const channelId = Deno.env.get('SLACK_COHOST_CHANNEL_ID');

  if (!channelId) {
    console.warn(`${LOG_PREFIX} SLACK_COHOST_CHANNEL_ID not configured, using webhook fallback`);
    const message = buildSimpleSlackMessage(input, requestId);
    sendToSlack('general', message);
    return;
  }

  const blocks = buildInteractiveSlackBlocks(input, requestId);
  const fallbackText = `New Co-Host Request from ${input.userName || 'Unknown'} - Request ID: ${requestId}`;

  const slackResult = await sendInteractiveMessage(channelId, blocks, fallbackText);

  if (slackResult.ok && slackResult.ts) {
    await updateSlackMessageTs(supabase, requestId, slackResult.ts);
    console.log(`${LOG_PREFIX} Interactive Slack message sent, ts: ${slackResult.ts}`);
  } else {
    console.error(`${LOG_PREFIX} Failed to send interactive Slack message: ${slackResult.error}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle create co-host request
 * @effectful - Orchestrates database and Slack operations
 *
 * Steps:
 * 1. Validate input (userId, selectedTimes required)
 * 2. Generate unique _id for co-host request
 * 3. Insert co-host request record
 * 4. Send Slack notification
 * 5. Return the created ID
 */
export async function handleCreate(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<CreateCoHostRequestResponse> {
  console.log(`${LOG_PREFIX} Starting create for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as CreateCoHostRequestInput;
  validateCreateInput(input);

  console.log(`${LOG_PREFIX} Validated input for user: ${input.userId}`);
  console.log(`${LOG_PREFIX} Selected times: ${input.selectedTimes.length}`);

  // ================================================
  // GENERATE ID
  // ================================================

  const coHostRequestId = await generateBubbleId(supabase);
  console.log(`${LOG_PREFIX} Generated ID: ${coHostRequestId}`);

  // ================================================
  // CREATE CO-HOST REQUEST RECORD
  // ================================================

  const now = new Date().toISOString();
  const coHostData = buildCoHostRequestData(coHostRequestId, input, now);

  await insertCoHostRequest(supabase, coHostData);
  console.log(`${LOG_PREFIX} Co-host request created successfully: ${coHostRequestId}`);

  // ================================================
  // SEND SLACK NOTIFICATION
  // ================================================

  await sendSlackNotification(supabase, input, coHostRequestId);
  console.log(`${LOG_PREFIX} Slack notification processed`);

  // ================================================
  // RETURN RESPONSE
  // ================================================

  return buildSuccessResponse(coHostRequestId, now);
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,
  INITIAL_STATUS,

  // Pure Predicates
  isValidSelectedTimes,

  // Pure Data Builders
  buildRequestNotes,
  buildCoHostRequestData,
  buildSuccessResponse,
  buildSimpleSlackMessage,
  buildInteractiveSlackBlocks,

  // Validation Helpers
  validateCreateInput,

  // Database Operations
  generateBubbleId,
  insertCoHostRequest,
  updateSlackMessageTs,

  // Slack Operations
  sendSlackNotification,

  // Main Handler
  handleCreate,
})
