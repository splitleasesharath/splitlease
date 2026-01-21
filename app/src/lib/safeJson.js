/**
 * Safe JSON parsing utility
 * Prevents errors from malformed JSON strings
 */

/**
 * Safely parse a JSON string with fallback
 *
 * @intent Parse JSON without throwing, returning fallback on failure
 * @rule Returns fallback for null, undefined, empty string, or non-string input
 * @rule Returns fallback for malformed JSON
 * @rule Logs warning in development mode only
 *
 * @param {string} jsonString - The JSON string to parse
 * @param {*} fallback - The fallback value to return on parse failure (default: null)
 * @returns {*} Parsed JSON object or fallback value
 *
 * @example
 * safeJsonParse('{"name":"John"}') // { name: 'John' }
 * safeJsonParse('invalid', []) // []
 * safeJsonParse(null, {}) // {}
 */
export function safeJsonParse(jsonString, fallback = null) {
  // Handle null, undefined, and non-string inputs
  if (jsonString === null || jsonString === undefined) {
    return fallback;
  }

  if (typeof jsonString !== 'string') {
    return fallback;
  }

  // Handle empty string
  if (jsonString.trim().length === 0) {
    return fallback;
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('JSON parse failed:', error.message);
    }
    return fallback;
  }
}
