/**
 * Input Sanitization Utilities
 * Protects against XSS, SQL injection, and other security vulnerabilities
 *
 * SECURITY PRINCIPLE: Never trust user input
 * - Sanitize all user-provided text
 * - Validate URL parameters
 * - Escape HTML entities
 * - Strip dangerous characters
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const SANITIZE_DEFAULTS = Object.freeze({
  MAX_LENGTH: 1000,
  SEARCH_MAX_LENGTH: 200,
  NEIGHBORHOOD_MAX_LENGTH: 100,
  URL_PARAM_MAX_LENGTH: 100,
  ARRAY_ITEM_MAX_LENGTH: 50,
  LISTING_ID_MAX_LENGTH: 50
})

const REGEX_PATTERNS = Object.freeze({
  CONTROL_CHARS_WITH_NEWLINES: /[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g,
  CONTROL_CHARS_ALL: /[\x00-\x1F\x7F]/g,
  SCRIPT_TAGS: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  EVENT_HANDLERS_QUOTED: /on\w+\s*=\s*["'][^"']*["']/gi,
  EVENT_HANDLERS_UNQUOTED: /on\w+\s*=\s*[^\s>]*/gi,
  JAVASCRIPT_PROTOCOL: /javascript:/gi,
  DATA_TEXT_HTML: /data:text\/html/gi,
  HTML_COMMENTS: /<!--[\s\S]*?-->/g,
  SPECIAL_CHARS: /[<>{}[\]\\\/]/g,
  HTML_ENTITIES: /[&<>"'/]/g,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  NUMERIC_ID: /^\d+$/,
  ALPHANUMERIC_ID: /^[a-zA-Z0-9_-]{1,50}$/,
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  PHONE_FORMATTING: /[\s\-\(\)\.]/g,
  PHONE_VALID: /^1?\d{10}$/
})

const HTML_ENTITY_MAP = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
})

const EMAIL_MAX_LENGTH = 254

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
 * Check if value is a string (including empty)
 * @pure
 */
const isString = (value) =>
  typeof value === 'string'

// ─────────────────────────────────────────────────────────────
// Pure Transformation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Remove control characters from string
 * @pure
 */
const removeControlChars = (str, allowNewlines) =>
  allowNewlines
    ? str.replace(REGEX_PATTERNS.CONTROL_CHARS_WITH_NEWLINES, '')
    : str.replace(REGEX_PATTERNS.CONTROL_CHARS_ALL, '')

/**
 * Remove dangerous script-related content
 * @pure
 */
const removeScriptContent = (str) =>
  str
    .replace(REGEX_PATTERNS.SCRIPT_TAGS, '')
    .replace(REGEX_PATTERNS.EVENT_HANDLERS_QUOTED, '')
    .replace(REGEX_PATTERNS.EVENT_HANDLERS_UNQUOTED, '')
    .replace(REGEX_PATTERNS.JAVASCRIPT_PROTOCOL, '')
    .replace(REGEX_PATTERNS.DATA_TEXT_HTML, '')
    .replace(REGEX_PATTERNS.HTML_COMMENTS, '')

/**
 * Truncate string to max length
 * @pure
 */
const truncateString = (str, maxLength) =>
  str.length > maxLength ? str.substring(0, maxLength) : str

/**
 * Map HTML character to entity
 * @pure
 */
const mapHtmlEntity = (char) =>
  HTML_ENTITY_MAP[char] || char

// ─────────────────────────────────────────────────────────────
// Main Sanitization Functions
// ─────────────────────────────────────────────────────────────

/**
 * Sanitize text input by removing potentially dangerous characters
 * @pure
 * @param {string} input - Raw user input
 * @param {object} options - Sanitization options
 * @returns {string} Sanitized string
 */
export function sanitizeText(input, options = {}) {
  if (!isString(input) || input.length === 0) {
    return '';
  }

  const {
    maxLength = SANITIZE_DEFAULTS.MAX_LENGTH,
    allowNewlines = false,
    allowSpecialChars = true
  } = options;

  // Apply transformations using pure helpers
  const trimmed = input.trim()
  const truncated = truncateString(trimmed, maxLength)
  const withoutControlChars = removeControlChars(truncated, allowNewlines)
  const withoutScripts = removeScriptContent(withoutControlChars)
  const sanitized = allowSpecialChars
    ? withoutScripts
    : withoutScripts.replace(REGEX_PATTERNS.SPECIAL_CHARS, '')

  return sanitized
}

/**
 * Sanitize search query input
 * @pure
 * @param {string} query - Search query
 * @returns {string} Sanitized query
 */
export function sanitizeSearchQuery(query) {
  return sanitizeText(query, {
    maxLength: SANITIZE_DEFAULTS.SEARCH_MAX_LENGTH,
    allowNewlines: false,
    allowSpecialChars: false
  })
}

/**
 * Sanitize neighborhood filter input
 * @pure
 * @param {string} input - Neighborhood search input
 * @returns {string} Sanitized input
 */
export function sanitizeNeighborhoodSearch(input) {
  return sanitizeText(input, {
    maxLength: SANITIZE_DEFAULTS.NEIGHBORHOOD_MAX_LENGTH,
    allowNewlines: false,
    allowSpecialChars: false
  })
}

/**
 * Escape HTML entities to prevent XSS
 * @pure
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
  if (!isString(text) || text.length === 0) {
    return ''
  }

  return text.replace(REGEX_PATTERNS.HTML_ENTITIES, mapHtmlEntity)
}

/**
 * Parse string parameter as sanitized string
 * @pure
 */
const parseStringParam = (param) =>
  sanitizeText(param, {
    maxLength: SANITIZE_DEFAULTS.URL_PARAM_MAX_LENGTH,
    allowNewlines: false,
    allowSpecialChars: false
  })

