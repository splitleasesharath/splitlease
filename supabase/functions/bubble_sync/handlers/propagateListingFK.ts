/**
 * Propagate Listing FK to user in Supabase (and optionally Bubble)
 * Split Lease - bubble_sync/handlers
 *
 * NOTE: account_host table is DEPRECATED - listings now stored in user table
 *
 * After a listing is created, this handler updates the host user's
 * Listings array in the user table to maintain the FK relationship.
 *
 * Flow:
 * 1. Find host's user record in Supabase (by User ID)
 * 2. Get host's bubble_id from user
 * 3. Update user.Listings in Supabase
 * 4. Optionally sync to Bubble (if host has bubble_id)
 *
 * NO FALLBACK PRINCIPLE:
 * - If host not found, skip gracefully (log warning)
 * - If host has no bubble_id, update Supabase only
 * - If Bubble update fails, log error but don't fail the main sync
 *
 * @module bubble_sync/handlers/propagateListingFK
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleDataApiConfig, getRecord, updateRecord } from '../lib/bubbleDataApi.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[propagateListingFK]'
const USER_TABLE = 'user'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface PropagateListingFKPayload {
    readonly listing_id: string;         // Supabase _id of the listing
    readonly listing_bubble_id: string;  // Bubble-assigned ID of the listing
    readonly user_id: string;            // Host's user _id
}

export interface PropagateListingFKResult {
    readonly success: boolean;
    readonly host_updated: boolean;
    readonly host_bubble_id?: string;
    readonly listings_count?: number;
    readonly error?: string;
}

interface UserRecord {
    readonly _id: string;
    readonly bubble_id?: string;
    readonly Listings?: string[] | string;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if user record exists
 * @pure
 */
const hasUserRecord = (user: UserRecord | null | undefined): user is UserRecord =>
    user !== null && user !== undefined

/**
 * Check if listing is already in array
 * @pure
 */
const listingAlreadyInArray = (listings: readonly string[], listingId: string): boolean =>
    listings.includes(listingId)

/**
 * Check if user has bubble_id for sync
 * @pure
 */
const canSyncToBubble = (userBubbleId: string | undefined, listingBubbleId: string | undefined): boolean =>
    Boolean(userBubbleId && listingBubbleId)

// ─────────────────────────────────────────────────────────────
// Parsers
// ─────────────────────────────────────────────────────────────

/**
 * Parse listings from user record (handles array or JSON string)
 * @pure
 */
