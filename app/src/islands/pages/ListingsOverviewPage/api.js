/**
 * Listings Overview API Layer
 *
 * Direct Supabase queries for the Listings Overview page.
 * Uses JOINs to reference tables for borough/neighborhood names.
 *
 * IMPORTANT: All updates use the changed-fields-only pattern
 * to avoid FK constraint violations on the listing table.
 */

import { supabase } from '../../../lib/supabase.js';
import { PAGE_SIZE } from './constants.js';

// ============================================================================
// GEOGRAPHIC REFERENCE DATA
// ============================================================================

/**
 * Fetch all boroughs from the reference table.
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function getBoroughs() {
  const { data, error } = await supabase
    .from('zat_geo_borough_toplevel')
    .select('_id, "Display Borough"')
    .order('"Display Borough"');

  if (error) {
    console.error('[ListingsOverview] Failed to fetch boroughs:', error);
    return [];
  }

  return data.map(row => ({
    id: row._id,
    name: row['Display Borough'],
  }));
}

/**
 * Fetch neighborhoods, optionally filtered by borough.
 * @param {string|null} boroughId - Optional borough ID to filter by
 * @returns {Promise<Array<{id: string, name: string, boroughId: string}>>}
 */
export async function getNeighborhoods(boroughId = null) {
  let query = supabase
    .from('zat_geo_hood_mediumlevel')
    .select('_id, "Display", "Geo-Borough"')
    .order('"Display"');

  if (boroughId) {
    query = query.eq('"Geo-Borough"', boroughId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[ListingsOverview] Failed to fetch neighborhoods:', error);
    return [];
  }

  return data.map(row => ({
    id: row._id,
    name: row['Display'],
    boroughId: row['Geo-Borough'],
  }));
}

// ============================================================================
// LISTINGS QUERIES
// ============================================================================

/**
 * Fetch listings with filters and pagination.
 * Joins to reference tables to get human-readable borough/neighborhood names.
 *
 * @param {Object} options
 * @param {Object} options.filters - Filter state object
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.pageSize - Items per page
 * @returns {Promise<{data: Array, count: number, error: Error|null}>}
 */
export async function getListings({ filters, page = 1, pageSize = PAGE_SIZE }) {
  // Build the query with JOINs to reference tables
  // Note: Supabase doesn't support cross-schema JOINs directly in the JS client,
  // so we fetch listings first, then resolve names in a second query.

  let query = supabase
    .from('listing')
    .select(`
      _id,
      "Name",
      "Description",
      "Host User",
      "Host email",
      "host name",
      "Host phone",
      "Location - Borough",
      "Location - Hood",
      "Nightly Host Rate for 1 night",
      "Nightly Host Rate for 3 nights",
      "Price Override",
      "Active",
      "Approved",
      "Complete",
      "pending",
      "Deleted",
      "isForUsability",
      "Showcase",
      "Features - Photos",
      "Features - Amenities In-Unit",
      "Errors",
      "Modified Date",
      "Created Date",
      "Listing Code OP"
    `, { count: 'exact' });

  // Exclude deleted listings by default
  query = query.or('"Deleted".is.null,"Deleted".eq.false');

  // Apply filters
  if (filters.showOnlyAvailable) {
    query = query.eq('"Active"', true).eq('"Approved"', true);
  }

  if (filters.completedListings && !filters.notFinishedListings) {
    query = query.eq('"Complete"', true);
  } else if (filters.notFinishedListings && !filters.completedListings) {
    query = query.or('"Complete".is.null,"Complete".eq.false');
  }

  if (filters.selectedBorough) {
    query = query.eq('"Location - Borough"', filters.selectedBorough);
  }

  if (filters.selectedNeighborhood) {
    query = query.eq('"Location - Hood"', filters.selectedNeighborhood);
  }

  if (filters.searchQuery) {
    const searchTerm = `%${filters.searchQuery}%`;
    query = query.or(`"Name".ilike.${searchTerm},"Host email".ilike.${searchTerm},"host name".ilike.${searchTerm},"Listing Code OP".ilike.${searchTerm}`);
  }

  if (filters.showAllFilter === 'active') {
    query = query.eq('"Active"', true);
  } else if (filters.showAllFilter === 'inactive') {
    query = query.or('"Active".is.null,"Active".eq.false');
  } else if (filters.showAllFilter === 'showcase') {
    query = query.eq('"Showcase"', true);
  } else if (filters.showAllFilter === 'usability') {
    query = query.eq('"isForUsability"', true);
  }

  if (filters.startDate) {
    query = query.gte('"Modified Date"', filters.startDate.toISOString());
  }

  if (filters.endDate) {
    query = query.lte('"Modified Date"', filters.endDate.toISOString());
  }

  // Pagination
  const from = (page - 1) * pageSize;
  query = query
    .order('"Modified Date"', { ascending: false })
    .range(from, from + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[ListingsOverview] Failed to fetch listings:', error);
    return { data: [], count: 0, error };
  }

  return { data: data || [], count: count || 0, error: null };
}

/**
 * Resolve borough and neighborhood names for a list of listings.
 * Called after getListings to enrich data with display names.
 *
 * @param {Array} listings - Listings from getListings
 * @param {Array} boroughs - Borough lookup data
 * @param {Array} neighborhoods - Neighborhood lookup data
 * @returns {Array} Listings with resolved borough/neighborhood names
 */
export function resolveLocationNames(listings, boroughs, neighborhoods) {
  const boroughMap = new Map(boroughs.map(b => [b.id, b.name]));
  const neighborhoodMap = new Map(neighborhoods.map(n => [n.id, n.name]));

  return listings.map(listing => ({
    ...listing,
    boroughName: boroughMap.get(listing['Location - Borough']) || 'Unknown',
    neighborhoodName: neighborhoodMap.get(listing['Location - Hood']) || 'Unknown',
  }));
}

// ============================================================================
// LISTING UPDATES
// ============================================================================

/**
 * Update a listing. ONLY sends changed fields to avoid FK constraint violations.
 *
 * @param {string} id - Listing ID
 * @param {Object} changes - Object containing only the fields to update
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updateListing(id, changes) {
  // Add timestamp
  const updatePayload = {
    ...changes,
    'Modified Date': new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('listing')
    .update(updatePayload)
    .eq('_id', id)
    .select()
    .single();

  if (error) {
    console.error('[ListingsOverview] Failed to update listing:', {
      id,
      changes,
      error: { code: error.code, message: error.message, details: error.details, hint: error.hint },
    });
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Soft delete a listing by setting Deleted = true.
 *
 * @param {string} id - Listing ID
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deleteListing(id) {
  const { error } = await supabase
    .from('listing')
    .update({
      Deleted: true,
      'Modified Date': new Date().toISOString(),
    })
    .eq('_id', id);

  if (error) {
    console.error('[ListingsOverview] Failed to delete listing:', error);
    return { success: false, error };
  }

  return { success: true, error: null };
}

// ============================================================================
// ERROR MANAGEMENT
// ============================================================================

/**
 * Add an error to a listing's Errors JSONB array.
 *
 * @param {string} listingId - Listing ID
 * @param {string} errorCode - Error code or message to add
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function addError(listingId, errorCode) {
  // First, get current errors
  const { data: listing, error: fetchError } = await supabase
    .from('listing')
    .select('"Errors"')
    .eq('_id', listingId)
    .single();

  if (fetchError) {
    console.error('[ListingsOverview] Failed to fetch listing for error add:', fetchError);
    return { data: null, error: fetchError };
  }

  const currentErrors = listing?.Errors || [];

  // Check if error already exists
  if (currentErrors.includes(errorCode)) {
    return { data: listing, error: null };
  }

  // Add new error
  const updatedErrors = [...currentErrors, errorCode];

  const { data, error } = await supabase
    .from('listing')
    .update({
      Errors: updatedErrors,
      'Modified Date': new Date().toISOString(),
    })
    .eq('_id', listingId)
    .select()
    .single();

  if (error) {
    console.error('[ListingsOverview] Failed to add error:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Clear all errors from a listing.
 *
 * @param {string} listingId - Listing ID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function clearErrors(listingId) {
  const { data, error } = await supabase
    .from('listing')
    .update({
      Errors: [],
      'Modified Date': new Date().toISOString(),
    })
    .eq('_id', listingId)
    .select()
    .single();

  if (error) {
    console.error('[ListingsOverview] Failed to clear errors:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk increment prices for multiple listings.
 * Updates both nightly rate and 3-night rate.
 *
 * @param {Array<string>} listingIds - Array of listing IDs
 * @param {number} multiplier - Price multiplier (e.g., 1.75 for 75% increase)
 * @returns {Promise<{results: Array, successCount: number, failCount: number}>}
 */
export async function bulkIncrementPrices(listingIds, multiplier) {
  const results = [];

  for (const id of listingIds) {
    // Fetch current prices
    const { data: listing, error: fetchError } = await supabase
      .from('listing')
      .select('"Nightly Host Rate for 1 night", "Nightly Host Rate for 3 nights"')
      .eq('_id', id)
      .single();

    if (fetchError) {
      results.push({ id, success: false, error: fetchError.message });
      continue;
    }

    const currentNightly = listing['Nightly Host Rate for 1 night'] || 0;
    const current3Night = listing['Nightly Host Rate for 3 nights'] || 0;

    // Calculate new prices
    const newNightly = Math.round(currentNightly * multiplier * 100) / 100;
    const new3Night = Math.round(current3Night * multiplier * 100) / 100;

    // Update (only price fields to avoid FK issues)
    const { error: updateError } = await supabase
      .from('listing')
      .update({
        'Nightly Host Rate for 1 night': newNightly,
        'Nightly Host Rate for 3 nights': new3Night,
        'Modified Date': new Date().toISOString(),
      })
      .eq('_id', id);

    if (updateError) {
      results.push({ id, success: false, error: updateError.message });
    } else {
      results.push({ id, success: true, newNightly, new3Night });
    }
  }

  return {
    results,
    successCount: results.filter(r => r.success).length,
    failCount: results.filter(r => !r.success).length,
  };
}
