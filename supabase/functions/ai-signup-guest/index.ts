/**
 * AI Signup Guest - Unauthenticated Endpoint
 * Split Lease - Edge Function
 *
 * Allows GUEST users (non-authenticated) to submit market research signups
 * This bypasses authentication requirements for this specific workflow
 *
 * Security: Rate limited by Supabase, validated inputs only
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { formatErrorResponse, getStatusCodeFromError } from '../_shared/errors.ts';
import { validateRequiredFields, validateEmail, validatePhone } from '../_shared/validation.ts';

console.log('[ai-signup-guest] Edge Function started');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    console.log(`[ai-signup-guest] ========== NEW GUEST SIGNUP REQUEST ==========`);
    console.log(`[ai-signup-guest] Method: ${req.method}`);
    console.log(`[ai-signup-guest] Origin: ${req.headers.get('origin')}`);

    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed. Use POST.');
    }

    // Parse request body
    const body = await req.json();
    console.log(`[ai-signup-guest] Request body:`, JSON.stringify(body, null, 2));

    // Validate required fields
    validateRequiredFields(body, ['email', 'text_inputted']);

    const { email, phone, text_inputted } = body;

    // Validate email format
    validateEmail(email);

    // Validate phone if provided (optional)
    if (phone && phone.trim()) {
      validatePhone(phone);
    }

    // Validate text is not empty
    if (!text_inputted || !text_inputted.trim()) {
      throw new Error('Market research description cannot be empty');
    }

    console.log(`[ai-signup-guest] ✅ Validation passed`);
    console.log(`[ai-signup-guest] Email: ${email}`);
    console.log(`[ai-signup-guest] Phone: ${phone || 'Not provided'}`);
    console.log(`[ai-signup-guest] Description length: ${text_inputted.length}`);

    // Get Bubble API credentials from environment
    const bubbleBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
    const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');

    if (!bubbleBaseUrl || !bubbleApiKey) {
      console.error('[ai-signup-guest] Missing Bubble configuration');
      throw new Error('Server configuration error');
    }

    // Call Bubble workflow directly
    const bubbleUrl = `${bubbleBaseUrl}/wf/ai-signup-guest`;
    console.log(`[ai-signup-guest] Calling Bubble API: ${bubbleUrl}`);

    const bubblePayload = {
      email,
      phone: phone || '',
      'text inputted': text_inputted,
    };

    console.log(`[ai-signup-guest] Bubble payload:`, JSON.stringify(bubblePayload, null, 2));

    const bubbleResponse = await fetch(bubbleUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bubbleApiKey}`,
      },
      body: JSON.stringify(bubblePayload),
    });

    console.log(`[ai-signup-guest] Bubble response status: ${bubbleResponse.status}`);

    if (!bubbleResponse.ok) {
      const errorText = await bubbleResponse.text();
      console.error(`[ai-signup-guest] Bubble API error:`, errorText);
      throw new Error(`Bubble API returned ${bubbleResponse.status}: ${errorText}`);
    }

    // Handle 204 No Content
    let bubbleResult;
    if (bubbleResponse.status === 204) {
      console.log(`[ai-signup-guest] ✅ Bubble returned 204 No Content (success)`);
      bubbleResult = { success: true };
    } else {
      bubbleResult = await bubbleResponse.json();
      console.log(`[ai-signup-guest] ✅ Bubble response:`, JSON.stringify(bubbleResult, null, 2));
    }

    console.log(`[ai-signup-guest] ✅ Guest signup completed successfully`);
    console.log(`[ai-signup-guest] ========== REQUEST COMPLETE ==========`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Signup submitted successfully',
        data: bubbleResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[ai-signup-guest] ========== ERROR ==========');
    console.error('[ai-signup-guest] Error:', error);
    console.error('[ai-signup-guest] Error stack:', error.stack);

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
