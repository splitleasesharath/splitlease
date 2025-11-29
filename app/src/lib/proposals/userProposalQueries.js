/**
 * User Proposal Query Functions
 * Implements user."Proposals List" approach per user requirement
 *
 * Data flow:
 * 1. Extract user ID from URL
 * 2. Fetch user data with "Proposals List" array
 * 3. Extract proposal IDs from the array
 * 4. Fetch proposals by those specific IDs
 * 5. Fetch related listings and hosts (nested fetches)
 * 6. Return user + proposals + selected proposal
 */

import { supabase } from '../supabase.js';
import { getUserIdFromPath, getProposalIdFromQuery } from './urlParser.js';

/**
 * STEP 1: Fetch user data with Proposals List
 *
 * @param {string} userId - User ID from URL path
 * @returns {Promise<Object>} User object with Proposals List
 */
export async function fetchUserWithProposalList(userId) {
  const { data, error } = await supabase
    .from('user')
    .select(`
      _id,
      "Name - First",
      "Name - Last",
      "Name - Full",
      "Profile Photo",
      "email as text",
      "Proposals List"
    `)
    .eq('_id', userId)
    .single();

  if (error) {
    console.error('fetchUserWithProposalList: Error fetching user:', error);
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  if (!data) {
    throw new Error(`User with ID ${userId} not found`);
  }

  console.log('fetchUserWithProposalList: User fetched:', data['Name - First'] || data['Name - Full']);
  return data;
}

/**
 * STEP 2: Extract proposal IDs from user's Proposals List
 *
 * @param {Object} user - User object with Proposals List
 * @returns {Array<string>} Array of proposal IDs
 */
export function extractProposalIds(user) {
  const proposalsList = user['Proposals List'];

  if (!proposalsList) {
    console.warn('extractProposalIds: User has no Proposals List field');
    return [];
  }

  // Handle JSONB array parsing
  let proposalIds = [];

  if (Array.isArray(proposalsList)) {
    proposalIds = proposalsList;
  } else if (typeof proposalsList === 'string') {
    try {
      proposalIds = JSON.parse(proposalsList);
    } catch (e) {
      console.error('extractProposalIds: Failed to parse Proposals List:', e);
      return [];
    }
  } else {
    console.error('extractProposalIds: Proposals List is not an array or string:', typeof proposalsList);
    return [];
  }

  console.log(`extractProposalIds: Extracted ${proposalIds.length} proposal IDs from user's Proposals List`);
  return proposalIds;
}

/**
 * STEP 3: Fetch proposals by their IDs from user's Proposals List
 * Note: Some proposal IDs may be orphaned (don't exist in proposal table)
 *
 * @param {Array<string>} proposalIds - Array of proposal IDs from user's list
 * @returns {Promise<Array<Object>>} Array of proposal objects with nested data
 */
export async function fetchProposalsByIds(proposalIds) {
  if (!proposalIds || proposalIds.length === 0) {
    console.warn('fetchProposalsByIds: No proposal IDs to fetch');
    return [];
  }

  // Step 1: Fetch all proposals by IDs
  const { data: proposals, error: proposalError } = await supabase
    .from('proposal')
    .select(`
      _id,
      "Status",
      "Deleted",
      "Guest",
      "Listing",
      "Days Selected",
      "Nights Selected (Nights list)",
      "Reservation Span (Weeks)",
      "nights per week (num)",
      "check in day",
      "check out day",
      "Move in range start",
      "Move in range end",
      "Total Price for Reservation (guest)",
      "proposal nightly price",
      "cleaning fee",
      "damage deposit",
      "counter offer happened",
      "hc days selected",
      "hc reservation span (weeks)",
      "hc total price",
      "hc nightly price",
      "Created Date",
      "Modified Date",
      "about_yourself",
      "special_needs",
      "reason for cancellation",
      "rental application",
      "virtual meeting",
      "Is Finalized"
    `)
    .in('_id', proposalIds)
    .order('"Created Date"', { ascending: false });

  if (proposalError) {
    console.error('fetchProposalsByIds: Error fetching proposals:', proposalError);
    throw new Error(`Failed to fetch proposals: ${proposalError.message}`);
  }

  // Filter out deleted proposals and proposals cancelled by guest
  const validProposals = (proposals || []).filter(p => {
    if (!p) return false;

    // Exclude deleted proposals (Deleted = true)
    if (p.Deleted === true) return false;

    // Exclude proposals cancelled by guest
    if (p.Status === 'Proposal Cancelled by Guest') return false;

    return true;
  });

  if (validProposals.length === 0) {
    console.log('fetchProposalsByIds: No valid proposals found');
    return [];
  }

  // Log if some proposals were orphaned
  if (validProposals.length < proposalIds.length) {
    console.warn(`fetchProposalsByIds: Found ${validProposals.length} proposals out of ${proposalIds.length} IDs (${proposalIds.length - validProposals.length} orphaned/filtered)`);
  } else {
    console.log(`fetchProposalsByIds: Fetched ${validProposals.length} proposals from user's list`);
  }

  // Step 2: Extract unique listing IDs from proposals
  const listingIds = [...new Set(validProposals.map(p => p.Listing).filter(Boolean))];

  if (listingIds.length === 0) {
    console.warn('fetchProposalsByIds: No listings found for proposals');
    return validProposals.map(p => ({ ...p, listing: null }));
  }

  console.log(`fetchProposalsByIds: Fetching ${listingIds.length} unique listings`);

  // Step 3: Fetch all listings
  const { data: listings, error: listingError } = await supabase
    .from('listing')
    .select(`
      _id,
      "Name",
      "Description",
      "Location - Address",
      "Location - Borough",
      "Location - Hood",
      "Features - Photos",
      "Features - House Rules",
      "NEW Date Check-in Time",
      "NEW Date Check-out Time",
      "Host / Landlord"
    `)
    .in('_id', listingIds);

  if (listingError) {
    console.error('fetchProposalsByIds: Error fetching listings:', listingError);
    return validProposals.map(p => ({ ...p, listing: null }));
  }

  // Step 3.25: Fetch featured photos for listings
  console.log(`fetchProposalsByIds: Fetching featured photos for ${listingIds.length} listings`);

  const { data: featuredPhotos, error: photoError } = await supabase
    .from('listing_photo')
    .select(`
      _id,
      "Listing",
      "Photo"
    `)
    .in('"Listing"', listingIds)
    .eq('"toggleMainPhoto"', true)
    .eq('"Active"', true);

  if (photoError) {
    console.error('fetchProposalsByIds: Error fetching featured photos:', photoError);
  } else {
    console.log(`fetchProposalsByIds: Fetched ${(featuredPhotos || []).length} featured photos`);
  }

  // Step 3.5: Fetch borough and neighborhood names from lookup tables
  const boroughIds = [...new Set((listings || []).map(l => l['Location - Borough']).filter(Boolean))];
  const hoodIds = [...new Set((listings || []).map(l => l['Location - Hood']).filter(Boolean))];

  console.log(`fetchProposalsByIds: Fetching ${boroughIds.length} boroughs and ${hoodIds.length} neighborhoods`);

  let boroughs = [];
  let hoods = [];

  if (boroughIds.length > 0) {
    const { data: boroughsData, error: boroughError } = await supabase
      .from('zat_geo_borough_toplevel')
      .select('_id, "Display Borough"')
      .in('_id', boroughIds);

    if (!boroughError) {
      boroughs = boroughsData || [];
      console.log(`fetchProposalsByIds: Fetched ${boroughs.length} boroughs`);
    }
  }

  if (hoodIds.length > 0) {
    const { data: hoodsData, error: hoodError } = await supabase
      .from('zat_geo_hood_mediumlevel')
      .select('_id, "Display"')
      .in('_id', hoodIds);

    if (!hoodError) {
      hoods = hoodsData || [];
      console.log(`fetchProposalsByIds: Fetched ${hoods.length} neighborhoods`);
    }
  }

  // Step 4: Extract unique host account IDs from listings
  const hostAccountIds = [...new Set((listings || []).map(l => l['Host / Landlord']).filter(Boolean))];

  console.log(`fetchProposalsByIds: Fetching ${hostAccountIds.length} unique hosts`);

  let hosts = [];
  if (hostAccountIds.length > 0) {
    const { data: hostsData, error: hostError } = await supabase
      .from('user')
      .select(`
        _id,
        "Name - First",
        "Name - Last",
        "Name - Full",
        "Profile Photo",
        "About Me / Bio",
        "Verify - Linked In ID",
        "Verify - Phone",
        "user verified?",
        "Account - Host / Landlord"
      `)
      .in('"Account - Host / Landlord"', hostAccountIds);

    if (hostError) {
      console.error('fetchProposalsByIds: Error fetching hosts:', hostError);
    } else {
      hosts = hostsData || [];
      console.log(`fetchProposalsByIds: Fetched ${hosts.length} hosts`);
    }
  }

  // Step 5.5: Extract unique guest IDs from proposals and fetch guest user data
  const guestIds = [...new Set(validProposals.map(p => p.Guest).filter(Boolean))];

  console.log(`fetchProposalsByIds: Fetching ${guestIds.length} unique guests`);

  let guests = [];
  if (guestIds.length > 0) {
    const { data: guestsData, error: guestError } = await supabase
      .from('user')
      .select(`
        _id,
        "Name - First",
        "Name - Last",
        "Name - Full",
        "Profile Photo",
        "About Me / Bio",
        "Verify - Linked In ID",
        "Verify - Phone",
        "user verified?"
      `)
      .in('_id', guestIds);

    if (guestError) {
      console.error('fetchProposalsByIds: Error fetching guests:', guestError);
    } else {
      guests = guestsData || [];
      console.log(`fetchProposalsByIds: Fetched ${guests.length} guests`);
    }
  }

  // Step 6: Fetch virtual meetings for all proposals
  console.log(`fetchProposalsByIds: Fetching virtual meetings for ${validProposals.length} proposals`);

  const proposalIdsForVM = validProposals.map(p => p._id).filter(Boolean);
  let virtualMeetings = [];

  if (proposalIdsForVM.length > 0) {
    const { data: vmData, error: vmError } = await supabase
      .from('virtualmeetingschedulesandlinks')
      .select(`
        _id,
        "booked date",
        "confirmedBySplitLease",
        "meeting link",
        "meeting declined",
        "requested by",
        "suggested dates and times",
        "guest name",
        "host name",
        "proposal"
      `)
      .in('proposal', proposalIdsForVM);

    if (vmError) {
      console.error('fetchProposalsByIds: Error fetching virtual meetings:', vmError);
    } else {
      virtualMeetings = vmData || [];
      console.log(`fetchProposalsByIds: Fetched ${virtualMeetings.length} virtual meetings`);
    }
  }

  // Create virtual meeting lookup map
  const vmMap = new Map(virtualMeetings.map(vm => [vm.proposal, vm]));

  // Step 7: Create lookup maps for efficient joining
  const listingMap = new Map((listings || []).map(l => [l._id, l]));
  // Key hosts by their Account - Host / Landlord field (not _id) for proper joining
  const hostMap = new Map(hosts.map(h => [h['Account - Host / Landlord'], h]));
  // Key guests by their _id field
  const guestMap = new Map(guests.map(g => [g._id, g]));
  // Key boroughs and hoods by their _id
  const boroughMap = new Map(boroughs.map(b => [b._id, b['Display Borough']]));
  const hoodMap = new Map(hoods.map(h => [h._id, h['Display']]));
  // Key featured photos by their Listing ID
  const featuredPhotoMap = new Map((featuredPhotos || []).map(p => [p.Listing, p.Photo]));

  // Step 8: Manually join the data
  const enrichedProposals = validProposals.map((proposal) => {
    const listing = listingMap.get(proposal.Listing);
    // Lookup host by Host Account ID from listing
    const host = listing ? hostMap.get(listing['Host / Landlord']) : null;
    // Lookup guest by proposal's Guest field
    const guest = guestMap.get(proposal.Guest);
    // Lookup borough and hood names
    const boroughName = listing ? boroughMap.get(listing['Location - Borough']) : null;
    const hoodName = listing ? hoodMap.get(listing['Location - Hood']) : null;
    // Lookup featured photo URL
    const featuredPhotoUrl = listing ? featuredPhotoMap.get(listing._id) : null;
    // Lookup virtual meeting
    const virtualMeeting = vmMap.get(proposal._id) || null;

    return {
      ...proposal,
      listing: listing ? {
        ...listing,
        host,
        boroughName,
        hoodName,
        featuredPhotoUrl
      } : null,
      guest: guest || null,
      virtualMeeting
    };
  });

  console.log(`fetchProposalsByIds: Successfully enriched ${enrichedProposals.length} proposals with listing and host data`);
  return enrichedProposals;
}

/**
 * COMPLETE FLOW: Get user's proposals from URL
 * This is the main function to call from components
 *
 * @returns {Promise<{user: Object, proposals: Array, selectedProposal: Object|null}>}
 */
export async function fetchUserProposalsFromUrl() {
  // Step 1: Extract user ID from URL
  const userId = getUserIdFromPath();
  if (!userId) {
    throw new Error('No user ID found in URL path. Expected: /guest-proposals/{userId}');
  }

  // Step 2: Fetch user data with Proposals List
  const user = await fetchUserWithProposalList(userId);

  // Step 3: Extract proposal IDs from user's Proposals List
  const proposalIds = extractProposalIds(user);

  // Handle case where user has no proposals
  if (proposalIds.length === 0) {
    console.log('fetchUserProposalsFromUrl: User has no proposal IDs in their Proposals List');
    return {
      user,
      proposals: [],
      selectedProposal: null
    };
  }

  // Step 4: Fetch proposals by those specific IDs
  const proposals = await fetchProposalsByIds(proposalIds);

  if (proposals.length === 0) {
    console.log('fetchUserProposalsFromUrl: No valid proposals found (all IDs may be orphaned)');
    return {
      user,
      proposals: [],
      selectedProposal: null
    };
  }

  // Step 5: Check for preselected proposal
  const preselectedId = getProposalIdFromQuery();
  let selectedProposal = null;

  if (preselectedId) {
    selectedProposal = proposals.find(p => p._id === preselectedId);
    if (!selectedProposal) {
      console.warn(`fetchUserProposalsFromUrl: Preselected proposal ${preselectedId} not found, defaulting to first`);
      selectedProposal = proposals[0] || null;
    } else {
      console.log('fetchUserProposalsFromUrl: Using preselected proposal:', preselectedId);
    }
  } else {
    selectedProposal = proposals[0] || null;
    console.log('fetchUserProposalsFromUrl: Defaulting to first proposal');
  }

  return {
    user,
    proposals,
    selectedProposal
  };
}
