/**
 * Suggested Proposal Service
 *
 * API calls for the Create Suggested Proposal page.
 * Uses direct Supabase queries for search and the proposal Edge Function for creation.
 */

import { supabase } from '../../../lib/supabase.js';

// ============================================================================
// LISTING OPERATIONS
// ============================================================================

/**
 * Search listings by host name, email, listing name, unique ID, or rental type
 */
export async function searchListings(searchTerm) {
  try {
    const { data, error } = await supabase
      .from('listing')
      .select(`
        _id,
        "Name",
        "Description",
        "Active",
        "Approved",
        "Host User",
        "Host email",
        "host name",
        "Location - Address",
        "Location - City",
        "Location - State",
        "Location - Borough",
        "Location - Hood",
        "Location - Zip Code",
        "Features - Photos",
        "Features - Qty Bedrooms",
        "Features - Qty Bathrooms",
        "Features - Qty Beds",
        "Features - Type of Space",
        "rental type",
        "Nights Available (List of Nights) ",
        "Days Available (List of Days)",
        "Minimum Nights",
        "Maximum Weeks",
        "💰Nightly Host Rate for 2 nights",
        "💰Nightly Host Rate for 3 nights",
        "💰Nightly Host Rate for 4 nights",
        "💰Nightly Host Rate for 5 nights",
        "💰Nightly Host Rate for 6 nights",
        "💰Nightly Host Rate for 7 nights",
        "💰Cleaning Cost / Maintenance Fee",
        "💰Damage Deposit"
      `)
      .eq('Deleted', false)
      .eq('Active', true)
      .or(`Name.ilike.%${searchTerm}%,host name.ilike.%${searchTerm}%,Host email.ilike.%${searchTerm}%,_id.ilike.%${searchTerm}%,rental type.ilike.%${searchTerm}%`)
      .limit(20);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('[suggestedProposalService] searchListings error:', error);
    return { data: [], error: error.message };
  }
}

/**
 * Get photos for a listing
 */
export async function getListingPhotos(listingId) {
  try {
    const { data, error } = await supabase
      .from('listing_photo')
      .select('*')
      .eq('Listing', listingId)
      .eq('Active', true)
      .order('SortOrder', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('[suggestedProposalService] getListingPhotos error:', error);
    return { data: [], error: error.message };
  }
}

// ============================================================================
// USER/GUEST OPERATIONS
// ============================================================================

/**
 * Search guests by name, email, phone, or unique ID
 */
export async function searchGuests(searchTerm) {
  try {
    const { data, error } = await supabase
      .from('user')
      .select(`
        _id,
        "Name - First",
        "Name - Last",
        "Name - Full",
        email,
        "email as text",
        "Phone Number (as text)",
        "Profile Photo",
        "About Me / Bio",
        "Type - User Current",
        "Created Date"
      `)
      .or(`"Name - Full".ilike.%${searchTerm}%,"Name - First".ilike.%${searchTerm}%,"Name - Last".ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,"Phone Number (as text)".ilike.%${searchTerm}%,_id.ilike.%${searchTerm}%`)
      .limit(20);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('[suggestedProposalService] searchGuests error:', error);
    return { data: [], error: error.message };
  }
}

/**
 * Get existing proposals for a user on a specific listing
 */
export async function getUserProposalsForListing(userId, listingId) {
  try {
    const { data, error } = await supabase
      .from('proposal')
      .select('_id, Status')
      .eq('Guest', userId)
      .eq('Listing', listingId)
      .neq('Deleted', true);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('[suggestedProposalService] getUserProposalsForListing error:', error);
    return { data: [], error: error.message };
  }
}

// ============================================================================
// PROPOSAL CREATION
// ============================================================================

/**
 * Create a suggested proposal via the proposal Edge Function
 *
 * This uses the Edge Function to ensure proper ID generation,
 * sync queue handling, and thread creation.
 */
export async function createSuggestedProposal(proposalData) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proposal`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_suggested',
          payload: proposalData
        })
      }
    );

    const result = await response.json();

    if (!response.ok || result.error) {
      throw new Error(result.error || result.message || 'Failed to create proposal');
    }

    return { data: result.data, error: null };
  } catch (error) {
    console.error('[suggestedProposalService] createSuggestedProposal error:', error);
    return { data: null, error: error.message };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the first photo URL from a listing
 */
export function getFirstPhoto(listing, photos = []) {
  // First try photos from listing_photo table
  if (photos.length > 0) {
    return photos[0]?.Photo || photos[0]?.['Photo (thumbnail)'] || '';
  }

  // Fallback to Features - Photos from listing
  const featurePhotos = listing?.['Features - Photos'];
  if (Array.isArray(featurePhotos) && featurePhotos.length > 0) {
    return featurePhotos[0];
  }
  if (typeof featurePhotos === 'string') {
    try {
      const parsed = JSON.parse(featurePhotos);
      return Array.isArray(parsed) ? parsed[0] : '';
    } catch {
      return featurePhotos;
    }
  }

  return '';
}

/**
 * Get the last photo URL from a listing
 */
export function getLastPhoto(listing, photos = []) {
  if (photos.length > 0) {
    return photos[photos.length - 1]?.Photo || photos[photos.length - 1]?.['Photo (thumbnail)'] || '';
  }

  const featurePhotos = listing?.['Features - Photos'];
  if (Array.isArray(featurePhotos) && featurePhotos.length > 0) {
    return featurePhotos[featurePhotos.length - 1];
  }
  if (typeof featurePhotos === 'string') {
    try {
      const parsed = JSON.parse(featurePhotos);
      return Array.isArray(parsed) ? parsed[parsed.length - 1] : '';
    } catch {
      return '';
    }
  }

  return '';
}

/**
 * Get address string from listing
 */
export function getAddressString(listing) {
  if (!listing) return '';

  const address = listing['Location - Address'];
  if (typeof address === 'object' && address !== null) {
    return [
      address.street,
      address.city,
      address.state,
      address.zipCode
    ].filter(Boolean).join(', ');
  }

  return [
    listing['Location - City'],
    listing['Location - State'],
    listing['Location - Zip Code']
  ].filter(Boolean).join(', ');
}

/**
 * Default placeholder photo
 */
export function getDefaultPhoto() {
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23E0E0E0" width="100" height="100"/%3E%3Ctext fill="%23999" x="50" y="55" text-anchor="middle" font-size="12"%3ENo Photo%3C/text%3E%3C/svg%3E';
}
