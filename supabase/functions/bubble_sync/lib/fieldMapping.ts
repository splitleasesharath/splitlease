/**
 * Field Mapping Registry - Supabase ↔ Bubble
 * Split Lease - bubble_sync/lib
 *
 * Handles field name transformations between Supabase and Bubble.
 *
 * NOTE: The bubble_to_supabase_sync.py script preserves Bubble field names AS-IS
 * in Supabase (including spaces and special characters like emoji).
 * This means most fields don't need transformation - they're already in Bubble format.
 *
 * This registry handles:
 * 1. Fields that ARE different between systems
 * 2. Read-only fields that should never be sent to Bubble
 * 3. Excluded fields for security
 *
 * @module bubble_sync/lib/fieldMapping
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[fieldMapping]'

/**
 * Fields that are READ-ONLY in Bubble (managed by Bubble)
 * These should NEVER be included in POST/PATCH requests
 * @immutable
 */
export const BUBBLE_READ_ONLY_FIELDS = Object.freeze(new Set([
  '_id',
  'Created Date',
  'Modified Date',
  'Created By',
  'Modified By',
  '_type',
]))

/**
 * Fields to EXCLUDE from sync (security/internal use only)
 * @immutable
 */
export const EXCLUDED_SYNC_FIELDS = Object.freeze(new Set([
  // Security-sensitive
  'password_hash',
  'password',
  'refresh_token',
  'access_token',
  'api_key',
  'service_role_key',
  'secret',

  // Internal Supabase fields
  'created_at',       // Supabase timestamp (Bubble has 'Created Date')
  'updated_at',       // Supabase timestamp (Bubble has 'Modified Date')
  'bubble_id',        // Internal sync tracking field
  'sync_status',      // Internal sync status
  'bubble_sync_error', // Internal error tracking

  // Supabase-only listing fields (not in Bubble schema)
  'host_type',        // Supabase-only: host classification
  'market_strategy',  // Supabase-only: listing visibility strategy
  'pending',          // Supabase-only: internal status flag
  '_internal',        // Any internal marker fields
]))

/**
 * Fields that need special transformation when syncing TO Bubble
 * These are cases where Supabase field names differ from Bubble
 * @immutable
 */
export const FIELD_MAPPING_TO_BUBBLE: Readonly<Record<string, Record<string, string>>> = Object.freeze({
  // Common patterns across tables
  // Note: Most fields are preserved as-is from Bubble, so minimal mapping needed

  user: Object.freeze({
    // Example mappings if Supabase uses different names
    // 'supabase_field': 'Bubble Field Name',
  }),

  listing: Object.freeze({
    // Example: If we had snake_case versions
    // 'features_qty_bedrooms': 'Features - Qty Bedrooms',
  }),

  proposal: Object.freeze({
    // Proposal-specific mappings
  }),

  // Add table-specific mappings as discovered
})

/**
 * Fields that need special transformation when syncing FROM Bubble
 * (Used during pull operations for reference)
 * @immutable
 */
export const FIELD_MAPPING_FROM_BUBBLE: Readonly<Record<string, Record<string, string>>> = Object.freeze({
  // Reverse of TO_BUBBLE mappings
  // Most fields are preserved as-is
})

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ValidationResult {
  readonly valid: boolean;
  readonly missing: readonly string[];
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if field is read-only in Bubble
 * @pure
 */
const isReadOnlyField = (fieldName: string): boolean =>
  BUBBLE_READ_ONLY_FIELDS.has(fieldName)

/**
 * Check if field should be excluded from sync
 * @pure
 */
const isExcludedField = (fieldName: string): boolean =>
  EXCLUDED_SYNC_FIELDS.has(fieldName)

/**
 * Check if value is null or undefined
 * @pure
 */
const isNullish = (value: unknown): value is null | undefined =>
  value === null || value === undefined

/**
 * Check if table has mapping defined
 * @pure
 */
const hasTableMapping = (tableName: string): boolean =>
  tableName in FIELD_MAPPING_TO_BUBBLE

// ─────────────────────────────────────────────────────────────
// Data Transformers
// ─────────────────────────────────────────────────────────────

/**
 * Get table-specific field mapping
 * @pure
 */
const getTableMapping = (tableName: string): Record<string, string> =>
  FIELD_MAPPING_TO_BUBBLE[tableName] || {}

/**
 * Merge table mapping with custom mapping (custom takes precedence)
 * @pure
 */
const mergeMapping = (
  tableMapping: Record<string, string>,
  customMapping?: Record<string, string>
): Record<string, string> =>
  customMapping ? { ...tableMapping, ...customMapping } : tableMapping

/**
 * Get mapped field name
 * @pure
 */
const getMappedFieldName = (
  fieldName: string,
  mapping: Record<string, string>
): string =>
  mapping[fieldName] || fieldName

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Apply field mapping to transform Supabase data for Bubble
 * @effectful (console logging)
 */
export function applyFieldMappingToBubble(
  data: Record<string, unknown>,
  tableName: string,
  customMapping?: Record<string, string>
): Record<string, unknown> {
  const tableMapping = getTableMapping(tableName)
  const mapping = mergeMapping(tableMapping, customMapping)

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    // Skip read-only fields
    if (isReadOnlyField(key)) {
      console.log(`${LOG_PREFIX} Skipping read-only field: ${key}`)
      continue
    }

    // Skip excluded fields
    if (isExcludedField(key)) {
      console.log(`${LOG_PREFIX} Skipping excluded field: ${key}`)
      continue
    }

    // Skip null/undefined values (Bubble API doesn't like nulls for some fields)
    if (isNullish(value)) {
      continue
    }

    // Apply mapping if exists, otherwise use original key
    const bubbleKey = getMappedFieldName(key, mapping)
    result[bubbleKey] = value
  }

  console.log(`${LOG_PREFIX} Mapped ${Object.keys(data).length} → ${Object.keys(result).length} fields for ${tableName}`)

  return result
}

