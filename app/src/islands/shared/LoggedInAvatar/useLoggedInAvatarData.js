/**
 * useLoggedInAvatarData Hook
 *
 * Fetches user-specific data from Supabase to determine menu item visibility.
 * Based on the conditional logic from the Bubble.io menu system:
 *
 * Data Dependencies:
 * - User Type: user."Type - User Current" (GUEST, HOST, TRIAL_HOST)
 * - Proposals Count: user."Proposals List" (array of proposal IDs)
 * - Visits Count: Search for visits where Guest = userId
 * - House Manuals Count: account_host."House manuals" (array of manual IDs)
 * - Listings Count: listing where "Created By" = userId
 *
 * Menu Visibility Rules:
 * 1. My Profile - ALWAYS visible (all users)
 * 2. My Proposals - HOST and TRIAL_HOST only
 * 3. My Proposals Suggested - HOST and TRIAL_HOST only (when proposals > 0)
 * 4. My Listings - ALL users (context-dependent)
 * 5. Virtual Meetings - When proposals count = 0
 * 6. House Manuals & Visits -
 *    - GUEST: When visits < 1
 *    - HOST/TRIAL_HOST: When house manuals = 0
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

  if (rawUserType === USER_TYPES.HOST || rawUserType.includes('Host') && !rawUserType.includes('Trial')) {
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
        favoritesResult,
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

        // 6. Count favorites (from user's favorites list)
        // This will be extracted from user data instead

        // 7. Count unread messages
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
  const { userType, proposalsCount, visitsCount, houseManualsCount } = data;

  const isGuest = userType === NORMALIZED_USER_TYPES.GUEST;
  const isHost = userType === NORMALIZED_USER_TYPES.HOST;
  const isTrialHost = userType === NORMALIZED_USER_TYPES.TRIAL_HOST;
  const isHostOrTrial = isHost || isTrialHost;

  // URL-based conditionals
  const isOnHostOverview = currentPath.includes('host-overview');
  const isOnProfile = currentPath.includes('profile');
  const isOnGuestDashboard = currentPath.includes('guest-dashboard');

  return {
    // 1. My Profile - ALWAYS visible for all users
    myProfile: true,

    // 2. My Proposals - HOST and TRIAL_HOST only
    // Hidden on guest-dashboard page
    myProposals: isHostOrTrial && !isOnGuestDashboard,

    // 3. My Proposals Suggested - HOST and TRIAL_HOST only when they have proposals
    myProposalsSuggested: isHostOrTrial && proposalsCount > 0,

    // 4. My Listings - Visible for:
    //    - All host types (HOST, TRIAL_HOST)
    //    - Guests (can view listings)
    //    - When on host-overview page (context-specific)
    myListings: true, // Simplified: visible for all, as per original component

    // 5. Virtual Meetings - Conditional based on proposals:
    //    - GUEST: When proposals count = 0
    //    - HOST/TRIAL_HOST: When proposals count = 0
    virtualMeetings: proposalsCount === 0,

    // 6. House Manuals & Visits - Context-aware:
    //    - GUEST: When visits < 1 (encourage scheduling)
    //    - HOST/TRIAL_HOST: When house manuals = 0 (encourage creation)
    houseManualsAndVisits: isGuest
      ? visitsCount < 1
      : houseManualsCount === 0,

    // Additional menu items (always visible)
    myLeases: true,
    myFavoriteListings: true,
    messages: true,
    rentalApplication: true,
    reviewsManager: true,
    referral: true
  };
}

export default useLoggedInAvatarData;
