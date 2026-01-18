/**
 * Send Calendar Invite Handler
 * Split Lease - Supabase Edge Functions
 *
 * Triggers the Zapier workflow to send Google Calendar invites.
 * This is a fire-and-forget operation - we trigger the workflow
 * and don't wait for Zapier's response.
 *
 * Steps:
 * 1. Validate input
 * 2. Call Bubble workflow: l3-trigger-send-google-calend
 * 3. Return success response
 *
 * NOTE: This calls Bubble workflow directly (not queue-based)
 * because it's triggering an external integration, not syncing data.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, BubbleApiError } from "../../_shared/errors.ts";
import {
  SendCalendarInviteInput,
  SendCalendarInviteResponse,
  UserContext,
} from "../lib/types.ts";
import { validateSendCalendarInviteInput } from "../lib/validators.ts";

/**
 * Handle send calendar invite request
 */
export async function handleSendCalendarInvite(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<SendCalendarInviteResponse> {
  console.log(`[virtual-meeting:send_calendar_invite] Starting for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as SendCalendarInviteInput;
  validateSendCalendarInviteInput(input);

  console.log(`[virtual-meeting:send_calendar_invite] Validated input - proposal: ${input.proposalId}, user: ${input.userId}`);

  // ================================================
  // GET BUBBLE API CREDENTIALS
  // ================================================

  const bubbleBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
  const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');

  if (!bubbleBaseUrl || !bubbleApiKey) {
    throw new Error('Missing Bubble API credentials');
  }

  // ================================================
  // TRIGGER BUBBLE WORKFLOW
  // ================================================

  const workflowUrl = `${bubbleBaseUrl}/wf/l3-trigger-send-google-calend`;
  const workflowParams = {
    proposal: input.proposalId,
    user: input.userId,
  };

  console.log(`[virtual-meeting:send_calendar_invite] Triggering workflow: l3-trigger-send-google-calend`);

  try {
    const response = await fetch(workflowUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bubbleApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflowParams),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[virtual-meeting:send_calendar_invite] Bubble workflow failed:`, errorText);
      throw new BubbleApiError(`Failed to trigger calendar invite workflow: ${response.status}`, response.status);
    }

    console.log(`[virtual-meeting:send_calendar_invite] Workflow triggered successfully`);

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error;
    }
    console.error(`[virtual-meeting:send_calendar_invite] Error calling Bubble:`, error);
    throw new BubbleApiError(`Failed to call Bubble API: ${(error as Error).message}`);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  const now = new Date().toISOString();

  console.log(`[virtual-meeting:send_calendar_invite] Complete, returning response`);

  return {
    success: true,
    proposalId: input.proposalId,
    userId: input.userId,
    triggeredAt: now,
  };
}
