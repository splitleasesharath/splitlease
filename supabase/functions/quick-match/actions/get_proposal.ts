/**
 * Get Proposal Action Handler
 * Split Lease - Quick Match Edge Function
 *
 * Fetches a proposal with its associated guest and listing details
 * for display in the Quick Match interface.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequiredFields } from '../../_shared/validation.ts';
import type {
  GetProposalPayload,
  ProposalDetails,
  GuestInfo,
  ListingInfo,
  NightlyRates,
  ProposalRow,
  ListingRow,
  UserRow,
} from '../lib/types.ts';

/**
 * Handle fetching proposal details for Quick Match
 */
export async function handleGetProposal(
  payload: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<{ proposal: ProposalDetails }> {
  console.log('[quick-match:get_proposal] ========== GET PROPOSAL ==========');

  // Validate required fields
  validateRequiredFields(payload, ['proposal_id']);
  const { proposal_id } = payload as GetProposalPayload;

  console.log('[quick-match:get_proposal] Fetching proposal:', proposal_id);

  // Fetch proposal with related data
  const { data: proposalData, error: proposalError } = await supabase
    .from('proposal')
    .select(`
      _id,
      Guest,
      Listing,
      "Guest email",
      "Host User",
      Status,
      "Move in range start",
      "Move in range end",
      "Reservation Span (Weeks)",
      "Days Selected",
      "Nights Selected (Nights list)",
      "nights per week (num)",
      "proposal nightly price",
      "cleaning fee",
      "damage deposit",
      Deleted
    `)
    .eq('_id', proposal_id)
    .single();

  if (proposalError) {
    console.error('[quick-match:get_proposal] Database error:', proposalError);
    throw new Error(`Failed to fetch proposal: ${proposalError.message}`);
  }

  if (!proposalData) {
    throw new Error(`Proposal not found: ${proposal_id}`);
  }

  const proposal = proposalData as ProposalRow;
  console.log('[quick-match:get_proposal] Proposal found, status:', proposal.Status);

  // Fetch guest data
  const guest = await fetchGuestInfo(supabase, proposal.Guest);
  console.log('[quick-match:get_proposal] Guest:', guest.fullName || guest.email);

  // Fetch listing data with borough/hood names
  const listing = await fetchListingInfo(supabase, proposal.Listing);
  console.log('[quick-match:get_proposal] Listing:', listing.title);

  // Build response
  const proposalDetails: ProposalDetails = {
    id: proposal._id,
    guest,
    listing,
    daysSelected: normalizeJsonbArray(proposal['Days Selected']),
    nightsPerWeek: proposal['nights per week (num)'] || 0,
    nightlyPrice: proposal['proposal nightly price'] || 0,
    moveInStart: proposal['Move in range start'],
    moveInEnd: proposal['Move in range end'],
    status: proposal.Status,
    reservationWeeks: proposal['Reservation Span (Weeks)'],
  };

  console.log('[quick-match:get_proposal] ========== SUCCESS ==========');

  return { proposal: proposalDetails };
}

/**
 * Fetch guest information
 */
async function fetchGuestInfo(
  supabase: SupabaseClient,
  guestId: string | null
): Promise<GuestInfo> {
  if (!guestId) {
    return {
      id: '',
      firstName: null,
      lastName: null,
      fullName: null,
      email: null,
    };
  }

  const { data, error } = await supabase
    .from('user')
    .select(`
      _id,
      "Name - First",
      "Name - Last",
      "Name - Full",
      email
    `)
    .eq('_id', guestId)
    .single();

  if (error || !data) {
    console.warn('[quick-match:get_proposal] Guest not found:', guestId);
    return {
      id: guestId,
      firstName: null,
      lastName: null,
      fullName: null,
      email: null,
    };
  }

  const user = data as UserRow;
  return {
    id: user._id,
    firstName: user['Name - First'],
    lastName: user['Name - Last'],
    fullName: user['Name - Full'],
    email: user.email,
  };
}

/**
 * Fetch listing information with borough and hood names
 */
async function fetchListingInfo(
  supabase: SupabaseClient,
  listingId: string | null
): Promise<ListingInfo> {
  const emptyListing: ListingInfo = {
    id: '',
    title: null,
    borough: null,
    boroughName: null,
    hood: null,
    hoodName: null,
    address: null,
    nightlyRates: {
      rate1: null,
      rate2: null,
      rate3: null,
      rate4: null,
      rate5: null,
      rate6: null,
      rate7: null,
    },
    cleaningFee: null,
    damageDeposit: null,
    minimumNights: null,
    maximumNights: null,
    daysAvailable: [],
    nightsAvailable: [],
    active: false,
  };

  if (!listingId) {
    return emptyListing;
  }

  // Fetch listing
  const { data, error } = await supabase
    .from('listing')
    .select(`
      _id,
      Name,
      "Host User",
      "Location - Borough",
      "Location - Hood",
      "Location - Address",
      "Days Available (List of Days)",
      "Nights Available (List of Nights)",
      "Minimum Nights",
      "Maximum Nights",
      "💰Nightly Host Rate for 1 night",
      "💰Nightly Host Rate for 2 nights",
      "💰Nightly Host Rate for 3 nights",
      "💰Nightly Host Rate for 4 nights",
      "💰Nightly Host Rate for 5 nights",
      "💰Nightly Host Rate for 6 nights",
      "💰Nightly Host Rate for 7 nights",
      "💰Cleaning Cost / Maintenance Fee",
      "💰Damage Deposit",
      Active,
      Deleted
    `)
    .eq('_id', listingId)
    .single();

  if (error || !data) {
    console.warn('[quick-match:get_proposal] Listing not found:', listingId);
    return { ...emptyListing, id: listingId };
  }

  const listing = data as ListingRow;

  // Fetch borough name if we have a borough ID
  let boroughName: string | null = null;
  if (listing['Location - Borough']) {
    const { data: boroughData } = await supabase
      .from('zat_geo_borough_toplevel')
      .select('Display')
      .eq('_id', listing['Location - Borough'])
      .single();

    boroughName = boroughData?.Display || listing['Location - Borough'];
  }

  // Fetch hood name if we have a hood ID
  let hoodName: string | null = null;
  if (listing['Location - Hood']) {
    const { data: hoodData } = await supabase
      .from('zat_geo_hood_mediumlevel')
      .select('Display')
      .eq('_id', listing['Location - Hood'])
      .single();

    hoodName = hoodData?.Display || listing['Location - Hood'];
  }

  const nightlyRates: NightlyRates = {
    rate1: listing['\u{1F4B0}Nightly Host Rate for 1 night'],
    rate2: listing['\u{1F4B0}Nightly Host Rate for 2 nights'],
    rate3: listing['\u{1F4B0}Nightly Host Rate for 3 nights'],
    rate4: listing['\u{1F4B0}Nightly Host Rate for 4 nights'],
    rate5: listing['\u{1F4B0}Nightly Host Rate for 5 nights'],
    rate6: listing['\u{1F4B0}Nightly Host Rate for 6 nights'],
    rate7: listing['\u{1F4B0}Nightly Host Rate for 7 nights'],
  };

  return {
    id: listing._id,
    title: listing.Name,
    borough: listing['Location - Borough'],
    boroughName,
    hood: listing['Location - Hood'],
    hoodName,
    address: listing['Location - Address'],
    nightlyRates,
    cleaningFee: listing['\u{1F4B0}Cleaning Cost / Maintenance Fee'],
    damageDeposit: listing['\u{1F4B0}Damage Deposit'],
    minimumNights: listing['Minimum Nights'],
    maximumNights: listing['Maximum Nights'],
    daysAvailable: normalizeJsonbArray(listing['Days Available (List of Days)']),
    nightsAvailable: normalizeJsonbArray(listing['Nights Available (List of Nights)']),
    active: listing.Active ?? false,
  };
}

/**
 * Normalize JSONB array fields (handle both array and stringified array)
 */
function normalizeJsonbArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((v) => typeof v === 'number' ? v : parseInt(String(v), 10))
      .filter((v) => !isNaN(v));
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((v: unknown) => typeof v === 'number' ? v : parseInt(String(v), 10))
          .filter((v: number) => !isNaN(v));
      }
    } catch {
      // Not valid JSON
    }
  }

  return [];
}
