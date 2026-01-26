/**
 * User Proposal Query Functions
 * Implements user."Proposals List" approach per user requirement
 *
 * Data flow:
 * 1. Get user ID from authenticated session (NOT from URL)
 * 2. Fetch user data with "Proposals List" array
 * 3. Extract proposal IDs from the array
 * 4. Fetch proposals by those specific IDs
 * 5. Fetch related listings and hosts (nested fetches)
 * 6. Return user + proposals + selected proposal
 */

import { supabase } from '../supabase.js';
import { getUserIdFromSession, getProposalIdFromQuery } from './urlParser.js';

/**
 * STEP 1: Fetch user data with Proposals List
 *
 * @param {string} userId - User ID from URL path
 * @returns {Promise<Object>} User object with Proposals List
 */
export async function fetchUserWithProposalList(userId) {
  // Use .maybeSingle() instead of .single() to avoid 406 error when no rows found
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
    .maybeSingle();

  if (error) {
    console.error('fetchUserWithProposalList: Error fetching user:', error);
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  if (!data) {
    console.error('fetchUserWithProposalList: User not found with ID:', userId);
    throw new Error(`User with ID ${userId} not found. Please check the URL.`);
  }

  console.log('fetchUserWithProposalList: User fetched:', data['Name - First'] || data['Name - Full']);
  return data;
}

/**
 * STEP 2: Extract proposal IDs from user's Proposals List
 *
 * After migration, Proposals List is a native text[] array.
 * Supabase client returns text[] as JavaScript array directly.
 *
 * @param {Object} user - User object with Proposals List
 * @returns {Array<string>} Array of proposal IDs
 */
export function extractProposalIds(user) {
  const proposalsList = user['Proposals List'];

  if (!proposalsList || !Array.isArray(proposalsList)) {
    console.warn('extractProposalIds: User has no Proposals List or invalid format');
    return [];
  }

  console.log(`extractProposalIds: Extracted ${proposalsList.length} proposal IDs from user's Proposals List`);
  return proposalsList;
}

/**
 * STEP 3: Fetch proposals by their IDs from user's Proposals List
 * Note: Some proposal IDs may be orphaned (don't exist in proposal table)
 *
 * @param {Array<string>} proposalIds - Array of proposal IDs from user's list
 * @returns {Promise<Array<Object>>} Array of proposal objects with nested data
 */
export async function fetchProposalsByIds(proposalIds, currentUserId = null) {
  if (!proposalIds || proposalIds.length === 0) {
    console.warn('fetchProposalsByIds: No proposal IDs to fetch');
    return [];
  }

  // Step 1: Fetch all proposals by IDs
  // Filter out deleted proposals and cancelled-by-guest at database level for efficiency
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
      "hc check in day",
      "hc check out day",
      "hc nights per week",
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
      "Is Finalized",
      "House Rules",
      "remindersByGuest (number)",
      "guest documents review finalized?"
    `)
    .in('_id', proposalIds)
    .or('"Deleted".is.null,"Deleted".eq.false')
    .neq('Status', 'Proposal Cancelled by Guest')
    .order('Created Date', { ascending: false });

  if (proposalError) {
    console.error('fetchProposalsByIds: Error fetching proposals:', proposalError);
    throw new Error(`Failed to fetch proposals: ${proposalError.message}`);
  }

  // Additional client-side safety filter (in case DB filter doesn't catch edge cases)
  const validProposals = (proposals || []).filter(p => {
    if (!p) return false;

    // Exclude deleted proposals (Deleted = true or "true")
    if (p.Deleted === true || p.Deleted === 'true') return false;

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
      "Location - slightly different address",
      "Location - Borough",
      "Location - Hood",
      "Features - Photos",
      "Features - House Rules",
      "NEW Date Check-in Time",
      "NEW Date Check-out Time",
      "Host User",
      "House manual"
    `)
    .in('_id', listingIds);

  if (listingError) {
    console.error('fetchProposalsByIds: Error fetching listings:', listingError);
    return validProposals.map(p => ({ ...p, listing: null }));
  }

  // Step 3.25: Extract featured photos from embedded format or fetch from listing_photo
  console.log(`fetchProposalsByIds: Extracting featured photos for ${listingIds.length} listings`);

  // First, try to extract photos from embedded Features - Photos field (new format)
  const embeddedPhotoMap = new Map();
  const listingsNeedingPhotoFetch = [];

  (listings || []).forEach(listing => {
    const photosField = listing['Features - Photos'];
    let photos = [];

    // Parse JSON if needed
    if (Array.isArray(photosField)) {
      photos = photosField;
    } else if (typeof photosField === 'string') {
      try {
        photos = JSON.parse(photosField);
      } catch { /* ignore */ }
    }

    // Check if first photo is an object (new embedded format)
    if (photos.length > 0 && typeof photos[0] === 'object' && photos[0] !== null) {
      // Find main photo or use first one
      const mainPhoto = photos.find(p => p.toggleMainPhoto) || photos[0];
      let photoUrl = mainPhoto.url || mainPhoto.Photo || '';
      if (photoUrl.startsWith('//')) photoUrl = 'https:' + photoUrl;
      if (photoUrl) embeddedPhotoMap.set(listing._id, photoUrl);
    } else {
      // Legacy format - need to fetch from listing_photo table
      listingsNeedingPhotoFetch.push(listing._id);
    }
  });

  console.log(`fetchProposalsByIds: Found ${embeddedPhotoMap.size} embedded photos, ${listingsNeedingPhotoFetch.length} need fetch`);

  // Only fetch from listing_photo table for listings without embedded photos
  let featuredPhotos = [];
  if (listingsNeedingPhotoFetch.length > 0) {
    const { data: fetchedPhotos, error: photoError } = await supabase
      .from('listing_photo')
      .select(`
        _id,
        "Listing",
        "Photo"
      `)
      .in('"Listing"', listingsNeedingPhotoFetch)
      .eq('"toggleMainPhoto"', true)
      .eq('"Active"', true);

    if (photoError) {
      console.error('fetchProposalsByIds: Error fetching featured photos:', photoError);
    } else {
      featuredPhotos = fetchedPhotos || [];
      console.log(`fetchProposalsByIds: Fetched ${featuredPhotos.length} photos from listing_photo table`);
    }
  }

  // Step 3.5: Fetch borough, neighborhood, and house rules names from lookup tables
  const boroughIds = [...new Set((listings || []).map(l => l['Location - Borough']).filter(Boolean))];
  const hoodIds = [...new Set((listings || []).map(l => l['Location - Hood']).filter(Boolean))];

  // Collect all house rule IDs from all proposals
  // House Rules field is stored as a JSON string array: "[\"id1\", \"id2\"]"
  const allHouseRuleIds = [...new Set(
    validProposals
      .flatMap(p => {
        const houseRulesRaw = p['House Rules'];
        if (!houseRulesRaw) return [];
        // Parse JSON string if needed
        if (typeof houseRulesRaw === 'string') {
          try {
            return JSON.parse(houseRulesRaw);
          } catch (e) {
            console.warn('fetchProposalsByIds: Failed to parse House Rules JSON:', e);
            return [];
          }
        }
        // Already an array
        if (Array.isArray(houseRulesRaw)) return houseRulesRaw;
        return [];
      })
      .filter(Boolean)
  )];

  console.log(`fetchProposalsByIds: Fetching ${boroughIds.length} boroughs, ${hoodIds.length} neighborhoods, ${allHouseRuleIds.length} house rules`);

  let boroughs = [];
  let hoods = [];

  if (boroughIds.length > 0) {
    const { data: boroughsData, error: boroughError } = await supabase
      .schema('reference_table')
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
      .schema('reference_table')
      .from('zat_geo_hood_mediumlevel')
      .select('_id, "Display"')
      .in('_id', hoodIds);

    if (!hoodError) {
      hoods = hoodsData || [];
      console.log(`fetchProposalsByIds: Fetched ${hoods.length} neighborhoods`);
    }
  }

  // Step 3.6: Fetch house rules names from lookup table
  let houseRules = [];
  if (allHouseRuleIds.length > 0) {
    const { data: houseRulesData, error: houseRulesError } = await supabase
      .schema('reference_table')
      .from('zat_features_houserule')
      .select('_id, "Name"')
      .in('_id', allHouseRuleIds);

    if (!houseRulesError) {
      houseRules = houseRulesData || [];
      console.log(`fetchProposalsByIds: Fetched ${houseRules.length} house rules`);
    } else {
      console.error('fetchProposalsByIds: Error fetching house rules:', houseRulesError);
    }
  }

  // Step 4: Extract unique host user IDs from listings
  // After migration, "Host User" contains user._id directly
  const hostUserIds = [...new Set((listings || []).map(l => l['Host User']).filter(Boolean))];

  console.log(`fetchProposalsByIds: Fetching ${hostUserIds.length} unique hosts`);

  let hosts = [];
  if (hostUserIds.length > 0) {
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
        "user verified?"
      `)
      .in('_id', hostUserIds);

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
        "user verified?",
        "ID documents submitted?"
      `)
      .in('_id', guestIds);

    if (guestError) {
      console.error('fetchProposalsByIds: Error fetching guests:', guestError);
    } else {
      guests = guestsData || [];
      console.log(`fetchProposalsByIds: Fetched ${guests.length} guests`);
    }
  }

  // Step 5.6: Fetch rental application submitted status for proposals
  const rentalAppIds = [...new Set(
    validProposals
      .map(p => p['rental application'])
      .filter(Boolean)
  )];

  console.log(`fetchProposalsByIds: Fetching ${rentalAppIds.length} rental applications`);

  let rentalApps = [];
  if (rentalAppIds.length > 0) {
    const { data: rentalAppsData, error: rentalAppError } = await supabase
      .from('rentalapplication')
      .select('_id, submitted, "percentage % done"')
      .in('_id', rentalAppIds);

    if (rentalAppError) {
      console.error('fetchProposalsByIds: Error fetching rental applications:', rentalAppError);
    } else {
      rentalApps = rentalAppsData || [];
      console.log(`fetchProposalsByIds: Fetched ${rentalApps.length} rental applications`);
    }
  }

  // Create rental application lookup map
  const rentalAppMap = new Map(rentalApps.map(ra => [ra._id, ra]));

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

  // Step 6.5: Fetch negotiation summaries for all proposals
  // IMPORTANT: Filter by "To Account" to ensure users only see summaries intended for them
  // - Guests see summaries where "To Account" = guest ID (why this listing was suggested)
  // - Hosts see summaries where "To Account" = host ID (proposal terms summary)
  const proposalIdsForSummaries = validProposals.map(p => p._id);
  let negotiationSummaries = [];

  if (proposalIdsForSummaries.length > 0) {
    let summariesQuery = supabase
      .from('negotiationsummary')
      .select('*')
      .in('"Proposal associated"', proposalIdsForSummaries)
      .order('"Created Date"', { ascending: false });

    // Filter by "To Account" if currentUserId is provided
    if (currentUserId) {
      summariesQuery = summariesQuery.eq('"To Account"', currentUserId);
    }

    const { data: summariesData, error: summariesError } = await summariesQuery;

    if (summariesError) {
      console.error('fetchProposalsByIds: Error fetching negotiation summaries:', summariesError);
    } else {
      negotiationSummaries = summariesData || [];
      console.log(`fetchProposalsByIds: Fetched ${negotiationSummaries.length} negotiation summaries for user ${currentUserId || 'unknown'}`);
    }
  }

  // Create summary lookup map
  const summaryMap = new Map();
  negotiationSummaries.forEach(summary => {
    const proposalId = summary['Proposal associated'];
    if (!summaryMap.has(proposalId)) {
      summaryMap.set(proposalId, []);
    }
    summaryMap.get(proposalId).push(summary);
  });

  // Step 6.6: Fetch SplitBot counteroffer summary messages
  // These are created when a host submits a counteroffer - stored in _message table
  // Link: proposal._id -> thread."Proposal" -> _message."Associated Thread/Conversation"
  console.log(`fetchProposalsByIds: Fetching counteroffer summaries for ${proposalIdsForSummaries.length} proposals`);

  let counterofferSummaryMap = new Map();

  if (proposalIdsForSummaries.length > 0) {
    // First, fetch threads for all proposals
    const { data: threadsData, error: threadsError } = await supabase
      .from('thread')
      .select('_id, "Proposal"')
      .in('"Proposal"', proposalIdsForSummaries);

    if (threadsError) {
      console.error('fetchProposalsByIds: Error fetching threads:', threadsError);
    } else if (threadsData && threadsData.length > 0) {
      const threadIds = threadsData.map(t => t._id);
      const threadToProposalMap = new Map(threadsData.map(t => [t._id, t.Proposal]));

      // Fetch SplitBot counteroffer messages
      const { data: counterofferMsgs, error: counterofferError } = await supabase
        .from('_message')
        .select(`
          _id,
          "Message Body",
          "Call to Action",
          "Associated Thread/Conversation",
          "Created Date"
        `)
        .in('"Associated Thread/Conversation"', threadIds)
        .eq('"is Split Bot"', true)
        .eq('"Call to Action"', 'Respond to Counter Offer')
        .order('"Created Date"', { ascending: false });

      if (counterofferError) {
        console.error('fetchProposalsByIds: Error fetching counteroffer messages:', counterofferError);
      } else if (counterofferMsgs && counterofferMsgs.length > 0) {
        console.log(`fetchProposalsByIds: Fetched ${counterofferMsgs.length} counteroffer summary messages`);

        // Map messages to their proposals (take only the most recent per proposal)
        counterofferMsgs.forEach(msg => {
          const threadId = msg['Associated Thread/Conversation'];
          const proposalId = threadToProposalMap.get(threadId);
          if (proposalId && !counterofferSummaryMap.has(proposalId)) {
            counterofferSummaryMap.set(proposalId, msg['Message Body']);
          }
        });
      }
    }
  }

  // Step 7: Create lookup maps for efficient joining
  const listingMap = new Map((listings || []).map(l => [l._id, l]));
  // Key hosts by their _id (Host User column now contains user._id directly)
  const hostMap = new Map(hosts.map(h => [h._id, h]));
  // Key guests by their _id field
  const guestMap = new Map(guests.map(g => [g._id, g]));
  // Key boroughs and hoods by their _id
  const boroughMap = new Map(boroughs.map(b => [b._id, b['Display Borough']]));
  const hoodMap = new Map(hoods.map(h => [h._id, h['Display']]));
  // Key featured photos by their Listing ID (merge embedded + fetched photos)
  const featuredPhotoMap = new Map([
    ...embeddedPhotoMap.entries(),
    ...(featuredPhotos || []).map(p => [p.Listing, p.Photo])
  ]);
  // Key house rules by their _id to get names
  const houseRulesMap = new Map(houseRules.map(r => [r._id, r.Name]));

  // Step 8: Manually join the data
  const enrichedProposals = validProposals.map((proposal) => {
    const listing = listingMap.get(proposal.Listing);
    // Lookup host by Host User ID from listing (contains user._id directly)
    const host = listing ? hostMap.get(listing['Host User']) : null;
    // Lookup guest by proposal's Guest field
    const guest = guestMap.get(proposal.Guest);
    // Lookup borough and hood names
    const boroughName = listing ? boroughMap.get(listing['Location - Borough']) : null;
    const hoodName = listing ? hoodMap.get(listing['Location - Hood']) : null;
    // Lookup featured photo URL
    const featuredPhotoUrl = listing ? featuredPhotoMap.get(listing._id) : null;
    // Lookup virtual meeting
    const virtualMeeting = vmMap.get(proposal._id) || null;
    // Lookup rental application
    const rentalApplication = rentalAppMap.get(proposal['rental application']) || null;
    // Lookup negotiation summaries
    const negotiationSummaries = summaryMap.get(proposal._id) || [];
    // Lookup counteroffer summary (SplitBot message)
    const counterofferSummary = counterofferSummaryMap.get(proposal._id) || null;

    // Resolve house rules IDs to names (from proposal, not listing)
    // House Rules field is stored as a JSON string array: "[\"id1\", \"id2\"]"
    let proposalHouseRuleIds = [];
    const houseRulesRaw = proposal['House Rules'];
    if (houseRulesRaw) {
      if (typeof houseRulesRaw === 'string') {
        try {
          proposalHouseRuleIds = JSON.parse(houseRulesRaw);
        } catch (e) {
          proposalHouseRuleIds = [];
        }
      } else if (Array.isArray(houseRulesRaw)) {
        proposalHouseRuleIds = houseRulesRaw;
      }
    }
    const houseRulesResolved = proposalHouseRuleIds
      .map(id => houseRulesMap.get(id))
      .filter(Boolean);

    return {
      ...proposal,
      listing: listing ? {
        ...listing,
        host,
        boroughName,
        hoodName,
        featuredPhotoUrl,
        hasHouseManual: Boolean(listing['House manual'])
      } : null,
      guest: guest || null,
      virtualMeeting,
      rentalApplication,
      houseRules: houseRulesResolved,
      negotiationSummaries,
      counterofferSummary
    };
  });

  console.log(`fetchProposalsByIds: Successfully enriched ${enrichedProposals.length} proposals with listing and host data`);
  return enrichedProposals;
}

/**
 * COMPLETE FLOW: Get user's proposals from authenticated session
 * This is the main function to call from components
 *
 * User ID comes from secure storage (session), NOT from URL.
 * This ensures users can only view their own proposals.
 *
 * @returns {Promise<{user: Object, proposals: Array, selectedProposal: Object|null}>}
 */
export async function fetchUserProposalsFromUrl() {
  // Step 1: Get user ID from authenticated session (NOT URL)
  const userId = getUserIdFromSession();
  if (!userId) {
    throw new Error('NOT_AUTHENTICATED');
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

  // Step 4: Fetch proposals by those specific IDs (pass userId for summary filtering)
  const proposals = await fetchProposalsByIds(proposalIds, userId);

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
