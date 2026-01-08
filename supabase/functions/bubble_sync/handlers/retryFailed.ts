/**
 * Retry Failed Handler
 * Split Lease - bubble_sync/handlers
 *
 * Retry failed items that are ready for retry (based on next_retry_at).
 *
 * @module bubble_sync/handlers/retryFailed
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

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[retryFailed]'
const DEFAULT_BATCH_SIZE = 10
const MAX_RETRIES = 3
const QUEUE_TABLE = 'sync_queue'
const STATUS_FAILED = 'failed'
const SKIPPED_PREFIX = 'skipped'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface RetryFailedPayload {
    readonly batch_size?: number;
    readonly force?: boolean;  // If true, retry even if next_retry_at hasn't passed
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if item has valid sync configuration
 * @pure
 */
const hasValidSyncConfig = (item: QueueItemWithConfig): boolean =>
    Boolean(item.sync_config?.bubble_workflow)

/**
 * Check if error is a skip error
 * @pure
 */
const isSkipError = (error: Error): boolean =>
    Boolean(error.message?.includes(SKIPPED_PREFIX))

/**
 * Check if items array has data
 * @pure
 */
const hasItems = <T>(items: T[] | null | undefined): items is T[] =>
    Boolean(items && items.length > 0)

// ─────────────────────────────────────────────────────────────
// Date Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get current timestamp as ISO string
 * @pure
 */
const getCurrentTimestamp = (): string =>
    new Date().toISOString()

// ─────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build initial process result
 * @pure
 */
const buildInitialResult = (): ProcessResult =>
    Object.freeze({
        processed: 0,
        success: 0,
        failed: 0,
        skipped: 0,
    })

/**
 * Build push payload for Bubble
 * @pure
 */
const buildPushPayload = (item: QueueItemWithConfig, transformedData: Record<string, unknown>): PushPayload =>
    Object.freeze({
        _id: item.record_id,
        operation: item.operation,
        data: transformedData,
    })

/**
 * Build error context for failed retry
 * @pure
 */
const buildErrorContext = (error: Error, previousError: string | undefined): Record<string, unknown> =>
    Object.freeze({
        stack: error.stack,
        name: error.name,
        previous_error: previousError,
    })

// ─────────────────────────────────────────────────────────────
// Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch failed items ready for retry
 * @effectful (database query)
 */
async function fetchFailedItems(
    supabase: SupabaseClient,
    batchSize: number,
    force: boolean
): Promise<QueueItemWithConfig[]> {
    let query = supabase
        .from(QUEUE_TABLE)
        .select(`*, sync_config!inner(*)`)
        .eq('status', STATUS_FAILED)
        .lt('retry_count', MAX_RETRIES)
        .order('created_at', { ascending: true })
        .limit(batchSize)

    if (!force) {
        const now = getCurrentTimestamp()
        query = query.lte('next_retry_at', now)
    }

    const { data: items, error } = await query

    if (error) {
        throw error
    }

    return (items || []) as QueueItemWithConfig[]
}

// ─────────────────────────────────────────────────────────────
// Item Processor
// ─────────────────────────────────────────────────────────────

/**
 * Retry a single failed item
 * @effectful (database mutations, HTTP request, console logging)
 */
async function retryItem(
    supabase: SupabaseClient,
    bubbleConfig: BubblePushConfig,
    item: QueueItemWithConfig
): Promise<void> {
    console.log(`${LOG_PREFIX} Retrying item ${item.id} (attempt ${item.retry_count + 1})`)

    if (!hasValidSyncConfig(item)) {
        await markAsSkipped(supabase, item.id, 'No sync configuration or workflow')
        throw new Error(`${SKIPPED_PREFIX}: No configuration`)
    }

    await markAsProcessing(supabase, item.id)

    try {
        const transformedData = transformRecordForBubble(
            item.payload,
            item.table_name,
            item.sync_config.field_mapping || undefined,
            item.sync_config.excluded_fields || undefined
        )

        const pushPayload = buildPushPayload(item, transformedData)

        const bubbleResponse = await callBubbleWorkflow(
            bubbleConfig,
            item.sync_config.bubble_workflow,
            pushPayload
        )

        await markAsCompleted(supabase, item.id, bubbleResponse)

        console.log(`${LOG_PREFIX} Item ${item.id} retry successful`)

    } catch (error) {
        console.error(`${LOG_PREFIX} Item ${item.id} retry failed:`, error)

        await markAsFailed(
            supabase,
            item.id,
            (error as Error).message,
            buildErrorContext(error as Error, item.error_message),
            item.retry_count,
            item.max_retries
        )

        throw error
    }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Retry failed handler - retries failed queue items
 * @effectful (database mutations, HTTP requests, console logging)
 */
export async function handleRetryFailed(
    supabase: SupabaseClient,
    bubbleConfig: BubblePushConfig,
    payload: RetryFailedPayload
): Promise<ProcessResult> {
    const batchSize = payload?.batch_size || DEFAULT_BATCH_SIZE
    const force = payload?.force || false

    console.log(`${LOG_PREFIX} Starting retry processing`)
    console.log(`${LOG_PREFIX} Batch size: ${batchSize}`)
    console.log(`${LOG_PREFIX} Force retry: ${force}`)

    const result = { ...buildInitialResult() }

    try {
        const items = await fetchFailedItems(supabase, batchSize, force)

        if (!hasItems(items)) {
            console.log(`${LOG_PREFIX} No items ready for retry`)
            return Object.freeze(result)
        }

        console.log(`${LOG_PREFIX} Retrying ${items.length} items`)

        for (const item of items) {
            result.processed++

            try {
                await retryItem(supabase, bubbleConfig, item)
                result.success++
            } catch (error) {
                if (isSkipError(error as Error)) {
                    result.skipped++
                } else {
                    result.failed++
                }
            }
        }

        console.log(`${LOG_PREFIX} Retry complete:`, result)
        return Object.freeze(result)

    } catch (error) {
        console.error(`${LOG_PREFIX} Fatal error:`, error)
        throw error
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
    DEFAULT_BATCH_SIZE,
    MAX_RETRIES,
    QUEUE_TABLE,
    STATUS_FAILED,
    SKIPPED_PREFIX,

    // Predicates
    hasValidSyncConfig,
    isSkipError,
    hasItems,

    // Date Helpers
    getCurrentTimestamp,

    // Builders
    buildInitialResult,
    buildPushPayload,
    buildErrorContext,

    // Query Helpers
    fetchFailedItems,

    // Item Processor
    retryItem,
})
