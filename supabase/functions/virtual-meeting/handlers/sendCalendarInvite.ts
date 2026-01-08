/**
 * Send Calendar Invite Handler
 * Split Lease - Supabase Edge Functions
 *
 * Triggers the Zapier workflow to send Google Calendar invites.
 * This is a fire-and-forget operation - we trigger the workflow
 * and don't wait for Zapier's response.
 *
 * NOTE: This calls Bubble workflow directly (not queue-based)
 * because it's triggering an external integration, not syncing data.
 *
 * FP PATTERN: Separates pure data builders from effectful API operations
 * All data transformations are pure with @pure annotations
 * All API operations are explicit with @effectful annotations
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * @module virtual-meeting/handlers/sendCalendarInvite
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BubbleApiError } from "../../_shared/errors.ts";
import {
  SendCalendarInviteInput,
  SendCalendarInviteResponse,
  UserContext,
} from "../lib/types.ts";
import { validateSendCalendarInviteInput } from "../lib/validators.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[virtual-meeting:send_calendar_invite]'
const WORKFLOW_NAME = 'l3-trigger-send-google-calend'

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build workflow URL
 * @pure
 */
const buildWorkflowUrl = (bubbleBaseUrl: string): string =>
  `${bubbleBaseUrl}/wf/${WORKFLOW_NAME}`

/**
 * Build workflow params
 * @pure
 */
const buildWorkflowParams = (input: SendCalendarInviteInput): Record<string, string> =>
  Object.freeze({
    proposal: input.proposalId,
    user: input.userId,
  })

/**
 * Build success response
 * @pure
 */
const buildSuccessResponse = (
  proposalId: string,
  userId: string,
  triggeredAt: string
): SendCalendarInviteResponse =>
  Object.freeze({
    success: true,
    proposalId,
    userId,
    triggeredAt,
  })

// ─────────────────────────────────────────────────────────────
// Environment Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get Bubble API credentials from environment
 * @effectful - Reads environment variables
 */
const getBubbleCredentials = (): { bubbleBaseUrl: string; bubbleApiKey: string } => {
  const bubbleBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
  const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');

  if (!bubbleBaseUrl || !bubbleApiKey) {
    throw new Error('Missing Bubble API credentials');
  }

  return { bubbleBaseUrl, bubbleApiKey };
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle send calendar invite request
 * @effectful - Calls Bubble workflow
 *
 * Steps:
 * 1. Validate input
 * 2. Call Bubble workflow: l3-trigger-send-google-calend
 * 3. Return success response
 */
export async function handleSendCalendarInvite(
  payload: Record<string, unknown>,
  user: UserContext | null,
  _supabase: SupabaseClient
): Promise<SendCalendarInviteResponse> {
  console.log(`${LOG_PREFIX} Starting for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as SendCalendarInviteInput;
  validateSendCalendarInviteInput(input);

  console.log(`${LOG_PREFIX} Validated input - proposal: ${input.proposalId}, user: ${input.userId}`);

  // ================================================
  // GET BUBBLE API CREDENTIALS
  // ================================================

  const { bubbleBaseUrl, bubbleApiKey } = getBubbleCredentials();

  // ================================================
  // TRIGGER BUBBLE WORKFLOW
  // ================================================

  const workflowUrl = buildWorkflowUrl(bubbleBaseUrl);
  const workflowParams = buildWorkflowParams(input);

  console.log(`${LOG_PREFIX} Triggering workflow: ${WORKFLOW_NAME}`);

  try {
    const response = await fetch(workflowUrl, {
      method: 'POST',
      headers: Object.freeze({
        'Authorization': `Bearer ${bubbleApiKey}`,
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(workflowParams),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${LOG_PREFIX} Bubble workflow failed:`, errorText);
      throw new BubbleApiError(`Failed to trigger calendar invite workflow: ${response.status}`, response.status);
    }

    console.log(`${LOG_PREFIX} Workflow triggered successfully`);

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error;
    }
    console.error(`${LOG_PREFIX} Error calling Bubble:`, error);
    throw new BubbleApiError(`Failed to call Bubble API: ${(error as Error).message}`);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  const now = new Date().toISOString();

  console.log(`${LOG_PREFIX} Complete, returning response`);

  return buildSuccessResponse(input.proposalId, input.userId, now);
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
  WORKFLOW_NAME,

  // Pure Data Builders
  buildWorkflowUrl,
  buildWorkflowParams,
  buildSuccessResponse,

  // Environment Helpers
  getBubbleCredentials,

  // Main Handler
  handleSendCalendarInvite,
})
