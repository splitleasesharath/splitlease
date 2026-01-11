/**
 * VM Messaging Helpers
 * Orchestrates multi-channel messaging (in-app, email, SMS) for virtual meeting events
 *
 * Mirrors Bubble workflow: L2-sms-in-app-email-message! SPLIT BOT Virtual Meeting Management
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  findOrCreateProposalThread,
  createSplitBotMessage,
  updateThreadLastMessage,
  getUserProfile,
} from './messagingHelpers.ts';
import {
  getCTAByName,
  getVisibilityForRole,
} from './ctaHelpers.ts';

// ============================================
// TYPES
// ============================================

interface VMMessageContext {
  proposalId: string;
  hostUserId: string;
  guestUserId: string;
  listingId?: string;
  listingName?: string;
  hostName?: string;
  guestName?: string;
  hostEmail?: string;
  guestEmail?: string;
  hostPhone?: string;  // E.164 format
  guestPhone?: string; // E.164 format
  bookedDate?: string; // ISO 8601 for accept messages
  suggestedDates?: string[]; // For request messages
  notifyHostSms?: boolean;
  notifyHostEmail?: boolean;
  notifyGuestSms?: boolean;
  notifyGuestEmail?: boolean;
}

interface SendVMMessagesResult {
  threadId: string;
  guestMessageId?: string;
  hostMessageId?: string;
  guestEmailSent?: boolean;
  hostEmailSent?: boolean;
  guestSmsSent?: boolean;
  hostSmsSent?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const EMAIL_TEMPLATE_ID = '1756320055390x685004717147094100'; // General Email Template 4
const DEFAULT_FROM_EMAIL = 'notifications@leasesplit.com';
const DEFAULT_FROM_NAME = 'Split Lease';
const LOGO_URL = 'https://splitlease.com/assets/images/split-lease-logo.png';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format dates for display (EST timezone)
 */
function formatDatesForDisplay(dates: string[]): string {
  return dates
    .map(d => {
      const date = new Date(d);
      return date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/New_York',
      });
    })
    .join(', ') + ' (EST)';
}

/**
 * Format single date for display
 */
function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  }) + ' (EST)';
}

/**
 * Send email via send-email edge function
 */
async function sendEmail(
  params: {
    toEmail: string;
    toName: string;
    subject: string;
    title: string;
    bodytext1: string;
    bodytext2: string;
    buttonUrl: string;
    buttonText: string;
    preheaderText: string;
    warningMessage?: string;
  }
): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send',
        payload: {
          template_id: EMAIL_TEMPLATE_ID,
          to_email: params.toEmail,
          to_name: params.toName,
          from_email: DEFAULT_FROM_EMAIL,
          from_name: DEFAULT_FROM_NAME,
          subject: params.subject,
          variables: {
            title: params.title,
            bodytext1: params.bodytext1,
            bodytext2: params.bodytext2,
            button_url: params.buttonUrl,
            button_text: params.buttonText,
            logourl: LOGO_URL,
            preheadertext: params.preheaderText,
            warningmessage: params.warningMessage || '',
            banner: '',
            cc_email: '',
            bcc_email: '',
            message_id: '',
            in_reply_to: '',
            references: '',
          }
        }
      })
    });

    const result = await response.json();
    console.log(`[vmMessaging] Email sent to ${params.toEmail}:`, result.success);
    return result.success === true;
  } catch (error) {
    console.error(`[vmMessaging] Failed to send email to ${params.toEmail}:`, error);
    return false;
  }
}

/**
 * Send SMS via Twilio directly
 */
async function sendSms(
  params: {
    toPhone: string;
    messageBody: string;
  }
): Promise<boolean> {
  try {
    // Validate phone format (E.164)
    if (!params.toPhone || !/^\+[1-9]\d{1,14}$/.test(params.toPhone)) {
      console.log(`[vmMessaging] Invalid phone format, skipping SMS: ${params.toPhone}`);
      return false;
    }

    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromPhone = Deno.env.get('TWILIO_FROM_PHONE');

    if (!twilioSid || !twilioToken || !fromPhone) {
      console.log('[vmMessaging] Twilio credentials not configured, skipping SMS');
      return false;
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const authHeader = 'Basic ' + btoa(`${twilioSid}:${twilioToken}`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: params.toPhone,
        From: fromPhone,
        Body: params.messageBody,
      }).toString(),
    });

    const result = await response.json();
    const success = response.status === 201;
    console.log(`[vmMessaging] SMS sent to ${params.toPhone}:`, success, result.sid || result.message);
    return success;
  } catch (error) {
    console.error(`[vmMessaging] Failed to send SMS to ${params.toPhone}:`, error);
    return false;
  }
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Send notifications when a virtual meeting is REQUESTED
 *
 * Mirrors Bubble Steps 9-12 from CORE-create-virtual-meeting-request
 */
