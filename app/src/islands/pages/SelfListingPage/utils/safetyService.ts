/**
 * Safety Features Service
 * Returns common safety features from predefined constants
 *
 * Note: Unlike amenities and house rules which have database reference tables,
 * safety features do not have a dedicated table in Supabase. The original code
 * queried a non-existent 'zfut_safetyfeatures' table. This service now uses
 * the predefined SAFETY_FEATURES constant for consistency.
 */

import { SAFETY_FEATURES } from '../types/listing.types';

export interface SafetyFeature {
  _id: string;
  Name: string;
  Icon?: string;
  'pre-set?'?: boolean;
}

// Common safety features (subset of all safety features that are preset)
const COMMON_SAFETY_FEATURES = ['Smoke Detector', 'Carbon Monoxide Detector', 'Fire Extinguisher'];

/**
 * Returns common safety features from predefined constants
 * @returns Promise with array of safety feature names
 */
export async function getCommonSafetyFeatures(): Promise<string[]> {
  console.log('[safetyService] Returning common safety features from constants');
  console.log('[safetyService] Common safety features:', COMMON_SAFETY_FEATURES);
  return COMMON_SAFETY_FEATURES;
}
