/**
 * useLoggedInAvatarData Hook
 *
 * Fetches user-specific data from Supabase to determine menu item visibility.
 * Based on the conditional logic from the Bubble.io menu system.
 *
 * MENU VISIBILITY BY USER TYPE:
 *
 * GUEST (wants to rent a space):
 *   ✓ My Profile - ALWAYS
 *   ✓ My Proposals - ALWAYS (their proposals as guest)
 *   ✗ My Proposals Suggested - HIDDEN
 *   ✗ My Listings - HIDDEN
 *   ✓ Virtual Meetings - Conditional (proposals = 0)
 *   ✓ House Manuals & Visits - Conditional (visits < 1)
 *   ✓ My Leases - ALWAYS
 *   ✓ My Favorite Listings - Conditional (favoritesCount > 0)
 *   ✓ Messages - ALWAYS
 *   ✓ Rental Application - ALWAYS
 *   ✓ Reviews Manager - ALWAYS
 *   ✓ Referral - ALWAYS
 *
 * HOST / TRIAL HOST (has space to rent):
 *   ✓ My Profile - ALWAYS
 *   ✓ My Proposals - ALWAYS (proposals received from guests)
 *   ✓ My Proposals Suggested - Conditional (proposalsCount < 1)
 *   ✓ My Listings - ALWAYS
 *   ✓ Virtual Meetings - Conditional (proposals = 0)
 *   ✓ House Manuals & Visits - Conditional (house manuals = 0)
 *   ✓ My Leases - ALWAYS
 *   ✗ My Favorite Listings - HIDDEN
 *   ✓ Messages - ALWAYS
 *   ✗ Rental Application - HIDDEN
 *   ✓ Reviews Manager - ALWAYS
 *   ✓ Referral - ALWAYS
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase.js';

/**
 * User type constants matching Supabase "Type - User Current" field values
 */
export const USER_TYPES = {
  GUEST: 'A Guest (I would like to rent a space)',
  HOST: 'A Host (I have a space available to rent)',
  TRIAL_HOST: 'Trial Host',
  SPLIT_LEASE: 'Split Lease' // Internal users - have access to all features
};

/**
 * Normalized user type for component logic
 */
export const NORMALIZED_USER_TYPES = {
  GUEST: 'GUEST',
  HOST: 'HOST',
  TRIAL_HOST: 'TRIAL_HOST'
};

/**
 * Normalize the raw Supabase user type to a simple enum
 * @param {string} rawUserType - Raw value from "Type - User Current" field
 * @returns {string} Normalized user type (GUEST, HOST, or TRIAL_HOST)
 */
export function normalizeUserType(rawUserType) {
  if (!rawUserType) return NORMALIZED_USER_TYPES.GUEST;

  if (rawUserType === USER_TYPES.HOST || (rawUserType.includes('Host') && !rawUserType.includes('Trial'))) {
    return NORMALIZED_USER_TYPES.HOST;
  }
  if (rawUserType === USER_TYPES.TRIAL_HOST || rawUserType.includes('Trial')) {
    return NORMALIZED_USER_TYPES.TRIAL_HOST;
  }
  if (rawUserType === USER_TYPES.SPLIT_LEASE) {
    // Internal users default to HOST access
    return NORMALIZED_USER_TYPES.HOST;
  }
  // Default to GUEST
  return NORMALIZED_USER_TYPES.GUEST;
}

/**
 * Custom hook to fetch menu-related user data from Supabase
 * @param {string} userId - The user's _id from Bubble/Supabase
 * @returns {Object} { data, loading, error, refetch }
 */
