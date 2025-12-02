import { supabase } from '../../../../lib/supabase.js';

export interface SafetyFeature {
  _id: string;
  Name: string;
  Icon?: string;
  'pre-set?'?: boolean;
}

/**
 * Fetches common safety features from Supabase where pre-set is true
 * @returns Promise with array of safety feature names
 */
export async function getCommonSafetyFeatures(): Promise<string[]> {
  try {
    console.log('Fetching common safety features...');

    const { data, error } = await supabase
      .from('zfut_safetyfeatures')
      .select('Name, "pre-set?"')
      .eq('"pre-set?"', true)
      .order('Name', { ascending: true });

    console.log('Supabase safety features response:', { data, error });

    if (error) {
      console.error('Error fetching common safety features:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn('No common safety features found');
      return [];
    }

    // Extract just the names
    const names = data.map((feature) => feature.Name);
    console.log('Fetched common safety features:', names);
    return names;
  } catch (err) {
    console.error('Unexpected error in getCommonSafetyFeatures:', err);
    return [];
  }
}
