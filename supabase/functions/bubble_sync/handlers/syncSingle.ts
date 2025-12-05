/**
 * Sync Single Handler
 *
 * Manually sync a single record from Supabase to Bubble.
 * Useful for ad-hoc syncing or resyncing specific records.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubblePushConfig, callBubbleWorkflow, PushPayload } from '../lib/bubblePush.ts';
import { transformRecordForBubble } from '../lib/transformer.ts';
import { addToQueue, OperationType } from '../lib/queueManager.ts';

export interface SyncSinglePayload {
    table_name: string;
    record_id: string;
    operation?: OperationType;  // Defaults to 'UPDATE'
    use_queue?: boolean;        // If true, add to queue instead of immediate sync
}

export interface SyncSingleResult {
    synced: boolean;
    record_id: string;
    table_name: string;
    operation: OperationType;
    bubble_response?: Record<string, unknown>;
    queue_id?: string;
}

export async function handleSyncSingle(
    supabase: SupabaseClient,
    bubbleConfig: BubblePushConfig,
    payload: SyncSinglePayload
): Promise<SyncSingleResult> {
    const { table_name, record_id, operation = 'UPDATE', use_queue = false } = payload;

    console.log('[syncSingle] Manual sync request');
    console.log('[syncSingle] Table:', table_name);
    console.log('[syncSingle] Record ID:', record_id);
    console.log('[syncSingle] Operation:', operation);
    console.log('[syncSingle] Use queue:', use_queue);

    // Validate required fields
    if (!table_name) {
        throw new Error('table_name is required');
    }
    if (!record_id) {
        throw new Error('record_id is required');
    }

    // Get sync configuration for this table
    const { data: syncConfig, error: configError } = await supabase
        .from('sync_config')
        .select('*')
        .eq('supabase_table', table_name)
        .eq('enabled', true)
        .single();

    if (configError || !syncConfig) {
        throw new Error(`No sync configuration found for table: ${table_name}`);
    }

    if (!syncConfig.bubble_workflow) {
        throw new Error(`No Bubble workflow configured for table: ${table_name}`);
    }

    // Fetch the record from Supabase
    const { data: record, error: fetchError } = await supabase
        .from(table_name)
        .select('*')
        .eq('_id', record_id)
        .single();

    if (fetchError || !record) {
        throw new Error(`Record not found: ${table_name}/${record_id}`);
    }

    console.log('[syncSingle] Fetched record with', Object.keys(record).length, 'fields');

    // If using queue, add to queue and return
    if (use_queue) {
        const queueId = await addToQueue(
            supabase,
            table_name,
            record_id,
            operation,
            record
        );

        return {
            synced: false,
            record_id,
            table_name,
            operation,
            queue_id: queueId
        };
    }

    // Transform data for Bubble
    const transformedData = transformRecordForBubble(
        record,
        table_name,
        syncConfig.field_mapping || undefined,
        syncConfig.excluded_fields || undefined
    );

    // Build push payload
    const pushPayload: PushPayload = {
        _id: record_id,
        operation,
        data: transformedData
    };

    // Call Bubble workflow
    const bubbleResponse = await callBubbleWorkflow(
        bubbleConfig,
        syncConfig.bubble_workflow,
        pushPayload
    );

    console.log('[syncSingle] Sync completed successfully');

    return {
        synced: true,
        record_id,
        table_name,
        operation,
        bubble_response: bubbleResponse
    };
}