/**
 * Parse string parameter as number
 * @pure
 */
const parseNumberParam = (param) => {
  const num = parseInt(param, 10)
  return isNaN(num) ? null : num
}

/**
 * Parse comma-separated string as array
 * @pure
 */
const parseArrayParam = (param) => {
  if (!isString(param)) return []
  return param
    .split(',')
    .map(item => sanitizeText(item.trim(), {
      maxLength: SANITIZE_DEFAULTS.ARRAY_ITEM_MAX_LENGTH,
      allowNewlines: false,
      allowSpecialChars: false
    }))
    .filter(item => item.length > 0)
}

/**
 * Parse string parameter as boolean
 * @pure
 */
const parseBooleanParam = (param) =>
  param === 'true' || param === '1'

/**
 * Validate and sanitize URL parameter
 * @pure
 * @param {string} param - URL parameter value
 * @param {string} type - Parameter type (string, number, array)
 * @returns {string|number|array|null} Sanitized parameter or null if invalid
 */
export function sanitizeUrlParam(param, type = 'string') {
  if (!param) return null

  switch (type) {
    case 'string':
      return parseStringParam(param)
    case 'number':
      return parseNumberParam(param)
    case 'array':
      return parseArrayParam(param)
    case 'boolean':
      return parseBooleanParam(param)
    default:
      return sanitizeText(param)
  }
}

/**
 * Validate email format
 * @pure
 * @param {string} email - Email address
 * @returns {boolean} True if valid email format
 */
export function isValidEmail(email) {
  if (!isString(email) || email.length === 0) {
    return false
  }

  return REGEX_PATTERNS.EMAIL.test(email) && email.length <= EMAIL_MAX_LENGTH
}

/**
 * Validate phone number format (US)
 * @pure
 * @param {string} phone - Phone number
 * @returns {boolean} True if valid phone format
 */
export function isValidPhone(phone) {
  if (!isString(phone) || phone.length === 0) {
    return false
  }

  // Remove common formatting characters
  const cleaned = phone.replace(REGEX_PATTERNS.PHONE_FORMATTING, '')

  // Check if it's 10 or 11 digits (with or without country code)
  return REGEX_PATTERNS.PHONE_VALID.test(cleaned)
}

/**
 * Check if ID matches UUID format
 * @pure
 */
const isUuidFormat = (id) =>
  REGEX_PATTERNS.UUID.test(id)

/**
 * Check if ID is numeric
 * @pure
 */
const isNumericId = (id) =>
  REGEX_PATTERNS.NUMERIC_ID.test(id)

/**
 * Check if ID is alphanumeric
 * @pure
 */
const isAlphanumericId = (id) =>
  REGEX_PATTERNS.ALPHANUMERIC_ID.test(id)

/**
 * Sanitize listing ID to ensure it's a valid UUID or database ID
 * @pure
 * @param {string} id - Listing ID
 * @returns {string|null} Sanitized ID or null if invalid
 */
export function sanitizeListingId(id) {
  if (!isString(id) || id.length === 0) {
    return null
  }

  if (isUuidFormat(id)) {
    return id.toLowerCase()
  }

  if (isNumericId(id)) {
    return id
  }

  if (isAlphanumericId(id)) {
    return id
  }

  return null
}

// ─────────────────────────────────────────────────────────────
// Rate Limiting (Stateful - Effects at Edges)
// ─────────────────────────────────────────────────────────────

const RATE_LIMIT_DEFAULTS = Object.freeze({
  MAX_REQUESTS: 10,
  WINDOW_MS: 60000, // 1 minute
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000 // 5 minutes
})

/**
 * Rate limit storage
 * Note: This is intentionally stateful for rate limiting purposes
 * @effectful - maintains mutable state
 */
const rateLimitMap = new Map()

/**
 * Create new rate limit record
 * @pure
 */
const createRateLimitRecord = (now, windowMs) =>
  Object.freeze({ count: 1, resetTime: now + windowMs })

/**
 * Check if rate limit window has expired
 * @pure
 */
const isWindowExpired = (record, now) =>
  now > record.resetTime

/**
 * Check if rate limit exceeded
 * @pure
 */
const isRateLimitExceeded = (record, maxRequests) =>
  record.count >= maxRequests

/**
 * Rate limit check for API calls (simple in-memory implementation)
 * In production, use Redis or similar for distributed rate limiting
 * @effectful - reads/writes to rateLimitMap
 */
export function checkRateLimit(key, maxRequests = RATE_LIMIT_DEFAULTS.MAX_REQUESTS, windowMs = RATE_LIMIT_DEFAULTS.WINDOW_MS) {
  const now = Date.now()

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, createRateLimitRecord(now, windowMs))
    return true
  }

  const record = rateLimitMap.get(key)

  if (isWindowExpired(record, now)) {
    rateLimitMap.set(key, createRateLimitRecord(now, windowMs))
    return true
  }

  if (isRateLimitExceeded(record, maxRequests)) {
    return false
  }

  record.count++
  return true
}

/**
 * Clear old rate limit entries (call periodically)
 * @effectful - modifies rateLimitMap
 */
export function cleanupRateLimits() {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (isWindowExpired(record, now)) {
      rateLimitMap.delete(key)
    }
  }
}

// Clean up rate limits every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupRateLimits, RATE_LIMIT_DEFAULTS.CLEANUP_INTERVAL_MS)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  SANITIZE_DEFAULTS,
  REGEX_PATTERNS,
  HTML_ENTITY_MAP,
  EMAIL_MAX_LENGTH,
  RATE_LIMIT_DEFAULTS
}
