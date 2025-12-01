/**
 * Guest Proposals Page
 *
 * Follows the Hollow Component Pattern:
 * - This component contains ONLY JSX rendering
 * - ALL business logic is in useGuestProposalsPageLogic hook
 *
 * Architecture:
 * - Islands Architecture (independent React root)
 * - Uses shared Header/Footer components
 * - Four-Layer Logic Architecture via hook
 */

import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { useGuestProposalsPageLogic } from './proposals/useGuestProposalsPageLogic.js';
import ProposalSelector from './proposals/ProposalSelector.jsx';
import ProposalCard from './proposals/ProposalCard.jsx';
// ProgressTracker is now integrated inside ProposalCard

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
// EMPTY STATE COMPONENT
// ============================================================================

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">0</div>
      <h2>No Proposals Yet</h2>
      <p>You haven't submitted any proposals yet.</p>
      <p className="empty-subtext">
        Browse listings and submit a proposal to get started.
      </p>
      <a href="/search" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block', textDecoration: 'none' }}>
        Browse Listings
      </a>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GuestProposalsPage() {
  const {
    // Raw data
    user,
    proposals,
    selectedProposal,

    // Transformed/derived data
    transformedProposal,
    statusConfig,
    currentStage,
    formattedStages,
    proposalOptions,
    buttonConfig,

    // UI state
    isLoading,
    error,

    // Handlers
    handleProposalSelect,
    handleRetry
  } = useGuestProposalsPageLogic();

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <Header />

      <main className="main-content">
        <div className="proposals-page">
          {/* Loading State */}
          {isLoading && <LoadingState />}

          {/* Error State */}
          {!isLoading && error && (
            <ErrorState error={error} onRetry={handleRetry} />
          )}

          {/* Empty State */}
          {!isLoading && !error && proposals.length === 0 && (
            <EmptyState />
          )}

          {/* Content */}
          {!isLoading && !error && proposals.length > 0 && (
            <>
              {/* Proposal Selector */}
              <ProposalSelector
                proposals={proposalOptions}
                selectedId={selectedProposal?._id}
                onSelect={handleProposalSelect}
                count={proposals.length}
              />

              {/* Proposal Card (includes integrated Progress Tracker) */}
              {selectedProposal && (
                <ProposalCard
                  proposal={selectedProposal}
                  transformedProposal={transformedProposal}
                  statusConfig={statusConfig}
                  buttonConfig={buttonConfig}
                />
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
