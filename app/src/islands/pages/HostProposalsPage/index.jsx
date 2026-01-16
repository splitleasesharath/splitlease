/**
 * Host Proposals Page (V7 Design)
 *
 * Follows the Hollow Component Pattern:
 * - This component contains ONLY JSX rendering
 * - ALL business logic is in useHostProposalsPageLogic hook
 *
 * V7 Design Features:
 * - Pill-style listing selector
 * - Collapsible proposal cards
 * - Section grouping (Action Needed, In Progress, Closed)
 * - Status-based card variants
 *
 * Architecture:
 * - Islands Architecture (independent React root)
 * - Uses shared Header/Footer components
 * - Four-Layer Logic Architecture via hook
 *
 * Authentication:
 * - Page requires authenticated Host user
 * - User ID comes from session, NOT URL
 * - Redirects to home if not authenticated or not a Host
 */

import { useState, useMemo, useCallback } from 'react';
import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { useHostProposalsPageLogic } from './useHostProposalsPageLogic.js';
import { groupProposalsBySection } from './types.js';

// V7 Components
import ListingPillSelector from './ListingPillSelector.jsx';
import ProposalListSection from './ProposalListSection.jsx';

// ============================================================================
// DEMO MODE - Set to true to show mock data for design preview
// ============================================================================
const DEMO_MODE = true;

const MOCK_LISTINGS = [
  {
    _id: 'listing-1',
    title: 'Sunny Studio in Williamsburg',
    thumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&h=200&fit=crop',
    neighborhood: 'Williamsburg'
  },
  {
    _id: 'listing-2',
    title: 'Modern 1BR in East Village',
    thumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&h=200&fit=crop',
    neighborhood: 'East Village'
  }
];

const MOCK_PROPOSALS = [
  {
    _id: 'proposal-1',
    status: 'proposal_submitted',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    guest: {
      name: 'Sarah Johnson',
      bio: 'Digital nomad and remote worker. Love exploring new neighborhoods!',
      profilePhoto: 'https://randomuser.me/api/portraits/women/44.jpg',
      id_verified: true,
      work_verified: true,
      review_count: 5,
      created_at: '2023-06-15'
    },
    listing: MOCK_LISTINGS[0],
    start_date: '2026-02-01',
    end_date: '2026-05-31',
    days_per_week: [1, 2, 3, 4, 5], // Mon-Fri
    monthly_rate: 1800,
    service_fee: 180,
    total_monthly: 1980,
    ai_summary: 'Sarah is a verified professional with excellent reviews. She works remotely and prefers weeknight stays. Her profile indicates reliability and good communication.'
  },
  {
    _id: 'proposal-2',
    status: 'host_review',
    has_guest_counteroffer: true,
    last_modified_by: 'guest',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    guest: {
      name: 'Michael Chen',
      bio: 'Finance professional commuting from Connecticut. Clean and quiet tenant.',
      profilePhoto: 'https://randomuser.me/api/portraits/men/32.jpg',
      id_verified: true,
      work_verified: false,
      review_count: 0,
      created_at: '2025-11-20'
    },
    listing: MOCK_LISTINGS[0],
    start_date: '2026-02-15',
    end_date: '2026-08-15',
    days_per_week: [1, 2, 3], // Mon-Wed
    monthly_rate: 1500,
    service_fee: 150,
    total_monthly: 1650,
    guest_counteroffer: {
      monthly_rate: 1400,
      days_per_week: [1, 2, 3, 4]
    }
  },
  {
    _id: 'proposal-3',
    status: 'host_counteroffer',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    guest: {
      name: 'Emily Rodriguez',
      bio: 'Graduate student at NYU. Looking for a quiet place to study.',
      profilePhoto: 'https://randomuser.me/api/portraits/women/68.jpg',
      id_verified: true,
      work_verified: false,
      review_count: 2,
      created_at: '2024-09-01'
    },
    listing: MOCK_LISTINGS[0],
    start_date: '2026-03-01',
    end_date: '2026-06-30',
    days_per_week: [0, 5, 6], // Fri-Sun
    monthly_rate: 1200,
    service_fee: 120,
    total_monthly: 1320
  },
  {
    _id: 'proposal-4',
    status: 'accepted',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
    guest: {
      name: 'David Park',
      bio: 'Software engineer at a startup. Early riser, respectful of shared spaces.',
      profilePhoto: 'https://randomuser.me/api/portraits/men/75.jpg',
      id_verified: true,
      work_verified: true,
      review_count: 8,
      created_at: '2022-03-10'
    },
    listing: MOCK_LISTINGS[0],
    start_date: '2026-01-15',
    end_date: '2026-04-15',
    days_per_week: [1, 2, 3, 4], // Mon-Thu
    monthly_rate: 1600,
    service_fee: 160,
    total_monthly: 1760
  },
  {
    _id: 'proposal-5',
    status: 'rejected_by_host',
    decline_reason: 'Schedule conflict with existing tenant',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
    guest: {
      name: 'Jessica Williams',
      bio: 'Marketing consultant traveling for work.',
      profilePhoto: 'https://randomuser.me/api/portraits/women/90.jpg',
      id_verified: false,
      work_verified: false,
      review_count: 1,
      created_at: '2025-08-22'
    },
    listing: MOCK_LISTINGS[0],
    start_date: '2026-02-01',
    end_date: '2026-03-31',
    days_per_week: [1, 2, 3, 4, 5],
    monthly_rate: 1900,
    service_fee: 190,
    total_monthly: 2090
  }
];

