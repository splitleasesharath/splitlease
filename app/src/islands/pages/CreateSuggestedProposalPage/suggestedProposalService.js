/**
 * Suggested Proposal Service
 *
 * API calls for the Create Suggested Proposal page.
 * Uses direct Supabase queries for search and the proposal Edge Function for creation.
 */

import { supabase } from '../../../lib/supabase.js';

// ============================================================================
// REFERENCE DATA LOOKUPS
// ============================================================================

// Borough Bubble FK ID to display name mapping
const BOROUGH_LOOKUP = {
  '1607041299637x913970439175620100': 'Brooklyn',
  '1607041299687x679479834266385900': 'Manhattan',
  '1607041299715x741251947580746200': 'Bronx',
  '1607041299828x406969561802059650': 'Queens',
  '1686599616073x348655546878883200': 'Weehawken, NJ',
  '1686674905048x436838997624262400': 'Newark, NJ'
};

// ============================================================================
// LISTING OPERATIONS
// ============================================================================

// Standard fields to select for listing queries
const LISTING_SELECT_FIELDS = `
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
  "💰Monthly Host Rate",
  "💰Weekly Host Rate",
  "💰Nightly Host Rate for 2 nights",
  "💰Nightly Host Rate for 3 nights",
  "💰Nightly Host Rate for 4 nights",
  "💰Nightly Host Rate for 5 nights",
  "💰Nightly Host Rate for 6 nights",
  "💰Nightly Host Rate for 7 nights",
  "💰Cleaning Cost / Maintenance Fee",
  "💰Damage Deposit"
`;

/**
 * Check if a listing has valid pricing for its rental type
 * @param {Object} listing - Listing object
 * @returns {boolean} True if listing has valid pricing
 */
function hasValidPricing(listing) {
  const rentalType = listing['rental type'];
  if (!rentalType) return false;

  if (rentalType === 'Monthly') {
    return !!listing['💰Monthly Host Rate'] && listing['💰Monthly Host Rate'] > 0;
  }
  if (rentalType === 'Weekly') {
    return !!listing['💰Weekly Host Rate'] && listing['💰Weekly Host Rate'] > 0;
  }
  // Nightly - check if any nightly rate is set
  return !!(
    listing['💰Nightly Host Rate for 2 nights'] ||
    listing['💰Nightly Host Rate for 3 nights'] ||
    listing['💰Nightly Host Rate for 4 nights'] ||
    listing['💰Nightly Host Rate for 5 nights'] ||
    listing['💰Nightly Host Rate for 6 nights'] ||
    listing['💰Nightly Host Rate for 7 nights']
  );
}

/**
 * Get default listings with valid pricing (for showing when search box is empty)
 * Listings must have a rental type set and the corresponding price field populated
 */
