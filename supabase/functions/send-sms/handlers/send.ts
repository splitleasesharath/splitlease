/**
 * Send SMS Handler
 * Split Lease - send-sms Edge Function
 *
 * Handles the 'send' action:
 * 1. Fetch template from database
 * 2. Process placeholders
 * 3. Send via Twilio
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { ValidationError } from '../../_shared/errors.ts';
import type { SendSmsPayload, SmsTemplate, SendSmsResult } from '../lib/types.ts';
import { processTemplate, validatePlaceholders, validateSmsLength } from '../lib/templateProcessor.ts';
import { buildTwilioRequestBody, sendSms, isSuccessResponse, getMessageSid } from '../lib/twilioClient.ts';

/**
 * Validate E.164 phone number format
 * E.164: +[country code][number], e.g., +15551234567
 */
function validatePhoneE164(phone: string, fieldName: string): void {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(phone)) {
    throw new ValidationError(
      `${fieldName} must be in E.164 format (e.g., +15551234567). Received: ${phone}`
    );
  }
}

/**
 * Handle send SMS action
 */
export async function handleSend(
  payload: Record<string, unknown>
): Promise<SendSmsResult> {
  console.log('[send-sms:send] ========== SEND SMS ==========');
  console.log('[send-sms:send] Payload:', JSON.stringify({
    ...payload,
    variables: '(redacted for logging)'
  }, null, 2));

  // Validate required fields
  validateRequiredFields(payload, ['template_id', 'to_phone', 'variables']);

  const {
    template_id,
    to_phone,
    from_phone,
    variables,
  } = payload as SendSmsPayload;

  // Validate phone format (E.164)
  validatePhoneE164(to_phone, 'to_phone');

  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioFromPhone = Deno.env.get('TWILIO_FROM_PHONE');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  if (!twilioAccountSid) {
    throw new Error('Missing TWILIO_ACCOUNT_SID environment variable');
  }

  if (!twilioAuthToken) {
    throw new Error('Missing TWILIO_AUTH_TOKEN environment variable');
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Step 1: Fetch template from database
  console.log('[send-sms:send] Step 1/3: Fetching template...');
  const { data: template, error: templateError } = await supabase
    .from('zat_sms_template')
    .select('_id, Name, "Message Content", "From Phone"')
    .eq('_id', template_id)
    .single();

  if (templateError || !template) {
    console.error('[send-sms:send] Template fetch error:', templateError);
    throw new Error(`SMS Template not found: ${template_id}`);
  }

  const smsTemplate = template as SmsTemplate;
  console.log('[send-sms:send] Template found:', smsTemplate.Name || template_id);

  const messageContent = smsTemplate['Message Content'];
  if (!messageContent) {
    throw new Error(`SMS Template ${template_id} has no message content`);
  }

  // Step 2: Process template placeholders
  console.log('[send-sms:send] Step 2/3: Processing template placeholders...');

  // Validate all placeholders have values (warning only)
  const missingPlaceholders = validatePlaceholders(messageContent, variables);
  if (missingPlaceholders.length > 0) {
    console.warn('[send-sms:send] Missing placeholder values:', missingPlaceholders.join(', '));
  }

  const processedBody = processTemplate(messageContent, variables);
  console.log('[send-sms:send] Template processed successfully');

  // Validate SMS length
  validateSmsLength(processedBody);
  console.log('[send-sms:send] SMS length:', processedBody.length, 'characters');

  // Determine from phone (payload overrides template, template overrides env default)
  const finalFromPhone = from_phone || smsTemplate['From Phone'] || twilioFromPhone;

  if (!finalFromPhone) {
    throw new Error('No from_phone provided and TWILIO_FROM_PHONE environment variable is not set');
  }

  // Validate from phone
  validatePhoneE164(finalFromPhone, 'from_phone');

  // Step 3: Send via Twilio
  console.log('[send-sms:send] Step 3/3: Sending via Twilio...');

  const twilioBody = buildTwilioRequestBody({
    toPhone: to_phone,
    fromPhone: finalFromPhone,
    body: processedBody,
  });

  const twilioResponse = await sendSms(twilioAccountSid, twilioAuthToken, twilioBody);

  if (!isSuccessResponse(twilioResponse)) {
    const errorMessage = typeof twilioResponse.body === 'object'
      ? JSON.stringify(twilioResponse.body)
      : String(twilioResponse.body);
    throw new Error(`Twilio API error (${twilioResponse.statusCode}): ${errorMessage}`);
  }

  console.log('[send-sms:send] ========== SUCCESS ==========');

  const messageSid = getMessageSid(twilioResponse);

  return {
    message_sid: messageSid,
    template_id: template_id,
    to_phone: to_phone,
    status: 'queued',
    sent_at: new Date().toISOString(),
  };
}
