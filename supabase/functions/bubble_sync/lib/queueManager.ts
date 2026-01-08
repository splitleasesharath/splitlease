/**
 * Queue Manager - Manages the sync_queue table operations
 * Split Lease - bubble_sync/lib
 *
 * Handles fetching, updating, and managing queue items for
 * Supabase → Bubble synchronization.
 *
 * @module bubble_sync/lib/queueManager
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[QueueManager]'
const DEFAULT_BATCH_SIZE = 10
const DEFAULT_CLEANUP_DAYS = 7
const ONE_HOUR_MS = 3600000
const ONE_DAY_MS = 24 * ONE_HOUR_MS
const SECONDS_PER_MINUTE = 60
const QUEUE_TABLE = 'sync_queue'

/**
 * Retry delay intervals in seconds (exponential backoff)
 * Delays: 1min, 5min, 15min, 30min, 1hr
 * @immutable
 */
const RETRY_DELAYS = Object.freeze([60, 300, 900, 1800, 3600])

/**
 * Queue statuses
 * @immutable
 */
const QUEUE_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const)

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
export type OperationType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface QueueItem {
  readonly id: string;
  readonly table_name: string;
  readonly record_id: string;
  readonly operation: OperationType;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly status: QueueStatus;
  readonly error_message?: string;
  readonly error_details?: Readonly<Record<string, unknown>>;
  readonly retry_count: number;
  readonly max_retries: number;
  readonly created_at: string;
  readonly processed_at?: string;
  readonly next_retry_at?: string;
  readonly bubble_response?: Readonly<Record<string, unknown>>;
  readonly idempotency_key?: string;
}

export interface SyncConfig {
  readonly id: string;
  readonly supabase_table: string;
  readonly bubble_workflow: string;
  readonly bubble_object_type?: string;
  readonly enabled: boolean;
  readonly sync_on_insert: boolean;
  readonly sync_on_update: boolean;
  readonly sync_on_delete: boolean;
  readonly field_mapping?: Readonly<Record<string, string>>;
  readonly excluded_fields?: readonly string[];
}

export interface QueueItemWithConfig extends QueueItem {
  readonly sync_config: SyncConfig;
}

export interface QueueStats {
  readonly pending: number;
  readonly processing: number;
  readonly completed_last_hour: number;
  readonly failed_last_hour: number;
  readonly total: number;
}

