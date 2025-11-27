/**
 * Photo Upload Handler
 * Priority: HIGH
 *
 * Handles listing photo uploads via Supabase Storage + Bubble workflow
 *
 * Flow:
 * 1. Upload photos to Supabase Storage (listing-photos bucket)
 * 2. Get public URLs
 * 3. Send URLs to Bubble workflow (listing_photos_section_in_code)
 * 4. Bubble creates Listing-Photo records and attaches to Listing
 *
 * This approach is more reliable than sending base64 to Bubble directly.
 */

import { BubbleSyncService } from '../../_shared/bubbleSync.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { User } from '../../_shared/types.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Convert a base64 data URL to a Uint8Array for upload
 * @param dataUrl - Base64 data URL (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
 * @returns Object with binary data and mime type
 */
function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mimeType: string; extension: string } {
  // Extract mime type and base64 content from data URL
  // Format: data:image/jpeg;base64,/9j/4AAQ...
  const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);

  if (!matches) {
    console.warn('[Photo Handler] Not a standard data URL, treating as raw base64');
    // Assume JPEG if no mime type
    const bytes = Uint8Array.from(atob(dataUrl), c => c.charCodeAt(0));
    return { bytes, mimeType: 'image/jpeg', extension: 'jpg' };
  }

  const [, mimeType, base64Content] = matches;
  const bytes = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));

  // Map mime type to extension
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };

  const extension = extMap[mimeType] || 'jpg';

  return { bytes, mimeType, extension };
}

/**
 * Handle photo upload
 * 1. Uploads to Supabase Storage
 * 2. Gets public URLs
 * 3. Sends URLs to Bubble workflow
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

  // Get Supabase credentials
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  // Create Supabase client with service role (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Step 1: Upload each photo to Supabase Storage
    console.log('[Photo Handler] Step 1: Uploading photos to Supabase Storage...');

    const uploadedUrls: string[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < photos.length; i++) {
      const photoDataUrl = photos[i];
      const { bytes, mimeType, extension } = dataUrlToBytes(photoDataUrl);

      // Create unique file path: listing_id/timestamp_index.ext
      const filePath = `${listing_id}/${timestamp}_${i + 1}.${extension}`;

      console.log(`[Photo Handler] Uploading photo ${i + 1}: ${filePath} (${bytes.length} bytes, ${mimeType})`);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('listing-photos')
        .upload(filePath, bytes, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error(`[Photo Handler] Failed to upload photo ${i + 1}:`, uploadError);
        throw new Error(`Failed to upload photo ${i + 1}: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('listing-photos')
        .getPublicUrl(filePath);

      console.log(`[Photo Handler] Photo ${i + 1} uploaded: ${publicUrl}`);
      uploadedUrls.push(publicUrl);
    }

    console.log('[Photo Handler] All photos uploaded to Supabase Storage');
    console.log('[Photo Handler] URLs:', uploadedUrls);

    // Step 2: Send URLs to Bubble workflow
    console.log('[Photo Handler] Step 2: Sending URLs to Bubble workflow...');
    console.log('[Photo Handler] Workflow: listing_photos_section_in_code');
    console.log('[Photo Handler] Params: listing_id =', listing_id);
    console.log('[Photo Handler] Params: photos (URLs) =', uploadedUrls);

    // Bubble workflow parameters (lowercase as defined in Bubble):
    // - listing_id: text
    // - photos: list of files (can accept URLs)
    const result = await syncService.triggerWorkflowOnly(
      'listing_photos_section_in_code',
      {
        listing_id: listing_id,
        photos: uploadedUrls,
      }
    );

    console.log('[Photo Handler] ✅ Photos uploaded and sent to Bubble');
    console.log('[Photo Handler] Workflow result:', JSON.stringify(result, null, 2));
    console.log('[Photo Handler] ========== SUCCESS ==========');

    return {
      listing_id,
      count: photos.length,
      urls: uploadedUrls,
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
