/**
 * Listing Creation Handler
 * Priority: CRITICAL
 *
 * Handles atomic listing creation:
 * 1. Create listing in Bubble (source of truth)
 * 2. Fetch full listing data from Bubble
 * 3. Sync to Supabase (replica)
 * 4. Return synced listing data to client
 */

import { BubbleSyncService } from '../../_shared/bubbleSync.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { User } from '../../_shared/types.ts';

/**
 * Handle listing creation
 * NO FALLBACK: Atomic operation - all steps succeed or all fail
 */
export async function handleListingCreate(
  syncService: BubbleSyncService,
  payload: Record<string, any>,
  user: User
): Promise<any> {
  console.log('[Listing Handler] ========== CREATE LISTING ==========');
  console.log('[Listing Handler] User:', user.email);
  console.log('[Listing Handler] Payload:', JSON.stringify(payload, null, 2));

  // Validate required fields
  validateRequiredFields(payload, ['listing_name']);

  const { listing_name, user_email } = payload;

  // Build parameters for Bubble workflow
  const params: Record<string, any> = {
    listing_name: listing_name.trim(),
  };

  // Include user_email if provided (for logged-in users)
  if (user_email) {
    params.user_email = user_email;
  }

  console.log('[Listing Handler] Creating listing with name:', listing_name);
  console.log('[Listing Handler] User email:', user_email || 'Not provided (logged out)');

  try {
    // Atomic create-and-sync operation
    const syncedListing = await syncService.createAndSync(
      'listing_creation_in_code',  // Bubble workflow name
      params,                      // Workflow parameters
      'zat_listings',              // Bubble object type
      'zat_listings'               // Supabase table
    );

    console.log('[Listing Handler] ✅ Listing created and synced');
    console.log('[Listing Handler] Listing ID:', syncedListing._id);
    console.log('[Listing Handler] ========== SUCCESS ==========');

    return syncedListing;
  } catch (error) {
    console.error('[Listing Handler] ========== ERROR ==========');
    console.error('[Listing Handler] Failed to create listing:', error);
    throw error;
  }
}
