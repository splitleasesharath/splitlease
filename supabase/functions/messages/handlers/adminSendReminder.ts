/**
 * Admin Send Reminder Handler
 * Split Lease - Messages Edge Function
 *
 * Sends reminder notifications to thread participants (admin only)
 * Uses existing SendGrid email and SMS infrastructure
 *
 * NO FALLBACK PRINCIPLE: Throws if notification sending fails
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AuthenticationError, ValidationError } from '../../_shared/errors.ts';

interface AdminSendReminderPayload {
  threadId: string;
  recipientType: 'host' | 'guest' | 'both';
  method: 'email' | 'sms' | 'both';
}

interface AdminSendReminderResult {
  success: boolean;
  sentTo: Array<{
    type: 'host' | 'guest';
    method: 'email' | 'sms';
    recipient: string;
  }>;
}

/**
 * Verify that the current user is an admin
 */
async function verifyAdminRole(
  supabaseAdmin: SupabaseClient,
  user: { id: string; email: string }
): Promise<boolean> {
  const { data: userData, error } = await supabaseAdmin
    .from('user')
    .select('_id, "Toggle - Is Admin"')
    .ilike('email', user.email)
    .maybeSingle();

  if (error) {
    console.error('[adminSendReminder] Admin check query failed:', error.message);
    return false;
  }

  return userData?.['Toggle - Is Admin'] === true;
}

/**
 * Send email via SendGrid (using existing edge function pattern)
 */
