/**
 * Process Queue Handler - Data API Mode
 * Split Lease - bubble_sync/handlers
 *
 * Processes sync_queue items using Bubble's Data API (/obj/) instead of Workflow API.
 *
 * Key Differences from Workflow API:
 * - POST /obj/{table} for CREATE (returns new _id)
 * - PATCH /obj/{table}/{_id} for UPDATE
 * - DELETE /obj/{table}/{_id} for DELETE
 *
 * After CREATE, updates Supabase record with the returned Bubble _id.
 *
 * @module bubble_sync/handlers/processQueueDataApi
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
import { handleSyncSignupAtomic } from './syncSignupAtomic.ts';
import { handlePropagateListingFK } from './propagateListingFK.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[processQueueDataApi]'
const DEFAULT_BATCH_SIZE = 10
const SKIPPED_PREFIX = 'skipped'
const LISTING_TABLE = 'listing'
const SIGNUP_ATOMIC_OPERATION = 'SIGNUP_ATOMIC'

const USER_ID_FIELDS = Object.freeze(['Created By', 'Host / Landlord', 'User']) as readonly string[]

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ProcessQueueDataApiPayload {
    readonly batch_size?: number;
    readonly table_filter?: string;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if operation is the atomic signup operation
 * @pure
 */
const isSignupAtomicOperation = (operation: string): boolean =>
    operation === SIGNUP_ATOMIC_OPERATION

/**
 * Check if item has a bubble_id in payload
 * @pure
 */
const hasBubbleId = (payload: Record<string, unknown> | undefined): boolean =>
    Boolean(payload?._id)

/**
 * Extract bubble_id from payload
 * @pure
 */
const extractBubbleId = (payload: Record<string, unknown> | undefined): string | undefined =>
    payload?._id as string | undefined

/**
 * Check if table is the listing table
 * @pure
 */
const isListingTable = (tableName: string): boolean =>
    tableName === LISTING_TABLE

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
// Data Extractors
// ─────────────────────────────────────────────────────────────

/**
 * Extract user ID from payload (tries multiple field names)
 * @pure
 */
const extractUserId = (payload: Record<string, unknown> | undefined): string | undefined => {
    if (!payload) return undefined
    for (const field of USER_ID_FIELDS) {
        const value = payload[field] as string | undefined
        if (value) return value
    }
    return undefined
}

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
 * Build CREATE response object
 * @pure
 */
const buildCreateResponse = (bubbleId: string): Readonly<Record<string, unknown>> =>
    Object.freeze({ id: bubbleId, operation: 'CREATE' })

/**
 * Build CREATE_FROM_UPDATE response object
 * @pure
 */
const buildCreateFromUpdateResponse = (bubbleId: string): Readonly<Record<string, unknown>> =>
    Object.freeze({ id: bubbleId, operation: 'CREATE_FROM_UPDATE' })

/**
 * Build UPDATE response object
 * @pure
 */
const buildUpdateResponse = (bubbleId: string): Readonly<Record<string, unknown>> =>
    Object.freeze({ id: bubbleId, operation: 'UPDATE' })

/**
 * Build DELETE response object
 * @pure
 */
const buildDeleteResponse = (bubbleId: string): Readonly<Record<string, unknown>> =>
    Object.freeze({ id: bubbleId, operation: 'DELETE' })

/**
 * Build error context for failed items
 * @pure
 */
const buildErrorContext = (error: Error): Readonly<Record<string, unknown>> =>
    Object.freeze({
        stack: error.stack,
        name: error.name,
    })

/**
 * Build FK propagation payload
 * @pure
 */
const buildFKPropagationPayload = (
    recordId: string,
    bubbleId: string,
    userId: string
): Readonly<{ listing_id: string; listing_bubble_id: string; user_id: string }> =>
    Object.freeze({
        listing_id: recordId,
        listing_bubble_id: bubbleId,
        user_id: userId,
    })

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Process queue items using Bubble Data API
 * @effectful (database mutations, HTTP requests, console logging)
 */
