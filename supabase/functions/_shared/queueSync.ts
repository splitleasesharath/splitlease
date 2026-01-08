/**
 * Shared Queue Sync Utility
 * Split Lease - Supabase Edge Functions
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
 *
 * @module _shared/queueSync
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[QueueSync]'
const DEFAULT_BATCH_SIZE = 10
const UNIQUE_VIOLATION_CODE = '23505'

/**
 * Supported operation types for sync queue
 * @immutable
 */
export const OPERATION_TYPES = Object.freeze([
  'INSERT',
  'UPDATE',
  'DELETE',
  'SIGNUP_ATOMIC',
] as const)

export type OperationType = typeof OPERATION_TYPES[number]

/**
 * Fields that Bubble API won't recognize - these are filtered out before queueing
 * CRITICAL: This prevents "Unrecognized field: X" errors from Bubble API
 * @immutable
 */
const BUBBLE_INCOMPATIBLE_FIELDS = Object.freeze(new Set([
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
// Type Definitions
// ─────────────────────────────────────────────────────────────

export interface SyncQueueItem {
  readonly sequence: number;           // Order of processing (1, 2, 3...)
  readonly table: string;              // Supabase table name OR special marker (e.g., 'SIGNUP_ATOMIC')
  readonly recordId: string;           // The _id of the record in Supabase
  readonly operation: OperationType;   // INSERT, UPDATE, DELETE, or SIGNUP_ATOMIC
  readonly bubbleId?: string;          // Explicit bubble_id for UPDATE/DELETE operations
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface EnqueuePayload {
  readonly correlationId: string;      // Groups related items (e.g., proposalId, signupId)
  readonly items: ReadonlyArray<SyncQueueItem>;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if field is incompatible with Bubble API
 * @pure
 */
const isBubbleIncompatibleField = (field: string): boolean =>
  BUBBLE_INCOMPATIBLE_FIELDS.has(field)

/**
 * Check if value should be included (not null or undefined)
 * @pure
 */
const isIncludableValue = (value: unknown): boolean =>
  value !== null && value !== undefined

/**
 * Check if error is a unique violation (duplicate key)
 * @pure
 */
const isUniqueViolation = (errorCode: string | undefined): boolean =>
  errorCode === UNIQUE_VIOLATION_CODE

// ─────────────────────────────────────────────────────────────
// Filter Functions
// ─────────────────────────────────────────────────────────────

/**
 * Filter out Supabase/internal fields that Bubble API won't recognize
 *
 * @param data - The data object to filter
 * @returns Filtered data object without Bubble-incompatible fields
 * @pure
 */
export function filterBubbleIncompatibleFields(
  data: Record<string, unknown>
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!isBubbleIncompatibleField(key) && isIncludableValue(value)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

// ─────────────────────────────────────────────────────────────
// Key Generation
// ─────────────────────────────────────────────────────────────

/**
 * Generate a unique idempotency key for a sync queue item
 *
 * @param correlationId - The correlation ID grouping related items
 * @param table - The table name
 * @param recordId - The record ID
 * @param sequence - The sequence number
 * @returns A unique idempotency key
 * @pure
 */
export function generateIdempotencyKey(
  correlationId: string,
  table: string,
  recordId: string,
  sequence: number
): string {
  return `${correlationId}:${table}:${recordId}:${sequence}`;
}

// ─────────────────────────────────────────────────────────────
// Queue Operations
// ─────────────────────────────────────────────────────────────

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
 * @effectful (database I/O, console logging)
 */
export async function enqueueBubbleSync(
  supabase: SupabaseClient,
  payload: EnqueuePayload
): Promise<void> {
  console.log(`${LOG_PREFIX} Enqueuing ${payload.items.length} items (correlation: ${payload.correlationId})`);

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
    const cleanPayload = filterBubbleIncompatibleFields(item.payload as Record<string, unknown>);

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
        if (isUniqueViolation(error.code)) {
          console.log(`${LOG_PREFIX} Item already queued: ${idempotencyKey}`);
        } else {
          console.error(`${LOG_PREFIX} Failed to enqueue item:`, error);
          throw error;
        }
      } else {
        console.log(`${LOG_PREFIX} Enqueued: ${item.table}/${item.recordId} (${item.operation}, seq: ${item.sequence})`);
      }
    } catch (err) {
      // Log but continue - don't fail the main operation
      console.error(`${LOG_PREFIX} Error enqueuing item:`, err);
    }
  }

  console.log(`${LOG_PREFIX} Enqueue complete for correlation: ${payload.correlationId}`);
}

/**
 * Enqueue a single sync item (convenience wrapper)
 *
 * @param supabase - Supabase client
 * @param item - Single item to enqueue
 * @effectful (database I/O via enqueueBubbleSync)
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
 * @effectful (network I/O, environment reads, console logging)
 */
export async function triggerQueueProcessing(
  options: { batchSize?: number } = {}
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(`${LOG_PREFIX} Missing env vars for queue trigger`);
    return;
  }

  try {
    console.log(`${LOG_PREFIX} Triggering queue processing...`);

    // Fire and forget - don't await the response
    fetch(`${supabaseUrl}/functions/v1/bubble_sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'process_queue_data_api',
        payload: { batch_size: options.batchSize || DEFAULT_BATCH_SIZE }
      })
    }).catch(err => {
      console.warn(`${LOG_PREFIX} Queue trigger failed (non-blocking):`, err.message);
    });

    console.log(`${LOG_PREFIX} Queue processing triggered`);
  } catch (err) {
    // Non-blocking - log and continue
    console.warn(`${LOG_PREFIX} Failed to trigger queue (non-blocking):`, err);
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
 * @effectful (database I/O via enqueueBubbleSync)
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
  DEFAULT_BATCH_SIZE,
  UNIQUE_VIOLATION_CODE,
  OPERATION_TYPES,
  BUBBLE_INCOMPATIBLE_FIELDS,

  // Predicates
  isBubbleIncompatibleField,
  isIncludableValue,
  isUniqueViolation,

  // Functions
  generateIdempotencyKey,
  filterBubbleIncompatibleFields,
})