export function useLoggedInAvatarData(userId) {
  const [data, setData] = useState({
    userType: NORMALIZED_USER_TYPES.GUEST,
    proposalsCount: 0,
    visitsCount: 0,
    houseManualsCount: 0,
    listingsCount: 0,
    virtualMeetingsCount: 0,
    leasesCount: 0,
    favoritesCount: 0,
    unreadMessagesCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useLoggedInAvatarData] Fetching data for user:', userId);

      // Fetch all data in parallel for performance
      const [
        userResult,
        listingsResult,
        visitsResult,
        virtualMeetingsResult,
        leasesResult,
        messagesResult
      ] = await Promise.all([
        // 1. Fetch user data (type, proposals list, account host reference)
        supabase
          .from('user')
          .select(`
            _id,
            "Type - User Current",
            "Proposals List",
            "Account - Host / Landlord",
            "Favorites - Listing"
          `)
          .eq('_id', userId)
          .single(),

        // 2. Count listings created by this user
        supabase
          .from('listing')
          .select('_id', { count: 'exact', head: true })
          .eq('Created By', userId),

        // 3. Count visits for this user (as guest)
        supabase
          .from('visit')
          .select('_id', { count: 'exact', head: true })
          .eq('Guest', userId),

        // 4. Count virtual meetings for this user
        supabase
          .from('virtualmeetingschedulesandlinks')
          .select('_id', { count: 'exact', head: true })
          .or(`Guest.eq.${userId},Host.eq.${userId}`),

        // 5. Count leases for this user (as guest or host)
        supabase
          .from('Booking - Lease')
          .select('_id', { count: 'exact', head: true })
          .or(`Guest.eq.${userId},"Created By".eq.${userId}`),

        // 6. Count unread messages
        supabase
          .from('message')
          .select('_id', { count: 'exact', head: true })
          .eq('Recipient', userId)
          .eq('Read', false)
      ]);

      // Process user data
      const userData = userResult.data;
      if (userResult.error) {
        console.error('[useLoggedInAvatarData] Error fetching user:', userResult.error);
      }

      // Get normalized user type
      const rawUserType = userData?.['Type - User Current'] || '';
      const normalizedType = normalizeUserType(rawUserType);

      // Get proposals count from Proposals List array
      const proposalsList = userData?.['Proposals List'];
      const proposalsCount = Array.isArray(proposalsList) ? proposalsList.length : 0;

      // Get favorites count from user's favorites list
      const favoritesList = userData?.['Favorites - Listing'];
      const favoritesCount = Array.isArray(favoritesList) ? favoritesList.length : 0;

      // Get house manuals count if user is a host
      let houseManualsCount = 0;
      if (normalizedType === NORMALIZED_USER_TYPES.HOST || normalizedType === NORMALIZED_USER_TYPES.TRIAL_HOST) {
        const accountHostId = userData?.['Account - Host / Landlord'];
        if (accountHostId) {
          const { data: hostData, error: hostError } = await supabase
            .from('account_host')
            .select('"House manuals"')
            .eq('_id', accountHostId)
            .single();

          if (!hostError && hostData) {
            const houseManuals = hostData['House manuals'];
            houseManualsCount = Array.isArray(houseManuals) ? houseManuals.length : 0;
          }
        }
      }

      const newData = {
        userType: normalizedType,
        proposalsCount,
        visitsCount: visitsResult.count || 0,
        houseManualsCount,
        listingsCount: listingsResult.count || 0,
        virtualMeetingsCount: virtualMeetingsResult.count || 0,
        leasesCount: leasesResult.count || 0,
        favoritesCount,
        unreadMessagesCount: messagesResult.count || 0
      };

      console.log('[useLoggedInAvatarData] Data fetched:', newData);
      setData(newData);

    } catch (err) {
      console.error('[useLoggedInAvatarData] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Determine menu item visibility based on user type and data counts
 * Implements the conditional logic from the Bubble.io menu system
 *
 * @param {Object} data - Data from useLoggedInAvatarData hook
 * @param {string} currentPath - Current page URL path
 * @returns {Object} Visibility flags for each menu section
 */
export function getMenuVisibility(data, currentPath = '') {
  const { userType, proposalsCount, visitsCount, houseManualsCount, favoritesCount } = data;

  const isGuest = userType === NORMALIZED_USER_TYPES.GUEST;
  const isHost = userType === NORMALIZED_USER_TYPES.HOST;
  const isTrialHost = userType === NORMALIZED_USER_TYPES.TRIAL_HOST;
  const isHostOrTrial = isHost || isTrialHost;

  return {
    // 1. My Profile - ALWAYS visible for all users
    myProfile: true,

    // 2. My Proposals - ALWAYS visible for all users
    //    - Guests see their submitted proposals
    //    - Hosts see proposals received from guests
    myProposals: true,

    // 3. My Proposals Suggested - HOST and TRIAL_HOST only when they have no proposals
    //    This encourages hosts without proposals to explore suggested listings
    myProposalsSuggested: isHostOrTrial && proposalsCount < 1,

    // 4. My Listings - HOST and TRIAL_HOST only
    //    Guests don't see this option
    myListings: isHostOrTrial,

    // 5. Virtual Meetings - Conditional based on proposals:
    //    Shows when user has no active proposals (proposals = 0)
    virtualMeetings: proposalsCount === 0,

    // 6. House Manuals & Visits - Context-aware:
    //    - GUEST: When visits < 1 (encourage scheduling)
    //    - HOST/TRIAL_HOST: When house manuals = 0 (encourage creation)
    houseManualsAndVisits: isGuest
      ? visitsCount < 1
      : houseManualsCount === 0,

    // 7. My Leases - ALWAYS visible for all users
    myLeases: true,

    // 8. My Favorite Listings - GUEST only AND must have at least 1 favorite
    //    Hidden when guest has no favorites (nothing to show)
    myFavoriteListings: isGuest && favoritesCount > 0,

    // 9. Messages - ALWAYS visible for all users
    messages: true,

    // 10. Rental Application - GUEST only
    //     Hosts don't need rental applications
    rentalApplication: isGuest,

    // 11. Reviews Manager - ALWAYS visible for all users
    reviewsManager: true,

    // 12. Referral - ALWAYS visible for all users
    referral: true
  };
}

export default useLoggedInAvatarData;
