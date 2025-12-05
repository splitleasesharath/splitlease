/**
 * Photo Upload Utility
 * Handles uploading photos to Supabase Storage
 *
 * Photos are uploaded to the 'listing-photos' bucket with the path:
 * listings/{listingId}/{photoId}.{extension}
 *
 * Returns permanent public URLs that can be stored in the database.
 */

import { supabase } from './supabase.js';

const BUCKET_NAME = 'listing-photos';

/**
 * Convert a data URL to a Blob
 * @param {string} dataUrl - The data URL (e.g., "data:image/jpeg;base64,...")
 * @returns {Blob} The converted Blob
 */
function dataUrlToBlob(dataUrl) {
  const [header, base64Data] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  const byteCharacters = atob(base64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: mimeType });
}

/**
 * Get file extension from MIME type
 * @param {string} mimeType - MIME type (e.g., "image/jpeg")
 * @returns {string} File extension (e.g., "jpg")
 */
function getExtensionFromMime(mimeType) {
  const mimeToExt = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif'
  };
  return mimeToExt[mimeType] || 'jpg';
}

/**
 * Get MIME type from data URL
 * @param {string} dataUrl - The data URL
 * @returns {string} MIME type
 */
function getMimeFromDataUrl(dataUrl) {
  const match = dataUrl.match(/data:([^;]+)/);
  return match ? match[1] : 'image/jpeg';
}

/**
 * Upload a single photo to Supabase Storage
 * @param {object} photo - Photo object with url (data URL) or file (File object)
 * @param {string} listingId - The listing ID for organizing photos
 * @param {number} index - Photo index for naming
 * @returns {Promise<object>} Object with storage path and public URL
 */
export async function uploadPhoto(photo, listingId, index) {
  console.log(`[PhotoUpload] Uploading photo ${index + 1} for listing ${listingId}`);

  let blob;
  let extension;

  // Handle File object (preferred) or data URL
  if (photo.file instanceof File) {
    blob = photo.file;
    extension = photo.file.name.split('.').pop().toLowerCase() || 'jpg';
  } else if (photo.url && photo.url.startsWith('data:')) {
    // Convert data URL to blob
    const mimeType = getMimeFromDataUrl(photo.url);
    blob = dataUrlToBlob(photo.url);
    extension = getExtensionFromMime(mimeType);
  } else if (photo.url && (photo.url.startsWith('http://') || photo.url.startsWith('https://'))) {
    // Already a URL, no upload needed
    console.log(`[PhotoUpload] Photo ${index + 1} already has a URL, skipping upload`);
    return {
      url: photo.url,
      path: null,
      isExisting: true
    };
  } else {
    throw new Error(`Invalid photo format for photo ${index + 1}`);
  }

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `${index}_${timestamp}.${extension}`;
  const storagePath = `listings/${listingId}/${filename}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: blob.type || `image/${extension}`
    });

  if (error) {
    console.error(`[PhotoUpload] Error uploading photo ${index + 1}:`, error);
    throw new Error(`Failed to upload photo ${index + 1}: ${error.message}`);
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  console.log(`[PhotoUpload] Successfully uploaded photo ${index + 1}: ${urlData.publicUrl}`);

  return {
    url: urlData.publicUrl,
    path: storagePath,
    isExisting: false
  };
}

/**
 * Upload multiple photos to Supabase Storage
 * @param {Array<object>} photos - Array of photo objects from the form
 * @param {string} listingId - The listing ID
 * @returns {Promise<Array<object>>} Array of photo objects with permanent URLs
 */
export async function uploadPhotos(photos, listingId) {
  if (!photos || photos.length === 0) {
    console.log('[PhotoUpload] No photos to upload');
    return [];
  }

  console.log(`[PhotoUpload] Starting upload of ${photos.length} photos for listing ${listingId}`);

  const uploadedPhotos = [];

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];

    try {
      const result = await uploadPhoto(photo, listingId, i);

      uploadedPhotos.push({
        id: photo.id || `photo_${i}_${Date.now()}`,
        url: result.url,
        Photo: result.url, // For compatibility with listing display format
        'Photo (thumbnail)': result.url, // Use same URL for thumbnail
        storagePath: result.path,
        caption: photo.caption || '',
        displayOrder: photo.displayOrder ?? i,
        SortOrder: photo.displayOrder ?? i,
        toggleMainPhoto: i === 0
      });
    } catch (error) {
      console.error(`[PhotoUpload] Failed to upload photo ${i + 1}:`, error);
      // Continue with other photos, don't fail the entire upload
      uploadedPhotos.push({
        id: photo.id || `photo_${i}_${Date.now()}`,
        url: photo.url, // Keep data URL as fallback
        Photo: photo.url,
        'Photo (thumbnail)': photo.url,
        caption: photo.caption || '',
        displayOrder: photo.displayOrder ?? i,
        SortOrder: photo.displayOrder ?? i,
        toggleMainPhoto: i === 0,
        uploadError: error.message
      });
    }
  }

  console.log(`[PhotoUpload] Completed uploading ${uploadedPhotos.length} photos`);
  return uploadedPhotos;
}

/**
 * Delete a photo from Supabase Storage
 * @param {string} storagePath - The storage path of the photo
 * @returns {Promise<boolean>} True if deleted, false if failed
 */
export async function deletePhoto(storagePath) {
  if (!storagePath) {
    return true; // Nothing to delete
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    console.error('[PhotoUpload] Error deleting photo:', error);
    return false;
  }

  return true;
}

/**
 * Check if a URL is a Supabase Storage URL
 * @param {string} url - The URL to check
 * @returns {boolean} True if it's a Supabase Storage URL
 */
export function isStorageUrl(url) {
  if (!url) return false;
  return url.includes('/storage/v1/object/public/') ||
         url.includes('supabase.co/storage/');
}

/**
 * Check if a URL is a data URL (base64)
 * @param {string} url - The URL to check
 * @returns {boolean} True if it's a data URL
 */
export function isDataUrl(url) {
  if (!url) return false;
  return url.startsWith('data:');
}
