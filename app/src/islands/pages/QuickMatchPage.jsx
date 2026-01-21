import React from 'react';
import { useQuickMatchPageLogic } from './useQuickMatchPageLogic';
import Header from '../shared/Header';
import Footer from '../shared/Footer';
import '../../styles/pages/quick-match.css';

/**
 * QuickMatchPage - Hollow Component
 *
 * Intelligent listing matching interface that allows users to quickly find
 * properties by answering preference questions. Follows the hollow component
 * pattern where ALL business logic is delegated to the hook.
 */
export default function QuickMatchPage() {
  const {
    // UI State
    isLoading,
    error,
    currentStep,

    // Search State
    searchCriteria,
    matchedListings,
    selectedListing,
    matchScore,

    // Handlers
    handleCriteriaChange,
    handleNextStep,
    handlePreviousStep,
    handleSearch,
    handleSelectListing,
    handleReset
  } = useQuickMatchPageLogic();

  return (
    <div className="quick-match-page">
      <Header />

      <main className="quick-match-main">
        <div className="quick-match-container">
          {/* Hero Section */}
          <section className="quick-match-hero">
            <h1>Quick Match</h1>
            <p>Answer a few questions to find your perfect rental match</p>
          </section>

          {/* Error State */}
          {error && (
            <div className="quick-match-error">
              <p>{error}</p>
              <button onClick={handleReset}>Try Again</button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="quick-match-loading">
              <div className="loading-spinner"></div>
              <p>Finding your matches...</p>
            </div>
          )}

          {/* Search Panel (Phase 2+: Will contain preference questions) */}
          <div className="quick-match-search-panel">
            <div className="search-panel-placeholder">
              <p>Search panel coming in Phase 2</p>
              <p>Current step: {currentStep}</p>
            </div>
          </div>

          {/* Results Panel (Phase 3+: Will show matched listings) */}
          <div className="quick-match-results-panel">
            <div className="results-panel-placeholder">
              <p>Results panel coming in Phase 3</p>
              <p>Matched listings: {matchedListings.length}</p>
              {selectedListing && (
                <p>Selected: {selectedListing.id} (Score: {matchScore})</p>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
