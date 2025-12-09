/**
 * Bubble Sync Queue Helper
 *
 * Enqueues sync operations to sync_queue table for sequential processing
 * by the bubble_sync Edge Function.
 *
 * Benefits:
 * - Decouples proposal creation from Bubble sync
 * - Automatic retry on failure
 * - Sequential processing guarantees order
 * - Non-blocking for frontend response
 *
 * NO FALLBACK PRINCIPLE: Errors are logged but don't fail the proposal creation
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type OperationType = 'INSERT' | 'UPDATE' | 'DELETE';

interface SyncQueueItem {
  sequence: number;           // Order of processing (1, 2, 3...)
  table: string;              // Supabase table name
  recordId: string;           // The _id of the record
  operation: OperationType;   // INSERT, UPDATE, or DELETE
  bubbleId?: string;          // Explicit bubble_id for UPDATE/DELETE operations
  payload: Record<string, unknown>;
}

interface EnqueuePayload {
  correlationId: string;      // Groups related items (e.g., proposalId)
  items: SyncQueueItem[];
}

/**
 * Filter out Supabase/internal fields that Bubble API won't recognize
 *
 * CRITICAL: This prevents "Unrecognized field: X" errors from Bubble API
 * Only fields that Bubble actually has should be sent to the API
 */
function filterBubbleIncompatibleFields(data: Record<string, unknown>): Record<string, unknown> {
  const incompatibleFields = new Set([
    'bubble_id',        // Supabase-only tracking field
    'created_at',       // Supabase timestamp (Bubble uses 'Created Date')
    'updated_at',       // Supabase timestamp (Bubble uses 'Modified Date')
    'sync_status',      // Internal sync status
    'bubble_sync_error',// Internal error tracking
    'pending',          // CRITICAL: Was causing 400 errors from Bubble
    '_internal',        // Internal marker fields
    'sync_at',          // Internal sync timestamp
    'last_synced',      // Internal sync tracking
  ]);

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!incompatibleFields.has(key) && value !== null && value !== undefined) {
      filtered[key] = value;
    }
  }
  return filtered;
}

/**
 * Enqueue multiple sync items to the sync_queue table
 *
 * Items are ordered by sequence number and processed sequentially.
 * This ensures CREATE operations complete before UPDATE operations
 * that depend on the created records.
 */
export async function enqueueBubbleSync(
  supabase: SupabaseClient,
  payload: EnqueuePayload
): Promise<void> {
  console.log(`[BubbleSyncQueue] Enqueuing ${payload.items.length} items (correlation: ${payload.correlationId})`);

  // Sort items by sequence to ensure proper order
  const sortedItems = [...payload.items].sort((a, b) => a.sequence - b.sequence);

  for (const item of sortedItems) {
    const idempotencyKey = `${payload.correlationId}:${item.table}:${item.recordId}:${item.sequence}`;

    // CRITICAL: Filter out Bubble-incompatible fields before queuing
    // This prevents "Unrecognized field: X" errors from Bubble API
    const cleanPayload = filterBubbleIncompatibleFields(item.payload);

    // Build the queue item payload
    // Include _id for the record identifier
    // For UPDATE operations, _id is used as the bubble_id by processQueueDataApi
    const queuePayload = {
      ...cleanPayload,
      _id: item.bubbleId || item.recordId,
    };

    try {
      const { error } = await supabase
        .from('sync_queue')
        .insert({
          table_name: item.table,
          record_id: item.recordId,
          operation: item.operation,
          payload: queuePayload,
          status: 'pending',
          idempotency_key: idempotencyKey,
        });

      if (error) {
        // Check if it's a duplicate (already queued)
        if (error.code === '23505') {  // Unique violation
          console.log(`[BubbleSyncQueue] Item already queued: ${idempotencyKey}`);
        } else {
          console.error(`[BubbleSyncQueue] Failed to enqueue item:`, error);
          throw error;
        }
      } else {
        console.log(`[BubbleSyncQueue] Enqueued: ${item.table}/${item.recordId} (${item.operation}, seq: ${item.sequence})`);
      }
    } catch (err) {
      // Log but continue - don't fail the proposal creation
      console.error(`[BubbleSyncQueue] Error enqueuing item:`, err);
    }
  }

  console.log(`[BubbleSyncQueue] Enqueue complete for correlation: ${payload.correlationId}`);
}

/**
 * Trigger the bubble_sync Edge Function to process pending queue items
 *
 * This is called after enqueuing items to ensure they're processed promptly.
 * Non-blocking - fires and forgets.
 */
export async function triggerQueueProcessing(): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[BubbleSyncQueue] Missing env vars for queue trigger');
    return;
  }

  try {
    console.log('[BubbleSyncQueue] Triggering queue processing...');

    // Fire and forget - don't await the response
    fetch(`${supabaseUrl}/functions/v1/bubble_sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'process_queue_data_api',
        payload: { batch_size: 10 }
      })
    }).catch(err => {
      console.warn('[BubbleSyncQueue] Queue trigger failed (non-blocking):', err.message);
    });

    console.log('[BubbleSyncQueue] Queue processing triggered');
  } catch (err) {
    // Non-blocking - log and continue
    console.warn('[BubbleSyncQueue] Failed to trigger queue (non-blocking):', err);
  }
}
