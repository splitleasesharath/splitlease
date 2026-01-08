/**
 * Parse JSON Array Field Processor
 *
 * PILLAR III: Processors (The "Transform" Layer)
 *
 * Parse JSONB field that may be double-encoded as JSON string.
 * Handles both native arrays and JSON-stringified arrays from Supabase.
 *
 * @intent Guarantee valid array data from Supabase JSONB fields.
 * @rule NO FALLBACK - throws explicit errors for invalid data.
 * @rule Fail loud with descriptive errors to surface data quality issues.
 * @pure Yes - deterministic, no side effects
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const EMPTY_ARRAY = Object.freeze([])

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

const isString = (value) => typeof value === 'string'
const isNonEmptyString = (value) => isString(value) && value.length > 0
const isNullish = (value) => value === null || value === undefined
const isArray = (value) => Array.isArray(value)

// ─────────────────────────────────────────────────────────────
// Error Message Builders (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Build error message for missing fieldName
 * @pure
 */
const buildFieldNameRequiredError = () =>
  'parseJsonArrayField: fieldName parameter is required and must be a string'

/**
 * Build error message for null/undefined field
 * @pure
 */
const buildNullFieldError = (fieldName) =>
  `parseJsonArrayField: ${fieldName} is null or undefined`

/**
 * Build error message for JSON parse failure
 * @pure
 */
const buildParseError = (fieldName, errorMessage) =>
  `parseJsonArrayField: Failed to parse ${fieldName} as JSON - ${errorMessage}`

/**
 * Build error message for non-array parsed result
 * @pure
 */
const buildNotArrayError = (fieldName, parsedType, value) =>
  `parseJsonArrayField: ${fieldName} parsed to ${parsedType}, expected array. Value: ${JSON.stringify(value)}`

/**
 * Build error message for unexpected type
 * @pure
 */
const buildUnexpectedTypeError = (fieldName, actualType, value) =>
  `parseJsonArrayField: ${fieldName} has unexpected type ${actualType}. Expected array or JSON string. Value: ${JSON.stringify(value)}`

// ─────────────────────────────────────────────────────────────
// Pure Transformation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Try to parse JSON string to array
 * @pure
 * @returns {Array} Parsed array
 * @throws {Error} If parsing fails or result is not an array
 */
const parseJsonToArray = (jsonString, fieldName) => {
  let parsed
  try {
    parsed = JSON.parse(jsonString)
  } catch (e) {
    throw new Error(buildParseError(fieldName, e.message))
  }

  if (!isArray(parsed)) {
    throw new Error(buildNotArrayError(fieldName, typeof parsed, parsed))
  }

  return parsed
}

// ─────────────────────────────────────────────────────────────
// Main Processors
// ─────────────────────────────────────────────────────────────

/**
 * Parse JSONB field that may be double-encoded as JSON string.
 * @pure
 *
 * @param {object} params - Named parameters.
 * @param {any} params.field - JSONB field value from Supabase.
 * @param {string} params.fieldName - Name of field for error messages.
 * @returns {Array} Parsed and validated array.
 *
 * @throws {Error} If field is null/undefined (data missing).
 * @throws {Error} If field is a string but cannot be parsed as JSON.
 * @throws {Error} If parsed result is not an array.
 * @throws {Error} If field is an unexpected type.
 *
 * @example
 * parseJsonArrayField({ field: ['a', 'b'], fieldName: 'Amenities' })
 * // => ['a', 'b']
 *
 * parseJsonArrayField({ field: '["a","b"]', fieldName: 'Amenities' })
 * // => ['a', 'b']
 */
export function parseJsonArrayField({ field, fieldName }) {
  // Validation: fieldName is required
  if (!isNonEmptyString(fieldName)) {
    throw new Error(buildFieldNameRequiredError())
  }

  // Validation: field is required
  if (isNullish(field)) {
    throw new Error(buildNullFieldError(fieldName))
  }

  // Already an array - return as-is
  if (isArray(field)) {
    return field
  }

  // String that needs parsing (double-encoded JSONB)
  if (isString(field)) {
    return parseJsonToArray(field, fieldName)
  }

  // Unexpected type - fail loud
  throw new Error(buildUnexpectedTypeError(fieldName, typeof field, field))
}

/**
 * Parse JSONB array field with fallback to empty array for optional fields.
 * Use this ONLY for truly optional fields where an empty array is a valid business state.
 * @pure
 *
 * @param {object} params - Named parameters.
 * @param {any} params.field - JSONB field value from Supabase.
 * @param {string} params.fieldName - Name of field for error messages.
 * @returns {Array} Parsed array or empty array if field is null/undefined.
 *
 * @throws {Error} If field is provided but invalid.
 *
 * @example
 * parseJsonArrayFieldOptional({ field: null, fieldName: 'Optional' })
 * // => []
 */
export function parseJsonArrayFieldOptional({ field, fieldName }) {
  // Optional: Allow null/undefined with explicit empty array fallback
  if (isNullish(field)) {
    return EMPTY_ARRAY
  }

  // For non-null fields, use strict validation
  return parseJsonArrayField({ field, fieldName })
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { EMPTY_ARRAY }
