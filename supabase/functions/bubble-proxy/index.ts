/**
 * Bubble API Proxy - Main Router
 * Split Lease - Edge Function
 *
 * Routes client requests to appropriate Bubble workflow handlers
 * Authentication is OPTIONAL for public actions (allows guest users)
 * Other actions require authentication via Supabase Auth
 *
 * Supported Actions:
 * - send_message: Send message to host (no sync) - NO AUTH REQUIRED
 * - ai_inquiry: AI-powered market research inquiry (atomic sync) - NO AUTH REQUIRED
 * - upload_photos: Upload listing photos (atomic sync) - NO AUTH REQUIRED
 * - submit_referral: Submit referral (atomic sync) - AUTH REQUIRED
 * - toggle_favorite: Add/remove listing from user's favorites - NO AUTH REQUIRED (uses Bubble user ID)
 * - get_favorites: Get user's favorited listings - NO AUTH REQUIRED (uses Bubble user ID)
 *
 * DEPRECATED - Moved to dedicated edge functions:
 * - create_proposal: Use POST /functions/v1/proposal with action: "create"
 * - create_listing: Use POST /functions/v1/listing with action: "create"
 * - get_listing: Use POST /functions/v1/listing with action: "get"
 * - submit_listing: Use POST /functions/v1/listing with action: "submit"
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleSyncService } from '../_shared/bubbleSync.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { formatErrorResponse, getStatusCodeFromError, AuthenticationError } from '../_shared/errors.ts';
import { validateAction, validateRequiredFields } from '../_shared/validation.ts';
import { EdgeFunctionRequest } from '../_shared/types.ts';

// Import handlers
import { handlePhotoUpload } from './handlers/photos.ts';
import { handleSendMessage } from './handlers/messaging.ts';
import { handleReferral } from './handlers/referral.ts';
import { handleAiInquiry } from './handlers/aiInquiry.ts';
import { handleFavorites } from './handlers/favorites.ts';
import { handleGetFavorites } from './handlers/getFavorites.ts';
import { handleParseProfile } from './handlers/parseProfile.ts';

console.log('[bubble-proxy] Edge Function started');

// Actions that don't require authentication
// upload_photos is public because photos are uploaded in Section 6 before user signup in Section 7
// parse_profile is public because it's called during AI signup flow before full auth
const PUBLIC_ACTIONS = ['send_message', 'ai_inquiry', 'upload_photos', 'toggle_favorite', 'get_favorites', 'parse_profile'];

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

    // Parse request body first to check action
    const body = await req.json() as EdgeFunctionRequest;
    console.log(`[bubble-proxy] Request body:`, JSON.stringify(body, null, 2));

    validateRequiredFields(body, ['action']);
    const { action, payload } = body;

    // Validate action is supported
    const allowedActions = [
      'upload_photos',
      'send_message',
      'submit_referral',
      'ai_inquiry',
      'toggle_favorite',
      'get_favorites',
      'parse_profile',
    ];
    validateAction(action, allowedActions);

    console.log(`[bubble-proxy] Action: ${action}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    // Check if action requires authentication
    const isPublicAction = PUBLIC_ACTIONS.includes(action);
    let user = null;

    // Try to authenticate user (optional for public actions)
    const authHeader = req.headers.get('Authorization');

    if (authHeader) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      });

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (!authError && authUser) {
        user = authUser;
        console.log(`[bubble-proxy] ✅ Authenticated user: ${user.email} (${user.id})`);
      } else {
        console.log(`[bubble-proxy] Auth header present but invalid:`, authError?.message);
      }
    }

    // Require auth for non-public actions
    if (!isPublicAction && !user) {
      console.error('[bubble-proxy] Auth required for action:', action);
      throw new AuthenticationError('Authentication required for this action');
    }

    if (!user) {
      console.log(`[bubble-proxy] 👤 Guest user (no authentication)`);
      // Create a guest user object for handlers
      user = { id: 'guest', email: null };
    }

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
      case 'upload_photos':
        result = await handlePhotoUpload(syncService, payload, user);
        break;

      case 'send_message':
        result = await handleSendMessage(syncService, payload, user);
        break;

      case 'submit_referral':
        result = await handleReferral(syncService, payload, user);
        break;

      case 'ai_inquiry':
        result = await handleAiInquiry(syncService, payload, user);
        break;

      case 'toggle_favorite':
        result = await handleFavorites(payload);
        break;

      case 'get_favorites':
        result = await handleGetFavorites(payload);
        break;

      case 'parse_profile':
        result = await handleParseProfile(supabaseUrl, supabaseServiceKey, payload);
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
