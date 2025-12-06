/**
 * Get Status Handler
 *
 * Returns queue statistics and health information.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getQueueStats, getStatsByTable, QueueStats } from '../lib/queueManager.ts';

export interface GetStatusPayload {
    include_by_table?: boolean;
    include_recent_errors?: boolean;
    error_limit?: number;
}

export interface StatusResult {
    queue_stats: QueueStats;
    by_table?: Record<string, { pending: number; failed: number }>;
    recent_errors?: Array<{
        id: string;
        table_name: string;
        record_id: string;
        error_message: string;
        retry_count: number;
        created_at: string;
    }>;
    oldest_pending?: string;
    last_processed?: string;
    sync_configs?: Array<{
        supabase_table: string;
        bubble_workflow: string;
        enabled: boolean;
    }>;
}

export async function handleGetStatus(
    supabase: SupabaseClient,
    payload: GetStatusPayload
): Promise<StatusResult> {
    const {
        include_by_table = true,
        include_recent_errors = true,
        error_limit = 10
    } = payload || {};

    console.log('[getStatus] Fetching queue status');

    const result: StatusResult = {
        queue_stats: await getQueueStats(supabase)
    };

    // Get stats by table
    if (include_by_table) {
        result.by_table = await getStatsByTable(supabase);
    }

    // Get oldest pending item
    const { data: oldestPending } = await supabase
        .from('sync_queue')
        .select('created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

    if (oldestPending) {
        result.oldest_pending = oldestPending.created_at;
    }

    // Get last processed item
    const { data: lastProcessed } = await supabase
        .from('sync_queue')
        .select('processed_at')
        .eq('status', 'completed')
        .order('processed_at', { ascending: false })
        .limit(1)
        .single();

    if (lastProcessed) {
        result.last_processed = lastProcessed.processed_at;
    }

    // Get recent errors
    if (include_recent_errors) {
        const { data: recentErrors } = await supabase
            .from('sync_queue')
            .select('id, table_name, record_id, error_message, retry_count, created_at')
            .eq('status', 'failed')
            .order('created_at', { ascending: false })
            .limit(error_limit);

        result.recent_errors = recentErrors || [];
    }

    // Get sync configurations
    const { data: syncConfigs } = await supabase
        .from('sync_config')
        .select('supabase_table, bubble_workflow, enabled')
        .order('supabase_table');

    result.sync_configs = syncConfigs || [];

    console.log('[getStatus] Status retrieved:', {
        pending: result.queue_stats.pending,
        processing: result.queue_stats.processing,
        completed_last_hour: result.queue_stats.completed_last_hour,
        failed_last_hour: result.queue_stats.failed_last_hour
    });

    return result;
}
