/**
 * Listing Creation Handler
 * Priority: CRITICAL
 *
 * Handles listing creation with sync to Supabase:
 * 1. Create listing in Bubble (source of truth) - REQUIRED
 * 2. Fetch full listing data from Bubble - REQUIRED (for listing name)
 * 3. Sync to Supabase (replica) - BEST EFFORT (log errors but don't fail)
 * 4. Return listing data to client
 */

import { BubbleSyncService } from '../../_shared/bubbleSync.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

interface CreateListingPayload {
  listing_name: string;
  user_email?: string;
}

interface CreateListingResult {
  _id: string;
  listing_id: string;
  Name: string;
  [key: string]: unknown;
}

/**
 * Handle listing creation
 * Steps 1-2 must succeed, Step 3 is best-effort
 */
export async function handleCreate(
  payload: Record<string, unknown>
): Promise<CreateListingResult> {
  console.log('[listing:create] ========== CREATE LISTING ==========');
  console.log('[listing:create] Payload:', JSON.stringify(payload, null, 2));

  // Validate required fields
  validateRequiredFields(payload, ['listing_name']);

  const { listing_name, user_email } = payload as CreateListingPayload;

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

  // Build parameters for Bubble workflow
  const params: Record<string, unknown> = {
    listing_name: listing_name.trim(),
  };

  // Include user_email if provided (for logged-in users)
  if (user_email) {
    params.user_email = user_email;
  }

  console.log('[listing:create] Creating listing with name:', listing_name);
  console.log('[listing:create] User email:', user_email || 'Not provided (logged out)');

  try {
    // Step 1: Create in Bubble (REQUIRED)
    console.log('[listing:create] Step 1/3: Creating in Bubble...');
    const listingId = await syncService.triggerWorkflow(
      'listing_creation_in_code',  // Bubble workflow name
      params                       // Workflow parameters
    );
    console.log('[listing:create] ✅ Step 1 complete - Listing ID:', listingId);

    // Step 2: Fetch full listing data from Bubble (REQUIRED for Name)
    console.log('[listing:create] Step 2/3: Fetching listing data from Bubble...');
    let listingData: Record<string, unknown> | null = null;
    try {
      listingData = await syncService.fetchBubbleObject('Listing', listingId);
      console.log('[listing:create] ✅ Step 2 complete - Listing Name:', listingData?.Name);
    } catch (fetchError) {
      console.error('[listing:create] ⚠️ Step 2 failed - Could not fetch listing data:', fetchError);
      // Return minimal data if fetch fails
      return { _id: listingId, listing_id: listingId, Name: listing_name };
    }

    // Step 3: Sync to Supabase (BEST EFFORT - don't fail if this fails)
    console.log('[listing:create] Step 3/3: Syncing to Supabase...');
    try {
      // Ensure _id is set for upsert
      const dataToSync = { ...listingData, _id: listingId };
      await syncService.syncToSupabase('listing', dataToSync);
      console.log('[listing:create] ✅ Step 3 complete - Synced to Supabase');
    } catch (syncError) {
      // Log but don't fail - Supabase sync is best-effort
      console.error('[listing:create] ⚠️ Step 3 failed - Supabase sync error:', syncError);
      console.log('[listing:create] Continuing without Supabase sync...');
    }

    console.log('[listing:create] ========== SUCCESS ==========');

    // Return the listing data with ID
    return {
      _id: listingId,
      listing_id: listingId,
      Name: (listingData?.Name as string) || listing_name,
      ...listingData
    };
  } catch (error) {
    console.error('[listing:create] ========== ERROR ==========');
    console.error('[listing:create] Failed to create listing:', error);
    throw error;
  }
}
