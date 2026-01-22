/**
 * Emergency Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Handles emergency report management for internal staff dashboard.
 *
 * Actions:
 * - getAll: Fetch all emergencies with filters
 * - getById: Fetch single emergency with relations
 * - create: Create new emergency report
 * - update: Update emergency fields
 * - assignEmergency: Assign to team member + Slack notify
 * - updateStatus: Update status (REPORTED → ASSIGNED → etc.)
 * - updateVisibility: Hide/show emergency
 * - sendSMS: Send SMS via Twilio + log
 * - sendEmail: Send email via SendGrid + log
 * - getMessages: Fetch SMS history
 * - getEmails: Fetch email history
 * - getPresetMessages: Fetch preset SMS templates
 * - getPresetEmails: Fetch preset email templates
 * - getTeamMembers: Fetch staff users (admin = true)
 * - health: Health check
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Valid actions
const VALID_ACTIONS = [
  'getAll',
  'getById',
  'create',
  'update',
  'assignEmergency',
  'updateStatus',
  'updateVisibility',
  'sendSMS',
  'sendEmail',
  'getMessages',
  'getEmails',
  'getPresetMessages',
  'getPresetEmails',
  'getTeamMembers',
  'health',
] as const;

type Action = typeof VALID_ACTIONS[number];

console.log("[emergency] Edge Function initializing...");

Deno.serve(async (req: Request) => {
  try {
    console.log(`[emergency] Request: ${req.method}`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log(`[emergency] CORS preflight - returning 200`);
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Parse request body
    const body = await req.json();
    const action = body.action || 'unknown';
    const payload = body.payload || {};

    console.log(`[emergency] Action: ${action}`);

    // Validate action
    if (!VALID_ACTIONS.includes(action as Action)) {
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

    // Create service client (for database operations)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let result: unknown;

    // Route to appropriate handler
    switch (action) {
      case 'health': {
        result = handleHealth();
        break;
      }

      case 'getAll': {
        const { handleGetAll } = await import("./handlers/getAll.ts");
        result = await handleGetAll(payload, supabase);
        break;
      }

      case 'getById': {
        const { handleGetById } = await import("./handlers/getById.ts");
        result = await handleGetById(payload, supabase);
        break;
      }

      case 'create': {
        const { handleCreate } = await import("./handlers/create.ts");
        result = await handleCreate(payload, supabase);
        break;
      }

      case 'update': {
        // Admin authentication required
        const user = await authenticateAdmin(req.headers, supabaseUrl, supabaseAnonKey, supabase);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Admin authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { handleUpdate } = await import("./handlers/update.ts");
        result = await handleUpdate(payload, user, supabase);
        break;
      }

      case 'assignEmergency': {
        // Admin authentication required
        const user = await authenticateAdmin(req.headers, supabaseUrl, supabaseAnonKey, supabase);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Admin authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { handleAssignEmergency } = await import("./handlers/assignEmergency.ts");
        result = await handleAssignEmergency(payload, user, supabase);
        break;
      }

      case 'updateStatus': {
        // Admin authentication required
        const user = await authenticateAdmin(req.headers, supabaseUrl, supabaseAnonKey, supabase);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Admin authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { handleUpdateStatus } = await import("./handlers/updateStatus.ts");
        result = await handleUpdateStatus(payload, user, supabase);
        break;
      }

      case 'updateVisibility': {
        // Admin authentication required
        const user = await authenticateAdmin(req.headers, supabaseUrl, supabaseAnonKey, supabase);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Admin authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { handleUpdateVisibility } = await import("./handlers/updateVisibility.ts");
        result = await handleUpdateVisibility(payload, user, supabase);
        break;
      }

      case 'sendSMS': {
        // Admin authentication required
        const user = await authenticateAdmin(req.headers, supabaseUrl, supabaseAnonKey, supabase);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Admin authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { handleSendSMS } = await import("./handlers/sendSMS.ts");
        result = await handleSendSMS(payload, user, supabase);
        break;
      }

      case 'sendEmail': {
        // Admin authentication required
        const user = await authenticateAdmin(req.headers, supabaseUrl, supabaseAnonKey, supabase);
        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Admin authentication required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { handleSendEmail } = await import("./handlers/sendEmail.ts");
        result = await handleSendEmail(payload, user, supabase);
        break;
      }

      case 'getMessages': {
        const { handleGetMessages } = await import("./handlers/getMessages.ts");
        result = await handleGetMessages(payload, supabase);
        break;
      }

      case 'getEmails': {
        const { handleGetEmails } = await import("./handlers/getEmails.ts");
        result = await handleGetEmails(payload, supabase);
        break;
      }

      case 'getPresetMessages': {
        const { handleGetPresetMessages } = await import("./handlers/getPresetMessages.ts");
        result = await handleGetPresetMessages(payload, supabase);
        break;
      }

      case 'getPresetEmails': {
        const { handleGetPresetEmails } = await import("./handlers/getPresetEmails.ts");
        result = await handleGetPresetEmails(payload, supabase);
        break;
      }

      case 'getTeamMembers': {
        const { handleGetTeamMembers } = await import("./handlers/getTeamMembers.ts");
        result = await handleGetTeamMembers(payload, supabase);
        break;
      }

      default:
        throw new Error(`Unhandled action: ${action}`);
    }

    console.log('[emergency] Handler completed successfully');

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[emergency] Error:', error);

    const statusCode = (error as { name?: string }).name === 'ValidationError' ? 400 :
                       (error as { name?: string }).name === 'AuthenticationError' ? 401 : 500;

    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Health check handler
 */
function handleHealth(): { status: string; timestamp: string; actions: readonly string[] } {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    actions: VALID_ACTIONS,
  };
}

/**
 * Authenticate user and verify admin status
 */
async function authenticateAdmin(
  headers: Headers,
  supabaseUrl: string,
  supabaseAnonKey: string,
  serviceClient: ReturnType<typeof createClient>
): Promise<{ id: string; email: string; userId: string } | null> {
  const authHeader = headers.get('Authorization');

  if (!authHeader) {
    console.log('[emergency] No Authorization header');
    return null;
  }

  // Create auth client with user's token
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await authClient.auth.getUser();

  if (error || !user) {
    console.log('[emergency] Auth error:', error?.message);
    return null;
  }

  // Check if user is admin by looking up in user table
  const { data: userData, error: userError } = await serviceClient
    .from('user')
    .select('_id, admin, email, "First name", "Last name"')
    .eq('supabase_user_id', user.id)
    .single();

  if (userError || !userData) {
    console.log('[emergency] User lookup error:', userError?.message);
    return null;
  }

  // Check admin status
  if (!userData.admin) {
    console.log('[emergency] User is not admin');
    return null;
  }

  console.log('[emergency] Admin authenticated:', userData.email);

  return {
    id: user.id,
    email: user.email ?? '',
    userId: userData._id,
  };
}

console.log("[emergency] Edge Function ready");
