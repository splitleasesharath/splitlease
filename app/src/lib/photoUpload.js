/**
 * Photo Upload Utility
 * Handles uploading photos to Supabase Storage
 *
 * Photos are uploaded to the 'listing-photos' bucket with the path:
 * listings/{listingId}/{photoId}.{extension}
 *
 * Returns permanent public URLs that can be stored in the database.
 *
 * @module lib/photoUpload
 */

import { supabase } from './supabase.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[PhotoUpload]'

const BUCKET_NAME = 'listing-photos'

const CHUNK_SIZE = 512

const MIME_TO_EXT = Object.freeze({
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif'
})

const DEFAULT_MIME = 'image/jpeg'
const DEFAULT_EXT = 'jpg'

const URL_PREFIXES = Object.freeze({
  DATA: 'data:',
  BLOB: 'blob:',
  HTTP: 'http://',
  HTTPS: 'https://'
})

const STORAGE_INDICATORS = Object.freeze([
  '/storage/v1/object/public/',
  'supabase.co/storage/'
])

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is a non-empty string
 * @pure
 */
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.length > 0

/**
 * Check if URL is a data URL (base64)
 * @pure
 */
const isDataUrlString = (url) =>
  isNonEmptyString(url) && url.startsWith(URL_PREFIXES.DATA)

/**
 * Check if URL is a blob URL
 * @pure
 */
const isBlobUrlString = (url) =>
  isNonEmptyString(url) && url.startsWith(URL_PREFIXES.BLOB)

/**
 * Check if URL is an HTTP/HTTPS URL
 * @pure
 */
const isHttpUrl = (url) =>
  isNonEmptyString(url) && (url.startsWith(URL_PREFIXES.HTTP) || url.startsWith(URL_PREFIXES.HTTPS))

/**
 * Check if photo has a File object
 * @pure
 */
const hasFileObject = (photo) =>
  photo?.file instanceof File

// ─────────────────────────────────────────────────────────────
// Pure Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Extract MIME type from data URL header
 * @pure
 */
const extractMimeFromHeader = (header) => {
  const mimeMatch = header.match(/data:([^;]+)/)
  return mimeMatch ? mimeMatch[1] : DEFAULT_MIME
}

/**
 * Get MIME type from data URL
 * @pure
 * @param {string} dataUrl - The data URL
 * @returns {string} MIME type
 */
const getMimeFromDataUrl = (dataUrl) => {
  const match = dataUrl.match(/data:([^;]+)/)
  return match ? match[1] : DEFAULT_MIME
}

/**
 * Get file extension from MIME type
 * @pure
 * @param {string} mimeType - MIME type (e.g., "image/jpeg")
 * @returns {string} File extension (e.g., "jpg")
 */
const getExtensionFromMime = (mimeType) =>
  MIME_TO_EXT[mimeType] || DEFAULT_EXT

/**
 * Get extension from filename
 * @pure
 */
const getExtensionFromFilename = (filename) =>
  filename.split('.').pop().toLowerCase() || DEFAULT_EXT

/**
 * Build storage path
 * @pure
 */
const buildStoragePath = (listingId, index, extension) => {
  const timestamp = Date.now()
  const filename = `${index}_${timestamp}.${extension}`
  return `listings/${listingId}/${filename}`
}

/**
 * Build uploaded photo result
 * @pure
 */
const buildUploadedPhoto = (photo, index, result) =>
  Object.freeze({
    id: photo.id || `photo_${index}_${Date.now()}`,
    url: result.url,
    Photo: result.url,
    'Photo (thumbnail)': result.url,
    storagePath: result.path,
    caption: photo.caption || '',
    displayOrder: photo.displayOrder ?? index,
    SortOrder: photo.displayOrder ?? index,
    toggleMainPhoto: index === 0
  })

/**
 * Build failed upload photo result
 * @pure
 */
const buildFailedPhoto = (photo, index, errorMessage) =>
  Object.freeze({
    id: photo.id || `photo_${index}_${Date.now()}`,
    url: photo.url,
    Photo: photo.url,
    'Photo (thumbnail)': photo.url,
    caption: photo.caption || '',
    displayOrder: photo.displayOrder ?? index,
    SortOrder: photo.displayOrder ?? index,
    toggleMainPhoto: index === 0,
    uploadError: errorMessage
  })

/**
 * Build existing photo result
 * @pure
 */
const buildExistingPhotoResult = (url, storagePath) =>
  Object.freeze({
    url,
    path: storagePath || null,
    isExisting: true
  })

/**
 * Build success upload result
 * @pure
 */
const buildUploadResult = (url, path) =>
  Object.freeze({
    url,
    path,
    isExisting: false
  })

/**
 * Convert byte characters to Uint8Array chunk
 * @pure
 */
const convertChunkToBytes = (slice) => {
  const byteNumbers = new Array(slice.length)
  for (let i = 0; i < slice.length; i++) {
    byteNumbers[i] = slice.charCodeAt(i)
  }
  return new Uint8Array(byteNumbers)
}

/**
 * Convert a data URL to a Blob
 * @pure
 * @param {string} dataUrl - The data URL (e.g., "data:image/jpeg;base64,...")
 * @returns {Blob} The converted Blob
 */
const dataUrlToBlob = (dataUrl) => {
  const [header, base64Data] = dataUrl.split(',')
  const mimeType = extractMimeFromHeader(header)

  const byteCharacters = atob(base64Data)
  const byteArrays = []

  for (let offset = 0; offset < byteCharacters.length; offset += CHUNK_SIZE) {
    const slice = byteCharacters.slice(offset, offset + CHUNK_SIZE)
    byteArrays.push(convertChunkToBytes(slice))
  }

  return new Blob(byteArrays, { type: mimeType })
}

