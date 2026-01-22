/**
 * Send SMS Handler
 * Split Lease - Emergency Edge Function
 *
 * Sends SMS via Twilio and logs to database
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SendSMSPayload {
  emergencyId: string;
  recipientPhone: string;
  messageBody: string;
}

interface AdminUser {
  id: string;
  email: string;
  userId: string;
}

export async function handleSendSMS(
  payload: SendSMSPayload,
  _user: AdminUser,
  supabase: SupabaseClient
): Promise<unknown> {
  console.log('[emergency:sendSMS] Sending SMS for emergency:', payload.emergencyId);

  const { emergencyId, recipientPhone, messageBody } = payload;

  if (!emergencyId) {
    throw new Error('Emergency ID is required');
  }

  if (!recipientPhone) {
    throw new Error('Recipient phone is required');
  }

  if (!messageBody) {
    throw new Error('Message body is required');
  }

  // Verify emergency exists
  const { data: emergency, error: emergencyError } = await supabase
    .from('emergency_report')
    .select('id')
    .eq('id', emergencyId)
    .single();

  if (emergencyError || !emergency) {
    throw new Error(`Emergency not found: ${emergencyId}`);
  }

  // Get Twilio credentials
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    throw new Error('Missing Twilio credentials');
  }

  // Create message log entry (pending)
  const { data: messageLog, error: logError } = await supabase
    .from('emergency_message')
    .insert({
      emergency_report_id: emergencyId,
      direction: 'OUTBOUND',
      recipient_phone: recipientPhone,
      sender_phone: twilioPhoneNumber,
      message_body: messageBody,
      status: 'PENDING',
    })
    .select()
    .single();

  if (logError) {
    console.error('[emergency:sendSMS] Log insert error:', logError);
    throw new Error(`Failed to create message log: ${logError.message}`);
  }

  // Send SMS via Twilio
  try {
    const twilioResponse = await sendTwilioSMS({
      accountSid: twilioAccountSid,
      authToken: twilioAuthToken,
      from: twilioPhoneNumber,
      to: recipientPhone,
      body: messageBody,
    });

    // Update log with success
    await supabase
      .from('emergency_message')
      .update({
        twilio_sid: twilioResponse.sid,
        status: 'SENT',
        sent_at: new Date().toISOString(),
      })
      .eq('id', messageLog.id);

    console.log('[emergency:sendSMS] SMS sent successfully, SID:', twilioResponse.sid);

    return {
      ...messageLog,
      twilio_sid: twilioResponse.sid,
      status: 'SENT',
      sent_at: new Date().toISOString(),
    };

  } catch (twilioError) {
    // Update log with failure
    await supabase
      .from('emergency_message')
      .update({
        status: 'FAILED',
        error_message: (twilioError as Error).message,
      })
      .eq('id', messageLog.id);

    console.error('[emergency:sendSMS] Twilio error:', twilioError);
    throw new Error(`Failed to send SMS: ${(twilioError as Error).message}`);
  }
}

/**
 * Send SMS via Twilio REST API
 */
async function sendTwilioSMS(params: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
}): Promise<{ sid: string; status: string }> {
  const { accountSid, authToken, from, to, body } = params;

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append('To', to);
  formData.append('From', from);
  formData.append('Body', body);

  const credentials = btoa(`${accountSid}:${authToken}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || `Twilio API error: ${response.status}`);
  }

  return {
    sid: result.sid,
    status: result.status,
  };
}
