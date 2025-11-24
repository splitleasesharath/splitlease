/**
 * Bubble API Proxy - Main Router
 * Split Lease - Edge Function
 *
 * Routes client requests to appropriate Bubble workflow handlers
 * All requests require authentication via Supabase Auth
 *
 * Supported Actions:
 * - create_listing: Create new listing (atomic sync)
 * - upload_photos: Upload listing photos (atomic sync)
 * - send_message: Send message to host (no sync)
 * - submit_referral: Submit referral (atomic sync)
 * - signup_ai: AI-powered signup (atomic sync)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleSyncService } from '../_shared/bubbleSync.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { formatErrorResponse, getStatusCodeFromError, AuthenticationError } from '../_shared/errors.ts';
import { validateAction, validateRequiredFields } from '../_shared/validation.ts';
import { EdgeFunctionRequest } from '../_shared/types.ts';

// Import handlers
import { handleListingCreate } from './handlers/listing.ts';
import { handlePhotoUpload } from './handlers/photos.ts';
import { handleSendMessage } from './handlers/messaging.ts';
import { handleReferral } from './handlers/referral.ts';
import { handleAiSignup } from './handlers/signup.ts';

console.log('[bubble-proxy] Edge Function started');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log(`[bubble-proxy] ========== NEW REQUEST ==========`);
    console.log(`[bubble-proxy] Method: ${req.method}`);
    console.log(`[bubble-proxy] URL: ${req.url}`);

    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed. Use POST.');
    }

    // 1. Authenticate user via Supabase Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new AuthenticationError('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[bubble-proxy] Auth error:', authError);
      throw new AuthenticationError('Invalid or expired authentication token');
    }

    console.log(`[bubble-proxy] ✅ Authenticated user: ${user.email} (${user.id})`);

    // 2. Parse and validate request body
    const body = await req.json() as EdgeFunctionRequest;
    console.log(`[bubble-proxy] Request body:`, JSON.stringify(body, null, 2));

    validateRequiredFields(body, ['action']);
    const { action, payload } = body;

    // Validate action is supported
    const allowedActions = [
      'create_listing',
      'upload_photos',
      'send_message',
      'submit_referral',
      'signup_ai',
    ];
    validateAction(action, allowedActions);

    console.log(`[bubble-proxy] Action: ${action}`);

    // 3. Initialize BubbleSyncService
    const bubbleBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
    const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!bubbleBaseUrl || !bubbleApiKey || !supabaseServiceKey) {
      throw new Error('Bubble or Supabase configuration missing in secrets');
    }

    const syncService = new BubbleSyncService(
      bubbleBaseUrl,
      bubbleApiKey,
      supabaseUrl,
      supabaseServiceKey
    );

    // 4. Route to appropriate handler
    let result;

    switch (action) {
      case 'create_listing':
        result = await handleListingCreate(syncService, payload, user);
        break;

      case 'upload_photos':
        result = await handlePhotoUpload(syncService, payload, user);
        break;

      case 'send_message':
        result = await handleSendMessage(syncService, payload, user);
        break;

      case 'submit_referral':
        result = await handleReferral(syncService, payload, user);
        break;

      case 'signup_ai':
        result = await handleAiSignup(syncService, payload, user);
        break;

      default:
        // This should never happen due to validateAction above
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[bubble-proxy] ✅ Handler completed successfully`);
    console.log(`[bubble-proxy] ========== REQUEST COMPLETE ==========`);

    // 5. Return success response
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
    console.error('[bubble-proxy] ========== ERROR ==========');
    console.error('[bubble-proxy] Error:', error);
    console.error('[bubble-proxy] Error stack:', error.stack);

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
