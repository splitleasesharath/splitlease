/**
 * Normalizes and validates a profile photo URL.
 *
 * @function processProfilePhotoUrl
 * @intent Transform raw photo URL into validated, normalized format
 * @rule Handle protocol-relative URLs (//example.com/photo.jpg → https://example.com/photo.jpg)
 * @rule Return null for invalid or missing URLs (NO FALLBACK to placeholder)
 * @rule Validate URL format to prevent XSS (must be http/https)
 * @rule Empty strings are treated as null (no photo)
 *
 * @param {object} params - Named parameters
 * @param {string|null|undefined} params.photoUrl - Raw profile photo URL
 * @returns {string|null} Normalized URL or null if invalid/missing
 *
 * @example
 * processProfilePhotoUrl({ photoUrl: 'https://example.com/photo.jpg' }) // "https://example.com/photo.jpg"
 * processProfilePhotoUrl({ photoUrl: '//example.com/photo.jpg' }) // "https://example.com/photo.jpg"
 * processProfilePhotoUrl({ photoUrl: '' }) // null
 * processProfilePhotoUrl({ photoUrl: null }) // null
 * processProfilePhotoUrl({ photoUrl: 'javascript:alert(1)' }) // null (XSS prevention)
 */
export function processProfilePhotoUrl({ photoUrl }) {
  // NO FALLBACK: Return null for missing/invalid, never a placeholder
  if (photoUrl === null || photoUrl === undefined) {
    return null;
  }

  // Type check
  if (typeof photoUrl !== 'string') {
    return null;
  }

  // Trim whitespace
  const trimmedUrl = photoUrl.trim();

  // Empty string is treated as no photo
  if (trimmedUrl.length === 0) {
    return null;
  }

  // Handle protocol-relative URLs (//example.com/photo.jpg)
  if (trimmedUrl.startsWith('//')) {
    return `https:${trimmedUrl}`;
  }

  // Validate that URL starts with http:// or https:// (XSS prevention)
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    // Invalid protocol (could be javascript:, data:, etc.)
    return null;
  }

  // Return normalized URL
  return trimmedUrl;
}
