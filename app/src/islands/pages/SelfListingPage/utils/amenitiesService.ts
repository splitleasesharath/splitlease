import { supabase } from '../../../../lib/supabase.js';

export interface Amenity {
  _id: string;
  Name: string;
  'Type - Amenity Categories': string;
  Icon?: string;
  'pre-set?'?: boolean;
}

/**
 * Fetches ALL amenities from Supabase filtered by category type
 * Used to populate the checkbox list in Section2Features
 * @param type - The amenity type: "In Unit" or "In Building"
 * @returns Promise with array of amenity names
 */
export async function getAllAmenitiesByType(type: string): Promise<string[]> {
  if (!type || type.trim().length === 0) {
    console.warn('No amenity type provided');
    return [];
  }

  try {
    console.log('Fetching all amenities for type:', type);

    const { data, error } = await supabase
      .from('zat_features_amenity')
      .select('Name, "Type - Amenity Categories"')
      .eq('"Type - Amenity Categories"', type)
      .eq('pending', false)
      .order('Name', { ascending: true });

    if (error) {
      console.error('Error fetching amenities:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn(`No amenities found for type: ${type}`);
      return [];
    }

    const names = data.map((amenity) => amenity.Name);
    console.log(`Fetched ${names.length} amenities for type "${type}":`, names);
    return names;
  } catch (err) {
    console.error('Unexpected error in getAllAmenitiesByType:', err);
    return [];
  }
}

/**
 * Fetches all In Unit amenities from the database
 * @returns Promise with array of amenity names
 */
export async function getAllInUnitAmenities(): Promise<string[]> {
  return getAllAmenitiesByType('In Unit');
}

/**
 * Fetches all In Building amenities from the database
 * @returns Promise with array of amenity names
 */
export async function getAllBuildingAmenities(): Promise<string[]> {
  return getAllAmenitiesByType('In Building');
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
