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
 *   ✓ My Proposals Suggested - Conditional (suggestedProposalsCount > 0)
 *   ✗ My Listings - HIDDEN
 *   ✓ Virtual Meetings - Conditional (proposalsCount > 0) - requires proposals to exist
 *   ✓ House Manuals & Visits - Conditional (visits < 1)
 *   ✓ My Leases - Conditional (leasesCount > 0)
 *   ✓ My Favorite Listings - Conditional (favoritesCount > 0)
 *   ✓ Messages - ALWAYS
 *   ✓ Rental Application - ALWAYS
 *   ✓ Reviews Manager - ALWAYS
 *   ✓ Referral - ALWAYS
 *
 * HOST / TRIAL HOST (has space to rent):
 *   ✓ My Profile - ALWAYS
 *   ✓ My Proposals - ALWAYS (proposals received from guests)
 *   ✗ My Proposals Suggested - HIDDEN (GUEST only feature)
 *   ✓ My Listings - ALWAYS
 *   ✓ Virtual Meetings - Conditional (proposalsCount > 0) - requires proposals to exist
 *   ✓ House Manuals & Visits - Conditional (house manuals = 0)
 *   ✓ My Leases - Conditional (leasesCount > 0)
 *   ✗ My Favorite Listings - HIDDEN
 *   ✓ Messages - ALWAYS
 *   ✗ Rental Application - HIDDEN
 *   ✓ Reviews Manager - ALWAYS
 *   ✓ Referral - ALWAYS
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase.js';

/**
 * Proposal statuses that indicate a proposal was suggested by Split Lease
 * Used to determine visibility of "Proposals Suggested" menu item
 */
const SUGGESTED_PROPOSAL_STATUSES = [
  'Proposal Submitted for guest by Split Lease - Awaiting Rental Application',
  'Proposal Submitted for guest by Split Lease - Pending Confirmation'
];

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
 * Handles both legacy Bubble format and new Supabase Auth format:
 * - Legacy: "A Host (I have a space available to rent)", "A Guest (I would like to rent a space)"
 * - Supabase Auth: "Host", "Guest"
 *
 * @param {string} rawUserType - Raw value from "Type - User Current" field or Supabase Auth metadata
 * @returns {string} Normalized user type (GUEST, HOST, or TRIAL_HOST)
 */
