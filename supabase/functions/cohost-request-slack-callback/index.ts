/**
 * Slack Callback Handler for Co-Host Requests
 * Split Lease - Supabase Edge Functions
 *
 * Handles interactive elements from Slack:
 * 1. Button clicks (claim_cohost_request) - Opens modal form
 * 2. Modal submissions (cohost_assignment_modal) - Updates database, notifies host
 *
 * CRITICAL: Must respond within 3 seconds or Slack times out
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[slack-callback]'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-slack-signature, x-slack-request-timestamp',
};

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SlackPayload {
  type: string;
  trigger_id?: string;
  user: { id: string; name: string; username: string };
  channel?: { id: string };
  message?: { ts: string };
  actions?: Array<{ action_id: string; value: string }>;
  view?: {
    private_metadata: string;
    state: {
      values: Record<string, Record<string, {
        selected_date?: string;
        selected_time?: string;
        value?: string;
        selected_option?: { value: string };
      }>>;
    };
  };
}

interface CohostAdmin {
  id: number;
  name: string;
  display: string;
  email: string;
}

interface RequestMetadata {
  requestId: string;
  hostUserId: string;
  hostEmail: string;
  hostName: string;
  listingId?: string;
  preferredTimes: string[];
  adminSlackId?: string;
  adminSlackName?: string;
  channelId?: string;
  messageTs?: string;
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[slack-callback] Received request');

  try {
    // Slack sends form-urlencoded data for interactive components
    const formData = await req.text();
    const params = new URLSearchParams(formData);
    const payloadStr = params.get('payload');

    if (!payloadStr) {
      console.error('[slack-callback] Missing payload parameter');
      return new Response('Missing payload', { status: 400 });
    }

    const payload: SlackPayload = JSON.parse(payloadStr);
    console.log('[slack-callback] Payload type:', payload.type);
    console.log('[slack-callback] User:', payload.user?.name);

    // Initialize Supabase client with service role for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Route based on payload type
    switch (payload.type) {
      case 'block_actions':
        return await handleButtonClick(payload, supabase);

      case 'view_submission':
        return await handleModalSubmission(payload, supabase);

      default:
        console.warn('[slack-callback] Unknown payload type:', payload.type);
        return new Response('Unknown payload type', { status: 400 });
    }

  } catch (error) {
    console.error('[slack-callback] Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Button Click Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle "Claim This Request" button click
 * Opens a modal for the admin to enter meeting details
 */