/**
 * Apply field mapping to transform Bubble data for Supabase
 * @effectful (minimal - pure transformation with logging)
 */
export function applyFieldMappingFromBubble(
  data: Record<string, unknown>,
  tableName: string,
  customMapping?: Record<string, string>
): Record<string, unknown> {
  // Get table-specific mapping
  const tableMapping = FIELD_MAPPING_FROM_BUBBLE[tableName] || {}

  // Merge with custom mapping
  const mapping = mergeMapping(tableMapping, customMapping)

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    // Apply mapping if exists, otherwise use original key
    const supabaseKey = getMappedFieldName(key, mapping)
    result[supabaseKey] = value
  }

  return result
}

/**
 * Get the list of fields that should be excluded when syncing a table
 * @pure
 */
export function getExcludedFields(_tableName: string): readonly string[] {
  const excluded = [...EXCLUDED_SYNC_FIELDS, ...BUBBLE_READ_ONLY_FIELDS]

  // Add table-specific exclusions if any
  // (can be extended based on business logic)

  return Object.freeze(excluded)
}

/**
 * Validate that required fields are present for Bubble
 * @pure
 */
export function validateRequiredFieldsForBubble(
  data: Record<string, unknown>,
  _tableName: string,
  requiredFields: readonly string[]
): ValidationResult {
  const missing = requiredFields.filter(field =>
    isNullish(data[field])
  )

  return Object.freeze({
    valid: missing.length === 0,
    missing: Object.freeze(missing),
  })
}

/**
 * Generate a dynamic field mapping from Supabase column names
 * Useful for auto-generating mappings
 * @pure
 */
export function inferBubbleFieldName(supabaseField: string): string {
  // Most Bubble fields are preserved as-is in Supabase
  // This function handles cases where we need to infer

  // If it looks like snake_case, try to convert
  if (supabaseField.includes('_') && !supabaseField.includes(' ')) {
    // Could be snake_case - check if it's a known pattern
    // For now, return as-is since most fields are already in Bubble format
  }

  return supabaseField
}

/**
 * Build a complete field mapping for a table based on actual data
 * This is useful for generating mappings from sample records
 * @pure
 */
export function buildFieldMappingFromSample(
  supabaseSample: Record<string, unknown>,
  bubbleSample: Record<string, unknown>
): { readonly toBubble: Record<string, string>; readonly fromBubble: Record<string, string> } {
  const toBubble: Record<string, string> = {}
  const fromBubble: Record<string, string> = {}

  // Find matching fields by value comparison (crude but effective)
  // This is a development helper, not for production use

  for (const [sKey, sValue] of Object.entries(supabaseSample)) {
    for (const [bKey, bValue] of Object.entries(bubbleSample)) {
      if (JSON.stringify(sValue) === JSON.stringify(bValue) && sKey !== bKey) {
        toBubble[sKey] = bKey
        fromBubble[bKey] = sKey
      }
    }
  }

  return Object.freeze({
    toBubble: Object.freeze(toBubble),
    fromBubble: Object.freeze(fromBubble),
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

  // Predicates
  isReadOnlyField,
  isExcludedField,
  isNullish,
  hasTableMapping,

  // Transformers
  getTableMapping,
  mergeMapping,
  getMappedFieldName,
})