export async function handleProcessQueueDataApi(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    payload: ProcessQueueDataApiPayload
): Promise<ProcessResult> {
    const batchSize = payload?.batch_size || DEFAULT_BATCH_SIZE
    const tableFilter = payload?.table_filter

    console.log(`${LOG_PREFIX} Starting Data API queue processing`)
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

        console.log(`${LOG_PREFIX} Processing ${items.length} items via Data API`)

        for (const item of items) {
            result.processed++

            try {
                if (isSignupAtomicOperation(item.operation)) {
                    await processSignupAtomicItem(supabase, bubbleConfig, item)
                    result.success++
                } else {
                    await processItemDataApi(supabase, bubbleConfig, item)
                    result.success++
                }
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
// Item Processors
// ─────────────────────────────────────────────────────────────

/**
 * Process a SIGNUP_ATOMIC queue item
 * @effectful (database mutations, HTTP requests, console logging)
 */
async function processSignupAtomicItem(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    item: QueueItemWithConfig
): Promise<void> {
    console.log(`${LOG_PREFIX} Detected SIGNUP_ATOMIC operation`)

    await markAsProcessing(supabase, item.id)

    const syncResult = await handleSyncSignupAtomic(
        supabase,
        bubbleConfig,
        item.payload
    )

    await markAsCompleted(supabase, item.id, syncResult)
}

/**
 * Process a single queue item via Data API
 * @effectful (database mutations, HTTP requests, console logging)
 */
async function processItemDataApi(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    item: QueueItemWithConfig
): Promise<void> {
    console.log(`${LOG_PREFIX} Processing item ${item.id}`)
    console.log(`${LOG_PREFIX} Table: ${item.table_name}, Record: ${item.record_id}, Op: ${item.operation}`)

    const bubbleId = extractBubbleId(item.payload)

    // Validate operation requirements
    if (item.operation === 'UPDATE' && !hasBubbleId(item.payload)) {
        console.warn(`${LOG_PREFIX} UPDATE operation without bubble_id, will try CREATE instead`)
    }

    if (item.operation === 'DELETE' && !hasBubbleId(item.payload)) {
        await markAsSkipped(supabase, item.id, 'DELETE operation requires bubble_id')
        throw new Error(`${SKIPPED_PREFIX}: DELETE requires bubble_id`)
    }

    await markAsProcessing(supabase, item.id)

    try {
        const bubbleResponse = await executeOperation(supabase, bubbleConfig, item, bubbleId)

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

/**
 * Execute the appropriate Bubble API operation based on item.operation
 * @effectful (HTTP requests, database mutations for FK propagation)
 */
async function executeOperation(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    item: QueueItemWithConfig,
    bubbleId: string | undefined
): Promise<Readonly<Record<string, unknown>>> {
    switch (item.operation) {
        case 'INSERT':
            return executeInsertOperation(supabase, bubbleConfig, item)

        case 'UPDATE':
            return executeUpdateOperation(supabase, bubbleConfig, item, bubbleId)

        case 'DELETE':
            return executeDeleteOperation(bubbleConfig, item, bubbleId!)

        default:
            throw new Error(`Unknown operation: ${item.operation}`)
    }
}

/**
 * Execute INSERT operation - create in Bubble, update Supabase, propagate FK if listing
 * @effectful (HTTP requests, database mutations)
 */
async function executeInsertOperation(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    item: QueueItemWithConfig
): Promise<Readonly<Record<string, unknown>>> {
    const newBubbleId = await createRecord(
        bubbleConfig,
        item.table_name,
        item.payload,
        item.sync_config?.field_mapping || undefined
    )

    await updateSupabaseBubbleId(supabase, item.table_name, item.record_id, newBubbleId)

    // FK Propagation for listing table
    if (isListingTable(item.table_name)) {
        await propagateListingFKIfNeeded(supabase, bubbleConfig, item, newBubbleId)
    }

    console.log(`${LOG_PREFIX} Created in Bubble, ID: ${newBubbleId}`)
    return buildCreateResponse(newBubbleId)
}

/**
 * Execute UPDATE operation - update or create in Bubble depending on bubble_id existence
 * @effectful (HTTP requests, database mutations)
 */
async function executeUpdateOperation(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    item: QueueItemWithConfig,
    bubbleId: string | undefined
): Promise<Readonly<Record<string, unknown>>> {
    if (bubbleId) {
        await updateRecord(
            bubbleConfig,
            item.table_name,
            bubbleId,
            item.payload,
            item.sync_config?.field_mapping || undefined
        )
        console.log(`${LOG_PREFIX} Updated in Bubble, ID: ${bubbleId}`)
        return buildUpdateResponse(bubbleId)
    }

    // No bubble_id means record hasn't been synced yet - treat as INSERT
    const newBubbleId = await createRecord(
        bubbleConfig,
        item.table_name,
        item.payload,
        item.sync_config?.field_mapping || undefined
    )

    await updateSupabaseBubbleId(supabase, item.table_name, item.record_id, newBubbleId)

    console.log(`${LOG_PREFIX} Created (from UPDATE) in Bubble, ID: ${newBubbleId}`)
    return buildCreateFromUpdateResponse(newBubbleId)
}

/**
 * Execute DELETE operation - delete from Bubble
 * @effectful (HTTP request)
 */
async function executeDeleteOperation(
    bubbleConfig: BubbleDataApiConfig,
    item: QueueItemWithConfig,
    bubbleId: string
): Promise<Readonly<Record<string, unknown>>> {
    await deleteRecord(bubbleConfig, item.table_name, bubbleId)
    console.log(`${LOG_PREFIX} Deleted from Bubble, ID: ${bubbleId}`)
    return buildDeleteResponse(bubbleId)
}

/**
 * Propagate listing FK to host's user record if user ID is found
 * @effectful (HTTP request, console logging)
 */
async function propagateListingFKIfNeeded(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    item: QueueItemWithConfig,
    newBubbleId: string
): Promise<void> {
    const userId = extractUserId(item.payload)

    if (!userId) {
        console.warn(`${LOG_PREFIX} No user ID found in listing payload, skipping FK propagation`)
        return
    }

    try {
        console.log(`${LOG_PREFIX} Starting FK propagation for listing`)
        const fkPayload = buildFKPropagationPayload(item.record_id, newBubbleId, userId)
        const fkResult = await handlePropagateListingFK(supabase, bubbleConfig, fkPayload)
        console.log(`${LOG_PREFIX} FK propagation result:`, fkResult)
    } catch (fkError) {
        // Log but don't fail - listing was created successfully
        console.warn(`${LOG_PREFIX} FK propagation failed (non-fatal):`, fkError)
    }
}

// ─────────────────────────────────────────────────────────────
// Supabase Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Update Supabase record with the Bubble-assigned ID after creation
 *
 * CRITICAL: Updates the `bubble_id` column, NOT the `_id` column.
 * - `_id` = Supabase primary key (generated via RPC, must not change)
 * - `bubble_id` = Bubble's assigned ID (populated after Bubble POST response)
 *
 * @effectful (database mutation, console logging)
 */
async function updateSupabaseBubbleId(
    supabase: SupabaseClient,
    tableName: string,
    recordId: string,
    bubbleId: string
): Promise<void> {
    console.log(`${LOG_PREFIX} Updating ${tableName}/${recordId} with bubble_id: ${bubbleId}`)

    const { error } = await supabase
        .from(tableName)
        .update({ bubble_id: bubbleId })
        .eq('_id', recordId)

    if (error) {
        console.error(`${LOG_PREFIX} Failed to update bubble_id:`, error)
        // Don't throw - Bubble record was created successfully
        // This is a tracking update failure, not a sync failure
    } else {
        console.log(`${LOG_PREFIX} Updated bubble_id successfully`)
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
    LISTING_TABLE,
    SIGNUP_ATOMIC_OPERATION,
    USER_ID_FIELDS,

    // Predicates
    isSignupAtomicOperation,
    hasBubbleId,
    extractBubbleId,
    isListingTable,
    isSkipError,
    hasItems,

    // Data Extractors
    extractUserId,

    // Filter Helpers
    filterByTable,

    // Builders
    buildInitialResult,
    buildCreateResponse,
    buildCreateFromUpdateResponse,
    buildUpdateResponse,
    buildDeleteResponse,
    buildErrorContext,
    buildFKPropagationPayload,

    // Item Processors
    processSignupAtomicItem,
    processItemDataApi,
    executeOperation,
    executeInsertOperation,
    executeUpdateOperation,
    executeDeleteOperation,
    propagateListingFKIfNeeded,

    // Supabase Helpers
    updateSupabaseBubbleId,
})
