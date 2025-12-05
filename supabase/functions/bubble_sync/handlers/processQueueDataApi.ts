/**
 * Process Queue Handler - Data API Mode
 *
 * Processes sync_queue items using Bubble's Data API (/obj/) instead of Workflow API.
 *
 * Key Differences from Workflow API:
 * - POST /obj/{table} for CREATE (returns new _id)
 * - PATCH /obj/{table}/{_id} for UPDATE
 * - DELETE /obj/{table}/{_id} for DELETE
 *
 * After CREATE, updates Supabase record with the returned Bubble _id.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
    BubbleDataApiConfig,
    createRecord,
    updateRecord,
    deleteRecord,
} from '../lib/bubbleDataApi.ts';
import {
    fetchPendingItems,
    markAsProcessing,
    markAsCompleted,
    markAsFailed,
    markAsSkipped,
    QueueItemWithConfig,
    ProcessResult,
} from '../lib/queueManager.ts';

export interface ProcessQueueDataApiPayload {
    batch_size?: number;
    table_filter?: string;
}

/**
 * Process queue items using Bubble Data API
 */
export async function handleProcessQueueDataApi(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    payload: ProcessQueueDataApiPayload
): Promise<ProcessResult> {
    const batchSize = payload?.batch_size || 10;
    const tableFilter = payload?.table_filter;

    console.log('[processQueueDataApi] Starting Data API queue processing');
    console.log('[processQueueDataApi] Batch size:', batchSize);
    if (tableFilter) {
        console.log('[processQueueDataApi] Table filter:', tableFilter);
    }

    const result: ProcessResult = {
        processed: 0,
        success: 0,
        failed: 0,
        skipped: 0,
    };

    try {
        // Fetch pending items
        let items = await fetchPendingItems(supabase, batchSize);

        // Apply table filter if specified
        if (tableFilter) {
            items = items.filter(item => item.table_name === tableFilter);
        }

        if (items.length === 0) {
            console.log('[processQueueDataApi] No pending items found');
            return result;
        }

        console.log(`[processQueueDataApi] Processing ${items.length} items via Data API`);

        // Process each item
        for (const item of items) {
            result.processed++;

            try {
                await processItemDataApi(supabase, bubbleConfig, item);
                result.success++;
            } catch (error) {
                if (error.message?.includes('skipped')) {
                    result.skipped++;
                } else {
                    result.failed++;
                }
            }
        }

        console.log('[processQueueDataApi] Processing complete:', result);
        return result;

    } catch (error) {
        console.error('[processQueueDataApi] Fatal error:', error);
        throw error;
    }
}

/**
 * Process a single queue item via Data API
 */
async function processItemDataApi(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    item: QueueItemWithConfig
): Promise<void> {
    console.log(`[processQueueDataApi] Processing item ${item.id}`);
    console.log(`[processQueueDataApi] Table: ${item.table_name}, Record: ${item.record_id}, Op: ${item.operation}`);

    // Check if Data API mode is enabled (if sync_config has use_data_api flag)
    // For now, assume Data API is the default mode

    // Get the bubble_id from payload (if exists)
    const bubbleId = item.payload?._id as string | undefined;

    // Validate based on operation
    if (item.operation === 'UPDATE' && !bubbleId) {
        console.warn(`[processQueueDataApi] UPDATE operation without bubble_id, will try CREATE instead`);
    }

    if (item.operation === 'DELETE' && !bubbleId) {
        await markAsSkipped(supabase, item.id, 'DELETE operation requires bubble_id');
        throw new Error('skipped: DELETE requires bubble_id');
    }

    // Mark as processing
    await markAsProcessing(supabase, item.id);

    try {
        let bubbleResponse: Record<string, unknown> = {};

        switch (item.operation) {
            case 'INSERT': {
                // Create new record in Bubble
                const newBubbleId = await createRecord(
                    bubbleConfig,
                    item.table_name,
                    item.payload,
                    item.sync_config?.field_mapping || undefined
                );

                // Update Supabase record with the new bubble_id
                await updateSupabaseBubbleId(
                    supabase,
                    item.table_name,
                    item.record_id,
                    newBubbleId
                );

                bubbleResponse = { id: newBubbleId, operation: 'CREATE' };
                console.log(`[processQueueDataApi] Created in Bubble, ID: ${newBubbleId}`);
                break;
            }

            case 'UPDATE': {
                if (bubbleId) {
                    // Update existing record in Bubble
                    await updateRecord(
                        bubbleConfig,
                        item.table_name,
                        bubbleId,
                        item.payload,
                        item.sync_config?.field_mapping || undefined
                    );
                    bubbleResponse = { id: bubbleId, operation: 'UPDATE' };
                    console.log(`[processQueueDataApi] Updated in Bubble, ID: ${bubbleId}`);
                } else {
                    // No bubble_id means this record hasn't been synced yet
                    // Treat as INSERT
                    const newBubbleId = await createRecord(
                        bubbleConfig,
                        item.table_name,
                        item.payload,
                        item.sync_config?.field_mapping || undefined
                    );

                    await updateSupabaseBubbleId(
                        supabase,
                        item.table_name,
                        item.record_id,
                        newBubbleId
                    );

                    bubbleResponse = { id: newBubbleId, operation: 'CREATE_FROM_UPDATE' };
                    console.log(`[processQueueDataApi] Created (from UPDATE) in Bubble, ID: ${newBubbleId}`);
                }
                break;
            }

            case 'DELETE': {
                // Delete record from Bubble
                await deleteRecord(
                    bubbleConfig,
                    item.table_name,
                    bubbleId!
                );
                bubbleResponse = { id: bubbleId, operation: 'DELETE' };
                console.log(`[processQueueDataApi] Deleted from Bubble, ID: ${bubbleId}`);
                break;
            }

            default:
                throw new Error(`Unknown operation: ${item.operation}`);
        }

        // Mark as completed
        await markAsCompleted(supabase, item.id, bubbleResponse);

        console.log(`[processQueueDataApi] Item ${item.id} completed successfully`);

    } catch (error) {
        console.error(`[processQueueDataApi] Item ${item.id} failed:`, error);

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

/**
 * Update Supabase record with the Bubble _id after creation
 *
 * This is crucial for maintaining the link between Supabase and Bubble records.
 */
async function updateSupabaseBubbleId(
    supabase: SupabaseClient,
    tableName: string,
    recordId: string,
    bubbleId: string
): Promise<void> {
    console.log(`[processQueueDataApi] Updating Supabase ${tableName}/${recordId} with _id: ${bubbleId}`);

    // The record_id in our queue could be:
    // 1. An existing _id (if record came from Bubble originally)
    // 2. A Supabase UUID (if record originated in Supabase)

    // Try to update by _id first (most common case)
    const { error: idError } = await supabase
        .from(tableName)
        .update({ _id: bubbleId })
        .eq('_id', recordId);

    if (!idError) {
        console.log(`[processQueueDataApi] Updated _id successfully`);
        return;
    }

    // If that didn't work, try by supabase_id if it exists
    // This handles the case where the record was created in Supabase first
    console.log(`[processQueueDataApi] Trying alternative update approach...`);

    // Try by any unique identifier we might have
    const { error: altError } = await supabase
        .from(tableName)
        .update({ _id: bubbleId })
        .or(`_id.eq.${recordId},id.eq.${recordId}`);

    if (altError) {
        console.error(`[processQueueDataApi] Failed to update Supabase with bubble_id:`, altError);
        // Don't throw - the Bubble record was created successfully
        // This is a best-effort update
    } else {
        console.log(`[processQueueDataApi] Updated via alternative approach`);
    }
}
