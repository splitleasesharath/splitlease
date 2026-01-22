/**
 * Simulation Host Edge Function
 * Split Lease - Host-side Usability Testing Simulation
 *
 * This Edge Function supports the host-side simulation workflow where hosts
 * walk through receiving and responding to guest proposals.
 *
 * Actions:
 * - init_simulation: Initialize a new simulation session with unique ID
 * - mark_tester: Update user.isUsabilityTester flag
 * - create_test_guest: Generate a test guest user for the simulation
 * - create_test_proposals: Create 3 test proposals from the test guest
 * - send_counteroffer: Host sends a counteroffer (guest will reject)
 * - accept_proposal: Host accepts a proposal and creates lease
 * - handle_guest_request: Guest submits request, host responds
 * - complete_stay: Mark stay complete and generate reviews
 * - cleanup: Remove all test data by simulation_id
 *
 * All test data is tagged with simulation_id for isolation and cleanup.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers (inlined for performance)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

console.log("[simulation-host] Edge Function initializing...");

// Valid actions for this function
const VALID_ACTIONS = [
  'init_simulation',
  'mark_tester',
  'create_test_guest',
  'create_test_proposals',
  'send_counteroffer',
  'accept_proposal',
  'handle_guest_request',
  'complete_stay',
  'cleanup'
] as const;

type Action = typeof VALID_ACTIONS[number];

Deno.serve(async (req: Request) => {
  try {
    console.log(`[simulation-host] Request: ${req.method}`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log(`[simulation-host] CORS preflight - returning 200`);
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Parse request body
    const body = await req.json();
    const action = body.action as Action || 'unknown';
    const payload = body.payload || {};

    console.log(`[simulation-host] Action: ${action}`);

    // Validate action
    if (!VALID_ACTIONS.includes(action as Action)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create service client (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let result: unknown;

    // Dynamic imports for lazy loading (reduces cold start time)
    switch (action) {
      case 'init_simulation': {
        console.log('[simulation-host] Loading init_simulation handler...');
        const { handleInitSimulation } = await import("./actions/initSimulation.ts");
        console.log('[simulation-host] init_simulation handler loaded');

        // Auth required
        const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await handleInitSimulation(payload, user, supabase);
        break;
      }

      case 'mark_tester': {
        console.log('[simulation-host] Loading mark_tester handler...');
        const { handleMarkTester } = await import("./actions/markTester.ts");
        console.log('[simulation-host] mark_tester handler loaded');

        const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await handleMarkTester(payload, user, supabase);
        break;
      }

      case 'create_test_guest': {
        console.log('[simulation-host] Loading create_test_guest handler...');
        const { handleCreateTestGuest } = await import("./actions/createTestGuest.ts");
        console.log('[simulation-host] create_test_guest handler loaded');

        const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await handleCreateTestGuest(payload, user, supabase);
        break;
      }

      case 'create_test_proposals': {
        console.log('[simulation-host] Loading create_test_proposals handler...');
        const { handleCreateTestProposals } = await import("./actions/createTestProposals.ts");
        console.log('[simulation-host] create_test_proposals handler loaded');

        const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await handleCreateTestProposals(payload, user, supabase);
        break;
      }

      case 'send_counteroffer': {
        console.log('[simulation-host] Loading send_counteroffer handler...');
        const { handleSendCounteroffer } = await import("./actions/sendCounteroffer.ts");
        console.log('[simulation-host] send_counteroffer handler loaded');

        const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await handleSendCounteroffer(payload, user, supabase);
        break;
      }

      case 'accept_proposal': {
        console.log('[simulation-host] Loading accept_proposal handler...');
        const { handleAcceptProposal } = await import("./actions/acceptProposal.ts");
        console.log('[simulation-host] accept_proposal handler loaded');

        const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await handleAcceptProposal(payload, user, supabase);
        break;
      }

      case 'handle_guest_request': {
        console.log('[simulation-host] Loading handle_guest_request handler...');
        const { handleGuestRequest } = await import("./actions/handleGuestRequest.ts");
        console.log('[simulation-host] handle_guest_request handler loaded');

        const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await handleGuestRequest(payload, user, supabase);
        break;
      }

      case 'complete_stay': {
        console.log('[simulation-host] Loading complete_stay handler...');
        const { handleCompleteStay } = await import("./actions/completeStay.ts");
        console.log('[simulation-host] complete_stay handler loaded');

        const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await handleCompleteStay(payload, user, supabase);
        break;
      }

      case 'cleanup': {
        console.log('[simulation-host] Loading cleanup handler...');
        const { handleCleanup } = await import("./actions/cleanup.ts");
        console.log('[simulation-host] cleanup handler loaded');

        const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await handleCleanup(payload, user, supabase);
        break;
      }

      default:
        throw new Error(`Unhandled action: ${action}`);
    }

    console.log('[simulation-host] Handler completed successfully');

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[simulation-host] Error:', error);

    const statusCode = (error as { name?: string }).name === 'ValidationError' ? 400 :
                       (error as { name?: string }).name === 'AuthenticationError' ? 401 : 500;

    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Authenticate user from Authorization header
 */
async function authenticateFromHeaders(
  headers: Headers,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ id: string; email: string } | null> {
  const authHeader = headers.get('Authorization');

  if (!authHeader) {
    return null;
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await authClient.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { id: user.id, email: user.email ?? '' };
}

console.log("[simulation-host] Edge Function ready");
