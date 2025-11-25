/**
 * Photo Upload Handler
 * Priority: HIGH
 *
 * Handles listing photo uploads with atomic sync
 * Note: This handler expects base64-encoded photo data in the payload
 * The Bubble workflow handles the actual file upload and storage
 */

import { BubbleSyncService } from '../../_shared/bubbleSync.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { User } from '../../_shared/types.ts';

/**
 * Handle photo upload
 * NO FALLBACK: Atomic operation - all steps succeed or all fail
 *
 * Note: This is a simplified version. Full multipart/form-data handling
 * would require additional Edge Function configuration.
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
    // Atomic create-and-sync operation for each photo
    // Note: This uploads photos sequentially to ensure data integrity
    const uploadedPhotos = [];

    for (let i = 0; i < photos.length; i++) {
      console.log(`[Photo Handler] Uploading photo ${i + 1}/${photos.length}`);

      const photoData = await syncService.createAndSync(
        'listing_photos_section_in_code',  // Bubble workflow name
        {
          Listing_id: listing_id,
          Photo: photos[i],  // Base64-encoded photo or photo URL
        },
        'zat_listing_photos',  // Bubble object type
        'zat_listing_photos'   // Supabase table
      );

      uploadedPhotos.push(photoData);
    }

    console.log('[Photo Handler] ✅ All photos uploaded and synced');
    console.log('[Photo Handler] ========== SUCCESS ==========');

    return {
      listing_id,
      photos: uploadedPhotos,
      count: uploadedPhotos.length,
    };
  } catch (error) {
    console.error('[Photo Handler] ========== ERROR ==========');
    console.error('[Photo Handler] Failed to upload photos:', error);
    throw error;
  }
}
