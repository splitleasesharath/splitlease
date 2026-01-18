/**
 * Neighborhood Service
 * Fetches neighborhood description from Supabase based on ZIP code
 */

import { supabase } from '../../../../lib/supabase.js';
import { generateNeighborhoodDescription } from '../../../../lib/aiService';

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

/**
 * Fetches neighborhood description from Supabase based on neighborhood name
 * Uses case-insensitive matching against the Display column
 * @param {string} neighborhoodName - The neighborhood name (e.g., "Astoria", "Williamsburg")
 * @returns {Promise<{neighborhoodName: string, description: string} | null>} Neighborhood data or null if not found
 */
export async function getNeighborhoodByName(neighborhoodName) {
  if (!neighborhoodName || neighborhoodName.trim().length === 0) {
    console.warn('[neighborhoodService] No neighborhood name provided for lookup');
    return null;
  }

  try {
    console.log('[neighborhoodService] Fetching neighborhood by name:', neighborhoodName);

    // Use ilike for case-insensitive matching
    const { data, error } = await supabase
      .from('zat_geo_hood_mediumlevel')
      .select('Display, "Neighborhood Description"')
      .ilike('Display', neighborhoodName.trim())
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[neighborhoodService] Error fetching by name:', error);
      return null;
    }

    if (!data) {
      console.warn(`[neighborhoodService] No match for neighborhood name: ${neighborhoodName}`);
      return null;
    }

    const result = {
      neighborhoodName: data.Display || '',
      description: data['Neighborhood Description'] || ''
    };

    console.log('[neighborhoodService] Found neighborhood by name:', result.neighborhoodName);
    return result;
  } catch (err) {
    console.error('[neighborhoodService] Unexpected error in getNeighborhoodByName:', err);
    return null;
  }
}

/**
 * Get neighborhood description with AI fallback
 * First attempts database lookup, falls back to AI generation if not found
 * @param {string} zipCode - ZIP code to lookup
 * @param {Object} addressData - Address data for AI fallback
 * @param {string} addressData.fullAddress - Full street address
 * @param {string} addressData.city - City name
 * @param {string} addressData.state - State abbreviation
 * @param {string} addressData.zip - ZIP code
 * @returns {Promise<{description: string, neighborhoodName?: string, source: 'database' | 'ai'} | null>}
 */
export async function getNeighborhoodDescriptionWithFallback(zipCode, addressData) {
  // First, try database lookup
  const dbResult = await getNeighborhoodByZipCode(zipCode);

  if (dbResult && dbResult.description) {
    console.log('[neighborhoodService] Found description in database');
    return {
      description: dbResult.description,
      neighborhoodName: dbResult.neighborhoodName,
      source: 'database',
    };
  }

  // Fallback to AI generation
  console.log('[neighborhoodService] No database match, generating via AI');

  if (!addressData?.fullAddress && !addressData?.city) {
    console.warn('[neighborhoodService] Insufficient address data for AI generation');
    return null;
  }

  try {
    const aiDescription = await generateNeighborhoodDescription(addressData);

    if (aiDescription) {
      return {
        description: aiDescription,
        source: 'ai',
      };
    }

    return null;
  } catch (error) {
    console.error('[neighborhoodService] AI generation failed:', error);
    return null;
  }
}
