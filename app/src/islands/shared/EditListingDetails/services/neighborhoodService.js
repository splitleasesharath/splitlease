/**
 * Neighborhood Service
 * Fetches neighborhood description from Supabase based on ZIP code
 */

import { supabase } from '../../../../lib/supabase.js';

/**
 * Fetches neighborhood description from Supabase based on ZIP code
 * Uses the RPC function to query the JSONB array in zat_geo_hood_mediumlevel
 * @param {string} zipCode - The ZIP code to search for (e.g., "11109")
 * @returns {Promise<{neighborhoodName: string, description: string} | null>} Neighborhood data or null if not found
 */
export async function getNeighborhoodByZipCode(zipCode) {
  if (!zipCode || zipCode.trim().length === 0) {
    console.warn('[neighborhoodService] No ZIP code provided for neighborhood lookup');
    return null;
  }

  try {
    console.log('[neighborhoodService] Fetching neighborhood for ZIP:', zipCode);

    // Use RPC function to query JSONB array with proper PostgreSQL syntax
    const { data, error } = await supabase.rpc('get_neighborhood_by_zip', {
      zip_code: zipCode
    });

    if (error) {
      console.error('[neighborhoodService] Error fetching neighborhood data:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn(`[neighborhoodService] No neighborhood found for ZIP code: ${zipCode}`);
      return null;
    }

    // Return the first matching neighborhood
    const neighborhood = data[0];
    const result = {
      neighborhoodName: neighborhood.Display || '',
      description: neighborhood['Neighborhood Description'] || ''
    };

    console.log('[neighborhoodService] Found neighborhood:', result.neighborhoodName);
    return result;
  } catch (err) {
    console.error('[neighborhoodService] Unexpected error:', err);
    return null;
  }
}
