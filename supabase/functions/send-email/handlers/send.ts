/**
 * Send Email Handler
 * Split Lease - send-email Edge Function
 *
 * Handles the 'send' action:
 * 1. Fetch template from database
 * 2. Process placeholders
 * 3. Send via SendGrid
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequiredFields, validateEmail } from '../../_shared/validation.ts';
import type { SendEmailPayload, EmailTemplate, SendEmailResult } from '../lib/types.ts';
import { processTemplateJson, validatePlaceholders } from '../lib/templateProcessor.ts';
import { sendEmailRaw, isSuccessResponse } from '../lib/sendgridClient.ts';

// Default sender configuration
const DEFAULT_FROM_EMAIL = 'noreply@splitlease.com';
const DEFAULT_FROM_NAME = 'Split Lease';

/**
 * Handle send email action
 */
export async function handleSend(
  payload: Record<string, unknown>
): Promise<SendEmailResult> {
  console.log('[send-email:send] ========== SEND EMAIL ==========');
  console.log('[send-email:send] Payload:', JSON.stringify({
    ...payload,
    variables: '(redacted for logging)'
  }, null, 2));

  // Validate required fields
  validateRequiredFields(payload, ['template_id', 'to_email', 'variables']);

  const {
    template_id,
    to_email,
    to_name,
    from_email,
    from_name,
    subject: providedSubject,
    variables,
    cc_emails,
    bcc_emails,
  } = payload as SendEmailPayload;

  // Validate email format
  validateEmail(to_email);

  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
  const sendgridEmailEndpoint = Deno.env.get('SENDGRID_EMAIL_ENDPOINT');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  if (!sendgridApiKey) {
    throw new Error('Missing SENDGRID_API_KEY environment variable');
  }

  if (!sendgridEmailEndpoint) {
    throw new Error('Missing SENDGRID_EMAIL_ENDPOINT environment variable');
  }

  // Initialize Supabase client with reference_table schema access
  // The reference_table schema must be exposed in API settings (Dashboard > API > Exposed schemas)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'reference_table',
    },
  });

  // Step 1: Fetch template from database
  console.log('[send-email:send] Step 1/3: Fetching template...');
  console.log('[send-email:send] Looking up template_id:', template_id);

  const { data: template, error: templateError } = await supabase
    .from('zat_email_html_template_eg_sendbasicemailwf_')
    .select('_id, "Name", "Email Template JSON", "Description", "Email Reference", "Logo", "Placeholder"')
    .eq('_id', template_id)
    .single();

  console.log('[send-email:send] Query result - data:', template ? 'found' : 'null');
  console.log('[send-email:send] Query result - error:', templateError ? JSON.stringify(templateError) : 'none');

  if (templateError || !template) {
    console.error('[send-email:send] Template fetch error:', templateError);
    console.error('[send-email:send] Template data:', template);
    throw new Error(`Template not found: ${template_id}. Error: ${templateError?.message || 'No data returned'}`);
  }

  const emailTemplate = template as EmailTemplate;
  console.log('[send-email:send] Template found:', emailTemplate.Name || template_id);

  const templateJsonString = emailTemplate['Email Template JSON'];
  if (!templateJsonString) {
    throw new Error(`Template ${template_id} has no content (Email Template JSON is empty)`);
  }

  // Step 2: Process template placeholders
  // The template is a SendGrid JSON payload with $$placeholder$$ variables
  console.log('[send-email:send] Step 2/3: Processing template placeholders...');

  // Build the complete variables object, merging payload values with provided overrides
  const allVariables: Record<string, string> = {
    ...variables,
    // Override with explicit payload values if provided
    to_email: to_email,
    from_email: from_email || DEFAULT_FROM_EMAIL,
    from_name: from_name || DEFAULT_FROM_NAME,
    subject: providedSubject || variables.subject || 'Message from Split Lease',
  };

  // Add to_name if provided
  if (to_name) {
    allVariables.to_name = to_name;
  }

  // Log placeholder replacements for debugging
  console.log('[send-email:send] Placeholder replacements:', JSON.stringify(allVariables, null, 2));

  // Validate all placeholders have values (warning only)
  const missingPlaceholders = validatePlaceholders(templateJsonString, allVariables);
  if (missingPlaceholders.length > 0) {
    console.warn('[send-email:send] Missing placeholder values:', missingPlaceholders.join(', '));
  }

  // Process placeholders in the entire JSON string (with JSON-safe escaping)
  const processedJsonString = processTemplateJson(templateJsonString, allVariables);
  console.log('[send-email:send] Template processed successfully');
  console.log('[send-email:send] Processed JSON payload:', processedJsonString);

  // Step 3: Parse and send via SendGrid
  console.log('[send-email:send] Step 3/3: Sending via SendGrid...');

  let sendGridBody: Record<string, unknown>;
  try {
    sendGridBody = JSON.parse(processedJsonString);
  } catch (parseError) {
    console.error('[send-email:send] Failed to parse processed template as JSON:', parseError);
    throw new Error(`Template ${template_id} produced invalid JSON after placeholder processing`);
  }

  // Inject CC and BCC recipients into personalizations if provided
  if ((cc_emails && cc_emails.length > 0) || (bcc_emails && bcc_emails.length > 0)) {
    const personalizations = sendGridBody.personalizations as Array<Record<string, unknown>>;
    if (personalizations && personalizations.length > 0) {
      // Add CC recipients
      if (cc_emails && cc_emails.length > 0) {
        const validCcEmails = cc_emails.filter(email => email && email.trim() && email.includes('@'));
        if (validCcEmails.length > 0) {
          personalizations[0].cc = validCcEmails.map(email => ({ email: email.trim() }));
          console.log('[send-email:send] Added CC recipients:', validCcEmails.length);
        }
      }
      // Add BCC recipients
      if (bcc_emails && bcc_emails.length > 0) {
        const validBccEmails = bcc_emails.filter(email => email && email.trim() && email.includes('@'));
        if (validBccEmails.length > 0) {
          personalizations[0].bcc = validBccEmails.map(email => ({ email: email.trim() }));
          console.log('[send-email:send] Added BCC recipients:', validBccEmails.length);
        }
      }
    }
  }

  const sendGridResponse = await sendEmailRaw(sendgridApiKey, sendgridEmailEndpoint, sendGridBody);

  if (!isSuccessResponse(sendGridResponse)) {
    const errorMessage = typeof sendGridResponse.body === 'object'
      ? JSON.stringify(sendGridResponse.body)
      : String(sendGridResponse.body);
    throw new Error(`SendGrid API error (${sendGridResponse.statusCode}): ${errorMessage}`);
  }

  console.log('[send-email:send] ========== SUCCESS ==========');

  // Extract message ID if available
  const messageId = sendGridResponse.body && typeof sendGridResponse.body === 'object'
    ? (sendGridResponse.body as { messageId?: string }).messageId
    : undefined;

  return {
    message_id: messageId,
    template_id: template_id,
    to_email: to_email,
    status: 'sent',
    sent_at: new Date().toISOString(),
  };
}
