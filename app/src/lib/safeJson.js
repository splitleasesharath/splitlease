/**
 * Safe JSON parsing utility
 * Prevents errors from malformed JSON strings
 */

/**
 * Safely parse a JSON string with fallback
 * @param {string} jsonString - The JSON string to parse
 * @param {*} fallback - The fallback value to return on parse failure (default: null)
 * @returns {*} Parsed JSON object or fallback value
 */
export const safeJsonParse = (jsonString, fallback = null) => {
  if (!jsonString) return fallback;

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('JSON parse failed:', error.message);
    }
    return fallback;
  }
};