export function normalizeUserType(rawUserType) {
  if (!rawUserType) return NORMALIZED_USER_TYPES.GUEST;

  // Handle exact matches for Supabase Auth format (simple strings)
  if (rawUserType === 'Host') {
    return NORMALIZED_USER_TYPES.HOST;
  }
  if (rawUserType === 'Guest') {
    return NORMALIZED_USER_TYPES.GUEST;
  }

  // Handle legacy Bubble format (full strings with descriptions)
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
 * @param {string} fallbackUserType - Fallback user type from props/secureStorage (already normalized: 'HOST', 'GUEST', 'TRIAL_HOST')
 * @returns {Object} { data, loading, error, refetch }
 */
export function useLoggedInAvatarData(userId, fallbackUserType = null) {
  const [data, setData] = useState({
    userType: NORMALIZED_USER_TYPES.GUEST,
    proposalsCount: 0,
    visitsCount: 0,
    houseManualsCount: 0,
    listingsCount: 0,
    firstListingId: null, // ID of first listing when user has exactly 1
    virtualMeetingsCount: 0,
    leasesCount: 0,
    favoritesCount: 0,
    unreadMessagesCount: 0,
    suggestedProposalsCount: 0,
    threadsCount: 0 // Count of message threads user is part of
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
        messagesResult,
        suggestedProposalsResult,
        junctionCountsResult,
        guestProposalsResult,
        hostProposalsResult,
        threadsResult
      ] = await Promise.all([
        // 1. Fetch user data (type, favorites)
        supabase
          .from('user')
          .select(`
            _id,
            "Type - User Current",
            "Favorited Listings"
          `)
          .eq('_id', userId)
          .single(),

        // 2. Fetch listings for this user using the same RPC as HostOverview
        //    This queries the listing table by "Host User" and "Created By" fields
        supabase
          .rpc('get_host_listings', { host_user_id: userId }),

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
        //    Uses _message table with "Unread Users" JSONB array containing user IDs
        //    Must use raw filter since .contains() doesn't work with JSONB + quoted columns
        supabase
          .from('_message')
          .select('_id', { count: 'exact', head: true })
          .filter('Unread Users', 'cs', JSON.stringify([userId])),

        // 7. Check for proposals suggested by Split Lease
        //    These are proposals created by SL agent on behalf of the guest
        supabase
          .from('proposal')
          .select('_id', { count: 'exact', head: true })
          .eq('Guest', userId)
          .in('Status', SUGGESTED_PROPOSAL_STATUSES)
          .or('"Deleted".is.null,"Deleted".eq.false'),

        // 8. Get favorites and proposals counts from junction tables (Phase 5b migration)
        supabase.rpc('get_user_junction_counts', { p_user_id: userId }),

        // 9. Count proposals where user is the GUEST (proposals they submitted)
        //    Excludes: Deleted=true and Status='Proposal Cancelled by Guest'
        //    Includes: Cancelled by Host/Split Lease (guest may want to manually delete)
        supabase
          .from('proposal')
          .select('_id', { count: 'exact', head: true })
          .eq('Guest', userId)
          .or('"Deleted".is.null,"Deleted".eq.false')
          .neq('Status', 'Proposal Cancelled by Guest'),

        // 10. Count proposals where user is the HOST (proposals received on their listings)
        //     Excludes: Deleted=true and Status='Proposal Cancelled by Guest'
        supabase
          .from('proposal')
          .select('_id', { count: 'exact', head: true })
          .eq('Host User', userId)
          .or('"Deleted".is.null,"Deleted".eq.false')
          .neq('Status', 'Proposal Cancelled by Guest'),

        // 11. Count message threads where user is a participant (host or guest)
        //     Note: Column names have leading hyphens: "-Host User", "-Guest User"
        supabase
          .from('thread')
          .select('_id', { count: 'exact', head: true })
          .or(`"-Host User".eq.${userId},"-Guest User".eq.${userId}`)
      ]);

      // Process user data
      const userData = userResult.data;
      if (userResult.error) {
        console.error('[useLoggedInAvatarData] Error fetching user:', userResult.error);
      }

      // Get normalized user type
      // First try from legacy user table, then fallback to Supabase Auth session
      let rawUserType = userData?.['Type - User Current'] || '';

      // If no user type from legacy table, check Supabase Auth session
      // This handles users who signed up via native Supabase Auth (not legacy Bubble)
      if (!rawUserType) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.user_metadata?.user_type) {
            rawUserType = session.user.user_metadata.user_type;
            console.log('[useLoggedInAvatarData] Got user type from Supabase Auth metadata:', rawUserType);
          }
        } catch (err) {
          console.log('[useLoggedInAvatarData] Could not get Supabase Auth session:', err.message);
        }
      }

      // Use the fallback user type from props/secureStorage if we still don't have one
      // This ensures we trust the validated user type from login/validate flow
      let normalizedType;
      if (rawUserType) {
        normalizedType = normalizeUserType(rawUserType);
      } else if (fallbackUserType && Object.values(NORMALIZED_USER_TYPES).includes(fallbackUserType)) {
        // Fallback is already normalized, use it directly
        normalizedType = fallbackUserType;
        console.log('[useLoggedInAvatarData] Using fallback user type from props:', fallbackUserType);
      } else {
        // Last resort: default to GUEST
        normalizedType = NORMALIZED_USER_TYPES.GUEST;
        console.warn('[useLoggedInAvatarData] No user type found, defaulting to GUEST');
      }

      // Get proposals count based on user type
      // Guests: proposals they submitted (Guest = userId)
      // Hosts: proposals received on their listings (Host User = userId)
      const guestProposalsCount = guestProposalsResult.count || 0;
      const hostProposalsCount = hostProposalsResult.count || 0;

      // Select the appropriate count based on user type
      // Note: We determine this AFTER normalizing user type above
      const proposalsCount = normalizedType === NORMALIZED_USER_TYPES.GUEST
        ? guestProposalsCount
        : hostProposalsCount;

      if (guestProposalsResult.error) {
        console.warn('[useLoggedInAvatarData] Guest proposals count failed:', guestProposalsResult.error);
      }
      if (hostProposalsResult.error) {
        console.warn('[useLoggedInAvatarData] Host proposals count failed:', hostProposalsResult.error);
      }

      // Get favorites count from junction tables RPC (still used for favorites)
      const junctionCounts = junctionCountsResult.data?.[0] || {};
      if (junctionCountsResult.error) {
        console.warn('[useLoggedInAvatarData] Junction counts RPC failed:', junctionCountsResult.error);
      }

      // Get favorites count from user table JSONB field (not junction table)
      const favoritedListings = userData?.['Favorited Listings'] || [];
      const favoritesCount = Array.isArray(favoritedListings) ? favoritedListings.length : 0;

      // Get house manuals count if user is a host
      // NOTE: House manuals now queried directly from user table (account_host deprecated)
      let houseManualsCount = 0;
      if (normalizedType === NORMALIZED_USER_TYPES.HOST || normalizedType === NORMALIZED_USER_TYPES.TRIAL_HOST) {
        // Check if userData has House manuals directly (migrated from account_host)
        const houseManuals = userData?.['House manuals'];
        houseManualsCount = Array.isArray(houseManuals) ? houseManuals.length : 0;
      }

      // Process listings - get count and first listing ID
      // The RPC returns results from the listing table
      const rawListings = listingsResult.data || [];
      if (listingsResult.error) {
        console.warn('[useLoggedInAvatarData] Listings query error:', listingsResult.error);
      }
      const uniqueListingIds = [...new Set(rawListings.map(l => l._id || l.id))];
      const listingsCount = uniqueListingIds.length;
      const firstListingId = listingsCount === 1 ? (rawListings[0]?._id || rawListings[0]?.id) : null;
      console.log('[useLoggedInAvatarData] Listings count:', listingsCount, 'raw:', rawListings.length);
      console.log('[useLoggedInAvatarData] Proposals counts:', {
        userType: normalizedType,
        guestProposals: guestProposalsCount,
        hostProposals: hostProposalsCount,
        effectiveCount: proposalsCount
      });

      const newData = {
        userType: normalizedType,
        proposalsCount,
        visitsCount: visitsResult.count || 0,
        houseManualsCount,
        listingsCount,
        firstListingId,
        virtualMeetingsCount: virtualMeetingsResult.count || 0,
        leasesCount: leasesResult.count || 0,
        favoritesCount,
        unreadMessagesCount: messagesResult.count || 0,
        suggestedProposalsCount: suggestedProposalsResult.count || 0,
        threadsCount: threadsResult.count || 0
      };

      console.log('[useLoggedInAvatarData] Data fetched:', newData);
      setData(newData);

    } catch (err) {
      console.error('[useLoggedInAvatarData] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, fallbackUserType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─────────────────────────────────────────────────────────────
  // Real-time subscription for unread messages
  // Updates badge instantly when new messages arrive or are read
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    console.log('[useLoggedInAvatarData] Setting up realtime subscription for messages');

    // Helper to fetch current unread count
    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('_message')
        .select('_id', { count: 'exact', head: true })
        .filter('Unread Users', 'cs', JSON.stringify([userId]));

      if (!error && count !== null) {
        setData(prev => {
          if (prev.unreadMessagesCount !== count) {
            console.log('[useLoggedInAvatarData] Unread count updated:', prev.unreadMessagesCount, '->', count);
            return { ...prev, unreadMessagesCount: count };
          }
          return prev;
        });
      }
    };

    // Subscribe to _message table changes
    const channel = supabase
      .channel('header-unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: '_message',
        },
        (payload) => {
          console.log('[useLoggedInAvatarData] Message change detected:', payload.eventType);
          // Re-fetch unread count on any message change
          // This handles: new messages, messages marked as read, messages deleted
          fetchUnreadCount();
        }
      )
      .subscribe((status) => {
        console.log('[useLoggedInAvatarData] Realtime subscription status:', status);
      });

    return () => {
      console.log('[useLoggedInAvatarData] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [userId]);

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
  const {
    userType,
    proposalsCount,
    visitsCount,
    houseManualsCount,
    favoritesCount,
    leasesCount,
    suggestedProposalsCount
  } = data;

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

    // 3. My Proposals Suggested - GUEST only AND must have suggested proposals
    //    Only shows when user has proposals created by Split Lease agent
    myProposalsSuggested: isGuest && suggestedProposalsCount > 0,

    // 4. My Listings - HOST and TRIAL_HOST only
    //    Guests don't see this option
    myListings: isHostOrTrial,

    // 5. Virtual Meetings - Shows when user HAS proposals (proposalsCount > 0)
    //    Virtual meetings can only be created when proposals exist
    virtualMeetings: proposalsCount > 0,

    // 6. House Manuals & Visits - Context-aware:
    //    - GUEST: When visits < 1 (encourage scheduling)
    //    - HOST/TRIAL_HOST: When house manuals = 0 (encourage creation)
    houseManualsAndVisits: isGuest
      ? visitsCount < 1
      : houseManualsCount === 0,

    // 7. My Leases - Only visible when user has leases (leasesCount > 0)
    //    Hidden when no leases exist for the user
    myLeases: leasesCount > 0,

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
