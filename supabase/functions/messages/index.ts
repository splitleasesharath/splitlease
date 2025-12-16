/**
 * Messages Edge Function - Main Router
 * Split Lease - Edge Function
 *
 * Routes client requests to appropriate messaging handlers
 * All actions require authentication via Supabase Auth
 *
 * Supported Actions:
 * - send_message: Send a message in a thread
 * - get_threads: Get user's conversation threads
 * - get_messages: Get messages for a specific thread
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { formatErrorResponse, getStatusCodeFromError, AuthenticationError } from '../_shared/errors.ts';
import { validateAction, validateRequiredFields } from '../_shared/validation.ts';
import { createErrorCollector, ErrorCollector } from '../_shared/slack.ts';

// Import handlers
import { handleSendMessage } from './handlers/sendMessage.ts';
import { handleGetThreads } from './handlers/getThreads.ts';
import { handleGetMessages } from './handlers/getMessages.ts';

console.log('[messages] Edge Function started');

// All actions require authentication
const allowedActions = ['send_message', 'get_threads', 'get_messages'];

interface MessagesRequest {
  action: string;
  payload: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Error collector for consolidated error reporting (ONE RUN = ONE LOG)
  let collector: ErrorCollector | null = null;
  let action = 'unknown';

  try {
    console.log(`[messages] ========== NEW REQUEST ==========`);
    console.log(`[messages] Method: ${req.method}`);
    console.log(`[messages] URL: ${req.url}`);

    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed. Use POST.');
    }

    // Parse request body
    const body = await req.json() as MessagesRequest;
    console.log(`[messages] Request body:`, JSON.stringify(body, null, 2));

    validateRequiredFields(body, ['action']);
    action = body.action;
    const { payload = {} } = body;

    // Create error collector after we know the action
    collector = createErrorCollector('messages', action);

    // Validate action is supported
    validateAction(action, allowedActions);

    console.log(`[messages] Action: ${action}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    // All actions require authentication
    const authHeader = req.headers.get('Authorization');
    let user = null;

    if (!authHeader) {
      throw new AuthenticationError('Authorization header required');
    }

    // Validate user authentication
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.error('[messages] Auth error:', authError?.message);
      throw new AuthenticationError('Invalid or expired authentication token');
    }

    user = authUser;
    console.log(`[messages] Authenticated user: ${user.email} (${user.id})`);

    // Set user context for error reporting
    collector.setContext({ userId: user.id });

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Route to appropriate handler
    let result;

    switch (action) {
      case 'send_message':
        result = await handleSendMessage(supabaseAdmin, payload, user);
        break;

      case 'get_threads':
        result = await handleGetThreads(supabaseAdmin, payload, user);
        break;

      case 'get_messages':
        result = await handleGetMessages(supabaseAdmin, payload, user);
        break;

      default:
        // This should never happen due to validateAction above
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[messages] Handler completed successfully`);
    console.log(`[messages] ========== REQUEST COMPLETE ==========`);

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
    console.error('[messages] ========== ERROR ==========');
    console.error('[messages] Error:', error);
    console.error('[messages] Error stack:', (error as Error).stack);

    // Report to Slack (ONE RUN = ONE LOG, fire-and-forget)
    if (collector) {
      collector.add(error as Error, 'Fatal error in main handler');
      collector.reportToSlack();
    }

    const statusCode = getStatusCodeFromError(error as Error);
    const errorResponse = formatErrorResponse(error as Error);

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
