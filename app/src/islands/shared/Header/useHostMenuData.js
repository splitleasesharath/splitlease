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
 * Featured card content for each host state
 */
export const HOST_FEATURED_CONTENT = {
  [HOST_MENU_STATES.LOGGED_OUT]: {
    title: 'Become a Host',
    desc: 'List your property and start earning with flexible scheduling.',
    cta: 'Get Started',
    ctaHref: '/self-listing-v2',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=260&fit=crop&q=80'
  },
  [HOST_MENU_STATES.NO_LISTING]: {
    title: 'List Your First Property',
    desc: 'Create your listing in minutes and start receiving proposals.',
    cta: 'Create Listing',
    ctaHref: '/self-listing-v2',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=260&fit=crop&q=80'
  },
  [HOST_MENU_STATES.WITH_LISTING_NO_PROPOSALS]: {
    title: 'Your Listings',
    desc: 'Manage your properties and optimize for more proposals.',
    cta: 'View Listings',
    ctaHref: '/host-overview',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=260&fit=crop&q=80'
  },
  [HOST_MENU_STATES.WITH_PROPOSALS]: {
    title: 'Host Dashboard',
    desc: 'Manage your listings and respond to guest proposals.',
    cta: 'View Proposals',
    ctaHref: '/host-proposals',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=260&fit=crop&q=80'
  },
  [HOST_MENU_STATES.WITH_LEASES]: {
    title: 'Host Dashboard',
    desc: 'Manage your leases, earnings, and property calendar.',
    cta: 'View Earnings',
    ctaHref: '/host-overview#leases',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=260&fit=crop&q=80'
  }
};

/**
 * Get host menu items based on current state
 * @param {string} state - Current host menu state
 * @param {function} onSignupClick - Callback for signup action
 * @returns {Object} { items: Array, cta: Object, featured: Object }
 */
export function getHostMenuConfig(state, onSignupClick) {
  const baseItems = {
    whyList: {
      id: 'why-list',
      href: '/list-with-us',
      title: 'Why List with Us',
      desc: 'New to Split Lease? Learn more about hosting',
      icon: '/assets/icons/star-purple.svg'
    },
    successStories: {
      id: 'success',
      href: '/host-success',
      title: 'Success Stories',
      desc: 'Explore other hosts\' feedback',
      icon: '/assets/icons/favorite-purple.svg'
    },
    legalInfo: {
      id: 'legal',
      href: '/policies',
      title: 'Legal Information',
      desc: 'Review most important policies',
      icon: '/assets/icons/legal-purple.svg'
    },
    faqs: {
      id: 'faq',
      href: '/faq?section=hosts',
      title: 'FAQs',
      desc: 'Frequently Asked Questions',
      icon: '/assets/icons/faq-purple.svg'
    },
    signUp: {
      id: 'signup',
      href: '#',
      title: 'Sign Up',
      desc: null,
      icon: '/assets/icons/user-bubble-purple.svg',
      action: onSignupClick
    },
    createHouseManual: {
      id: 'house-manual',
      href: '/host-overview#house-manuals',
      title: 'Create House Manual',
      desc: 'Set up your property guide',
      icon: '/assets/icons/house-manual-purple.svg'
    },
    manageHouseManual: {
      id: 'house-manual',
      href: '/host-overview#house-manuals',
      title: 'House Manual',
      desc: 'Set up or edit your property guide',
      icon: '/assets/icons/house-manual-purple.svg'
    },
    listProperty: {
      id: 'list-property',
      href: '/self-listing-v2',
      title: 'List Property',
      desc: 'Create your first listing',
      icon: '/assets/icons/listing-purple.svg'
    },
    manageListing: {
      id: 'manage-listing',
      href: '/host-overview',
      title: 'Manage Listing',
      desc: 'View and edit your listings',
      icon: '/assets/icons/listing-purple.svg'
    },
    manageProposals: {
      id: 'manage-proposals',
      href: '/host-proposals',
      title: 'Manage Proposals',
      desc: 'Review guest proposals',
      icon: '/assets/icons/document-purple.svg'
    }
  };

  // Get featured content for this state
  const featured = HOST_FEATURED_CONTENT[state] || HOST_FEATURED_CONTENT[HOST_MENU_STATES.LOGGED_OUT];

  switch (state) {
    case HOST_MENU_STATES.LOGGED_OUT:
      return {
        items: [
          baseItems.whyList,
          baseItems.successStories,
          baseItems.listProperty,
          baseItems.legalInfo,
          baseItems.faqs
        ],
        cta: { label: 'Sign Up', action: onSignupClick, icon: '/assets/icons/user-bubble-purple.svg' },
        featured,
        showAuthCta: true
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
        cta: { label: 'List Property', href: '/self-listing-v2', icon: '/assets/icons/listing-purple.svg' },
        featured,
        showAuthCta: false
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
        cta: { label: 'Manage Listing', href: '/host-overview', icon: '/assets/icons/listing-purple.svg' },
        featured,
        showAuthCta: false
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
        cta: { label: 'Manage Proposals', href: '/host-proposals', icon: '/assets/icons/document-purple.svg' },
        featured,
        showAuthCta: false
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
        cta: { label: 'Manage Leases', href: '/host-overview#leases', icon: '/assets/icons/leases-purple.svg' },
        featured,
        showAuthCta: false
      };

    default:
      return {
        items: [
          baseItems.whyList,
          baseItems.successStories,
          baseItems.listProperty,
          baseItems.legalInfo,
          baseItems.faqs
        ],
        cta: { label: 'Sign Up', action: onSignupClick, icon: '/assets/icons/user-bubble-purple.svg' },
        featured: HOST_FEATURED_CONTENT[HOST_MENU_STATES.LOGGED_OUT],
        showAuthCta: true
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
