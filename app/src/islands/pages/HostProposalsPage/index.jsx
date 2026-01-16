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

  const {
    // Auth state
    authState,

    // Data
    user,
    listings,
    selectedListing,
    proposals,
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
    isLoading,
    error,

    // Handlers
    handleListingChange,
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
  } = useHostProposalsPageLogic();

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

  // Don't render content if redirecting (auth failed)
  if (authState.shouldRedirect) {
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
