/**
 * Borough Service - Lookup borough IDs from reference table
 */

import { supabase } from '../../../../lib/supabase';

/**
 * Look up borough ID by display name from reference table
 * @param {string} boroughName - The display name (e.g., "Brooklyn", "Staten Island")
 * @returns {Promise<string|null>} Borough _id or null if not found
 */
export async function getBoroughIdByName(boroughName) {
  if (!boroughName) return null;

  const cleanName = String(boroughName).trim();
  if (!cleanName) return null;

  try {
    const { data, error } = await supabase
      .schema('reference_table')
      .from('zat_geo_borough_toplevel')
      .select('_id, "Display Borough"')
      .eq('Display Borough', cleanName)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.log('[BoroughService] No borough found for name:', cleanName);
      return null;
    }

    console.log('[BoroughService] Found borough ID:', data._id, 'for name:', cleanName);
    return data._id;
  } catch (err) {
    console.error('[BoroughService] Error looking up borough:', err);
    return null;
  }
}

/**
 * Look up borough ID by zip code from reference table
 * @param {string} zipCode - The zip code to look up
 * @returns {Promise<string|null>} Borough _id or null if not found
 */
export async function getBoroughIdByZipCode(zipCode) {
  if (!zipCode) return null;

  const cleanZip = String(zipCode).trim().substring(0, 5);
  if (!/^\d{5}$/.test(cleanZip)) return null;

  try {
    const { data, error } = await supabase
      .schema('reference_table')
      .from('zat_geo_borough_toplevel')
      .select('_id, "Display Borough"')
      .contains('Zip Codes', [cleanZip])
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.log('[BoroughService] No borough found for zip:', cleanZip);
      return null;
    }

    console.log('[BoroughService] Found borough:', data['Display Borough'], 'for zip:', cleanZip);
    return data._id;
  } catch (err) {
    console.error('[BoroughService] Error looking up borough by zip:', err);
    return null;
  }
}
