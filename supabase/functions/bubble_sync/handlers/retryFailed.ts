/**
 * Retry Failed Handler
 *
 * Retry failed items that are ready for retry (based on next_retry_at).
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubblePushConfig, callBubbleWorkflow, PushPayload } from '../lib/bubblePush.ts';
import {
    markAsProcessing,
    markAsCompleted,
    markAsFailed,
    markAsSkipped,
    QueueItemWithConfig,
    ProcessResult
} from '../lib/queueManager.ts';
import { transformRecordForBubble } from '../lib/transformer.ts';

export interface RetryFailedPayload {
    batch_size?: number;
    force?: boolean;  // If true, retry even if next_retry_at hasn't passed
}

export async function handleRetryFailed(
    supabase: SupabaseClient,
    bubbleConfig: BubblePushConfig,
    payload: RetryFailedPayload
): Promise<ProcessResult> {
    const batchSize = payload?.batch_size || 10;
    const force = payload?.force || false;

    console.log('[retryFailed] Starting retry processing');
    console.log('[retryFailed] Batch size:', batchSize);
    console.log('[retryFailed] Force retry:', force);

    const result: ProcessResult = {
        processed: 0,
        success: 0,
        failed: 0,
        skipped: 0
    };

    try {
        // Build query for failed items ready for retry
        let query = supabase
            .from('sync_queue')
            .select(`
                *,
                sync_config!inner(*)
            `)
            .eq('status', 'failed')
            .lt('retry_count', 3)  // Less than max retries
            .order('created_at', { ascending: true })
            .limit(batchSize);

        // If not forcing, only get items where next_retry_at has passed
        if (!force) {
            const now = new Date().toISOString();
            query = query.lte('next_retry_at', now);
        }

        const { data: items, error } = await query;

        if (error) {
            throw error;
        }

        if (!items || items.length === 0) {
            console.log('[retryFailed] No items ready for retry');
            return result;
        }

        console.log(`[retryFailed] Retrying ${items.length} items`);

        // Process each item
        for (const item of items as QueueItemWithConfig[]) {
            result.processed++;

            try {
                await retryItem(supabase, bubbleConfig, item);
                result.success++;
            } catch (error) {
                if (error.message?.includes('skipped')) {
                    result.skipped++;
                } else {
                    result.failed++;
                }
            }
        }

        console.log('[retryFailed] Retry complete:', result);
        return result;

    } catch (error) {
        console.error('[retryFailed] Fatal error:', error);
        throw error;
    }
}

async function retryItem(
    supabase: SupabaseClient,
    bubbleConfig: BubblePushConfig,
    item: QueueItemWithConfig
): Promise<void> {
    console.log(`[retryFailed] Retrying item ${item.id} (attempt ${item.retry_count + 1})`);

    // Validate sync_config exists
    if (!item.sync_config || !item.sync_config.bubble_workflow) {
        await markAsSkipped(supabase, item.id, 'No sync configuration or workflow');
        throw new Error('skipped: No configuration');
    }

    // Mark as processing
    await markAsProcessing(supabase, item.id);

    try {
        // Transform data for Bubble
        const transformedData = transformRecordForBubble(
            item.payload,
            item.table_name,
            item.sync_config.field_mapping || undefined,
            item.sync_config.excluded_fields || undefined
        );

        // Build push payload
        const pushPayload: PushPayload = {
            _id: item.record_id,
            operation: item.operation,
            data: transformedData
        };

        // Call Bubble workflow
        const bubbleResponse = await callBubbleWorkflow(
            bubbleConfig,
            item.sync_config.bubble_workflow,
            pushPayload
        );

        // Mark as completed
        await markAsCompleted(supabase, item.id, bubbleResponse);

        console.log(`[retryFailed] Item ${item.id} retry successful`);

    } catch (error) {
        console.error(`[retryFailed] Item ${item.id} retry failed:`, error);

        // Mark as failed again with incremented retry count
        await markAsFailed(
            supabase,
            item.id,
            error.message,
            { stack: error.stack, name: error.name, previous_error: item.error_message },
            item.retry_count,
            item.max_retries
        );

        throw error;
    }
}
