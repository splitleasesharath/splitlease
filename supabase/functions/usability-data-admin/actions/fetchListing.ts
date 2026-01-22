/**
 * Fetch Listing Action Handler
 * Get listing by ID (supports both _id and Unique ID)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface FetchListingPayload {
  listingId: string;
}

export async function handleFetchListing(
  payload: FetchListingPayload,
  supabase: SupabaseClient
) {
  const { listingId } = payload;

  if (!listingId) {
    throw new Error('listingId is required');
  }

  console.log('[usability-data-admin] Fetching listing:', listingId);

  // Try fetching by _id first
  let { data, error } = await supabase
    .from('listing')
    .select('_id, "Unique ID", "Listing Name", "Price #1", photos, "Host"')
    .eq('_id', listingId)
    .single();

  // If not found by _id, try by Unique ID
  if (error && error.code === 'PGRST116') {
    const result = await supabase
      .from('listing')
      .select('_id, "Unique ID", "Listing Name", "Price #1", photos, "Host"')
      .eq('Unique ID', listingId)
      .single();

    data = result.data;
    error = result.error;
  }

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error(`Listing not found: ${listingId}`);
    }
    console.error('[usability-data-admin] Fetch listing error:', error);
    throw new Error(`Failed to fetch listing: ${error.message}`);
  }

  // Parse photos JSON if it's a string
  let photos: string[] = [];
  if (data.photos) {
    if (typeof data.photos === 'string') {
      try {
        photos = JSON.parse(data.photos);
      } catch {
        photos = [];
      }
    } else if (Array.isArray(data.photos)) {
      photos = data.photos;
    }
  }

  return {
    listing: {
      id: data._id,
      uniqueId: data['Unique ID'],
      name: data['Listing Name'] || 'Untitled Listing',
      nightlyPrice: data['Price #1'] || 0,
      photos,
      hostId: data['Host'],
    },
  };
}
