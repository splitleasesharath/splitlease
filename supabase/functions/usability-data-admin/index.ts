/**
 * usability-data-admin Edge Function
 * Admin tool for managing usability testing data
 *
 * Actions:
 * - listHosts: Get usability tester hosts with pagination and search
 * - listGuests: Get usability tester guests with pagination and search
 * - deleteHostData: Clear threads, proposals, and data for a host
 * - deleteHostListings: Delete all listings for a host
 * - deleteHostTestStatus: Reset host usability test step
 * - deleteGuestData: Clear threads, proposals, and data for a guest
 * - deleteGuestTestStatus: Reset guest usability test step
 * - fetchListing: Get listing by ID
 * - createQuickProposal: Create a proposal for usability testing
 * - deleteProposal: Delete a proposal by ID
 *
 * Database tables: user, proposal, listing, message_threads
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import action handlers
import { handleListHosts } from "./actions/listHosts.ts";
import { handleListGuests } from "./actions/listGuests.ts";
import { handleDeleteHostData } from "./actions/deleteHostData.ts";
import { handleDeleteHostListings } from "./actions/deleteHostListings.ts";
import { handleDeleteHostTestStatus } from "./actions/deleteHostTestStatus.ts";
import { handleDeleteGuestData } from "./actions/deleteGuestData.ts";
import { handleDeleteGuestTestStatus } from "./actions/deleteGuestTestStatus.ts";
import { handleFetchListing } from "./actions/fetchListing.ts";
import { handleCreateQuickProposal } from "./actions/createQuickProposal.ts";
import { handleDeleteProposal } from "./actions/deleteProposal.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Valid actions for this function
const VALID_ACTIONS = [
  'listHosts',
  'listGuests',
  'deleteHostData',
  'deleteHostListings',
  'deleteHostTestStatus',
  'deleteGuestData',
  'deleteGuestTestStatus',
  'fetchListing',
  'createQuickProposal',
  'deleteProposal',
];

console.log("[usability-data-admin] Edge Function initializing...");

Deno.serve(async (req: Request) => {
  try {
    console.log(`[usability-data-admin] Request: ${req.method}`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Parse request
    const body = await req.json();
    const action = body.action || 'unknown';
    const payload = body.payload || {};

    console.log(`[usability-data-admin] Action: ${action}`);

    // Validate action
    if (!VALID_ACTIONS.includes(action)) {
      return errorResponse(`Invalid action: ${action}. Valid actions: ${VALID_ACTIONS.join(', ')}`, 400);
    }

    // Get Supabase config
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Authenticate user
    const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
    if (!user) {
      return errorResponse('Authentication required', 401);
    }

    // Create service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user is admin or corporate user
    const isAuthorized = await checkAdminOrCorporateStatus(supabase, user.email);
    if (!isAuthorized) {
      return errorResponse('Admin or corporate access required', 403);
    }

    let result: unknown;

    switch (action) {
      case 'listHosts':
        result = await handleListHosts(payload, supabase);
        break;

      case 'listGuests':
        result = await handleListGuests(payload, supabase);
        break;

      case 'deleteHostData':
        result = await handleDeleteHostData(payload, supabase);
        break;

      case 'deleteHostListings':
        result = await handleDeleteHostListings(payload, supabase);
        break;

      case 'deleteHostTestStatus':
        result = await handleDeleteHostTestStatus(payload, supabase);
        break;

      case 'deleteGuestData':
        result = await handleDeleteGuestData(payload, supabase);
        break;

      case 'deleteGuestTestStatus':
        result = await handleDeleteGuestTestStatus(payload, supabase);
        break;

      case 'fetchListing':
        result = await handleFetchListing(payload, supabase);
        break;

      case 'createQuickProposal':
        result = await handleCreateQuickProposal(payload, supabase);
        break;

      case 'deleteProposal':
        result = await handleDeleteProposal(payload, supabase);
        break;

      default:
        throw new Error(`Unhandled action: ${action}`);
    }

    console.log('[usability-data-admin] Action completed successfully');

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[usability-data-admin] Error:', error);
    return errorResponse((error as Error).message, 500);
  }
});

// ===== HELPER FUNCTIONS =====

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function authenticateFromHeaders(
  headers: Headers,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ id: string; email: string } | null> {
  const authHeader = headers.get('Authorization');
  if (!authHeader) return null;

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return null;

  return { id: user.id, email: user.email ?? '' };
}

async function checkAdminOrCorporateStatus(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user')
    .select('"Toggle - Is Admin", "Toggle - Is Corporate User"')
    .eq('email', email)
    .single();

  if (error || !data) {
    console.error('[usability-data-admin] Admin/corporate check failed:', error);
    return false;
  }

  return data['Toggle - Is Admin'] === true || data['Toggle - Is Corporate User'] === true;
}

console.log("[usability-data-admin] Edge Function ready");
