/**
 * Safety Features Service
 * Returns common safety features from predefined constants
 *
 * Note: Unlike amenities and house rules which have database reference tables,
 * safety features do not have a dedicated table in Supabase. The original code
 * queried a non-existent 'zfut_safetyfeatures' table. This service now uses
 * the predefined COMMON_SAFETY_FEATURES constant for consistency.
 */

import { COMMON_SAFETY_FEATURES } from '../constants.js';

/**
 * Returns common safety features from predefined constants
 * @returns {Promise<string[]>} Array of safety feature names
 */
export async function getCommonSafetyFeatures() {
  console.log('[safetyFeaturesService] Returning common safety features from constants');
  console.log('[safetyFeaturesService] Common safety features:', COMMON_SAFETY_FEATURES);
  return COMMON_SAFETY_FEATURES;
}
