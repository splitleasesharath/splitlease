/**
 * Delete Host Listings Action Handler
 * Deletes all listings for a host (with FK cascade handling)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface DeleteHostListingsPayload {
  hostId: string;
}

export async function handleDeleteHostListings(
  payload: DeleteHostListingsPayload,
  supabase: SupabaseClient
) {
  const { hostId } = payload;

  if (!hostId) {
    throw new Error('hostId is required');
  }

  console.log('[usability-data-admin] Deleting host listings for:', hostId);

  // First, get all listing IDs for this host
  const { data: listings, error: fetchError } = await supabase
    .from('listing')
    .select('_id')
    .eq('Host', hostId);

  if (fetchError) {
    console.error('[usability-data-admin] Fetch listings error:', fetchError);
    throw new Error(`Failed to fetch listings: ${fetchError.message}`);
  }

  if (!listings || listings.length === 0) {
    return {
      success: true,
      message: `No listings found for host ${hostId}`,
      deletedCounts: {
        proposals: 0,
        listings: 0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  const listingIds = listings.map(l => l._id);
  console.log('[usability-data-admin] Found listings to delete:', listingIds.length);

  // Delete dependent proposals first (FK constraint handling)
  let proposalsDeleted = 0;
  const { data: proposalData, error: proposalError } = await supabase
    .from('proposal')
    .delete()
    .in('Listing', listingIds)
    .select('_id');

  if (proposalError) {
    console.error('[usability-data-admin] Delete listing proposals error:', proposalError);
    throw new Error(`Failed to delete proposals for listings: ${proposalError.message}`);
  }

  proposalsDeleted = proposalData?.length || 0;
  console.log('[usability-data-admin] Deleted proposals for listings:', proposalsDeleted);

  // Now delete the listings
  const { data: deletedListings, error: deleteError } = await supabase
    .from('listing')
    .delete()
    .eq('Host', hostId)
    .select('_id');

  if (deleteError) {
    console.error('[usability-data-admin] Delete listings error:', deleteError);
    throw new Error(`Failed to delete listings: ${deleteError.message}`);
  }

  const listingsDeleted = deletedListings?.length || 0;
  const timestamp = new Date().toISOString();

  console.log('[usability-data-admin] Host listings deleted:', { hostId, listingsDeleted, timestamp });

  return {
    success: true,
    message: `Deleted ${listingsDeleted} listings for host ${hostId}`,
    deletedCounts: {
      proposals: proposalsDeleted,
      listings: listingsDeleted,
    },
    timestamp,
  };
}