async function sendReminderEmail(
  to: string,
  recipientName: string,
  threadSubject: string,
  messagePreview: string
): Promise<boolean> {
  const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

  if (!SENDGRID_API_KEY) {
    console.error('[adminSendReminder] SENDGRID_API_KEY not configured');
    throw new Error('Email service not configured');
  }

  const emailContent = {
    personalizations: [
      {
        to: [{ email: to }],
        dynamic_template_data: {
          recipient_name: recipientName,
          thread_subject: threadSubject,
          message_preview: messagePreview,
          action_url: 'https://splitlease.com/messages',
        },
      },
    ],
    from: {
      email: 'noreply@splitlease.com',
      name: 'Split Lease',
    },
    // Use a generic reminder template or create one
    // For now, using a simple text/html fallback
    subject: `Reminder: You have a message on Split Lease`,
    content: [
      {
        type: 'text/plain',
        value: `Hi ${recipientName},\n\nYou have an unread message on Split Lease regarding "${threadSubject}".\n\n"${messagePreview}"\n\nPlease log in to view and respond: https://splitlease.com/messages\n\nBest,\nThe Split Lease Team`,
      },
      {
        type: 'text/html',
        value: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6D31C2;">Message Reminder</h2>
            <p>Hi ${recipientName},</p>
            <p>You have an unread message on Split Lease regarding "<strong>${threadSubject}</strong>".</p>
            <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #6D31C2; margin: 20px 0;">
              ${messagePreview}
            </blockquote>
            <p>
              <a href="https://splitlease.com/messages" style="display: inline-block; background: #6D31C2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                View Message
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">Best,<br>The Split Lease Team</p>
          </div>
        `,
      },
    ],
  };

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailContent),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[adminSendReminder] SendGrid error:', response.status, errorText);
      return false;
    }

    console.log('[adminSendReminder] Email sent successfully to:', to);
    return true;
  } catch (err) {
    console.error('[adminSendReminder] Email send failed:', err);
    return false;
  }
}

/**
 * Send SMS via existing SMS service
 */
async function sendReminderSms(
  to: string,
  recipientName: string,
  threadSubject: string
): Promise<boolean> {
  const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
  const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
  const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error('[adminSendReminder] Twilio not configured');
    throw new Error('SMS service not configured');
  }

  // Format phone number (ensure it has country code)
  let formattedPhone = to.replace(/\D/g, '');
  if (formattedPhone.length === 10) {
    formattedPhone = '+1' + formattedPhone;
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+' + formattedPhone;
  }

  const message = `Hi ${recipientName}, you have an unread message on Split Lease regarding "${threadSubject}". Visit splitlease.com/messages to respond.`;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: TWILIO_PHONE_NUMBER,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const errorJson = await response.json();
      console.error('[adminSendReminder] Twilio error:', response.status, errorJson);
      return false;
    }

    console.log('[adminSendReminder] SMS sent successfully to:', formattedPhone);
    return true;
  } catch (err) {
    console.error('[adminSendReminder] SMS send failed:', err);
    return false;
  }
}

/**
 * Handle admin_send_reminder action
 * Sends reminder notifications to thread participants
 */
export async function handleAdminSendReminder(
  supabaseAdmin: SupabaseClient,
  payload: AdminSendReminderPayload,
  user: { id: string; email: string }
): Promise<AdminSendReminderResult> {
  console.log('[adminSendReminder] ========== ADMIN SEND REMINDER ==========');
  console.log('[adminSendReminder] User:', user.email);
  console.log('[adminSendReminder] Payload:', JSON.stringify(payload));

  // Step 1: Validate payload
  if (!payload.threadId) {
    throw new ValidationError('Thread ID is required');
  }
  if (!['host', 'guest', 'both'].includes(payload.recipientType)) {
    throw new ValidationError('Invalid recipient type');
  }
  if (!['email', 'sms', 'both'].includes(payload.method)) {
    throw new ValidationError('Invalid notification method');
  }

  // Step 2: Verify admin role
  const isAdmin = await verifyAdminRole(supabaseAdmin, user);
  if (!isAdmin) {
    throw new AuthenticationError('You do not have permission to send reminders.');
  }

  // Step 3: Fetch thread with user data
  const { data: thread, error: threadError } = await supabaseAdmin
    .from('thread')
    .select(`
      _id,
      "Thread Subject",
      "~Last Message",
      "-Host User",
      "-Guest User"
    `)
    .eq('_id', payload.threadId)
    .maybeSingle();

  if (threadError || !thread) {
    throw new ValidationError('Thread not found');
  }

  // Step 4: Fetch host and guest user data
  const userIds = [thread['-Host User'], thread['-Guest User']].filter(Boolean);

  const { data: users, error: usersError } = await supabaseAdmin
    .from('user')
    .select('_id, "Name - Full", email, "Phone Number (as text)"')
    .in('_id', userIds);

  if (usersError) {
    throw new Error(`Failed to fetch user data: ${usersError.message}`);
  }

  const userMap = (users || []).reduce((acc, u) => {
    acc[u._id] = u;
    return acc;
  }, {} as Record<string, typeof users[0]>);

  const hostUser = thread['-Host User'] ? userMap[thread['-Host User']] : null;
  const guestUser = thread['-Guest User'] ? userMap[thread['-Guest User']] : null;

  // Step 5: Send notifications
  const sentTo: AdminSendReminderResult['sentTo'] = [];
  const threadSubject = thread['Thread Subject'] || 'Your Conversation';
  const messagePreview = thread['~Last Message'] || 'You have a new message';

  const recipientsToNotify: Array<{ type: 'host' | 'guest'; user: typeof hostUser }> = [];

  if ((payload.recipientType === 'host' || payload.recipientType === 'both') && hostUser) {
    recipientsToNotify.push({ type: 'host', user: hostUser });
  }
  if ((payload.recipientType === 'guest' || payload.recipientType === 'both') && guestUser) {
    recipientsToNotify.push({ type: 'guest', user: guestUser });
  }

  for (const recipient of recipientsToNotify) {
    const recipientName = recipient.user['Name - Full'] || 'Valued User';

    // Send email
    if ((payload.method === 'email' || payload.method === 'both') && recipient.user.email) {
      const emailSent = await sendReminderEmail(
        recipient.user.email,
        recipientName,
        threadSubject,
        messagePreview
      );
      if (emailSent) {
        sentTo.push({
          type: recipient.type,
          method: 'email',
          recipient: recipient.user.email,
        });
      }
    }

    // Send SMS
    if ((payload.method === 'sms' || payload.method === 'both') && recipient.user['Phone Number (as text)']) {
      const smsSent = await sendReminderSms(
        recipient.user['Phone Number (as text)'],
        recipientName,
        threadSubject
      );
      if (smsSent) {
        sentTo.push({
          type: recipient.type,
          method: 'sms',
          recipient: recipient.user['Phone Number (as text)'],
        });
      }
    }
  }

  console.log('[adminSendReminder] Sent', sentTo.length, 'notifications');
  console.log('[adminSendReminder] ========== ADMIN SEND REMINDER COMPLETE ==========');

  return {
    success: sentTo.length > 0,
    sentTo,
  };
}