async function handleButtonClick(
  payload: SlackPayload,
  supabase: ReturnType<typeof createClient>
): Promise<Response> {
  const action = payload.actions?.[0];

  if (action?.action_id !== 'claim_cohost_request') {
    console.warn('[slack-callback] Unknown action:', action?.action_id);
    return new Response('Unknown action', { status: 400 });
  }

  const requestData: RequestMetadata = JSON.parse(action.value);
  const triggerId = payload.trigger_id;
  const adminUserId = payload.user.id;
  const adminUserName = payload.user.name || payload.user.username;

  console.log(`[slack-callback] Admin ${adminUserName} (${adminUserId}) claiming request ${requestData.requestId}`);

  // Fetch available co-hosts from reference_table schema
  // Supabase client requires a separate client instance with schema option
  const schemaClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { db: { schema: 'reference_table' } }
  );

  const { data: cohostAdmins, error: cohostError } = await schemaClient
    .from('os_cohost_admins')
    .select('id, name, display, email')
    .neq('name', 'cohost_requested_waiting')
    .order('display');

  if (cohostError) {
    console.error('[slack-callback] Failed to fetch co-hosts:', cohostError);
  }

  const cohostList: CohostAdmin[] = (cohostAdmins || []) as CohostAdmin[];
  console.log(`[slack-callback] Found ${cohostList.length} available co-hosts`);

  // Build co-host dropdown options
  // Note: We store 'name' as the identifier since there's no user_id column
  const cohostOptions = cohostList.map((cohost) => ({
    text: {
      type: "plain_text",
      text: cohost.display,
      emoji: true
    },
    value: JSON.stringify({
      name: cohost.name,        // Internal identifier (e.g., "sharath")
      display: cohost.display,  // Display name (e.g., "Sharath")
      email: cohost.email
    })
  }));

  // Build preferred times as radio button options
  const preferredTimeOptions = requestData.preferredTimes.map((time: string, index: number) => ({
    text: {
      type: "plain_text",
      text: time,
      emoji: true
    },
    value: `time_${index}_${time}`
  }));

  // Build modal view for assignment form
  const modalView = {
    type: "modal",
    callback_id: "cohost_assignment_modal",
    private_metadata: JSON.stringify({
      ...requestData,
      adminSlackId: adminUserId,
      adminSlackName: adminUserName,
      channelId: payload.channel?.id,
      messageTs: payload.message?.ts
    }),
    title: {
      type: "plain_text",
      text: "Assign Co-Host",
      emoji: true
    },
    submit: {
      type: "plain_text",
      text: "Confirm Assignment",
      emoji: true
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
      // Co-host selection dropdown
      {
        type: "input",
        block_id: "cohost_select_block",
        element: {
          type: "static_select",
          action_id: "cohost_select",
          placeholder: {
            type: "plain_text",
            text: "Select a co-host"
          },
          options: cohostOptions.length > 0 ? cohostOptions : [{
            text: { type: "plain_text", text: "No co-hosts available" },
            value: "none"
          }]
        },
        label: {
          type: "plain_text",
          text: "Assign Co-Host",
          emoji: true
        }
      },
      {
        type: "divider"
      },
      // Preferred times as radio buttons
      {
        type: "input",
        block_id: "preferred_time_block",
        element: {
          type: "radio_buttons",
          action_id: "preferred_time_select",
          options: preferredTimeOptions.length > 0 ? preferredTimeOptions : [{
            text: { type: "plain_text", text: "No times specified" },
            value: "none"
          }]
        },
        label: {
          type: "plain_text",
          text: "Select Host's Preferred Time (EST)",
          emoji: true
        }
      },
      {
        type: "context",
        elements: [{
          type: "mrkdwn",
          text: "_Or specify a custom date/time below if none of the above work_"
        }]
      },
      {
        type: "input",
        block_id: "meeting_date_block",
        optional: true,
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
          text: "Custom Meeting Date (optional)",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "meeting_time_block",
        optional: true,
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
          text: "Custom Meeting Time (optional)",
          emoji: true
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
          text: "Google Meet Link (optional)",
          emoji: true
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
          text: "Internal Notes (not shared with host)",
          emoji: true
        }
      }
    ]
  };

  // Open the modal using Slack API
  const token = Deno.env.get('SLACK_BOT_TOKEN');

  if (!token) {
    console.error('[slack-callback] SLACK_BOT_TOKEN not configured');
    return new Response('Bot token not configured', { status: 500 });
  }

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

  console.log('[slack-callback] Modal opened successfully');

  // Return empty 200 to acknowledge the button click
  return new Response('', { status: 200 });
}

// ─────────────────────────────────────────────────────────────
// Modal Submission Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle modal form submission
 * Updates database and triggers host notification
 */
