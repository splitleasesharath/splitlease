/**
 * Process Queue Handler
 * Split Lease - bubble_sync/handlers
 *
 * Fetches pending items from sync_queue and pushes them to Bubble.
 *
 * @module bubble_sync/handlers/processQueue
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

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[processQueue]'
const DEFAULT_BATCH_SIZE = 10
const SKIPPED_PREFIX = 'skipped'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ProcessQueuePayload {
    readonly batch_size?: number;
    readonly table_filter?: string;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if item has valid sync configuration
 * @pure
 */
const hasSyncConfig = (item: QueueItemWithConfig): boolean =>
    Boolean(item.sync_config)

/**
 * Check if item has workflow configured
 * @pure
 */
const hasWorkflow = (item: QueueItemWithConfig): boolean =>
    Boolean(item.sync_config?.bubble_workflow)

/**
 * Check if operation should be synced based on config flags
 * @pure
 */
const shouldSyncOperation = (item: QueueItemWithConfig): boolean => {
    const config = item.sync_config
    if (!config) return false

    return (
        (item.operation === 'INSERT' && config.sync_on_insert) ||
        (item.operation === 'UPDATE' && config.sync_on_update) ||
        (item.operation === 'DELETE' && config.sync_on_delete)
    )
}

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
const hasItems = (items: QueueItemWithConfig[]): boolean =>
    items.length > 0

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
 * Build error context
 * @pure
 */
const buildErrorContext = (error: Error): Record<string, unknown> =>
    Object.freeze({
        stack: error.stack,
        name: error.name,
    })

// ─────────────────────────────────────────────────────────────
// Filter Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Filter items by table name
 * @pure
 */
const filterByTable = (items: QueueItemWithConfig[], tableFilter?: string): QueueItemWithConfig[] =>
    tableFilter ? items.filter(item => item.table_name === tableFilter) : items

// ─────────────────────────────────────────────────────────────
// Item Processor
// ─────────────────────────────────────────────────────────────

/**
 * Process a single queue item
 * @effectful (database mutations, HTTP request, console logging)
 */
async function processItem(
    supabase: SupabaseClient,
    bubbleConfig: BubblePushConfig,
    item: QueueItemWithConfig
): Promise<void> {
    console.log(`${LOG_PREFIX} Processing item ${item.id}`)
    console.log(`${LOG_PREFIX} Table: ${item.table_name}, Record: ${item.record_id}, Op: ${item.operation}`)

    // Validate sync_config exists
    if (!hasSyncConfig(item)) {
        await markAsSkipped(supabase, item.id, 'No sync configuration found')
        throw new Error(`${SKIPPED_PREFIX}: No sync configuration`)
    }

    // Check if workflow is configured
    if (!hasWorkflow(item)) {
        await markAsSkipped(supabase, item.id, 'No Bubble workflow configured')
        throw new Error(`${SKIPPED_PREFIX}: No workflow configured`)
    }

    // Check operation-specific flags
    if (!shouldSyncOperation(item)) {
        await markAsSkipped(supabase, item.id, `Operation ${item.operation} not enabled for this table`)
        throw new Error(`${SKIPPED_PREFIX}: Operation ${item.operation} not enabled`)
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

        console.log(`${LOG_PREFIX} Item ${item.id} completed successfully`)

    } catch (error) {
        console.error(`${LOG_PREFIX} Item ${item.id} failed:`, error)

        await markAsFailed(
            supabase,
            item.id,
            (error as Error).message,
            buildErrorContext(error as Error),
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
 * Process queue handler - processes pending queue items
 * @effectful (database mutations, HTTP requests, console logging)
 */
export async function handleProcessQueue(
    supabase: SupabaseClient,
    bubbleConfig: BubblePushConfig,
    payload: ProcessQueuePayload
): Promise<ProcessResult> {
    const batchSize = payload?.batch_size || DEFAULT_BATCH_SIZE
    const tableFilter = payload?.table_filter

    console.log(`${LOG_PREFIX} Starting queue processing`)
    console.log(`${LOG_PREFIX} Batch size: ${batchSize}`)
    if (tableFilter) {
        console.log(`${LOG_PREFIX} Table filter: ${tableFilter}`)
    }

    const result = { ...buildInitialResult() }

    try {
        const allItems = await fetchPendingItems(supabase, batchSize)
        const items = filterByTable(allItems, tableFilter)

        if (!hasItems(items)) {
            console.log(`${LOG_PREFIX} No pending items found`)
            return Object.freeze(result)
        }

        console.log(`${LOG_PREFIX} Processing ${items.length} items`)

        for (const item of items) {
            result.processed++

            try {
                await processItem(supabase, bubbleConfig, item)
                result.success++
            } catch (error) {
                if (isSkipError(error as Error)) {
                    result.skipped++
                } else {
                    result.failed++
                }
            }
        }

        console.log(`${LOG_PREFIX} Processing complete:`, result)
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
    SKIPPED_PREFIX,

    // Predicates
    hasSyncConfig,
    hasWorkflow,
    shouldSyncOperation,
    isSkipError,
    hasItems,

    // Builders
    buildInitialResult,
    buildPushPayload,
    buildErrorContext,

    // Filter Helpers
    filterByTable,

    // Item Processor
    processItem,
})
