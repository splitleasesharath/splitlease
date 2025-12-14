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
import { processTemplate, validatePlaceholders } from '../lib/templateProcessor.ts';
import { buildSendGridRequestBody, sendEmail, isSuccessResponse } from '../lib/sendgridClient.ts';

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

  const htmlContent = emailTemplate['Email Template JSON'];
  if (!htmlContent) {
    throw new Error(`Template ${template_id} has no HTML content (Email Template JSON is empty)`);
  }

  // Step 2: Process template placeholders
  console.log('[send-email:send] Step 2/3: Processing template placeholders...');

  // Validate all placeholders have values (warning only)
  const missingPlaceholders = validatePlaceholders(htmlContent, variables);
  if (missingPlaceholders.length > 0) {
    console.warn('[send-email:send] Missing placeholder values:', missingPlaceholders.join(', '));
  }

  const processedHtml = processTemplate(htmlContent, variables);
  console.log('[send-email:send] Template processed successfully');

  // Determine email parameters (payload provides values, fallback to defaults)
  // Note: The database table doesn't have Subject/From Email/From Name columns,
  // so these must be provided in the payload or use defaults
  const finalFromEmail = from_email || DEFAULT_FROM_EMAIL;
  const finalFromName = from_name || DEFAULT_FROM_NAME;
  const finalSubject = providedSubject || 'Message from Split Lease';

  // Also process subject if it contains placeholders
  const processedSubject = processTemplate(finalSubject, variables);

  // Step 3: Send via SendGrid
  console.log('[send-email:send] Step 3/3: Sending via SendGrid...');

  const sendGridBody = buildSendGridRequestBody({
    toEmail: to_email,
    toName: to_name,
    fromEmail: finalFromEmail,
    fromName: finalFromName,
    subject: processedSubject,
    htmlContent: processedHtml,
  });

  const sendGridResponse = await sendEmail(sendgridApiKey, sendgridEmailEndpoint, sendGridBody);

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
