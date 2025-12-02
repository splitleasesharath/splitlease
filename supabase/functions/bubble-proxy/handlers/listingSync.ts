/**
 * Listing Sync Handler - Push listing_trial to Bubble
 * Priority: CRITICAL
 *
 * Handles syncing a listing from Supabase listing_trial to Bubble:
 * 1. Receive listing data from listing_trial
 * 2. Create listing in Bubble via workflow
 * 3. Return the Bubble _id to update listing_trial
 *
 * This is the INVERSE of the original flow:
 * - Old: Bubble (create) → Supabase (sync)
 * - New: Supabase (create) → Bubble (sync)
 */

import { BubbleSyncService } from '../../_shared/bubbleSync.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { User } from '../../_shared/types.ts';
import { BubbleApiError } from '../../_shared/errors.ts';

/**
 * Handle listing sync to Bubble
 * Creates a listing in Bubble and returns the Bubble _id
 *
 * NO FALLBACK: If Bubble creation fails, we fail.
 * The listing_trial entry remains with empty _id.
 */
export async function handleListingSyncToBubble(
  syncService: BubbleSyncService,
  payload: Record<string, unknown>,
  user: User
): Promise<{ bubble_id: string }> {
  console.log('[ListingSync Handler] ========== SYNC TO BUBBLE ==========');
  console.log('[ListingSync Handler] User:', user.email || 'guest');
  console.log('[ListingSync Handler] Payload keys:', Object.keys(payload));

  // Validate required fields
  validateRequiredFields(payload, ['listing_name', 'supabase_id']);

  const {
    listing_name,
    supabase_id,
    user_email,
    // Additional listing data to send to Bubble
    type_of_space,
    bedrooms,
    beds,
    bathrooms,
    city,
    state,
    zip_code,
    rental_type,
    description,
  } = payload as {
    listing_name: string;
    supabase_id: string;
    user_email?: string;
    type_of_space?: string;
    bedrooms?: number;
    beds?: number;
    bathrooms?: number;
    city?: string;
    state?: string;
    zip_code?: string;
    rental_type?: string;
    description?: string;
  };

  console.log('[ListingSync Handler] Creating listing in Bubble with name:', listing_name);
  console.log('[ListingSync Handler] Supabase ID (for reference):', supabase_id);
  console.log('[ListingSync Handler] User email:', user_email || 'Not provided');

  // Build parameters for Bubble workflow
  // The workflow should accept these params and create the listing
  const bubbleParams: Record<string, unknown> = {
    listing_name: listing_name.trim(),
  };

  // Add optional fields if provided
  if (user_email) bubbleParams.user_email = user_email;
  if (type_of_space) bubbleParams.type_of_space = type_of_space;
  if (bedrooms !== undefined) bubbleParams.bedrooms = bedrooms;
  if (beds !== undefined) bubbleParams.beds = beds;
  if (bathrooms !== undefined) bubbleParams.bathrooms = bathrooms;
  if (city) bubbleParams.city = city;
  if (state) bubbleParams.state = state;
  if (zip_code) bubbleParams.zip_code = zip_code;
  if (rental_type) bubbleParams.rental_type = rental_type;
  if (description) bubbleParams.description = description;

  console.log('[ListingSync Handler] Bubble params:', JSON.stringify(bubbleParams, null, 2));

  try {
    // Trigger Bubble workflow to create listing
    // This uses the same workflow as before: listing_creation_in_code
    // The workflow returns the listing_id
    const bubbleId = await syncService.triggerWorkflow(
      'listing_creation_in_code',
      bubbleParams
    );

    console.log('[ListingSync Handler] ✅ Listing created in Bubble');
    console.log('[ListingSync Handler] Bubble ID:', bubbleId);
    console.log('[ListingSync Handler] ========== SUCCESS ==========');

    return { bubble_id: bubbleId };
  } catch (error) {
    console.error('[ListingSync Handler] ========== ERROR ==========');
    console.error('[ListingSync Handler] Failed to sync to Bubble:', error);

    // Re-throw with context
    if (error instanceof BubbleApiError) {
      throw error;
    }

    throw new BubbleApiError(
      `Failed to create listing in Bubble: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      error
    );
  }
}
