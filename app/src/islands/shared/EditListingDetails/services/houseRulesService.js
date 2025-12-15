/**
 * House Rules Service
 * Fetches common house rules from Supabase where pre-set is true
 */

import { supabase } from '../../../../lib/supabase.js';

/**
 * Fetches common house rules from Supabase where pre-set is true
 * @returns {Promise<string[]>} Array of house rule names
 */
export async function getCommonHouseRules() {
  try {
    console.log('[houseRulesService] Fetching common house rules...');

    const { data, error } = await supabase
      .schema('reference_table')
      .from('zat_features_houserule')
      .select('Name, "pre-set?"')
      .eq('"pre-set?"', true)
      .order('Name', { ascending: true });

    if (error) {
      console.error('[houseRulesService] Error fetching common house rules:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn('[houseRulesService] No common house rules found');
      return [];
    }

    // Extract just the names
    const names = data.map((rule) => rule.Name);
    console.log('[houseRulesService] Fetched common house rules:', names);
    return names;
  } catch (err) {
    console.error('[houseRulesService] Unexpected error:', err);
    return [];
  }
}
