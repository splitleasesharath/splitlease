/**
 * Auth User - Authentication Router
 * Split Lease - Edge Function
 *
 * Routes authentication requests to appropriate handlers
 * NO USER AUTHENTICATION REQUIRED - These ARE the auth endpoints
 *
 * Supported Actions:
 * - login: User login (email/password) - via Bubble
 * - signup: New user registration - via Supabase Auth (native)
 * - logout: User logout (invalidate token) - via Bubble
 * - validate: Validate token and fetch user data - via Bubble + Supabase
 *
 * Security:
 * - NO user authentication on these endpoints (you can't require auth to log in!)
 * - API keys stored server-side in Supabase Secrets
 * - Validates request format only
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { formatErrorResponse, getStatusCodeFromError } from '../_shared/errors.ts';
import { validateAction, validateRequiredFields } from '../_shared/validation.ts';

// Import handlers
import { handleLogin } from './handlers/login.ts';
import { handleSignup } from './handlers/signup.ts';
import { handleLogout } from './handlers/logout.ts';
import { handleValidate } from './handlers/validate.ts';

console.log('[auth-user] Edge Function started');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log(`[auth-user] ========== NEW AUTH REQUEST ==========`);
    console.log(`[auth-user] Method: ${req.method}`);
    console.log(`[auth-user] URL: ${req.url}`);

    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed. Use POST.');
    }

    // NO USER AUTHENTICATION CHECK
    // These endpoints ARE the authentication system
    // Users calling /login or /signup are not yet authenticated

    // Parse and validate request body
    const body = await req.json();
    console.log(`[auth-user] Request body:`, JSON.stringify(body, null, 2));

    validateRequiredFields(body, ['action']);
    const { action, payload } = body;

    // Validate action is supported
    const allowedActions = ['login', 'signup', 'logout', 'validate'];
    validateAction(action, allowedActions);

    console.log(`[auth-user] Action: ${action}`);

    // Get configuration from secrets
    const bubbleAuthBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
    const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Supabase config is required for all actions
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing in secrets');
    }

    // Bubble config is required for login, logout, validate (but NOT signup - now uses Supabase Auth)
    if (action !== 'signup' && (!bubbleAuthBaseUrl || !bubbleApiKey)) {
      throw new Error('Bubble API configuration missing in secrets');
    }

    console.log(`[auth-user] Action: ${action}, Supabase URL: ${supabaseUrl}`);

    // Route to appropriate handler
    let result;

    switch (action) {
      case 'login':
        result = await handleLogin(bubbleAuthBaseUrl, bubbleApiKey, payload);
        break;

      case 'signup':
        // Signup now uses Supabase Auth natively (no Bubble dependency)
        result = await handleSignup(supabaseUrl, supabaseServiceKey, payload);
        break;

      case 'logout':
        result = await handleLogout(bubbleAuthBaseUrl, bubbleApiKey, payload);
        break;

      case 'validate':
        result = await handleValidate(bubbleAuthBaseUrl, bubbleApiKey, supabaseUrl, supabaseServiceKey, payload);
        break;

      default:
        // This should never happen due to validateAction above
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[auth-user] ✅ Handler completed successfully`);
    console.log(`[auth-user] ========== REQUEST COMPLETE ==========`);

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
    console.error('[auth-user] ========== ERROR ==========');
    console.error('[auth-user] Error:', error);
    console.error('[auth-user] Error stack:', error.stack);

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
