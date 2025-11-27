/**
 * Photo Upload Handler
 * Priority: HIGH
 *
 * Handles listing photo uploads via Bubble workflow
 * The Bubble workflow `listing_photos_section_in_code`:
 * - Receives listing_id and photos (list of images)
 * - Creates Listing-Photo records for each image
 * - Attaches them to the Listing
 * - Sets sort_order based on array position (first = cover photo)
 */

import { BubbleSyncService } from '../../_shared/bubbleSync.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { User } from '../../_shared/types.ts';

/**
 * Handle photo upload
 * Sends all photos to Bubble in a single workflow call
 * Bubble handles creating Listing-Photo records and attaching to Listing
 */
export async function handlePhotoUpload(
  syncService: BubbleSyncService,
  payload: Record<string, any>,
  user: User
): Promise<any> {
  console.log('[Photo Handler] ========== UPLOAD PHOTOS ==========');
  console.log('[Photo Handler] User:', user.email);

  // Validate required fields
  validateRequiredFields(payload, ['listing_id', 'photos']);

  const { listing_id, photos } = payload;

  if (!Array.isArray(photos) || photos.length === 0) {
    throw new Error('Photos must be a non-empty array');
  }

  console.log('[Photo Handler] Listing ID:', listing_id);
  console.log('[Photo Handler] Number of photos:', photos.length);

  try {
    // Send all photos to Bubble in one workflow call
    // Bubble workflow creates Listing-Photo records and attaches to Listing
    // Sort order is determined by array position (index 0 = cover photo)
    console.log('[Photo Handler] Calling Bubble workflow with all photos...');

    const result = await syncService.triggerWorkflowOnly(
      'listing_photos_section_in_code',
      {
        listing_id: listing_id,
        photos: photos,  // Array of base64-encoded images
      }
    );

    console.log('[Photo Handler] ✅ Photos uploaded to Bubble');
    console.log('[Photo Handler] Workflow result:', result);
    console.log('[Photo Handler] ========== SUCCESS ==========');

    return {
      listing_id,
      count: photos.length,
      message: 'Photos uploaded and attached to listing successfully',
    };
  } catch (error) {
    console.error('[Photo Handler] ========== ERROR ==========');
    console.error('[Photo Handler] Failed to upload photos:', error);
    throw error;
  }
}
