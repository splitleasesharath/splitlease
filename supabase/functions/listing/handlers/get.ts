/**
 * Get Listing Handler
 * Priority: HIGH
 *
 * Fetches listing data from Bubble Data API
 * Used by self-listing page to preload listing name and other data
 */

import { BubbleSyncService } from '../../_shared/bubbleSync.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

interface GetListingPayload {
  listing_id: string;
}

/**
 * Handle fetching a listing by ID
 * Fetches from Bubble Data API and returns the data
 */
export async function handleGet(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  console.log('[listing:get] ========== GET LISTING ==========');
  console.log('[listing:get] Payload:', JSON.stringify(payload, null, 2));

  // Validate required fields
  validateRequiredFields(payload, ['listing_id']);

  const { listing_id } = payload as GetListingPayload;

  // Initialize BubbleSyncService
  const bubbleBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
  const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!bubbleBaseUrl || !bubbleApiKey || !supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables');
  }

  const syncService = new BubbleSyncService(
    bubbleBaseUrl,
    bubbleApiKey,
    supabaseUrl,
    supabaseServiceKey
  );

  console.log('[listing:get] Fetching listing ID:', listing_id);

  try {
    // Fetch listing from Bubble Data API
    // Note: Bubble type is 'Listing' (not 'zat_listings')
    const listingData = await syncService.fetchBubbleObject('Listing', listing_id);

    console.log('[listing:get] ✅ Listing fetched from Bubble');
    console.log('[listing:get] Listing Name:', listingData?.Name);
    console.log('[listing:get] ========== SUCCESS ==========');

    return listingData;
  } catch (error) {
    console.error('[listing:get] ========== ERROR ==========');
    console.error('[listing:get] Failed to fetch listing:', error);
    throw error;
  }
}