async function handleModalSubmission(
  payload: SlackPayload,
  supabase: ReturnType<typeof createClient>
): Promise<Response> {
  const values = payload.view!.state.values;
  const metadata: RequestMetadata = JSON.parse(payload.view!.private_metadata);

  // Extract co-host selection (required)
  const cohostSelection = values.cohost_select_block?.cohost_select?.selected_option;
  if (!cohostSelection || cohostSelection.value === 'none') {
    console.error('[slack-callback] No co-host selected');
    return new Response(JSON.stringify({
      response_action: "errors",
      errors: {
        cohost_select_block: "Please select a co-host"
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Parse co-host data from selection value
  const cohostData = JSON.parse(cohostSelection.value) as {
    name: string;     // Internal identifier (e.g., "sharath")
    display: string;  // Display name (e.g., "Sharath")
    email: string;
  };

  console.log(`[slack-callback] Selected co-host: ${cohostData.display} (${cohostData.name})`);

  // Extract preferred time selection
  const preferredTimeSelection = values.preferred_time_block?.preferred_time_select?.selected_option;
  const selectedPreferredTime = preferredTimeSelection?.value?.startsWith('time_')
    ? preferredTimeSelection.value.replace(/^time_\d+_/, '') // Extract the time string
    : null;

  // Extract custom date/time (optional override)
  const customMeetingDate = values.meeting_date_block?.meeting_date?.selected_date;
  const customMeetingTime = values.meeting_time_block?.meeting_time?.selected_time;

  // Determine final meeting time: custom overrides preferred
  let meetingDateTime: string | null = null;
  let meetingDisplayText: string;

  if (customMeetingDate && customMeetingTime) {
    // Use custom date/time
    meetingDateTime = new Date(`${customMeetingDate}T${customMeetingTime}:00-05:00`).toISOString();
    meetingDisplayText = `${customMeetingDate} at ${customMeetingTime} EST`;
    console.log(`[slack-callback] Using custom meeting time: ${meetingDisplayText}`);
  } else if (selectedPreferredTime) {
    // Use selected preferred time (store as text, it's already formatted)
    meetingDisplayText = selectedPreferredTime;
    console.log(`[slack-callback] Using preferred time: ${meetingDisplayText}`);
    // Note: Preferred times are free-form text like "Monday 2pm EST" - store as-is
  } else {
    console.error('[slack-callback] No meeting time selected');
    return new Response(JSON.stringify({
      response_action: "errors",
      errors: {
        preferred_time_block: "Please select a preferred time or enter a custom date/time"
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const googleMeetLink = values.google_meet_block?.google_meet_link?.value || null;
  const adminNotes = values.admin_notes_block?.admin_notes?.value || null;

  console.log(`[slack-callback] Assigning co-host for request ${metadata.requestId}`);
  console.log(`[slack-callback] Co-Host: ${cohostData.display} (name: ${cohostData.name})`);
  console.log(`[slack-callback] Meeting: ${meetingDisplayText}`);

  // Update the co-host request in database
  // Store the display name (matches os_cohost_admins.display pattern from Bubble.io)
  const updateData: Record<string, unknown> = {
    "Co-Host selected (OS)": cohostData.display, // Display name from os_cohost_admins
    "Status - Co-Host Request": "Co-Host Selected",
    "Modified Date": new Date().toISOString()
  };

  // Store meeting time - prefer ISO timestamp if available, otherwise store the text
  // Note: "Meeting Date Time" is a text field, so we can store either ISO or display text
  if (meetingDateTime) {
    // Custom date/time selected - store as ISO
    updateData["Meeting Date Time"] = meetingDateTime;
  } else if (meetingDisplayText) {
    // Preferred time selected - store the display text (e.g., "Monday, December 23 at 2:00 PM EST")
    updateData["Meeting Date Time"] = meetingDisplayText;
  }

  if (googleMeetLink) {
    updateData["Google Meet Link"] = googleMeetLink;
  }
  if (adminNotes) {
    updateData["Admin Notes"] = adminNotes;
  }

  const { error: updateError } = await supabase
    .from('co_hostrequest')
    .update(updateData)
    .eq('_id', metadata.requestId);

  if (updateError) {
    console.error('[slack-callback] Database update failed:', updateError);
    console.error('[slack-callback] Error details - code:', updateError.code, 'message:', updateError.message);
    return new Response(JSON.stringify({
      response_action: "errors",
      errors: {
        meeting_date_block: `Database error: ${updateError.message}. Please try again.`
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log('[slack-callback] Database updated successfully');

  // Update the original Slack message to show it's been claimed
  const token = Deno.env.get('SLACK_BOT_TOKEN');

  if (token && metadata.channelId && metadata.messageTs) {
    const updatedBlocks = [
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
            text: `*Assigned Co-Host:*\n${cohostData.display}`
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
            text: `*Meeting:*\n${meetingDisplayText}`
          }
        ]
      },
      ...(googleMeetLink ? [{
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Google Meet:*\n<${googleMeetLink}|Join Meeting>`
        }
      }] : []),
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Processed by <@${metadata.adminSlackId}> • Host notification will be sent`
          }
        ]
      }
    ];

    await fetch('https://slack.com/api/chat.update', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: metadata.channelId,
        ts: metadata.messageTs,
        blocks: updatedBlocks,
        text: `Co-Host request ${metadata.requestId} assigned to ${cohostData.display}`
      })
    });

    console.log('[slack-callback] Original Slack message updated');
  }

  // Trigger host notification (fire-and-forget)
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (supabaseUrl && supabaseAnonKey) {
    fetch(`${supabaseUrl}/functions/v1/cohost-request`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'notify-host',
        payload: {
          requestId: metadata.requestId,
          hostEmail: metadata.hostEmail,
          hostName: metadata.hostName,
          cohostName: cohostData.display,
          cohostEmail: cohostData.email,
          meetingDateTime: meetingDateTime || meetingDisplayText,
          googleMeetLink
        }
      })
    }).catch(err => {
      console.error('[slack-callback] Failed to trigger host notification:', err);
    });

    console.log('[slack-callback] Host notification triggered');
  }

  // Return empty response to close the modal
  return new Response('', { status: 200 });
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
  corsHeaders,

  // Action Handlers
  handleButtonClick,
  handleModalSubmission,
})
