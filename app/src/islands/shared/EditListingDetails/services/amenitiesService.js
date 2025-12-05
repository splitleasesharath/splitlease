/**
 * Amenities Service
 * Fetches common amenities from Supabase where pre-set is true
 */

import { supabase } from '../../../../lib/supabase.js';

/**
 * Fetches common amenities from Supabase filtered by type
 * @param {string} type - The amenity type: "In Unit", "In Building", or "In Room"
 * @returns {Promise<string[]>} Array of amenity names
 */
export async function getCommonAmenitiesByType(type) {
  if (!type || type.trim().length === 0) {
    console.warn('[amenitiesService] No amenity type provided');
    return [];
  }

  try {
    console.log('[amenitiesService] Fetching amenities for type:', type);

    const { data, error } = await supabase
      .from('zat_features_amenity')
      .select('Name, "pre-set?", "Type - Amenity Categories"')
      .eq('"pre-set?"', true)
      .eq('"Type - Amenity Categories"', type)
      .order('Name', { ascending: true });

    if (error) {
      console.error('[amenitiesService] Error fetching common amenities:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn(`[amenitiesService] No common amenities found for type: ${type}`);
      return [];
    }

    // Extract just the names
    const names = data.map((amenity) => amenity.Name);
    console.log('[amenitiesService] Fetched amenities:', names);
    return names;
  } catch (err) {
    console.error('[amenitiesService] Unexpected error:', err);
    return [];
  }
}

/**
 * Fetches common amenities for inside unit
 * @returns {Promise<string[]>} Array of amenity names
 */
export async function getCommonInUnitAmenities() {
  return getCommonAmenitiesByType('In Unit');
}

/**
 * Fetches common amenities for building
 * @returns {Promise<string[]>} Array of amenity names
 */
export async function getCommonBuildingAmenities() {
  return getCommonAmenitiesByType('In Building');
}
