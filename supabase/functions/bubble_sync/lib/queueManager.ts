/**
 * Queue Manager - Manages the sync_queue table operations
 *
 * Handles fetching, updating, and managing queue items for
 * Supabase → Bubble synchronization.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
export type OperationType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface QueueItem {
    id: string;
    table_name: string;
    record_id: string;
    operation: OperationType;
    payload: Record<string, unknown>;
    status: QueueStatus;
    error_message?: string;
    error_details?: Record<string, unknown>;
    retry_count: number;
    max_retries: number;
    created_at: string;
    processed_at?: string;
    next_retry_at?: string;
    bubble_response?: Record<string, unknown>;
    idempotency_key?: string;
}

export interface SyncConfig {
    id: string;
    supabase_table: string;
    bubble_workflow: string;
    bubble_object_type?: string;
    enabled: boolean;
    sync_on_insert: boolean;
    sync_on_update: boolean;
    sync_on_delete: boolean;
    field_mapping?: Record<string, string>;
    excluded_fields?: string[];
}

export interface QueueItemWithConfig extends QueueItem {
    sync_config: SyncConfig;
}

export interface QueueStats {
    pending: number;
    processing: number;
    completed_last_hour: number;
    failed_last_hour: number;
    total: number;
}

export interface ProcessResult {
    processed: number;
    success: number;
    failed: number;
    skipped: number;
}

/**
 * Fetch pending queue items with their sync configuration
 */
