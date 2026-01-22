/**
 * Assign Emergency Handler
 * Split Lease - Emergency Edge Function
 *
 * Assigns an emergency to a team member and sends Slack notification
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendToSlack } from "../../_shared/slack.ts";

interface AssignPayload {
  emergencyId: string;
  assignedToUserId: string;
  guidanceInstructions?: string;
}

interface AdminUser {
  id: string;
  email: string;
  userId: string;
}

export async function handleAssignEmergency(
  payload: AssignPayload,
  user: AdminUser,
  supabase: SupabaseClient
): Promise<unknown> {
  console.log('[emergency:assignEmergency] Assigning emergency:', payload.emergencyId);

  const { emergencyId, assignedToUserId, guidanceInstructions } = payload;

  if (!emergencyId) {
    throw new Error('Emergency ID is required');
  }

  if (!assignedToUserId) {
    throw new Error('Assigned user ID is required');
  }

  // Verify the assigned user exists and is admin
  const { data: assignedUser, error: userError } = await supabase
    .from('user')
    .select('_id, "First name", "Last name", email, admin')
    .eq('_id', assignedToUserId)
    .single();

  if (userError || !assignedUser) {
    throw new Error(`Assigned user not found: ${assignedToUserId}`);
  }

  if (!assignedUser.admin) {
    throw new Error('Assigned user must be an admin');
  }

  // Update emergency
  const updateData: Record<string, unknown> = {
    assigned_to_user_id: assignedToUserId,
    assigned_at: new Date().toISOString(),
    status: 'ASSIGNED',
  };

  if (guidanceInstructions !== undefined) {
    updateData.guidance_instructions = guidanceInstructions;
  }

  const { data, error } = await supabase
    .from('emergency_report')
    .update(updateData)
    .eq('id', emergencyId)
    .select()
    .single();

  if (error) {
    console.error('[emergency:assignEmergency] Update error:', error);
    throw new Error(`Failed to assign emergency: ${error.message}`);
  }

  console.log('[emergency:assignEmergency] Emergency assigned successfully');

  // Send Slack notification
  try {
    await notifySlackAssignment(data, assignedUser, user, supabase);
  } catch (slackError) {
    console.warn('[emergency:assignEmergency] Slack notification failed:', slackError);
  }

  return data;
}

/**
 * Send Slack notification for emergency assignment
 */
async function notifySlackAssignment(
  emergency: Record<string, unknown>,
  assignedUser: Record<string, unknown>,
  assignedBy: AdminUser,
  supabase: SupabaseClient
): Promise<void> {
  // Fetch additional context
  let proposalInfo = '';

  if (emergency.proposal_id) {
    const { data: proposal } = await supabase
      .from('proposal')
      .select('"Agreement #"')
      .eq('_id', emergency.proposal_id)
      .single();

    if (proposal) {
      proposalInfo = `Agreement #: ${proposal['Agreement #'] || 'N/A'}`;
    }
  }

  const assignedToName = `${assignedUser['First name'] || ''} ${assignedUser['Last name'] || ''}`.trim() || assignedUser.email;

  const message = {
    text: [
      `📋 *EMERGENCY ASSIGNED*`,
      ``,
      `*Type:* ${emergency.emergency_type}`,
      `*Assigned To:* ${assignedToName}`,
      `*Assigned By:* ${assignedBy.email}`,
      proposalInfo ? `*${proposalInfo}*` : '',
      emergency.guidance_instructions ? `*Guidance:* ${emergency.guidance_instructions}` : '',
      ``,
      `*Emergency ID:* ${emergency.id}`,
    ].filter(Boolean).join('\n'),
  };

  sendToSlack('database', message);
}
