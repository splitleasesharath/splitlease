/**
 * Cleanup Handler
 *
 * Cleans up old completed and failed items from the queue.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cleanupCompletedItems } from '../lib/queueManager.ts';

export interface CleanupPayload {
    completed_older_than_days?: number;  // Default: 7
    failed_older_than_days?: number;     // Default: 30
    skipped_older_than_days?: number;    // Default: 7
}

export interface CleanupResult {
    completed_deleted: number;
    failed_deleted: number;
    skipped_deleted: number;
    total_deleted: number;
}

export async function handleCleanup(
    supabase: SupabaseClient,
    payload: CleanupPayload
): Promise<CleanupResult> {
    const {
        completed_older_than_days = 7,
        failed_older_than_days = 30,
        skipped_older_than_days = 7
    } = payload || {};

    console.log('[cleanup] Starting cleanup');
    console.log('[cleanup] Completed older than:', completed_older_than_days, 'days');
    console.log('[cleanup] Failed older than:', failed_older_than_days, 'days');
    console.log('[cleanup] Skipped older than:', skipped_older_than_days, 'days');

    const result: CleanupResult = {
        completed_deleted: 0,
        failed_deleted: 0,
        skipped_deleted: 0,
        total_deleted: 0
    };

    // Clean up completed items
    const completedCutoff = new Date(
        Date.now() - completed_older_than_days * 24 * 3600000
    ).toISOString();

    const { data: completedDeleted, error: completedError } = await supabase
        .from('sync_queue')
        .delete()
        .eq('status', 'completed')
        .lt('processed_at', completedCutoff)
        .select('id');

    if (completedError) {
        console.error('[cleanup] Error deleting completed items:', completedError);
    } else {
        result.completed_deleted = completedDeleted?.length || 0;
    }

    // Clean up failed items (permanent failures only)
    const failedCutoff = new Date(
        Date.now() - failed_older_than_days * 24 * 3600000
    ).toISOString();

    const { data: failedDeleted, error: failedError } = await supabase
        .from('sync_queue')
        .delete()
        .eq('status', 'failed')
        .lt('created_at', failedCutoff)
        .select('id');

    if (failedError) {
        console.error('[cleanup] Error deleting failed items:', failedError);
    } else {
        result.failed_deleted = failedDeleted?.length || 0;
    }

    // Clean up skipped items
    const skippedCutoff = new Date(
        Date.now() - skipped_older_than_days * 24 * 3600000
    ).toISOString();

    const { data: skippedDeleted, error: skippedError } = await supabase
        .from('sync_queue')
        .delete()
        .eq('status', 'skipped')
        .lt('processed_at', skippedCutoff)
        .select('id');

    if (skippedError) {
        console.error('[cleanup] Error deleting skipped items:', skippedError);
    } else {
        result.skipped_deleted = skippedDeleted?.length || 0;
    }

    result.total_deleted = result.completed_deleted + result.failed_deleted + result.skipped_deleted;

    console.log('[cleanup] Cleanup complete:', result);
    return result;
}
