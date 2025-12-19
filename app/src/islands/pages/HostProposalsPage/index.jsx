/**
 * Host Proposals Page
 *
 * Follows the Hollow Component Pattern:
 * - This component contains ONLY JSX rendering
 * - ALL business logic is in useHostProposalsPageLogic hook
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

import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { useHostProposalsPageLogic } from './useHostProposalsPageLogic.js';
import ListingSelector from './ListingSelector.jsx';
import ProposalGrid from './ProposalGrid.jsx';
import ProposalDetailsModal from './ProposalDetailsModal.jsx';
import { HostEditingProposal } from '../../shared/HostEditingProposal/index.js';

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
    <div className="error-state">
      <div className="error-icon">!</div>
      <h2>Something went wrong</h2>
      <p className="error-message">{error}</p>
      <button className="retry-button" onClick={onRetry}>
        Try Again
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HostProposalsPage() {
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
    handleEditListing,
    handleRetry,

    // Editing handlers
    handleCloseEditing,
    handleAcceptAsIs,
    handleCounteroffer,
    handleRejectFromEditing,
    handleEditingAlert
  } = useHostProposalsPageLogic();

  // Don't render content if redirecting (auth failed)
  if (authState.shouldRedirect) {
    return (
      <>
        <Header />
        <main className="main-content">
          <div className="host-proposals-page">
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

  return (
    <>
      <Header />

      <main className="main-content">
        <div className="host-proposals-page">
          <div className="container">
            {/* Loading State */}
            {isLoading && <LoadingState />}

            {/* Error State */}
            {!isLoading && error && (
              <ErrorState error={error} onRetry={handleRetry} />
            )}

            {/* Content */}
            {!isLoading && !error && (
              <>
                {/* Listing Selector */}
                <ListingSelector
                  listings={listings}
                  selectedListing={selectedListing}
                  onListingChange={handleListingChange}
                  proposalCount={proposals.length}
                />

                {/* Proposal Grid */}
                <ProposalGrid
                  proposals={proposals}
                  onProposalClick={handleProposalClick}
                  onDeleteProposal={handleDeleteProposal}
                  onEditListing={handleEditListing}
                />
              </>
            )}
          </div>
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
      />

      {/* Host Editing Proposal Modal */}
      {isEditingProposal && selectedProposal && (
        <div className="editing-proposal-overlay">
          <div className="editing-proposal-container">
            <HostEditingProposal
              proposal={selectedProposal}
              availableHouseRules={selectedListing?.houseRules || []}
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
