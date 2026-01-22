/**
 * Get Destination Pages Handler - Return available destination pages for magic links
 * Split Lease - magic-login-links
 *
 * Returns a curated list of pages that make sense as magic link destinations.
 * This list is manually maintained to ensure only relevant pages are offered.
 *
 * @returns {pages: Array<{id, label, path, requiresData}>}
 */

interface DestinationPage {
  id: string;
  label: string;
  path: string;
  requiresData: boolean;
  description: string;
}

export async function handleGetDestinationPages(): Promise<{ pages: DestinationPage[] }> {
  console.log('[get-destination-pages] ========== GET DESTINATION PAGES ==========');

  // Curated list of sensible magic link destinations
  const pages: DestinationPage[] = [
    {
      id: 'account-profile',
      label: 'Account Profile',
      path: '/account-profile/:userId',
      requiresData: true, // Requires userId as query param
      description: 'User account settings and profile'
    },
    {
      id: 'guest-proposals',
      label: 'Guest Proposals Dashboard',
      path: '/guest-proposals/:userId',
      requiresData: true, // Requires userId
      description: 'View guest proposals and booking requests'
    },
    {
      id: 'host-proposals',
      label: 'Host Proposals Dashboard',
      path: '/host-proposals/:userId',
      requiresData: true, // Requires userId
      description: 'View host proposals and manage bookings'
    },
    {
      id: 'messages',
      label: 'Messages',
      path: '/messages',
      requiresData: false,
      description: 'View all message threads'
    },
    {
      id: 'messages-thread',
      label: 'Specific Message Thread',
      path: '/messages',
      requiresData: true, // Requires threadId as query param
      description: 'Jump directly to a specific conversation'
    },
    {
      id: 'search',
      label: 'Property Search',
      path: '/search',
      requiresData: false,
      description: 'Browse available Split Lease properties'
    },
    {
      id: 'quick-match',
      label: 'Quick Match',
      path: '/quick-match',
      requiresData: false,
      description: 'AI-powered property matching'
    },
    {
      id: 'rental-application',
      label: 'Rental Application',
      path: '/rental-application',
      requiresData: false,
      description: 'Complete rental application'
    },
    {
      id: 'self-listing',
      label: 'My Listings',
      path: '/self-listing',
      requiresData: false,
      description: 'Manage your Split Lease listings'
    },
    {
      id: 'listing-dashboard',
      label: 'Listing Dashboard',
      path: '/listing-dashboard',
      requiresData: true, // Requires listingId as query param
      description: 'View and edit specific listing details'
    },
    {
      id: 'edit-listing',
      label: 'Edit Listing',
      path: '/edit-listing',
      requiresData: true, // Requires listingId as query param
      description: 'Edit listing information and pricing'
    },
    {
      id: 'create-proposal',
      label: 'Create Proposal',
      path: '/create-proposal',
      requiresData: true, // Requires listingId as query param
      description: 'Submit a new booking proposal'
    },
    {
      id: 'view-split-lease',
      label: 'View Listing Details',
      path: '/view-split-lease/:id',
      requiresData: true, // Requires listingId
      description: 'View detailed listing page'
    },
    {
      id: 'homepage',
      label: 'Homepage',
      path: '/',
      requiresData: false,
      description: 'Split Lease homepage'
    },
  ];

  console.log(`[get-destination-pages] Returning ${pages.length} destination pages`);

  return { pages };
}
