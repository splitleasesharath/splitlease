/**
 * Geographic Lookup Utilities
 *
 * Provides functions to look up borough and neighborhood IDs from zip codes.
 * Used during listing creation to populate Location - Borough and Location - Hood FK fields.
 *
 * Reference Tables:
 * - reference_table.zat_geo_borough_toplevel: Borough data with "Zip Codes" (jsonb array)
 * - reference_table.zat_geo_hood_mediumlevel: Neighborhood data with "Zips" (jsonb array)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types for geo lookup results
export interface BoroughLookupResult {
  _id: string;
  displayName: string;
}

export interface HoodLookupResult {
  _id: string;
  displayName: string;
  boroughId: string;
}

export interface GeoLookupResult {
  borough: BoroughLookupResult | null;
  hood: HoodLookupResult | null;
}

/**
 * Look up borough ID by zip code
 * Queries zat_geo_borough_toplevel where "Zip Codes" jsonb array contains the zip
 *
 * @param supabaseClient - Supabase client instance
 * @param zipCode - The zip code to look up (e.g., "11201")
 * @returns Borough ID and display name, or null if not found
 */
export async function getBoroughByZipCode(
  supabaseClient: ReturnType<typeof createClient>,
  zipCode: string
): Promise<BoroughLookupResult | null> {
  if (!zipCode || typeof zipCode !== 'string') {
    console.log('[geoLookup] Invalid zip code provided:', zipCode);
    return null;
  }

  // Clean zip code - take first 5 digits
  const cleanZip = zipCode.trim().substring(0, 5);
  if (!/^\d{5}$/.test(cleanZip)) {
    console.log('[geoLookup] Zip code not 5 digits after cleaning:', cleanZip);
    return null;
  }

  try {
    // Query borough where "Zip Codes" jsonb array contains the zip
    const { data, error } = await supabaseClient
      .schema('reference_table')
      .from('zat_geo_borough_toplevel')
      .select('_id, "Display Borough"')
      .contains('Zip Codes', [cleanZip])
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[geoLookup] Error querying borough by zip:', error);
      return null;
    }

    if (!data) {
      console.log('[geoLookup] No borough found for zip:', cleanZip);
      return null;
    }

    console.log('[geoLookup] Found borough:', data['Display Borough'], 'for zip:', cleanZip);
    return {
      _id: data._id,
      displayName: data['Display Borough']
    };
  } catch (err) {
    console.error('[geoLookup] Exception in getBoroughByZipCode:', err);
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
 */
export async function getHoodByZipCode(
  supabaseClient: ReturnType<typeof createClient>,
  zipCode: string
): Promise<HoodLookupResult | null> {
  if (!zipCode || typeof zipCode !== 'string') {
    console.log('[geoLookup] Invalid zip code provided for hood lookup:', zipCode);
    return null;
  }

  // Clean zip code - take first 5 digits
  const cleanZip = zipCode.trim().substring(0, 5);
  if (!/^\d{5}$/.test(cleanZip)) {
    console.log('[geoLookup] Zip code not 5 digits after cleaning:', cleanZip);
    return null;
  }

  try {
    // Query hood where "Zips" jsonb array contains the zip
    const { data, error } = await supabaseClient
      .schema('reference_table')
      .from('zat_geo_hood_mediumlevel')
      .select('_id, "Display", "Geo-Borough"')
      .contains('Zips', [cleanZip])
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[geoLookup] Error querying hood by zip:', error);
      return null;
    }

    if (!data) {
      console.log('[geoLookup] No hood found for zip:', cleanZip);
      return null;
    }

    console.log('[geoLookup] Found hood:', data['Display'], 'for zip:', cleanZip);
    return {
      _id: data._id,
      displayName: data['Display'],
      boroughId: data['Geo-Borough']
    };
  } catch (err) {
    console.error('[geoLookup] Exception in getHoodByZipCode:', err);
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
 */
export async function getGeoByZipCode(
  supabaseClient: ReturnType<typeof createClient>,
  zipCode: string
): Promise<GeoLookupResult> {
  console.log('[geoLookup] Looking up geo data for zip:', zipCode);

  // Run both lookups in parallel for efficiency
  const [borough, hood] = await Promise.all([
    getBoroughByZipCode(supabaseClient, zipCode),
    getHoodByZipCode(supabaseClient, zipCode)
  ]);

  // If we found a hood but not a borough, use the hood's borough reference
  let finalBorough = borough;
  if (!finalBorough && hood?.boroughId) {
    console.log('[geoLookup] Using borough from hood reference:', hood.boroughId);
    // Fetch borough display name
    try {
      const { data } = await supabaseClient
        .schema('reference_table')
        .from('zat_geo_borough_toplevel')
        .select('_id, "Display Borough"')
        .eq('_id', hood.boroughId)
        .maybeSingle();

      if (data) {
        finalBorough = {
          _id: data._id,
          displayName: data['Display Borough']
        };
      }
    } catch (err) {
      console.error('[geoLookup] Error fetching borough from hood reference:', err);
    }
  }

  console.log('[geoLookup] Final result - borough:', finalBorough?.displayName, 'hood:', hood?.displayName);

  return {
    borough: finalBorough,
    hood
  };
}
