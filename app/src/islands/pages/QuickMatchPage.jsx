import React from 'react';
import { useQuickMatchPageLogic } from './useQuickMatchPageLogic';
import Header from '../shared/Header';
import Footer from '../shared/Footer';
import {
  ProposalCard,
  CandidateCard,
  MatchFilters,
  ProposalChoiceModal
} from '../shared/QuickMatch';
import '../../styles/pages/quick-match.css';

/**
 * QuickMatchPage - Hollow Component
 *
 * Quick Match tool interface that allows operators to find alternative
 * listings for guest proposals. Follows the hollow component pattern
 * where ALL business logic is delegated to the hook.
 *
 * Usage: /quick-match?proposal_id=<id>
 */
export default function QuickMatchPage() {
  const {
    // Proposal Data
    proposal,

    // Candidates Data
    candidates,
    selectedCandidate,

    // Filters
    filters,

    // Loading States
    isLoadingProposal,
    isLoadingCandidates,
    isSubmitting,

    // Error State
    error,

    // Modal State
    isModalOpen,

    // Success State
    matchSaved,

    // Filter Handlers
    handleFilterChange,
    handleApplyFilters,
    handleResetFilters,

    // Candidate Handlers
    handleSelectCandidate,
    handleCloseModal,
    handleConfirmChoice,

    // Search Handler
    searchCandidates,

    // Reset Handlers
    handleReset,
    handleDismissSuccess
  } = useQuickMatchPageLogic();

  return (
    <div className="quick-match-page">
      <Header />

      <main className="quick-match-main">
        <div className="quick-match-container">
          {/* Hero Section */}
          <section className="quick-match-hero">
            <h1>Quick Match</h1>
            <p>Find alternative listings for guest proposals</p>
          </section>

          {/* Success Message */}
          {matchSaved && (
            <div className="quick-match-success">
              <p>Match saved successfully!</p>
              <button
                type="button"
                className="qm-success-dismiss"
                onClick={handleDismissSuccess}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="quick-match-error">
              <p>{error}</p>
              <button onClick={handleReset}>Try Again</button>
            </div>
          )}

          {/* Main Content Layout */}
          <div className="quick-match-content">
            {/* Left Panel - Proposal Details & Filters */}
            <section className="quick-match-proposal-panel">
              <h2 className="qm-panel-title">Proposal Details</h2>
              <ProposalCard
                proposal={proposal}
                isLoading={isLoadingProposal}
              />

              {/* Filters - only show when proposal is loaded */}
              {proposal && (
                <div className="qm-filters-section">
                  <h3 className="qm-section-title">Search Filters</h3>
                  <MatchFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onApply={handleApplyFilters}
                    onReset={handleResetFilters}
                  />
                  <button
                    type="button"
                    className="qm-search-button"
                    onClick={searchCandidates}
                    disabled={isLoadingCandidates}
                  >
                    {isLoadingCandidates ? 'Searching...' : 'Find Matches'}
                  </button>
                </div>
              )}
            </section>

            {/* Right Panel - Results */}
            <section className="quick-match-results-panel">
              <h2 className="qm-panel-title">
                Matching Listings
                {candidates.length > 0 && (
                  <span className="qm-results-count">({candidates.length})</span>
                )}
              </h2>

              {/* Loading State */}
              {isLoadingCandidates && (
                <div className="quick-match-loading">
                  <div className="loading-spinner"></div>
                  <p>Searching for matches...</p>
                </div>
              )}

              {/* Empty State */}
              {!isLoadingCandidates && candidates.length === 0 && (
                <div className="qm-empty-state">
                  <p>No matches found.</p>
                  <p className="qm-empty-hint">
                    {proposal
                      ? 'Try adjusting your filters or click "Find Matches" to search.'
                      : 'Load a proposal to search for matching listings.'}
                  </p>
                </div>
              )}

              {/* Candidates Grid */}
              {!isLoadingCandidates && candidates.length > 0 && (
                <div className="qm-candidates-grid">
                  {candidates.map((candidate) => (
                    <CandidateCard
                      key={candidate.listing.id}
                      candidate={candidate}
                      onSelect={() => handleSelectCandidate(candidate)}
                      isSelected={selectedCandidate?.listing.id === candidate.listing.id}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Selection Modal */}
          <ProposalChoiceModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            candidate={selectedCandidate}
            proposal={proposal}
            onConfirm={handleConfirmChoice}
            isSubmitting={isSubmitting}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
