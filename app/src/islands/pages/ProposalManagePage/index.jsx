/**
 * Proposal Management Page (Admin Only)
 *
 * Follows the Hollow Component Pattern:
 * - This component contains ONLY JSX rendering
 * - ALL business logic is in useProposalManagePageLogic hook
 *
 * Features:
 * - Advanced filtering by guest, host, status, date range, listing
 * - Quick proposal creation wizard
 * - Status management dropdown per proposal
 * - Action buttons for modifying terms, sending reminders
 *
 * Architecture:
 * - Islands Architecture (independent React root)
 * - Uses shared Header/Footer components
 * - Admin-only access with Gold Standard Auth Pattern
 */

import { useState } from 'react';
import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { useProposalManagePageLogic } from './useProposalManagePageLogic.js';
import FilterSection from './FilterSection.jsx';
import ProposalItem from './ProposalItem.jsx';
import QuickProposalCreation from './QuickProposalCreation.jsx';
import './ProposalManagePage.css';

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

function LoadingState() {
  return (
    <div className="pm-loading-state">
      <div className="pm-spinner"></div>
      <p>Loading proposals...</p>
    </div>
  );
}

// ============================================================================
// ERROR STATE COMPONENT
// ============================================================================

function ErrorState({ error, onRetry }) {
  return (
    <div className="pm-error-state">
      <div className="pm-error-icon">!</div>
      <h2 className="pm-error-title">Something went wrong</h2>
      <p className="pm-error-text">{error}</p>
      <button className="pm-btn pm-btn-primary" onClick={onRetry}>
        Try Again
      </button>
    </div>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

function EmptyState({ onClearFilters }) {
  return (
    <div className="pm-empty-state">
      <p>No proposals found matching your filters.</p>
      <button className="pm-btn pm-btn-secondary" onClick={onClearFilters}>
        Clear Filters
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProposalManagePage() {
  const {
    // Auth state
    authState,

    // Data
    proposals,
    filters,
    totalCount,

    // UI state
    isLoading,
    error,
    isCreationFormOpen,

    // Handlers
    handleFilterChange,
    handleClearFilters,
    handleStatusChange,
    handleAction,
    handleRetry,

    // Quick creation
    handleToggleCreationForm,
    handleCreateProposal
  } = useProposalManagePageLogic();

  // Don't render content if redirecting (auth failed)
  if (authState.shouldRedirect) {
    return (
      <>
        <Header />
        <main className="pm-main-content">
          <div className="pm-page">
            <LoadingState />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="pm-main-content">
        <div className="pm-page">
          {/* Page Header */}
          <div className="pm-page-header">
            <div className="pm-header-content">
              <h1 className="pm-page-title">
                Proposals: {totalCount} results
              </h1>
              <div className="pm-header-actions">
                <button
                  className="pm-btn pm-btn-create"
                  onClick={handleToggleCreationForm}
                >
                  {isCreationFormOpen ? 'Hide' : 'Create Suggested Proposal'}
                </button>
                <button
                  className="pm-btn pm-btn-secondary"
                  onClick={() => window.location.href = '/_internal/guest-relationships'}
                >
                  Go to relationships
                </button>
                <button
                  className="pm-btn pm-btn-secondary"
                  onClick={() => window.location.href = '/_internal/quick-price'}
                >
                  Change Prices
                </button>
              </div>
            </div>
          </div>

          <div className="pm-container">
            {/* Quick Proposal Creation */}
            {isCreationFormOpen && (
              <QuickProposalCreation
                onCreateProposal={handleCreateProposal}
                onClose={handleToggleCreationForm}
              />
            )}

            {/* Filter Section */}
            <FilterSection
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearAll={handleClearFilters}
            />

            {/* Proposals List */}
            <div id="proposals-list" className="pm-proposals-section">
              {isLoading && <LoadingState />}

              {!isLoading && error && (
                <ErrorState error={error} onRetry={handleRetry} />
              )}

              {!isLoading && !error && proposals.length === 0 && (
                <EmptyState onClearFilters={handleClearFilters} />
              )}

              {!isLoading && !error && proposals.length > 0 && (
                <div className="pm-proposals-list">
                  {proposals.map(proposal => (
                    <ProposalItem
                      key={proposal._id}
                      proposal={proposal}
                      onStatusChange={handleStatusChange}
                      onAction={handleAction}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
