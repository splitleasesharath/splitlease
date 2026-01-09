/**
 * useHostMenuData Hook
 *
 * Fetches host-specific data to determine the "Host with Us" dropdown menu state.
 * Returns menu items and CTA based on the host's current state.
 *
 * HOST STATES:
 * 1. LOGGED_OUT: Not authenticated
 * 2. NO_LISTING: Logged in but has no listings
 * 3. WITH_LISTING_NO_PROPOSALS: Has listing(s) but no proposals received
 * 4. WITH_PROPOSALS: Has proposals on their listings
 * 5. WITH_LEASES: Has active leases as host
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase.js';

/**
 * Host menu states
 */
export const HOST_MENU_STATES = {
  LOGGED_OUT: 'LOGGED_OUT',
  NO_LISTING: 'NO_LISTING',
  WITH_LISTING_NO_PROPOSALS: 'WITH_LISTING_NO_PROPOSALS',
  WITH_PROPOSALS: 'WITH_PROPOSALS',
  WITH_LEASES: 'WITH_LEASES'
};

/**
 * Get host menu items based on current state
 * @param {string} state - Current host menu state
 * @param {function} onSignupClick - Callback for signup action
 * @returns {Object} { items: Array, cta: Object }
 */
export function getHostMenuConfig(state, onSignupClick) {
  const baseItems = {
    whyList: {
      id: 'why-list',
      href: '/list-with-us',
      title: 'Why List with Us',
      desc: 'New to Split Lease? Learn more about hosting'
    },
    successStories: {
      id: 'success',
      href: '/host-success',
      title: 'Success Stories',
      desc: 'Explore other hosts\' feedback'
    },
    legalInfo: {
      id: 'legal',
      href: '/policies',
      title: 'Legal Information',
      desc: 'Review most important policies'
    },
    faqs: {
      id: 'faq',
      href: '/faq?section=hosts',
      title: 'FAQs',
      desc: 'Frequently Asked Questions'
    },
    signUp: {
      id: 'signup',
      href: '#',
      title: 'Sign Up',
      desc: null,
      action: onSignupClick
    },
    createHouseManual: {
      id: 'house-manual',
      href: '/host-overview#house-manuals',
      title: 'Create House Manual',
      desc: 'Set up your property guide'
    },
    manageHouseManual: {
      id: 'house-manual',
      href: '/host-overview#house-manuals',
      title: 'Create/Manage House Manual',
      desc: 'Set up or edit your property guide'
    },
    listProperty: {
      id: 'list-property',
      href: '/self-listing-v2',
      title: 'List Property',
      desc: 'Create your first listing'
    },
    manageListing: {
      id: 'manage-listing',
      href: '/host-overview',
      title: 'Manage Listing',
      desc: 'View and edit your listings'
    },
    manageProposals: {
      id: 'manage-proposals',
      href: '/host-proposals',
      title: 'Manage Proposals',
      desc: 'Review guest proposals'
    }
  };

  switch (state) {
    case HOST_MENU_STATES.LOGGED_OUT:
      return {
        items: [
          baseItems.whyList,
          baseItems.successStories,
          baseItems.legalInfo,
          baseItems.faqs
        ],
        cta: { label: 'Sign Up', action: onSignupClick }
      };

    case HOST_MENU_STATES.NO_LISTING:
      return {
        items: [
          baseItems.createHouseManual,
          baseItems.successStories,
          baseItems.listProperty,
          baseItems.legalInfo,
          baseItems.faqs
        ],
        cta: { label: 'List Property', href: '/self-listing-v2' }
      };

    case HOST_MENU_STATES.WITH_LISTING_NO_PROPOSALS:
      return {
        items: [
          baseItems.manageHouseManual,
          baseItems.successStories,
          baseItems.manageListing,
          baseItems.legalInfo,
          baseItems.faqs
        ],
        cta: { label: 'Manage Listing', href: '/host-overview' }
      };

    case HOST_MENU_STATES.WITH_PROPOSALS:
      return {
        items: [
          baseItems.manageHouseManual,
          baseItems.successStories,
          baseItems.manageListing,
          baseItems.manageProposals,
          baseItems.legalInfo,
          baseItems.faqs
        ],
        cta: { label: 'Manage Proposals', href: '/host-proposals' }
      };

    case HOST_MENU_STATES.WITH_LEASES:
      return {
        items: [
          baseItems.manageHouseManual,
          baseItems.successStories,
          baseItems.manageListing,
          baseItems.manageProposals,
          baseItems.legalInfo,
          baseItems.faqs
        ],
        cta: { label: 'Manage Leases', href: '/host-overview#leases' }
      };

    default:
      return {
        items: [
          baseItems.whyList,
          baseItems.successStories,
          baseItems.legalInfo,
          baseItems.faqs
        ],
        cta: { label: 'Sign Up', action: onSignupClick }
      };
  }
}

/**
 * Custom hook to fetch host menu data and determine state
 * @param {string} userId - The user's ID
 * @param {boolean} isAuthenticated - Whether user is logged in
 * @returns {Object} { state, loading, error }
 */
export function useHostMenuData(userId, isAuthenticated) {
  const [state, setState] = useState(HOST_MENU_STATES.LOGGED_OUT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    // If not authenticated, state is LOGGED_OUT
    if (!isAuthenticated || !userId) {
      setState(HOST_MENU_STATES.LOGGED_OUT);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch listings, proposals, and leases in parallel
      const [listingsResult, proposalsResult, leasesResult] = await Promise.all([
        // Count user's listings
        supabase
          .rpc('get_host_listings', { host_user_id: userId }),

        // Count proposals received on user's listings
        supabase
          .from('proposal')
          .select('_id', { count: 'exact', head: true })
          .eq('Host User', userId)
          .or('"Deleted".is.null,"Deleted".eq.false')
          .neq('Status', 'Proposal Cancelled by Guest'),

        // Count leases where user is host
        supabase
          .from('Booking - Lease')
          .select('_id', { count: 'exact', head: true })
          .eq('Created By', userId)
      ]);

      const listingsCount = listingsResult.data?.length || 0;
      const proposalsCount = proposalsResult.count || 0;
      const leasesCount = leasesResult.count || 0;

      // Determine state based on counts
      if (leasesCount > 0) {
        setState(HOST_MENU_STATES.WITH_LEASES);
      } else if (proposalsCount > 0) {
        setState(HOST_MENU_STATES.WITH_PROPOSALS);
      } else if (listingsCount > 0) {
        setState(HOST_MENU_STATES.WITH_LISTING_NO_PROPOSALS);
      } else {
        setState(HOST_MENU_STATES.NO_LISTING);
      }

    } catch (err) {
      console.error('[useHostMenuData] Error:', err);
      setError(err.message);
      // Default to NO_LISTING on error if authenticated
      setState(HOST_MENU_STATES.NO_LISTING);
    } finally {
      setLoading(false);
    }
  }, [userId, isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { state, loading, error, refetch: fetchData };
}

export default useHostMenuData;
