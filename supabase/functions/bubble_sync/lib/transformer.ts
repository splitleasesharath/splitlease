/**
 * Field Transformer for Supabase → Bubble Push Sync
 * Split Lease - bubble_sync/lib
 *
 * Converts Supabase data formats to Bubble-compatible formats.
 * This is the REVERSE of the transformation in bubble_to_supabase_sync.py
 *
 * @module bubble_sync/lib/transformer
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[Transformer]'
const MIN_DAY_INDEX = 0
const MAX_DAY_INDEX = 6
const BUBBLE_MIN_DAY = 1
const BUBBLE_MAX_DAY = 7

/**
 * Field type classifications based on bubble_to_supabase_sync.py
 * @immutable
 */
export const FIELD_TYPES = Object.freeze({
  INTEGER_FIELDS: Object.freeze(new Set([
    '# of nights available', '.Search Ranking', 'Features - Qty Bathrooms',
    'Features - Qty Bedrooms', 'Features - Qty Beds', 'Features - Qty Guests',
    'Features - SQFT Area', 'Features - SQFT of Room', 'Maximum Months',
    'Maximum Nights', 'Maximum Weeks', 'Metrics - Click Counter',
    'Minimum Months', 'Minimum Nights', 'Minimum Weeks',
    'weeks out to available', '💰Cleaning Cost / Maintenance Fee',
    '💰Damage Deposit', '💰Monthly Host Rate', '💰Price Override',
    '💰Unit Markup'
  ])),

  NUMERIC_FIELDS: Object.freeze(new Set([
    'ClicksToViewRatio', 'DesirabilityTimesReceptivity',
    'Standarized Minimum Nightly Price (Filter)',
    '💰Nightly Host Rate for 2 nights', '💰Nightly Host Rate for 3 nights',
    '💰Nightly Host Rate for 4 nights', '💰Nightly Host Rate for 5 nights',
    '💰Nightly Host Rate for 7 nights', '💰Weekly Host Rate',
    'Total Compensation', 'Total Rent', 'Paid to Date from Guest'
  ])),

  BOOLEAN_FIELDS: Object.freeze(new Set([
    // Listing table booleans
    'Active', 'Approved', 'Complete', 'Default Extension Setting',
    'Default Listing', 'Features - Trial Periods Allowed', 'Showcase',
    'allow alternating roommates?', 'confirmedAvailability', 'is private?',
    'isForUsability', 'saw chatgpt suggestions?',
    // User table booleans
    'Additional Credits Received', 'Allow Email Change', 'Hide Nights Error',
    'Hide header announcement', 'ID documents submitted?', 'Lead Info Captured',
    'Mobile Notifications On', 'SMS Lock', 'Toggle - Is Admin',
    'Toggle - Is Corporate User', 'Verify - Phone', 'agreed to term and conditions?',
    'has logged in through mobile app', 'is email confirmed', 'is usability tester',
    'override tester?', 'reminder after 15 days sent?', 'show selector popups?',
    'user verified?', 'user_signed_up', 'usernotifyseton'
  ])),

  JSONB_FIELDS: Object.freeze(new Set([
    'AI Suggestions List', 'Clickers', 'Dates - Blocked',
    'Days Available (List of Days)', 'Days Not Available', 'Errors',
    'Features - Amenities In-Building', 'Features - Amenities In-Unit',
    'Features - House Rules', 'Features - Photos', 'Features - Safety',
    'Listing Curation', 'Location - Address', 'Location - Hoods (new)',
    'Location - slightly different address', 'Nights Available (List of Nights) ',
    'Nights Available (numbers)', 'Nights Not Available', 'Reviews',
    'Users that favorite', 'Viewers', 'users with permission'
  ])),

  TIMESTAMP_FIELDS: Object.freeze(new Set([
    'Created Date', 'Modified Date', 'Operator Last Updated AUT'
  ])),

  // Fields containing day indices - NO LONGER NEED CONVERSION
  // After migration to 0-indexed, database stores JS format (0-6)
  // Bubble sync is being deprecated, so this is kept for reference only
  DAY_INDEX_FIELDS: Object.freeze(new Set([
    'Days Available (List of Days)', 'Days Not Available',
    'Nights Available (List of Nights) ', 'Nights Not Available',
    'Nights Available (numbers)'
  ])),

  // Fields to exclude from sync (sensitive data)
  EXCLUDED_FIELDS: Object.freeze(new Set([
    'password_hash', 'refresh_token', 'access_token',
    'service_role_key', 'api_key'
  ])),

  // Fields that are Bubble Option Sets of type "Days"
  // These require conversion from numeric index (0-6) to display name ("Sunday", "Monday", etc.)
  // Bubble's Data API expects the Option Set display value as a string, not a number
  OPTION_SET_DAY_FIELDS: Object.freeze(new Set([
    'check in day',
    'check out day',
    'hc check in day',
    'hc check out day',
  ]))
})

