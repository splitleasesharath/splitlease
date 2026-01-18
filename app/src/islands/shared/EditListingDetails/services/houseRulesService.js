/**
 * House Rules Service
 * Fetches house rules from Supabase reference table
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

/**
 * Fetches ALL house rules from Supabase reference table
 * Returns objects with id and name for use in multi-select components
 * @returns {Promise<Array<{id: string, name: string, icon?: string, isPreset: boolean}>>}
 */
export async function getAllHouseRules() {
  try {
    console.log('[houseRulesService] Fetching all house rules...');

    const { data, error } = await supabase
      .schema('reference_table')
      .from('zat_features_houserule')
      .select('_id, Name, Icon, "pre-set?"')
      .order('Name', { ascending: true });

    if (error) {
      console.error('[houseRulesService] Error fetching all house rules:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn('[houseRulesService] No house rules found');
      return [];
    }

    // Transform to consistent format for multi-select
    const rules = data.map((rule) => ({
      id: rule._id,
      name: rule.Name,
      icon: rule.Icon || null,
      isPreset: rule['pre-set?'] || false
    }));

    console.log('[houseRulesService] Fetched all house rules:', rules.length);
    return rules;
  } catch (err) {
    console.error('[houseRulesService] Unexpected error:', err);
    return [];
  }
}