export async function sendVMRequestMessages(
  supabase: SupabaseClient,
  context: VMMessageContext,
  requesterIsHost: boolean
): Promise<SendVMMessagesResult> {
  console.log('[vmMessaging] Sending VM request messages, requesterIsHost:', requesterIsHost);

  const result: SendVMMessagesResult = { threadId: '' };

  // Step 1: Find or create thread for this proposal
  const { threadId } = await findOrCreateProposalThread(supabase, {
    proposalId: context.proposalId,
    hostUserId: context.hostUserId,
    guestUserId: context.guestUserId,
    listingId: context.listingId || '',
    listingName: context.listingName || '',
  });
  result.threadId = threadId;

  // Step 2: Fetch user names if not provided
  const [hostProfile, guestProfile] = await Promise.all([
    context.hostName ? null : getUserProfile(supabase, context.hostUserId),
    context.guestName ? null : getUserProfile(supabase, context.guestUserId),
  ]);

  const hostName = context.hostName || hostProfile?.firstName || 'Host';
  const guestName = context.guestName || guestProfile?.firstName || 'Guest';

  // Format suggested dates for messages
  const datesDisplay = context.suggestedDates
    ? formatDatesForDisplay(context.suggestedDates)
    : 'the requested times';

  const splitBotWarning = 'Split Lease will confirm your chosen time slot';

  // Determine CTAs
  const guestCTA = await getCTAByName(supabase, 'view_virtual_meeting_guest');
  const hostCTA = await getCTAByName(supabase, 'see_virtual_meeting_host');

  // ─────────────────────────────────────────────────────────
  // IN-APP MESSAGES
  // ─────────────────────────────────────────────────────────

  // Message to REQUESTER (confirmation)
  const requesterMessage = requesterIsHost
    ? `Your virtual meeting request has been sent for the times: ${datesDisplay}. ${guestName} will respond as soon as possible.`
    : `Your virtual meeting request has been sent for the times: ${datesDisplay}. ${hostName} will respond when they are able.`;

  const requesterCTA = requesterIsHost ? hostCTA : guestCTA;
  const requesterRole = requesterIsHost ? 'host' : 'guest';
  const requesterVisibility = getVisibilityForRole(requesterRole);

  if (requesterCTA) {
    const messageId = await createSplitBotMessage(supabase, {
      threadId,
      messageBody: requesterMessage,
      callToAction: requesterCTA.display,
      visibleToHost: requesterVisibility.visibleToHost,
      visibleToGuest: requesterVisibility.visibleToGuest,
      splitBotWarning,
      recipientUserId: requesterIsHost ? context.hostUserId : context.guestUserId,
    });

    if (requesterIsHost) {
      result.hostMessageId = messageId;
    } else {
      result.guestMessageId = messageId;
    }
  }

  // Message to RECIPIENT (notification)
  const recipientMessage = requesterIsHost
    ? `A virtual meeting request from ${hostName} has been sent for the times: ${datesDisplay}. Please respond as soon as you can.`
    : `A virtual meeting request from ${guestName} has been sent for the times: ${datesDisplay}. Please respond as soon as you can.`;

  const recipientCTA = requesterIsHost ? guestCTA : hostCTA;
  const recipientRole = requesterIsHost ? 'guest' : 'host';
  const recipientVisibility = getVisibilityForRole(recipientRole);

  if (recipientCTA) {
    const messageId = await createSplitBotMessage(supabase, {
      threadId,
      messageBody: recipientMessage,
      callToAction: recipientCTA.display,
      visibleToHost: recipientVisibility.visibleToHost,
      visibleToGuest: recipientVisibility.visibleToGuest,
      splitBotWarning,
      recipientUserId: requesterIsHost ? context.guestUserId : context.hostUserId,
    });

    if (requesterIsHost) {
      result.guestMessageId = messageId;
    } else {
      result.hostMessageId = messageId;
    }
  }

  // Update thread last message
  await updateThreadLastMessage(supabase, threadId, 'Virtual meeting request sent');

  // ─────────────────────────────────────────────────────────
  // EMAIL NOTIFICATIONS
  // ─────────────────────────────────────────────────────────

  const proposalUrl = `https://splitlease.com/guest-proposals?proposalId=${context.proposalId}&section=virtual-meeting`;
  const hostProposalUrl = `https://splitlease.com/host-proposals?proposalId=${context.proposalId}&section=virtual-meeting`;

  // Email to GUEST
  if (context.notifyGuestEmail && context.guestEmail) {
    const guestEmailMessage = requesterIsHost
      ? `A virtual meeting request from ${hostName} has been sent for the times: ${datesDisplay}. Please respond as soon as you can.`
      : `Your virtual meeting request has been sent for the times: ${datesDisplay}. ${hostName} will respond when they are able.`;

    result.guestEmailSent = await sendEmail({
      toEmail: context.guestEmail,
      toName: guestName,
      subject: 'Virtual Meeting Request - Split Lease',
      title: 'Virtual Meeting Request',
      bodytext1: guestEmailMessage,
      bodytext2: 'The meeting will be hosted via Google Meet and we will share the link as soon as the meeting is confirmed.',
      buttonUrl: proposalUrl,
      buttonText: 'View Virtual Meeting',
      preheaderText: 'A virtual meeting has been requested',
      warningMessage: splitBotWarning,
    });
  }

  // Email to HOST
  if (context.notifyHostEmail && context.hostEmail) {
    const hostEmailMessage = requesterIsHost
      ? `Your virtual meeting request has been sent for the times: ${datesDisplay}. ${guestName} will respond as soon as possible.`
      : `A virtual meeting request from ${guestName} has been sent for the times: ${datesDisplay}. Please respond as soon as you can.`;

    result.hostEmailSent = await sendEmail({
      toEmail: context.hostEmail,
      toName: hostName,
      subject: 'Virtual Meeting Request - Split Lease',
      title: 'Virtual Meeting Request',
      bodytext1: hostEmailMessage,
      bodytext2: 'The meeting will be hosted via Google Meet and we will share the link as soon as the meeting is confirmed.',
      buttonUrl: hostProposalUrl,
      buttonText: 'See Virtual Meeting',
      preheaderText: 'A virtual meeting has been requested',
      warningMessage: splitBotWarning,
    });
  }

  // ─────────────────────────────────────────────────────────
  // SMS NOTIFICATIONS
  // ─────────────────────────────────────────────────────────

  // SMS to GUEST
  if (context.notifyGuestSms && context.guestPhone) {
    const guestSmsMessage = requesterIsHost
      ? `Split Lease: ${hostName} has requested a virtual meeting. Log in to respond.`
      : `Split Lease: Your virtual meeting request has been sent. ${hostName} will respond soon.`;

    result.guestSmsSent = await sendSms({
      toPhone: context.guestPhone,
      messageBody: guestSmsMessage,
    });
  }

  // SMS to HOST
  if (context.notifyHostSms && context.hostPhone) {
    const hostSmsMessage = requesterIsHost
      ? `Split Lease: Your virtual meeting request has been sent. ${guestName} will respond soon.`
      : `Split Lease: ${guestName} has requested a virtual meeting. Log in to respond.`;

    result.hostSmsSent = await sendSms({
      toPhone: context.hostPhone,
      messageBody: hostSmsMessage,
    });
  }

  console.log('[vmMessaging] VM request messages complete:', result);
  return result;
}

