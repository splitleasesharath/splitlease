import { supabase } from '../../../../lib/supabase.js';
import { generateNeighborhoodDescription } from '../../../../lib/aiService';

export interface Neighborhood {
  neighborhood_name: string;
  description: string;
  zips: string[];
}

export interface NeighborhoodResult {
  description: string;
  neighborhood_name?: string;
  source: 'database' | 'ai';
}

/**
 * Fetches neighborhood description from Supabase based on ZIP code
 * @param zipCode - The ZIP code to search for (e.g., "11109")
 * @returns Promise with neighborhood data or null if not found
 */
export async function getNeighborhoodByZipCode(zipCode: string): Promise<Neighborhood | null> {
  if (!zipCode || zipCode.trim().length === 0) {
    console.warn('No ZIP code provided for neighborhood lookup');
    return null;
  }

  try {
    // Use RPC function to query JSONB array with proper PostgreSQL syntax
    // This bypasses issues with Supabase JS client's JSONB handling
    const { data, error } = await supabase.rpc('get_neighborhood_by_zip', {
      zip_code: zipCode
    });

    if (error) {
      console.error('Error fetching neighborhood data:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn(`No neighborhood found for ZIP code: ${zipCode}`);
      return null;
    }

    // Return the first matching neighborhood
    const neighborhood = data[0];
    return {
      neighborhood_name: neighborhood.Display || '',
      description: neighborhood['Neighborhood Description'] || '',
      zips: neighborhood.Zips || []
    };
  } catch (err) {
    console.error('Unexpected error in getNeighborhoodByZipCode:', err);
    return null;
  }
}

/**
 * Extracts ZIP code from a full address string
 * @param address - Full address string
 * @returns ZIP code or empty string if not found
 */
export function extractZipCode(address: string): string {
  if (!address) return '';

  // Match 5-digit ZIP code (with optional +4 extension)
  const zipMatch = address.match(/\b(\d{5})(-\d{4})?\b/);
  return zipMatch ? zipMatch[1] : '';
}

/**
 * Get neighborhood description with AI fallback
 * First attempts database lookup, falls back to AI generation if not found
 * @param zipCode - ZIP code to lookup
 * @param addressData - Address data for AI fallback
 * @returns Promise with neighborhood result or null
 */
export async function getNeighborhoodDescriptionWithFallback(
  zipCode: string,
  addressData: {
    fullAddress: string;
    city: string;
    state: string;
    zip: string;
  }
): Promise<NeighborhoodResult | null> {
  // First, try database lookup
  const dbResult = await getNeighborhoodByZipCode(zipCode);

  if (dbResult && dbResult.description) {
    console.log('[neighborhoodService] Found description in database');
    return {
      description: dbResult.description,
      neighborhood_name: dbResult.neighborhood_name,
      source: 'database',
    };
  }

  // Fallback to AI generation
  console.log('[neighborhoodService] No database match, generating via AI');

  if (!addressData.fullAddress && !addressData.city) {
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