const parseListings = (listings: string[] | string | undefined): string[] => {
    if (!listings) return []
    if (Array.isArray(listings)) return [...listings]
    try {
        const parsed = JSON.parse(listings)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

// ─────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build result for user not found case
 * @pure
 */
const buildUserNotFoundResult = (userId: string): PropagateListingFKResult =>
    Object.freeze({
        success: true,
        host_updated: false,
        error: `No user found: ${userId}`
    })

/**
 * Build result for listing already in array case
 * @pure
 */
const buildListingExistsResult = (bubbleId: string | undefined, count: number): PropagateListingFKResult =>
    Object.freeze({
        success: true,
        host_updated: false,
        host_bubble_id: bubbleId,
        listings_count: count
    })

/**
 * Build result for Supabase update failure
 * @pure
 */
const buildSupabaseErrorResult = (errorMessage: string): PropagateListingFKResult =>
    Object.freeze({
        success: false,
        host_updated: false,
        error: `Failed to update user.Listings: ${errorMessage}`
    })

/**
 * Build result for successful update
 * @pure
 */
const buildSuccessResult = (bubbleId: string | undefined, count: number): PropagateListingFKResult =>
    Object.freeze({
        success: true,
        host_updated: true,
        host_bubble_id: bubbleId,
        listings_count: count
    })

// ─────────────────────────────────────────────────────────────
// Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch user record from Supabase
 * @effectful (database query)
 */
async function fetchUserRecord(
    supabase: SupabaseClient,
    userId: string
): Promise<UserRecord | null> {
    const { data, error } = await supabase
        .from(USER_TABLE)
        .select('_id, bubble_id, "Listings"')
        .eq('_id', userId)
        .single()

    if (error || !data) {
        console.warn(`${LOG_PREFIX} No user found with _id:`, userId)
        console.warn(`${LOG_PREFIX} Error:`, error?.message)
        return null
    }

    return data as UserRecord
}

/**
 * Update user listings in Supabase
 * @effectful (database mutation)
 */
async function updateUserListings(
    supabase: SupabaseClient,
    userId: string,
    listings: readonly string[]
): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
        .from(USER_TABLE)
        .update({ Listings: [...listings] })
        .eq('_id', userId)

    if (error) {
        console.error(`${LOG_PREFIX} Failed to update Supabase user.Listings:`, error)
        return { success: false, error: error.message }
    }

    console.log(`${LOG_PREFIX} ✅ Supabase user.Listings updated`)
    return { success: true }
}

/**
 * Sync listings to Bubble user (non-blocking)
 * @effectful (HTTP requests, console logging)
 */
async function syncListingsToBubble(
    bubbleConfig: BubbleDataApiConfig,
    userBubbleId: string,
    listingBubbleId: string
): Promise<void> {
    try {
        const bubbleUser = await getRecord(bubbleConfig, USER_TABLE, userBubbleId)
        const bubbleListings: string[] = (bubbleUser?.Listings as string[]) || []

        if (!listingAlreadyInArray(bubbleListings, listingBubbleId)) {
            const updatedListings = [...bubbleListings, listingBubbleId]
            await updateRecord(
                bubbleConfig,
                USER_TABLE,
                userBubbleId,
                { Listings: updatedListings }
            )
            console.log(`${LOG_PREFIX} ✅ Bubble user.Listings updated`)
        } else {
            console.log(`${LOG_PREFIX} Listing already in Bubble array`)
        }
    } catch (bubbleError) {
        // Non-blocking - Supabase is the source of truth
        console.warn(`${LOG_PREFIX} Failed to sync to Bubble (non-blocking):`, bubbleError)
    }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Propagate listing FK to user's Listings array
 *
 * This ensures the host user's Listings array contains the new listing's ID.
 *
 * @effectful (database mutations, HTTP requests, console logging)
 */
export async function handlePropagateListingFK(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    payload: PropagateListingFKPayload
): Promise<PropagateListingFKResult> {
    const { listing_id, listing_bubble_id, user_id } = payload

    console.log(`${LOG_PREFIX} ========== STARTING FK PROPAGATION ==========`)
    console.log(`${LOG_PREFIX} Listing _id:`, listing_id)
    console.log(`${LOG_PREFIX} Listing bubble_id:`, listing_bubble_id)
    console.log(`${LOG_PREFIX} User _id:`, user_id)
    console.log(`${LOG_PREFIX} NOTE: Using user table (account_host deprecated)`)

    // Step 1: Find host's user record
    const hostUser = await fetchUserRecord(supabase, user_id)

    if (!hasUserRecord(hostUser)) {
        return buildUserNotFoundResult(user_id)
    }

    console.log(`${LOG_PREFIX} Found host user _id:`, hostUser._id)

    // Step 2: Parse current listings
    const currentListings = parseListings(hostUser.Listings)
    console.log(`${LOG_PREFIX} Current Listings count:`, currentListings.length)

    // Step 3: Check if listing already in array
    if (listingAlreadyInArray(currentListings, listing_id)) {
        console.log(`${LOG_PREFIX} Listing already in array, skipping update`)
        return buildListingExistsResult(hostUser.bubble_id, currentListings.length)
    }

    // Step 4: Add listing to array
    const updatedListings = [...currentListings, listing_id]
    console.log(`${LOG_PREFIX} Adding listing to array, new count:`, updatedListings.length)

    // Step 5: Update in Supabase
    const updateResult = await updateUserListings(supabase, user_id, updatedListings)

    if (!updateResult.success) {
        return buildSupabaseErrorResult(updateResult.error!)
    }

    // Step 6: Optionally sync to Bubble
    if (canSyncToBubble(hostUser.bubble_id, listing_bubble_id)) {
        await syncListingsToBubble(bubbleConfig, hostUser.bubble_id!, listing_bubble_id)
    } else {
        console.log(`${LOG_PREFIX} Skipping Bubble sync - no bubble_id`)
    }

    console.log(`${LOG_PREFIX} ========== FK PROPAGATION SUCCESS ==========`)
    return buildSuccessResult(hostUser.bubble_id, updatedListings.length)
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
    USER_TABLE,

    // Predicates
    hasUserRecord,
    listingAlreadyInArray,
    canSyncToBubble,

    // Parsers
    parseListings,

    // Builders
    buildUserNotFoundResult,
    buildListingExistsResult,
    buildSupabaseErrorResult,
    buildSuccessResult,

    // Query Helpers
    fetchUserRecord,
    updateUserListings,
    syncListingsToBubble,
})
