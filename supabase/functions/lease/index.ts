/**
 * Lease Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Actions:
 * - create: Create a new lease from accepted proposal/counteroffer
 * - get: Fetch lease details
 *
 * Request Format:
 * POST /functions/v1/lease
 * {
 *   "action": "create",
 *   "payload": {
 *     "proposalId": "...",
 *     "isCounteroffer": true,
 *     "fourWeekRent": 2000,
 *     "fourWeekCompensation": 1800
 *   }
 * }
 *
 * This function implements the CORE-create-lease workflow from Bubble.io,
 * orchestrating all 7 phases of lease creation:
 * - Phase 1: Proposal status update
 * - Phase 2: Lease record creation
 * - Phase 3: Auxiliary setups (permissions, magic links)
 * - Phase 4: Multi-channel notifications
 * - Phase 5: User association
 * - Phase 6: Payment records (via existing Edge Functions)
 * - Phase 7: Stays creation and house manual linking
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import {
  formatErrorResponse,
  getStatusCodeFromError,
  ValidationError,
  AuthenticationError,
} from '../_shared/errors.ts';

console.log('[lease] Edge Function initializing...');

const ALLOWED_ACTIONS = ['create', 'get', 'generate_dates'] as const;
type Action = (typeof ALLOWED_ACTIONS)[number];

// Actions that require authentication
const AUTH_REQUIRED_ACTIONS = new Set<Action>(['get']);

Deno.serve(async (req: Request) => {
  try {
    console.log(`[lease] ${req.method} request received`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log(`[lease] CORS preflight - returning 200`);
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const action = body.action || 'unknown';
    const payload = body.payload || {};

    console.log(`[lease] Action: ${action}`);

    // Validate action
    if (!ALLOWED_ACTIONS.includes(action as Action)) {
      throw new ValidationError(
        `Invalid action: ${action}. Allowed: ${ALLOWED_ACTIONS.join(', ')}`
      );
    }

    // Get Supabase config
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create service client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Authentication (for actions that require it)
    let user: { id: string; email: string } | null = null;

    if (AUTH_REQUIRED_ACTIONS.has(action as Action)) {
      user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }
    }

    let result: unknown;

    // Route to handler (lazy imports for reduced cold start)
    switch (action) {
      case 'create': {
        console.log('[lease] Loading create handler...');
        const { handleCreate } = await import('./handlers/create.ts');
        result = await handleCreate(payload, user, supabase);
        break;
      }

      case 'get': {
        console.log('[lease] Loading get handler...');
        const { handleGet } = await import('./handlers/get.ts');
        result = await handleGet(payload, user, supabase);
        break;
      }

      case 'generate_dates': {
        console.log('[lease] Loading generate_dates handler...');
        const { handleGenerateDates } = await import('./handlers/generateDates.ts');
        result = await handleGenerateDates(payload, user, supabase);
        break;
      }

      default:
        throw new ValidationError(`Unhandled action: ${action}`);
    }

    console.log('[lease] Handler completed successfully');

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[lease] Error:', error);

    const statusCode = getStatusCodeFromError(error as Error);

    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Authenticate user from Authorization header
 *
 * @param headers - Request headers
 * @param supabaseUrl - Supabase URL
 * @param supabaseAnonKey - Supabase anonymous key
 * @returns User context or null if not authenticated
 */
async function authenticateFromHeaders(
  headers: Headers,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ id: string; email: string } | null> {
  const authHeader = headers.get('Authorization');

  if (!authHeader) {
    console.log('[lease:auth] No Authorization header');
    return null;
  }

  try {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error,
    } = await authClient.auth.getUser();

    if (error || !user) {
      console.error('[lease:auth] getUser failed:', error?.message);
      return null;
    }

    // Lookup application user ID by email
    const { data: appUser, error: appUserError } = await authClient
      .from('user')
      .select('_id')
      .eq('email', user.email?.toLowerCase())
      .maybeSingle();

    if (appUserError || !appUser) {
      console.error('[lease:auth] User lookup failed:', appUserError?.message);
      return null;
    }

    return { id: appUser._id, email: user.email ?? '' };
  } catch (err) {
    console.error('[lease:auth] Exception:', (err as Error).message);
    return null;
  }
}

console.log('[lease] Edge Function ready');
