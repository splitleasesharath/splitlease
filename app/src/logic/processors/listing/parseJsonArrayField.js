/**
 * Parse JSONB field that may be double-encoded as JSON string.
 * Handles both native arrays and JSON-stringified arrays from Supabase.
 *
 * @intent Guarantee valid array data from Supabase JSONB fields.
 * @rule NO FALLBACK - throws explicit errors for invalid data.
 * @rule Fail loud with descriptive errors to surface data quality issues.
 *
 * This is a "Truth" layer processor that validates data shape before it reaches the UI.
 *
 * @param {object} params - Named parameters.
 * @param {any} params.field - JSONB field value from Supabase.
 * @param {string} params.fieldName - Name of field for error messages (e.g., "Features - Amenities").
 * @returns {Array} Parsed and validated array.
 *
 * @throws {Error} If field is null/undefined (data missing).
 * @throws {Error} If field is a string but cannot be parsed as JSON.
 * @throws {Error} If parsed result is not an array.
 * @throws {Error} If field is an unexpected type (not null, array, or string).
 *
 * @example
 * // Already an array
 * const result = parseJsonArrayField({
 *   field: ['amenity1', 'amenity2'],
 *   fieldName: 'Features - Amenities'
 * })
 * // => ['amenity1', 'amenity2']
 *
 * // JSON-encoded string (double-encoded)
 * const result = parseJsonArrayField({
 *   field: '["amenity1","amenity2"]',
 *   fieldName: 'Features - Amenities'
 * })
 * // => ['amenity1', 'amenity2']
 *
 * // Null field throws error
 * parseJsonArrayField({ field: null, fieldName: 'Features - Amenities' })
 * // => Error: parseJsonArrayField: Features - Amenities is null or undefined
 */
export function parseJsonArrayField({ field, fieldName }) {
  // No Fallback: Validate fieldName is provided
  if (!fieldName || typeof fieldName !== 'string') {
    throw new Error(
      'parseJsonArrayField: fieldName parameter is required and must be a string'
    )
  }

  // No Fallback: Null/undefined is an error (data missing)
  if (field === null || field === undefined) {
    throw new Error(
      `parseJsonArrayField: ${fieldName} is null or undefined`
    )
  }

  // Already an array - validate and return
  if (Array.isArray(field)) {
    return field
  }

  // String that needs parsing (double-encoded JSONB)
  if (typeof field === 'string') {
    let parsed
    try {
      parsed = JSON.parse(field)
    } catch (e) {
      throw new Error(
        `parseJsonArrayField: Failed to parse ${fieldName} as JSON - ${e.message}`
      )
    }

    // Ensure parsed result is an array
    if (!Array.isArray(parsed)) {
      throw new Error(
        `parseJsonArrayField: ${fieldName} parsed to ${typeof parsed}, expected array. Value: ${JSON.stringify(parsed)}`
      )
    }

    return parsed
  }

  // Unexpected type - fail loud
  throw new Error(
    `parseJsonArrayField: ${fieldName} has unexpected type ${typeof field}. Expected array or JSON string. Value: ${JSON.stringify(field)}`
  )
}

/**
 * Parse JSONB array field with fallback to empty array for optional fields.
 * Use this ONLY for truly optional fields where an empty array is a valid business state.
 *
 * @intent Parse optional JSONB arrays with explicit empty-array default.
 * @rule Use sparingly - prefer parseJsonArrayField for required fields.
 * @rule Still validates that provided data is correct format.
 *
 * @param {object} params - Named parameters.
 * @param {any} params.field - JSONB field value from Supabase.
 * @param {string} params.fieldName - Name of field for error messages.
 * @returns {Array} Parsed array or empty array if field is null/undefined.
 *
 * @throws {Error} If field is provided but invalid (not parseable or not an array).
 *
 * @example
 * // Optional field not provided - returns empty array
 * const result = parseJsonArrayFieldOptional({
 *   field: null,
 *   fieldName: 'Optional Amenities'
 * })
 * // => []
 */
export function parseJsonArrayFieldOptional({ field, fieldName }) {
  // Optional: Allow null/undefined/empty string with explicit empty array fallback
  if (field === null || field === undefined || field === '') {
    return []
  }

  // For non-null fields, use strict validation
  return parseJsonArrayField({ field, fieldName })
}
