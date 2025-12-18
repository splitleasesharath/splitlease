/**
 * Propagate Listing FK to user in Supabase (and optionally Bubble)
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
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleDataApiConfig, getRecord, updateRecord } from '../lib/bubbleDataApi.ts';

export interface PropagateListingFKPayload {
    listing_id: string;         // Supabase _id of the listing
    listing_bubble_id: string;  // Bubble-assigned ID of the listing
    user_id: string;            // Host's user _id
}

export interface PropagateListingFKResult {
    success: boolean;
    host_updated: boolean;
    host_bubble_id?: string;
    listings_count?: number;
    error?: string;
}

/**
 * Propagate listing FK to user's Listings array
 *
 * This ensures the host user's Listings array contains the new listing's ID.
 */
export async function handlePropagateListingFK(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    payload: PropagateListingFKPayload
): Promise<PropagateListingFKResult> {
    const { listing_id, listing_bubble_id, user_id } = payload;

    console.log('[propagateListingFK] ========== STARTING FK PROPAGATION ==========');
    console.log('[propagateListingFK] Listing _id:', listing_id);
    console.log('[propagateListingFK] Listing bubble_id:', listing_bubble_id);
    console.log('[propagateListingFK] User _id:', user_id);
    console.log('[propagateListingFK] NOTE: Using user table (account_host deprecated)');

    // Step 1: Find host's user record in Supabase
    const { data: hostUser, error: userError } = await supabase
        .from('user')
        .select('_id, bubble_id, "Listings"')
        .eq('_id', user_id)
        .single();

    if (userError || !hostUser) {
        console.warn('[propagateListingFK] No user found with _id:', user_id);
        console.warn('[propagateListingFK] Error:', userError?.message);
        return {
            success: true,
            host_updated: false,
            error: `No user found: ${user_id}`
        };
    }

    console.log('[propagateListingFK] Found host user _id:', hostUser._id);

    // Step 2: Get current Listings array from user
    let currentListings: string[] = [];
    try {
        // Parse Listings from user - could be array or JSON string
        const listings = hostUser.Listings;
        if (Array.isArray(listings)) {
            currentListings = listings;
        } else if (typeof listings === 'string') {
            currentListings = JSON.parse(listings);
        }
    } catch (parseError) {
        console.warn('[propagateListingFK] Failed to parse Listings, using empty array');
        currentListings = [];
    }
    console.log('[propagateListingFK] Current Listings count:', currentListings.length);

    // Step 3: Append new listing if not already present
    if (currentListings.includes(listing_id)) {
        console.log('[propagateListingFK] Listing already in array, skipping update');
        return {
            success: true,
            host_updated: false,
            host_bubble_id: hostUser.bubble_id,
            listings_count: currentListings.length
        };
    }

    currentListings.push(listing_id);
    console.log('[propagateListingFK] Adding listing to array, new count:', currentListings.length);

    // Step 4: Update user.Listings in Supabase
    const { error: supabaseUpdateError } = await supabase
        .from('user')
        .update({ Listings: currentListings })
        .eq('_id', user_id);

    if (supabaseUpdateError) {
        console.error('[propagateListingFK] Failed to update Supabase user.Listings:', supabaseUpdateError);
        return {
            success: false,
            host_updated: false,
            error: `Failed to update user.Listings: ${supabaseUpdateError.message}`
        };
    }

    console.log('[propagateListingFK] ✅ Supabase user.Listings updated');

    // Step 5: Optionally sync to Bubble (if user has bubble_id)
    if (hostUser.bubble_id && listing_bubble_id) {
        try {
            // Fetch current listings from Bubble user
            const bubbleUser = await getRecord(bubbleConfig, 'user', hostUser.bubble_id);
            let bubbleListings: string[] = (bubbleUser?.Listings as string[]) || [];

            if (!bubbleListings.includes(listing_bubble_id)) {
                bubbleListings.push(listing_bubble_id);
                await updateRecord(
                    bubbleConfig,
                    'user',
                    hostUser.bubble_id,
                    { Listings: bubbleListings }
                );
                console.log('[propagateListingFK] ✅ Bubble user.Listings updated');
            } else {
                console.log('[propagateListingFK] Listing already in Bubble array');
            }
        } catch (bubbleError) {
            // Non-blocking - Supabase is the source of truth
            console.warn('[propagateListingFK] Failed to sync to Bubble (non-blocking):', bubbleError);
        }
    } else {
        console.log('[propagateListingFK] Skipping Bubble sync - no bubble_id');
    }

    console.log('[propagateListingFK] ========== FK PROPAGATION SUCCESS ==========');
    return {
        success: true,
        host_updated: true,
        host_bubble_id: hostUser.bubble_id,
        listings_count: currentListings.length
    };
}
