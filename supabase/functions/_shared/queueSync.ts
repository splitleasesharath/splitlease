/**
 * Shared Queue Sync Utility
 *
 * Standardized helper for enqueueing Bubble sync operations from any Edge Function.
 * All sync operations go through the sync_queue table and are processed by bubble_sync.
 *
 * USAGE:
 * - Import from '../../_shared/queueSync.ts' in any Edge Function
 * - Use enqueueBubbleSync() to add items to the queue
 * - Use triggerQueueProcessing() to trigger immediate processing (fire-and-forget)
 *
 * BENEFITS:
 * - Decouples main operations from Bubble sync
 * - Automatic retry on failure (via bubble_sync)
 * - Sequential processing guarantees order (via sequence field)
 * - Idempotency via unique keys
 * - Non-blocking for frontend response
 *
 * NO FALLBACK PRINCIPLE: Errors are logged but don't fail the main operation
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type OperationType = 'INSERT' | 'UPDATE' | 'DELETE' | 'SIGNUP_ATOMIC';

export interface SyncQueueItem {
  sequence: number;           // Order of processing (1, 2, 3...)
  table: string;              // Supabase table name OR special marker (e.g., 'SIGNUP_ATOMIC')
  recordId: string;           // The _id of the record in Supabase
  operation: OperationType;   // INSERT, UPDATE, DELETE, or SIGNUP_ATOMIC
  bubbleId?: string;          // Explicit bubble_id for UPDATE/DELETE operations
  payload: Record<string, unknown>;
}

export interface EnqueuePayload {
  correlationId: string;      // Groups related items (e.g., proposalId, signupId)
  items: SyncQueueItem[];
}

/**
 * Fields that Bubble API won't recognize - these are filtered out before queueing
 * CRITICAL: This prevents "Unrecognized field: X" errors from Bubble API
 */
const BUBBLE_INCOMPATIBLE_FIELDS = new Set([
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

/**
 * Filter out Supabase/internal fields that Bubble API won't recognize
 *
 * @param data - The data object to filter
 * @returns Filtered data object without Bubble-incompatible fields
 */
export function filterBubbleIncompatibleFields(
  data: Record<string, unknown>
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!BUBBLE_INCOMPATIBLE_FIELDS.has(key) && value !== null && value !== undefined) {
      filtered[key] = value;
    }
  }
  return filtered;
}

/**
 * Generate a unique idempotency key for a sync queue item
 *
 * @param correlationId - The correlation ID grouping related items
 * @param table - The table name
 * @param recordId - The record ID
 * @param sequence - The sequence number
 * @returns A unique idempotency key
 */
export function generateIdempotencyKey(
  correlationId: string,
  table: string,
  recordId: string,
  sequence: number
): string {
  return `${correlationId}:${table}:${recordId}:${sequence}`;
}

/**
 * Enqueue multiple sync items to the sync_queue table
 *
 * Items are ordered by sequence number and processed sequentially.
 * This ensures CREATE operations complete before UPDATE operations
 * that depend on the created records.
 *
 * @param supabase - Supabase client (admin client recommended)
 * @param payload - The items to enqueue with correlation ID
 * @throws Only throws on critical errors; duplicate entries are logged and skipped
 */
export async function enqueueBubbleSync(
  supabase: SupabaseClient,
  payload: EnqueuePayload
): Promise<void> {
  console.log(`[QueueSync] Enqueuing ${payload.items.length} items (correlation: ${payload.correlationId})`);

  // Sort items by sequence to ensure proper order
  const sortedItems = [...payload.items].sort((a, b) => a.sequence - b.sequence);

  for (const item of sortedItems) {
    const idempotencyKey = generateIdempotencyKey(
      payload.correlationId,
      item.table,
      item.recordId,
      item.sequence
    );

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
          console.log(`[QueueSync] Item already queued: ${idempotencyKey}`);
        } else {
          console.error(`[QueueSync] Failed to enqueue item:`, error);
          throw error;
        }
      } else {
        console.log(`[QueueSync] Enqueued: ${item.table}/${item.recordId} (${item.operation}, seq: ${item.sequence})`);
      }
    } catch (err) {
      // Log but continue - don't fail the main operation
      console.error(`[QueueSync] Error enqueuing item:`, err);
    }
  }

  console.log(`[QueueSync] Enqueue complete for correlation: ${payload.correlationId}`);
}

/**
 * Enqueue a single sync item (convenience wrapper)
 *
 * @param supabase - Supabase client
 * @param item - Single item to enqueue
 */
export async function enqueueSingleItem(
  supabase: SupabaseClient,
  item: Omit<SyncQueueItem, 'sequence'> & { correlationId: string }
): Promise<void> {
  await enqueueBubbleSync(supabase, {
    correlationId: item.correlationId,
    items: [{
      ...item,
      sequence: 1,
    }],
  });
}

/**
 * Trigger the bubble_sync Edge Function to process pending queue items
 *
 * This is called after enqueuing items to ensure they're processed promptly.
 * Non-blocking - fires and forgets. If this fails, items will be processed
 * by the scheduled cron job.
 *
 * @param options - Optional configuration
 * @param options.batchSize - Number of items to process (default: 10)
 */
export async function triggerQueueProcessing(
  options: { batchSize?: number } = {}
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[QueueSync] Missing env vars for queue trigger');
    return;
  }

  try {
    console.log('[QueueSync] Triggering queue processing...');

    // Fire and forget - don't await the response
    fetch(`${supabaseUrl}/functions/v1/bubble_sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'process_queue_data_api',
        payload: { batch_size: options.batchSize || 10 }
      })
    }).catch(err => {
      console.warn('[QueueSync] Queue trigger failed (non-blocking):', err.message);
    });

    console.log('[QueueSync] Queue processing triggered');
  } catch (err) {
    // Non-blocking - log and continue
    console.warn('[QueueSync] Failed to trigger queue (non-blocking):', err);
  }
}

/**
 * Helper to enqueue an atomic signup operation
 *
 * This creates a SIGNUP_ATOMIC entry that the bubble_sync handler
 * knows how to process specially (creates user, host account, guest account in Bubble)
 *
 * @param supabase - Supabase client
 * @param userId - The generated user ID
 * @param hostAccountId - The generated host account ID
 */
export async function enqueueSignupSync(
  supabase: SupabaseClient,
  userId: string,
  hostAccountId: string
): Promise<void> {
  await enqueueBubbleSync(supabase, {
    correlationId: `signup:${userId}`,
    items: [{
      sequence: 1,
      table: 'SIGNUP_ATOMIC',
      recordId: userId,
      operation: 'SIGNUP_ATOMIC',
      payload: {
        user_id: userId,
        host_account_id: hostAccountId,
      },
    }],
  });
}