export async function getDefaultListings() {
  try {
    const { data, error } = await supabase
      .from('listing')
      .select(LISTING_SELECT_FIELDS)
      .eq('Deleted', false)
      .eq('Active', true)
      .not('rental type', 'is', null)
      .order('Modified Date', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Filter client-side for valid pricing (Supabase can't do OR across different fields easily)
    const validListings = (data || []).filter(hasValidPricing);

    return { data: validListings.slice(0, 20), error: null };
  } catch (error) {
    console.error('[suggestedProposalService] getDefaultListings error:', error);
    return { data: [], error: error.message };
  }
}

/**
 * Search listings by host name, email, listing name, unique ID, or rental type
 */
export async function searchListings(searchTerm) {
  try {
    const { data, error } = await supabase
      .from('listing')
      .select(LISTING_SELECT_FIELDS)
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

// Standard fields to select for user/guest queries
const USER_SELECT_FIELDS = `
  _id,
  "Name - First",
  "Name - Last",
  "Name - Full",
  email,
  "email as text",
  "Phone Number (as text)",
  "Profile Photo",
  "About Me / Bio",
  "need for Space",
  "special needs",
  "Type - User Current",
  "Created Date"
`;

/**
 * Get default guest list (users with guest user type)
 * Shows all guests when search box is empty/focused
 */
export async function getDefaultGuests() {
  try {
    const { data, error } = await supabase
      .from('user')
      .select(USER_SELECT_FIELDS)
      .ilike('"Type - User Current"', '%Guest%')
      .order('"Created Date"', { ascending: false })
      .limit(20);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('[suggestedProposalService] getDefaultGuests error:', error);
    return { data: [], error: error.message };
  }
}

/**
 * Search guests by name, email, phone, or unique ID
 * Only returns users with guest user type
 */
export async function searchGuests(searchTerm) {
  try {
    const { data, error } = await supabase
      .from('user')
      .select(USER_SELECT_FIELDS)
      .ilike('"Type - User Current"', '%Guest%')
      .or(`"Name - Full".ilike.%${searchTerm}%,"Name - First".ilike.%${searchTerm}%,"Name - Last".ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,"Phone Number (as text)".ilike.%${searchTerm}%,_id.ilike.%${searchTerm}%`)
      .order('"Created Date"', { ascending: false })
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
 * Returns proposals with prefill fields, ordered by most recent first
 */
export async function getUserProposalsForListing(userId, listingId) {
  try {
    const { data, error } = await supabase
      .from('proposal')
      .select(`
        _id,
        Status,
        "Days Selected",
        "Reservation Span (Weeks)",
        "Move in range start",
        "Created Date"
      `)
      .eq('Guest', userId)
      .eq('Listing', listingId)
      .neq('Deleted', true)
      .order('"Created Date"', { ascending: false });

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
// AI TRANSCRIPTION PARSING
// ============================================================================

/**
 * Parse a call transcription using AI to extract guest profile fields
 *
 * @param {string} transcription - The call transcription or notes text
 * @returns {Promise<{data: {aboutMe: string, needForSpace: string, specialNeeds: string}, error: string|null}>}
 */
export async function parseCallTranscription(transcription) {
  try {
    if (!transcription || transcription.trim().length === 0) {
      return { data: null, error: 'Transcription text is required' };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-gateway`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'complete',
          payload: {
            prompt_key: 'parse-call-transcription',
            variables: {
              transcription: transcription.trim()
            }
          }
        })
      }
    );

    const result = await response.json();

    if (!response.ok || result.error) {
      throw new Error(result.error || result.message || 'Failed to parse transcription');
    }

    // The AI gateway returns the completion in result.data.content
    const completion = result.data?.content;

    if (!completion) {
      throw new Error('No completion returned from AI');
    }

    // Parse the JSON response from the AI
    let parsed;
    try {
      parsed = typeof completion === 'string' ? JSON.parse(completion) : completion;
    } catch (parseError) {
      console.error('[suggestedProposalService] Failed to parse AI response:', completion);
      throw new Error('AI returned invalid JSON response');
    }

    return {
      data: {
        aboutMe: parsed.aboutMe || '',
        needForSpace: parsed.needForSpace || '',
        specialNeeds: parsed.specialNeeds || ''
      },
      error: null
    };
  } catch (error) {
    console.error('[suggestedProposalService] parseCallTranscription error:', error);
    return { data: null, error: error.message };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract URL from a photo object or return string as-is
 * Photo objects have structure: { url: "...", Photo: "...", "Photo (thumbnail)": "..." }
 */
function extractPhotoUrl(photo) {
  if (!photo) return '';
  if (typeof photo === 'string') return photo;
  // Photo object - prefer url, then Photo, then thumbnail
  return photo.url || photo.Photo || photo['Photo (thumbnail)'] || '';
}

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
    return extractPhotoUrl(featurePhotos[0]);
  }
  if (typeof featurePhotos === 'string') {
    try {
      const parsed = JSON.parse(featurePhotos);
      return Array.isArray(parsed) ? extractPhotoUrl(parsed[0]) : '';
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
    return extractPhotoUrl(featurePhotos[featurePhotos.length - 1]);
  }
  if (typeof featurePhotos === 'string') {
    try {
      const parsed = JSON.parse(featurePhotos);
      return Array.isArray(parsed) ? extractPhotoUrl(parsed[parsed.length - 1]) : '';
    } catch {
      return '';
    }
  }

  return '';
}

/**
 * Get borough display name from Bubble FK ID
 */
export function getBoroughName(boroughId) {
  return BOROUGH_LOOKUP[boroughId] || null;
}

/**
 * Get address string from listing
 *
 * Returns: "Borough, Full Address" or fallback to "Borough, State, Zip"
 * Location - Address JSON structure: { address: "Full Address String", lat, lng }
 */
export function getAddressString(listing) {
  if (!listing) return '';

  const boroughName = getBoroughName(listing['Location - Borough']);
  const locationAddress = listing['Location - Address'];

  // Primary: Borough + full address from JSON
  if (typeof locationAddress === 'object' && locationAddress !== null && locationAddress.address) {
    return boroughName
      ? `${boroughName}, ${locationAddress.address}`
      : locationAddress.address;
  }

  // Fallback: Borough + State + Zip
  return [
    boroughName,
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
