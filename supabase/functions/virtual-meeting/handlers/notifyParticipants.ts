/**
 * Notify Participants Handler
 * Split Lease - Supabase Edge Functions
 *
 * Triggers the notification workflow to send SMS/Email to participants.
 * This is a fire-and-forget operation.
 *
 * Steps:
 * 1. Validate input
 * 2. Call Bubble workflow: notify-virtual-meeting-partici
 * 3. Return success response
 *
 * NOTE: This calls Bubble workflow directly (not queue-based)
 * because it's triggering notifications, not syncing data.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, BubbleApiError } from "../../_shared/errors.ts";
import {
  NotifyParticipantsInput,
  NotifyParticipantsResponse,
  UserContext,
} from "../lib/types.ts";
import { validateNotifyParticipantsInput } from "../lib/validators.ts";

/**
 * Handle notify participants request
 */
export async function handleNotifyParticipants(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<NotifyParticipantsResponse> {
  console.log(`[virtual-meeting:notify_participants] Starting for user: ${user?.email || 'public'}`);

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as NotifyParticipantsInput;
  validateNotifyParticipantsInput(input);

  console.log(`[virtual-meeting:notify_participants] Validated input - host: ${input.hostId}, guest: ${input.guestId}, vm: ${input.virtualMeetingId}`);

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

  const workflowUrl = `${bubbleBaseUrl}/wf/notify-virtual-meeting-partici`;
  const workflowParams = {
    host: input.hostId,
    guest: input.guestId,
    virtual_meeting: input.virtualMeetingId,
  };

  console.log(`[virtual-meeting:notify_participants] Triggering workflow: notify-virtual-meeting-partici`);

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
      console.error(`[virtual-meeting:notify_participants] Bubble workflow failed:`, errorText);
      throw new BubbleApiError(`Failed to trigger notification workflow: ${response.status}`, response.status);
    }

    console.log(`[virtual-meeting:notify_participants] Workflow triggered successfully`);

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error;
    }
    console.error(`[virtual-meeting:notify_participants] Error calling Bubble:`, error);
    throw new BubbleApiError(`Failed to call Bubble API: ${(error as Error).message}`);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  const now = new Date().toISOString();

  console.log(`[virtual-meeting:notify_participants] Complete, returning response`);

  return {
    success: true,
    virtualMeetingId: input.virtualMeetingId,
    notifiedAt: now,
  };
}
