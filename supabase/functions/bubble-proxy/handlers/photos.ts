/**
 * Photo Upload Handler
 * Priority: HIGH
 *
 * Handles listing photo uploads via Bubble workflow
 * The Bubble workflow `listing_photos_section_in_code`:
 * - Receives listing_id and photos (list of images in Bubble file format)
 * - Creates Listing-Photo records for each image
 * - Attaches them to the Listing
 * - Sets sort_order based on array position (first = cover photo)
 *
 * Bubble API File Format:
 * When a parameter is a file/image, you can provide raw data as a JSON object:
 * { "filename": "photo.jpg", "contents": "base64...", "private": false }
 * Reference: https://manual.bubble.io/core-resources/api/the-bubble-api
 */

import { BubbleSyncService } from '../../_shared/bubbleSync.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { User } from '../../_shared/types.ts';

/**
 * Convert a base64 data URL to Bubble's file upload format
 * @param dataUrl - Base64 data URL (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
 * @param index - Photo index for filename
 * @returns Bubble file format object
 */
function convertTooBubbleFileFormat(dataUrl: string, index: number): {
  filename: string;
  contents: string;
  private: boolean;
} {
  // Extract mime type and base64 content from data URL
  // Format: data:image/jpeg;base64,/9j/4AAQ...
  const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);

  if (!matches) {
    // If not a data URL, assume it's already base64 or a URL
    // Try to use it as-is
    console.warn(`[Photo Handler] Photo ${index} is not a standard data URL, using as-is`);
    return {
      filename: `listing-photo-${index + 1}.jpg`,
      contents: dataUrl,
      private: false,
    };
  }

  const [, extension, base64Content] = matches;

  // Map common extensions
  const extMap: Record<string, string> = {
    'jpeg': 'jpg',
    'png': 'png',
    'gif': 'gif',
    'webp': 'webp',
    'heic': 'heic',
  };

  const fileExt = extMap[extension.toLowerCase()] || extension;

  return {
    filename: `listing-photo-${index + 1}.${fileExt}`,
    contents: base64Content,
    private: false,
  };
}

/**
 * Handle photo upload
 * Converts base64 data URLs to Bubble file format and sends to workflow
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
    // Convert each base64 data URL to Bubble's file format
    console.log('[Photo Handler] Converting photos to Bubble file format...');

    const bubblePhotos = photos.map((photoDataUrl: string, index: number) => {
      const bubbleFile = convertTooBubbleFileFormat(photoDataUrl, index);
      console.log(`[Photo Handler] Photo ${index + 1}: ${bubbleFile.filename} (base64 length: ${bubbleFile.contents.length})`);
      return bubbleFile;
    });

    // Log the first few characters of each photo to verify format
    console.log('[Photo Handler] Photo format verification:');
    bubblePhotos.forEach((photo, index) => {
      console.log(`[Photo Handler]   Photo ${index + 1}: filename=${photo.filename}, contents starts with: ${photo.contents.substring(0, 50)}...`);
    });

    // Send all photos to Bubble in one workflow call
    // Bubble workflow creates Listing-Photo records and attaches to Listing
    // Sort order is determined by array position (index 0 = cover photo)
    console.log('[Photo Handler] Calling Bubble workflow with formatted photos...');
    console.log('[Photo Handler] Workflow: listing_photos_section_in_code');
    console.log('[Photo Handler] Params: Listing_id =', listing_id);
    console.log('[Photo Handler] Params: Photos count =', bubblePhotos.length);

    // NOTE: Bubble workflow parameters are case-sensitive!
    // The workflow expects: Listing_id (text) and Photos (list of files)
    const result = await syncService.triggerWorkflowOnly(
      'listing_photos_section_in_code',
      {
        Listing_id: listing_id,
        Photos: bubblePhotos,
      }
    );

    console.log('[Photo Handler] ✅ Photos uploaded to Bubble');
    console.log('[Photo Handler] Workflow result:', JSON.stringify(result, null, 2));
    console.log('[Photo Handler] ========== SUCCESS ==========');

    return {
      listing_id,
      count: photos.length,
      message: 'Photos uploaded and attached to listing successfully',
    };
  } catch (error: any) {
    console.error('[Photo Handler] ========== ERROR ==========');
    console.error('[Photo Handler] Failed to upload photos:', error.message);
    console.error('[Photo Handler] Error name:', error.name);
    console.error('[Photo Handler] Error statusCode:', error.statusCode);
    console.error('[Photo Handler] Bubble response:', error.bubbleResponse);
    console.error('[Photo Handler] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    throw error;
  }
}
