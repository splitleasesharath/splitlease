/**
 * Slack Integration - Edge Function
 * Split Lease
 *
 * Routes Slack-related requests to appropriate handlers
 * Currently supports:
 * - faq_inquiry: Send FAQ inquiries to Slack channels
 *
 * NO AUTHENTICATION REQUIRED - Public endpoint
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { formatErrorResponse, getStatusCodeFromError, ValidationError } from '../_shared/errors.ts';
import { validateAction, validateRequiredFields, validateEmail } from '../_shared/validation.ts';

console.log('[slack] Edge Function started');

interface FaqInquiryPayload {
  name: string;
  email: string;
  inquiry: string;
}

interface SlackMessage {
  text: string;
}

/**
 * Handle FAQ inquiry submission
 * Sends inquiry to multiple Slack channels via webhooks
 */
async function handleFaqInquiry(payload: FaqInquiryPayload): Promise<{ message: string }> {
  console.log('[slack] Processing FAQ inquiry');

  // Validate required fields
  validateRequiredFields(payload, ['name', 'email', 'inquiry']);

  const { name, email, inquiry } = payload;

  // Validate email format
  validateEmail(email);

  // Get Slack webhook URLs from environment
  const webhookAcquisition = Deno.env.get('SLACK_WEBHOOK_ACQUISITION');
  const webhookGeneral = Deno.env.get('SLACK_WEBHOOK_GENERAL');

  if (!webhookAcquisition || !webhookGeneral) {
    console.error('[slack] Missing Slack webhook environment variables');
    throw new Error('Server configuration error: Slack webhooks not configured');
  }

  // Create Slack message
  const slackMessage: SlackMessage = {
    text: `*New FAQ Inquiry*\n\n*Name:* ${name}\n*Email:* ${email}\n*Inquiry:*\n${inquiry}`
  };

  const webhooks = [webhookAcquisition, webhookGeneral];

  // Send to both Slack channels
  console.log('[slack] Sending to Slack channels...');
  const results = await Promise.allSettled(
    webhooks.map(webhook =>
      fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage)
      })
    )
  );

  // Check if at least one succeeded
  const hasSuccess = results.some(
    result => result.status === 'fulfilled' && result.value.ok
  );

  if (!hasSuccess) {
    console.error('[slack] All Slack webhooks failed:', results);
    throw new Error('Failed to send inquiry to Slack');
  }

  console.log('[slack] FAQ inquiry sent successfully');
  return { message: 'Inquiry sent successfully' };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log(`[slack] ========== NEW REQUEST ==========`);
    console.log(`[slack] Method: ${req.method}`);
    console.log(`[slack] URL: ${req.url}`);

    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new ValidationError('Method not allowed. Use POST.');
    }

    // Parse request body
    const body = await req.json();
    console.log(`[slack] Request body:`, JSON.stringify(body, null, 2));

    validateRequiredFields(body, ['action']);
    const { action, payload } = body;

    // Validate action is supported
    const allowedActions = ['faq_inquiry'];
    validateAction(action, allowedActions);

    console.log(`[slack] Action: ${action}`);

    // Route to appropriate handler
    let result;

    switch (action) {
      case 'faq_inquiry':
        result = await handleFaqInquiry(payload);
        break;

      default:
        throw new ValidationError(`Unknown action: ${action}`);
    }

    console.log(`[slack] Handler completed successfully`);
    console.log(`[slack] ========== REQUEST COMPLETE ==========`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[slack] ========== ERROR ==========');
    console.error('[slack] Error:', error);
    console.error('[slack] Error stack:', error.stack);

    const statusCode = getStatusCodeFromError(error);
    const errorResponse = formatErrorResponse(error);

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
