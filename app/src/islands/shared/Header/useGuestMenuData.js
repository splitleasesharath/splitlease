/**
 * useGuestMenuData Hook
 *
 * Fetches guest-specific data to determine the "Stay with Us" dropdown menu state.
 * Returns menu items and CTA based on the guest's current state.
 *
 * GUEST STATES:
 * 1. LOGGED_OUT: Not authenticated
 * 2. NO_PROPOSALS_NO_APP: Logged in, no proposals, no rental application
 * 3. NO_PROPOSALS_WITH_APP: Logged in, no proposals, has rental application
 * 4. WITH_PROPOSALS: Has active proposals
 * 5. WITH_SUGGESTED: Has proposals suggested by Split Lease
 * 6. WITH_LEASES: Has active leases as guest
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { SEARCH_URL } from '../../../lib/constants.js';

/**
 * Proposal statuses that indicate a proposal was suggested by Split Lease
 */
const SUGGESTED_PROPOSAL_STATUSES = [
  'Proposal Submitted for guest by Split Lease - Awaiting Rental Application',
  'Proposal Submitted for guest by Split Lease - Pending Confirmation'
];

/**
 * Guest menu states
 */
export const GUEST_MENU_STATES = {
  LOGGED_OUT: 'LOGGED_OUT',
  NO_PROPOSALS_NO_APP: 'NO_PROPOSALS_NO_APP',
  NO_PROPOSALS_WITH_APP: 'NO_PROPOSALS_WITH_APP',
  WITH_PROPOSALS: 'WITH_PROPOSALS',
  WITH_SUGGESTED: 'WITH_SUGGESTED',
  WITH_LEASES: 'WITH_LEASES'
};

/**
 * Featured card content for each guest state
 */
export const GUEST_FEATURED_CONTENT = {
  [GUEST_MENU_STATES.LOGGED_OUT]: {
    title: 'Find Your Stay',
    desc: 'Flexible rentals in NYC with weekly and monthly options.',
    cta: 'Explore Rentals',
    ctaHref: SEARCH_URL,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=260&fit=crop&q=80'
  },
  [GUEST_MENU_STATES.NO_PROPOSALS_NO_APP]: {
    title: 'Start Your Search',
    desc: 'Browse 200+ verified listings and find your NYC home base.',
    cta: 'Find a Place',
    ctaHref: SEARCH_URL,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=260&fit=crop&q=80'
  },
  [GUEST_MENU_STATES.NO_PROPOSALS_WITH_APP]: {
    title: 'Start Your Search',
    desc: 'Your rental profile is ready! Now find your perfect place.',
    cta: 'Browse Listings',
    ctaHref: SEARCH_URL,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=260&fit=crop&q=80'
  },
  [GUEST_MENU_STATES.WITH_PROPOSALS]: {
    title: 'Your Search',
    desc: 'Track your proposals and manage your favorites.',
    cta: 'View Proposals',
    ctaHref: '/guest-proposals',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=260&fit=crop&q=80'
  },
  [GUEST_MENU_STATES.WITH_SUGGESTED]: {
    title: 'Suggested for You',
    desc: 'We found listings that match your preferences!',
    cta: 'View Suggestions',
    ctaHref: '/guest-proposals?filter=suggested',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=260&fit=crop&q=80'
  },
  [GUEST_MENU_STATES.WITH_LEASES]: {
    title: 'Your Stays',
    desc: 'Manage your active leases and upcoming visits.',
    cta: 'View Leases',
    ctaHref: '/guest-proposals#leases',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=260&fit=crop&q=80'
  }
};

/**
 * Get guest menu items based on current state
 * @param {string} state - Current guest menu state
 * @param {function} onSignupClick - Callback for signup action
 * @returns {Object} { items: Array, cta: Object }
 */
