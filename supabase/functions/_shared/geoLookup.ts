/**
 * Geographic Lookup Utilities
 * Split Lease - Supabase Edge Functions
 *
 * Provides functions to look up borough and neighborhood IDs from zip codes.
 * Used during listing creation to populate Location - Borough and Location - Hood FK fields.
 *
 * Reference Tables:
 * - reference_table.zat_geo_borough_toplevel: Borough data with "Zip Codes" (jsonb array)
 * - reference_table.zat_geo_hood_mediumlevel: Neighborhood data with "Zips" (jsonb array)
 *
 * @module _shared/geoLookup
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[geoLookup]'
const ZIP_CODE_LENGTH = 5
const ZIP_CODE_PATTERN = /^\d{5}$/

// ─────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────

export interface BoroughLookupResult {
  readonly _id: string;
  readonly displayName: string;
}

export interface HoodLookupResult {
  readonly _id: string;
  readonly displayName: string;
  readonly boroughId: string;
}

export interface GeoLookupResult {
  readonly borough: BoroughLookupResult | null;
  readonly hood: HoodLookupResult | null;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is a valid zip code string
 * @pure
 */
const isValidZipInput = (zipCode: unknown): zipCode is string =>
  typeof zipCode === 'string' && zipCode.length > 0

/**
 * Check if cleaned zip code is valid (5 digits)
 * @pure
 */
const isValidZipFormat = (cleanZip: string): boolean =>
  ZIP_CODE_PATTERN.test(cleanZip)

// ─────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────

/**
 * Clean and normalize zip code
 * @pure
 */
const cleanZipCode = (zipCode: string): string =>
  zipCode.trim().substring(0, ZIP_CODE_LENGTH)

// ─────────────────────────────────────────────────────────────
// Builder Functions
// ─────────────────────────────────────────────────────────────

/**
 * Build borough lookup result
 * @pure
 */
const buildBoroughResult = (id: string, displayName: string): BoroughLookupResult =>
  Object.freeze({ _id: id, displayName })

/**
 * Build hood lookup result
 * @pure
 */
const buildHoodResult = (id: string, displayName: string, boroughId: string): HoodLookupResult =>
  Object.freeze({ _id: id, displayName, boroughId })

/**
 * Build geo lookup result
 * @pure
 */
const buildGeoResult = (
  borough: BoroughLookupResult | null,
  hood: HoodLookupResult | null
): GeoLookupResult =>
  Object.freeze({ borough, hood })

/**
 * Look up borough ID by zip code
 * Queries zat_geo_borough_toplevel where "Zip Codes" jsonb array contains the zip
 *
 * @param supabaseClient - Supabase client instance
 * @param zipCode - The zip code to look up (e.g., "11201")
 * @returns Borough ID and display name, or null if not found
 * @effectful (database I/O, console logging)
 */
export async function getBoroughByZipCode(
  supabaseClient: ReturnType<typeof createClient>,
  zipCode: string
): Promise<BoroughLookupResult | null> {
  if (!isValidZipInput(zipCode)) {
    console.log(`${LOG_PREFIX} Invalid zip code provided:`, zipCode);
    return null;
  }

  const cleanZip = cleanZipCode(zipCode);
  if (!isValidZipFormat(cleanZip)) {
    console.log(`${LOG_PREFIX} Zip code not 5 digits after cleaning:`, cleanZip);
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .schema('reference_table')
      .from('zat_geo_borough_toplevel')
      .select('_id, "Display Borough"')
      .contains('Zip Codes', [cleanZip])
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`${LOG_PREFIX} Error querying borough by zip:`, error);
      return null;
    }

    if (!data) {
      console.log(`${LOG_PREFIX} No borough found for zip:`, cleanZip);
      return null;
    }

    console.log(`${LOG_PREFIX} Found borough:`, data['Display Borough'], 'for zip:', cleanZip);
    return buildBoroughResult(data._id, data['Display Borough']);
  } catch (err) {
    console.error(`${LOG_PREFIX} Exception in getBoroughByZipCode:`, err);
    return null;
  }
}

/**
 * Look up hood (neighborhood) ID by zip code
 * Queries zat_geo_hood_mediumlevel where "Zips" jsonb array contains the zip
 *
 * @param supabaseClient - Supabase client instance
 * @param zipCode - The zip code to look up (e.g., "11201")
 * @returns Hood ID, display name, and borough ID, or null if not found
 * @effectful (database I/O, console logging)
 */
export async function getHoodByZipCode(
  supabaseClient: ReturnType<typeof createClient>,
  zipCode: string
): Promise<HoodLookupResult | null> {
  if (!isValidZipInput(zipCode)) {
    console.log(`${LOG_PREFIX} Invalid zip code provided for hood lookup:`, zipCode);
    return null;
  }

  const cleanZip = cleanZipCode(zipCode);
  if (!isValidZipFormat(cleanZip)) {
    console.log(`${LOG_PREFIX} Zip code not 5 digits after cleaning:`, cleanZip);
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .schema('reference_table')
      .from('zat_geo_hood_mediumlevel')
      .select('_id, "Display", "Geo-Borough"')
      .contains('Zips', [cleanZip])
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`${LOG_PREFIX} Error querying hood by zip:`, error);
      return null;
    }

    if (!data) {
      console.log(`${LOG_PREFIX} No hood found for zip:`, cleanZip);
      return null;
    }

    console.log(`${LOG_PREFIX} Found hood:`, data['Display'], 'for zip:', cleanZip);
    return buildHoodResult(data._id, data['Display'], data['Geo-Borough']);
  } catch (err) {
    console.error(`${LOG_PREFIX} Exception in getHoodByZipCode:`, err);
    return null;
  }
}

/**
 * Look up both borough and hood by zip code in a single call
 * This is the main function to use when creating/updating listings
 *
 * @param supabaseClient - Supabase client instance
 * @param zipCode - The zip code to look up (e.g., "11201")
 * @returns Object with borough and hood lookup results
 * @effectful (database I/O, console logging)
 */
export async function getGeoByZipCode(
  supabaseClient: ReturnType<typeof createClient>,
  zipCode: string
): Promise<GeoLookupResult> {
  console.log(`${LOG_PREFIX} Looking up geo data for zip:`, zipCode);

  // Run both lookups in parallel for efficiency
  const [borough, hood] = await Promise.all([
    getBoroughByZipCode(supabaseClient, zipCode),
    getHoodByZipCode(supabaseClient, zipCode)
  ]);

  // If we found a hood but not a borough, use the hood's borough reference
  let finalBorough = borough;
  if (!finalBorough && hood?.boroughId) {
    console.log(`${LOG_PREFIX} Using borough from hood reference:`, hood.boroughId);
    try {
      const { data } = await supabaseClient
        .schema('reference_table')
        .from('zat_geo_borough_toplevel')
        .select('_id, "Display Borough"')
        .eq('_id', hood.boroughId)
        .maybeSingle();

      if (data) {
        finalBorough = buildBoroughResult(data._id, data['Display Borough']);
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Error fetching borough from hood reference:`, err);
    }
  }

  console.log(`${LOG_PREFIX} Final result - borough:`, finalBorough?.displayName, 'hood:', hood?.displayName);

  return buildGeoResult(finalBorough, hood);
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
  ZIP_CODE_LENGTH,
  ZIP_CODE_PATTERN,

  // Validation predicates
  isValidZipInput,
  isValidZipFormat,

  // Utility functions
  cleanZipCode,

  // Builder functions
  buildBoroughResult,
  buildHoodResult,
  buildGeoResult,
})
