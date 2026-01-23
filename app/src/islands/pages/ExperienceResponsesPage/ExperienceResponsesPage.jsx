/**
 * ExperienceResponsesPage - Admin Dashboard for Experience Survey Responses
 *
 * This is a HOLLOW COMPONENT - it contains NO business logic.
 * All logic is delegated to useExperienceResponsesPageLogic hook.
 *
 * Features:
 * - View experience survey responses from guests and hosts
 * - Filter by respondent name (search)
 * - Filter by user type (Guest/Host checkboxes)
 * - Master-detail layout (list left, details right)
 * - Dynamic response counter
 *
 * @see useExperienceResponsesPageLogic.js for all business logic
 */

import { Toaster } from 'react-hot-toast';
import { useExperienceResponsesPageLogic } from './useExperienceResponsesPageLogic';
import FilterBar from './components/FilterBar';
import ResponseList from './components/ResponseList';
import ResponseDetail from './components/ResponseDetail';
import LoadingState from './components/LoadingState';
import EmptyState from './components/EmptyState';

export default function ExperienceResponsesPage() {
  const logic = useExperienceResponsesPageLogic();

  // Auth checking state
  if (logic.authState === 'checking') {
    return (
      <div className="er-page">
        <LoadingState message="Checking authentication..." />
      </div>
    );
  }

  // Unauthorized state
  if (logic.authState === 'unauthorized') {
    return (
      <div className="er-page">
        <div className="er-error-state">
          <h2>Access Denied</h2>
          <p>You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Loading state (initial data fetch)
  if (logic.isLoading && logic.responses.length === 0) {
    return (
      <div className="er-page">
        <header className="er-header">
          <h1 className="er-title">Experience Responses</h1>
        </header>
        <LoadingState message="Loading responses..." />
        <Toaster position="top-right" />
      </div>
    );
  }

  // Error state
  if (logic.error && logic.responses.length === 0) {
    return (
      <div className="er-page">
        <header className="er-header">
          <h1 className="er-title">Experience Responses</h1>
        </header>
        <div className="er-error-state">
          <h2>Error Loading Responses</h2>
          <p>{logic.error}</p>
          <button className="er-btn er-btn-primary" onClick={logic.handleRetry}>
            Try Again
          </button>
        </div>
        <Toaster position="top-right" />
      </div>
    );
  }

  // Selected response for detail view
  const selectedResponse = logic.filteredResponses.find(
    (r) => r.id === logic.selectedId
  );

  return (
    <div className="er-page">
      {/* Header */}
      <header className="er-header">
        <h1 className="er-title">Experience Responses</h1>
        <span className="er-counter">
          {logic.filteredResponses.length} response
          {logic.filteredResponses.length !== 1 ? 's' : ''}
        </span>
      </header>

      {/* Filter Bar */}
      <FilterBar
        searchTerm={logic.filters.name}
        selectedTypes={logic.filters.types}
        onSearchChange={logic.handleSearchChange}
        onTypeToggle={logic.handleTypeToggle}
      />

      {/* Main Content: List + Detail */}
      <main className="er-main">
        {logic.filteredResponses.length === 0 ? (
          <EmptyState
            message={
              logic.hasActiveFilters
                ? 'No responses match your filters.'
                : 'No survey responses yet.'
            }
            hasFilters={logic.hasActiveFilters}
            onClearFilters={logic.handleClearFilters}
          />
        ) : (
          <div className="er-content">
            {/* Response List (Left Panel) */}
            <ResponseList
              responses={logic.filteredResponses}
              selectedId={logic.selectedId}
              onSelect={logic.handleSelectResponse}
            />

            {/* Response Detail (Right Panel) */}
            <ResponseDetail response={selectedResponse} />
          </div>
        )}
      </main>

      {/* Loading overlay during refresh */}
      {logic.isLoading && logic.responses.length > 0 && (
        <div className="er-loading-overlay">
          <div className="er-spinner" />
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}
