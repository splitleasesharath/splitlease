import { supabase } from '../../../lib/supabase';

export interface Amenity {
  _id: string;
  Name: string;
  'Type - Amenity Categories': string;
  Icon?: string;
  'pre-set?'?: boolean;
}

/**
 * Fetches common amenities from Supabase filtered by type
 * @param type - The amenity type: "In Unit", "In Building", or "In Room"
 * @returns Promise with array of amenity names
 */
export async function getCommonAmenitiesByType(type: string): Promise<string[]> {
  if (!type || type.trim().length === 0) {
    console.warn('No amenity type provided');
    return [];
  }

  try {
    console.log('Fetching amenities for type:', type);

    const { data, error } = await supabase
      .from('zat_features_amenity')
      .select('Name, "pre-set?", "Type - Amenity Categories"')
      .eq('"pre-set?"', true)
      .eq('"Type - Amenity Categories"', type)
      .order('Name', { ascending: true });

    console.log('Supabase response:', { data, error });

    if (error) {
      console.error('Error fetching common amenities:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn(`No common amenities found for type: ${type}`);
      return [];
    }

    // Extract just the names
    const names = data.map((amenity) => amenity.Name);
    console.log('Fetched amenities:', names);
    return names;
  } catch (err) {
    console.error('Unexpected error in getCommonAmenitiesByType:', err);
    return [];
  }
}

/**
 * Fetches common amenities for inside unit
 * @returns Promise with array of amenity names
 */
export async function getCommonInUnitAmenities(): Promise<string[]> {
  return getCommonAmenitiesByType('In Unit');
}

/**
 * Fetches common amenities for building
 * @returns Promise with array of amenity names
 */
export async function getCommonBuildingAmenities(): Promise<string[]> {
  return getCommonAmenitiesByType('In Building');
}