/**
 * Send notifications when a virtual meeting is ACCEPTED
 *
 * Mirrors Bubble Steps 4-14 from Virtual Meeting Accept Workflow
 */
export async function sendVMAcceptMessages(
  supabase: SupabaseClient,
  context: VMMessageContext,
  isConfirmedBySL: boolean
): Promise<SendVMMessagesResult> {
  console.log('[vmMessaging] Sending VM accept messages, confirmed:', isConfirmedBySL);

  const result: SendVMMessagesResult = { threadId: '' };

  // Step 1: Find thread for this proposal (should exist)
  const { threadId } = await findOrCreateProposalThread(supabase, {
    proposalId: context.proposalId,
    hostUserId: context.hostUserId,
    guestUserId: context.guestUserId,
    listingId: context.listingId || '',
    listingName: context.listingName || '',
  });
  result.threadId = threadId;

  // Step 2: Fetch user names if not provided
  const [hostProfile, guestProfile] = await Promise.all([
    context.hostName ? null : getUserProfile(supabase, context.hostUserId),
    context.guestName ? null : getUserProfile(supabase, context.guestUserId),
  ]);

  const hostName = context.hostName || hostProfile?.firstName || 'Host';
  const guestName = context.guestName || guestProfile?.firstName || 'Guest';

  // Format booked date
  const dateDisplay = context.bookedDate
    ? formatDateForDisplay(context.bookedDate)
    : 'the agreed time';

  // Determine message content based on SL confirmation status
  const confirmedMessage = `The virtual meeting has been accepted and is scheduled for ${dateDisplay}. The meeting will be hosted via Google Meet and we will share the link as soon as it is ready.`;

  const pendingMessage = `The virtual meeting date has been agreed for ${dateDisplay}. Now you are waiting for Split Lease confirmation. The meeting will be hosted via Google Meet and we will share the link as soon as the meeting is confirmed.`;

  const messageBody = isConfirmedBySL ? confirmedMessage : pendingMessage;
  const splitBotWarning = isConfirmedBySL ? undefined : 'Split Lease will confirm the booked date already agreed';

  // Get CTAs
  const guestCTA = await getCTAByName(supabase, 'view_virtual_meeting_guest');
  const hostCTA = await getCTAByName(supabase, 'see_virtual_meeting_host');

  // ─────────────────────────────────────────────────────────
  // IN-APP MESSAGES (to both parties)
  // ─────────────────────────────────────────────────────────

  // Message to GUEST
  if (guestCTA) {
    const guestMessageId = await createSplitBotMessage(supabase, {
      threadId,
      messageBody,
      callToAction: guestCTA.display,
      visibleToHost: false,
      visibleToGuest: true,
      splitBotWarning,
      recipientUserId: context.guestUserId,
    });
    result.guestMessageId = guestMessageId;
  }

  // Message to HOST
  if (hostCTA) {
    const hostMessageId = await createSplitBotMessage(supabase, {
      threadId,
      messageBody,
      callToAction: hostCTA.display,
      visibleToHost: true,
      visibleToGuest: false,
      splitBotWarning,
      recipientUserId: context.hostUserId,
    });
    result.hostMessageId = hostMessageId;
  }

  // Update thread last message
  const statusText = isConfirmedBySL ? 'Virtual meeting confirmed' : 'Virtual meeting accepted - pending confirmation';
  await updateThreadLastMessage(supabase, threadId, statusText);

  // ─────────────────────────────────────────────────────────
  // EMAIL NOTIFICATIONS
  // ─────────────────────────────────────────────────────────

  const proposalUrl = `https://splitlease.com/guest-proposals?proposalId=${context.proposalId}&section=virtual-meeting`;
  const hostProposalUrl = `https://splitlease.com/host-proposals?proposalId=${context.proposalId}&section=virtual-meeting`;

  const emailSubject = isConfirmedBySL
    ? 'Virtual Meeting Confirmed - Split Lease'
    : 'Virtual Meeting Accepted - Pending Confirmation';

  const emailTitle = isConfirmedBySL
    ? 'Virtual Meeting Confirmed'
    : 'Virtual Meeting Accepted';

  // Email to GUEST
  if (context.notifyGuestEmail && context.guestEmail) {
    result.guestEmailSent = await sendEmail({
      toEmail: context.guestEmail,
      toName: guestName,
      subject: emailSubject,
      title: emailTitle,
      bodytext1: messageBody,
      bodytext2: '',
      buttonUrl: proposalUrl,
      buttonText: 'View Virtual Meeting',
      preheaderText: emailTitle,
      warningMessage: splitBotWarning || '',
    });
  }

  // Email to HOST
  if (context.notifyHostEmail && context.hostEmail) {
    result.hostEmailSent = await sendEmail({
      toEmail: context.hostEmail,
      toName: hostName,
      subject: emailSubject,
      title: emailTitle,
      bodytext1: messageBody,
      bodytext2: '',
      buttonUrl: hostProposalUrl,
      buttonText: 'See Virtual Meeting',
      preheaderText: emailTitle,
      warningMessage: splitBotWarning || '',
    });
  }

  // ─────────────────────────────────────────────────────────
  // SMS NOTIFICATIONS
  // ─────────────────────────────────────────────────────────

  const smsMessage = isConfirmedBySL
    ? `Split Lease: Your virtual meeting is confirmed for ${dateDisplay}. We'll share the meeting link soon.`
    : `Split Lease: Virtual meeting accepted for ${dateDisplay}. Awaiting Split Lease confirmation.`;

  // SMS to GUEST
  if (context.notifyGuestSms && context.guestPhone) {
    result.guestSmsSent = await sendSms({
      toPhone: context.guestPhone,
      messageBody: smsMessage,
    });
  }

  // SMS to HOST
  if (context.notifyHostSms && context.hostPhone) {
    result.hostSmsSent = await sendSms({
      toPhone: context.hostPhone,
      messageBody: smsMessage,
    });
  }

  console.log('[vmMessaging] VM accept messages complete:', result);
  return result;
}
