/**
 * Bubble Sync Queue Helper
 * Split Lease - Supabase Edge Functions
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
 *
 * FP PATTERN: Pure data transformations with @pure annotations
 * Effectful functions marked with @effectful annotations
 *
 * @module proposal/lib/bubbleSyncQueue
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[proposal:bubbleSyncQueue]'

/**
 * Fields that Bubble API won't recognize
 * CRITICAL: Prevents "Unrecognized field: X" errors from Bubble API
 * @constant
 */
const BUBBLE_INCOMPATIBLE_FIELDS: ReadonlySet<string> = Object.freeze(new Set([
  'bubble_id',        // Supabase-only tracking field
  'created_at',       // Supabase timestamp (Bubble uses 'Created Date')
  'updated_at',       // Supabase timestamp (Bubble uses 'Modified Date')
  'sync_status',      // Internal sync status
  'bubble_sync_error',// Internal error tracking
  'pending',          // CRITICAL: Was causing 400 errors from Bubble
  '_internal',        // Internal marker fields
  'sync_at',          // Internal sync timestamp
  'last_synced',      // Internal sync tracking
]))

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type OperationType = 'INSERT' | 'UPDATE' | 'DELETE';

interface SyncQueueItem {
  readonly sequence: number;           // Order of processing (1, 2, 3...)
  readonly table: string;              // Supabase table name
  readonly recordId: string;           // The _id of the record
  readonly operation: OperationType;   // INSERT, UPDATE, or DELETE
  readonly bubbleId?: string;          // Explicit bubble_id for UPDATE/DELETE operations
  readonly payload: Readonly<Record<string, unknown>>;
}

interface EnqueuePayload {
  readonly correlationId: string;      // Groups related items (e.g., proposalId)
  readonly items: readonly SyncQueueItem[];
}

interface QueueInsertPayload {
  readonly table_name: string;
  readonly record_id: string;
  readonly operation: OperationType;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly status: 'pending';
  readonly idempotency_key: string;
}

// ─────────────────────────────────────────────────────────────
// Pure Data Transformations
// ─────────────────────────────────────────────────────────────

/**
 * Filter out Supabase/internal fields that Bubble API won't recognize
 * @pure
 *
 * CRITICAL: This prevents "Unrecognized field: X" errors from Bubble API
 * Only fields that Bubble actually has should be sent to the API
 */
const filterBubbleIncompatibleFields = (
  data: Readonly<Record<string, unknown>>
): Readonly<Record<string, unknown>> => {
  const filtered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (!BUBBLE_INCOMPATIBLE_FIELDS.has(key) && value !== null && value !== undefined) {
      filtered[key] = value
    }
  }
  return Object.freeze(filtered)
}

/**
 * Sort items by sequence number for proper processing order
 * @pure
 */
const sortBySequence = (
  items: readonly SyncQueueItem[]
): readonly SyncQueueItem[] =>
  [...items].sort((a, b) => a.sequence - b.sequence)

/**
 * Build idempotency key from components
 * @pure
 */
const buildIdempotencyKey = (
  correlationId: string,
  table: string,
  recordId: string,
  sequence: number
): string =>
  `${correlationId}:${table}:${recordId}:${sequence}`

/**
 * Build queue insert payload from sync item
 * @pure
 */
const buildQueuePayload = (
  item: SyncQueueItem,
  correlationId: string
): QueueInsertPayload => {
  // CRITICAL: Filter out Bubble-incompatible fields before queuing
  // This prevents "Unrecognized field: X" errors from Bubble API
  const cleanPayload = filterBubbleIncompatibleFields(item.payload)

  // Build the queue item payload
  // Include _id for the record identifier
  // For UPDATE operations, _id is used as the bubble_id by processQueueDataApi
  const queuePayload = Object.freeze({
    ...cleanPayload,
    _id: item.bubbleId || item.recordId,
  })

  return Object.freeze({
    table_name: item.table,
    record_id: item.recordId,
    operation: item.operation,
    payload: queuePayload,
    status: 'pending' as const,
    idempotency_key: buildIdempotencyKey(correlationId, item.table, item.recordId, item.sequence),
  })
}

// ─────────────────────────────────────────────────────────────
// Effectful Operations
// ─────────────────────────────────────────────────────────────

/**
 * Insert a single queue item to the database
 * @effectful - Database write operation
 */
const insertQueueItem = async (
  supabase: SupabaseClient,
  payload: QueueInsertPayload
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('sync_queue')
    .insert(payload)

  if (error) {
    // Check if it's a duplicate (already queued)
    if (error.code === '23505') {  // Unique violation
      console.log(`${LOG_PREFIX} Item already queued: ${payload.idempotency_key}`)
      return { success: true } // Treat as success - item exists
    }
    console.error(`${LOG_PREFIX} Failed to enqueue item:`, error)
    return { success: false, error: error.message }
  }

  console.log(`${LOG_PREFIX} Enqueued: ${payload.table_name}/${payload.record_id} (${payload.operation})`)
  return { success: true }
}

/**
 * Enqueue multiple sync items to the sync_queue table
 * @effectful - Database write operation
 *
 * Items are ordered by sequence number and processed sequentially.
 * This ensures CREATE operations complete before UPDATE operations
 * that depend on the created records.
 */
export const enqueueBubbleSync = async (
  supabase: SupabaseClient,
  payload: EnqueuePayload
): Promise<void> => {
  console.log(`${LOG_PREFIX} Enqueuing ${payload.items.length} items (correlation: ${payload.correlationId})`)

  // Sort items by sequence to ensure proper order
  const sortedItems = sortBySequence(payload.items)

  for (const item of sortedItems) {
    const queuePayload = buildQueuePayload(item, payload.correlationId)

    try {
      await insertQueueItem(supabase, queuePayload)
    } catch (err) {
      // Log but continue - don't fail the proposal creation
      console.error(`${LOG_PREFIX} Error enqueuing item:`, err)
    }
  }

  console.log(`${LOG_PREFIX} Enqueue complete for correlation: ${payload.correlationId}`)
}

/**
 * Trigger the bubble_sync Edge Function to process pending queue items
 * @effectful - HTTP request + environment variable access
 *
 * This is called after enqueuing items to ensure they're processed promptly.
 * Non-blocking - fires and forgets.
 */
export const triggerQueueProcessing = async (): Promise<void> => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(`${LOG_PREFIX} Missing env vars for queue trigger`)
    return
  }

  try {
    console.log(`${LOG_PREFIX} Triggering queue processing...`)

    // Fire and forget - don't await the response
    fetch(`${supabaseUrl}/functions/v1/bubble_sync`, {
      method: 'POST',
      headers: Object.freeze({
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(Object.freeze({
        action: 'process_queue_data_api',
        payload: Object.freeze({ batch_size: 10 })
      }))
    }).catch(err => {
      console.warn(`${LOG_PREFIX} Queue trigger failed (non-blocking):`, err.message)
    })

    console.log(`${LOG_PREFIX} Queue processing triggered`)
  } catch (err) {
    // Non-blocking - log and continue
    console.warn(`${LOG_PREFIX} Failed to trigger queue (non-blocking):`, err)
  }
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,
  BUBBLE_INCOMPATIBLE_FIELDS,

  // Pure Data Transformations
  filterBubbleIncompatibleFields,
  sortBySequence,
  buildIdempotencyKey,
  buildQueuePayload,

  // Effectful Operations
  insertQueueItem,
  enqueueBubbleSync,
  triggerQueueProcessing,
})