export function getGuestMenuConfig(state, onSignupClick) {
  const baseItems = {
    exploreRentals: {
      id: 'explore',
      href: SEARCH_URL,
      title: 'Explore Rentals',
      desc: 'See available listings!',
      icon: '/assets/icons/listing-purple.svg'
    },
    successStories: {
      id: 'success',
      href: '/guest-success',
      title: 'Success Stories',
      desc: 'Explore other guests\' feedback',
      icon: '/assets/icons/favorite-purple.svg'
    },
    faqs: {
      id: 'faq',
      href: '/faq?section=travelers',
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
    rentalApplication: {
      id: 'rental-app',
      href: '/rental-application',
      title: 'Rental Application',
      desc: 'Complete your rental profile',
      icon: '/assets/icons/clipboard-purple.svg'
    },
    rentalAppActive: {
      id: 'rental-app',
      href: '/rental-application',
      title: 'Rental App (Active)',
      desc: 'View your rental profile',
      icon: '/assets/icons/clipboard-purple.svg'
    },
    favoriteListings: {
      id: 'favorites',
      href: '/favorite-listings',
      title: 'Favorite Listings',
      desc: 'View your saved listings',
      icon: '/assets/icons/favorite-purple.svg'
    },
    manageProposals: {
      id: 'manage-proposals',
      href: '/guest-proposals',
      title: 'Manage Proposals',
      desc: 'Track your booking requests',
      icon: '/assets/icons/document-purple.svg'
    },
    manageLeases: {
      id: 'manage-leases',
      href: '/guest-proposals#leases',
      title: 'Manage Leases',
      desc: 'View your active leases',
      icon: '/assets/icons/leases-purple.svg'
    }
  };

  // Get featured content for this state
  const featured = GUEST_FEATURED_CONTENT[state] || GUEST_FEATURED_CONTENT[GUEST_MENU_STATES.LOGGED_OUT];

  switch (state) {
    case GUEST_MENU_STATES.LOGGED_OUT:
      return {
        items: [
          baseItems.exploreRentals,
          baseItems.successStories,
          baseItems.faqs
        ],
        cta: { label: 'Sign Up', action: onSignupClick, icon: '/assets/icons/user-bubble-purple.svg' },
        featured,
        showAuthCta: true
      };

    case GUEST_MENU_STATES.NO_PROPOSALS_NO_APP:
      return {
        items: [
          baseItems.exploreRentals,
          baseItems.rentalApplication,
          baseItems.successStories,
          baseItems.favoriteListings,
          baseItems.faqs
        ],
        cta: { label: 'Explore Rentals', href: SEARCH_URL, icon: '/assets/icons/listing-purple.svg' },
        featured,
        showAuthCta: false
      };

    case GUEST_MENU_STATES.NO_PROPOSALS_WITH_APP:
      return {
        items: [
          baseItems.exploreRentals,
          baseItems.rentalAppActive,
          baseItems.successStories,
          baseItems.favoriteListings,
          baseItems.faqs
        ],
        cta: { label: 'Explore Rentals', href: SEARCH_URL, icon: '/assets/icons/listing-purple.svg' },
        featured,
        showAuthCta: false
      };

    case GUEST_MENU_STATES.WITH_PROPOSALS:
      return {
        items: [
          baseItems.exploreRentals,
          baseItems.rentalAppActive,
          baseItems.successStories,
          baseItems.favoriteListings,
          baseItems.manageProposals,
          baseItems.faqs
        ],
        cta: { label: 'Manage Proposals', href: '/guest-proposals', icon: '/assets/icons/document-purple.svg' },
        featured,
        showAuthCta: false
      };

    case GUEST_MENU_STATES.WITH_SUGGESTED:
      return {
        items: [
          baseItems.exploreRentals,
          baseItems.rentalAppActive,
          baseItems.successStories,
          baseItems.favoriteListings,
          baseItems.faqs
        ],
        cta: { label: 'See Suggested Proposal', href: '/guest-proposals?filter=suggested', icon: '/assets/icons/star-purple.svg' },
        featured,
        showAuthCta: false
      };

    case GUEST_MENU_STATES.WITH_LEASES:
      return {
        items: [
          baseItems.exploreRentals,
          baseItems.rentalAppActive,
          baseItems.successStories,
          baseItems.favoriteListings,
          baseItems.manageLeases,
          baseItems.faqs
        ],
        cta: { label: 'Manage Leases', href: '/guest-proposals#leases', icon: '/assets/icons/leases-purple.svg' },
        featured,
        showAuthCta: false
      };

    default:
      return {
        items: [
          baseItems.exploreRentals,
          baseItems.successStories,
          baseItems.faqs
        ],
        cta: { label: 'Sign Up', action: onSignupClick, icon: '/assets/icons/user-bubble-purple.svg' },
        featured: GUEST_FEATURED_CONTENT[GUEST_MENU_STATES.LOGGED_OUT],
        showAuthCta: true
      };
  }
}

/**
 * Custom hook to fetch guest menu data and determine state
 * @param {string} userId - The user's ID
 * @param {boolean} isAuthenticated - Whether user is logged in
 * @returns {Object} { state, loading, error }
 */
export function useGuestMenuData(userId, isAuthenticated) {
  const [state, setState] = useState(GUEST_MENU_STATES.LOGGED_OUT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    // If not authenticated, state is LOGGED_OUT
    if (!isAuthenticated || !userId) {
      setState(GUEST_MENU_STATES.LOGGED_OUT);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch proposals, suggested proposals, rental app, and leases in parallel
      const [proposalsResult, suggestedResult, userResult, leasesResult] = await Promise.all([
        // Count user's proposals (as guest)
        supabase
          .from('proposal')
          .select('_id', { count: 'exact', head: true })
          .eq('Guest', userId)
          .or('"Deleted".is.null,"Deleted".eq.false')
          .neq('Status', 'Proposal Cancelled by Guest'),

        // Count suggested proposals
        supabase
          .from('proposal')
          .select('_id', { count: 'exact', head: true })
          .eq('Guest', userId)
          .in('Status', SUGGESTED_PROPOSAL_STATUSES)
          .or('"Deleted".is.null,"Deleted".eq.false'),

        // Check if user has rental application (check for rental_application_id or rental app fields)
        supabase
          .from('user')
          .select('_id, "Rental Application"')
          .eq('_id', userId)
          .single(),

        // Count leases where user is guest
        supabase
          .from('bookings_leases')
          .select('_id', { count: 'exact', head: true })
          .eq('Guest', userId)
      ]);

      const proposalsCount = proposalsResult.count || 0;
      const suggestedCount = suggestedResult.count || 0;
      const leasesCount = leasesResult.count || 0;

      // Check if user has a rental application
      const hasRentalApp = !!(userResult.data?.['Rental Application']);

      // Determine state based on counts (priority order matters)
      if (leasesCount > 0) {
        setState(GUEST_MENU_STATES.WITH_LEASES);
      } else if (suggestedCount > 0) {
        setState(GUEST_MENU_STATES.WITH_SUGGESTED);
      } else if (proposalsCount > 0) {
        setState(GUEST_MENU_STATES.WITH_PROPOSALS);
      } else if (hasRentalApp) {
        setState(GUEST_MENU_STATES.NO_PROPOSALS_WITH_APP);
      } else {
        setState(GUEST_MENU_STATES.NO_PROPOSALS_NO_APP);
      }

    } catch (err) {
      console.error('[useGuestMenuData] Error:', err);
      setError(err.message);
      // Default to NO_PROPOSALS_NO_APP on error if authenticated
      setState(GUEST_MENU_STATES.NO_PROPOSALS_NO_APP);
    } finally {
      setLoading(false);
    }
  }, [userId, isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { state, loading, error, refetch: fetchData };
}

export default useGuestMenuData;
