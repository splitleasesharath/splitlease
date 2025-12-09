/**
 * Propagate Listing FK to account_host in Bubble
 *
 * After a listing is created in Bubble, this handler updates the host's
 * Listings array in account_host to maintain the FK relationship.
 *
 * Flow:
 * 1. Find host's account_host record in Supabase (by User ID)
 * 2. Get host's bubble_id from account_host
 * 3. Fetch current Listings array from Bubble
 * 4. Append new listing's bubble_id to array
 * 5. PATCH account_host in Bubble
 *
 * NO FALLBACK PRINCIPLE:
 * - If host not found, skip gracefully (log warning)
 * - If host has no bubble_id, skip (host not synced to Bubble yet)
 * - If Bubble update fails, log error but don't fail the main sync
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleDataApiConfig, getRecord, updateRecord } from '../lib/bubbleDataApi.ts';

export interface PropagateListingFKPayload {
    listing_id: string;         // Supabase _id of the listing
    listing_bubble_id: string;  // Bubble-assigned ID of the listing
    user_id: string;            // Host's user _id (to find account_host)
}

export interface PropagateListingFKResult {
    success: boolean;
    host_updated: boolean;
    host_bubble_id?: string;
    listings_count?: number;
    error?: string;
}

/**
 * Propagate listing FK to account_host in Bubble
 *
 * This ensures the host's Listings array in Bubble contains the new listing's bubble_id.
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

    // Step 1: Find host's account_host record in Supabase
    const { data: hostAccount, error: hostError } = await supabase
        .from('account_host')
        .select('_id, bubble_id, Listings')
        .eq('User', user_id)
        .single();

    if (hostError || !hostAccount) {
        console.warn('[propagateListingFK] No account_host found for user:', user_id);
        console.warn('[propagateListingFK] Error:', hostError?.message);
        return {
            success: true,
            host_updated: false,
            error: `No account_host found for user: ${user_id}`
        };
    }

    console.log('[propagateListingFK] Found host account _id:', hostAccount._id);

    // Step 2: Check if host has bubble_id
    if (!hostAccount.bubble_id) {
        console.warn('[propagateListingFK] Host account has no bubble_id, skipping FK propagation');
        console.warn('[propagateListingFK] Host may not be synced to Bubble yet');
        return {
            success: true,
            host_updated: false,
            error: 'Host account has no bubble_id - not synced to Bubble yet'
        };
    }

    console.log('[propagateListingFK] Host bubble_id:', hostAccount.bubble_id);

    // Step 3: Fetch current Listings array from Bubble
    let currentListings: string[] = [];
    try {
        const hostBubbleData = await getRecord(bubbleConfig, 'account_host', hostAccount.bubble_id);
        currentListings = (hostBubbleData?.Listings as string[]) || [];
        console.log('[propagateListingFK] Current Bubble Listings count:', currentListings.length);
    } catch (fetchError) {
        console.warn('[propagateListingFK] Failed to fetch host from Bubble, using empty array');
        console.warn('[propagateListingFK] Fetch error:', fetchError);
        // Continue with empty array - we'll add the new listing
    }

    // Step 4: Append new listing's bubble_id if not already present
    if (currentListings.includes(listing_bubble_id)) {
        console.log('[propagateListingFK] Listing already in array, skipping update');
        return {
            success: true,
            host_updated: false,
            host_bubble_id: hostAccount.bubble_id,
            listings_count: currentListings.length
        };
    }

    currentListings.push(listing_bubble_id);
    console.log('[propagateListingFK] Adding listing to array, new count:', currentListings.length);

    // Step 5: PATCH account_host in Bubble
    try {
        await updateRecord(
            bubbleConfig,
            'account_host',
            hostAccount.bubble_id,
            { Listings: currentListings }
        );
        console.log('[propagateListingFK] Host Listings updated in Bubble');

        // Step 6: Also update Supabase account_host.Listings for consistency
        const { error: supabaseUpdateError } = await supabase
            .from('account_host')
            .update({ Listings: currentListings })
            .eq('_id', hostAccount._id);

        if (supabaseUpdateError) {
            console.warn('[propagateListingFK] Failed to update Supabase account_host:', supabaseUpdateError);
            // Don't fail - Bubble is the source of truth for this operation
        } else {
            console.log('[propagateListingFK] Supabase account_host.Listings updated');
        }

        console.log('[propagateListingFK] ========== FK PROPAGATION SUCCESS ==========');
        return {
            success: true,
            host_updated: true,
            host_bubble_id: hostAccount.bubble_id,
            listings_count: currentListings.length
        };

    } catch (updateError) {
        console.error('[propagateListingFK] ========== FK PROPAGATION FAILED ==========');
        console.error('[propagateListingFK] Failed to update host Listings:', updateError);
        return {
            success: false,
            host_updated: false,
            host_bubble_id: hostAccount.bubble_id,
            error: `Failed to update host Listings in Bubble: ${updateError.message}`
        };
    }
}
