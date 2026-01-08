/**
 * Notify Participants Handler
 * Split Lease - Supabase Edge Functions
 *
 * Triggers the notification workflow to send SMS/Email to participants.
 * This is a fire-and-forget operation.
 *
 * NOTE: This calls Bubble workflow directly (not queue-based)
 * because it's triggering notifications, not syncing data.
 *
 * FP PATTERN: Separates pure data builders from effectful API operations
 * All data transformations are pure with @pure annotations
 * All API operations are explicit with @effectful annotations
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * @module virtual-meeting/handlers/notifyParticipants
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BubbleApiError } from "../../_shared/errors.ts";
import {
  NotifyParticipantsInput,
  NotifyParticipantsResponse,
  UserContext,
} from "../lib/types.ts";
import { validateNotifyParticipantsInput } from "../lib/validators.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[virtual-meeting:notify_participants]'
const WORKFLOW_NAME = 'notify-virtual-meeting-partici'

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
const buildWorkflowParams = (input: NotifyParticipantsInput): Record<string, string> =>
  Object.freeze({
    host: input.hostId,
    guest: input.guestId,
    virtual_meeting: input.virtualMeetingId,
  })

/**
 * Build success response
 * @pure
 */
const buildSuccessResponse = (
  virtualMeetingId: string,
  notifiedAt: string
): NotifyParticipantsResponse =>
  Object.freeze({
    success: true,
    virtualMeetingId,
    notifiedAt,
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
 * Handle notify participants request
 * @effectful - Calls Bubble workflow
 *
 * Steps:
 * 1. Validate input
 * 2. Call Bubble workflow: notify-virtual-meeting-partici
 * 3. Return success response
 */
export async function handleNotifyParticipants(
  payload: Record<string, unknown>,
  user: UserContext | null,
  _supabase: SupabaseClient
): Promise<NotifyParticipantsResponse> {
  console.log(`${LOG_PREFIX} Starting for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as NotifyParticipantsInput;
  validateNotifyParticipantsInput(input);

  console.log(`${LOG_PREFIX} Validated input - host: ${input.hostId}, guest: ${input.guestId}, vm: ${input.virtualMeetingId}`);

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
      throw new BubbleApiError(`Failed to trigger notification workflow: ${response.status}`, response.status);
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

  return buildSuccessResponse(input.virtualMeetingId, now);
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
  handleNotifyParticipants,
})
