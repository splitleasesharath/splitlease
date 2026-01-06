/**
 * Proposal Data Fetcher Utilities
 * Handles URL parsing and data fetching for guest proposals page
 *
 * Based on the same pattern as listingDataFetcher.js but for user/proposal data
 */

import { supabase } from './supabase.js';

/**
 * Extract user ID from URL pathname
 * Supports multiple URL formats:
 * - /guest-proposals/userId (primary format)
 * - /guest-proposals.html/userId (alternative format)
 * - /guest-proposals?user=userId (query string fallback)
 *
 * @returns {string|null} User ID or null if not found
 */
export function getUserIdFromUrl() {
  // 1. Check query string: ?user=userId
  const urlParams = new URLSearchParams(window.location.search);
  const idFromQuery = urlParams.get('user');
  if (idFromQuery) return idFromQuery;

  // 2. Parse pathname for segment after 'guest-proposals'
  const pathSegments = window.location.pathname.split('/').filter(segment => segment);
  const proposalsSegmentIndex = pathSegments.findIndex(segment =>
    segment === 'guest-proposals' ||
    segment === 'guest-proposals.html'
  );

  if (proposalsSegmentIndex !== -1 && pathSegments[proposalsSegmentIndex + 1]) {
    const nextSegment = pathSegments[proposalsSegmentIndex + 1];
    // Return the segment if it doesn't contain a file extension
    if (!nextSegment.includes('.')) {
      return nextSegment;
    }
  }

  // 3. No user ID found in URL
  return null;
}

/**
 * Fetch user data from Supabase by user ID
 * @param {string} userId - The user's _id
 * @returns {Promise<object|null>} User data or null if not found
 */
export async function fetchUserById(userId) {
  try {
    const { data, error } = await supabase
      .from('user')
      .select(`
        _id,
        "Name - First",
        "Name - Full",
        "Profile Photo",
        "About Me / Bio",
        "email as text",
        "Phone Number (as text)",
        "Verify - Linked In ID",
        "Verify - Phone",
        "is email confirmed",
        "user verified?"
      `)
      .eq('_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Exception fetching user:', err);
    return null;
  }
}

/**
 * Fetch all proposals from the user's "Proposals List" field
 * This field contains an array of proposal IDs associated with the user
 * Following the principle: "fetch the user's proposal's list" from user table
 *
 * @param {string} userId - The user's _id
 * @returns {Promise<Array>} Array of proposal objects
 */
export async function fetchProposalsByGuest(userId) {
  try {
    // Step 1: Fetch the user to get their Proposals List
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('"Proposals List"')
      .eq('_id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return [];
    }

    const proposalIds = userData?.['Proposals List'];

    if (!proposalIds || !Array.isArray(proposalIds) || proposalIds.length === 0) {
      console.log('No proposals found in user\'s Proposals List');
      return [];
    }

    console.log(`📋 Found ${proposalIds.length} proposal IDs in user's Proposals List`);

    // Step 2: Fetch all proposals by their IDs
    const { data: proposalsData, error: proposalsError } = await supabase
      .from('proposal')
      .select('*')
      .in('_id', proposalIds)
      .or('Deleted.is.null,Deleted.eq.false')
      .order('Created Date', { ascending: false });

    if (proposalsError) {
      console.error('Error fetching proposals:', proposalsError);
      return [];
    }

    console.log(`✅ Successfully fetched ${proposalsData?.length || 0} proposals from ${proposalIds.length} IDs`);

    return proposalsData || [];
  } catch (err) {
    console.error('Exception fetching proposals:', err);
    return [];
  }
}

/**
 * Load complete details for a specific proposal
 * Enriches proposal with:
 * - Listing data
 * - Host user data
 * - House rules
 * - Virtual meeting data
 *
 * @param {object} proposal - Base proposal object
 * @returns {Promise<object>} Enriched proposal object
 */
export async function loadProposalDetails(proposal) {
  try {
    const enrichedProposal = { ...proposal };

    // Load listing
    if (proposal.Listing) {
      const { data: listingData, error: listingError } = await supabase
        .from('listing')
        .select('*')
        .eq('_id', proposal.Listing)
        .single();

      if (!listingError && listingData) {
        enrichedProposal._listing = listingData;
      }
    }

    // Load guest user (from proposal's Guest field)
    if (proposal.Guest) {
      const { data: guestData, error: guestError } = await supabase
        .from('user')
        .select(`
          _id,
          "Name - First",
          "Name - Full",
          "Profile Photo",
          "About Me / Bio",
          "email as text",
          "Phone Number (as text)",
          "Verify - Linked In ID",
          "Verify - Phone",
          "is email confirmed",
          "user verified?"
        `)
        .eq('_id', proposal.Guest)
        .single();

      if (!guestError && guestData) {
        enrichedProposal._guest = guestData;
      }
    }

    // Load host user (from listing creator)
    if (enrichedProposal._listing?.['Created By']) {
      const { data: hostData, error: hostError } = await supabase
        .from('user')
        .select(`
          _id,
          "Name - First",
          "Name - Full",
          "Profile Photo",
          "About Me / Bio",
          "email as text",
          "Phone Number (as text)",
          "Verify - Linked In ID",
          "Verify - Phone",
          "is email confirmed",
          "user verified?"
        `)
        .eq('_id', enrichedProposal._listing['Created By'])
        .single();

      if (!hostError && hostData) {
        enrichedProposal._host = hostData;
      }
    }

    // Load house rules
    if (proposal['House Rules'] && Array.isArray(proposal['House Rules']) && proposal['House Rules'].length > 0) {
      const { data: rulesData, error: rulesError } = await supabase
        .from('zat_features_houserule')
        .select('_id, Name, Icon')
        .in('_id', proposal['House Rules']);

      if (!rulesError && rulesData) {
        enrichedProposal._houseRules = rulesData;
      }
    }

    // Load virtual meeting
    if (proposal['virtual meeting']) {
      const { data: vmData, error: vmError } = await supabase
        .from('virtualmeetingschedulesandlinks')
        .select('*')
        .eq('_id', proposal['virtual meeting'])
        .single();

      if (!vmError && vmData) {
        enrichedProposal._virtualMeeting = vmData;
      }
    }

    return enrichedProposal;
  } catch (err) {
    console.error('Error loading proposal details:', err);
    return proposal;
  }
}
