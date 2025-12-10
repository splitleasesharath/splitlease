/**
 * JSON utility functions for Supabase Edge Functions
 * Split Lease - Supabase Edge Functions
 *
 * Handles JSONB field parsing from Supabase, which can return data as either:
 * - Native JavaScript arrays/objects
 * - Stringified JSON strings
 *
 * NO FALLBACK PRINCIPLE: Returns empty array/object on parse failure, logs warning
 */

/**
 * Parse a value that may be a native array or stringified JSON array
 *
 * Supabase JSONB fields can be returned as either:
 * - Native JavaScript arrays: ["id1", "id2"]
 * - Stringified JSON arrays: '["id1", "id2"]'
 *
 * This utility handles both cases robustly.
 *
 * @param value - Value from Supabase JSONB field
 * @param fieldName - Optional field name for logging
 * @returns Parsed array or empty array if parsing fails
 *
 * @example
 * // Native array - returns as-is
 * parseJsonArray(["id1", "id2"]) // => ["id1", "id2"]
 *
 * @example
 * // Stringified JSON - parses and returns
 * parseJsonArray('["id1", "id2"]') // => ["id1", "id2"]
 *
 * @example
 * // Null/undefined - returns empty array
 * parseJsonArray(null) // => []
 */
export function parseJsonArray<T = unknown>(
  value: unknown,
  fieldName?: string
): T[] {
  // Already a native array? Return as-is
  if (Array.isArray(value)) {
    return value as T[];
  }

  // Stringified JSON? Try to parse
  if (typeof value === "string") {
    // Empty string is treated as empty array
    if (value.trim() === "") {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      // Verify the parsed result is actually an array
      if (Array.isArray(parsed)) {
        return parsed as T[];
      }
      // Parsed but not an array - log and return empty
      console.warn(
        `[parseJsonArray] ${fieldName || "Field"} parsed to ${typeof parsed}, expected array`
      );
      return [];
    } catch (error) {
      console.warn(
        `[parseJsonArray] Failed to parse ${fieldName || "field"}:`,
        { value: value.substring(0, 100), error: (error as Error).message }
      );
      return [];
    }
  }

  // Null, undefined, or unexpected type - return empty array
  if (value != null) {
    console.warn(
      `[parseJsonArray] ${fieldName || "Field"} has unexpected type: ${typeof value}`
    );
  }

  return [];
}

/**
 * Parse a value that may be a native object or stringified JSON object
 *
 * Similar to parseJsonArray but for object types.
 *
 * @param value - Value from Supabase JSONB field
 * @param fieldName - Optional field name for logging
 * @returns Parsed object or empty object if parsing fails
 */
export function parseJsonObject<T = Record<string, unknown>>(
  value: unknown,
  fieldName?: string
): T {
  // Already a native object? Return as-is
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as T;
  }

  // Stringified JSON? Try to parse
  if (typeof value === "string") {
    // Empty string is treated as empty object
    if (value.trim() === "") {
      return {} as T;
    }

    try {
      const parsed = JSON.parse(value);
      // Verify the parsed result is actually an object
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as T;
      }
      // Parsed but not an object - log and return empty
      console.warn(
        `[parseJsonObject] ${fieldName || "Field"} parsed to ${typeof parsed}, expected object`
      );
      return {} as T;
    } catch (error) {
      console.warn(
        `[parseJsonObject] Failed to parse ${fieldName || "field"}:`,
        { value: value.substring(0, 100), error: (error as Error).message }
      );
      return {} as T;
    }
  }

  // Null, undefined, or unexpected type - return empty object
  if (value != null) {
    console.warn(
      `[parseJsonObject] ${fieldName || "Field"} has unexpected type: ${typeof value}`
    );
  }

  return {} as T;
}

/**
 * Safely get array length, parsing JSONB if necessary
 *
 * Useful for calculating counts without needing the full array.
 *
 * @param value - Value from Supabase JSONB field
 * @param fieldName - Optional field name for logging
 * @returns Length of the array, or 0 if not an array
 */
export function getJsonArrayLength(value: unknown, fieldName?: string): number {
  const arr = parseJsonArray(value, fieldName);
  return arr.length;
}