export async function fetchPendingItems(
    supabase: SupabaseClient,
    batchSize: number = 10
): Promise<QueueItemWithConfig[]> {
    console.log(`[QueueManager] Fetching up to ${batchSize} pending items`);

    const { data, error } = await supabase
        .from('sync_queue')
        .select(`
            *,
            sync_config!inner(*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(batchSize);

    if (error) {
        console.error(`[QueueManager] Error fetching pending items:`, error);
        throw error;
    }

    console.log(`[QueueManager] Found ${data?.length || 0} pending items`);
    return data || [];
}

/**
 * Fetch items that are ready for retry
 */
export async function fetchRetryItems(
    supabase: SupabaseClient,
    batchSize: number = 10
): Promise<QueueItemWithConfig[]> {
    const now = new Date().toISOString();

    console.log(`[QueueManager] Fetching items ready for retry (before ${now})`);

    const { data, error } = await supabase
        .from('sync_queue')
        .select(`
            *,
            sync_config!inner(*)
        `)
        .eq('status', 'failed')
        .lt('retry_count', supabase.from('sync_queue').select('max_retries'))
        .lte('next_retry_at', now)
        .order('next_retry_at', { ascending: true })
        .limit(batchSize);

    if (error) {
        console.error(`[QueueManager] Error fetching retry items:`, error);
        throw error;
    }

    console.log(`[QueueManager] Found ${data?.length || 0} items ready for retry`);
    return data || [];
}

/**
 * Mark a queue item as processing
 */
export async function markAsProcessing(
    supabase: SupabaseClient,
    itemId: string
): Promise<void> {
    console.log(`[QueueManager] Marking item ${itemId} as processing`);

    const { error } = await supabase
        .from('sync_queue')
        .update({ status: 'processing' })
        .eq('id', itemId);

    if (error) {
        console.error(`[QueueManager] Error marking as processing:`, error);
        throw error;
    }
}

/**
 * Mark a queue item as completed
 */
export async function markAsCompleted(
    supabase: SupabaseClient,
    itemId: string,
    bubbleResponse?: Record<string, unknown>
): Promise<void> {
    console.log(`[QueueManager] Marking item ${itemId} as completed`);

    const { error } = await supabase
        .from('sync_queue')
        .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            bubble_response: bubbleResponse || null,
            error_message: null,
            error_details: null
        })
        .eq('id', itemId);

    if (error) {
        console.error(`[QueueManager] Error marking as completed:`, error);
        throw error;
    }
}

/**
 * Mark a queue item as failed with error details
 */
export async function markAsFailed(
    supabase: SupabaseClient,
    itemId: string,
    errorMessage: string,
    errorDetails?: Record<string, unknown>,
    currentRetryCount: number = 0,
    maxRetries: number = 3
): Promise<void> {
    const newRetryCount = currentRetryCount + 1;
    const isPermanentFailure = newRetryCount >= maxRetries;
    const status: QueueStatus = isPermanentFailure ? 'failed' : 'pending';

    console.log(`[QueueManager] Marking item ${itemId} as ${status} (retry ${newRetryCount}/${maxRetries})`);

    const nextRetryAt = isPermanentFailure
        ? null
        : calculateNextRetry(newRetryCount);

    const { error } = await supabase
        .from('sync_queue')
        .update({
            status,
            retry_count: newRetryCount,
            error_message: errorMessage,
            error_details: errorDetails || null,
            next_retry_at: nextRetryAt
        })
        .eq('id', itemId);

    if (error) {
        console.error(`[QueueManager] Error marking as failed:`, error);
        throw error;
    }
}

/**
 * Mark a queue item as skipped (e.g., no workflow configured)
 */
export async function markAsSkipped(
    supabase: SupabaseClient,
    itemId: string,
    reason: string
): Promise<void> {
    console.log(`[QueueManager] Marking item ${itemId} as skipped: ${reason}`);

    const { error } = await supabase
        .from('sync_queue')
        .update({
            status: 'skipped',
            processed_at: new Date().toISOString(),
            error_message: reason
        })
        .eq('id', itemId);

    if (error) {
        console.error(`[QueueManager] Error marking as skipped:`, error);
        throw error;
    }
}

/**
 * Calculate next retry time using exponential backoff
 * Delays: 1min, 5min, 15min, 30min, 1hr
 */
export function calculateNextRetry(retryCount: number): string {
    const delays = [60, 300, 900, 1800, 3600]; // seconds
    const delay = delays[Math.min(retryCount - 1, delays.length - 1)];
    const nextTime = new Date(Date.now() + delay * 1000);

    console.log(`[QueueManager] Next retry in ${delay} seconds at ${nextTime.toISOString()}`);
    return nextTime.toISOString();
}

/**
 * Get queue statistics
 */
export async function getQueueStats(
    supabase: SupabaseClient
): Promise<QueueStats> {
    console.log(`[QueueManager] Fetching queue statistics`);

    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    // Get counts by status
    const { data: statusCounts, error: statusError } = await supabase
        .from('sync_queue')
        .select('status')
        .in('status', ['pending', 'processing']);

    if (statusError) {
        console.error(`[QueueManager] Error fetching status counts:`, statusError);
        throw statusError;
    }

    // Get completed in last hour
    const { count: completedCount, error: completedError } = await supabase
        .from('sync_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('processed_at', oneHourAgo);

    if (completedError) {
        console.error(`[QueueManager] Error fetching completed count:`, completedError);
        throw completedError;
    }

    // Get failed in last hour
    const { count: failedCount, error: failedError } = await supabase
        .from('sync_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', oneHourAgo);

    if (failedError) {
        console.error(`[QueueManager] Error fetching failed count:`, failedError);
        throw failedError;
    }

    const pending = statusCounts?.filter(r => r.status === 'pending').length || 0;
    const processing = statusCounts?.filter(r => r.status === 'processing').length || 0;

    const stats: QueueStats = {
        pending,
        processing,
        completed_last_hour: completedCount || 0,
        failed_last_hour: failedCount || 0,
        total: pending + processing
    };

    console.log(`[QueueManager] Stats:`, stats);
    return stats;
}

/**
 * Get stats grouped by table
 */
export async function getStatsByTable(
    supabase: SupabaseClient
): Promise<Record<string, { pending: number; failed: number }>> {
    console.log(`[QueueManager] Fetching stats by table`);

    const { data, error } = await supabase
        .from('sync_queue')
        .select('table_name, status')
        .in('status', ['pending', 'failed']);

    if (error) {
        console.error(`[QueueManager] Error fetching stats by table:`, error);
        throw error;
    }

    const byTable: Record<string, { pending: number; failed: number }> = {};

    for (const row of data || []) {
        if (!byTable[row.table_name]) {
            byTable[row.table_name] = { pending: 0, failed: 0 };
        }
        if (row.status === 'pending') {
            byTable[row.table_name].pending++;
        } else if (row.status === 'failed') {
            byTable[row.table_name].failed++;
        }
    }

    return byTable;
}

/**
 * Clean up old completed items (older than specified days)
 */
export async function cleanupCompletedItems(
    supabase: SupabaseClient,
    olderThanDays: number = 7
): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 3600000).toISOString();

    console.log(`[QueueManager] Cleaning up completed items older than ${cutoff}`);

    const { data, error } = await supabase
        .from('sync_queue')
        .delete()
        .eq('status', 'completed')
        .lt('processed_at', cutoff)
        .select('id');

    if (error) {
        console.error(`[QueueManager] Error cleaning up:`, error);
        throw error;
    }

    const deletedCount = data?.length || 0;
    console.log(`[QueueManager] Cleaned up ${deletedCount} items`);
    return deletedCount;
}

/**
 * Add an item to the queue manually
 */
export async function addToQueue(
    supabase: SupabaseClient,
    tableName: string,
    recordId: string,
    operation: OperationType,
    payload: Record<string, unknown>
): Promise<string> {
    console.log(`[QueueManager] Adding item to queue: ${tableName}/${recordId} (${operation})`);

    const idempotencyKey = `${tableName}:${recordId}:${Date.now()}`;

    const { data, error } = await supabase
        .from('sync_queue')
        .insert({
            table_name: tableName,
            record_id: recordId,
            operation,
            payload,
            status: 'pending',
            idempotency_key: idempotencyKey
        })
        .select('id')
        .single();

    if (error) {
        console.error(`[QueueManager] Error adding to queue:`, error);
        throw error;
    }

    console.log(`[QueueManager] Added item with ID: ${data.id}`);
    return data.id;
}
