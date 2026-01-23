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
import { Inbox } from 'lucide-react';
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
const DEMO_MODE = false;

// Mock listings that mirror what a real host would see
// Uses real listing ID from database with enhanced demo visuals
const MOCK_LISTINGS = [
  {
    _id: '1766003594466x67309961278997728',
    title: '1 Bedroom Entire Place in Brooklyn',
    thumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&h=200&fit=crop',
    neighborhood: 'Downtown Brooklyn',
    address: '285 Jay St, Brooklyn, NY 11201',
    bedrooms: 1,
    bathrooms: 1,
    monthly_rate: 3500
  },
  {
    _id: 'demo-listing-2',
    title: 'Sunny Studio in Williamsburg',
    thumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&h=200&fit=crop',
    neighborhood: 'Williamsburg',
    address: '123 Bedford Ave, Brooklyn, NY 11249',
    bedrooms: 0,
    bathrooms: 1,
    monthly_rate: 2200
  }
];

// Leo DiCaprio (Mockup) - The official demo proposal for hosts
const LEO_DICAPRIO_GUEST = {
  _id: '1697550315775x613621430341750000',
  name: 'Leo (Mockup) Di Caprio',
  full_name: 'Leo Di Caprio',
  first_name: 'Leo(Mockup)',
  bio: "Hello, esteemed hosts! My name's Leo—no, not the Teenage Mutant Ninja Turtle—and I'm not just your average Joe with a beach house. I'm the King of the World... of the split lease universe, that is. When I'm not busy avoiding Oscars or fighting off icebergs, I love sharing my eco-friendly, ultra-luxe cabins (complete with a bear-proof security system, thanks to a memorable method-acting experience).",
  profilePhoto: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1709562069663x256748772822352760/leo%20dicaprio%20image.jpg',
  id_verified: true,
  work_verified: true,
  review_count: 0,
  created_at: '2023-10-17T13:45:15.088+00:00',
  need_for_space: 'Going to the office while doing Hybrid working',
  special_needs: 'Need parking and sometimes i travel with my pets'
};

const MOCK_PROPOSALS = [
  {
    _id: '1766003595869x69815320637958696',
    status: 'host_review',
    created_at: '2025-12-17T20:33:15.878+00:00',
    guest: LEO_DICAPRIO_GUEST,
    listing: MOCK_LISTINGS[0],
    start_date: '2026-01-05',
    end_date: '2026-04-03',
    move_in_range_start: '2026-01-05',
    move_in_range_end: '2026-01-11',
    days_per_week: [2, 3, 4, 5, 6], // Tuesday - Saturday
    nights_per_week: [2, 3, 4, 5], // 4 nights
    check_in_day: 2, // Tuesday
    check_out_day: 6, // Saturday
    duration_weeks: 13,
    duration_months: 3,
    host_compensation: 3500,
    total_compensation: 11375,
    cleaning_fee: 150,
    damage_deposit: 1000,
    comment: 'This is a demonstration proposal to show you how the proposal review process works. When real guests apply, their information will appear here. You can approve, negotiate, or decline proposals.',
    ai_summary: 'Leo is a verified professional with a complete profile. He works in a hybrid arrangement and needs weekday accommodations (Tue-Sat). He has parking and pet needs. His humorous bio suggests a friendly personality and good communication style.'
  }
];

// Legacy modals (still used)
import ProposalDetailsModal from './ProposalDetailsModal.jsx';
import { HostEditingProposal } from '../../shared/HostEditingProposal/HostEditingProposal.jsx';
import VirtualMeetingManager from '../../shared/VirtualMeetingManager/VirtualMeetingManager.jsx';

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

function LoadingState() {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true"></div>
      <p>Loading your proposals...</p>
    </div>
  );
}

// ============================================================================
// ERROR STATE COMPONENT
// ============================================================================

function ErrorState({ error, onRetry }) {
  return (
    <div className="hp7-empty-state" role="alert">
      <div className="hp7-empty-state-icon" style={{ color: '#dc2626' }} aria-hidden="true">!</div>
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
      <div className="hp7-empty-state-icon" aria-hidden="true">
        <Inbox size={48} strokeWidth={1.5} />
      </div>
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

    // Proposal counts for pill selector
    proposalCountsByListing: realProposalCounts,

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
  const proposalCountsByListing = DEMO_MODE
    ? { [MOCK_LISTINGS[0]._id]: 1, [MOCK_LISTINGS[1]._id]: 0 }
    : realProposalCounts;

  // ============================================================================
  // V7 COMPUTED VALUES
  // ============================================================================

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

      <main className="main-content" role="main" id="main-content">
        <h1 className="sr-only">Host Proposals Dashboard</h1>
        <div className="hp7-page">
          {/* Page Header */}
          <div className="hp7-page-header">
            <div className="hp7-page-header-top">
              <h2 className="hp7-page-title" aria-label={`Proposals${selectedListingName ? ` for ${selectedListingName}` : ''}`}>
                Proposals
              </h2>
            </div>

            {/* Listing Pill Selector */}
            {!isLoading && !error && listings && listings.length > 0 && (
              <nav aria-label="Listing filter">
                <ListingPillSelector
                  listings={listings}
                  selectedListingId={selectedListingId}
                  onListingChange={handleListingChangeV7}
                  proposalCounts={proposalCountsByListing}
                />
              </nav>
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
                <div className="hp7-sections">
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
                </div>
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
        showRejectOnOpen ? (
          // Reject-only mode: render HostEditingProposal without overlay/container
          // (it will only render the CancelProposalModal via portal)
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
        ) : (
          // Normal editing mode: show with overlay and container
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
        )
      )}
    </>
  );
}
