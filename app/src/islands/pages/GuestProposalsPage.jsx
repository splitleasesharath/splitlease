/**
 * Guest Proposals Page (V7)
 *
 * Follows the Hollow Component Pattern:
 * - This component contains ONLY JSX rendering
 * - ALL business logic is in useGuestProposalsPageLogic hook
 *
 * Architecture:
 * - Islands Architecture (independent React root)
 * - Uses shared Header/Footer components
 * - Four-Layer Logic Architecture via hook
 *
 * V7 Changes:
 * - Replaced ProposalSelector + ProposalCard with ExpandableProposalCard
 * - Added "Suggested for You" and "Your Proposals" sections
 * - All proposals visible as accordion cards
 * - Match reason cards for SL-suggested proposals
 *
 * Authentication:
 * - Page requires authenticated Guest user
 * - User ID comes from session, NOT URL
 * - Redirects to home if not authenticated or not a Guest
 */

import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { useGuestProposalsPageLogic } from './proposals/useGuestProposalsPageLogic.js';
import SectionHeader from './proposals/SectionHeader.jsx';
import ExpandableProposalCard from './proposals/ExpandableProposalCard.jsx';
import VirtualMeetingsSection from './proposals/VirtualMeetingsSection.jsx';
// Legacy imports kept for potential fallback
// import ProposalSelector from './proposals/ProposalSelector.jsx';
// import ProposalCard from './proposals/ProposalCard.jsx';

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
    <div className="error-state" role="alert">
      <div className="error-icon" aria-hidden="true">!</div>
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
      <div className="empty-icon" aria-hidden="true">0</div>
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
    // Auth state
    authState,

    // Raw data
    user,
    proposals,

    // V7: Categorized proposals
    categorizedProposals,

    // V7: Accordion state
    expandedProposalId,

    // UI state
    isLoading,
    error,

    // Handlers
    handleProposalSelect,
    handleToggleExpand,
    handleRetry,
    handleProposalDeleted
  } = useGuestProposalsPageLogic();

  // Don't render content if redirecting (auth failed)
  if (authState.shouldRedirect) {
    return (
      <>
        <Header />
        <main className="main-content">
          <div className="proposals-page">
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

  const { suggested, userCreated } = categorizedProposals || { suggested: [], userCreated: [] };

  return (
    <>
      <Header />

      <main className="main-content" role="main" id="main-content">
        <h1 className="sr-only">Your Proposals</h1>
        <div className="proposals-page proposals-page--v7">
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

          {/* V7 Content: Two-section layout with accordion cards */}
          {!isLoading && !error && proposals.length > 0 && (
            <div className="proposals-sections">
              {/* Section 1: Suggested for You (SL-suggested proposals pending confirmation) */}
              {suggested.length > 0 && (
                <section
                  className="proposals-section proposals-section--suggested"
                  aria-labelledby="suggested-proposals-heading"
                >
                  <h2 id="suggested-proposals-heading" className="sr-only">
                    Suggested for You - {suggested.length} {suggested.length === 1 ? 'proposal' : 'proposals'}
                  </h2>
                  <SectionHeader type="suggested" count={suggested.length} />
                  <div className="proposals-section__cards" role="list">
                    {suggested.map(proposal => (
                      <ExpandableProposalCard
                        key={proposal._id}
                        proposal={proposal}
                        isExpanded={expandedProposalId === proposal._id}
                        onToggle={() => handleToggleExpand(proposal._id)}
                        allProposals={proposals}
                        onProposalSelect={handleProposalSelect}
                        onProposalDeleted={handleProposalDeleted}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Section 2: Your Proposals (user-submitted and confirmed proposals) */}
              {userCreated.length > 0 && (
                <section
                  className="proposals-section proposals-section--user"
                  aria-labelledby="user-proposals-heading"
                >
                  <h2 id="user-proposals-heading" className="sr-only">
                    Your Proposals - {userCreated.length} {userCreated.length === 1 ? 'proposal' : 'proposals'}
                  </h2>
                  <SectionHeader type="user" count={userCreated.length} />
                  <div className="proposals-section__cards" role="list">
                    {userCreated.map(proposal => (
                      <ExpandableProposalCard
                        key={proposal._id}
                        proposal={proposal}
                        isExpanded={expandedProposalId === proposal._id}
                        onToggle={() => handleToggleExpand(proposal._id)}
                        allProposals={proposals}
                        onProposalSelect={handleProposalSelect}
                        onProposalDeleted={handleProposalDeleted}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Virtual Meetings Section - shows proposals with active VMs */}
              <VirtualMeetingsSection
                proposals={proposals}
                currentUserId={user?._id}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
