/**
 * Process Profile Photo URL Processor
 *
 * PILLAR III: Processors (The "Transform" Layer)
 *
 * Normalizes and validates a profile photo URL.
 *
 * @intent Transform raw photo URL into validated, normalized format
 * @rule Handle protocol-relative URLs (//example.com/photo.jpg → https://example.com/photo.jpg)
 * @rule Return null for invalid or missing URLs (NO FALLBACK to placeholder)
 * @rule Validate URL format to prevent XSS (must be http/https)
 * @rule Empty strings are treated as null (no photo)
 * @pure Yes - deterministic, no side effects
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const HTTPS_PROTOCOL = 'https:'
const HTTP_PREFIX = 'http://'
const HTTPS_PREFIX = 'https://'
const PROTOCOL_RELATIVE_PREFIX = '//'

const ALLOWED_PROTOCOLS = Object.freeze([HTTP_PREFIX, HTTPS_PREFIX])

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

const isString = (value) => typeof value === 'string'
const isNullish = (value) => value === null || value === undefined
const isEmptyString = (value) => isString(value) && value.trim().length === 0

/**
 * Check if URL starts with protocol-relative prefix
 * @pure
 */
const isProtocolRelative = (url) => url.startsWith(PROTOCOL_RELATIVE_PREFIX)

/**
 * Check if URL has an allowed protocol
 * @pure
 */
const hasAllowedProtocol = (url) =>
  ALLOWED_PROTOCOLS.some((protocol) => url.startsWith(protocol))

// ─────────────────────────────────────────────────────────────
// Pure Transformation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Trim whitespace from URL
 * @pure
 */
const trimUrl = (url) => url.trim()

/**
 * Convert protocol-relative URL to absolute HTTPS
 * @pure
 */
const makeAbsoluteUrl = (protocolRelativeUrl) =>
  `${HTTPS_PROTOCOL}${protocolRelativeUrl}`

// ─────────────────────────────────────────────────────────────
// Main Processor
// ─────────────────────────────────────────────────────────────

/**
 * Normalizes and validates a profile photo URL.
 * @pure
 *
 * @param {object} params - Named parameters
 * @param {string|null|undefined} params.photoUrl - Raw profile photo URL
 * @returns {string|null} Normalized URL or null if invalid/missing
 *
 * @example
 * processProfilePhotoUrl({ photoUrl: 'https://example.com/photo.jpg' })
 * // => "https://example.com/photo.jpg"
 *
 * processProfilePhotoUrl({ photoUrl: '//example.com/photo.jpg' })
 * // => "https://example.com/photo.jpg"
 *
 * processProfilePhotoUrl({ photoUrl: 'javascript:alert(1)' })
 * // => null (XSS prevention)
 */
export function processProfilePhotoUrl({ photoUrl }) {
  // Guard: Nullish values return null
  if (isNullish(photoUrl)) {
    return null
  }

  // Guard: Non-string values return null
  if (!isString(photoUrl)) {
    return null
  }

  // Normalize: Trim whitespace
  const trimmedUrl = trimUrl(photoUrl)

  // Guard: Empty string treated as no photo
  if (isEmptyString(trimmedUrl)) {
    return null
  }

  // Transform: Protocol-relative URLs to HTTPS
  if (isProtocolRelative(trimmedUrl)) {
    return makeAbsoluteUrl(trimmedUrl)
  }

  // Security: Only allow http/https protocols (XSS prevention)
  if (!hasAllowedProtocol(trimmedUrl)) {
    return null
  }

  return trimmedUrl
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  HTTPS_PROTOCOL,
  HTTP_PREFIX,
  HTTPS_PREFIX,
  PROTOCOL_RELATIVE_PREFIX,
  ALLOWED_PROTOCOLS
}
