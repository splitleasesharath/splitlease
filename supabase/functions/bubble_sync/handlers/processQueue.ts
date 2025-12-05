/**
 * Process Queue Handler
 *
 * Fetches pending items from sync_queue and pushes them to Bubble.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubblePushConfig, callBubbleWorkflow, PushPayload } from '../lib/bubblePush.ts';
import {
    fetchPendingItems,
    markAsProcessing,
    markAsCompleted,
    markAsFailed,
    markAsSkipped,
    QueueItemWithConfig,
    ProcessResult
} from '../lib/queueManager.ts';
import { transformRecordForBubble } from '../lib/transformer.ts';

export interface ProcessQueuePayload {
    batch_size?: number;
    table_filter?: string;  // Optional: only process specific table
}

export async function handleProcessQueue(
    supabase: SupabaseClient,
    bubbleConfig: BubblePushConfig,
    payload: ProcessQueuePayload
): Promise<ProcessResult> {
    const batchSize = payload?.batch_size || 10;
    const tableFilter = payload?.table_filter;

    console.log('[processQueue] Starting queue processing');
    console.log('[processQueue] Batch size:', batchSize);
    if (tableFilter) {
        console.log('[processQueue] Table filter:', tableFilter);
    }

    const result: ProcessResult = {
        processed: 0,
        success: 0,
        failed: 0,
        skipped: 0
    };

    try {
        // Fetch pending items
        let items = await fetchPendingItems(supabase, batchSize);

        // Apply table filter if specified
        if (tableFilter) {
            items = items.filter(item => item.table_name === tableFilter);
        }

        if (items.length === 0) {
            console.log('[processQueue] No pending items found');
            return result;
        }

        console.log(`[processQueue] Processing ${items.length} items`);

        // Process each item
        for (const item of items) {
            result.processed++;

            try {
                await processItem(supabase, bubbleConfig, item);
                result.success++;
            } catch (error) {
                if (error.message?.includes('skipped')) {
                    result.skipped++;
                } else {
                    result.failed++;
                }
            }
        }

        console.log('[processQueue] Processing complete:', result);
        return result;

    } catch (error) {
        console.error('[processQueue] Fatal error:', error);
        throw error;
    }
}

async function processItem(
    supabase: SupabaseClient,
    bubbleConfig: BubblePushConfig,
    item: QueueItemWithConfig
): Promise<void> {
    console.log(`[processQueue] Processing item ${item.id}`);
    console.log(`[processQueue] Table: ${item.table_name}, Record: ${item.record_id}, Op: ${item.operation}`);

    // Validate sync_config exists
    if (!item.sync_config) {
        await markAsSkipped(supabase, item.id, 'No sync configuration found');
        throw new Error('skipped: No sync configuration');
    }

    // Check if workflow is configured
    if (!item.sync_config.bubble_workflow) {
        await markAsSkipped(supabase, item.id, 'No Bubble workflow configured');
        throw new Error('skipped: No workflow configured');
    }

    // Check operation-specific flags
    const shouldSync = (
        (item.operation === 'INSERT' && item.sync_config.sync_on_insert) ||
        (item.operation === 'UPDATE' && item.sync_config.sync_on_update) ||
        (item.operation === 'DELETE' && item.sync_config.sync_on_delete)
    );

    if (!shouldSync) {
        await markAsSkipped(supabase, item.id, `Operation ${item.operation} not enabled for this table`);
        throw new Error(`skipped: Operation ${item.operation} not enabled`);
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

        console.log(`[processQueue] Item ${item.id} completed successfully`);

    } catch (error) {
        console.error(`[processQueue] Item ${item.id} failed:`, error);

        // Mark as failed with retry logic
        await markAsFailed(
            supabase,
            item.id,
            error.message,
            { stack: error.stack, name: error.name },
            item.retry_count,
            item.max_retries
        );

        throw error;
    }
}
