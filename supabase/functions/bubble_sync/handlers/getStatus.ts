/**
 * Get Status Handler
 * Split Lease - bubble_sync/handlers
 *
 * Returns queue statistics and health information.
 *
 * @module bubble_sync/handlers/getStatus
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getQueueStats, getStatsByTable, QueueStats } from '../lib/queueManager.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[getStatus]'
const DEFAULT_ERROR_LIMIT = 10
const QUEUE_TABLE = 'sync_queue'
const CONFIG_TABLE = 'sync_config'
const STATUS_PENDING = 'pending'
const STATUS_COMPLETED = 'completed'
const STATUS_FAILED = 'failed'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface RecentError {
    readonly id: string;
    readonly table_name: string;
    readonly record_id: string;
    readonly error_message: string;
    readonly retry_count: number;
    readonly created_at: string;
}

interface SyncConfig {
    readonly supabase_table: string;
    readonly bubble_workflow: string;
    readonly enabled: boolean;
}

export interface GetStatusPayload {
    readonly include_by_table?: boolean;
    readonly include_recent_errors?: boolean;
    readonly error_limit?: number;
}

export interface StatusResult {
    readonly queue_stats: QueueStats;
    readonly by_table?: Readonly<Record<string, { pending: number; failed: number }>>;
    readonly recent_errors?: readonly RecentError[];
    readonly oldest_pending?: string;
    readonly last_processed?: string;
    readonly sync_configs?: readonly SyncConfig[];
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if data exists
 * @pure
 */
const hasData = <T>(data: T | null | undefined): data is T =>
    data !== null && data !== undefined

// ─────────────────────────────────────────────────────────────
// Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch oldest pending item timestamp
 * @effectful (database query)
 */
async function fetchOldestPending(supabase: SupabaseClient): Promise<string | undefined> {
    const { data } = await supabase
        .from(QUEUE_TABLE)
        .select('created_at')
        .eq('status', STATUS_PENDING)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

    return hasData(data) ? data.created_at : undefined
}

/**
 * Fetch last processed item timestamp
 * @effectful (database query)
 */
async function fetchLastProcessed(supabase: SupabaseClient): Promise<string | undefined> {
    const { data } = await supabase
        .from(QUEUE_TABLE)
        .select('processed_at')
        .eq('status', STATUS_COMPLETED)
        .order('processed_at', { ascending: false })
        .limit(1)
        .single()

    return hasData(data) ? data.processed_at : undefined
}

/**
 * Fetch recent errors from queue
 * @effectful (database query)
 */
async function fetchRecentErrors(
    supabase: SupabaseClient,
    limit: number
): Promise<readonly RecentError[]> {
    const { data } = await supabase
        .from(QUEUE_TABLE)
        .select('id, table_name, record_id, error_message, retry_count, created_at')
        .eq('status', STATUS_FAILED)
        .order('created_at', { ascending: false })
        .limit(limit)

    return Object.freeze(data || [])
}

/**
 * Fetch sync configurations
 * @effectful (database query)
 */
async function fetchSyncConfigs(supabase: SupabaseClient): Promise<readonly SyncConfig[]> {
    const { data } = await supabase
        .from(CONFIG_TABLE)
        .select('supabase_table, bubble_workflow, enabled')
        .order('supabase_table')

    return Object.freeze(data || [])
}

// ─────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build log summary object
 * @pure
 */
const buildLogSummary = (stats: QueueStats): Readonly<Record<string, number>> =>
    Object.freeze({
        pending: stats.pending,
        processing: stats.processing,
        completed_last_hour: stats.completed_last_hour,
        failed_last_hour: stats.failed_last_hour,
    })

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Get status handler - returns queue statistics
 * @effectful (database queries, console logging)
 */
export async function handleGetStatus(
    supabase: SupabaseClient,
    payload: GetStatusPayload
): Promise<StatusResult> {
    const {
        include_by_table = true,
        include_recent_errors = true,
        error_limit = DEFAULT_ERROR_LIMIT,
    } = payload || {}

    console.log(`${LOG_PREFIX} Fetching queue status`)

    // Fetch all data in parallel where possible
    const [queueStats, oldestPending, lastProcessed, syncConfigs] = await Promise.all([
        getQueueStats(supabase),
        fetchOldestPending(supabase),
        fetchLastProcessed(supabase),
        fetchSyncConfigs(supabase),
    ])

    // Conditional fetches
    const byTable = include_by_table ? await getStatsByTable(supabase) : undefined
    const recentErrors = include_recent_errors ? await fetchRecentErrors(supabase, error_limit) : undefined

    const result: StatusResult = Object.freeze({
        queue_stats: queueStats,
        ...(hasData(byTable) ? { by_table: byTable } : {}),
        ...(hasData(recentErrors) ? { recent_errors: recentErrors } : {}),
        ...(hasData(oldestPending) ? { oldest_pending: oldestPending } : {}),
        ...(hasData(lastProcessed) ? { last_processed: lastProcessed } : {}),
        sync_configs: syncConfigs,
    })

    console.log(`${LOG_PREFIX} Status retrieved:`, buildLogSummary(queueStats))

    return result
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
    DEFAULT_ERROR_LIMIT,
    QUEUE_TABLE,
    CONFIG_TABLE,
    STATUS_PENDING,
    STATUS_COMPLETED,
    STATUS_FAILED,

    // Predicates
    hasData,

    // Query Helpers
    fetchOldestPending,
    fetchLastProcessed,
    fetchRecentErrors,
    fetchSyncConfigs,

    // Builders
    buildLogSummary,
})
