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

/**
 * Sanitize text input by removing potentially dangerous characters
 * @param {string} input - Raw user input
 * @param {object} options - Sanitization options
 * @returns {string} Sanitized string
 */
export function sanitizeText(input, options = {}) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const {
    maxLength = 1000,
    allowNewlines = false,
    allowSpecialChars = true
  } = options;

  let sanitized = input;

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove control characters except newlines (if allowed)
  if (allowNewlines) {
    sanitized = sanitized.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  }

  // Remove script tags and event handlers
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Remove HTML comments
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');

  // Optionally remove special characters (for search inputs)
  if (!allowSpecialChars) {
    sanitized = sanitized.replace(/[<>{}[\]\\\/]/g, '');
  }

  return sanitized;
}

/**
 * Sanitize search query input
 * @param {string} query - Search query
 * @returns {string} Sanitized query
 */
export function sanitizeSearchQuery(query) {
  return sanitizeText(query, {
    maxLength: 200,
    allowNewlines: false,
    allowSpecialChars: false
  });
}

/**
 * Sanitize neighborhood filter input
 * @param {string} input - Neighborhood search input
 * @returns {string} Sanitized input
 */
export function sanitizeNeighborhoodSearch(input) {
  return sanitizeText(input, {
    maxLength: 100,
    allowNewlines: false,
    allowSpecialChars: false
  });
}

/**
 * Escape HTML entities to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Validate and sanitize URL parameter
 * @param {string} param - URL parameter value
 * @param {string} type - Parameter type (string, number, array)
 * @returns {string|number|array|null} Sanitized parameter or null if invalid
 */
export function sanitizeUrlParam(param, type = 'string') {
  if (!param) return null;

  switch (type) {
    case 'string':
      return sanitizeText(param, {
        maxLength: 100,
        allowNewlines: false,
        allowSpecialChars: false
      });

    case 'number':
      const num = parseInt(param, 10);
      return isNaN(num) ? null : num;

    case 'array':
      // For comma-separated values
      if (typeof param !== 'string') return [];
      return param
        .split(',')
        .map(item => sanitizeText(item.trim(), {
          maxLength: 50,
          allowNewlines: false,
          allowSpecialChars: false
        }))
        .filter(item => item.length > 0);

    case 'boolean':
      return param === 'true' || param === '1';

    default:
      return sanitizeText(param);
  }
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid email format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate phone number format (US)
 * @param {string} phone - Phone number
 * @returns {boolean} True if valid phone format
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Check if it's 10 or 11 digits (with or without country code)
  return /^1?\d{10}$/.test(cleaned);
}

/**
 * Sanitize listing ID to ensure it's a valid UUID or database ID
 * @param {string} id - Listing ID
 * @returns {string|null} Sanitized ID or null if invalid
 */
export function sanitizeListingId(id) {
  if (!id || typeof id !== 'string') {
    return null;
  }

  // Check if it's a UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return id.toLowerCase();
  }

  // Check if it's a numeric ID
  if (/^\d+$/.test(id)) {
    return id;
  }

  // Check if it's an alphanumeric ID (up to 50 chars)
  if (/^[a-zA-Z0-9_-]{1,50}$/.test(id)) {
    return id;
  }

  return null;
}

/**
 * Rate limit check for API calls (simple in-memory implementation)
 * In production, use Redis or similar for distributed rate limiting
 */
const rateLimitMap = new Map();

export function checkRateLimit(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const record = rateLimitMap.get(key);

  if (now > record.resetTime) {
    // Reset window
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  record.count++;
  return true;
}

/**
 * Clear old rate limit entries (call periodically)
 */
export function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Clean up rate limits every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
