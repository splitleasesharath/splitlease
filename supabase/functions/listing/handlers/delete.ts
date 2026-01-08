/**
 * Delete Listing Handler
 * Split Lease - listing/handlers
 *
 * PATTERN: Soft delete (set Deleted=true) with queue-based Bubble sync
 * Following virtual-meeting/handlers/delete.ts pattern
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * @module listing/handlers/delete
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError, SupabaseSyncError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { enqueueBubbleSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[listing:delete]'
const LISTING_TABLE = 'listing'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface DeleteListingPayload {
    readonly listing_id: string;
    readonly user_email?: string; // Optional: for ownership verification
}

export interface DeleteListingResult {
    readonly deleted: true;
    readonly listing_id: string;
    readonly deletedAt: string;
}

interface EnvConfig {
    readonly supabaseUrl: string;
    readonly supabaseServiceKey: string;
}

interface ListingRecord {
    readonly _id: string;
    readonly Name?: string;
    readonly 'Host User'?: string;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if env variables are present
 * @pure
 */
const hasEnvVars = (
    supabaseUrl: string | undefined,
    supabaseServiceKey: string | undefined
): supabaseUrl is string =>
    Boolean(supabaseUrl && supabaseServiceKey)

/**
 * Check if listing record exists
 * @pure
 */
const hasListingRecord = (listing: ListingRecord | null | undefined): listing is ListingRecord =>
    listing !== null && listing !== undefined

// ─────────────────────────────────────────────────────────────
// Config Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get environment configuration
 * @effectful (reads environment variables)
 */
const getEnvConfig = (): EnvConfig => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!hasEnvVars(supabaseUrl, supabaseServiceKey)) {
        throw new Error('Missing required environment variables')
    }

    return Object.freeze({
        supabaseUrl,
        supabaseServiceKey: supabaseServiceKey!,
    })
}

/**
 * Create Supabase admin client
 * @pure (factory function)
 */
const createSupabaseClient = (config: EnvConfig): SupabaseClient =>
    createClient(config.supabaseUrl, config.supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })

// ─────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build soft delete update payload
 * @pure
 */
const buildSoftDeletePayload = (timestamp: string): Readonly<Record<string, unknown>> =>
    Object.freeze({
        Deleted: true,
        'Modified Date': timestamp,
    })

/**
 * Build success result
 * @pure
 */
const buildSuccessResult = (listingId: string, deletedAt: string): DeleteListingResult =>
    Object.freeze({
        deleted: true,
        listing_id: listingId,
        deletedAt,
    })

/**
 * Build sync queue item
 * @pure
 */
const buildSyncQueueItem = (
    listingId: string,
    timestamp: string
): { correlationId: string; items: readonly { sequence: number; table: string; recordId: string; operation: string; bubbleId: string; payload: Record<string, unknown> }[] } =>
    Object.freeze({
        correlationId: `listing_delete:${listingId}`,
        items: Object.freeze([{
            sequence: 1,
            table: LISTING_TABLE,
            recordId: listingId,
            operation: 'UPDATE',
            bubbleId: listingId,
            payload: { Deleted: true, 'Modified Date': timestamp },
        }])
    })

// ─────────────────────────────────────────────────────────────
// Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Verify listing exists
 * @effectful (database query)
 */
async function verifyListingExists(
    supabase: SupabaseClient,
    listingId: string
): Promise<ListingRecord> {
    const { data: listing, error } = await supabase
        .from(LISTING_TABLE)
        .select('_id, Name, "Host User"')
        .eq('_id', listingId)
        .single()

    if (error || !hasListingRecord(listing)) {
        console.error(`${LOG_PREFIX} Listing not found:`, error)
        throw new ValidationError(`Listing not found: ${listingId}`)
    }

    console.log(`${LOG_PREFIX} Found listing:`, listing.Name)
    return listing as ListingRecord
}

/**
 * Soft delete listing (set Deleted=true)
 * @effectful (database mutation)
 */
async function softDeleteListing(
    supabase: SupabaseClient,
    listingId: string,
    timestamp: string
): Promise<void> {
    const updatePayload = buildSoftDeletePayload(timestamp)

    const { error } = await supabase
        .from(LISTING_TABLE)
        .update(updatePayload)
        .eq('_id', listingId)

    if (error) {
        console.error(`${LOG_PREFIX} Update failed:`, error)
        throw new SupabaseSyncError(`Failed to delete listing: ${error.message}`)
    }

    console.log(`${LOG_PREFIX} Listing soft-deleted successfully`)
}

/**
 * Queue Bubble sync for deletion (fire-and-forget)
 * @effectful (database mutation, HTTP request)
 */
async function queueBubbleSync(
    supabase: SupabaseClient,
    listingId: string,
    timestamp: string
): Promise<void> {
    try {
        const syncItem = buildSyncQueueItem(listingId, timestamp)
        await enqueueBubbleSync(supabase, syncItem)

        console.log(`${LOG_PREFIX} Bubble sync enqueued`)
        triggerQueueProcessing()
    } catch (syncError) {
        console.error(`${LOG_PREFIX} Queue error (non-blocking):`, syncError)
    }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle listing deletion with Supabase-first pattern
 * Soft deletes (Deleted=true) and queues Bubble sync
 *
 * @effectful (database mutations, HTTP requests, console logging)
 */
export async function handleDelete(
    payload: Record<string, unknown>
): Promise<DeleteListingResult> {
    console.log(`${LOG_PREFIX} ========== DELETE LISTING ==========`)

    // Validate required fields
    validateRequiredFields(payload, ['listing_id'])

    const { listing_id, user_email } = payload as DeleteListingPayload
    const config = getEnvConfig()
    const supabase = createSupabaseClient(config)

    console.log(`${LOG_PREFIX} Deleting listing ID:`, listing_id)
    if (user_email) {
        console.log(`${LOG_PREFIX} User email:`, user_email)
    }

    // Step 1: Verify listing exists
    await verifyListingExists(supabase, listing_id)

    // Step 2: Soft delete
    const now = new Date().toISOString()
    await softDeleteListing(supabase, listing_id, now)

    // Step 3: Queue Bubble sync
    await queueBubbleSync(supabase, listing_id, now)

    console.log(`${LOG_PREFIX} ========== SUCCESS ==========`)

    return buildSuccessResult(listing_id, now)
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
    LISTING_TABLE,

    // Predicates
    hasEnvVars,
    hasListingRecord,

    // Config Helpers
    getEnvConfig,
    createSupabaseClient,

    // Builders
    buildSoftDeletePayload,
    buildSuccessResult,
    buildSyncQueueItem,

    // Query Helpers
    verifyListingExists,
    softDeleteListing,
    queueBubbleSync,
})