/**
 * Day display names indexed by JavaScript day number (0-6)
 * After migration, database stores 0-indexed days
 * @immutable
 */
const JS_DAY_DISPLAY_NAMES: Readonly<Record<number, string>> = Object.freeze({
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
})

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface TransformedField {
  readonly key: string;
  readonly value: unknown;
}

interface ValidationResult {
  readonly valid: boolean;
  readonly missing: readonly string[];
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is null or undefined
 * @pure
 */
const isNullish = (value: unknown): value is null | undefined =>
  value === null || value === undefined

/**
 * Check if day number is valid (0-6)
 * @pure
 */
const isValidDayNumber = (value: unknown): value is number =>
  typeof value === 'number' && value >= MIN_DAY_INDEX && value <= MAX_DAY_INDEX

/**
 * Check if value is an array
 * @pure
 */
const isArray = (value: unknown): value is unknown[] =>
  Array.isArray(value)

/**
 * Check if value is a number
 * @pure
 */
const isNumber = (value: unknown): value is number =>
  typeof value === 'number'

/**
 * Check if value is a string
 * @pure
 */
const isString = (value: unknown): value is string =>
  typeof value === 'string'

/**
 * Check if value is a Date instance
 * @pure
 */
const isDate = (value: unknown): value is Date =>
  value instanceof Date

/**
 * Check if field is excluded
 * @pure
 */
const isExcludedField = (key: string): boolean =>
  FIELD_TYPES.EXCLUDED_FIELDS.has(key)

/**
 * Check if field is an option set day field
 * @pure
 */
const isOptionSetDayField = (key: string): boolean =>
  FIELD_TYPES.OPTION_SET_DAY_FIELDS.has(key)

/**
 * Check if field is JSONB type
 * @pure
 */
const isJsonbField = (key: string): boolean =>
  FIELD_TYPES.JSONB_FIELDS.has(key)

/**
 * Check if field is boolean type
 * @pure
 */
const isBooleanField = (key: string): boolean =>
  FIELD_TYPES.BOOLEAN_FIELDS.has(key)

/**
 * Check if field is integer type
 * @pure
 */
const isIntegerField = (key: string): boolean =>
  FIELD_TYPES.INTEGER_FIELDS.has(key)

/**
 * Check if field is numeric type
 * @pure
 */
const isNumericField = (key: string): boolean =>
  FIELD_TYPES.NUMERIC_FIELDS.has(key)

/**
 * Check if field is timestamp type
 * @pure
 */
const isTimestampField = (key: string): boolean =>
  FIELD_TYPES.TIMESTAMP_FIELDS.has(key)

// ─────────────────────────────────────────────────────────────
// Data Transformers
// ─────────────────────────────────────────────────────────────

/**
 * Convert a JS day number (0-6) to its display name
 * After migration, database stores 0-indexed days
 * @pure
 */
export function convertDayNumberToDisplayName(dayNumber: number): string | null {
  if (!isValidDayNumber(dayNumber)) {
    console.warn(`${LOG_PREFIX} Invalid day number for display conversion: ${dayNumber}`)
    return null
  }
  return JS_DAY_DISPLAY_NAMES[dayNumber]
}

/**
 * @deprecated Bubble sync is being phased out. Database now uses 0-indexed days natively.
 * Kept for backwards compatibility during transition period.
 * @pure
 */
export function adaptDaysToBubble(days: number[]): number[] {
  console.warn(`${LOG_PREFIX} adaptDaysToBubble is deprecated - Bubble sync being phased out`)
  if (!isArray(days)) return days
  return days.map(day => {
    const bubbleDay = day + 1
    return Math.max(BUBBLE_MIN_DAY, Math.min(BUBBLE_MAX_DAY, bubbleDay))
  })
}

/**
 * @deprecated Bubble sync is being phased out. Database now uses 0-indexed days natively.
 * Kept for backwards compatibility during transition period.
 * @pure
 */
export function adaptDaysFromBubble(days: number[]): number[] {
  console.warn(`${LOG_PREFIX} adaptDaysFromBubble is deprecated - Bubble sync being phased out`)
  if (!isArray(days)) return days
  return days.map(day => {
    const jsDay = day - 1
    return Math.max(MIN_DAY_INDEX, Math.min(MAX_DAY_INDEX, jsDay))
  })
}

/**
 * Parse JSONB field if it's a string
 * @pure
 */
export function parseJsonbField(value: unknown): unknown {
  if (!isString(value)) return value
  try {
    return JSON.parse(value)
  } catch {
    // If it's not valid JSON, return as-is
    return value
  }
}

/**
 * Get mapped field name
 * @pure
 */
const getMappedFieldName = (key: string, fieldMapping?: Record<string, string>): string =>
  fieldMapping?.[key] || key

/**
 * Parse integer from value
 * @pure
 */
const parseInteger = (value: unknown): number | null => {
  if (isNumber(value)) return Math.round(value)
  if (isString(value)) {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? null : parsed
  }
  return null
}

/**
 * Parse float from value
 * @pure
 */
const parseFloat_ = (value: unknown): number | null => {
  if (isNumber(value)) return value
  if (isString(value)) {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? null : parsed
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// Field Transformation Logic
// ─────────────────────────────────────────────────────────────

/**
 * Transform option set day field
 * @pure (with logging side effect)
 */
const transformOptionSetDayField = (
  key: string,
  value: unknown,
  bubbleKey: string
): TransformedField => {
  if (isNumber(value)) {
    const displayName = convertDayNumberToDisplayName(value)
    console.log(`${LOG_PREFIX} Converting Option Set day field "${key}": ${value} → "${displayName}"`)
    return { key: bubbleKey, value: displayName }
  }
  // If already a string (e.g., "Monday"), pass through as-is
  if (isString(value)) {
    return { key: bubbleKey, value }
  }
  // Unexpected type - log and pass through
  console.warn(`${LOG_PREFIX} Unexpected type for Option Set day field "${key}": ${typeof value}`)
  return { key: bubbleKey, value }
}

/**
 * Transform a single field value for Bubble
 * @pure (with logging side effect)
 */
export function transformFieldForBubble(
  key: string,
  value: unknown,
  fieldMapping?: Record<string, string>
): TransformedField {
  // Apply field mapping if provided
  const bubbleKey = getMappedFieldName(key, fieldMapping)

  // Skip null/undefined values
  if (isNullish(value)) {
    return { key: bubbleKey, value: null }
  }

  // Handle excluded fields
  if (isExcludedField(key)) {
    return { key: bubbleKey, value: undefined } // Skip entirely
  }

  // Handle Option Set "Days" fields - convert number to display name
  if (isOptionSetDayField(key)) {
    return transformOptionSetDayField(key, value, bubbleKey)
  }

  // Handle JSONB fields
  if (isJsonbField(key)) {
    const parsedValue = parseJsonbField(value)
    return { key: bubbleKey, value: parsedValue }
  }

  // Handle boolean fields - Bubble accepts true/false
  if (isBooleanField(key)) {
    return { key: bubbleKey, value: Boolean(value) }
  }

  // Handle integer fields
  if (isIntegerField(key)) {
    const parsed = parseInteger(value)
    return { key: bubbleKey, value: parsed !== null ? parsed : value }
  }

  // Handle numeric fields
  if (isNumericField(key)) {
    const parsed = parseFloat_(value)
    return { key: bubbleKey, value: parsed !== null ? parsed : value }
  }

  // Handle timestamp fields - Bubble expects ISO 8601 strings
  if (isTimestampField(key)) {
    if (isDate(value)) {
      return { key: bubbleKey, value: value.toISOString() }
    }
    return { key: bubbleKey, value }
  }

  // Default: return as-is
  return { key: bubbleKey, value }
}

/**
 * Transform an entire record for Bubble
 * @effectful (console logging)
 */
export function transformRecordForBubble(
  record: Record<string, unknown>,
  tableName: string,
  fieldMapping?: Record<string, string>,
  excludedFields?: readonly string[]
): Record<string, unknown> {
  const transformed: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(record)) {
    // Skip excluded fields
    if (excludedFields?.includes(key)) {
      continue
    }

    const { key: bubbleKey, value: bubbleValue } = transformFieldForBubble(
      key,
      value,
      fieldMapping
    )

    // Skip undefined values (explicitly excluded)
    if (bubbleValue !== undefined) {
      transformed[bubbleKey] = bubbleValue
    }
  }

  console.log(`${LOG_PREFIX} Transformed ${Object.keys(record).length} fields for table: ${tableName}`)

  return transformed
}

/**
 * Validate that required fields are present
 * @pure
 */
export function validateRequiredFields(
  record: Record<string, unknown>,
  requiredFields: readonly string[]
): ValidationResult {
  const missing = requiredFields.filter(field => isNullish(record[field]))

  return Object.freeze({
    valid: missing.length === 0,
    missing: Object.freeze(missing),
  })
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,
  MIN_DAY_INDEX,
  MAX_DAY_INDEX,
  BUBBLE_MIN_DAY,
  BUBBLE_MAX_DAY,
  JS_DAY_DISPLAY_NAMES,

  // Predicates
  isNullish,
  isValidDayNumber,
  isArray,
  isNumber,
  isString,
  isDate,
  isExcludedField,
  isOptionSetDayField,
  isJsonbField,
  isBooleanField,
  isIntegerField,
  isNumericField,
  isTimestampField,

  // Transformers
  getMappedFieldName,
  parseInteger,
  parseFloat_,
  transformOptionSetDayField,
})
