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
import { handlePropagateListingFK } from './propagateListingFK.ts';

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

                // FK Propagation: Update account_host.Listings in Bubble for listing table
                if (item.table_name === 'listing') {
                    // Get the host's user ID from payload
                    // Could be in 'Created By', 'Host / Landlord', or 'User' field
                    const userId = (item.payload?.['Created By'] as string) ||
                                   (item.payload?.['Host / Landlord'] as string) ||
                                   (item.payload?.['User'] as string);

                    if (userId) {
                        try {
                            console.log(`[processQueueDataApi] Starting FK propagation for listing`);
                            const fkResult = await handlePropagateListingFK(supabase, bubbleConfig, {
                                listing_id: item.record_id,
                                listing_bubble_id: newBubbleId,
                                user_id: userId
                            });
                            console.log(`[processQueueDataApi] FK propagation result:`, fkResult);
                        } catch (fkError) {
                            // Log but don't fail - listing was created successfully
                            console.warn(`[processQueueDataApi] FK propagation failed (non-fatal):`, fkError);
                        }
                    } else {
                        console.warn(`[processQueueDataApi] No user ID found in listing payload, skipping FK propagation`);
                    }
                }

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
 * Update Supabase record with the Bubble-assigned ID after creation
 *
 * CRITICAL: Updates the `bubble_id` column, NOT the `_id` column.
 * - `_id` = Supabase primary key (generated via RPC, must not change)
 * - `bubble_id` = Bubble's assigned ID (populated after Bubble POST response)
 */
async function updateSupabaseBubbleId(
    supabase: SupabaseClient,
    tableName: string,
    recordId: string,
    bubbleId: string
): Promise<void> {
    console.log(`[processQueueDataApi] Updating ${tableName}/${recordId} with bubble_id: ${bubbleId}`);

    // Update the bubble_id field (NOT _id - that's the Supabase primary key)
    const { error } = await supabase
        .from(tableName)
        .update({ bubble_id: bubbleId })
        .eq('_id', recordId);

    if (error) {
        console.error(`[processQueueDataApi] Failed to update bubble_id:`, error);
        // Don't throw - Bubble record was created successfully
        // This is a tracking update failure, not a sync failure
    } else {
        console.log(`[processQueueDataApi] Updated bubble_id successfully`);
    }
}
