/**
 * Guest Management Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Corporate tool for managing guest relationships, searching guests,
 * assigning knowledge articles, and tracking activity history.
 *
 * Actions:
 * - search_guests: Search guests by name/email/phone
 * - get_guest: Get single guest with full details
 * - create_guest: Create new guest account
 * - get_guest_history: Get activity history for guest
 * - assign_article: Assign knowledge article to guest
 * - remove_article: Remove article assignment
 * - list_articles: List all knowledge articles
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

console.log("[guest-management] Edge Function initializing...");

/**
 * Authenticate user from request headers
 */
async function authenticateFromHeaders(
  headers: Headers,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ id: string; email?: string } | null> {
  const authHeader = headers.get('Authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return { id: user.id, email: user.email };
}

Deno.serve(async (req: Request) => {
  try {
    console.log(`[guest-management] Request: ${req.method}`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log(`[guest-management] CORS preflight - returning 200`);
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Parse request body
    const body = await req.json();
    const action = body.action || 'unknown';
    const payload = body.payload || {};

    console.log(`[guest-management] Action: ${action}`);

    // Validate action
    const validActions = [
      'search_guests',
      'get_guest',
      'create_guest',
      'get_guest_history',
      'assign_article',
      'remove_article',
      'list_articles'
    ];

    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase config
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Authenticate user (required for all actions)
    const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service client (for elevated permissions)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let result: unknown;

    // Route to appropriate handler
    switch (action) {
      case 'search_guests': {
        const { handleSearchGuests } = await import("./actions/searchGuests.ts");
        result = await handleSearchGuests(payload, supabase);
        break;
      }

      case 'get_guest': {
        const { handleGetGuest } = await import("./actions/getGuest.ts");
        result = await handleGetGuest(payload, supabase);
        break;
      }

      case 'create_guest': {
        const { handleCreateGuest } = await import("./actions/createGuest.ts");
        result = await handleCreateGuest(payload, supabase);
        break;
      }

      case 'get_guest_history': {
        const { handleGetGuestHistory } = await import("./actions/getGuestHistory.ts");
        result = await handleGetGuestHistory(payload, supabase);
        break;
      }

      case 'assign_article': {
        const { handleAssignArticle } = await import("./actions/assignArticle.ts");
        result = await handleAssignArticle(payload, user, supabase);
        break;
      }

      case 'remove_article': {
        const { handleRemoveArticle } = await import("./actions/removeArticle.ts");
        result = await handleRemoveArticle(payload, supabase);
        break;
      }

      case 'list_articles': {
        const { handleListArticles } = await import("./actions/listArticles.ts");
        result = await handleListArticles(payload, supabase);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unhandled action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Return success response
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[guest-management] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