// Legacy modals (still used)
import ProposalDetailsModal from './ProposalDetailsModal.jsx';
import { HostEditingProposal } from '../../shared/HostEditingProposal/index.js';
import VirtualMeetingManager from '../../shared/VirtualMeetingManager/VirtualMeetingManager.jsx';

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="spinner"></div>
      <p>Loading your proposals...</p>
    </div>
  );
}

// ============================================================================
// ERROR STATE COMPONENT
// ============================================================================

function ErrorState({ error, onRetry }) {
  return (
    <div className="hp7-empty-state">
      <div className="hp7-empty-state-icon" style={{ color: '#dc2626' }}>!</div>
      <h2 className="hp7-empty-state-title">Something went wrong</h2>
      <p className="hp7-empty-state-text">{error}</p>
      <button className="hp7-btn hp7-btn-primary" onClick={onRetry}>
        Try Again
      </button>
    </div>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT (V7)
// ============================================================================

function EmptyStateV7({ listingName }) {
  return (
    <div className="hp7-empty-state">
      <div className="hp7-empty-state-icon">📭</div>
      <h2 className="hp7-empty-state-title">No proposals yet</h2>
      <p className="hp7-empty-state-text">
        {listingName
          ? `There are no proposals for ${listingName}.`
          : 'You don\'t have any proposals yet.'
        }
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HostProposalsPage() {
  // V7 local state for expanded card
  const [expandedProposalId, setExpandedProposalId] = useState(null);

  // Demo mode state
  const [demoSelectedListingId, setDemoSelectedListingId] = useState(MOCK_LISTINGS[0]?._id);

  const {
    // Auth state
    authState,

    // Data
    user,
    listings: realListings,
    selectedListing: realSelectedListing,
    proposals: realProposals,
    selectedProposal,
    isModalOpen,
    isEditingProposal,

    // Virtual meeting state
    isVirtualMeetingModalOpen,
    virtualMeetingView,
    virtualMeetingProposal,

    // Reference data
    allHouseRules,

    // UI state
    isLoading: realIsLoading,
    error: realError,

    // Handlers
    handleListingChange: realHandleListingChange,
    handleProposalClick,
    handleCloseModal,
    handleDeleteProposal,
    handleAcceptProposal,
    handleRejectProposal,
    handleModifyProposal,
    handleSendMessage,
    handleRemindSplitLease,
    handleChooseVirtualMeeting,
    handleRequestRentalApp,
    handleEditListing,
    handleRetry,

    // Virtual meeting handlers
    handleCloseVirtualMeetingModal,
    handleVirtualMeetingSuccess,

    // Editing state
    showRejectOnOpen,

    // Editing handlers
    handleCloseEditing,
    handleAcceptAsIs,
    handleCounteroffer,
    handleRejectFromEditing,
    handleEditingAlert
  } = useHostProposalsPageLogic({ skipAuth: DEMO_MODE });

  // ============================================================================
  // DEMO MODE OVERRIDES
  // ============================================================================
  const listings = DEMO_MODE ? MOCK_LISTINGS : realListings;
  const selectedListing = DEMO_MODE
    ? MOCK_LISTINGS.find(l => l._id === demoSelectedListingId) || MOCK_LISTINGS[0]
    : realSelectedListing;
  const proposals = DEMO_MODE ? MOCK_PROPOSALS : realProposals;
  const isLoading = DEMO_MODE ? false : realIsLoading;
  const error = DEMO_MODE ? null : realError;
  const handleListingChange = DEMO_MODE
    ? (listingId) => setDemoSelectedListingId(listingId)
    : realHandleListingChange;

  // ============================================================================
  // V7 COMPUTED VALUES
  // ============================================================================

  // Calculate proposal counts per listing for the pill selector
  const proposalCountsByListing = useMemo(() => {
    const counts = {};
    // Initialize all listings with 0
    listings?.forEach(listing => {
      const id = listing._id || listing.id;
      counts[id] = 0;
    });
    // Count proposals - this would need access to all proposals, not just filtered
    // For now, show count for selected listing
    if (selectedListing) {
      const selectedId = selectedListing._id || selectedListing.id;
      counts[selectedId] = proposals?.length || 0;
    }
    return counts;
  }, [listings, selectedListing, proposals]);

  // Group proposals into sections
  const groupedProposals = useMemo(() => {
    return groupProposalsBySection(proposals || []);
  }, [proposals]);

  // ============================================================================
  // V7 HANDLERS
  // ============================================================================

  // Toggle card expansion
  const handleToggleExpand = useCallback((proposalId) => {
    setExpandedProposalId(prev => prev === proposalId ? null : proposalId);
  }, []);

  // Create handlers object for cards
  const cardHandlers = useMemo(() => ({
    // View profile - opens details modal
    onViewProfile: (proposal) => {
      handleProposalClick(proposal);
    },
    // Message guest
    onMessage: (proposal) => {
      handleSendMessage(proposal);
    },
    // Schedule meeting
    onScheduleMeeting: (proposal) => {
      handleChooseVirtualMeeting(proposal);
    },
    // Compare terms (for counteroffers)
    onCompareTerms: (proposal) => {
      handleProposalClick(proposal);
    },
    // Accept proposal
    onAccept: (proposal) => {
      handleAcceptProposal(proposal);
    },
    // Modify/counter proposal
    onModify: (proposal) => {
      handleModifyProposal(proposal);
    },
    // Decline proposal
    onDecline: (proposal) => {
      handleRejectProposal(proposal);
    },
    // Remind guest (for accepted proposals)
    onRemindGuest: (proposal) => {
      // Use existing remind functionality or message
      handleSendMessage(proposal);
    },
    // Edit counteroffer
    onEditCounter: (proposal) => {
      handleModifyProposal(proposal);
    },
    // Withdraw counteroffer
    onWithdraw: (proposal) => {
      handleRejectProposal(proposal);
    },
    // Remove proposal
    onRemove: (proposal) => {
      handleDeleteProposal(proposal);
    }
  }), [
    handleProposalClick,
    handleSendMessage,
    handleChooseVirtualMeeting,
    handleAcceptProposal,
    handleModifyProposal,
    handleRejectProposal,
    handleDeleteProposal
  ]);

  // Handle listing change (also collapse any expanded card)
  const handleListingChangeV7 = useCallback((listingId) => {
    setExpandedProposalId(null);
    handleListingChange(listingId);
  }, [handleListingChange]);

  // Don't render content if redirecting (auth failed) - skip in DEMO_MODE
  if (!DEMO_MODE && authState.shouldRedirect) {
    return (
      <>
        <Header />
        <main className="main-content">
          <div className="hp7-page">
            <LoadingState />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  const selectedListingId = selectedListing?._id || selectedListing?.id;
  const selectedListingName = selectedListing?.title || selectedListing?.name;
  const hasProposals = proposals && proposals.length > 0;

  return (
    <>
      <Header />

      <main className="main-content">
        <div className="hp7-page">
          {/* Page Header */}
          <div className="hp7-page-header">
            <div className="hp7-page-header-top">
              <h1 className="hp7-page-title">Proposals</h1>
            </div>

            {/* Listing Pill Selector */}
            {!isLoading && !error && listings && listings.length > 0 && (
              <ListingPillSelector
                listings={listings}
                selectedListingId={selectedListingId}
                onListingChange={handleListingChangeV7}
                proposalCounts={proposalCountsByListing}
              />
            )}
          </div>

          {/* Loading State */}
          {isLoading && <LoadingState />}

          {/* Error State */}
          {!isLoading && error && (
            <ErrorState error={error} onRetry={handleRetry} />
          )}

          {/* Content - V7 Sections */}
          {!isLoading && !error && (
            <>
              {hasProposals ? (
                <>
                  {/* Action Needed Section */}
                  <ProposalListSection
                    sectionKey="actionNeeded"
                    proposals={groupedProposals.actionNeeded}
                    expandedProposalId={expandedProposalId}
                    onToggleExpand={handleToggleExpand}
                    handlers={cardHandlers}
                  />

                  {/* In Progress Section */}
                  <ProposalListSection
                    sectionKey="inProgress"
                    proposals={groupedProposals.inProgress}
                    expandedProposalId={expandedProposalId}
                    onToggleExpand={handleToggleExpand}
                    handlers={cardHandlers}
                  />

                  {/* Closed Section */}
                  <ProposalListSection
                    sectionKey="closed"
                    proposals={groupedProposals.closed}
                    expandedProposalId={expandedProposalId}
                    onToggleExpand={handleToggleExpand}
                    handlers={cardHandlers}
                  />
                </>
              ) : (
                <EmptyStateV7 listingName={selectedListingName} />
              )}
            </>
          )}
        </div>
      </main>

      <Footer />

      {/* Proposal Details Modal */}
      <ProposalDetailsModal
        proposal={selectedProposal}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAccept={handleAcceptProposal}
        onReject={handleRejectProposal}
        onModify={handleModifyProposal}
        onSendMessage={handleSendMessage}
        onRemindSplitLease={handleRemindSplitLease}
        onChooseVirtualMeeting={handleChooseVirtualMeeting}
        onRequestRentalApp={handleRequestRentalApp}
        currentUserId={user?._id || user?.userId}
      />

      {/* Virtual Meeting Manager Modal */}
      {isVirtualMeetingModalOpen && virtualMeetingProposal && (
        <VirtualMeetingManager
          proposal={virtualMeetingProposal}
          initialView={virtualMeetingView}
          currentUser={user}
          onClose={handleCloseVirtualMeetingModal}
          onSuccess={handleVirtualMeetingSuccess}
        />
      )}

      {/* Host Editing Proposal Modal */}
      {isEditingProposal && selectedProposal && (
        <div className="editing-proposal-overlay">
          <div className="editing-proposal-container">
            <HostEditingProposal
              proposal={selectedProposal}
              availableHouseRules={allHouseRules}
              initialShowReject={showRejectOnOpen}
              onAcceptAsIs={() => handleAcceptAsIs(selectedProposal)}
              onCounteroffer={handleCounteroffer}
              onReject={(reason) => handleRejectFromEditing(selectedProposal, reason)}
              onCancel={handleCloseEditing}
              onAlert={handleEditingAlert}
            />
          </div>
        </div>
      )}
    </>
  );
}