// ─────────────────────────────────────────────────────────────
// Logging Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Log upload start
 * @effectful
 */
const logUploadStart = (index, listingId) => {
  console.log(`${LOG_PREFIX} Uploading photo ${index + 1} for listing ${listingId}`)
}

/**
 * Log upload success
 * @effectful
 */
const logUploadSuccess = (index, url) => {
  console.log(`${LOG_PREFIX} Successfully uploaded photo ${index + 1}: ${url}`)
}

/**
 * Log upload error
 * @effectful
 */
const logUploadError = (index, error) => {
  console.error(`${LOG_PREFIX} Error uploading photo ${index + 1}:`, error)
}

/**
 * Log batch start
 * @effectful
 */
const logBatchStart = (count, listingId) => {
  console.log(`${LOG_PREFIX} Starting upload of ${count} photos for listing ${listingId}`)
}

/**
 * Log batch complete
 * @effectful
 */
const logBatchComplete = (count) => {
  console.log(`${LOG_PREFIX} Completed uploading ${count} photos`)
}

/**
 * Log skip existing
 * @effectful
 */
const logSkipExisting = (index) => {
  console.log(`${LOG_PREFIX} Photo ${index + 1} already has a URL, skipping upload`)
}

/**
 * Log blob conversion
 * @effectful
 */
const logBlobConversion = (index) => {
  console.log(`${LOG_PREFIX} Converting blob URL to blob for photo ${index + 1}`)
}

/**
 * Log delete error
 * @effectful
 */
const logDeleteError = (error) => {
  console.error(`${LOG_PREFIX} Error deleting photo:`, error)
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Upload a single photo to Supabase Storage
 * @effectful
 * @param {object} photo - Photo object with url (data URL) or file (File object)
 * @param {string} listingId - The listing ID for organizing photos
 * @param {number} index - Photo index for naming
 * @returns {Promise<object>} Object with storage path and public URL
 */
export async function uploadPhoto(photo, listingId, index) {
  logUploadStart(index, listingId)

  let blob
  let extension

  // Handle File object (preferred), data URL, blob URL, or existing URL
  if (hasFileObject(photo)) {
    blob = photo.file
    extension = getExtensionFromFilename(photo.file.name)
  } else if (isDataUrlString(photo.url)) {
    const mimeType = getMimeFromDataUrl(photo.url)
    blob = dataUrlToBlob(photo.url)
    extension = getExtensionFromMime(mimeType)
  } else if (isBlobUrlString(photo.url)) {
    logBlobConversion(index)
    try {
      const response = await fetch(photo.url)
      blob = await response.blob()
      extension = getExtensionFromMime(blob.type)
    } catch (fetchError) {
      logUploadError(index, fetchError)
      throw new Error(`Failed to process photo ${index + 1}: Could not read blob URL`)
    }
  } else if (isHttpUrl(photo.url)) {
    logSkipExisting(index)
    return buildExistingPhotoResult(photo.url, photo.storagePath)
  } else {
    throw new Error(`Invalid photo format for photo ${index + 1}`)
  }

  const storagePath = buildStoragePath(listingId, index, extension)

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: blob.type || `image/${extension}`
    })

  if (error) {
    logUploadError(index, error)
    throw new Error(`Failed to upload photo ${index + 1}: ${error.message}`)
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath)

  logUploadSuccess(index, urlData.publicUrl)

  return buildUploadResult(urlData.publicUrl, storagePath)
}

/**
 * Upload multiple photos to Supabase Storage
 * @effectful
 * @param {Array<object>} photos - Array of photo objects from the form
 * @param {string} listingId - The listing ID
 * @returns {Promise<Array<object>>} Array of photo objects with permanent URLs
 */
export async function uploadPhotos(photos, listingId) {
  if (!photos || photos.length === 0) {
    console.log(`${LOG_PREFIX} No photos to upload`)
    return []
  }

  logBatchStart(photos.length, listingId)

  const uploadedPhotos = []

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]

    try {
      const result = await uploadPhoto(photo, listingId, i)
      uploadedPhotos.push(buildUploadedPhoto(photo, i, result))
    } catch (error) {
      logUploadError(i, error)
      // Continue with other photos, don't fail the entire upload
      uploadedPhotos.push(buildFailedPhoto(photo, i, error.message))
    }
  }

  logBatchComplete(uploadedPhotos.length)
  return uploadedPhotos
}

/**
 * Delete a photo from Supabase Storage
 * @effectful
 * @param {string} storagePath - The storage path of the photo
 * @returns {Promise<boolean>} True if deleted, false if failed
 */
export async function deletePhoto(storagePath) {
  if (!storagePath) {
    return true // Nothing to delete
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath])

  if (error) {
    logDeleteError(error)
    return false
  }

  return true
}

/**
 * Check if a URL is a Supabase Storage URL
 * @pure
 * @param {string} url - The URL to check
 * @returns {boolean} True if it's a Supabase Storage URL
 */
export function isStorageUrl(url) {
  if (!isNonEmptyString(url)) return false
  return STORAGE_INDICATORS.some(indicator => url.includes(indicator))
}

/**
 * Check if a URL is a data URL (base64)
 * @pure
 * @param {string} url - The URL to check
 * @returns {boolean} True if it's a data URL
 */
export function isDataUrl(url) {
  return isDataUrlString(url)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  LOG_PREFIX,
  BUCKET_NAME,
  MIME_TO_EXT,
  URL_PREFIXES,
  STORAGE_INDICATORS
}
