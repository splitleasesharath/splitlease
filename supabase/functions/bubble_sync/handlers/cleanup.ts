/**
 * Cleanup Handler
 * Split Lease - bubble_sync/handlers
 *
 * Cleans up old completed and failed items from the queue.
 *
 * @module bubble_sync/handlers/cleanup
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[cleanup]'
const QUEUE_TABLE = 'sync_queue'
const MS_PER_DAY = 24 * 3600000

const DEFAULT_RETENTION_DAYS = Object.freeze({
    completed: 7,
    failed: 30,
    skipped: 7,
}) as const

const STATUS = Object.freeze({
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
}) as const

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type StatusType = typeof STATUS[keyof typeof STATUS]

export interface CleanupPayload {
    readonly completed_older_than_days?: number;
    readonly failed_older_than_days?: number;
    readonly skipped_older_than_days?: number;
}

export interface CleanupResult {
    readonly completed_deleted: number;
    readonly failed_deleted: number;
    readonly skipped_deleted: number;
    readonly total_deleted: number;
}

// ─────────────────────────────────────────────────────────────
// Date Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Calculate cutoff timestamp for given days ago
 * @pure
 */
const calculateCutoffTimestamp = (daysAgo: number): string =>
    new Date(Date.now() - daysAgo * MS_PER_DAY).toISOString()

// ─────────────────────────────────────────────────────────────
// Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Delete items by status and timestamp
 * @effectful (database mutation)
 */
async function deleteItemsByStatus(
    supabase: SupabaseClient,
    status: StatusType,
    cutoffTimestamp: string,
    timestampField: 'processed_at' | 'created_at'
): Promise<number> {
    const { data, error } = await supabase
        .from(QUEUE_TABLE)
        .delete()
        .eq('status', status)
        .lt(timestampField, cutoffTimestamp)
        .select('id')

    if (error) {
        console.error(`${LOG_PREFIX} Error deleting ${status} items:`, error)
        return 0
    }

    return data?.length || 0
}

// ─────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build cleanup result
 * @pure
 */
const buildCleanupResult = (
    completedDeleted: number,
    failedDeleted: number,
    skippedDeleted: number
): CleanupResult =>
    Object.freeze({
        completed_deleted: completedDeleted,
        failed_deleted: failedDeleted,
        skipped_deleted: skippedDeleted,
        total_deleted: completedDeleted + failedDeleted + skippedDeleted,
    })

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Cleanup handler - removes old items from queue
 * @effectful (database mutations, console logging)
 */
export async function handleCleanup(
    supabase: SupabaseClient,
    payload: CleanupPayload
): Promise<CleanupResult> {
    const {
        completed_older_than_days = DEFAULT_RETENTION_DAYS.completed,
        failed_older_than_days = DEFAULT_RETENTION_DAYS.failed,
        skipped_older_than_days = DEFAULT_RETENTION_DAYS.skipped,
    } = payload || {}

    console.log(`${LOG_PREFIX} Starting cleanup`)
    console.log(`${LOG_PREFIX} Completed older than: ${completed_older_than_days} days`)
    console.log(`${LOG_PREFIX} Failed older than: ${failed_older_than_days} days`)
    console.log(`${LOG_PREFIX} Skipped older than: ${skipped_older_than_days} days`)

    // Calculate cutoff timestamps
    const completedCutoff = calculateCutoffTimestamp(completed_older_than_days)
    const failedCutoff = calculateCutoffTimestamp(failed_older_than_days)
    const skippedCutoff = calculateCutoffTimestamp(skipped_older_than_days)

    // Delete items by status (in parallel)
    const [completedDeleted, failedDeleted, skippedDeleted] = await Promise.all([
        deleteItemsByStatus(supabase, STATUS.COMPLETED, completedCutoff, 'processed_at'),
        deleteItemsByStatus(supabase, STATUS.FAILED, failedCutoff, 'created_at'),
        deleteItemsByStatus(supabase, STATUS.SKIPPED, skippedCutoff, 'processed_at'),
    ])

    const result = buildCleanupResult(completedDeleted, failedDeleted, skippedDeleted)

    console.log(`${LOG_PREFIX} Cleanup complete:`, result)
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
    QUEUE_TABLE,
    MS_PER_DAY,
    DEFAULT_RETENTION_DAYS,
    STATUS,

    // Date Helpers
    calculateCutoffTimestamp,

    // Query Helpers
    deleteItemsByStatus,

    // Builders
    buildCleanupResult,
})
