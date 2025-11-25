/**
 * Bubble Auth Proxy - Authentication Router
 * Split Lease - Edge Function
 *
 * Routes authentication requests to Bubble.io auth workflows
 * NO USER AUTHENTICATION REQUIRED - These ARE the auth endpoints
 *
 * Supported Actions:
 * - login: User login (email/password)
 * - signup: New user registration
 * - logout: User logout (invalidate token)
 * - validate: Validate token and fetch user data
 *
 * Security:
 * - NO user authentication on these endpoints (you can't require auth to log in!)
 * - API key stored server-side in Supabase Secrets
 * - Validates request format only
 *
 * Migration Status: Phase 3 - Authentication Workflows
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

console.log('[bubble-auth-proxy] Edge Function started');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log(`[bubble-auth-proxy] ========== NEW AUTH REQUEST ==========`);
    console.log(`[bubble-auth-proxy] Method: ${req.method}`);
    console.log(`[bubble-auth-proxy] URL: ${req.url}`);

    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed. Use POST.');
    }

    // NO USER AUTHENTICATION CHECK
    // These endpoints ARE the authentication system
    // Users calling /login or /signup are not yet authenticated

    // Parse and validate request body
    const body = await req.json();
    console.log(`[bubble-auth-proxy] Request body:`, JSON.stringify(body, null, 2));

    validateRequiredFields(body, ['action']);
    const { action, payload } = body;

    // Validate action is supported
    const allowedActions = ['login', 'signup', 'logout', 'validate'];
    validateAction(action, allowedActions);

    console.log(`[bubble-auth-proxy] Action: ${action}`);

    // Get Bubble auth configuration from secrets
    const bubbleAuthBaseUrl = Deno.env.get('BUBBLE_AUTH_BASE_URL');
    const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!bubbleAuthBaseUrl || !bubbleApiKey) {
      throw new Error('Bubble auth configuration missing in secrets');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing in secrets');
    }

    console.log(`[bubble-auth-proxy] Using Bubble Auth Base URL: ${bubbleAuthBaseUrl}`);

    // Route to appropriate handler
    let result;

    switch (action) {
      case 'login':
        result = await handleLogin(bubbleAuthBaseUrl, bubbleApiKey, payload);
        break;

      case 'signup':
        result = await handleSignup(bubbleAuthBaseUrl, bubbleApiKey, payload);
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

    console.log(`[bubble-auth-proxy] ✅ Handler completed successfully`);
    console.log(`[bubble-auth-proxy] ========== REQUEST COMPLETE ==========`);

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
    console.error('[bubble-auth-proxy] ========== ERROR ==========');
    console.error('[bubble-auth-proxy] Error:', error);
    console.error('[bubble-auth-proxy] Error stack:', error.stack);

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
