/**
 * Get Listing Handler
 * Priority: HIGH
 *
 * Fetches listing data from Bubble Data API
 * Used by self-listing page to preload listing name and other data
 */

import { BubbleSyncService } from '../../_shared/bubbleSync.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { User } from '../../_shared/types.ts';

/**
 * Handle fetching a listing by ID
 * Fetches from Bubble Data API and returns the data
 */
export async function handleGetListing(
  syncService: BubbleSyncService,
  payload: Record<string, any>,
  user: User
): Promise<any> {
  console.log('[Get Listing Handler] ========== GET LISTING ==========');
  console.log('[Get Listing Handler] User:', user.email);
  console.log('[Get Listing Handler] Payload:', JSON.stringify(payload, null, 2));

  // Validate required fields
  validateRequiredFields(payload, ['listing_id']);

  const { listing_id } = payload;

  console.log('[Get Listing Handler] Fetching listing ID:', listing_id);

  try {
    // Fetch listing from Bubble Data API
    // Note: Bubble type is 'Listing' (not 'zat_listings')
    const listingData = await syncService.fetchBubbleObject('Listing', listing_id);

    console.log('[Get Listing Handler] ✅ Listing fetched from Bubble');
    console.log('[Get Listing Handler] Listing Name:', listingData?.Name);
    console.log('[Get Listing Handler] ========== SUCCESS ==========');

    return listingData;
  } catch (error) {
    console.error('[Get Listing Handler] ========== ERROR ==========');
    console.error('[Get Listing Handler] Failed to fetch listing:', error);
    throw error;
  }
}