export interface ProcessResult {
  readonly processed: number;
  readonly success: number;
  readonly failed: number;
  readonly skipped: number;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if retry count exceeds max retries
 * @pure
 */
const isPermanentFailure = (retryCount: number, maxRetries: number): boolean =>
  retryCount >= maxRetries

/**
 * Check if status is pending
 * @pure
 */
const isPendingStatus = (status: string): boolean =>
  status === QUEUE_STATUS.PENDING

/**
 * Check if status is failed
 * @pure
 */
const isFailedStatus = (status: string): boolean =>
  status === QUEUE_STATUS.FAILED

// ─────────────────────────────────────────────────────────────
// Data Transformers
// ─────────────────────────────────────────────────────────────

/**
 * Calculate next retry time using exponential backoff
 * @pure
 */
export function calculateNextRetry(retryCount: number): string {
  const delayIndex = Math.min(retryCount - 1, RETRY_DELAYS.length - 1)
  const delay = RETRY_DELAYS[delayIndex]
  const nextTime = new Date(Date.now() + delay * 1000)

  console.log(`${LOG_PREFIX} Next retry in ${delay} seconds at ${nextTime.toISOString()}`)
  return nextTime.toISOString()
}

/**
 * Get current ISO timestamp
 * @pure (at call time)
 */
const getCurrentTimestamp = (): string =>
  new Date().toISOString()

/**
 * Get timestamp from N hours ago
 * @pure (at call time)
 */
const getTimestampHoursAgo = (hours: number): string =>
  new Date(Date.now() - hours * ONE_HOUR_MS).toISOString()

/**
 * Get timestamp from N days ago
 * @pure (at call time)
 */
const getTimestampDaysAgo = (days: number): string =>
  new Date(Date.now() - days * ONE_DAY_MS).toISOString()

/**
 * Build idempotency key
 * @pure
 */
const buildIdempotencyKey = (tableName: string, recordId: string): string =>
  `${tableName}:${recordId}:${Date.now()}`

/**
 * Count items by status
 * @pure
 */
const countByStatus = (
  items: readonly { status: string }[],
  status: string
): number =>
  items.filter(item => item.status === status).length

// ─────────────────────────────────────────────────────────────
// Result Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build queue stats result
 * @pure
 */
const buildQueueStats = (
  pending: number,
  processing: number,
  completedLastHour: number,
  failedLastHour: number
): QueueStats =>
  Object.freeze({
    pending,
    processing,
    completed_last_hour: completedLastHour,
    failed_last_hour: failedLastHour,
    total: pending + processing,
  })

/**
 * Build stats by table entry
 * @pure
 */
const buildTableStats = (): { pending: number; failed: number } =>
  ({ pending: 0, failed: 0 })

// ─────────────────────────────────────────────────────────────
// Update Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build processing status update
 * @pure
 */
const buildProcessingUpdate = () =>
  Object.freeze({ status: QUEUE_STATUS.PROCESSING })

/**
 * Build completed status update
 * @pure
 */
const buildCompletedUpdate = (bubbleResponse?: Record<string, unknown>) =>
  Object.freeze({
    status: QUEUE_STATUS.COMPLETED,
    processed_at: getCurrentTimestamp(),
    bubble_response: bubbleResponse || null,
    error_message: null,
    error_details: null,
  })

/**
 * Build failed status update
 * @pure
 */
const buildFailedUpdate = (
  newRetryCount: number,
  errorMessage: string,
  errorDetails?: Record<string, unknown>,
  nextRetryAt?: string | null
) =>
  Object.freeze({
    status: isPermanentFailure(newRetryCount, 3) ? QUEUE_STATUS.FAILED : QUEUE_STATUS.PENDING,
    retry_count: newRetryCount,
    error_message: errorMessage,
    error_details: errorDetails || null,
    next_retry_at: nextRetryAt,
  })

/**
 * Build skipped status update
 * @pure
 */
const buildSkippedUpdate = (reason: string) =>
  Object.freeze({
    status: QUEUE_STATUS.SKIPPED,
    processed_at: getCurrentTimestamp(),
    error_message: reason,
  })

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Fetch pending queue items with their sync configuration
 * @effectful (database query, console logging)
 */
export async function fetchPendingItems(
  supabase: SupabaseClient,
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<QueueItemWithConfig[]> {
  console.log(`${LOG_PREFIX} Fetching up to ${batchSize} pending items`)

  const { data, error } = await supabase
    .from(QUEUE_TABLE)
    .select(`
      *,
      sync_config!inner(*)
    `)
    .eq('status', QUEUE_STATUS.PENDING)
    .order('created_at', { ascending: true })
    .limit(batchSize)

  if (error) {
    console.error(`${LOG_PREFIX} Error fetching pending items:`, error)
    throw error
  }

  console.log(`${LOG_PREFIX} Found ${data?.length || 0} pending items`)
  return data || []
}

/**
 * Fetch items that are ready for retry
 * @effectful (database query, console logging)
 */
export async function fetchRetryItems(
  supabase: SupabaseClient,
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<QueueItemWithConfig[]> {
  const now = getCurrentTimestamp()

  console.log(`${LOG_PREFIX} Fetching items ready for retry (before ${now})`)

  const { data, error } = await supabase
    .from(QUEUE_TABLE)
    .select(`
      *,
      sync_config!inner(*)
    `)
    .eq('status', QUEUE_STATUS.FAILED)
    .lt('retry_count', supabase.from(QUEUE_TABLE).select('max_retries'))
    .lte('next_retry_at', now)
    .order('next_retry_at', { ascending: true })
    .limit(batchSize)

  if (error) {
    console.error(`${LOG_PREFIX} Error fetching retry items:`, error)
    throw error
  }

  console.log(`${LOG_PREFIX} Found ${data?.length || 0} items ready for retry`)
  return data || []
}

/**
 * Mark a queue item as processing
 * @effectful (database update, console logging)
 */
export async function markAsProcessing(
  supabase: SupabaseClient,
  itemId: string
): Promise<void> {
  console.log(`${LOG_PREFIX} Marking item ${itemId} as processing`)

  const { error } = await supabase
    .from(QUEUE_TABLE)
    .update(buildProcessingUpdate())
    .eq('id', itemId)

  if (error) {
    console.error(`${LOG_PREFIX} Error marking as processing:`, error)
    throw error
  }
}

/**
 * Mark a queue item as completed
 * @effectful (database update, console logging)
 */
export async function markAsCompleted(
  supabase: SupabaseClient,
  itemId: string,
  bubbleResponse?: Record<string, unknown>
): Promise<void> {
  console.log(`${LOG_PREFIX} Marking item ${itemId} as completed`)

  const { error } = await supabase
    .from(QUEUE_TABLE)
    .update(buildCompletedUpdate(bubbleResponse))
    .eq('id', itemId)

  if (error) {
    console.error(`${LOG_PREFIX} Error marking as completed:`, error)
    throw error
  }
}

/**
 * Mark a queue item as failed with error details
 * @effectful (database update, console logging)
 */
export async function markAsFailed(
  supabase: SupabaseClient,
  itemId: string,
  errorMessage: string,
  errorDetails?: Record<string, unknown>,
  currentRetryCount: number = 0,
  maxRetries: number = 3
): Promise<void> {
  const newRetryCount = currentRetryCount + 1
  const isPermanent = isPermanentFailure(newRetryCount, maxRetries)
  const status = isPermanent ? QUEUE_STATUS.FAILED : QUEUE_STATUS.PENDING

  console.log(`${LOG_PREFIX} Marking item ${itemId} as ${status} (retry ${newRetryCount}/${maxRetries})`)

  const nextRetryAt = isPermanent ? null : calculateNextRetry(newRetryCount)

  const { error } = await supabase
    .from(QUEUE_TABLE)
    .update(buildFailedUpdate(newRetryCount, errorMessage, errorDetails, nextRetryAt))
    .eq('id', itemId)

  if (error) {
    console.error(`${LOG_PREFIX} Error marking as failed:`, error)
    throw error
  }
}

/**
 * Mark a queue item as skipped (e.g., no workflow configured)
 * @effectful (database update, console logging)
 */
export async function markAsSkipped(
  supabase: SupabaseClient,
  itemId: string,
  reason: string
): Promise<void> {
  console.log(`${LOG_PREFIX} Marking item ${itemId} as skipped: ${reason}`)

  const { error } = await supabase
    .from(QUEUE_TABLE)
    .update(buildSkippedUpdate(reason))
    .eq('id', itemId)

  if (error) {
    console.error(`${LOG_PREFIX} Error marking as skipped:`, error)
    throw error
  }
}

/**
 * Get queue statistics
 * @effectful (database queries, console logging)
 */
export async function getQueueStats(
  supabase: SupabaseClient
): Promise<QueueStats> {
  console.log(`${LOG_PREFIX} Fetching queue statistics`)

  const oneHourAgo = getTimestampHoursAgo(1)

  // Get counts by status
  const { data: statusCounts, error: statusError } = await supabase
    .from(QUEUE_TABLE)
    .select('status')
    .in('status', [QUEUE_STATUS.PENDING, QUEUE_STATUS.PROCESSING])

  if (statusError) {
    console.error(`${LOG_PREFIX} Error fetching status counts:`, statusError)
    throw statusError
  }

  // Get completed in last hour
  const { count: completedCount, error: completedError } = await supabase
    .from(QUEUE_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('status', QUEUE_STATUS.COMPLETED)
    .gte('processed_at', oneHourAgo)

  if (completedError) {
    console.error(`${LOG_PREFIX} Error fetching completed count:`, completedError)
    throw completedError
  }

  // Get failed in last hour
  const { count: failedCount, error: failedError } = await supabase
    .from(QUEUE_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('status', QUEUE_STATUS.FAILED)
    .gte('created_at', oneHourAgo)

  if (failedError) {
    console.error(`${LOG_PREFIX} Error fetching failed count:`, failedError)
    throw failedError
  }

  const pending = countByStatus(statusCounts || [], QUEUE_STATUS.PENDING)
  const processing = countByStatus(statusCounts || [], QUEUE_STATUS.PROCESSING)

  const stats = buildQueueStats(pending, processing, completedCount || 0, failedCount || 0)

  console.log(`${LOG_PREFIX} Stats:`, stats)
  return stats
}

/**
 * Get stats grouped by table
 * @effectful (database query, console logging)
 */
export async function getStatsByTable(
  supabase: SupabaseClient
): Promise<Record<string, { pending: number; failed: number }>> {
  console.log(`${LOG_PREFIX} Fetching stats by table`)

  const { data, error } = await supabase
    .from(QUEUE_TABLE)
    .select('table_name, status')
    .in('status', [QUEUE_STATUS.PENDING, QUEUE_STATUS.FAILED])

  if (error) {
    console.error(`${LOG_PREFIX} Error fetching stats by table:`, error)
    throw error
  }

  const byTable: Record<string, { pending: number; failed: number }> = {}

  for (const row of data || []) {
    if (!byTable[row.table_name]) {
      byTable[row.table_name] = buildTableStats()
    }
    if (isPendingStatus(row.status)) {
      byTable[row.table_name].pending++
    } else if (isFailedStatus(row.status)) {
      byTable[row.table_name].failed++
    }
  }

  return byTable
}

/**
 * Clean up old completed items (older than specified days)
 * @effectful (database delete, console logging)
 */
export async function cleanupCompletedItems(
  supabase: SupabaseClient,
  olderThanDays: number = DEFAULT_CLEANUP_DAYS
): Promise<number> {
  const cutoff = getTimestampDaysAgo(olderThanDays)

  console.log(`${LOG_PREFIX} Cleaning up completed items older than ${cutoff}`)

  const { data, error } = await supabase
    .from(QUEUE_TABLE)
    .delete()
    .eq('status', QUEUE_STATUS.COMPLETED)
    .lt('processed_at', cutoff)
    .select('id')

  if (error) {
    console.error(`${LOG_PREFIX} Error cleaning up:`, error)
    throw error
  }

  const deletedCount = data?.length || 0
  console.log(`${LOG_PREFIX} Cleaned up ${deletedCount} items`)
  return deletedCount
}

/**
 * Add an item to the queue manually
 * @effectful (database insert, console logging)
 */
export async function addToQueue(
  supabase: SupabaseClient,
  tableName: string,
  recordId: string,
  operation: OperationType,
  payload: Record<string, unknown>
): Promise<string> {
  console.log(`${LOG_PREFIX} Adding item to queue: ${tableName}/${recordId} (${operation})`)

  const idempotencyKey = buildIdempotencyKey(tableName, recordId)

  const { data, error } = await supabase
    .from(QUEUE_TABLE)
    .insert({
      table_name: tableName,
      record_id: recordId,
      operation,
      payload,
      status: QUEUE_STATUS.PENDING,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single()

  if (error) {
    console.error(`${LOG_PREFIX} Error adding to queue:`, error)
    throw error
  }

  console.log(`${LOG_PREFIX} Added item with ID: ${data.id}`)
  return data.id
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
  DEFAULT_CLEANUP_DAYS,
  ONE_HOUR_MS,
  ONE_DAY_MS,
  SECONDS_PER_MINUTE,
  QUEUE_TABLE,
  RETRY_DELAYS,
  QUEUE_STATUS,

  // Predicates
  isPermanentFailure,
  isPendingStatus,
  isFailedStatus,

  // Transformers
  getCurrentTimestamp,
  getTimestampHoursAgo,
  getTimestampDaysAgo,
  buildIdempotencyKey,
  countByStatus,

  // Builders
  buildQueueStats,
  buildTableStats,
  buildProcessingUpdate,
  buildCompletedUpdate,
  buildFailedUpdate,
  buildSkippedUpdate,
})
