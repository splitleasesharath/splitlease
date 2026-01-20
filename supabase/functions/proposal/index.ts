/**
 * Proposal Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * DIAGNOSTIC VERSION 2: Minimal core + lazy imports
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers inlined
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

console.log("[proposal] Edge Function initializing...");

Deno.serve(async (req: Request) => {
  try {
    console.log(`[proposal] Request: ${req.method}`);

    // Handle CORS preflight FIRST
    if (req.method === 'OPTIONS') {
      console.log(`[proposal] CORS preflight - returning 200`);
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Parse request body
    const body = await req.json();
    const action = body.action || 'unknown';
    const payload = body.payload || {};

    console.log(`[proposal] Action: ${action}`);

    // Validate action
    const validActions = ['create', 'update', 'get', 'suggest', 'create_suggested', 'create_mockup'];
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

    // Create service client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let result: unknown;

    // Dynamic imports - load only the handler needed
    // This avoids boot-time loading of all handlers
    switch (action) {
      case 'create': {
        console.log('[proposal] Loading create handler...');
        const { handleCreate } = await import("./actions/create.ts");
        console.log('[proposal] Create handler loaded');

        // Authentication check - create is public for now
        result = await handleCreate(payload, null, supabase);
        break;
      }

      case 'update': {
        console.log('[proposal] Loading update handler...');
        const { handleUpdate } = await import("./actions/update.ts");
        console.log('[proposal] Update handler loaded');

        // Authentication required
        const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await handleUpdate(payload, user, supabase);
        break;
      }

      case 'get': {
        console.log('[proposal] Loading get handler...');
        const { handleGet } = await import("./actions/get.ts");
        console.log('[proposal] Get handler loaded');

        result = await handleGet(payload, supabase);
        break;
      }

      case 'suggest': {
        console.log('[proposal] Loading suggest handler...');
        const { handleSuggest } = await import("./actions/suggest.ts");
        console.log('[proposal] Suggest handler loaded');

        // Authentication required
        const user = await authenticateFromHeaders(req.headers, supabaseUrl, supabaseAnonKey);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await handleSuggest(payload, user, supabase);
        break;
      }

      case 'create_suggested': {
        console.log('[proposal] Loading create_suggested handler...');
        const { handleCreateSuggested } = await import("./actions/create_suggested.ts");
        console.log('[proposal] Create_suggested handler loaded');

        // No authentication required - internal tool only
        // Access control is handled by route protection (/_internal/* paths)
        result = await handleCreateSuggested(payload, supabase);
        break;
      }

      case 'create_mockup': {
        console.log('[proposal] Loading create_mockup handler...');
        const { handleCreateMockup } = await import("./actions/create_mockup.ts");
        console.log('[proposal] Create_mockup handler loaded');

        // No authentication required - internal service call only
        // Access control via service role key from listing edge function
        result = await handleCreateMockup(payload, supabase);
        break;
      }

      default:
        throw new Error(`Unhandled action: ${action}`);
    }

    console.log('[proposal] Handler completed successfully');

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[proposal] Error:', error);

    const statusCode = (error as { name?: string }).name === 'ValidationError' ? 400 :
                       (error as { name?: string }).name === 'AuthenticationError' ? 401 : 500;

    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function for authentication
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

console.log("[proposal] Edge Function ready");
