/**
 * Table Name Mapping - Supabase ↔ Bubble
 * Split Lease - bubble_sync/lib
 *
 * Supabase uses underscores (snake_case), Bubble uses hyphens or camelCase.
 * This registry provides bidirectional mapping.
 *
 * @module bubble_sync/lib/tableMapping
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[tableMapping]'
const HYPHEN = '-'
const UNDERSCORE = '_'

/**
 * Complete list of tables from bubble_to_supabase_sync.py
 * Bidirectional mapping: Supabase name → Bubble name
 * @immutable
 */
const TO_BUBBLE_MAPPING = Object.freeze({
  // Core tables
  'user': 'user',
  'listing': 'listing',
  'proposal': 'proposal',

  // Booking tables (hyphenated in Bubble)
  'bookings_stays': 'bookings-stays',
  'bookings_leases': 'bookings-leases',

  // Related tables
  'listing_photo': 'listing-photo',
  'paymentrecords': 'paymentrecords',
  '_message': '_message',
  'mainreview': 'mainreview',
  'housemanual': 'housemanual',
  'visit': 'visit',
  'virtualmeetingschedulesandlinks': 'virtualmeetingschedulesandlinks',
  'rentalapplication': 'rentalapplication',

  // Lookup/reference tables (zat_ prefix)
  'zat_geo_borough_toplevel': 'zat_geo_borough_toplevel',
  'zat_geo_hood_mediumlevel': 'zat_geo_hood_mediumlevel',
  'zat_location': 'zat_location',
  'zat_aisuggestions': 'zat_aisuggestions',
  'zat_features_amenities_in_unit': 'zat_features_amenities_in_unit',
  'zat_features_house_rules': 'zat_features_house_rules',

  // Analytics/logging tables
  'datacollection_searchlogging': 'datacollection_searchlogging',

  // Other tables
  'num': 'num',
  'housemanualphotos': 'housemanualphotos',
  'remindersfromhousemanual': 'remindersfromhousemanual',
  'narration': 'narration',
  'ratingdetail_reviews_': 'ratingdetail_reviews_',
  'reviewslistingsexternal': 'reviewslistingsexternal',
} as const)

/**
 * Reverse mapping: Bubble name → Supabase name
 * @immutable
 */
const FROM_BUBBLE_MAPPING = Object.freeze({
  // Core tables
  'user': 'user',
  'listing': 'listing',
  'proposal': 'proposal',

  // Booking tables
  'bookings-stays': 'bookings_stays',
  'bookings-leases': 'bookings_leases',

  // Related tables
  'listing-photo': 'listing_photo',
  'paymentrecords': 'paymentrecords',
  '_message': '_message',
  'mainreview': 'mainreview',
  'housemanual': 'housemanual',
  'visit': 'visit',
  'virtualmeetingschedulesandlinks': 'virtualmeetingschedulesandlinks',
  'rentalapplication': 'rentalapplication',

  // Lookup/reference tables
  'zat_geo_borough_toplevel': 'zat_geo_borough_toplevel',
  'zat_geo_hood_mediumlevel': 'zat_geo_hood_mediumlevel',
  'zat_location': 'zat_location',
  'zat_aisuggestions': 'zat_aisuggestions',
  'zat_features_amenities_in_unit': 'zat_features_amenities_in_unit',
  'zat_features_house_rules': 'zat_features_house_rules',

  // Analytics/logging tables
  'datacollection_searchlogging': 'datacollection_searchlogging',

  // Other tables
  'num': 'num',
  'housemanualphotos': 'housemanualphotos',
  'remindersfromhousemanual': 'remindersfromhousemanual',
  'narration': 'narration',
  'ratingdetail_reviews_': 'ratingdetail_reviews_',
  'reviewslistingsexternal': 'reviewslistingsexternal',
} as const)

/**
 * Combined table mapping export for backwards compatibility
 * @immutable
 */
export const TABLE_MAPPING = Object.freeze({
  toBubble: TO_BUBBLE_MAPPING as Record<string, string>,
  fromBubble: FROM_BUBBLE_MAPPING as Record<string, string>,
})

// ─────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────

type SupabaseTableName = keyof typeof TO_BUBBLE_MAPPING
type BubbleTableName = keyof typeof FROM_BUBBLE_MAPPING

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if table name exists in to-Bubble mapping
 * @pure
 */
const hasSupabaseMapping = (tableName: string): tableName is SupabaseTableName =>
  tableName in TO_BUBBLE_MAPPING

/**
 * Check if table name exists in from-Bubble mapping
 * @pure
 */
const hasBubbleMapping = (tableName: string): tableName is BubbleTableName =>
  tableName in FROM_BUBBLE_MAPPING

// ─────────────────────────────────────────────────────────────
// Data Transformers
// ─────────────────────────────────────────────────────────────

/**
 * Convert hyphens to underscores (Bubble → Supabase fallback)
 * @pure
 */
const convertHyphensToUnderscores = (name: string): string =>
  name.replace(new RegExp(HYPHEN, 'g'), UNDERSCORE)

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Get Bubble table name from Supabase table name
 * @pure (with console logging side effect)
 */
export function getBubbleTableName(supabaseTable: string): string {
  if (hasSupabaseMapping(supabaseTable)) {
    return TO_BUBBLE_MAPPING[supabaseTable]
  }

  console.warn(`${LOG_PREFIX} No mapping found for Supabase table: ${supabaseTable}, using as-is`)
  return supabaseTable
}

/**
 * Get Supabase table name from Bubble table name
 * @pure (with console logging side effect)
 */
export function getSupabaseTableName(bubbleTable: string): string {
  if (hasBubbleMapping(bubbleTable)) {
    return FROM_BUBBLE_MAPPING[bubbleTable]
  }

  console.warn(`${LOG_PREFIX} No mapping found for Bubble table: ${bubbleTable}, using as-is`)
  // Convert hyphens to underscores as fallback
  return convertHyphensToUnderscores(bubbleTable)
}

/**
 * Check if a table is supported for sync
 * @pure
 */
export function isTableSupported(tableName: string): boolean {
  return hasSupabaseMapping(tableName) || hasBubbleMapping(tableName)
}

/**
 * Get all supported Supabase table names
 * @pure
 */
export function getSupportedSupabaseTables(): readonly string[] {
  return Object.freeze(Object.keys(TO_BUBBLE_MAPPING))
}

/**
 * Get all supported Bubble table names
 * @pure
 */
export function getSupportedBubbleTables(): readonly string[] {
  return Object.freeze(Object.keys(FROM_BUBBLE_MAPPING))
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
  HYPHEN,
  UNDERSCORE,
  TO_BUBBLE_MAPPING,
  FROM_BUBBLE_MAPPING,

  // Predicates
  hasSupabaseMapping,
  hasBubbleMapping,

  // Transformers
  convertHyphensToUnderscores,
})
