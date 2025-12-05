/**
 * bubble_sync Edge Function
 *
 * Processes the sync_queue and pushes data FROM Supabase TO Bubble.
 * This is the reverse direction of the bubble_to_supabase_sync.py script.
 *
 * Actions:
 * - process_queue: Process pending items in the queue
 * - sync_single: Manually sync a single record
 * - retry_failed: Retry failed items
 * - get_status: Get queue statistics
 * - cleanup: Clean up old completed items
 *
 * NO FALLBACK PRINCIPLE:
 * - Real data or nothing
 * - No fallback mechanisms
 * - Errors propagate, not hidden
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

import { handleProcessQueue } from './handlers/processQueue.ts';
import { handleSyncSingle } from './handlers/syncSingle.ts';
import { handleRetryFailed } from './handlers/retryFailed.ts';
import { handleGetStatus } from './handlers/getStatus.ts';
import { handleCleanup } from './handlers/cleanup.ts';

const ALLOWED_ACTIONS = [
    'process_queue',
    'sync_single',
    'retry_failed',
    'get_status',
    'cleanup'
];

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    console.log('[bubble_sync] ========== REQUEST RECEIVED ==========');
    console.log('[bubble_sync] Method:', req.method);
    console.log('[bubble_sync] URL:', req.url);

    try {
        // Parse request body
        const { action, payload } = await req.json();

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

        // Route to handler
        let result;
        switch (action) {
            case 'process_queue':
                result = await handleProcessQueue(supabase, bubbleConfig, payload);
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
