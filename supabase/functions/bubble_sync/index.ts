/**
 * bubble_sync Edge Function
 *
 * Processes the sync_queue and pushes data FROM Supabase TO Bubble.
 * This is the reverse direction of the bubble_to_supabase_sync.py script.
 *
 * Supports TWO modes:
 * 1. Workflow API (/wf/) - For complex operations requiring Bubble-side logic
 * 2. Data API (/obj/) - For direct CRUD operations (recommended)
 *
 * Actions:
 * - process_queue: Process pending items using Workflow API
 * - process_queue_data_api: Process pending items using Data API (recommended)
 * - sync_single: Manually sync a single record
 * - retry_failed: Retry failed items
 * - get_status: Get queue statistics
 * - cleanup: Clean up old completed items
 * - build_request: Preview API request without executing (debugging)
 *
 * NO FALLBACK PRINCIPLE:
 * - Real data or nothing
 * - No fallback mechanisms
 * - Errors propagate, not hidden
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { createErrorCollector, ErrorCollector } from '../_shared/slack.ts';

import { handleProcessQueue } from './handlers/processQueue.ts';
import { handleProcessQueueDataApi } from './handlers/processQueueDataApi.ts';
import { handleSyncSingle } from './handlers/syncSingle.ts';
import { handleRetryFailed } from './handlers/retryFailed.ts';
import { handleGetStatus } from './handlers/getStatus.ts';
import { handleCleanup } from './handlers/cleanup.ts';
import { handleBuildRequest } from './handlers/buildRequest.ts';
import { handleSyncSignupAtomic } from './handlers/syncSignupAtomic.ts';

const ALLOWED_ACTIONS = [
    'process_queue',
    'process_queue_data_api',
    'sync_single',
    'retry_failed',
    'get_status',
    'cleanup',
    'build_request',
    'sync_signup_atomic'
];

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    console.log('[bubble_sync] ========== REQUEST RECEIVED ==========');
    console.log('[bubble_sync] Method:', req.method);
    console.log('[bubble_sync] URL:', req.url);

    // Error collector for consolidated error reporting (ONE RUN = ONE LOG)
    let collector: ErrorCollector | null = null;
    let action = 'unknown';

    try {
        // Parse request body
        const body = await req.json();
        action = body.action || 'unknown';
        const payload = body.payload;

        // Create error collector after we know the action
        collector = createErrorCollector('bubble_sync', action);

        console.log('[bubble_sync] Action:', action);
        console.log('[bubble_sync] Payload:', JSON.stringify(payload, null, 2));

        // Validate action
        if (!action || !ALLOWED_ACTIONS.includes(action)) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Invalid action. Allowed: ${ALLOWED_ACTIONS.join(', ')}`
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Initialize Supabase client with service role (bypasses RLS)
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Get Bubble configuration
        const bubbleConfig = {
            bubbleBaseUrl: Deno.env.get('BUBBLE_API_BASE_URL') || '',
            bubbleApiKey: Deno.env.get('BUBBLE_API_KEY') || ''
        };

        if (!bubbleConfig.bubbleBaseUrl || !bubbleConfig.bubbleApiKey) {
            throw new Error('Missing required environment variables: BUBBLE_API_BASE_URL, BUBBLE_API_KEY');
        }

        // Build Data API config
        const dataApiConfig = {
            baseUrl: bubbleConfig.bubbleBaseUrl,
            apiKey: bubbleConfig.bubbleApiKey,
        };

        // Route to handler
        let result;
        switch (action) {
            case 'process_queue':
                // Workflow API mode (original)
                result = await handleProcessQueue(supabase, bubbleConfig, payload);
                break;
            case 'process_queue_data_api':
                // Data API mode (recommended)
                result = await handleProcessQueueDataApi(supabase, dataApiConfig, payload);
                break;
            case 'sync_single':
                result = await handleSyncSingle(supabase, bubbleConfig, payload);
                break;
            case 'retry_failed':
                result = await handleRetryFailed(supabase, bubbleConfig, payload);
                break;
            case 'get_status':
                result = await handleGetStatus(supabase, payload);
                break;
            case 'cleanup':
                result = await handleCleanup(supabase, payload);
                break;
            case 'build_request':
                // Preview request without executing
                result = await handleBuildRequest(dataApiConfig, payload);
                break;
            case 'sync_signup_atomic':
                // Atomic signup sync handler
                result = await handleSyncSignupAtomic(supabase, dataApiConfig, payload);
                break;
            default:
                throw new Error(`Unhandled action: ${action}`);
        }

        console.log('[bubble_sync] ========== REQUEST SUCCESS ==========');

        return new Response(
            JSON.stringify({ success: true, data: result }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('[bubble_sync] ========== REQUEST ERROR ==========');
        console.error('[bubble_sync] Error:', error);

        // Report to Slack (ONE RUN = ONE LOG, fire-and-forget)
        if (collector) {
            collector.add(error as Error, 'Fatal error in main handler');
            collector.reportToSlack();
        }

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Unknown error occurred'
            }),
            {
                status: error.status || 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
