/**
 * Safety Features Service
 * Fetches common safety features from Supabase where pre-set is true
 */

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
    console.log('[safetyService] Fetching common safety features...');

    const { data, error } = await supabase
      .schema('reference_table')
      .from('zat_features_safetyfeature')
      .select('Name, "pre-set?"')
      .eq('"pre-set?"', true)
      .order('Name', { ascending: true });

    if (error) {
      console.error('[safetyService] Error fetching common safety features:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn('[safetyService] No common safety features found');
      return [];
    }

    // Extract just the names
    const names = data.map((feature: { Name: string }) => feature.Name);
    console.log('[safetyService] Fetched common safety features:', names);
    return names;
  } catch (err) {
    console.error('[safetyService] Unexpected error:', err);
    return [];
  }
}
