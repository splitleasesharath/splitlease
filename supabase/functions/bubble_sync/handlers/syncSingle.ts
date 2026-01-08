/**
 * Sync Single Handler
 * Split Lease - bubble_sync/handlers
 *
 * Manually sync a single record from Supabase to Bubble.
 * Useful for ad-hoc syncing or resyncing specific records.
 *
 * @module bubble_sync/handlers/syncSingle
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubblePushConfig, callBubbleWorkflow, PushPayload } from '../lib/bubblePush.ts';
import { transformRecordForBubble } from '../lib/transformer.ts';
import { addToQueue, OperationType } from '../lib/queueManager.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[syncSingle]'
const CONFIG_TABLE = 'sync_config'
const DEFAULT_OPERATION: OperationType = 'UPDATE'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SyncConfig {
    readonly bubble_workflow: string;
    readonly field_mapping?: Record<string, string>;
    readonly excluded_fields?: readonly string[];
}

export interface SyncSinglePayload {
    readonly table_name: string;
    readonly record_id: string;
    readonly operation?: OperationType;
    readonly use_queue?: boolean;
}

export interface SyncSingleResult {
    readonly synced: boolean;
    readonly record_id: string;
    readonly table_name: string;
    readonly operation: OperationType;
    readonly bubble_response?: Readonly<Record<string, unknown>>;
    readonly queue_id?: string;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if config has valid workflow
 * @pure
 */
const hasValidWorkflow = (config: SyncConfig | null | undefined): config is SyncConfig =>
    Boolean(config?.bubble_workflow)

/**
 * Check if data exists
 * @pure
 */
const hasData = <T>(data: T | null | undefined): data is T =>
    data !== null && data !== undefined

// ─────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build queued result (not synced yet)
 * @pure
 */
const buildQueuedResult = (
    recordId: string,
    tableName: string,
    operation: OperationType,
    queueId: string
): SyncSingleResult =>
    Object.freeze({
        synced: false,
        record_id: recordId,
        table_name: tableName,
        operation,
        queue_id: queueId,
    })

/**
 * Build synced result
 * @pure
 */
const buildSyncedResult = (
    recordId: string,
    tableName: string,
    operation: OperationType,
    bubbleResponse: Record<string, unknown>
): SyncSingleResult =>
    Object.freeze({
        synced: true,
        record_id: recordId,
        table_name: tableName,
        operation,
        bubble_response: Object.freeze(bubbleResponse),
    })

/**
 * Build push payload for Bubble
 * @pure
 */
const buildPushPayload = (
    recordId: string,
    operation: OperationType,
    transformedData: Record<string, unknown>
): PushPayload =>
    Object.freeze({
        _id: recordId,
        operation,
        data: transformedData,
    })

// ─────────────────────────────────────────────────────────────
// Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch sync configuration for table
 * @effectful (database query)
 */
async function fetchSyncConfig(
    supabase: SupabaseClient,
    tableName: string
): Promise<SyncConfig> {
    const { data: syncConfig, error } = await supabase
        .from(CONFIG_TABLE)
        .select('*')
        .eq('supabase_table', tableName)
        .eq('enabled', true)
        .single()

    if (error || !hasData(syncConfig)) {
        throw new Error(`No sync configuration found for table: ${tableName}`)
    }

    if (!hasValidWorkflow(syncConfig)) {
        throw new Error(`No Bubble workflow configured for table: ${tableName}`)
    }

    return syncConfig
}

/**
 * Fetch record from table by ID
 * @effectful (database query)
 */
async function fetchRecord(
    supabase: SupabaseClient,
    tableName: string,
    recordId: string
): Promise<Record<string, unknown>> {
    const { data: record, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('_id', recordId)
        .single()

    if (error || !hasData(record)) {
        throw new Error(`Record not found: ${tableName}/${recordId}`)
    }

    return record
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Sync single handler - manually syncs a single record
 * @effectful (database queries, HTTP request, console logging)
 */
export async function handleSyncSingle(
    supabase: SupabaseClient,
    bubbleConfig: BubblePushConfig,
    payload: SyncSinglePayload
): Promise<SyncSingleResult> {
    const { table_name, record_id, operation = DEFAULT_OPERATION, use_queue = false } = payload

    console.log(`${LOG_PREFIX} Manual sync request`)
    console.log(`${LOG_PREFIX} Table: ${table_name}`)
    console.log(`${LOG_PREFIX} Record ID: ${record_id}`)
    console.log(`${LOG_PREFIX} Operation: ${operation}`)
    console.log(`${LOG_PREFIX} Use queue: ${use_queue}`)

    // Validate required fields
    if (!table_name) {
        throw new Error('table_name is required')
    }
    if (!record_id) {
        throw new Error('record_id is required')
    }

    // Fetch configuration and record
    const syncConfig = await fetchSyncConfig(supabase, table_name)
    const record = await fetchRecord(supabase, table_name, record_id)

    console.log(`${LOG_PREFIX} Fetched record with ${Object.keys(record).length} fields`)

    // If using queue, add to queue and return
    if (use_queue) {
        const queueId = await addToQueue(supabase, table_name, record_id, operation, record)
        return buildQueuedResult(record_id, table_name, operation, queueId)
    }

    // Transform data for Bubble
    const transformedData = transformRecordForBubble(
        record,
        table_name,
        syncConfig.field_mapping || undefined,
        syncConfig.excluded_fields || undefined
    )

    // Build and send push payload
    const pushPayload = buildPushPayload(record_id, operation, transformedData)
    const bubbleResponse = await callBubbleWorkflow(bubbleConfig, syncConfig.bubble_workflow, pushPayload)

    console.log(`${LOG_PREFIX} Sync completed successfully`)

    return buildSyncedResult(record_id, table_name, operation, bubbleResponse)
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
    CONFIG_TABLE,
    DEFAULT_OPERATION,

    // Predicates
    hasValidWorkflow,
    hasData,

    // Builders
    buildQueuedResult,
    buildSyncedResult,
    buildPushPayload,

    // Query Helpers
    fetchSyncConfig,
    fetchRecord,
})
